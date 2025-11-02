import { useState, useEffect } from 'react'
import { dealsAPI } from '../services/api'
import DealCard from '../components/DealCard'

function HomePage() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    loadDeals()
    loadFilters()
  }, [selectedRestaurant, selectedCategory])

  const loadDeals = async () => {
    try {
      setLoading(true)
      const params = {}
      if (selectedRestaurant) params.restaurant = selectedRestaurant
      if (selectedCategory) params.category = selectedCategory

      const response = await dealsAPI.getTopDeals(10)
      setDeals(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load deals. Make sure the backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadFilters = async () => {
    try {
      const [restaurantsRes, categoriesRes] = await Promise.all([
        dealsAPI.getRestaurants(),
        dealsAPI.getCategories()
      ])
      setRestaurants(restaurantsRes.data)
      setCategories(categoriesRes.data)
    } catch (err) {
      console.error('Failed to load filters:', err)
    }
  }

  const handleRefresh = () => {
    loadDeals()
    loadFilters()
  }

  return (
    <div className="bg-canvas min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-slate-100">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="badge-gold mb-6 inline-flex">
            ⚡ AI-Powered Rankings
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 gradient-text">
            DealScout
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-200 mb-4">
            Top 10 Fast Food Deals Near You
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Discover the best value deals ranked by our advanced AI algorithm
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-slate-400">
            <svg className="w-4 h-4 text-orange-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>Updated in real-time</span>
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
                  className="block w-full px-4 py-3 bg-black/20 border border-slate-700/40 rounded-lg text-slate-100 focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/40 focus:outline-none transition-all"
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
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-4 py-3 bg-black/20 border border-slate-700/40 rounded-lg text-slate-100 focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/40 focus:outline-none transition-all"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              className="btn-gradient-primary px-8 py-3 rounded-lg font-bold btn-glow hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 spinner mb-6"></div>
            <p className="text-slate-400 text-lg font-medium">Loading deals...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="surface-soft border border-red-400/40 text-red-200 px-6 py-4 rounded-xl mb-8 flex items-center space-x-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && deals.length === 0 && (
          <div className="surface-card text-center py-20 border-dashed border-2 border-slate-600">
            <svg className="w-20 h-20 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-200 text-xl font-bold mb-2">No deals found</p>
            <p className="text-slate-400">
              Add some deals in the admin panel to get started!
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
  )
}

export default HomePage
