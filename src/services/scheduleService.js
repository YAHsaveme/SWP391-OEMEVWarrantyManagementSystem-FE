import api from "./axiosInstance";

const BASE_URL = "/api/schedules";

const scheduleService = {
  // 📅 Lấy tất cả lịch hẹn (có thể phân trang, lọc theo ngày, trung tâm, kỹ thuật viên,...)
  getAll: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  // 🔍 Lấy lịch hẹn theo ID
  getById: async (scheduleId) => {
    const response = await api.get(`${BASE_URL}/${scheduleId}`);
    return response.data;
  },

  // 👤 Lấy lịch hẹn của một khách hàng
  getByCustomer: async (customerId) => {
    const response = await api.get(`${BASE_URL}/customer/${customerId}`);
    return response.data;
  },

  // 👨‍🔧 Lấy lịch hẹn của kỹ thuật viên
  getByTechnician: async (technicianId) => {
    const response = await api.get(`${BASE_URL}/technician/${technicianId}`);
    return response.data;
  },

  // 🚗 Lấy lịch hẹn của một xe cụ thể
  getByVehicle: async (vehicleId) => {
    const response = await api.get(`${BASE_URL}/vehicle/${vehicleId}`);
    return response.data;
  },

  // 🏢 Lấy lịch hẹn theo trung tâm bảo hành
  getByServiceCenter: async (centerId) => {
    const response = await api.get(`${BASE_URL}/service-center/${centerId}`);
    return response.data;
  },

  // 🔎 Tìm kiếm lịch hẹn theo từ khóa, trạng thái hoặc ngày
  search: async (query, status, date) => {
    const response = await api.get(`${BASE_URL}/search`, {
      params: { q: query, status, date },
    });
    return response.data;
  },

  // ➕ Tạo mới lịch hẹn
  create: async (scheduleData) => {
    const response = await api.post(BASE_URL, scheduleData);
    return response.data;
  },

  // ✏️ Cập nhật lịch hẹn
  update: async (scheduleId, scheduleData) => {
    const response = await api.put(`${BASE_URL}/${scheduleId}`, scheduleData);
    return response.data;
  },

  // 🔄 Cập nhật trạng thái lịch hẹn (VD: "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED")
  updateStatus: async (scheduleId, statusData) => {
    const response = await api.patch(`${BASE_URL}/${scheduleId}/status`, statusData);
    return response.data;
  },

  // ❌ Xóa lịch hẹn
  delete: async (scheduleId) => {
    const response = await api.delete(`${BASE_URL}/${scheduleId}`);
    return response.data;
  },
};

export default scheduleService;
