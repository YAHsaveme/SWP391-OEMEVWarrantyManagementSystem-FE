"use client";

import React from "react";
import WarrantyClaim from "../staff/WarrantyClaim";
import ClaimReport from "../staff/ClaimReport";
import TechniciansPage from "../staff/TechniciansPage";
import Appointment from "../staff/Appointment";
import VehiclesPage from "../staff/VehiclesPage";
import ScDispatch from "../staff/ScDispatch";
import Dashboard from "../evm/Dashboard";
import ReplenishTicket from "./ReplenishTicket";
import authService from "../../services/authService";

import {
    AppBar, Toolbar, Typography, Container, Box, Avatar, Tabs, Tab,
    Paper, IconButton, Tooltip, CssBaseline, Badge,
    Divider, Chip, Menu, MenuItem,
} from "@mui/material";
import {
    DirectionsCar as CarIcon,
    Inventory2 as PackageIcon,
    Description as FileText,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Notifications as NotificationsIcon,
    MoreVert as MoreIcon,
    AddCircle as AddIcon,
    Groups as GroupsIcon,
    Event as EventIcon,
    LocalShipping as LocalShippingIcon,
    Assessment as AssessmentIcon,
    Send as SendIcon,
} from "@mui/icons-material";
import { alpha, createTheme } from "@mui/material/styles";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import useScrollTrigger from "@mui/material/useScrollTrigger";

/* ===== Helper: nâng AppBar khi cuộn ===== */
function ElevationScroll({ children }) {
    const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 6 });
    return React.cloneElement(children, {
        elevation: trigger ? 4 : 0,
        sx: {
            ...children.props.sx,
            backgroundColor: (t) =>
                trigger ? alpha(t.palette.background.paper, 0.9) : alpha(t.palette.background.paper, 0.7),
            backdropFilter: "blur(10px)",
            borderBottom: (t) => `1px solid ${alpha(t.palette.divider, trigger ? 0.85 : 0.6)}`,
            transition: "background-color .2s ease, border-color .2s ease",
        },
    });
}

