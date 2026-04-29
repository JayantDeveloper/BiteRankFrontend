import { useState, useEffect, useRef } from "react";
import { dealsAPI } from "../services/api";
import DealCard from "../components/DealCard";
import { useLocation } from "../contexts/LocationContext";

// ─── DevTools debug helper ────────────────────────────────────────────────────
// All scrape activity is logged under the [BiteRank] group.
// Full history is also at window.BITERANK_DEBUG in the browser console.
const DBG = (() => {
  if (typeof window !== "undefined") {
    window.BITERANK_DEBUG = window.BITERANK_DEBUG || {
      session_start: new Date().toISOString(),
      events: [],
    };
  }
  const push = (tag, data) => {
    const entry = { t: new Date().toISOString(), tag, ...data };
    if (typeof window !== "undefined") window.BITERANK_DEBUG.events.push(entry);
    return entry;
  };
  return {
    group:  (label) => console.group(`%c[BiteRank] ${label}`, "color:#E85D54;font-weight:bold"),
    groupEnd: () => console.groupEnd(),
    log:    (...args) => console.log("%c[BiteRank]", "color:#E85D54;font-weight:bold", ...args),
    warn:   (...args) => console.warn("%c[BiteRank]", "color:#f59e0b;font-weight:bold", ...args),
    error:  (...args) => console.error("%c[BiteRank]", "color:#ef4444;font-weight:bold", ...args),
    event:  (tag, data) => { const e = push(tag, data); console.log(`%c[BiteRank] ${tag}`, "color:#E85D54;font-weight:bold", data); return e; },
  };
})();
// ─────────────────────────────────────────────────────────────────────────────

