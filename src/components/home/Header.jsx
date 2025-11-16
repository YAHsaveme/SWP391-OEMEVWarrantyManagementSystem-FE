import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import { logout } from "../../services/authService";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = () => {
      const storedName = localStorage.getItem("fullName");
      const storedRole = localStorage.getItem("role");
      if (storedName && storedRole) {
        setUser({ fullName: storedName, role: storedRole });
      } else {
        setUser(null);
      }
    };

    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  // Điều hướng đến dashboard phù hợp
  const handleGoDashboard = () => {
    if (!user?.role) return;

    switch (user.role) {
      case "ADMIN":
        navigate("/dashboard");
        break;
      case "EVM_STAFF":
        navigate("/overview");
        break;
      case "SC_STAFF":
        navigate("/staff/vehicles");
        break;
      case "SC_TECHNICIAN":
        navigate("/tech");
        break;
      default:
        navigate("/");
    }
  };

  const handleLogout = async () => {
    try {
      // Gọi API logout nếu backend có endpoint này (có thể bỏ nếu không cần)
      await logout();
    } catch (err) {
      console.warn("Logout API failed or not implemented:", err.message);
    } finally {
      // Xóa toàn bộ dữ liệu đăng nhập
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("fullName");

      if (setUser) setUser(null);
      navigate("/login", { replace: true });
      window.location.reload(); // giúp xóa state tạm thời, tránh lỗi session cũ
    }
  };

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block drop-shadow-lg">
              Hệ thống Quản lý Bảo hành Xe máy điện
            </span>
          </div>



          {/* User Info */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  onClick={handleGoDashboard}
                  variant="contained"
                  sx={{
                    background:
                      "linear-gradient(90deg, #8e24aa, #d81b60)",
                    fontWeight: "bold",
                    color: "#fff",
                    textTransform: "none",
                    borderRadius: "8px",
                    boxShadow: "0px 4px 12px rgba(216,27,96,0.4)",
                    "&:hover": {
                      background:
                        "linear-gradient(90deg, #6a1b9a, #ad1457)",
                    },
                  }}
                >
                  {user.fullName} ({user.role})
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  sx={{
                    color: "#fff",
                    borderColor: "#ff7043",
                    "&:hover": {
                      borderColor: "#e64a19",
                      backgroundColor: "rgba(255,112,67,0.1)",
                    },
                  }}
                >
                  Đăng xuất
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                variant="contained"
                sx={{
                  backgroundColor: "#1565c0",
                  "&:hover": {
                    backgroundColor: "#0d47a1",
                  },
                }}
              >
                Đăng nhập
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-white/10 inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-cyan-400 hover:bg-white/20"
            >
              {/* Hamburger */}
              <svg
                className={`${isMenuOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close */}
              <svg
                className={`${isMenuOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gradient-to-r from-gray-800 to-gray-900 backdrop-blur-md border-t border-white/10">
            <a
              href="#warranty-policy"
              className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2"
            >
              Chính sách bảo hành
            </a>
            <a
              href="#campaigns"
              className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2"
            >
              Chiến dịch
            </a>
            <a
              href="#support"
              className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2"
            >
              Hỗ trợ
            </a>

            <div className="pt-2">
              {user ? (
                <>
                  <Button
                    onClick={handleGoDashboard}
                    variant="contained"
                    fullWidth
                    sx={{
                      background:
                        "linear-gradient(90deg, #8e24aa, #d81b60)",
                      fontWeight: "bold",
                      color: "#fff",
                      textTransform: "none",
                      borderRadius: "8px",
                      boxShadow: "0px 4px 12px rgba(216,27,96,0.4)",
                      "&:hover": {
                        background:
                          "linear-gradient(90deg, #6a1b9a, #ad1457)",
                      },
                    }}
                  >
                    {user.fullName} ({user.role})
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="outlined"
                    fullWidth
                    sx={{
                      color: "#fff",
                      borderColor: "#ff7043",
                      "&:hover": {
                        borderColor: "#e64a19",
                        backgroundColor: "rgba(255,112,67,0.1)",
                      },
                    }}
                    className="mt-2"
                  >
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: "#1565c0",
                    "&:hover": {
                      backgroundColor: "#0d47a1",
                    },
                  }}
                >
                  Đăng nhập
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
