import axiosInstance from "./axiosInstance";

const BASE = "diagnostics";

const diagnosticsService = {
  /** 🔹 Lấy tất cả diagnostics */
  getAll: async () => {
    const res = await axiosInstance.get(`${BASE}/get-all`);
    return res.data;
  },

  /** 🔹 Lấy danh sách diagnostics của người dùng hiện tại */
  getMyDiagnostics: async (page = 0, size = 10) => {
    const res = await axiosInstance.get(`${BASE}/my-diagnostics`, {
      params: { page, size },
    });
    return res.data;
  },

  /** 🔹 Lấy 1 diagnostic theo ID */
  getById: async (id) => {
    const res = await axiosInstance.get(`${BASE}/${id}/get-by-id`);
    return res.data;
  },

  /** 🔹 Lấy tất cả diagnostics theo claimId */
  getByClaim: async (claimId) => {
    const res = await axiosInstance.get(`${BASE}/${claimId}/get-by-claim`);
    return res.data;
  },

  /** 🔹 Tạo mới diagnostic */
  create: async (payload) => {
    const cleanPayload = {
      claimId: payload.claimId?.trim?.() || null,
      sohPct: parseFloat(payload.sohPct) || 0,
      socPct: parseFloat(payload.socPct) || 0,
      packVoltage: parseFloat(payload.packVoltage) || 0,
      cellDeltaMv: parseFloat(payload.cellDeltaMv) || 0,
      cycles: parseInt(payload.cycles) || 0,
      notes: payload.notes?.trim() || "",
    };

    console.log("📤 [Diagnostics] POST /create", cleanPayload);
    const res = await axiosInstance.post(`${BASE}/create`, cleanPayload);
    return res.data;
  },

  /** 🔹 Cập nhật diagnostic */
  update: async (id, payload) => {
    const cleanPayload = {
      claimId: payload.claimId?.trim?.() || null,
      sohPct: parseFloat(payload.sohPct) || 0,
      socPct: parseFloat(payload.socPct) || 0,
      packVoltage: parseFloat(payload.packVoltage) || 0,
      cellDeltaMv: parseFloat(payload.cellDeltaMv) || 0,
      cycles: parseInt(payload.cycles) || 0,
      notes: payload.notes?.trim() || "",
    };

    console.log(`📤 [Diagnostics] PUT /${id}/update`, cleanPayload);
    const res = await axiosInstance.put(`${BASE}/${id}/update`, cleanPayload);
    return res.data;
  },
};

export default diagnosticsService;