function HomePage() {
  const { location } = useLocation();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurants] = useState(["McDonald's", "KFC", "Taco Bell"]);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [sortBy, setSortBy] = useState("value_score");
  const [isScraping, setIsScraping] = useState(false);
  const [jobProgress, setJobProgress] = useState({
    show: false,
    status: "queued",
    completed: 0,
    failed: 0,
    total: 3,
    stage: "idle",
    finding_stores_done: 0,
    finding_stores_total: 0,
  });
  const [displayPct, setDisplayPct] = useState(0);

  const pollRef = useRef({ jobId: null, promise: null, abort: false });
  const scrapeStartTime = useRef(null);
  const animFrameRef = useRef(null);
  const [lastScrapedLocation, setLastScrapedLocation] = useState(() =>
    localStorage.getItem("lastScrapedLocation") || null
  );
  const [fetchedAt, setFetchedAt] = useState(null);

  // Time-based progress animation
  useEffect(() => {
    if (!isScraping) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    scrapeStartTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - scrapeStartTime.current;
      const timePct = 90 * (1 - Math.exp(-elapsed / 50000));
      const serverPct = getServerPct(jobProgress);
      setDisplayPct(Math.max(timePct, serverPct));
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScraping]);

  // Snap to 100% on completion
  useEffect(() => {
    if (
      jobProgress.status === "completed" ||
      jobProgress.status === "partial" ||
      jobProgress.status === "failed"
    ) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setDisplayPct(jobProgress.status === "failed" ? displayPct : 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobProgress.status]);

  useEffect(() => {
    if (!location) {
      DBG.log("useEffect[location] fired — location is empty, skipping");
      return;
    }
    DBG.event("location_effect", {
      location,
      lastScrapedLocation,
      action: location === lastScrapedLocation ? "load_existing" : "start_import",
    });
    if (location === lastScrapedLocation) {
      loadDeals();
    } else {
      startImport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, lastScrapedLocation]);

  useEffect(() => {
    if (!location || isScraping) return;
    loadDeals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant, sortBy]);

  const loadDeals = async () => {
    DBG.group("loadDeals()");
    try {
      setLoading(true);
      const params = {};
      if (selectedRestaurant) params.restaurant = selectedRestaurant;
      if (sortBy) params.sort_by = sortBy;
      DBG.log("GET /api/deals params →", params);
      const response = await dealsAPI.getDeals({ ...params, limit: 10 });
      const deals = response.data;
      DBG.event("deals_loaded", {
        count: Array.isArray(deals) ? deals.length : "non-array",
        params,
        first_3: Array.isArray(deals) ? deals.slice(0, 3).map(d => ({
          id: d.id,
          name: d.item_name,
          restaurant: d.restaurant_name,
          price: d.price,
          value_score: d.value_score,
          calories: d.calories,
          protein: d.protein_grams,
          is_active: d.is_active,
        })) : deals,
        raw_response_status: response.status,
      });
      if (!Array.isArray(deals) || deals.length === 0) {
        DBG.warn("⚠️  GET /api/deals returned empty or non-array. Full response:", response.data);
      }
      setDeals(deals);
      setFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      DBG.error("GET /api/deals FAILED →", err?.response?.status, err?.response?.data, err?.message);
      setError("Failed to load deals. Make sure the backend is running.");
    } finally {
      setLoading(false);
      DBG.groupEnd();
    }
  };

  const getServerPct = (progress) => {
    if (!progress) return 5;
    const { stage, finding_stores_done, finding_stores_total, completed, total } = progress;

    if (stage === "finding_stores" || stage === "starting") {
      if (finding_stores_total > 0) {
        return Math.min(30, Math.round((finding_stores_done / finding_stores_total) * 30));
      }
      return 5;
    }
    if (stage === "scraping_menus") {
      const base = total > 0 ? Math.round((completed / total) * 60) : 0;
      return Math.max(30, Math.min(90, 30 + base));
    }
    if (stage === "finalizing") return 92;
    return 5;
  };

  const getScrapeStage = (progress) => {
    if (!progress) return "Starting up…";
    if (progress.stage === "finding_stores" || progress.stage === "starting") {
      const done = progress.finding_stores_done || 0;
      const total = progress.finding_stores_total || restaurants.length;
      return `Finding nearby stores… (${done}/${total})`;
    }
    if (progress.stage === "scraping_menus") return "Scraping menus…";
    if (progress.stage === "finalizing") return "Finalizing results…";
    const total = progress.total || 0;
    if (!total) return "Starting up…";
    if (progress.completed <= 0) return "Spinning up store checks…";
    const pct = Math.round((progress.completed / total) * 100);
    if (pct < 40) return "Scraping menus…";
    if (pct < 75) return "Extracting items…";
    if (pct < 100) return "Scoring deals…";
    return "Finalizing results…";
  };

  const mergeJobProgress = (prev, data) => {
    const prog = data?.progress || {};
    const totalFromServer = Number.isFinite(prog.total_stores) ? prog.total_stores : null;
    const completedFromServer = Number.isFinite(prog.completed) ? prog.completed : null;
    const failedFromServer = Number.isFinite(prog.failed) ? prog.failed : null;
    const prevFailed = Number.isFinite(prev.failed) ? prev.failed : 0;
    const prevDone = Number.isFinite(prev.completed) ? prev.completed : 0;
    const prevCompletedOnly = Math.max(0, prevDone - prevFailed);
    const completedOnly = completedFromServer ?? prevCompletedOnly;
    const failed = failedFromServer ?? prevFailed;
    const done = completedOnly + failed;
    const total = totalFromServer && totalFromServer > 0 ? totalFromServer : prev.total || restaurants.length;

    return {
      ...prev,
      show: true,
      status: data?.status || prev.status,
      completed: Math.max(prevDone, done),
      failed,
      total,
      stage: prog.stage || prev.stage,
      finding_stores_done: prog.finding_stores_done ?? prev.finding_stores_done ?? 0,
      finding_stores_total: prog.finding_stores_total ?? prev.finding_stores_total ?? 0,
    };
  };

  const pollUberJob = (jobId, { intervalMs = 4000, maxAttempts = 60 } = {}) => {
    if (pollRef.current.jobId === jobId && pollRef.current.promise) {
      return pollRef.current.promise;
    }
    if (pollRef.current.promise) {
      pollRef.current.abort = true;
    }

    const promise = (async () => {
      pollRef.current.abort = false;
      pollRef.current.jobId = jobId;
      DBG.group(`pollUberJob(${jobId})`);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (pollRef.current.abort) {
          DBG.warn("Polling cancelled at attempt", attempt);
          DBG.groupEnd();
          throw new Error("Polling cancelled");
        }

        let res, data;
        try {
          res = await dealsAPI.getUberEatsJob(jobId);
          data = res?.data ?? {};
        } catch (pollErr) {
          DBG.error(`Poll attempt ${attempt + 1} HTTP error →`, pollErr?.response?.status, pollErr?.response?.data, pollErr?.message);
          await new Promise((r) => setTimeout(r, intervalMs));
          continue;
        }

        const prog = data?.progress ?? {};
        DBG.event(`poll_${attempt + 1}`, {
          attempt: attempt + 1,
          status: data.status,
          stage: prog.stage,
          finding_stores_done: prog.finding_stores_done,
          finding_stores_total: prog.finding_stores_total,
          completed: prog.completed,
          failed: prog.failed,
          total_stores: prog.total_stores,
          ranked_deals: data.ranked_deals?.length ?? null,
          unranked_deals: data.unranked_deals?.length ?? null,
          error: data.error ?? null,
          raw: data,
        });

        setJobProgress((prev) => mergeJobProgress(prev, data));

        if (data.status && data.status !== "running" && data.status !== "queued") {
          DBG.log(`Job finished with status="${data.status}" after ${attempt + 1} polls`);
          if (data.status === "completed" || data.status === "partial") {
            DBG.event("job_result_summary", {
              ranked_deals: data.ranked_deals?.length ?? 0,
              unranked_deals: data.unranked_deals?.length ?? 0,
              stores_processed: data.stores_processed,
              skipped: data.skipped,
              first_3_ranked: (data.ranked_deals ?? []).slice(0, 3).map(d => ({
                name: d.item_name ?? d.name,
                restaurant: d.restaurant_name ?? d.restaurant,
                price: d.price,
                value_score: d.value_score,
                calories: d.calories,
              })),
              first_3_unranked: (data.unranked_deals ?? []).slice(0, 3),
            });
          } else if (data.status === "failed") {
            DBG.error("Job FAILED →", data.error, data);
          }
          DBG.groupEnd();
          return data;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      DBG.error("Timed out after", maxAttempts, "poll attempts for job", jobId);
      DBG.groupEnd();
      throw new Error("Timed out waiting for Uber Eats job");
    })();

    pollRef.current.promise = promise.finally(() => {
      if (pollRef.current.jobId === jobId) {
        pollRef.current.jobId = null;
        pollRef.current.promise = null;
        pollRef.current.abort = false;
      }
    });

    return pollRef.current.promise;
  };

  const startImport = async () => {
    DBG.group("startImport()");
    DBG.log("location →", location, "| lastScraped →", lastScrapedLocation, "| restaurants →", restaurants);

    if (!location) {
      DBG.warn("Aborted — no location set");
      DBG.groupEnd();
      return;
    }
    if (location === lastScrapedLocation) {
      DBG.log("Location unchanged — loading existing deals instead of re-scraping");
      DBG.groupEnd();
      await loadDeals();
      return;
    }

    DBG.event("scrape_start", { location, restaurants });
    setIsScraping(true);
    setDisplayPct(0);
    setJobProgress({
      show: true,
      status: "queued",
      completed: 0,
      failed: 0,
      total: restaurants.length,
      stage: "starting",
      finding_stores_done: 0,
      finding_stores_total: restaurants.length,
    });

    try {
      DBG.log("POST /api/scrape/ubereats →", { location, restaurants });
      const resp = await dealsAPI.importUberEatsMenus({ location, restaurants });
      DBG.event("scrape_enqueued", {
        http_status: resp?.status,
        job_id: resp?.data?.job_id,
        status: resp?.data?.status,
        full_response: resp?.data,
      });

      const jobId = resp?.data?.job_id;
      const status = resp?.data?.status;

      if (!jobId && !status) {
        DBG.error("⚠️  Response had neither job_id nor status — unexpected shape:", resp?.data);
      }

      if (status === "completed" || status === "partial") {
        DBG.log("Synchronous completion (no polling needed), status =", status);
        await loadDeals();
        setIsScraping(false);
        setJobProgress((prev) => ({ ...prev, show: false }));
        setLastScrapedLocation(location);
        localStorage.setItem("lastScrapedLocation", location);
        DBG.groupEnd();
        return;
      }

      if (jobId) {
        DBG.log("Polling for job_id =", jobId);
        const jobResult = await pollUberJob(jobId);
        if (jobResult?.status && jobResult.status !== "running" && jobResult.status !== "queued") {
          DBG.log("Poll complete, loading deals…");
          await loadDeals();
        } else {
          DBG.warn("Poll ended but status is still running/queued:", jobResult?.status);
        }
      } else {
        DBG.warn("No job_id returned — falling back to immediate deal load");
        await loadDeals();
      }

      setLastScrapedLocation(location);
      localStorage.setItem("lastScrapedLocation", location);
    } catch (err) {
      DBG.error("startImport() threw →", err?.response?.status, err?.response?.data, err?.message, err);
      setError("Failed to load deals. Please try refreshing.");
    } finally {
      setIsScraping(false);
      setJobProgress((prev) => ({ ...prev, show: false }));
      DBG.event("scrape_flow_complete", { location });
      DBG.groupEnd();
    }
  };

  const pct = Math.round(Math.min(100, displayPct));

  return (
    <div className="bg-canvas min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-slate-900">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-3 gradient-text">
            BiteRank
          </h1>
          <p className="text-lg text-slate-500">
            Find the best value meals near you.
          </p>
        </div>

        {/* Filter bar — flat row, no card */}
        <div className="surface-row flex flex-wrap gap-4 items-end pb-6 mb-10">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold section-title mb-2">Restaurant</label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              disabled={isScraping}
              className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm text-sm disabled:opacity-50"
            >
              <option value="">All Restaurants</option>
              {restaurants.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold section-title mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={isScraping}
              className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm text-sm disabled:opacity-50"
            >
              <option value="value_score">Highest value score</option>
              <option value="price">Lowest price</option>
              <option value="price_per_calorie">Best $/cal</option>
              <option value="price_per_protein">Best $/protein</option>
              <option value="protein_grams">Highest protein</option>
              <option value="calories">Lowest calories</option>
            </select>
          </div>
          <button
            onClick={startImport}
            disabled={isScraping || !location}
            className="btn-gradient-primary px-6 py-2.5 rounded-lg font-bold btn-glow transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <svg className={`w-4 h-4 ${isScraping ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isScraping ? "Scanning…" : "Refresh"}</span>
          </button>
        </div>

        {/* Inline scraping state — replaces everything below */}
        {isScraping && (
          <div className="flex flex-col items-center py-16 text-center animate-fade-up">
            {/* Animated orb */}
            <div className="scraping-pulse relative mb-8 w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(232,93,84,0.12), rgba(255,155,84,0.2))' }}>
              <svg className="w-11 h-11 animate-spin" style={{ color: 'var(--brand-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Scanning UberEats</h2>
            <p className="text-slate-500 text-base mb-10 max-w-sm">{getScrapeStage(jobProgress)}</p>

            {/* Progress bar */}
            <div className="w-full max-w-lg">
              <div className="progress-shell h-3 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, displayPct).toFixed(1)}%`,
                    background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-accent))',
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                {jobProgress.total > 0 ? (
                  <span className="text-sm text-slate-400">
                    {jobProgress.completed} of {jobProgress.total} stores
                  </span>
                ) : <span />}
                <span className="text-3xl font-black text-slate-800">{pct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {!isScraping && loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface-card overflow-hidden animate-pulse">
                <div className="h-11 bg-slate-200 rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="pt-4 stat-divider">
                    <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                    <div className="h-2 bg-slate-100 rounded-full w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isScraping && !loading && error && (
          <div className="surface-soft border border-red-200 text-red-600 px-5 py-4 rounded-xl mb-8 flex items-center gap-3 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Empty state */}
        {!isScraping && !loading && !error && deals.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-600 text-lg font-semibold mb-1">No deals found</p>
            <p className="text-slate-400 text-sm">
              Enter a ZIP or City, ST and click Refresh to scan UberEats.
            </p>
          </div>
        )}

        {/* Deals grid */}
        {!isScraping && !loading && !error && deals.length > 0 && (
          <>
            {fetchedAt && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold section-title">Top Deals</h2>
                <p className="text-xs text-slate-400">
                  Updated {Math.round((Date.now() - fetchedAt) / 60000) < 1
                    ? "just now"
                    : `${Math.round((Date.now() - fetchedAt) / 60000)}m ago`}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  rank={index + 1}
                  animationDelay={index * 60}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;
