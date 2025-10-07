import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import jwtDecode from "jwt-decode";

// === Kiểm tra token hợp lệ và còn hạn ===
const isTokenValid = (token) => {
  try {
    if (!token) return false;
    const decoded = jwtDecode(token);
    if (!decoded || !decoded.exp) return false;

    const now = Date.now() / 1000; // giây
    return decoded.exp > now;
  } catch (error) {
    console.error("❌ Token không hợp lệ:", error);
    return false;
  }
};

// === Hàm logout toàn hệ thống ===
const handleForceLogout = () => {
  console.warn("⚠️ Token hết hạn hoặc không hợp lệ → Logout toàn hệ thống");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("fullName");
  window.location.href = "/login";
};

// === Component PrivateRoute ===
export default function PrivateRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // --- Kiểm tra token hết hạn ---
  useEffect(() => {
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp <= now) {
        console.warn("⚠️ Token đã hết hạn → Logout");
        handleForceLogout();
      }
    } catch (err) {
      console.error("⚠️ Lỗi khi decode token:", err);
      handleForceLogout();
    }
  }, [token]);

  // --- Không có token ---
  if (!token) {
    console.warn("⛔ Không có token → Redirect to /login");
    return <Navigate to="/login" replace />;
  }

  // --- Token hết hạn ---
  if (!isTokenValid(token)) {
    handleForceLogout();
    return null;
  }

  // --- Role không hợp lệ ---
  if (roles.length > 0 && !roles.includes(role)) {
    console.warn(`🚫 Role không được phép: ${role}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // --- Token hợp lệ + Role đúng → Cho phép truy cập ---
  return children;
}
