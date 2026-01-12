import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const dealsAPI = {
  getDeals: (params = {}) => api.get("/deals", { params }),

  getTopDeals: (limit = 10) => api.get("/deals/top", { params: { limit } }),

  getDeal: (id) => api.get(`/deals/${id}`),

  createDeal: (dealData) => api.post("/deals", dealData),

  updateDeal: (id, dealData) => api.put(`/deals/${id}`, dealData),

  deleteDeal: (id) => api.delete(`/deals/${id}`),

  rankDeal: (id) => api.post(`/deals/${id}/rank`),

  rankAllDeals: () => api.post("/deals/rank-all"),

  importScrapedMenus: (params = {}) =>
    api.post("/scrape/import", null, { params }),

  importUberEatsMenus: (payload) => api.post("/scrape/ubereats", payload),
  getUberEatsJob: (jobId) => api.get(`/scrape/ubereats/jobs/${jobId}`),

  suggestLocations: (query, limit = 5) =>
    api.get("/locations/suggest", { params: { query, limit } }),

  getRestaurants: () => api.get("/restaurants"),

  getCategories: () => api.get("/categories"),
};

export default api;
