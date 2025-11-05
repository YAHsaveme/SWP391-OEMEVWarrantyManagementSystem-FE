import api from "./axiosInstance";

const BASE_URL = "/repair-jobs"; // axiosInstance đã có baseURL = "/api", nên không cần /api nữa

const repairJobService = {
  // 📋 Lấy tất cả công việc sửa chữa (có thể lọc hoặc phân trang)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy công việc theo ID
  getById: async (jobId) => {
    const response = await api.get(`${BASE_URL}/${jobId}`);
    return response.data;
  },

  // 🧾 Lấy công việc theo yêu cầu bảo hành (claimId)
  getByClaim: async (claimId) => {
    const response = await api.get(`${BASE_URL}/claim/${claimId}`);
    return response.data;
  },

  // 👨‍🔧 Lấy công việc theo kỹ thuật viên (technicianId)
  getByTechnician: async (technicianId) => {
    const response = await api.get(`${BASE_URL}/technician/${technicianId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm công việc theo từ khóa hoặc trạng thái
  search: async (query, status) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status },
    });
    return response.data;
  },

  // ➕ Tạo mới công việc sửa chữa
  create: async (jobData) => {
    const response = await api.post(BASE_URL, jobData);
    return response.data;
  },

  // ✏️ Cập nhật thông tin công việc
  update: async (jobId, jobData) => {
    const response = await api.put(`${BASE_URL}/${jobId}`, jobData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái công việc (VD: "IN_PROGRESS", "COMPLETED", "CANCELLED")
  updateStatus: async (jobId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${jobId}/status`, statusData);
    return response.data;
  },

  // 📎 Upload báo cáo, ảnh, video sau khi sửa chữa
  uploadAttachment: async (jobId, formData) => {
    const response = await api.post(`${BASE_URL}/${jobId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // ❌ Xóa công việc
  delete: async (jobId) => {
    const response = await api.delete(`${BASE_URL}/${jobId}`);
    return response.data;
  },
};

export default repairJobService;
