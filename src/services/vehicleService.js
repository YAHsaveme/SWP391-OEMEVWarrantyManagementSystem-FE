// src/services/vehicleService.js
import api from "./axiosInstance";

const BASE_URL = "/vehicles"; // axiosInstance đã có baseURL = http://localhost:8080/api/

const vehicleService = {
  /**
   * 🟢 GET /vehicles/get-all
   * Lấy tất cả xe — có thể dùng để load danh sách trong admin hoặc tra cứu nhanh.
   */
  getAll: async () => {
    try {
      const res = await api.get(`${BASE_URL}/get-all`);
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    } catch (error) {
      console.error("❌ getAll vehicles failed:", error);
      throw error;
    }
  },

  /**
   * 🟢 GET /vehicles/detail/{vin}
   * Lấy thông tin chi tiết của 1 xe bằng VIN.
   * @param {string} vin - Mã VIN (bắt buộc)
   */
  getByVin: async (vin) => {
    if (!vin) throw new Error("VIN là bắt buộc để lấy chi tiết xe");
    try {
      const res = await api.get(`${BASE_URL}/detail/${encodeURIComponent(vin)}`);
      return res.data;
    } catch (error) {
      console.error("❌ getByVin failed:", error);
      if (error.response?.status === 400) {
        throw new Error("VIN không hợp lệ hoặc xe không tồn tại");
      }
      throw error;
    }
  },

  /**
   * 🟢 GET /vehicles/search?q=...
   * Tìm kiếm xe theo từ khóa VIN, model, tên khách hàng...
   * @param {string} query - Từ khóa tìm kiếm
   * @param {number} page - Trang (mặc định 0)
   * @param {number} size - Kích thước trang (mặc định 10)
   */
  search: async (query, page = 0, size = 10) => {
    try {
      const res = await api.get(`${BASE_URL}/search`, {
        params: { q: query, page, size },
      });
      return res.data?.content || [];
    } catch (error) {
      console.error("❌ search vehicles failed:", error);
      throw error;
    }
  },

  /**
   * 🟢 GET /vehicles/ev-model-by-vin?vin=...
   * Lấy thông tin model xe điện theo VIN.
   * @param {string} vin - Mã VIN
   */
  getModelByVin: async (vin) => {
    if (!vin) throw new Error("VIN là bắt buộc để lấy model xe");
    try {
      const res = await api.get(`${BASE_URL}/ev-model-by-vin`, {
        params: { vin },
      });
      return res.data;
    } catch (error) {
      console.error("❌ getModelByVin failed:", error);
      throw error;
    }
  },

  /**
   * 🟢 GET /vehicles/check-phone?phone=...
   * Kiểm tra số điện thoại đã được đăng ký hay chưa.
   * @param {string} phone - Số điện thoại
   */
  checkPhone: async (phone) => {
    if (!phone) throw new Error("Số điện thoại là bắt buộc để kiểm tra");
    try {
      const res = await api.get(`${BASE_URL}/check-phone`, {
        params: { phone },
      });
      return res.data;
    } catch (error) {
      console.error("❌ checkPhone failed:", error);
      throw error;
    }
  },

  /**
   * 🟢 POST /vehicles/create
   * Tạo mới đăng ký xe máy điện.
   * @param {object} data - Dữ liệu xe gồm:
   *   vin, modelCode, model, inServiceDate, productionDate,
   *   intakeContactName, intakeContactPhone
   */
  create: async (data) => {
    // basic validation
    if (!data?.vin) throw new Error("VIN là bắt buộc khi tạo xe");
    if (!data?.intakeContactName) throw new Error("Tên người liên hệ là bắt buộc");
    if (!data?.intakeContactPhone) throw new Error("Số điện thoại là bắt buộc");

    try {
      const res = await api.post(`${BASE_URL}/create`, data);
      return res.data;
    } catch (error) {
      console.error("❌ create vehicle failed:", error);
      throw error;
    }
  },

  /**
   * 🟢 PUT /vehicles/update/{vin}
   * Cập nhật thông tin xe theo VIN.
   * @param {string} vin - Mã VIN (bắt buộc)
   * @param {object} data - Thông tin cập nhật (modelCode, model, ...)
   */
  update: async (vin, data) => {
    if (!vin) throw new Error("VIN là bắt buộc để cập nhật xe");

    try {
      const res = await api.put(`${BASE_URL}/update/${encodeURIComponent(vin)}`, data);
      return res.data;
    } catch (error) {
      console.error("❌ update vehicle failed:", error);
      throw error;
    }
  },
};

export default vehicleService;
