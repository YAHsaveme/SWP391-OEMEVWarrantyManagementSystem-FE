// src/services/eventService.js
import axiosInstance from "./axiosInstance";

const EVENT_API = "/events";

const eventService = {
  // 🧾 Lấy danh sách tất cả Events (active only)
  async getAll() {
    try {
      const res = await axiosInstance.get(`${EVENT_API}/get-all`);
      return res.data;
    } catch (error) {
      console.error("Get all Events failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🔍 Tìm kiếm Events
  async search(params = {}) {
    try {
      const res = await axiosInstance.get(`${EVENT_API}/search`, { params });
      return res.data;
    } catch (error) {
      console.error("Search Events failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 📄 Lấy thông tin chi tiết của 1 Event theo ID
  async get(id) {
    try {
      const res = await axiosInstance.get(`${EVENT_API}/${encodeURIComponent(id)}/get`);
      return res.data;
    } catch (error) {
      console.error("Get Event by ID failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 📋 Lấy danh sách Events theo Model Code
  async listByModelCode(modelCode) {
    try {
      const res = await axiosInstance.get(`${EVENT_API}/${encodeURIComponent(modelCode)}/get-by-model`);
      return res.data;
    } catch (error) {
      console.error("Get Events by Model Code failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ➕ Tạo Event mới
  async create(data) {
    try {
      console.log("[eventService.create] Request data:", JSON.stringify(data, null, 2));
      const res = await axiosInstance.post(`${EVENT_API}/create`, data);
      console.log("[eventService.create] Response:", res.data);
      return res.data;
    } catch (error) {
      console.error("Create Event failed:", error.response?.data || error.message);
      console.error("[eventService.create] Request that failed:", JSON.stringify(data, null, 2));
      throw error;
    }
  },

  // ✏️ Cập nhật Event
  async update(id, data) {
    try {
      const res = await axiosInstance.put(`${EVENT_API}/${encodeURIComponent(id)}/update`, data);
      return res.data;
    } catch (error) {
      console.error("Update Event failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🗑️ Xoá Event (logical delete)
  async delete(id) {
    try {
      const res = await axiosInstance.delete(`${EVENT_API}/${encodeURIComponent(id)}/delete`);
      return res.data;
    } catch (error) {
      console.error("Delete Event failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // ♻️ Khôi phục Event đã xoá
  async restore(id) {
    try {
      const res = await axiosInstance.put(`${EVENT_API}/${encodeURIComponent(id)}/restore`);
      return res.data;
    } catch (error) {
      console.error("Restore Event failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🔍 Kiểm tra Recall theo VIN
  async checkRecallByVin(vin) {
    try {
      const res = await axiosInstance.get(`${EVENT_API}/recall/check`, {
        params: { vin: vin }
      });
      return res.data;
    } catch (error) {
      console.error("Check Recall by VIN failed:", error.response?.data || error.message);
      throw error;
    }
  },
};

export default eventService;

