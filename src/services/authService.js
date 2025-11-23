// src/services/authService.js
import axiosInstance from "./axiosInstance";

const AUTH_API = "/auth";

const authService = {
  /**
   * 🟢 Đăng nhập
   * POST /api/auth/login
   * body: { username, password }
   */
  async login(username, password) {
    try {
      const res = await axiosInstance.post(`${AUTH_API}/login`, { username, password });
      const data = res.data;

      // ✅ Lưu token & user info vào localStorage
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
      if (data?.user?.fullName) localStorage.setItem("fullName", data.user.fullName);
      if (data?.user?.role) localStorage.setItem("role", data.user.role);
      // ✅ Lưu userId và technicianId (nếu có) để dùng cho appointment
      if (data?.user?.id) localStorage.setItem("userId", data.user.id);
      if (data?.user?.userId) localStorage.setItem("userId", data.user.userId);
      if (data?.user?.technicianId) localStorage.setItem("technicianId", data.user.technicianId);
      // Nếu response có userId trực tiếp
      if (data?.userId) localStorage.setItem("userId", data.userId);
      if (data?.technicianId) localStorage.setItem("technicianId", data.technicianId);

      return data;
    } catch (error) {
      console.error("❌ Login failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔴 Đăng xuất (gửi yêu cầu lên server & xoá localStorage)
   * POST /api/auth/logout
   */
  async logout() {
    try {
      await axiosInstance.post(`${AUTH_API}/logout`);
    } catch (error) {
      console.warn("⚠️ Logout request failed:", error.response?.data || error.message);
    } finally {
      localStorage.clear();
      window.location.href = "/login";
    }
  },

  /**
   * 🟨 Đăng ký người dùng mới
   * POST /api/auth/register
   */
  async register(data) {
    try {
      const res = await axiosInstance.post(`${AUTH_API}/register`, data);
      return res.data;
    } catch (error) {
      console.error("❌ Register failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🟦 Lấy thông tin người dùng hiện tại
   * GET /api/auth/users/me
   */
  async getCurrentUser() {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/users/me`);
      return res.data;
    } catch (error) {
      console.error("❌ Get current user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🟠 Cập nhật thông tin người dùng
   * PUT /api/auth/users/{userId}/update
   */
  async updateUser(userId, data) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/users/${userId}/update`, data);
      return res.data;
    } catch (error) {
      console.error("❌ Update user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔒 Đổi mật khẩu người dùng
   * PUT /api/auth/users/{userId}/password
   */
  async changePassword(userId, data) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/users/${userId}/password`, data);
      return res.data;
    } catch (error) {
      console.error("❌ Change password failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🧩 Gán kỹ năng cho kỹ thuật viên
   * POST /api/auth/users/{userId}/technician
   */
  async addTechnician(userId, skills) {
    try {
      const res = await axiosInstance.post(`${AUTH_API}/users/${userId}/technician`, { skills });
      return res.data;
    } catch (error) {
      console.error("❌ Add technician failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🧩 Cập nhật kỹ năng kỹ thuật viên
   * PUT /api/auth/users/{userId}/technician
   */
  async updateTechnician(userId, skills) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/users/${userId}/technician`, { skills });
      return res.data;
    } catch (error) {
      console.error("❌ Update technician failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🧱 Admin: cập nhật thông tin user
   * PUT /api/auth/admin/users/{userId}
   */
  async adminUpdateUser(userId, data) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/admin/users/${userId}`, data);
      return res.data;
    } catch (error) {
      console.error("❌ Admin update user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🧱 Admin: đổi mật khẩu user
   * PUT /api/auth/admin/users/{userId}/password
   */
  async adminChangePassword(userId, newPassword) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/admin/users/${userId}/password`, {
        newPassword,
      });
      return res.data;
    } catch (error) {
      console.error("❌ Admin change password failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🧱 Admin: cập nhật trung tâm cho user
   * PUT /api/auth/admin/users/{centerId}/update-center?userId={userId}
   */
  async updateUserCenter(centerId, userId) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/admin/users/${centerId}/update-center`, null, {
        params: { userId },
      });
      return res.data;
    } catch (error) {
      console.error("❌ Update user center failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔍 Lấy danh sách tất cả user (phân trang)
   * GET /api/auth/users/get-all-user?page=0
   */
  async getAllUsers(page = 0) {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/users/get-all-user`, { params: { page } });
      return res.data;
    } catch (error) {
      console.error("❌ Get all users failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔍 Lấy danh sách kỹ thuật viên
   * GET /api/auth/staff/technicians?page=0&size=10
   */
  async getTechnicians(page = 0, size = 10) {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/staff/technicians`, { params: { page, size } });
      return res.data;
    } catch (error) {
      console.error("❌ Get technicians failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔍 Lấy danh sách user theo trung tâm
   * GET /api/auth/admin/users/by-center/{centerId}?page=0&size=10
   */
  async getUsersByCenter(centerId, page = 0, size = 10) {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/admin/users/by-center/${centerId}`, {
        params: { page, size },
      });
      return res.data;
    } catch (error) {
      console.error("❌ Get users by center failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🔍 Admin tìm kiếm user
   * GET /api/auth/admin/users?q=&role=&page=&size=
   */
  async adminSearchUsers({ q = "", role = "", page = 0, size = 10 }) {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/admin/users`, {
        params: { q, role, page, size },
      });
      return res.data;
    } catch (error) {
      console.error("❌ Admin search users failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * 🩹 Khôi phục user
   * POST /api/auth/users/{userId}/recovery
   */
  async recoverUser(userId) {
    try {
      const res = await axiosInstance.post(`${AUTH_API}/users/${userId}/recovery`);
      return res.data;
    } catch (error) {
      console.error("❌ Recover user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ❌ Xoá người dùng
   * DELETE /api/auth/users/{userId}
   */
  async deleteUser(userId) {
    try {
      const res = await axiosInstance.delete(`${AUTH_API}/users/${userId}`);
      return res.data;
    } catch (error) {
      console.error("❌ Delete user failed:", error.response?.data || error.message);
      throw error;
    }
  },
  // ===== Helpers (thêm mới) =====
  getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  },
  getRole() {
    const r = localStorage.getItem("role");
    return r ? r.toUpperCase() : null; // "EVM_STAFF" | "SC_STAFF" | ...
  },
  isEvmStaff() {
    return this.getRole() === "EVM_STAFF";
  },
  isScStaff() {
    return this.getRole() === "SC_STAFF";
  },

};



// Export mặc định toàn bộ service
export default authService;

// Export thêm `logout` riêng để hook hoặc component import { logout } dùng trực tiếp
export const logout = () => authService.logout();