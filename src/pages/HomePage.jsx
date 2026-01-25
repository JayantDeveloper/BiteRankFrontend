import { useState, useEffect } from "react";
import { dealsAPI } from "../services/api";
import DealCard from "../components/DealCard";
import { useLocation } from "../contexts/LocationContext";

function HomePage() {
  const { location } = useLocation();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurants, setRestaurants] = useState([
    "McDonald's",
    "KFC",
    "Taco Bell",
  ]);
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [sortBy, setSortBy] = useState("value_score");
  const [isScraping, setIsScraping] = useState(false);
  const [jobProgress, setJobProgress] = useState({
    show: false,
    status: "queued",
    completed: 0,
    failed: 0,
    total: restaurants.length,
  });
  const [lastScrapedLocation, setLastScrapedLocation] = useState(() => {
    return localStorage.getItem("lastScrapedLocation") || null;
  });

  useEffect(() => {
    if (!location) return;
    if (location === lastScrapedLocation) {
      loadDeals();
    } else {
      startImport();
    }
  }, [location, lastScrapedLocation]);

  useEffect(() => {
    if (!location || isScraping) return;
    loadDeals();
  }, [selectedRestaurant, sortBy]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedRestaurant) params.restaurant = selectedRestaurant;
      if (sortBy) params.sort_by = sortBy;

      const response = await dealsAPI.getDeals({ ...params, limit: 10 });
      setDeals(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load deals. Make sure the backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    const total =
      totalFromServer && totalFromServer > 0 ? totalFromServer : prev.total || restaurants.length;

    return {
      ...prev,
      show: true,
      status: data?.status || prev.status,
      completed: Math.max(prevDone, done),
      failed,
      total,
    };
  };

  const pollUberJob = async (jobId, { intervalMs = 2000, maxAttempts = 120 } = {}) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await dealsAPI.getUberEatsJob(jobId);
      const data = res?.data ?? {};
      setJobProgress((prev) => mergeJobProgress(prev, data));

      if (data.status && data.status !== "running" && data.status !== "queued") {
        return data;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error("Timed out waiting for Uber Eats job");
  };

  const getScrapeStage = (completed, total) => {
    if (!total) return "Starting up…";
    if (completed <= 0) return "Spinning up store checks…";
    const pct = Math.round((completed / total) * 100);
    if (pct < 34) return "Pulling menus…";
    if (pct < 67) return "Parsing items…";
    if (pct < 100) return "Ranking deals…";
    return "Finalizing results…";
  };

  const startImport = async () => {
    if (!location) return;
    if (location === lastScrapedLocation) {
      await loadDeals();
      return;
    }
    setIsScraping(true);
    setJobProgress({
      show: true,
      status: "queued",
      completed: 0,
      failed: 0,
      total: restaurants.length,
    });
    try {
      const payload = {
        location,
        restaurants,
      };
      const resp = await dealsAPI.importUberEatsMenus(payload);
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
      {jobProgress.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600 mb-3">
              <span>Loading</span>
              <span>
                {jobProgress.total
                  ? Math.min(100, Math.round((jobProgress.completed / jobProgress.total) * 100))
                  : 10}
                %
              </span>
            </div>
            <div className="w-full border-2 border-slate-300 rounded-md bg-white/70 p-1 shadow-sm">
              <div
                className="h-4 rounded-sm transition-all duration-500 ease-out"
                style={{
                  width: `${jobProgress.total ? Math.min(100, Math.round((jobProgress.completed / jobProgress.total) * 100)) : 10}%`,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--brand-primary) 0 14px, rgba(255,255,255,0.0) 14px 18px)",
                }}
              ></div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {getScrapeStage(jobProgress.completed, jobProgress.total)}
            </p>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-slate-900">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="badge-gold mb-6 inline-flex">
            ⚡ AI-Powered Rankings
          </span>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 gradient-text">
            BiteRank
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Discover the best value deals near you from your favorite restaurants!
          </h2>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-slate-500">
          </div>
        </div>

        {/* Filters */}
        <div className="surface-card p-6 mb-12">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 flex-1">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold section-title mb-2">
                  Restaurant
                </label>
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm"
                >
                  <option value="">All Restaurants</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant} value={restaurant}>
                      {restaurant}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold section-title mb-2">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-[#E85D54] focus:ring-2 focus:ring-[#E85D54]/30 focus:outline-none transition-all shadow-sm"
                >
                  <option value="value_score">Highest value score</option>
                  <option value="price">Lowest price</option>
                  <option value="price_per_calorie">Best price per calorie</option>
                  <option value="price_per_protein">Best price per gram protein</option>
                  <option value="protein_grams">Highest protein</option>
                  <option value="calories">Lowest calories</option>
                </select>
              </div>

            </div>

            <button
              onClick={startImport}
              className="btn-gradient-primary px-8 py-3 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 flex items-center space-x-2"
              disabled={isScraping || !location}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 spinner mb-6"></div>
            <p className="text-slate-400 text-lg font-medium">
              {isScraping ? "Fetching fresh deals for your location..." : "Loading deals..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="surface-soft border border-red-300 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3">
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && deals.length === 0 && !isScraping && (
          <div className="surface-card text-center py-20 border-dashed border-2 border-slate-200">
            <svg
              className="w-20 h-20 text-slate-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-slate-200 text-xl font-bold mb-2">
              No deals found
            </p>
            <p className="text-slate-400">
              Make sure your location is accurate (ZIP like 10001 or City, ST) and try refreshing.
            </p>
          </div>
        )}

        {/* Deals Grid */}
        {!loading && !error && deals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} rank={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
