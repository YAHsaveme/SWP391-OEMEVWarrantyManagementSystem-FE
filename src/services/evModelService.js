// src/services/evModelService.js
import axiosInstance from "./axiosInstance";

const EV_MODEL_API = "/ev-models"; // đổi nếu endpoint backend khác, vd: /api/evmodels

const evModelService = {
  // 🧾 Lấy danh sách tất cả EV Models
  async getAll() {
    try {
      const res = await axiosInstance.get(EV_MODEL_API);
      return res.data;
    } catch (error) {
      console.error("Get all EV Models failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🔍 Tìm kiếm hoặc lọc EV Models (theo name, brand, category,...)
  async search(params = {}) {
    try {
      const res = await axiosInstance.get(`${EV_MODEL_API}/search`, { params });
      return res.data;
    } catch (error) {
      console.error("Search EV Models failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 📄 Lấy thông tin chi tiết của 1 EV Model theo ID
  async getById(id) {
    try {
      const res = await axiosInstance.get(`${EV_MODEL_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Get EV Model by ID failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ➕ Thêm EV Model mới
  async create(data) {
    try {
      const res = await axiosInstance.post(EV_MODEL_API, data);
      return res.data;
    } catch (error) {
      console.error("Create EV Model failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ✏️ Cập nhật EV Model
  async update(id, data) {
    try {
      const res = await axiosInstance.put(`${EV_MODEL_API}/${id}`, data);
      return res.data;
    } catch (error) {
      console.error("Update EV Model failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🗑️ Xoá EV Model
  async remove(id) {
    try {
      const res = await axiosInstance.delete(`${EV_MODEL_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Delete EV Model failed:", error.response?.data || error.message);
      throw error;
    }
  },
};

export default evModelService;
