import axiosInstance from "./axiosInstance";

const BASE = "diagnostics";

const diagnosticsService = {
  /** 🔹 Lấy tất cả diagnostics */
  getAll: async () => {
    const res = await axiosInstance.get(`${BASE}/get-all`);
    return res.data;
  },

  /** 🔹 Lấy danh sách diagnostics của người dùng hiện tại (có phân trang) */
  getMyDiagnostics: async (page = 0, size = 10) => {
    const res = await axiosInstance.get(`${BASE}/my-diagnostics`, {
      params: { page, size },
    });
    return res.data;
  },

  /** 🔹 Lấy 1 diagnostic theo ID */
  getById: async (id) => {
    if (!id) throw new Error("ID không được để trống");
    const res = await axiosInstance.get(`${BASE}/${id}/get-by-id`);
    return res.data;
  },

  /** 🔹 Lấy tất cả diagnostics theo claimId */
  getByClaim: async (claimId) => {
    if (!claimId) throw new Error("ClaimId không được để trống");
    const res = await axiosInstance.get(`${BASE}/${claimId}/get-by-claim`);
    return res.data;
  },

  /** 🔹 Tạo mới diagnostic */
  create: async (payload) => {
    // Validation
    if (!payload.claimId) {
      throw new Error("ClaimId là bắt buộc");
    }

    // Clean và chuẩn hóa dữ liệu
    const cleanPayload = {
      claimId: payload.claimId?.trim?.() || null,
      sohPct: payload.sohPct !== null && payload.sohPct !== undefined && payload.sohPct !== ""
        ? parseFloat(payload.sohPct)
        : null,
      socPct: payload.socPct !== null && payload.socPct !== undefined && payload.socPct !== ""
        ? parseFloat(payload.socPct)
        : null,
      packVoltage: payload.packVoltage !== null && payload.packVoltage !== undefined && payload.packVoltage !== ""
        ? parseFloat(payload.packVoltage)
        : null,
      cellDeltaMv: payload.cellDeltaMv !== null && payload.cellDeltaMv !== undefined && payload.cellDeltaMv !== ""
        ? parseFloat(payload.cellDeltaMv)
        : null,
      cycles: payload.cycles !== null && payload.cycles !== undefined && payload.cycles !== ""
        ? parseInt(payload.cycles, 10)
        : null,
      notes: payload.notes?.trim() || "",
      outcome: payload.outcome?.trim() || null, // outcome có thể null
    };

    console.log("📤 [Diagnostics] POST /create", cleanPayload);
    const res = await axiosInstance.post(`${BASE}/create`, cleanPayload);
    console.log("✅ [Diagnostics] Created successfully:", res.data);
    return res.data;
  },

  /** 🔹 Cập nhật diagnostic */
  update: async (id, payload) => {
    // Validation
    if (!id) {
      throw new Error("ID không được để trống");
    }
    if (!payload.claimId) {
      throw new Error("ClaimId là bắt buộc");
    }

    // Clean và chuẩn hóa dữ liệu
    const cleanPayload = {
      claimId: payload.claimId?.trim?.() || null,
      sohPct: payload.sohPct !== null && payload.sohPct !== undefined && payload.sohPct !== ""
        ? parseFloat(payload.sohPct)
        : null,
      socPct: payload.socPct !== null && payload.socPct !== undefined && payload.socPct !== ""
        ? parseFloat(payload.socPct)
        : null,
      packVoltage: payload.packVoltage !== null && payload.packVoltage !== undefined && payload.packVoltage !== ""
        ? parseFloat(payload.packVoltage)
        : null,
      cellDeltaMv: payload.cellDeltaMv !== null && payload.cellDeltaMv !== undefined && payload.cellDeltaMv !== ""
        ? parseFloat(payload.cellDeltaMv)
        : null,
      cycles: payload.cycles !== null && payload.cycles !== undefined && payload.cycles !== ""
        ? parseInt(payload.cycles, 10)
        : null,
      notes: payload.notes?.trim() || "",
      outcome: payload.outcome?.trim() || "",
    };

    console.log(`📤 [Diagnostics] PUT /${id}/update`, cleanPayload);
    const res = await axiosInstance.put(`${BASE}/${id}/update`, cleanPayload);
    console.log("✅ [Diagnostics] Updated successfully:", res.data);
    return res.data;
  },
};

export default diagnosticsService;