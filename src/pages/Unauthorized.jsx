import React from "react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-10 text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-2">Unauthorized Access</h2>
        <p className="text-gray-600 mb-6">
          Xin lỗi, bạn không có quyền truy cập vào trang này.  
          Vui lòng đăng nhập bằng tài khoản có quyền phù hợp.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            to="/"
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Về Trang Chủ
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Đăng Nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
