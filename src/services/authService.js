// src/services/authService.js
import axiosInstance from "./axiosInstance";

const AUTH_API = "/auth";

const authService = {
  // 🟩 Đăng nhập
  async login(email, password) {
    try {
      // ⚠️ Backend yêu cầu "username", nên truyền email vào field này
      const res = await axiosInstance.post(`${AUTH_API}/login`, {
        username: email,
        password,
      });

      const data = res.data;

      // Lưu token và thông tin người dùng nếu có
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      if (data?.user) {
        localStorage.setItem("fullName", data.user.fullName || "");
        localStorage.setItem("role", data.user.role || "");
      }

      return data;
    } catch (error) {
      console.error("Login failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟨 Đăng ký tài khoản mới
  async register(data) {
    try {
      const res = await axiosInstance.post(`${AUTH_API}/register`, data);
      return res.data;
    } catch (error) {
      console.error("Register failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟦 Lấy thông tin người dùng hiện tại
  async getCurrentUser() {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/me`);
      return res.data;
    } catch (error) {
      console.error("Get current user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟩 Cập nhật thông tin người dùng
  async updateUser(id, data) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/users/${id}`, data);
      return res.data;
    } catch (error) {
      console.error("Update user failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟧 Đổi mật khẩu
  async changePassword(id, data) {
    try {
      const res = await axiosInstance.put(`${AUTH_API}/users/${id}/password`, data);
      return res.data;
    } catch (error) {
      console.error("Change password failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟦 Lấy danh sách tất cả người dùng
  async getAllUsers() {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/users`);
      return res.data;
    } catch (error) {
      console.error("Get users failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟨 Lấy người dùng theo ID
  async getUserById(id) {
    try {
      const res = await axiosInstance.get(`${AUTH_API}/users/${id}`);
      return res.data;
    } catch (error) {
      console.error("Get user by id failed:", error.response?.data || error.message);
      throw error;
    }
  },

  // 🟥 Đăng xuất
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("fullName");
    localStorage.removeItem("role");
    window.location.href = "/login";
  },
};

export default authService;
export const { login, logout } = authService;
