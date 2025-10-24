// src/services/diagnosticsService.js
import axiosInstance from "./axiosInstance";

/**
 * Diagnostics service - thin wrappers around backend endpoints you provided.
 * Endpoints assumed relative to axiosInstance.baseURL which you configured as ".../api/"
 */

const BASE = "diagnostics";

const diagnosticsService = {
  // GET /api/diagnostics/get-all
  getAll: () => axiosInstance.get(`${BASE}/get-all`),

  // GET /api/diagnostics/my-diagnostics?page=0&size=10
  getMyDiagnostics: (page = 0, size = 10) =>
    axiosInstance.get(`${BASE}/my-diagnostics`, { params: { page, size } }),

  // GET /api/diagnostics/{id}/get-by-id
  getById: (id) => axiosInstance.get(`${BASE}/${id}/get-by-id`),

  // GET /api/diagnostics/{claimId}/get-by-claim
  getByClaim: (claimId) => axiosInstance.get(`${BASE}/${claimId}/get-by-claim`),

  // Lấy bản theo phase từ get-by-claim
  getByClaimPhase: async (claimId, phase) => {
    const resp = await axiosInstance.get(`${BASE}/${claimId}/get-by-claim`);
    const list = resp.data || [];
    return list.find((d) => d.phase === phase);
  },

  // GET /api/diagnostics/{claimId}/next-phase
  getNextPhase: (claimId) => axiosInstance.get(`${BASE}/${claimId}/next-phase`),

  // GET /api/diagnostics/{claimId}/can-complete
  canComplete: (claimId) => axiosInstance.get(`${BASE}/${claimId}/can-complete`),

  // POST /api/diagnostics/create
  create: (payload) => axiosInstance.post(`${BASE}/create`, payload),

  // PUT /api/diagnostics/{id}/update
  update: (id, payload) => axiosInstance.put(`${BASE}/${id}/update`, payload),
};

export default diagnosticsService;
