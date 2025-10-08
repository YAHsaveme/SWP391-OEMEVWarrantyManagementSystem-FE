import api from "./axiosInstance";

const BASE_URL = "/api/shipments";

const shipmentService = {
  // 🚚 Lấy tất cả các lô hàng (có thể lọc hoặc phân trang)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy chi tiết 1 lô hàng theo ID
  getById: async (shipmentId) => {
    const response = await api.get(`${BASE_URL}/${shipmentId}`);
    return response.data;
  },

  // 📦 Lấy các lô hàng theo trung tâm bảo hành (serviceCenterId)
  getByServiceCenter: async (centerId) => {
    const response = await api.get(`${BASE_URL}/service-center/${centerId}`);
    return response.data;
  },

  // 🔧 Lấy các lô hàng liên quan tới yêu cầu bảo hành (claimId)
  getByClaim: async (claimId) => {
    const response = await api.get(`${BASE_URL}/claim/${claimId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm lô hàng theo từ khóa hoặc trạng thái
  search: async (query, status) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status },
    });
    return response.data;
  },

  // ➕ Tạo mới lô hàng
  create: async (shipmentData) => {
    const response = await api.post(BASE_URL, shipmentData);
    return response.data;
  },

  // ✏️ Cập nhật thông tin lô hàng
  update: async (shipmentId, shipmentData) => {
    const response = await api.put(`${BASE_URL}/${shipmentId}`, shipmentData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái lô hàng (VD: "IN_TRANSIT", "DELIVERED", "RETURNED")
  updateStatus: async (shipmentId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${shipmentId}/status`, statusData);
    return response.data;
  },

  // 📎 Upload chứng từ vận chuyển (hóa đơn, biên bản, ảnh ký nhận,...)
  uploadAttachment: async (shipmentId, formData) => {
    const response = await api.post(`${BASE_URL}/${shipmentId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // ❌ Xóa lô hàng
  delete: async (shipmentId) => {
    const response = await api.delete(`${BASE_URL}/${shipmentId}`);
    return response.data;
  },
};

export default shipmentService;
