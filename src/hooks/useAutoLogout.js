import { useEffect, useRef } from "react";
import { logout } from "../services/authService";
import { useNavigate } from "react-router-dom";

/**
 * Hook tự động đăng xuất khi người dùng không hoạt động trong X phút.
 * @param {number} minutes - Thời gian không hoạt động tối đa (mặc định: 15 phút)
 */
export default function useAutoLogout(minutes = 15) {
  const navigate = useNavigate();
  const timeoutDuration = minutes * 60 * 1000; // phút → ms
  const logoutTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isLoggingOutRef = useRef(false); // tránh logout nhiều lần

  useEffect(() => {
    const handleLogout = () => {
      if (isLoggingOutRef.current) return; // tránh double logout
      isLoggingOutRef.current = true;

      logout();
      // Dùng modal đẹp hơn thay vì alert
      window.alert("Bạn đã bị đăng xuất do không hoạt động quá lâu.");
      navigate("/login", { replace: true });
    };

    const startTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        const now = Date.now();
        const inactiveTime = now - lastActivityRef.current;

        if (inactiveTime >= timeoutDuration) {
          handleLogout();
        } else {
          startTimer(); // user vẫn hoạt động, tiếp tục theo dõi
        }
      }, timeoutDuration);
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      startTimer();
    };

    // Gắn event listener cho mọi hành động
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    // Khởi động lần đầu
    startTimer();

    // Dọn dẹp
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [navigate, timeoutDuration]);
}
