import api from "./axiosInstance";

const BASE_URL = "/vehicles"; // axiosInstance đã có baseURL = "/api", nên không cần /api nữa

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

  // Lấy thông tin xe theo VIN
  getByVin: async (vin) => {
    const response = await api.get(`${BASE_URL}/detail/${encodeURIComponent(vin)}`);
    return response.data;
  },

  // Lấy danh sách vehicles để hiển thị trong form tạo claim
  // Lưu ý: Backend hiện tại không có endpoint bulk để lấy vehicles đã kích hoạt bảo hành
  // Vehicle Warranties API chỉ hỗ trợ: GET /api/vehicle-warranties/{vin}/get (theo từng VIN)
  // Vì vậy ta lấy tất cả vehicles và để backend validate khi tạo claim
  // Backend sẽ báo lỗi nếu VIN chưa kích hoạt: "Không thể tạo claim cho xe chưa kích hoạt bảo hành..."
  getWithWarranty: async () => {
    // Nếu backend sau này thêm endpoint /api/vehicles/with-warranty, code sẽ tự động sử dụng
    try {
      const response = await api.get(`${BASE_URL}/with-warranty`);
      const data = response.data;
      return Array.isArray(data) ? data : (data?.data || data?.vehicles || []);
    } catch (err) {
      // Hiện tại: lấy tất cả vehicles từ /api/vehicles/get-all
      // Backend sẽ validate khi tạo claim
      try {
        const response = await api.get(`${BASE_URL}/get-all`);
        const data = response.data;
        return Array.isArray(data) ? data : (data?.data || []);
      } catch (err2) {
        console.error("Failed to get all vehicles:", err2);
        return [];
      }
    }
  },
};

export default vehicleService;
