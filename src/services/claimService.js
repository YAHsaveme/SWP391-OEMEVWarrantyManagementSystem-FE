// src/services/claimService.js
import axiosInstance from "./axiosInstance";

const BASE = "claims";

const claimService = {
  // GET /api/claims/get-all
  async getAll() {
    const res = await axiosInstance.get(`${BASE}/get-all`);
    return res.data;
  },

  // GET /api/claims/{id}/get
  async getById(id) {
    const res = await axiosInstance.get(`${BASE}/${id}/get`);
    return res.data;
  },

  // GET /api/claims/by-vin/{vin}/get
  async getByVin(vin) {
    const res = await axiosInstance.get(`${BASE}/by-vin/${encodeURIComponent(vin)}/get`);
    return res.data;
  },

  // GET /api/claims/by-status/{status}/get
  async getByStatus(status) {
    const res = await axiosInstance.get(`${BASE}/by-status/${encodeURIComponent(status)}/get`);
    return res.data;
  },

  // POST /api/claims/create
  // payload: { vin, claimType, errorDate, odometerKm, summary, attachmentUrls: [string URLs] }
  async create(payload) {
    const res = await axiosInstance.post(`${BASE}/create`, payload);
    return res.data;
  },

  // PUT /api/claims/{claimId}/update
  // payload: { summary, attachmentUrls, odometerKm, errorDate }
  async update(claimId, payload) {
    const res = await axiosInstance.put(`${BASE}/${claimId}/update`, payload);
    return res.data;
  },

  // PUT /api/claims/{claimId}/update-status
  async updateStatus(claimId, status) {
    const res = await axiosInstance.put(`${BASE}/${claimId}/update-status`, { status });
    return res.data;
  },
};

export default claimService;
