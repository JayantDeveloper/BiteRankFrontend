import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth token when available
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('admin_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

export const dealsAPI = {
  getDeals:           (params = {}) => api.get('/deals', { params }),
  getTopDeals:        (limit = 10)  => api.get('/deals/top', { params: { limit } }),
  getDeal:            (id)          => api.get(`/deals/${id}`),
  createDeal:         (data)        => api.post('/deals', data),
  updateDeal:         (id, data)    => api.put(`/deals/${id}`, data),
  deleteDeal:         (id)          => api.delete(`/deals/${id}`),
  rankDeal:           (id)          => api.post(`/deals/${id}/rank`),
  rankAllDeals:       ()            => api.post('/deals/rank-all'),

  importUberEatsMenus: (payload)    => api.post('/scrape/ubereats', payload),
  getUberEatsJob:      (jobId)      => api.get(`/scrape/ubereats/jobs/${jobId}`),

  suggestLocations:    (query, limit = 6) => api.get('/locations/suggest', { params: { query, limit } }),
  getRestaurants:      ()           => api.get('/restaurants'),
  getCategories:       ()           => api.get('/categories'),

  scrapeStatus:        ()           => api.get('/debug/scrape-status'),
}

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
}

export default api
