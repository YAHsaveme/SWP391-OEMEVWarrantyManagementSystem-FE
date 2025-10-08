// src/services/serviceCenterService.js
import axiosInstance from "./axiosInstance";

const CENTER_API = "/service-centers"; // ⚙️ Đảm bảo trùng với route backend của bạn

const serviceCenterService = {
  // 🧾 Lấy danh sách tất cả trung tâm
  async getAll() {
    try {
      const res = await axiosInstance.get(CENTER_API);
      return res.data;
    } catch (error) {
      console.error("Get all Service Centers failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🔍 Tìm kiếm trung tâm theo tên, địa chỉ, khu vực...
  async search(params = {}) {
    try {
      const res = await axiosInstance.get(`${CENTER_API}/search`, { params });
      return res.data;
    } catch (error) {
      console.error("Search Service Centers failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 📄 Lấy thông tin chi tiết 1 trung tâm theo ID
  async getById(id) {
    try {
      const res = await axiosInstance.get(`${CENTER_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Get Service Center by ID failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ➕ Thêm trung tâm mới
  async create(data) {
    try {
      const res = await axiosInstance.post(CENTER_API, data);
      return res.data;
    } catch (error) {
      console.error("Create Service Center failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ✏️ Cập nhật trung tâm bảo hành
  async update(id, data) {
    try {
      const res = await axiosInstance.put(`${CENTER_API}/${id}`, data);
      return res.data;
    } catch (error) {
      console.error("Update Service Center failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🗑️ Xoá trung tâm
  async remove(id) {
    try {
      const res = await axiosInstance.delete(`${CENTER_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Delete Service Center failed:", error.response?.data || error.message);
      throw error;
    }
  },
};

export default serviceCenterService;
