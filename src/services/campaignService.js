import api from "./axiosInstance";

const BASE_URL = "/api/campaigns";

const campaignService = {
  // 📋 Lấy tất cả chiến dịch (có thể truyền filter như trạng thái, thời gian, loại,...)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy chi tiết 1 chiến dịch theo ID
  getById: async (campaignId) => {
    const response = await api.get(`${BASE_URL}/${campaignId}`);
    return response.data;
  },

  // 🏢 Lấy các chiến dịch thuộc 1 trung tâm bảo hành cụ thể
  getByServiceCenter: async (centerId) => {
    const response = await api.get(`${BASE_URL}/service-center/${centerId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm chiến dịch theo từ khóa, trạng thái, hoặc thời gian
  search: async (query, status, year) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status, year },
    });
    return response.data;
  },

  // ➕ Tạo mới chiến dịch (có thể là khuyến mãi, bảo hành mở rộng,...)
  create: async (campaignData) => {
    const response = await api.post(BASE_URL, campaignData);
    return response.data;
  },

  // ✏️ Cập nhật thông tin chiến dịch
  update: async (campaignId, campaignData) => {
    const response = await api.put(`${BASE_URL}/${campaignId}`, campaignData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái chiến dịch ("PLANNED", "ACTIVE", "COMPLETED", "CANCELLED")
  updateStatus: async (campaignId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${campaignId}/status`, statusData);
    return response.data;
  },

  // 📎 Upload tài liệu / banner / hình ảnh liên quan chiến dịch
  uploadAttachment: async (campaignId, formData) => {
    const response = await api.post(`${BASE_URL}/${campaignId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // 🎯 Gửi thông báo tới khách hàng hoặc trung tâm bảo hành liên quan
  notifyParticipants: async (campaignId, messageData) => {
    const response = await api.post(`${BASE_URL}/${campaignId}/notify`, messageData);
    return response.data;
  },

  // 📊 Xuất báo cáo chiến dịch (file Excel hoặc PDF)
  exportReport: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  // ❌ Xóa chiến dịch
  delete: async (campaignId) => {
    const response = await api.delete(`${BASE_URL}/${campaignId}`);
    return response.data;
  },
};

export default campaignService;
