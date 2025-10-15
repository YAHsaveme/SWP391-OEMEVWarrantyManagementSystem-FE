import api from "./axiosInstance";

// ================== WARRANTY POLICY SERVICE ==================
const BASE = "warranty-policies";

const warrantyPolicyService = {
  // 📌 Lấy tất cả policies
  getAll: async () => {
    const res = await api.get(`${BASE}/get-all`);
    return res.data;
  },

  // 📌 Tìm kiếm (filter theo keyword, status, modelCode, phân trang)
  search: async (params) => {
    // 🧠 Làm sạch các field rỗng/null để tránh lỗi Enum
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined
      )
    );

    const res = await api.post(`${BASE}/search`, cleanParams);
    return res.data;
  },

  // 📌 Lấy theo modelCode
  getByModelCode: async (modelCode) => {
    const res = await api.get(`${BASE}/${modelCode}/get`);
    return res.data;
  },

  // 📌 Tạo mới
  create: async (payload) => {
    const res = await api.post(`${BASE}/create`, payload);
    return res.data;
  },

  // 📌 Cập nhật thông tin
  updateInfo: async (policyId, payload) => {
    const res = await api.put(`${BASE}/${policyId}/update-info`, payload);
    return res.data;
  },

  // 📌 Cập nhật trạng thái
  updateStatus: async (policyId, payload) => {
    const res = await api.put(`${BASE}/${policyId}/status-update`, payload);
    return res.data;
  },

  // 📌 Khôi phục (restore)
  restore: async (policyId, payload) => {
    const res = await api.post(`${BASE}/${policyId}/restore`, payload);
    return res.data;
  },

  // 📌 Vô hiệu hóa (disable)
  disable: async (policyId, payload) => {
    const res = await api.post(`${BASE}/${policyId}/disable`, payload);
    return res.data;
  },
};

export default warrantyPolicyService;
