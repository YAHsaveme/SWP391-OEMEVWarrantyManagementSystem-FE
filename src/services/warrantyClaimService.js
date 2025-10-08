import api from "./axiosInstance";

const BASE_URL = "/api/warranty-claims";

const warrantyClaimService = {
  // 🧾 Lấy toàn bộ yêu cầu bảo hành (có thể lọc, phân trang)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy yêu cầu bảo hành theo ID
  getById: async (claimId) => {
    const response = await api.get(`${BASE_URL}/${claimId}`);
    return response.data;
  },

  // 👤 Lấy yêu cầu theo khách hàng (userId)
  getByCustomer: async (customerId) => {
    const response = await api.get(`${BASE_URL}/customer/${customerId}`);
    return response.data;
  },

  // 🏢 Lấy yêu cầu theo trung tâm bảo hành (serviceCenterId)
  getByServiceCenter: async (centerId) => {
    const response = await api.get(`${BASE_URL}/service-center/${centerId}`);
    return response.data;
  },

  // 🚗 Lấy yêu cầu theo xe (vehicleId)
  getByVehicle: async (vehicleId) => {
    const response = await api.get(`${BASE_URL}/vehicle/${vehicleId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm yêu cầu theo trạng thái hoặc từ khóa
  search: async (query, status) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status },
    });
    return response.data;
  },

  // ➕ Tạo mới yêu cầu bảo hành
  create: async (claimData) => {
    const response = await api.post(BASE_URL, claimData);
    return response.data;
  },

  // ✏️ Cập nhật yêu cầu bảo hành
  update: async (claimId, claimData) => {
    const response = await api.put(`${BASE_URL}/${claimId}`, claimData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái yêu cầu (VD: "APPROVED", "REJECTED", "IN_PROGRESS")
  updateStatus: async (claimId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${claimId}/status`, statusData);
    return response.data;
  },

  // 📎 Upload tài liệu hoặc hình ảnh chứng minh
  uploadAttachment: async (claimId, formData) => {
    const response = await api.post(`${BASE_URL}/${claimId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // ❌ Xóa yêu cầu bảo hành
  delete: async (claimId) => {
    const response = await api.delete(`${BASE_URL}/${claimId}`);
    return response.data;
  },
};

export default warrantyClaimService;
