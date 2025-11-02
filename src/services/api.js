import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const dealsAPI = {
  // Get all deals
  getDeals: (params = {}) => api.get('/deals', { params }),

  // Get top deals
  getTopDeals: (limit = 10) => api.get('/deals/top', { params: { limit } }),

  // Get single deal
  getDeal: (id) => api.get(`/deals/${id}`),

  // Create deal
  createDeal: (dealData) => api.post('/deals', dealData),

  // Update deal
  updateDeal: (id, dealData) => api.put(`/deals/${id}`, dealData),

  // Delete deal
  deleteDeal: (id) => api.delete(`/deals/${id}`),

  // Rank single deal
  rankDeal: (id) => api.post(`/deals/${id}/rank`),

  // Rank all deals
  rankAllDeals: () => api.post('/deals/rank-all'),

  // Import and auto-rank menu items from supported restaurant websites
  importScrapedMenus: (params = {}) => api.post('/scrape/import', null, { params }),

  importUberEatsMenus: (payload) => api.post('/scrape/ubereats', payload),

  // Get restaurants
  getRestaurants: () => api.get('/restaurants'),

  // Get categories
  getCategories: () => api.get('/categories'),
}

export default api
