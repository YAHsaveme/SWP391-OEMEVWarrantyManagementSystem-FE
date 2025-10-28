import axiosInstance from "./axiosInstance";

const BASE = "diagnostics";

const diagnosticsService = {
  /** 🔹 Lấy tất cả diagnostics (array) */
  getAll: async () => {
    const res = await axiosInstance.get(`${BASE}/get-all`);
    return res.data;
  },

  /** 🔹 Lấy danh sách diagnostics của người dùng hiện tại (phân trang) */
  getMyDiagnostics: async (page = 0, size = 10) => {
    const res = await axiosInstance.get(`${BASE}/my-diagnostics`, {
      params: { page, size },
    });
    return res.data; // chứa totalPages, content, ...
  },

  /** 🔹 Lấy 1 bản theo id */
  getById: async (id) => {
    const res = await axiosInstance.get(`${BASE}/${id}/get-by-id`);
    return res.data;
  },

  /** 🔹 Lấy tất cả diagnostics theo claimId */
  getByClaim: async (claimId) => {
    const res = await axiosInstance.get(`${BASE}/${claimId}/get-by-claim`);
    return res.data; // array
  },

  /** 🔹 Tạo mới diagnostics */
  create: async (payload) => {
    // đảm bảo không undefined
    const cleanPayload = {
      claimId: payload.claimId,
      sohPct: Number(payload.sohPct || 0),
      socPct: Number(payload.socPct || 0),
      packVoltage: Number(payload.packVoltage || 0),
      cellDeltaMv: Number(payload.cellDeltaMv || 0),
      cycles: Number(payload.cycles || 0),
      notes: payload.notes?.trim() || "",
    };
    const res = await axiosInstance.post(`${BASE}/create`, cleanPayload);
    return res.data;
  },

  /** 🔹 Cập nhật diagnostics */
  update: async (id, payload) => {
    const cleanPayload = {
      claimId: payload.claimId,
      sohPct: Number(payload.sohPct || 0),
      socPct: Number(payload.socPct || 0),
      packVoltage: Number(payload.packVoltage || 0),
      cellDeltaMv: Number(payload.cellDeltaMv || 0),
      cycles: Number(payload.cycles || 0),
      notes: payload.notes?.trim() || "",
    };
    const res = await axiosInstance.put(`${BASE}/${id}/update`, cleanPayload);
    return res.data;
  },
};

export default diagnosticsService;
