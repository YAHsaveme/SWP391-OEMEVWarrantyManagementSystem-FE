"use client"

import React, { useMemo, useState, useEffect } from "react";
import axiosInstance from "../../services/axiosInstance";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  IconButton,
  Badge,
  Tooltip,
  Stack,
  useMediaQuery,
  CssBaseline,
  Button,
} from "@mui/material";
import { createTheme, ThemeProvider, alpha, styled } from "@mui/material/styles";

import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import BuildIcon from "@mui/icons-material/Build";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";

import UserManagement from "./UserManagement";
import TechnicianManagement from "./TechnicianManagement";

const drawerWidth = 264;

/* ---------- Styled Helpers ---------- */
const SidebarHeader = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: alpha(theme.palette.text.primary, 0.6),
  padding: theme.spacing(2, 2, 1),
}));

/* ---------- Main ---------- */
export default function Dashboard() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState(prefersDark ? "dark" : "light");
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/users/me");

        console.log("Dữ liệu user nhận được:", res.data);

        setUser({
          fullName: res.data.fullName || res.data.name || res.data.username,
          role: res.data.role?.name || res.data.role || "Không rõ vai trò",
        });
      } catch (error) {
        console.error("❌ Lỗi tải thông tin người dùng:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    };

    fetchUser();
  }, []);

  const handleHome = () => {
    window.location.href = "/";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

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
        typography: { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
        components: {
          MuiCard: { styleOverrides: { root: { transition: "transform .2s ease", willChange: "transform" } } },
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        {/* AppBar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
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
              <Avatar sx={{ bgcolor: "#0ea5e9" }}>
                <TwoWheelerIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} letterSpacing={0.3}>
                  Hệ thống quản lý bảo hành xe máy điện
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Trang quản trị hệ thống
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Chế độ sáng/tối">
                <IconButton color="inherit" onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
                  {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              backgroundColor: "background.paper",
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              top: 64,
              p: 1,
              height: "calc(100vh - 64px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              zIndex: theme.zIndex.appBar - 1,
            },
          }}
        >
          <Box>
            <SidebarHeader>Điều hướng</SidebarHeader>
            <List>
              {[
                { key: "users", icon: <PeopleAltIcon />, label: "Người dùng" },
                { key: "technicians", icon: <BuildIcon />, label: "Kỹ thuật viên" },
              ].map((item) => (
                <ListItemButton
                  key={item.key}
                  selected={activeTab === item.key}
                  onClick={() => setActiveTab(item.key)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Avatar + Tên người dùng */}
          <Box>
            <Divider sx={{ my: 1.5 }} />

            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                borderRadius: 2,
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
                {user?.fullName
                  ? user.fullName.charAt(0).toUpperCase()
                  : user?.name
                    ? user.name.charAt(0).toUpperCase()
                    : "U"}
              </Avatar>

              <Box sx={{ overflow: "hidden" }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{ fontWeight: 600, lineHeight: 1.2 }}
                >
                  {user?.fullName || user?.name || "Người dùng"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.role || "Vai trò"}
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={handleHome}
                sx={{
                  justifyContent: "flex-start",
                  borderRadius: 2,
                  textTransform: "none",
                  py: 1,
                }}
              >
                Về trang chủ
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  justifyContent: "flex-start",
                  borderRadius: 2,
                  textTransform: "none",
                  py: 1,
                }}
              >
                Đăng xuất
              </Button>
            </Stack>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: "64px" }}>
          {/* USERS MANAGEMENT */}
          {activeTab === "users" && (
            <UserManagement
              search={search}
              setSearch={setSearch}
              theme={theme}
            />
          )}

          {/* TECHNICIAN MANAGEMENT */}
          {activeTab === "technicians" && (
            <TechnicianManagement
              search={search}
              setSearch={setSearch}
              theme={theme}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}