import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import { logout } from "../../services/authService"; // import API logout

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load user info từ localStorage khi mount
  useEffect(() => {
    const storedName = localStorage.getItem("fullName");
    const storedRole = localStorage.getItem("role");
    if (storedName && storedRole) {
      setUser({ fullName: storedName, role: storedRole });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout(); // gọi API logout (nếu backend cần)
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("fullName");
      setUser(null);
      navigate("/login");
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
          OEM EV
        </span>
      </div>

      {/* Navigation */}
      <div className="hidden md:block">
        <div className="ml-10 flex items-baseline space-x-8">
          <a href="#warranty-policy" className="text-gray-200 hover:text-cyan-400 transition">Chính sách bảo hành</a>
          <a href="#campaigns" className="text-gray-200 hover:text-cyan-400 transition">Chiến dịch</a>
          <a href="#support" className="text-gray-200 hover:text-cyan-400 transition">Hỗ trợ</a>
        </div>
      </div>

      {/* User Info */}
      <div className="hidden md:flex items-center space-x-4">
        {user ? (
          <>
            <span className="text-white font-semibold">
              {user.fullName}{" "}
              <span className="text-sm text-pink-300">({user.role})</span>
            </span>
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

      {/* Mobile Menu Button */}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {/* Close */}
          <svg
            className={`${isMenuOpen ? "block" : "hidden"} h-6 w-6`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  {/* Mobile Navigation */}
  {isMenuOpen && (
    <div className="md:hidden">
      <div className="px-2 pt-2 pb-3 space-y-1 bg-gradient-to-r from-gray-800 to-gray-900 backdrop-blur-md border-t border-white/10">
        <a href="#warranty-policy" className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2">Chính sách bảo hành</a>
        <a href="#campaigns" className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2">Chiến dịch</a>
        <a href="#support" className="block text-gray-200 hover:text-cyan-400 transition px-3 py-2">Hỗ trợ</a>

        <div className="pt-2">
          {user ? (
            <>
              <div className="text-white font-semibold px-3 py-2">
                {user.fullName} <span className="text-sm text-pink-300">({user.role})</span>
              </div>
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
                className="w-full"
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
              className="w-full"
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

export default Navbar;
