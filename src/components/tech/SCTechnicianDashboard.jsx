import React, { useState, useMemo, useEffect } from "react";
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Tooltip,
  useMediaQuery,
  createTheme,
  ThemeProvider,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Badge,
  alpha,
  styled,
} from "@mui/material";
import {
  Build,
  Inventory,
  CalendarToday,
  Receipt,
  Menu as MenuIcon,
  Logout,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Notifications as NotificationsIcon,
  TwoWheeler as TwoWheelerIcon,
  Assignment,
} from "@mui/icons-material";
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";

import Diagnostics from "./Diagnostics";
import ReceiveAppointment from "./ReceiveAppointment";
import Estimates from "./Estimates";
import InventoryMove from "./InventoryMove";
const drawerWidth = 264;

/* ---------- Styled Components ---------- */
const SidebarHeader = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: alpha(theme.palette.text.primary, 0.6),
  padding: theme.spacing(2, 2, 1),
}));

export default function SCTechnicianDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🎨 Dark/Light mode with system preference
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("themeMode");
    return saved || (prefersDark ? "dark" : "light");
  });

  // User state
  const [user, setUser] = useState({
    fullName: localStorage.getItem("fullName") || "Kỹ thuật viên",
    role: localStorage.getItem("role") || "SC_TECHNICIAN",
  });

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);

  const theme = useMemo(
    () =>
      createTheme({
        cssVariables: true,
        palette: {
          mode,
          primary: { main: mode === "dark" ? "#74b6ff" : "#1976d2" },
          background: {
            default: mode === "dark" ? "#0b1020" : "#f5f7fb",
            paper: mode === "dark" ? "#12182b" : "#ffffff",
          },
        },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                transition: "transform .2s ease",
                willChange: "transform"
              }
            }
          },
          MuiListItemButton: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 12,
                margin: theme.spacing(0.25, 0.5),
                "&.Mui-selected": {
                  background: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                },
              }),
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
    localStorage.setItem("themeMode", newMode);
  };

  // 📱 Responsive Drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // 🔒 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("fullName");
    localStorage.removeItem("role");
    navigate("/login");
  };

  // Menu handlers
  const handleProfile = () => {
    setAnchorEl(null);
    navigate("/profile");
  };

  const handleHome = () => {
    setAnchorEl(null);
    navigate("/");
  };

  const handleLogoutMenu = () => {
    setAnchorEl(null);
    handleLogout();
  };

  // 📋 Sidebar menu - ĐÃ THAY THẾ TAB WARRANTY-CLAIMS BẰNG RECEIVE-APPOINTMENT
  const menuItems = [
    { label: "Đánh giá sau sửa chữa", icon: <Build />, path: "/tech/diagnostics", key: "diagnostics" },
    { label: "Quản lý Lịch Hẹn", icon: <CalendarToday />, path: "/tech/receive-appointment", key: "receive-appointment" },
    { label: "Báo giá", icon: <Receipt />, path: "/tech/estimates", key: "estimates" },
    { label: "Di chuyển kho", icon: <Inventory />, path: "/tech/inventory-movement", key: "inventory-movement" },
  ];

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flexGrow: 1 }}>
        <SidebarHeader>Điều hướng</SidebarHeader>
        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.key}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Avatar + User Info at bottom */}
      <Box>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ p: 2 }}>
          {/* User Info */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <Avatar
              sx={{
                bgcolor: "primary.main",
                color: "white",
                fontWeight: 600,
                width: 42,
                height: 42,
                mr: 1.5,
                flexShrink: 0,
              }}
            >
              {user?.fullName?.charAt(0).toUpperCase() || "K"}
            </Avatar>

            <Box sx={{ overflow: "hidden" }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {user?.fullName || "Kỹ thuật viên"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.role === "SC_TECHNICIAN" ? "Kỹ thuật viên" : user?.role || "Vai trò"}
              </Typography>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Stack spacing={1}>
            <ListItemButton
              onClick={handleHome}
              sx={{
                borderRadius: 2,
                py: 1,
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                "&:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  borderColor: (theme) => theme.palette.primary.main,
                },
              }}
            >
              <ListItemText
                primary="Về trang chủ"
                primaryTypographyProps={{
                  fontWeight: 500,
                  color: "primary.main"
                }}
              />
            </ListItemButton>

            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                py: 1,
                border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.05),
                color: "error.main",
                "&:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.12),
                  borderColor: (theme) => theme.palette.error.main,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
                <Logout />
              </ListItemIcon>
              <ListItemText
                primary="Đăng xuất"
                primaryTypographyProps={{
                  fontWeight: 500
                }}
              />
            </ListItemButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        {/* === AppBar === */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(
              theme.palette.primary.light,
              0.9
            )} 100%)`,
            color: "white",
            borderBottom: `1px solid ${alpha("#fff", 0.2)}`,
          }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {isMobile && (
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Avatar sx={{ bgcolor: "#0ea5e9" }}>
                <TwoWheelerIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} letterSpacing={0.3}>
                  Hệ thống quản lý bảo hành xe máy điện
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Kỹ thuật viên trung tâm dịch vụ
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title={`Chế độ ${mode === "light" ? "tối" : "sáng"}`}>
                <IconButton color="inherit" onClick={toggleTheme}>
                  {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* === Drawer Sidebar === */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
                backgroundColor: "background.paper",
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                top: 64,
                height: "calc(100vh - 64px)",
                p: 1,
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                boxSizing: "border-box",
                backgroundColor: "background.paper",
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                top: 64,
                height: "calc(100vh - 64px)",
                p: 1,
              },
            }}
          >
            {drawer}
          </Drawer>
        )}

        {/* === Main Content === */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: "64px",
          }}
        >
          <Routes>
            <Route path="diagnostics" element={<Diagnostics />} />
            <Route path="receive-appointment" element={<ReceiveAppointment />} />
            <Route path="estimates" element={<Estimates />} />
            <Route path="inventory-movement" element={<InventoryMove />} />
            <Route index element={<Navigate to="diagnostics" replace />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
}