// src/services/centerService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "/centers";

const centerService = {
  /** 
   * ➕ Tạo trung tâm 
   * @route POST /api/centers/create 
   * @access EVM_STAFF 
   */
  create: async (payload) => {
    try {
      const res = await axiosInstance.post(`${API_BASE}/create`, payload);
      return res.data;
    } catch (err) {
      console.error("❌ Lỗi khi tạo trung tâm:", err);
      throw err;
    }
  },

  /** 
   * 🔍 Tìm kiếm trung tâm có phân trang 
   * @route GET /api/centers/search 
   * @access EVM_STAFF, ADMIN 
   */
  search: async (q = "", page = 0, size = 10, status = "ALL") => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/search`, {
        params: { q, page, size, status },
      });
      return res.data;
    } catch (err) {
      console.error("❌ Lỗi khi tìm kiếm trung tâm:", err);
      throw err;
    }
  },

  /** 
   * 🏢 Lấy danh sách toàn bộ trung tâm 
   * @route GET /api/centers/get-all 
   * @access EVM_STAFF, ADMIN 
   */
  getAll: async () => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/get-all`);
      return res.data;
    } catch (err) {
      console.error("❌ Lỗi khi tải danh sách trung tâm:", err);
      throw err;
    }
  },

  /** 
   * 📄 Lấy chi tiết trung tâm theo ID 
   * @route GET /api/centers/detail/{id} 
   * @access EVM_STAFF, ADMIN 
   */
  getDetail: async (id) => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/detail/${id}`);
      return res.data;
    } catch (err) {
      console.error(`❌ Lỗi khi tải chi tiết trung tâm [${id}]:`, err);
      throw err;
    }
  },

  /** 
   * ✏️ Cập nhật trung tâm 
   * @route PUT /api/centers/update/{id} 
   * @access EVM_STAFF 
   */
  update: async (id, payload) => {
    try {
      const res = await axiosInstance.put(`${API_BASE}/update/${id}`, payload);
      return res.data;
    } catch (err) {
      console.error(`❌ Lỗi khi cập nhật trung tâm [${id}]:`, err);
      throw err;
    }
  },

  /** 
   * 🗑️ Xóa trung tâm (đánh dấu delete = true)
   * @route DELETE /api/centers/delete/{id} 
   * @access EVM_STAFF 
   */
  delete: async (id) => {
    try {
      const res = await axiosInstance.delete(`${API_BASE}/delete/${id}`);
      return res.data;
    } catch (err) {
      console.error(`❌ Lỗi khi xóa trung tâm [${id}]:`, err);
      throw err;
    }
  },

  /** 
   * ♻️ Khôi phục trung tâm đã xóa 
   * @route POST /api/centers/recover/{id} 
   * @access EVM_STAFF 
   */
  recover: async (id) => {
    try {
      const res = await axiosInstance.post(`${API_BASE}/recover/${id}`);
      return res.data;
    } catch (err) {
      console.error(`❌ Lỗi khi khôi phục trung tâm [${id}]:`, err);
      throw err;
    }
  },
};

export default centerService;
