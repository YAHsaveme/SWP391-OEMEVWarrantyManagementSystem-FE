import api from "./axiosInstance";

const BASE_URL = "/api/recall-campaigns";

const recallCampaignService = {
  // 📢 Lấy danh sách tất cả chiến dịch triệu hồi (có thể lọc theo trạng thái, năm, model,...)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy chi tiết 1 chiến dịch triệu hồi theo ID
  getById: async (campaignId) => {
    const response = await api.get(`${BASE_URL}/${campaignId}`);
    return response.data;
  },

  // 🚗 Lấy danh sách xe bị ảnh hưởng trong 1 chiến dịch
  getAffectedVehicles: async (campaignId) => {
    const response = await api.get(`${BASE_URL}/${campaignId}/vehicles`);
    return response.data;
  },

  // 🏢 Lấy danh sách chiến dịch áp dụng cho một trung tâm bảo hành
  getByServiceCenter: async (centerId) => {
    const response = await api.get(`${BASE_URL}/service-center/${centerId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm chiến dịch theo từ khóa hoặc trạng thái
  search: async (query, status) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status },
    });
    return response.data;
  },

  // ➕ Tạo mới chiến dịch triệu hồi
  create: async (campaignData) => {
    const response = await api.post(BASE_URL, campaignData);
    return response.data;
  },

  // ✏️ Cập nhật thông tin chiến dịch
  update: async (campaignId, campaignData) => {
    const response = await api.put(`${BASE_URL}/${campaignId}`, campaignData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái chiến dịch (VD: "ACTIVE", "COMPLETED", "CANCELLED")
  updateStatus: async (campaignId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${campaignId}/status`, statusData);
    return response.data;
  },

  // 📎 Upload tài liệu / thông báo chiến dịch (PDF, ảnh, biểu mẫu,...)
  uploadAttachment: async (campaignId, formData) => {
    const response = await api.post(`${BASE_URL}/${campaignId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // 🚘 Gắn thêm xe bị ảnh hưởng vào chiến dịch
  addVehicleToCampaign: async (campaignId, vehicleData) => {
    const response = await api.post(`${BASE_URL}/${campaignId}/vehicles`, vehicleData);
    return response.data;
  },

  // ❌ Xóa chiến dịch
  delete: async (campaignId) => {
    const response = await api.delete(`${BASE_URL}/${campaignId}`);
    return response.data;
  },
};

export default recallCampaignService;
