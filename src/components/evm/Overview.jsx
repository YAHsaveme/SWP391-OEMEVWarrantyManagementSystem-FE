"use client";

import React from "react";
import Analytics from "./Analytics";
import RecallForm from "./RecallForm";
import ProductManagement from "./ProductManagement";
import WarrantyRequests from "./WarrantyRequests";
import WarrantyPolicy from "./WarrantyPolicy";
import ServiceCenters from "./ServiceCenters";

import {
    AppBar, Toolbar, Typography, Container, Box, Grid, Card, CardContent, Avatar, Tabs, Tab,
    Button, Paper, IconButton, Tooltip, CssBaseline, Badge, TextField, InputAdornment, Divider,
    Chip, Menu, MenuItem, LinearProgress, Breadcrumbs, Link as MuiLink
} from "@mui/material";
import {
    DirectionsCar as CarIcon,
    WarningAmber as AlertTriangle,
    Inventory2 as PackageIcon,
    Description as FileText,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Notifications as NotificationsIcon,
    Search as SearchIcon,
    MoreVert as MoreIcon,
    Assessment as ReportIcon,
    AddCircle as AddIcon,
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
                trigger
                    ? alpha(t.palette.background.paper, 0.9)
                    : alpha(t.palette.background.paper, 0.7),
            backdropFilter: "blur(10px)",
            borderBottom: (t) =>
                `1px solid ${alpha(t.palette.divider, trigger ? 0.85 : 0.6)}`,
            transition: "background-color .2s ease, border-color .2s ease",
        },
    });
}