export default function OverviewManager() {
    const sysTheme = useTheme();
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [mode, setMode] = React.useState(
        (typeof window !== "undefined" && localStorage.getItem("ui-mode")) || (prefersDark ? "dark" : "light")
    );
    const [tab, setTab] = React.useState(0);
    const [anchorUser, setAnchorUser] = React.useState(null);
    const [anchorMore, setAnchorMore] = React.useState(null);

    React.useEffect(() => {
        if (typeof window !== "undefined") localStorage.setItem("ui-mode", mode);
    }, [mode]);

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: { main: mode === "dark" ? "#6eb4ff" : "#1565d8" },
                    secondary: { main: "#00bfa6" },
                    background: {
                        default: mode === "dark" ? "#0a0f1c" : "#f6f8fc",
                        paper: mode === "dark" ? "#11182a" : "#ffffff",
                    },
                },
                shape: { borderRadius: 16 },
                typography: {
                    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    h5: { fontWeight: 800 },
                },
                components: {
                    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
                    MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
                },
            }),
        [mode]
    );

    const [user, setUser] = React.useState({
        fullName: "Manager",
        role: "Service Center Manager",
    });

    React.useEffect(() => {
        (async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                if (currentUser) {
                    setUser({
                        fullName: currentUser.fullName || "Manager",
                        role:
                            (currentUser.role && (currentUser.role.name || currentUser.role)) ||
                            "Service Center Manager",
                    });
                }
            } catch (err) {
                console.warn("Không thể tải thông tin người dùng:", err);
            }
        })();
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: "100vh",
                    bgcolor: "background.default",
                    backgroundImage: (t) =>
                        `radial-gradient(1200px 600px at 10% -10%, ${alpha(t.palette.primary.main, 0.12)} 0, transparent 40%),
             radial-gradient(1000px 500px at 110% 10%, ${alpha("#00bfa6", 0.10)} 0, transparent 40%)`,
                }}
            >
                {/* AppBar đổi nền khi cuộn */}
                <ElevationScroll>
                    <AppBar position="sticky" color="transparent">
                        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: "primary.main" }}>
                                    <CarIcon sx={{ color: "white" }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={900} letterSpacing={.3}>
                                        EVM Warranty Management System
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        SC Manager Portal
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: .5 }}>
                                <Tooltip title="Thông báo">
                                    <IconButton>
                                        <Badge color="secondary" variant="dot" overlap="circular">
                                            <NotificationsIcon />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Chuyển giao diện">
                                    <IconButton onClick={() => setMode(m => (m === "light" ? "dark" : "light"))}>
                                        {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Gửi Ticket">
                                    <IconButton onClick={() => setTab(8)}>
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                                <IconButton onClick={(e) => setAnchorMore(e.currentTarget)}>
                                    <MoreIcon />
                                </IconButton>
                                <Menu anchorEl={anchorMore} open={Boolean(anchorMore)} onClose={() => setAnchorMore(null)}>
                                    <MenuItem onClick={() => setAnchorMore(null)}>Nhập dữ liệu CSV</MenuItem>
                                    <MenuItem onClick={() => setAnchorMore(null)}>Xuất báo cáo PDF</MenuItem>
                                </Menu>

                                {/* Avatar người dùng (có dropdown) */}
                                <Avatar
                                    sx={{
                                        bgcolor: "primary.main",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        width: 42,
                                        height: 42,
                                    }}
                                    onClick={(e) => setAnchorUser(e.currentTarget)}
                                >
                                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "M"}
                                </Avatar>

                                <Menu
                                    anchorEl={anchorUser}
                                    open={Boolean(anchorUser)}
                                    onClose={() => setAnchorUser(null)}
                                    PaperProps={{
                                        sx: {
                                            mt: 1,
                                            borderRadius: 2,
                                            minWidth: 220,
                                            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                                        },
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 1.5 }}>
                                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                                            {user.fullName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {user.role}
                                        </Typography>
                                    </Box>
                                    <Divider />
                                    <MenuItem onClick={() => (window.location.href = "/profile")}>
                                        Hồ sơ cá nhân
                                    </MenuItem>
                                    <MenuItem onClick={() => (window.location.href = "/")}>Về trang chủ</MenuItem>
                                    <Divider />
                                    <MenuItem
                                        onClick={() => {
                                            authService.logout();
                                            setAnchorUser(null);
                                        }}
                                        sx={{ color: "error.main" }}
                                    >
                                        Đăng xuất
                                    </MenuItem>
                                </Menu>
                            </Box>
                        </Toolbar>
                    </AppBar>
                </ElevationScroll>

                {/* Nội dung chính */}
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            overflow: "hidden",
                            p: 1.25,
                            pt: 0.75,
                            border: (t) => `1px solid ${alpha(t.palette.divider, 0.7)}`,
                            background: (t) =>
                                `linear-gradient(180deg, ${alpha(t.palette.background.paper, 1)}, ${alpha(t.palette.primary.main, 0.05)})`,
                        }}
                    >
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                            TabIndicatorProps={{ style: { display: "none" } }}
                            sx={{
                                px: 0.5,
                                mb: 1,
                                "& .MuiTabs-scrollButtons.Mui-disabled": { opacity: 0.3 },
                                "& .MuiTab-root": {
                                    fontWeight: 700,
                                    fontSize: 15,
                                    minHeight: 40,
                                    alignSelf: "start",
                                    mr: 1,
                                    px: 1.25,
                                    color: "text.secondary",
                                    borderRadius: 999,
                                    transition: "all .18s ease",
                                },
                                "& .MuiTab-root.Mui-selected": {
                                    bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.2 : 0.12),
                                    color: "primary.main",
                                    boxShadow: (t) => `0 6px 16px ${alpha(t.palette.primary.main, 0.22)}`,
                                },
                            }}
                        >
                            <Tab iconPosition="start" icon={<BarChartIcon />} label="Dashboard" />
                            <Tab iconPosition="start" icon={<FileText />} label="Yêu cầu bảo hành" />
                            <Tab iconPosition="start" icon={<AssessmentIcon />} label="Báo cáo Claims" />
                            <Tab iconPosition="start" icon={<GroupsIcon />} label="Quản lý kỹ thuật viên" />
                            <Tab iconPosition="start" icon={<EventIcon />} label="Quản lý cuộc hẹn" />
                            <Tab iconPosition="start" icon={<LocalShippingIcon />} label="Dispatch" />
                            <Tab iconPosition="start" icon={<SendIcon />} label="Gửi Ticket" />
                            
                        </Tabs>

                        <Box sx={{ p: 2.5, bgcolor: "background.paper", borderRadius: 2 }}>
                            {tab === 0 && <Dashboard />}
                            {tab === 1 && <WarrantyClaim />}
                            {tab === 2 && <ClaimReport />}
                            {tab === 3 && <TechniciansPage />}
                            {tab === 4 && <Appointment />}                          
                            {tab === 5 && <ScDispatch />}
                            {tab === 6 && <ReplenishTicket />}
                        </Box>
                    </Paper>

                    <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                        <Typography variant="caption">
                            © {new Date().getFullYear()} EV Warranty Management · Built with MUI
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </ThemeProvider>
    );
}

