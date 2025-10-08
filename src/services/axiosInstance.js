// src/services/axiosInstance.js
import axios from "axios";

const BASE_URL = "http://localhost:8080/api"; // ⚙️ Backend URL

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🧠 Interceptor request — tự động thêm token cho mọi request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Interceptor response — tự động xử lý lỗi
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Nếu token hết hạn hoặc không hợp lệ → đăng xuất
    if (status === 401) {
      console.warn("⚠️ Unauthorized — Token expired or invalid");
      localStorage.removeItem("token");
      localStorage.removeItem("fullName");
      localStorage.removeItem("role");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
