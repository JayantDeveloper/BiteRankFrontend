import { useState, useEffect, useMemo } from 'react'
import { dealsAPI } from '../services/api'
import { useLocation } from '../contexts/LocationContext'

function AdminPage() {
  const { location: userLocation } = useLocation()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importingUber, setImportingUber] = useState(false)
  const supportedUberRestaurants = useMemo(
    () => [
      "McDonald's",
      'KFC',
      'Taco Bell',
      "Wendy's",
      'Burger King',
      'Chick-fil-A',
      'Subway',
      'Popeyes',
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
      const response = await dealsAPI.getDeals({ active_only: false, limit: 100 })
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this deal?')) return
    try {
      await dealsAPI.deleteDeal(id)
      alert('Deal deleted successfully!')
      loadDeals()
    } catch (err) {
      console.error('Failed to delete deal:', err)
      alert('Failed to delete deal')
    }
  }

  const handleRankAll = async () => {
    if (!confirm('This will re-rank all deals using AI. Continue?')) return
    try {
      setRanking(true)
      const response = await dealsAPI.rankAllDeals()
      const results = Array.isArray(response.data) ? response.data : []
      const successful = results.filter(r => r?.success).length
      alert(`Successfully ranked ${successful} out of ${results.length} deals`)
      loadDeals()
    } catch (err) {
      console.error('Failed to rank deals:', err)
      alert('Failed to rank deals')
    } finally {
      setRanking(false)
    }
  }

  const handleImportMenus = async () => {
    if (importing) return
    if (!confirm('Scrape supported menus and auto-rank the results?')) return

    try {
      setImporting(true)
      const response = await dealsAPI.importScrapedMenus({ auto_rank: true })
      const data = response?.data ?? {}
      const { created = 0, updated = 0, ranked = 0, skipped = [] } = data
      alert(
        `Import complete.\nCreated: ${created}\nUpdated: ${updated}\nRanked: ${ranked}\nSkipped: ${skipped.length}`
      )
      loadDeals()
    } catch (err) {
      console.error('Failed to import menus:', err)
      alert('Failed to import menus')
    } finally {
      setImporting(false)
    }
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
      const data = response?.data ?? {}
      const { created = 0, updated = 0, ranked = 0, skipped = [] } = data
      alert(
        `Uber Eats import complete.\nCreated: ${created}\nUpdated: ${updated}\nRanked: ${ranked}\nSkipped: ${skipped.length}`
      )
      loadDeals()
    } catch (err) {
      console.error('Failed to import Uber Eats menus:', err)
      alert('Failed to import Uber Eats menus')
    } finally {
      setImportingUber(false)
    }
  }

  const handleRankOne = async (id) => {
    try {
      await dealsAPI.rankDeal(id)
      alert('Deal ranked successfully!')
      loadDeals()
    } catch (err) {
      console.error('Failed to rank deal:', err)
      alert('Failed to rank deal')
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

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2">
            Admin <span className="gradient-text">Panel</span>
          </h1>
          <p className="text-gray-400">Manage deals and AI rankings</p>

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

        {/* Automation Buttons */}
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
            DealScout uses your saved location to find the nearest Uber Eats stores for each supported chain,
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
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleUberEatsImport}
              disabled={importingUber || !userLocation}
              className="btn-gradient-purple text-white px-8 py-4 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-indigo-600/50 transition-all duration-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className={`w-5 h-5 ${importingUber ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h6l2-3h6a2 2 0 012 2v2m-1 5H9l-2 3H4a2 2 0 01-2-2v-2m9-7v12" />
              </svg>
              <span>{importingUber ? 'Importing from Uber Eats…' : 'Import Uber Eats Prices'}</span>
            </button>

            <button
              onClick={handleImportMenus}
              disabled={importing}
              className="btn-gradient-primary text-white px-8 py-4 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-[#b45343]/50 transition-all duration-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className={`w-5 h-5 ${importing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 1m4-3a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{importing ? 'Importing Menus…' : 'Import Latest Menus'}</span>
            </button>

          <button
            onClick={handleRankAll}
            disabled={ranking}
            className="btn-gradient-green text-white px-8 py-4 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-green-600/50 transition-all duration-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <svg className={`w-5 h-5 ${ranking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{ranking ? 'Ranking All Deals...' : 'Re-rank All Deals with AI'}</span>
          </button>
          </div>
        </div>

        {/* Deals Table */}
        <div className="bg-[#1a0f0d] rounded-xl border border-gray-900 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-900">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-[#b45343]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              All Deals ({deals.length})
            </h2>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-900">
                <thead className="bg-black">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Satiety</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">$/Cal</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cal</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Protein (g)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {deals.map((deal) => {
                    const valueScore = typeof deal.value_score === 'number' ? deal.value_score : null
                    const satiety = typeof deal.satiety_score === 'number' ? deal.satiety_score : null
                    const ppc = typeof deal.price_per_calorie === 'number' ? deal.price_per_calorie : null
                    const cal = typeof deal.calories === 'number' ? deal.calories : null
                    const protein = typeof deal.protein_grams === 'number' ? deal.protein_grams : null

                    const valueBadgeClass =
                      valueScore === null ? 'bg-gray-900 text-gray-500'
                      : valueScore >= 90 ? 'score-excellent'
                      : valueScore >= 70 ? 'score-good'
                      : 'score-average'

                    return (
                      <tr key={deal.id} className="hover:bg-gray-950 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                          {deal.restaurant_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {deal.item_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold gradient-text">
                          {fmtMoney(deal.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${valueBadgeClass}`}>
                            {valueScore === null ? '—' : fmtScore(valueScore, 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {fmtScore(satiety, 1)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold space-x-4">
                          <button
                            onClick={() => handleRankOne(deal.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Rank
                          </button>
                          <button
                            onClick={() => handleDelete(deal.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
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
