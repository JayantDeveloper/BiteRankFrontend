import { useState, useEffect, useMemo } from 'react'
import { dealsAPI } from '../services/api'
import { useLocation } from '../contexts/LocationContext'

function AdminPage({ onLogout }) {
  const { location: userLocation } = useLocation()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [importingUber, setImportingUber] = useState(false)
  const [dealSort, setDealSort] = useState('value_desc')
  const [jobProgress, setJobProgress] = useState({
    show: false,
    completed: 0,
    failed: 0,
    total: 0,
    status: 'queued',
  })
  const supportedUberRestaurants = useMemo(
    () => [
      "McDonald's",
      'KFC',
      'Taco Bell',
    ],
    []
  )
  const [formData, setFormData] = useState({
    restaurant_name: '',
    item_name: '',
    price: '',
    description: '',
    portion_size: '',
    category: '',
    deal_type: '',
    calories: '',
    protein_grams: '',
  })

  useEffect(() => {
    loadDeals()
  }, [])

  const loadDeals = async () => {
    try {
      setLoading(true)
      const response = await dealsAPI.getDeals({ active_only: false, limit: 500 })
      setDeals(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to load deals:', err)
      alert('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const toFloatOrUndefined = (v) => {
    if (v === '' || v === null || v === undefined) return undefined
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : undefined
  }
  
  const toIntOrUndefined = (v) => {
    if (v === '' || v === null || v === undefined) return undefined
    const n = parseInt(v, 10)
    return Number.isInteger(n) ? n : undefined
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        restaurant_name: formData.restaurant_name,
        item_name: formData.item_name,
        price: toFloatOrUndefined(formData.price),
        description: formData.description || undefined,
        portion_size: formData.portion_size || undefined,
        category: formData.category || undefined,
        deal_type: formData.deal_type || undefined,
        calories: toIntOrUndefined(formData.calories),
        protein_grams: toFloatOrUndefined(formData.protein_grams),
      }

      await dealsAPI.createDeal(payload)
      alert('Deal created successfully!')
      setFormData({
        restaurant_name: '',
        item_name: '',
        price: '',
        description: '',
        portion_size: '',
        category: '',
        deal_type: '',
        calories: '',
        protein_grams: '',
      })
      loadDeals()
    } catch (err) {
      console.error('Failed to create deal:', err)
      alert('Failed to create deal')
    }
  }

  const mergeJobProgress = (prev, data) => {
    const prog = data?.progress || {}
    const totalFromServer = Number.isFinite(prog.total_stores) ? prog.total_stores : null
    const completedFromServer = Number.isFinite(prog.completed) ? prog.completed : null
    const failedFromServer = Number.isFinite(prog.failed) ? prog.failed : null
    const prevFailed = Number.isFinite(prev.failed) ? prev.failed : 0
    const prevDone = Number.isFinite(prev.completed) ? prev.completed : 0
    const prevCompletedOnly = Math.max(0, prevDone - prevFailed)
    const completedOnly = completedFromServer ?? prevCompletedOnly
    const failed = failedFromServer ?? prevFailed
    const done = completedOnly + failed
    const total =
      totalFromServer && totalFromServer > 0
        ? totalFromServer
        : prev.total || supportedUberRestaurants.length

    return {
      ...prev,
      show: true,
      completed: Math.max(prevDone, done),
      failed,
      total,
      status: data?.status || prev.status,
    }
  }

  const pollUberJob = async (jobId, { intervalMs = 2000, maxAttempts = 120 } = {}) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await dealsAPI.getUberEatsJob(jobId)
      const data = res?.data ?? {}
      setJobProgress((prev) => mergeJobProgress(prev, data))
      if (!data.status || data.status === 'running' || data.status === 'queued') {
        await new Promise((r) => setTimeout(r, intervalMs))
        continue
      }
      return data
    }
    throw new Error('Timed out waiting for Uber Eats job to finish')
  }

  const handleUberEatsImport = async () => {
    if (importingUber) return
    if (!userLocation) {
      alert('Set your location first so we know which market to price.')
      return
    }

    const restaurantListDisplay = supportedUberRestaurants.join(', ')
    if (
      !confirm(
        `Import Uber Eats pricing for ${restaurantListDisplay} near ${userLocation}?`
      )
    )
      return

    try {
      setImportingUber(true)
      const payload = {
        location: userLocation,
        restaurants: supportedUberRestaurants,
      }
      const response = await dealsAPI.importUberEatsMenus(payload)
      const jobId = response?.data?.job_id
      if (!jobId) throw new Error('Job not started')

      setJobProgress({
        show: true,
        completed: 0,
        failed: 0,
        total: supportedUberRestaurants.length,
        status: 'queued',
      })

      const jobResult = await pollUberJob(jobId)
      const result = jobResult?.result || {}
      const ranked = Array.isArray(result.ranked_deals) ? result.ranked_deals.length : result.ranked || 0
      const skipped = Array.isArray(result.unranked_deals) ? result.unranked_deals.length : 0
      const metadata = result.metadata || {}
      const storesAttempted = metadata.stores_attempted || (jobResult?.progress?.total_stores ?? 0)
      const progress = jobResult?.progress || {}
      const completedStores = progress.completed || 0
      const failedStores = progress.failed || 0
      const totalStores = progress.total_stores || storesAttempted || supportedUberRestaurants.length
      const inferredStatus =
        completedStores === totalStores && failedStores === 0 ? 'completed' : jobResult.status || 'unknown'

      alert(
        `Uber Eats import ${inferredStatus}.\nStores attempted: ${totalStores}\nCompleted: ${completedStores}\nFailed: ${failedStores}\nRanked deals: ${ranked}\nUnranked: ${skipped}`
      )
      loadDeals()
    } catch (err) {
      console.error('Failed to import Uber Eats menus:', err)
      alert('Failed to import Uber Eats menus')
    } finally {
      setImportingUber(false)
      setJobProgress({ show: false, completed: 0, failed: 0, total: 0, status: 'done' })
    }
  }

  const fmtMoney = (n) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
    return `$${n.toFixed(2)}`
  }
  
  const fmtScore = (n, digits = 0) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
    return n.toFixed(digits)
  }

  const sortedDeals = [...deals].sort((a, b) => {
    switch (dealSort) {
      case 'restaurant_asc':
        return (a.restaurant_name || '').localeCompare(b.restaurant_name || '')
      case 'price_asc':
        return (a.price || 0) - (b.price || 0)
      case 'value_desc':
      default:
        return (b.value_score || 0) - (a.value_score || 0)
    }
  })

  return (
    <div className="min-h-screen bg-black">
      {jobProgress.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a0f0d] border border-[#b45343]/40 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#b45343] animate-pulse"></span>
              <span>Scraping Uber Eats</span>
            </h3>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-300 mb-3">
              <span>Loading</span>
              <span>
                {(jobProgress.total || supportedUberRestaurants.length)
                  ? Math.min(
                      100,
                      Math.round(
                        (jobProgress.completed / (jobProgress.total || supportedUberRestaurants.length)) * 100
                      )
                    )
                  : 10}
                %
              </span>
            </div>
            <div className="w-full border-2 border-slate-600 rounded-md bg-white/5 p-1 shadow-sm">
              <div
                className="h-4 rounded-sm transition-all duration-500 ease-out"
                style={{
                  width: `${(jobProgress.total || supportedUberRestaurants.length) ? Math.min(100, Math.round((jobProgress.completed / (jobProgress.total || supportedUberRestaurants.length)) * 100)) : 10}%`,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--brand-primary) 0 14px, rgba(0,0,0,0) 14px 18px)",
                }}
              ></div>
            </div>
            <p className="mt-3 text-sm text-gray-300">
              Checking {jobProgress.completed}/{jobProgress.total || supportedUberRestaurants.length} stores
            </p>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2">
            Admin <span className="gradient-text">Panel</span>
          </h1>
          <p className="text-gray-400">Manually add deals or import Uber Eats menus</p>
        </div>

        {/* Add Deal Form */}
        <div className="bg-[#1a0f0d] rounded-xl border border-gray-900 p-8 mb-8 hover:border-[#b45343] hover:border-opacity-30 transition-all duration-300">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-[#b45343]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Deal
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.restaurant_name}
                  onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., McDonald's"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., Big Mac Meal"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="9.99"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., 650"
                />
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Optional. AI will estimate if blank
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Protein (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.protein_grams}
                  onChange={(e) => setFormData({ ...formData, protein_grams: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., 25"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Portion Size
                </label>
                <input
                  type="text"
                  value={formData.portion_size}
                  onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., Large, Combo"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., Burger, Chicken"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Deal Type
                </label>
                <input
                  type="text"
                  value={formData.deal_type}
                  onChange={(e) => setFormData({ ...formData, deal_type: e.target.value })}
                  className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                  placeholder="e.g., App Exclusive, Limited Time"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343] focus:ring-opacity-20 transition-all"
                placeholder="Describe the deal..."
              />
            </div>

            <button
              type="submit"
            className="w-full btn-gradient-primary text-white px-8 py-4 rounded-lg font-bold text-lg btn-glow hover:shadow-lg hover:shadow-[#b45343]/50 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add Deal (Auto-ranks with AI)</span>
            </button>
          </form>
        </div>

        {/* Uber Eats Import (kept) */}
        <div className="mb-8 space-y-4">
          <div className="bg-black border border-gray-800 rounded-lg p-4 flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-[#b45343] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Current Location: </span>
                <span className="text-white font-bold ml-2">{userLocation || 'Not set yet'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {userLocation
                ? 'Prices will be fetched for this location'
                : 'Set your location to enable local pricing imports'}
            </p>
          </div>

          <div className="bg-[#1a0f0d] rounded-xl border border-gray-900 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-[#b45343]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Uber Eats Import
            </h3>

            <p className="text-gray-400 mb-4">
              BiteRank uses your saved location to find the nearest Uber Eats stores for each supported chain,
              then imports menu pricing and nutrition automatically. No manual URLs needed.
            </p>

            <div className="bg-black border border-gray-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Chains imported automatically
              </p>
              <div className="flex flex-wrap gap-2">
                {supportedUberRestaurants.map((restaurant) => (
                  <span
                    key={restaurant}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#1a0f0d] border border-gray-800 text-sm text-gray-300"
                  >
                    {restaurant}
                  </span>
                ))}
              </div>
            </div>

            {!userLocation && (
              <p className="mt-4 text-sm text-yellow-400 flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.335-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.672-1.742-3.007L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-.25-6.75a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4z" clipRule="evenodd" />
                </svg>
                Set your location from the welcome prompt first so we know which market to query.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleUberEatsImport}
              disabled={importingUber || !userLocation}
              className="btn-gradient-blue text-white px-8 py-4 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-sky-500/40 transition-all duration-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className={`w-5 h-5 ${importingUber ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h6l2-3h6a2 2 0 012 2v2m-1 5H9l-2 3H4a2 2 0 01-2-2v-2m9-7v12" />
              </svg>
              <span>{importingUber ? 'Importing from Uber Eats…' : 'Import Uber Eats Prices'}</span>
            </button>
          </div>
        </div>

        {/* Deals Table */}
        <div className="bg-[#1a0f0d] rounded-xl border border-gray-900 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-[#b45343]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              All Deals ({deals.length})
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase text-gray-400">Sort by</label>
              <select
                value={dealSort}
                onChange={(e) => setDealSort(e.target.value)}
                className="bg-black border border-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:border-[#b45343] focus:ring-2 focus:ring-[#b45343]/30"
              >
                <option value="value_desc">Value score (high → low)</option>
                <option value="price_asc">Price (low → high)</option>
                <option value="restaurant_asc">Restaurant (A → Z)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 spinner mb-4"></div>
              <p className="text-gray-400">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-400 font-bold mb-2">No deals yet</p>
              <p className="text-gray-600">Add your first deal above!</p>
            </div>
          ) : (
            <div>
              <table className="w-full table-fixed divide-y divide-gray-900">
                <thead className="bg-black">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Restaurant</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-52">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Satiety</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">$/Cal</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Cal</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Protein (g)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {sortedDeals.map((deal) => {
                    const valueScore = typeof deal.value_score === 'number' ? deal.value_score : null
                    const satiety = typeof deal.satiety_score === 'number' ? deal.satiety_score : null
                    const ppc = typeof deal.price_per_calorie === 'number' ? deal.price_per_calorie : null
                    const cal = typeof deal.calories === 'number' ? deal.calories : null
                    const protein = typeof deal.protein_grams === 'number' ? deal.protein_grams : null
                    const isUnranked = valueScore === null || valueScore <= 0

                    const getScoreGradient = (score) => {
                      if (score === null) return 'linear-gradient(135deg, #374151, #1f2937)'
                      if (score >= 91) return 'linear-gradient(135deg, #0B6E3F, #1EAD5A)'
                      if (score >= 81) return 'linear-gradient(135deg, #1EAD5A, #2ECC71)'
                      if (score >= 71) return 'linear-gradient(135deg, #2ECC71, #7BC043)'
                      if (score >= 61) return 'linear-gradient(135deg, #7BC043, #B5CC18)'
                      if (score >= 51) return 'linear-gradient(135deg, #B5CC18, #F1C40F)'
                      if (score >= 41) return 'linear-gradient(135deg, #F1C40F, #E67E22)'
                      if (score >= 31) return 'linear-gradient(135deg, #E67E22, #CC4E00)'
                      if (score >= 21) return 'linear-gradient(135deg, #CC4E00, #A61919)'
                      if (score >= 11) return 'linear-gradient(135deg, #A61919, #7A0D0D)'
                      return 'linear-gradient(135deg, #7A0D0D, #7A0D0D)'
                    }

                    return (
                      <tr key={deal.id} className="hover:bg-gray-950 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                          {deal.restaurant_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 max-h-16 overflow-y-auto break-words">
                          {deal.item_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold gradient-text">
                          {deal.price == null ? '—' : fmtMoney(deal.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className="inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm"
                            style={{
                              background: isUnranked
                                ? 'linear-gradient(135deg, #374151, #1f2937)'
                                : getScoreGradient(valueScore),
                              color: '#0a0a0a',
                            }}
                          >
                            {isUnranked ? 'Unranked' : fmtScore(valueScore, 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {satiety === null ? '—' : fmtScore(satiety, 1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {ppc === null ? '—' : `$${ppc.toFixed(4)}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {cal ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {protein === null ? '—' : protein.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {deal.is_active ? (
                            <span className="text-green-400 font-bold">✓</span>
                          ) : (
                            <span className="text-red-400 font-bold">✗</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
