import api from "./axiosInstance";

const BASE_URL = "/api/vehicles";

const vehicleService = {
  // Lấy tất cả xe (có thể phân trang, lọc theo trung tâm, model,...)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // Lấy thông tin 1 xe cụ thể theo id
  getById: async (vehicleId) => {
    const response = await api.get(`${BASE_URL}/${vehicleId}`);
    return response.data;
  },

  // Tìm xe theo từ khóa (biển số, model, chủ xe,...)
  search: async (query) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query },
    });
    return response.data;
  },

  // Lọc xe theo chủ sở hữu (userId)
  getByOwner: async (ownerId) => {
    const response = await api.get(`${BASE_URL}/owner/${ownerId}`);
    return response.data;
  },

  // Lọc xe theo modelId
  getByModel: async (modelId) => {
    const response = await api.get(`${BASE_URL}/model/${modelId}`);
    return response.data;
  },

  // Tạo mới xe
  create: async (vehicleData) => {
    const response = await api.post(BASE_URL, vehicleData);
    return response.data;
  },

  // Cập nhật xe
  update: async (vehicleId, vehicleData) => {
    const response = await api.put(`${BASE_URL}/${vehicleId}`, vehicleData);
    return response.data;
  },

  // Xóa xe
  delete: async (vehicleId) => {
    const response = await api.delete(`${BASE_URL}/${vehicleId}`);
    return response.data;
  },
};

export default vehicleService;
