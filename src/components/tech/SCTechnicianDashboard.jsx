import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import {
  WbSunny,
  DarkMode,
  Build,
  Inventory,
  Assignment,
  Menu as MenuIcon,
  Logout,
} from "@mui/icons-material";
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";

import Diagnostics from "./Diagnostics";
import InventoryParts from "./InventoryParts";
import WarrantyClaims from "./WarrantyClaims";

const drawerWidth = 240;

export default function SCTechnicianDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🌓 Dark/Light mode
  const [mode, setMode] = useState(localStorage.getItem("themeMode") || "light");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#2e7d32" }, // emerald green
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

  // 📋 Sidebar menu
  const menuItems = [
    { label: "Diagnostics", icon: <Build />, path: "/tech/diagnostics" },
    { label: "Inventory Parts", icon: <Inventory />, path: "/tech/inventory" },
    { label: "Warranty Claims", icon: <Assignment />, path: "/tech/warranty-claims" },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          SC Technician
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.label}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* === AppBar === */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: mode === "light" ? "#2e7d32" : "#1b5e20",
          }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Technician Dashboard
            </Typography>

            <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
              <IconButton color="inherit" onClick={toggleTheme}>
                {mode === "light" ? <DarkMode /> : <WbSunny />}
              </IconButton>
            </Tooltip>
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
            mt: 8,
          }}
        >
          <Routes>
            <Route path="diagnostics" element={<Diagnostics />} />
            <Route path="inventory" element={<InventoryParts />} />
            <Route path="warranty-claims" element={<WarrantyClaims />} />
            <Route index element={<Navigate to="diagnostics" replace />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
