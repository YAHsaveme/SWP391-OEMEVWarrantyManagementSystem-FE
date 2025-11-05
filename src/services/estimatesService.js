// src/services/estimatesService.js
import axiosInstance from "./axiosInstance"; 

const BASE = "/estimates";

const estimatesService = {
  // POST /api/estimates/create
  create: async (payload) => {
    // Log token để debug
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    console.log("[EstimatesService] Token exists:", !!token);
    console.log("[EstimatesService] Token length:", token?.length || 0);
    console.log("[EstimatesService] User role:", role);
    console.log("[EstimatesService] Payload:", JSON.stringify(payload, null, 2));
    console.log("[EstimatesService] Payload claim_id:", payload.claim_id);
    console.log("[EstimatesService] Payload itemsJson length:", payload.itemsJson?.length || 0);
    
    try {
      const res = await axiosInstance.post(`${BASE}/create`, payload);
      console.log("[EstimatesService] Create success:", res.data);
      return res.data;
    } catch (err) {
      console.error("[EstimatesService] Create error:", err);
      console.error("[EstimatesService] Error response:", err.response);
      console.error("[EstimatesService] Error status:", err.response?.status);
      console.error("[EstimatesService] Error data:", err.response?.data);
      console.error("[EstimatesService] Error headers:", err.response?.headers);
      console.error("[EstimatesService] Request config:", err.config);
      throw err;
    }
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
