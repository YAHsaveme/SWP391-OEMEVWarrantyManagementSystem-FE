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
    const errorData = error.response?.data;

    // CHỈ đăng xuất khi status = 401 (Unauthorized) - chắc chắn là lỗi authentication
    // KHÔNG đăng xuất cho status 400 (Bad Request) - có thể là validation error, thiếu field, v.v.
    if (status === 401) {
      console.warn("⚠️ Unauthorized — Token expired or invalid", errorData);
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("fullName");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
