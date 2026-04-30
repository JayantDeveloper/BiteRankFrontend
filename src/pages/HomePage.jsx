import { useState, useEffect, useRef } from 'react'
import { dealsAPI } from '../services/api'
import { DealCard, HeroDealCard } from '../components/DealCard'
import DealDetail from '../components/DealDetail'
import { useLocation } from '../contexts/LocationContext'

const ALL_RESTAURANTS = ["McDonald's", 'KFC', 'Taco Bell', 'Burger King', "Wendy's", 'Chick-fil-A', 'Subway', 'Popeyes']

const SORT_OPTIONS = [
  { value: 'value_score',       label: 'Best Value'   },
  { value: 'price',             label: 'Lowest Price' },
  { value: 'price_per_calorie', label: 'Best $/Cal'   },
  { value: 'protein_grams',     label: 'Most Protein' },
]

const REST_COLORS = {
  "McDonald's": '#DA291C', 'KFC': '#F40027', 'Taco Bell': '#702082',
  'Burger King': '#D62300', "Wendy's": '#E2231A', 'Chick-fil-A': '#E51636', 'Subway': '#00833D', 'Popeyes': '#E8671F',
}

function getScrapeStage(progress) {
  if (!progress) return 'Starting up…'
  const { stage, finding_stores_done: done = 0, finding_stores_total: total = 3 } = progress
  if (stage === 'finding_stores' || stage === 'starting') return `Finding nearby stores… (${done}/${total})`
  if (stage === 'scraping_menus') return 'Scraping live menus…'
  if (stage === 'finalizing') return 'Ranking deals…'
  return 'Working…'
}

function getServerPct(progress) {
  if (!progress) return 5
  const { stage, finding_stores_done: fDone = 0, finding_stores_total: fTotal = 1, completed = 0, total_stores = 1 } = progress
  if (stage === 'finding_stores' || stage === 'starting')
    return fTotal > 0 ? Math.min(30, Math.round((fDone / fTotal) * 30)) : 5
  if (stage === 'scraping_menus')
    return Math.max(30, Math.min(90, 30 + Math.round((completed / total_stores) * 60)))
  if (stage === 'finalizing') return 93
  return 5
}

