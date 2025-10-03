// src/services/authService.js
import axios from "axios";

// Tạo instance Axios
const API = axios.create({
  baseURL: "http://localhost:8080/api/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor để tự động gắn token vào headers
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Đăng nhập
export const login = async (email, password) => {
  try {
    // ⚠️ gửi key "username", nhưng giá trị chính là email
    const res = await API.post("/login", { username: email, password });

    const { token, role, fullName } = res.data;

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", fullName);
    }

    return { token, role, fullName };
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      "Đăng nhập thất bại";
    throw new Error(msg);
  }
};

// Đăng ký
export const register = async (data) => {
  return await API.post("/register", data);
};

// Lấy thông tin user hiện tại
export const getCurrentUser = async () => {
  return await API.get("/users/me");
};

// Đăng xuất
export const logout = async () => {
  try {
    await API.post("/logout"); // nếu backend có hỗ trợ thì gọi
  } catch (err) {
    console.error("Lỗi khi logout:", err.response?.data || err.message);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
  }
};
