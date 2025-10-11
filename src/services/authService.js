// src/services/authService.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080/api/auth",
  headers: { "Content-Type": "application/json" },
});

// === GẮN TOKEN VÀO HEADER MỖI REQUEST ===
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// === AUTH CORE ===

// 🟢 Đăng nhập
export const login = async (email, password) => {
  const res = await API.post("/login", { username: email, password });
  const { token, user } = res.data;

  if (token && user) {
    localStorage.setItem("token", token);
    localStorage.setItem("role", user.role);
    localStorage.setItem("fullName", user.fullName);
    localStorage.setItem("email", user.email);
    localStorage.setItem("userId", user.id);
  }

  // ✅ Trả nguyên cấu trúc { token, user } cho frontend
  return { token, user };
};

// 🔴 Đăng xuất (logout)
export const logout = async () => {
  try {
    await API.post("/logout");
  } catch (e) {
    console.warn("⚠️ Logout API failed, but continuing cleanup");
  } finally {
    localStorage.clear();
    delete API.defaults.headers.common["Authorization"];
    window.location.href = "/login";
  }
};

// 🟢 Đăng ký (register)
export const register = async (data) => {
  return await API.post("/register", data);
};

// 🟢 Lấy thông tin người dùng hiện tại
export const getCurrentUser = async () => {
  return await API.get("/users/me");
};

// 🟢 Lấy danh sách tất cả người dùng
export const getAllUsers = async () => {
  return await API.get("/users/get-all-user");
};

// === USER MANAGEMENT ===

// 🟢 Cập nhật thông tin người dùng
export const updateUser = async (userId, data) => {
  return await API.put(`/users/${userId}/update`, data);
};

// 🟢 Đổi mật khẩu
export const changePassword = async (userId, data) => {
  return await API.put(`/users/${userId}/password`, data);
};

// 🔴 Xóa người dùng
export const deleteUser = async (userId) => {
  return await API.delete(`/users/${userId}`);
};

// === TECHNICIAN MANAGEMENT ===

// 🟢 Thêm kỹ thuật viên
export const addTechnician = async (userId, data) => {
  return await API.post(`/users/${userId}/technician`, data);
};

// 🟢 Cập nhật kỹ thuật viên
export const updateTechnician = async (userId, data) => {
  return await API.put(`/users/${userId}/technician`, data);
};

// === RECOVERY ===

// 🟢 Phục hồi tài khoản
export const recoverAccount = async (userId, data) => {
  return await API.post(`/users/${userId}/recovery`, data);
};

// === EXPORT MẶC ĐỊNH ===
export default {
  login,
  logout,
  register,
  getCurrentUser,
  getAllUsers,
  updateUser,
  changePassword,
  deleteUser,
  addTechnician,
  updateTechnician,
  recoverAccount,
};