export default function HomePage() {
  const { location } = useLocation()
  const [deals, setDeals]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selectedRest, setSelectedRest] = useState('')
  const [sortBy, setSortBy]             = useState('value_score')
  const [isScraping, setIsScraping]     = useState(false)
  const [jobProgress, setJobProgress]   = useState(null)
  const [displayPct, setDisplayPct]     = useState(0)
  const [fetchedAt, setFetchedAt]       = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [lastScrapedLocation, setLastScrapedLocation] = useState(
    () => localStorage.getItem('lastScrapedLocation') || null
  )

  const pollRef      = useRef({ jobId: null, abort: false })
  const animFrameRef = useRef(null)
  const scrapeStart  = useRef(null)

  useEffect(() => {
    if (!isScraping) { cancelAnimationFrame(animFrameRef.current); return }
    scrapeStart.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - scrapeStart.current
      const timePct = 90 * (1 - Math.exp(-elapsed / 50000))
      setDisplayPct(p => Math.max(p, Math.max(timePct, getServerPct(jobProgress))))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScraping])

  useEffect(() => {
    if (!isScraping || !jobProgress) return
    const s = jobProgress.status
    if (s === 'completed' || s === 'partial' || s === 'failed') {
      cancelAnimationFrame(animFrameRef.current)
      setDisplayPct(s === 'failed' ? displayPct : 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobProgress?.status])

  useEffect(() => {
    if (!location) return
    if (location === lastScrapedLocation) { loadDeals(); return }
    startImport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    if (!location || isScraping) return
    loadDeals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRest, sortBy])

  async function loadDeals() {
    setLoading(true)
    try {
      const params = { limit: 20, sort_by: sortBy }
      if (selectedRest) params.restaurant = selectedRest
      const { data } = await dealsAPI.getDeals(params)
      setDeals(Array.isArray(data) ? data : [])
      setFetchedAt(Date.now())
      setError(null)
    } catch {
      setError('Failed to load deals. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  async function pollJob(jobId) {
    pollRef.current = { jobId, abort: false }
    for (let i = 0; i < 60; i++) {
      if (pollRef.current.abort) break
      try {
        const { data } = await dealsAPI.getUberEatsJob(jobId)
        const prog = data?.progress || {}
        setJobProgress({ ...prog, status: data.status })
        setDisplayPct(p => Math.max(p, getServerPct(prog)))
        if (data.status && !['running', 'queued'].includes(data.status)) return data
      } catch { /* keep polling */ }
      await new Promise(r => setTimeout(r, 4000))
    }
  }

  async function startImport() {
    if (!location) return
    if (location === lastScrapedLocation) { await loadDeals(); return }
    setIsScraping(true)
    setDisplayPct(0)
    setJobProgress({ stage: 'starting', finding_stores_done: 0, finding_stores_total: ALL_RESTAURANTS.length })
    setDeals([])
    try {
      const { data } = await dealsAPI.importUberEatsMenus({ location, restaurants: ALL_RESTAURANTS })
      const { job_id: jobId, status } = data || {}
      if (status === 'completed' || status === 'partial') {
        await loadDeals()
      } else if (jobId) {
        await pollJob(jobId)
        await loadDeals()
      } else {
        await loadDeals()
      }
      setLastScrapedLocation(location)
      localStorage.setItem('lastScrapedLocation', location)
    } catch {
      setError('Could not scrape Uber Eats. Showing available data.')
      await loadDeals()
    } finally {
      setIsScraping(false)
      setJobProgress(null)
    }
  }

  const pct           = Math.round(Math.min(100, displayPct))
  const hero          = deals[0]
  const restDeals     = deals.slice(1)
  const dealChains    = [...new Set(deals.map(d => d.restaurant_name))]
  const timeAgo       = fetchedAt
    ? Date.now() - fetchedAt < 60000 ? 'just now' : `${Math.round((Date.now() - fetchedAt) / 60000)}m ago`
    : null

  return (
    <div className="hero-bg min-h-screen">

      {/* ─── Page header ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2 text-center">
        <p className="label mb-2 tracking-widest">Fast food, ranked by actual value</p>
        <h1 className="text-4xl sm:text-5xl font-black gradient-text mb-2 tracking-tight leading-tight">
          Best Deals Near You
        </h1>
        <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
          Calories + protein per dollar — no opinions, just math.
        </p>
      </div>

      {/* ─── Controls ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3">

          {/* Chain pills — horizontal scroll on mobile */}
          <div className="pills-scroll flex-1 min-w-0">
            <button
              className={`rest-pill ${selectedRest === '' ? 'active' : ''}`}
              style={selectedRest === '' ? { background: '#1C1C1E', borderColor: '#1C1C1E' } : {}}
              onClick={() => setSelectedRest('')}
            >
              All Chains
            </button>
            {dealChains.map(r => {
              const isActive = selectedRest === r
              const c = REST_COLORS[r] || '#E85D54'
              return (
                <button key={r} className={`rest-pill ${isActive ? 'active' : ''}`}
                  style={isActive ? { background: c, borderColor: c } : {}}
                  onClick={() => setSelectedRest(isActive ? '' : r)}>
                  {r}
                </button>
              )
            })}
          </div>

          {/* Sort + refresh */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              disabled={isScraping}
              className="text-sm px-3 py-2 rounded-xl font-semibold bg-white cursor-pointer"
              style={{ border: '1.5px solid var(--border)' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={startImport}
              disabled={isScraping || !location}
              className="btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className={`w-4 h-4 ${isScraping ? 'spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isScraping ? 'Scanning…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

        {/* ─── Scraping overlay ─────────────────────────────────────── */}
        {isScraping && (
          <div className="card p-8 text-center fade-up mb-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center pulse-soft"
              style={{ background: 'linear-gradient(135deg,rgba(232,93,84,0.15),rgba(255,155,84,0.22))' }}>
              <svg className="w-7 h-7 spin" style={{ color: 'var(--brand)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Scanning Uber Eats</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{getScrapeStage(jobProgress)}</p>

            {jobProgress?.stores?.length > 0 && (
              <div className="flex justify-center gap-4 mb-6 flex-wrap">
                {jobProgress.stores.map((s, i) => {
                  const dotColor = s.status === 'found' || s.status === 'completed' ? '#10b981'
                    : s.status === 'failed' || s.status === 'not_found' ? '#ef4444' : '#f59e0b'
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                      {s.restaurant || `Store ${i + 1}`}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="max-w-sm mx-auto">
              <div className="progress-track mb-2" style={{ height: '10px' }}>
                <div className="progress-fill" style={{ height: '100%', width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{jobProgress?.completed ?? 0} / {jobProgress?.total_stores ?? ALL_RESTAURANTS.length} stores</span>
                <span className="font-black text-gray-800 text-sm">{pct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Skeletons ─────────────────────────────────────────────── */}
        {!isScraping && loading && (
          <div className="space-y-4">
            <div className="skeleton h-52 w-full" style={{ borderRadius: '24px' }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className="skeleton h-40" style={{ borderRadius: '20px', animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Error ─────────────────────────────────────────────────── */}
        {!isScraping && !loading && error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ─── Empty ─────────────────────────────────────────────────── */}
        {!isScraping && !loading && !error && deals.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border)' }}>
            <div className="text-5xl mb-4">🍔</div>
            <h3 className="text-lg font-bold text-gray-700 mb-1">No deals found</h3>
            <p className="text-gray-400 text-sm mb-6">Hit Refresh to scan Uber Eats near <strong>{location}</strong>.</p>
            <button onClick={startImport} className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm">Scan Now</button>
          </div>
        )}

        {/* ─── Deals ─────────────────────────────────────────────────── */}
        {!isScraping && !loading && !error && deals.length > 0 && (
          <>
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {selectedRest || 'Top Deals'}
                </h2>
                {timeAgo && <p className="text-xs text-gray-400 mt-0.5">Updated {timeAgo}</p>}
              </div>
              <span className="text-sm text-gray-400">{deals.length} deals</span>
            </div>

            {hero && (
              <div className="mb-6">
                <HeroDealCard deal={hero} onClick={() => setSelectedDeal(hero)} />
              </div>
            )}

            {restDeals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {restDeals.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} rank={i + 2}
                    animationDelay={(i + 1) * 45} onClick={() => setSelectedDeal(deal)} />
                ))}
              </div>
            )}

            <div className="mt-10 p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(232,93,84,0.06), rgba(255,155,84,0.08))', border: '1px solid rgba(232,93,84,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,var(--brand),var(--orange))' }}>
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-gray-800">How scores work</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--brand)' }} />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-bold text-gray-700">40% Satiety</span> — calories + protein
                    measured against 800 cal / 30g protein per meal
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--orange)' }} />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-bold text-gray-700">60% Price efficiency</span> — how much
                    you get vs. a $9 average fast food meal
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedDeal && <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </div>
  )
}
