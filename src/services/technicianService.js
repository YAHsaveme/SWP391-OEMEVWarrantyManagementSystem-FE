// src/services/technicianService.js
import axiosInstance from "./axiosInstance";

/**
 * API Endpoints (chuẩn theo Swagger):
 * - GET  /api/technicians/{userId}/get                     → Lấy thông tin kỹ thuật viên
 * - POST /api/technicians/{userId}/profile                 → Tạo hồ sơ kỹ thuật viên
 * - PUT  /api/technicians/{userId}/update                  → Cập nhật kỹ năng
 * - GET  /api/technicians/by-center/{centerId}             → Lấy kỹ thuật viên theo trung tâm
 * - GET  /api/technicians/get-all                          → Lấy toàn bộ kỹ thuật viên
 */

const API_BASE = "technicians";

const technicianService = {
  /**
   * Lấy thông tin kỹ thuật viên
   * GET /api/technicians/{userId}/get
   */
  getById: async (userId) => {
    if (!userId) throw new Error("Thiếu userId để lấy thông tin kỹ thuật viên");
    try {
      const res = await axiosInstance.get(`${API_BASE}/${userId}/get`);
      return res.data;
    } catch (err) {
      console.error("❌ getById failed:", err);
      throw err;
    }
  },

  /**
   * Tạo hồ sơ kỹ thuật viên
   * POST /api/technicians/{userId}/profile
   * Request body: { skills: ["TRIAGE", "DIAGNOSIS", ...] }
   */
  createProfile: async (userId, payload) => {
    if (!userId) throw new Error("Thiếu userId để tạo hồ sơ kỹ thuật viên");
    if (!payload?.skills || !Array.isArray(payload.skills))
      throw new Error("Trường 'skills' là bắt buộc và phải là mảng");

    try {
      const res = await axiosInstance.post(`${API_BASE}/${userId}/profile`, {
        skills: payload.skills,
      });
      return res.data;
    } catch (err) {
      console.error("❌ createProfile failed:", err);
      throw err;
    }
  },

  /**
   * Cập nhật kỹ năng kỹ thuật viên
   * PUT /api/technicians/{userId}/update
   * Request body: { skills: [...] }
   */
  updateProfile: async (userId, payload) => {
    if (!userId) throw new Error("Thiếu userId để cập nhật kỹ năng");
    if (!payload?.skills || !Array.isArray(payload.skills))
      throw new Error("Trường 'skills' là bắt buộc và phải là mảng");

    try {
      const res = await axiosInstance.put(`${API_BASE}/${userId}/update`, {
        skills: payload.skills,
      });
      return res.data;
    } catch (err) {
      console.error("❌ updateProfile failed:", err);
      throw err;
    }
  },

  /**
   * Lấy danh sách kỹ thuật viên theo trung tâm
   * GET /api/technicians/by-center/{centerId}
   */
  getByCenter: async (centerId) => {
    if (!centerId) throw new Error("Thiếu centerId để lấy danh sách kỹ thuật viên theo trung tâm");
    try {
      const res = await axiosInstance.get(`${API_BASE}/by-center/${centerId}`);
      return res.data;
    } catch (err) {
      console.error("❌ getByCenter failed:", err);
      throw err;
    }
  },

  /**
   * Lấy tất cả kỹ thuật viên
   * GET /api/technicians/get-all
   */
  getAll: async () => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/get-all`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("❌ getAll failed:", err);
      throw err;
    }
  },
};

export default technicianService;
