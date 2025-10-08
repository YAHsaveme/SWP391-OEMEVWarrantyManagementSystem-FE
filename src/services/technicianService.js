// src/services/technicianService.js
import axiosInstance from "./axiosInstance";

const TECHNICIAN_API = "/technicians"; // ⚙️ Đảm bảo trùng với route backend (vd: /api/technicians)

const technicianService = {
  // 🧾 Lấy danh sách toàn bộ kỹ thuật viên
  async getAll() {
    try {
      const res = await axiosInstance.get(TECHNICIAN_API);
      return res.data;
    } catch (error) {
      console.error("Get all Technicians failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🔍 Tìm kiếm kỹ thuật viên theo tên, trung tâm, hoặc chuyên môn
  async search(params = {}) {
    try {
      const res = await axiosInstance.get(`${TECHNICIAN_API}/search`, { params });
      return res.data;
    } catch (error) {
      console.error("Search Technicians failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 📄 Lấy thông tin chi tiết của 1 kỹ thuật viên
  async getById(id) {
    try {
      const res = await axiosInstance.get(`${TECHNICIAN_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Get Technician by ID failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ➕ Thêm kỹ thuật viên mới
  async create(data) {
    try {
      const res = await axiosInstance.post(TECHNICIAN_API, data);
      return res.data;
    } catch (error) {
      console.error("Create Technician failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ✏️ Cập nhật thông tin kỹ thuật viên
  async update(id, data) {
    try {
      const res = await axiosInstance.put(`${TECHNICIAN_API}/${id}`, data);
      return res.data;
    } catch (error) {
      console.error("Update Technician failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🗑️ Xoá kỹ thuật viên
  async remove(id) {
    try {
      const res = await axiosInstance.delete(`${TECHNICIAN_API}/${id}`);
      return res.data;
    } catch (error) {
      console.error("Delete Technician failed:", error.response?.data || error.message);
      throw error;
    }
  },
};

export default technicianService;
