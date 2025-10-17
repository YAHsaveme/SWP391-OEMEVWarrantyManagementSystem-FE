import React from "react";
import PropTypes from "prop-types";
import { Link as RouterLink, useLocation, Outlet } from "react-router-dom";
import {
    AppBar, Toolbar, IconButton, Drawer, Box, List, ListItemButton, ListItemIcon,
    ListItemText, CssBaseline, Divider, Avatar, useMediaQuery, ThemeProvider,
    createTheme, alpha, Paper, Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CampaignIcon from "@mui/icons-material/Campaign";
import GroupsIcon from "@mui/icons-material/Groups";
import StoreMallDirectoryIcon from "@mui/icons-material/StoreMallDirectory";

const drawerWidth = 260;

const theme = createTheme({
    palette: { mode: "light", primary: { main: "#2563EB" }, background: { default: "#f7f8fa" } },
    shape: { borderRadius: 14 },
});

// TẤT CẢ link phải nằm dưới /staff
const NAV_ITEMS = [
    { label: "Dashboard", to: "/staff", icon: <DashboardIcon />, end: true },
    { label: "Vehicles", to: "/staff/vehicles", icon: <DirectionsCarIcon /> },
    { label: "Warranty Vehicles", to: "/staff/claims", icon: <AssignmentIcon /> },
    { label: "Service Campaigns", to: "/staff/campaigns", icon: <CampaignIcon /> },
    { label: "Technicians", to: "/staff/technicians", icon: <GroupsIcon /> },
    { label: "Service Centers", to: "/staff/centers", icon: <StoreMallDirectoryIcon /> },
];

function SidebarContent({ currentPath, onNavigate }) {
    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Brand */}
            <Box sx={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", px: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: 2, bgcolor: "primary.main", color: "#fff",
                        display: "grid", placeItems: "center", boxShadow: 1
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l7-7" />
                        </svg>
                    </Box>
                    <Box>
                        <Typography fontWeight={700}>EV Service</Typography>
                        <Typography variant="caption" color="text.secondary">Staff Portal</Typography>
                    </Box>
                </Box>
            </Box>

            <Divider />

            {/* Nav */}
            <Box sx={{ flex: 1, py: 2 }}>
                <List component="nav" sx={{ px: 1 }}>
                    {NAV_ITEMS.map((item) => {
                        const active = item.end ? currentPath === item.to : currentPath.startsWith(item.to);
                        return (
                            <ListItemButton
                                key={item.to}
                                component={RouterLink}
                                to={item.to}
                                onClick={onNavigate}
                                sx={{
                                    mb: 0.5, borderRadius: 2,
                                    ...(active
                                        ? {
                                            bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                            color: "primary.main",
                                            "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.18) },
                                        }
                                        : {}),
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>

            {/* User */}
            <Divider />
            <Box sx={{ p: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                        sx={{
                            width: 40, height: 40, fontWeight: 700,
                            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${alpha(t.palette.primary.main, 0.4)})`,
                        }}
                    >
                        SC
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>SC Staff</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>Service Center</Typography>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

SidebarContent.propTypes = { currentPath: PropTypes.string.isRequired, onNavigate: PropTypes.func };

export default function StaffLayout() {
    const location = useLocation();
    const [open, setOpen] = React.useState(false);
    const lgUp = useMediaQuery("(min-width:1200px)");
    const drawer = <SidebarContent currentPath={location.pathname} onNavigate={() => setOpen(false)} />;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* AppBar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    backdropFilter: "blur(10px)",
                    bgcolor: (t) => alpha(t.palette.background.paper, 0.8),
                    color: "text.primary",
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                    width: { lg: `calc(100% - ${drawerWidth}px)` },
                    ml: { lg: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    {!lgUp && (
                        <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Box sx={{ flex: 1 }} />
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }} aria-label="sidebar">
                {/* Mobile */}
                <Drawer
                    variant="temporary"
                    open={open}
                    onClose={() => setOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { width: drawerWidth } }}
                >
                    {drawer}
                </Drawer>

                {/* Desktop */}
                <Drawer
                    variant="permanent"
                    open
                    sx={{
                        display: { xs: "none", lg: "block" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth, boxSizing: "border-box",
                            borderRight: (t) => `1px solid ${t.palette.divider}`,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main content – dùng Outlet để render route con */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1, p: { xs: 2.5, sm: 3, md: 4 },
                    width: { lg: `calc(100% - ${drawerWidth}px)` },
                    ml: { lg: `${drawerWidth}px` }, mt: 8, maxWidth: "1400px", mx: "auto",
                }}
            >
                <Outlet />
            </Box>
        </ThemeProvider>
    );
}

StaffLayout.propTypes = { children: PropTypes.node };