/* ===== Reusable: Stat Card mềm, chuyên nghiệp ===== */
function StatCard({ title, value, desc, icon, color, loading }) {
    return (
        <Card
            sx={{
                p: 2,
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
                boxShadow: (t) =>
                    t.palette.mode === "dark" ? "0 6px 20px rgba(0,0,0,.35)" : "0 8px 24px rgba(2,6,23,.08)",
                background: (t) =>
                    `linear-gradient(135deg, ${alpha(color, 0.14)}, ${alpha(
                        t.palette.mode === "dark" ? "#0b1020" : "#ffffff",
                        0.86
                    )})`,
                border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
                transition: "transform .2s ease, box-shadow .2s ease",
                "&:hover": { transform: "translateY(-4px)" },
            }}
        >
            {loading && (
                <LinearProgress sx={{ position: "absolute", inset: 0, opacity: 0.08 }} />
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="overline" letterSpacing={.6} color="text.secondary">
                    {title}
                </Typography>
                <Avatar
                    sx={{
                        bgcolor: color,
                        width: 42,
                        height: 42,
                        boxShadow: `0 8px 22px ${alpha(color, 0.35)}`,
                    }}
                >
                    {icon}
                </Avatar>
            </Box>
            <CardContent sx={{ p: 0, mt: 1 }}>
                <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </CardContent>
        </Card>
    );
}

/* ===== Nút nhanh dạng “pill” ===== */
const QuickAction = ({ icon, label, onClick }) => (
    <Button
        onClick={onClick}
        startIcon={icon}
        variant="outlined"
        size="small"
        sx={{
            borderRadius: 999,
            textTransform: "none",
            px: 1.6,
            height: 34,
            borderColor: (t) => alpha(t.palette.primary.main, .3),
            bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.08 : 0.06),
            "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.14) },
        }}
    >
        {label}
    </Button>
);

export default function Overview() {
    const sysTheme = useTheme();
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [mode, setMode] = React.useState(
        (typeof window !== "undefined" && localStorage.getItem("ui-mode")) ||
        (prefersDark ? "dark" : "light")
    );
    const [tab, setTab] = React.useState(0);
    const [anchorUser, setAnchorUser] = React.useState(null);
    const [anchorMore, setAnchorMore] = React.useState(null);
    const [query, setQuery] = React.useState("");

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
                    MuiCard: { styleOverrides: { root: { backgroundImage: "none" } } },
                    MuiTab: { styleOverrides: { root: { textTransform: "none" } } },
                },
            }),
        [mode]
    );

    const stats = [
        { title: "Tổng sản phẩm", value: "2,847", desc: "+12% so với tháng trước", icon: <PackageIcon fontSize="small" />, color: "#1565d8" },
        { title: "Yêu cầu bảo hành", value: "156", desc: "23 đang chờ xử lý", icon: <FileText fontSize="small" />, color: "#2e7d32" },
        { title: "Chiến dịch Recall", value: "8", desc: "3 đang hoạt động", icon: <AlertTriangle fontSize="small" />, color: "#ed6c02" },
        { title: "Chi phí bảo hành", value: "₫2.4B", desc: "Tháng này", icon: <BarChartIcon fontSize="small" />, color: "#9c27b0" },
    ];

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
                                        EV Warranty Management
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Hệ thống quản lý bảo hành xe điện
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: { xs: "40%", md: 440 } }}>
                                <TextField
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Tìm sản phẩm, yêu cầu bảo hành, chiến dịch…"
                                    size="small"
                                    fullWidth
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: 999 },
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
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
                                <Tooltip title="Thêm mới nhanh">
                                    <IconButton onClick={() => setTab(1)}>
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

                                <Avatar
                                    sx={{ bgcolor: "primary.main", fontWeight: "bold", cursor: "pointer" }}
                                    onClick={(e) => setAnchorUser(e.currentTarget)}
                                >
                                    A
                                </Avatar>
                                <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={() => setAnchorUser(null)}>
                                    <MenuItem onClick={() => setAnchorUser(null)}>Tài khoản</MenuItem>
                                    <MenuItem onClick={() => setAnchorUser(null)}>Tuỳ chỉnh giao diện</MenuItem>
                                    <Divider />
                                    <MenuItem onClick={() => setAnchorUser(null)}>Đăng xuất</MenuItem>
                                </Menu>
                            </Box>
                        </Toolbar>
                    </AppBar>
                </ElevationScroll>

                {/* Header hành động + breadcrumb */}
                <Container maxWidth="lg" sx={{ pt: 3, pb: 1.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1.5,
                            border: (t) => `1px solid ${alpha(t.palette.divider, 0.7)}`,
                            background: (t) =>
                                `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.07)}, ${alpha(
                                    t.palette.background.paper,
                                    1
                                )})`,
                        }}
                    >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: .75 }}>
                            <Breadcrumbs separator="›" sx={{ "& a": { fontSize: 13 } }}>
                                <MuiLink underline="hover" color="inherit">Dashboard</MuiLink>
                                <MuiLink underline="hover" color="inherit">Overview</MuiLink>
                            </Breadcrumbs>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                <Chip icon={<ReportIcon />} label="Tháng 10/2025" variant="outlined" />
                                <Chip color="secondary" label="SLA &lt; 48h" variant="outlined" />
                                <Chip label="EV - Series X" variant="outlined" />
                            </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <QuickAction icon={<AddIcon />} label="Tạo Recall" onClick={() => setTab(0)} />
                            <QuickAction icon={<PackageIcon />} label="Thêm Sản phẩm" onClick={() => setTab(1)} />
                            <QuickAction icon={<FileText />} label="Yêu cầu BH" onClick={() => setTab(2)} />
                        </Box>
                    </Paper>
                </Container>

                {/* Nội dung */}
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    {/* Stats */}
                    <Grid container spacing={3} mb={3}>
                        {stats.map((s, i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <StatCard {...s} loading={false} />
                            </Grid>
                        ))}
                    </Grid>

                    {/* Tabs kiểu pill, nổi bật tab active */}
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            overflow: "hidden",
                            p: 1.25,
                            pt: 0.75,
                            border: (t) => `1px solid ${alpha(t.palette.divider, 0.7)}`,
                            background: (t) =>
                                `linear-gradient(180deg, ${alpha(t.palette.background.paper, 1)}, ${alpha(
                                    t.palette.primary.main,
                                    0.05
                                )})`,
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
                            <Tab iconPosition="start" icon={<AlertTriangle />} label={<Box sx={{ display: "flex", alignItems: "center", gap: .8 }}><span>Tạo Recall</span><Chip size="small" label="8" sx={{ height: 20 }} /></Box>} />
                            <Tab iconPosition="start" icon={<PackageIcon />} label={<Box sx={{ display: "flex", alignItems: "center", gap: .8 }}><span>Quản lý Sản phẩm</span><Chip size="small" label="2,847" sx={{ height: 20 }} /></Box>} />
                            <Tab iconPosition="start" icon={<FileText />} label={<Box sx={{ display: "flex", alignItems: "center", gap: .8 }}><span>Yêu cầu Bảo hành</span><Chip size="small" label="156" sx={{ height: 20 }} /></Box>} />
                            <Tab iconPosition="start" icon={<SettingsIcon />} label="Chuỗi Cung ứng" />
                            <Tab iconPosition="start" icon={<CarIcon />} label="Trung tâm Dịch vụ" />
                            <Tab iconPosition="start" icon={<BarChartIcon />} label="Báo cáo & Phân tích" />
                            <Tab iconPosition="start" icon={<FileText />} label="Chính sách Bảo hành" />
                        </Tabs>

                        <Box sx={{ p: 2.5, bgcolor: "background.paper", borderRadius: 2 }}>
                            {tab === 0 && <RecallForm />}
                            {tab === 1 && <ProductManagement />}
                            {tab === 2 && <WarrantyRequests />}
                            {tab === 3 && (
                                <Typography variant="body1" color="text.secondary">
                                    Chức năng Chuỗi Cung ứng đang được phát triển.
                                </Typography>
                            )}
                            {tab === 4 && <ServiceCenters />}
                            {tab === 5 && <Analytics />}
                            {tab === 6 && <WarrantyPolicy />}
                        </Box>
                    </Paper>

                    {/* Footer */}
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
