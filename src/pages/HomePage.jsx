import { useState, useEffect, useRef } from "react";
import { dealsAPI } from "../services/api";
import DealCard from "../components/DealCard";
import { useLocation } from "../contexts/LocationContext";

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

  // Time-based progress animation
  useEffect(() => {
    if (!isScraping) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    scrapeStartTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - scrapeStartTime.current;
      // Asymptotic curve: ~50% at 30s, ~75% at 60s, plateaus near 90%
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
    if (!location) return;
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

  const [fetchedAt, setFetchedAt] = useState(null);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedRestaurant) params.restaurant = selectedRestaurant;
      if (sortBy) params.sort_by = sortBy;
      const response = await dealsAPI.getDeals({ ...params, limit: 10 });
      setDeals(response.data);
      setFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      setError("Failed to load deals. Make sure the backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Server-side progress as a percentage (used as floor for time animation)
  const getServerPct = (progress) => {
    if (!progress) return 5;
    const { stage, finding_stores_done, finding_stores_total, completed, total } = progress;

    if (stage === "finding_stores" || stage === "starting") {
      if (finding_stores_total > 0) {
        // 0–30% range during finding stores
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

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (pollRef.current.abort) throw new Error("Polling cancelled");
        const res = await dealsAPI.getUberEatsJob(jobId);
        const data = res?.data ?? {};
        setJobProgress((prev) => mergeJobProgress(prev, data));

        if (data.status && data.status !== "running" && data.status !== "queued") {
          return data;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
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
    if (!location) return;
    if (location === lastScrapedLocation) {
      await loadDeals();
      return;
    }
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
      const resp = await dealsAPI.importUberEatsMenus({ location, restaurants });
      const jobId = resp?.data?.job_id;
      const status = resp?.data?.status;

      if (status === "completed" || status === "partial") {
        await loadDeals();
        setIsScraping(false);
        setJobProgress((prev) => ({ ...prev, show: false }));
        setLastScrapedLocation(location);
        localStorage.setItem("lastScrapedLocation", location);
        return;
      }

      if (jobId) {
        const jobResult = await pollUberJob(jobId);
        if (jobResult?.status && jobResult.status !== "running" && jobResult.status !== "queued") {
          await loadDeals();
        }
      } else {
        await loadDeals();
      }
      setLastScrapedLocation(location);
      localStorage.setItem("lastScrapedLocation", location);
    } catch (err) {
      console.error("Failed to import Uber Eats menus:", err);
      setError("Failed to load deals. Please try refreshing.");
    } finally {
      setIsScraping(false);
      setJobProgress((prev) => ({ ...prev, show: false }));
    }
  };

  return (
    <div className="bg-canvas min-h-screen">
      {/* Progress overlay */}
      {jobProgress.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-slate-100">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Scanning UberEats
            </p>
            <p className="text-slate-700 text-sm mb-5">
              {getScrapeStage(jobProgress)}
            </p>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, displayPct).toFixed(1)}%`,
                  background: "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))",
                  transition: "width 0.3s ease-out",
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-800">
                {Math.round(Math.min(100, displayPct))}%
              </span>
              {jobProgress.total > 0 && (
                <span className="text-xs text-slate-400">
                  {jobProgress.completed} / {jobProgress.total} stores
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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

        {/* Filters */}
        <div className="surface-card p-5 mb-10">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-bold section-title mb-2">Restaurant</label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm text-sm"
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
                className="block w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm text-sm"
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
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
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
        {!loading && error && (
          <div className="surface-soft border border-red-200 text-red-600 px-5 py-4 rounded-xl mb-8 flex items-center gap-3 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && deals.length === 0 && !isScraping && (
          <div className="surface-card text-center py-20 border-dashed border-2 border-slate-200">
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
        {!loading && !error && deals.length > 0 && (
          <>
            {fetchedAt && (
              <p className="text-xs text-slate-400 text-right mb-3">
                Updated {Math.round((Date.now() - fetchedAt) / 60000) < 1
                  ? "just now"
                  : `${Math.round((Date.now() - fetchedAt) / 60000)}m ago`}
              </p>
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
