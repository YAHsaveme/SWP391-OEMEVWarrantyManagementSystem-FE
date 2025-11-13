import React from "react";
import PropTypes from "prop-types";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import {
    AppBar, Toolbar, IconButton, Box, CssBaseline, Divider, Avatar,
    Typography, Menu, MenuItem, ThemeProvider, createTheme, alpha,
    Paper, Container, Tabs, Tab, Badge, Tooltip, useMediaQuery
} from "@mui/material";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import GroupsIcon from "@mui/icons-material/Groups";
import StoreMallDirectoryIcon from "@mui/icons-material/StoreMallDirectory";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import AddIcon from "@mui/icons-material/AddCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import authService from "../../services/authService";

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

const NAV_ITEMS = [
    { label: "Vehicles", path: "/staff/vehicles", icon: <DirectionsCarIcon /> },
    { label: "Claims", path: "/staff/claims", icon: <AssignmentIcon /> },
    { label: "Claim Report", path: "/staff/claim-report", icon: <DescriptionIcon /> },
    { label: "Dispatch", path: "/staff/dispatch", icon: <LocalShippingIcon /> },
    { label: "Inventory", path: "/staff/inventory", icon: <Inventory2Icon /> },
    { label: "Technicians", path: "/staff/technicians", icon: <GroupsIcon /> },
    { label: "Service Centers", path: "/staff/centers", icon: <StoreMallDirectoryIcon /> },
    { label: "Appointments", path: "/staff/appointments", icon: <EventIcon /> },
];

export default function StaffLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [mode, setMode] = React.useState(
        (typeof window !== "undefined" && localStorage.getItem("ui-mode")) || (prefersDark ? "dark" : "light")
    );
    const [anchorUser, setAnchorUser] = React.useState(null);
    const [anchorMore, setAnchorMore] = React.useState(null);
    const [user, setUser] = React.useState({
        fullName: "SC Staff",
        role: "Service Center",
    });

    React.useEffect(() => {
        if (typeof window !== "undefined") localStorage.setItem("ui-mode", mode);
    }, [mode]);

    React.useEffect(() => {
        (async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                if (currentUser) {
                    setUser({
                        fullName: currentUser.fullName || "SC Staff",
                        role:
                            (currentUser.role && (currentUser.role.name || currentUser.role)) ||
                            "Service Center",
                    });
                }
            } catch (err) {
                console.warn("Không thể tải thông tin người dùng:", err);
            }
        })();
    }, []);

    // Tìm tab index dựa trên pathname
    const currentTabIndex = React.useMemo(() => {
        const index = NAV_ITEMS.findIndex((item) => {
            return location.pathname.startsWith(item.path);
        });
        return index >= 0 ? index : 0;
    }, [location.pathname]);

    const handleTabChange = (_, newValue) => {
        const item = NAV_ITEMS[newValue];
        if (item) {
            navigate(item.path);
        }
    };

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
                                    <DirectionsCarIcon sx={{ color: "white" }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" fontWeight={900} letterSpacing={0.3}>
                                        EVM Warranty Management System
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Staff Portal
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Tooltip title="Thông báo">
                                    <IconButton>
                                        <Badge color="secondary" variant="dot" overlap="circular">
                                            <NotificationsIcon />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Chuyển giao diện">
                                    <IconButton onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
                                        {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Thêm mới nhanh">
                                    <IconButton onClick={() => navigate("/staff/claims")}>
                                        <AddIcon />
                                    </IconButton>
                                </Tooltip>
                                <IconButton onClick={(e) => setAnchorMore(e.currentTarget)}>
                                    <MoreVertIcon />
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
                                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "S"}
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
                            value={currentTabIndex}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            TabIndicatorProps={{ style: { display: "none" } }}
                            sx={{
                                px: 0.5,
                                mb: 1,
                                "& .MuiTab-root": {
                                    fontWeight: 600,
                                    fontSize: 14,
                                    minHeight: 40,
                                    flex: 1,
                                    px: 1.5,
                                    py: 0.5,
                                    color: "text.secondary",
                                    borderRadius: 999,
                                    transition: "all .18s ease",
                                    textTransform: "none",
                                },
                                "& .MuiTab-root.Mui-selected": {
                                    fontWeight: 700,
                                    bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.2 : 0.12),
                                    color: "primary.main",
                                    boxShadow: (t) => `0 6px 16px ${alpha(t.palette.primary.main, 0.22)}`,
                                },
                            }}
                        >
                            {NAV_ITEMS.map((item) => (
                                <Tab
                                    key={item.path}
                                    iconPosition="start"
                                    icon={item.icon}
                                    label={item.label}
                                />
                            ))}
                        </Tabs>

                        <Box sx={{ p: 2.5, bgcolor: "background.paper", borderRadius: 2 }}>
                            <Outlet />
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

StaffLayout.propTypes = { children: PropTypes.node };
