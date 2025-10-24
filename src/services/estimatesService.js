// src/services/estimatesService.js
import axiosInstance from "./axiosInstance"; 

const BASE = "estimates";

const estimatesService = {
  // POST /api/estimates/create
  create: async (payload) => {
    const res = await axiosInstance.post(`${BASE}/create`, payload);
    return res.data;
  },

  // PUT /api/estimates/{id}/update
  update: async (id, payload) => {
    const res = await axiosInstance.put(`${BASE}/${encodeURIComponent(id)}/update`, payload);
    return res.data;
  },

  // GET /api/estimates/{id}/get
  getById: async (id) => {
    const res = await axiosInstance.get(`${BASE}/${encodeURIComponent(id)}/get`);
    return res.data;
  },

  // GET /api/estimates/{claimId}/get-by-claim
  getByClaim: async (claimId) => {
    const res = await axiosInstance.get(`${BASE}/${encodeURIComponent(claimId)}/get-by-claim`);
    return res.data;
  },

  // GET /api/estimates/{claimId}/{versionNo}/get
  getByClaimAndVersion: async (claimId, versionNo) => {
    const res = await axiosInstance.get(`${BASE}/${encodeURIComponent(claimId)}/${encodeURIComponent(versionNo)}/get`);
    return res.data;
  },
};

export default estimatesService;
