"use client";

import React from "react";
import Analytics from "./Analytics";
import RecallForm from "./RecallForm";
import ProductManagement from "./ProductManagement";
import WarrantyRequests from "./WarrantyRequests";
import WarrantyPolicy from "./WarrantyPolicy";
import ServiceCenters from "./ServiceCenters";
// import SupplyChain from "./SupplyChain"; // Nếu có file này, bỏ comment và dùng ở tab 3

import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Avatar,
    Tabs,
    Tab,
    Button,
    Paper,
    IconButton,
    Tooltip,
    CssBaseline,
    Badge,
    TextField,
    InputAdornment,
    Divider,
    Chip,
    Menu,
    MenuItem,
    LinearProgress,
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

// Reusable Stat Card
function StatCard({ title, value, desc, icon, color, loading }) {
    return (
        <Card
            sx={{
                p: 2,
                borderRadius: 3,
                boxShadow: 4,
                transition: "0.3s",
                position: "relative",
                overflow: "hidden",
                "&:hover": { transform: "translateY(-4px)", boxShadow: 8 },
                background: (theme) =>
                    `linear-gradient(145deg, ${alpha(color, 0.12)}, ${alpha(
                        theme.palette.mode === "dark" ? "#ffffff" : "#000000",
                        0.04
                    )})`,
            }}
        >
            {loading && (
                <LinearProgress
                    sx={{ position: "absolute", inset: 0, borderRadius: 3, opacity: 0.1 }}
                />
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {title}
                </Typography>
                <Avatar
                    sx={{
                        bgcolor: color,
                        width: 40,
                        height: 40,
                        boxShadow: (t) => `0 6px 16px ${alpha(color, 0.35)}`,
                    }}
                >
                    {icon}
                </Avatar>
            </Box>
            <CardContent sx={{ p: 0, mt: 1 }}>
                <Typography variant="h5" fontWeight="bold">
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {desc}
                </Typography>
            </CardContent>
        </Card>
    );
}

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
                    primary: { main: mode === "dark" ? "#74b6ff" : "#1976d2" },
                    secondary: { main: "#00bfa6" },
                    background: {
                        default: mode === "dark" ? "#0b1020" : "#f5f7fb",
                        paper: mode === "dark" ? "#131a2e" : "#ffffff",
                    },
                },
                shape: { borderRadius: 16 },
                typography: { fontFamily: "Inter, system-ui, sans-serif" },
                components: {
                    MuiPaper: {
                        styleOverrides: { root: { backgroundImage: "none" } },
                    },
                    MuiCard: { styleOverrides: { root: { backgroundImage: "none" } } },
                    MuiAppBar: { styleOverrides: { root: { backgroundImage: "none" } } },
                },
            }),
        [mode]
    );

    const stats = [
        {
            title: "Tổng sản phẩm",
            value: "2,847",
            desc: "+12% so với tháng trước",
            icon: <PackageIcon fontSize="small" />,
            color: "#1976d2",
        },
        {
            title: "Yêu cầu bảo hành",
            value: "156",
            desc: "23 đang chờ xử lý",
            icon: <FileText fontSize="small" />,
            color: "#2e7d32",
        },
        {
            title: "Chiến dịch Recall",
            value: "8",
            desc: "3 đang hoạt động",
            icon: <AlertTriangle fontSize="small" />,
            color: "#ed6c02",
        },
        {
            title: "Chi phí bảo hành",
            value: "₫2.4B",
            desc: "Tháng này",
            icon: <BarChartIcon fontSize="small" />,
            color: "#9c27b0",
        },
    ];

    const QuickAction = ({ icon, label, onClick }) => (
        <Button
            onClick={onClick}
            startIcon={icon}
            variant="outlined"
            size="small"
            sx={{
                borderRadius: 999,
                textTransform: "none",
                px: 1.5,
                bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.06 : 0.04),
                borderColor: (t) => alpha(t.palette.primary.main, 0.25),
                "&:hover": {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                },
            }}
        >
            {label}
        </Button>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: "100vh", bgcolor: "background.default", transition: "0.3s ease all" }}>
                {/* Top AppBar */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        backdropFilter: "blur(10px)",
                        backgroundColor: (t) => alpha(t.palette.background.paper, 0.8),
                        borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
                    }}
                >
                    <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar sx={{ bgcolor: "primary.main" }}>
                                <CarIcon sx={{ color: "white" }} />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={800} letterSpacing={0.2}>
                                    EV Warranty Management
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Hệ thống quản lý bảo hành xe điện
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: { xs: "36%", md: 400 } }}>
                            <TextField
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Tìm kiếm sản phẩm, yêu cầu bảo hành, chiến dịch..."
                                size="small"
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Tooltip title="Thông báo">
                                <IconButton>
                                    <Badge color="secondary" variant="dot" overlap="circular">
                                        <NotificationsIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chuyển chế độ sáng/tối">
                                <IconButton onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
                                    {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Thêm mới">
                                <IconButton onClick={() => setTab(0)}>
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
                                <MenuItem onClick={() => setAnchorUser(null)}>Tùy chỉnh giao diện</MenuItem>
                                <Divider />
                                <MenuItem onClick={() => setAnchorUser(null)}>Đăng xuất</MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Page header actions */}
                <Container maxWidth="lg" sx={{ pt: 3, pb: 1 }}>
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
                                `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, ${alpha(
                                    t.palette.background.paper,
                                    1
                                )})`,
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Chip icon={<ReportIcon />} label="Tháng 10/2025" variant="outlined" />
                            <Chip color="secondary" label="SLA < 48h" variant="outlined" />
                            <Chip label="EV - Series X" variant="outlined" />
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <QuickAction icon={<AddIcon />} label="Tạo Recall" onClick={() => setTab(0)} />
                            <QuickAction icon={<PackageIcon />} label="Thêm Sản phẩm" onClick={() => setTab(1)} />
                            <QuickAction icon={<FileText />} label="Yêu cầu BH" onClick={() => setTab(2)} />
                        </Box>
                    </Paper>
                </Container>

                {/* Main Content */}
                <Container maxWidth="lg" sx={{ py: 3 }}>
                    {/* Stats Overview */}
                    <Grid container spacing={3} mb={4}>
                        {stats.map((s, i) => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <StatCard {...s} loading={false} />
                            </Grid>
                        ))}
                    </Grid>

                    {/* Tabs */}
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
                                '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: 15,
                                    minHeight: 40,
                                    borderRadius: 999,
                                    mr: 1,
                                    px: 1.5,
                                    alignSelf: 'start',
                                    color: 'text.secondary',
                                    transition: 'all .2s ease',
                                },
                                '& .MuiTab-root.Mui-selected': {
                                    bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.12),
                                    color: 'primary.main',
                                    boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.18)}`,
                                },
                                '& .tabLabel': { display: 'flex', alignItems: 'center', gap: 8 },
                            }}
                        >
                            <Tab
                                iconPosition="start"
                                icon={<AlertTriangle />}
                                label={
                                    <Box className="tabLabel">
                                        <span>Tạo Recall</span>
                                        <Chip size="small" label="8" sx={{ height: 20 }} />
                                    </Box>
                                }
                            />
                            <Tab
                                iconPosition="start"
                                icon={<PackageIcon />}
                                label={
                                    <Box className="tabLabel">
                                        <span>Quản lý Sản phẩm</span>
                                        <Chip size="small" label="2,847" sx={{ height: 20 }} />
                                    </Box>
                                }
                            />
                            <Tab
                                iconPosition="start"
                                icon={<FileText />}
                                label={
                                    <Box className="tabLabel">
                                        <span>Yêu cầu Bảo hành</span>
                                        <Chip size="small" label="156" sx={{ height: 20 }} />
                                    </Box>
                                }
                            />
                            <Tab iconPosition="start" icon={<SettingsIcon />} label="Chuỗi Cung ứng" />
                            <Tab iconPosition="start" icon={<CarIcon />} label="Trung tâm Dịch vụ" />
                            <Tab iconPosition="start" icon={<BarChartIcon />} label="Báo cáo & Phân tích" />
                            <Tab iconPosition="start" icon={<FileText />} label="Chính sách Bảo hành" />
                        </Tabs>

                        <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                            {tab === 0 && <RecallForm />}
                            {tab === 1 && <ProductManagement />}
                            {tab === 2 && <WarrantyRequests />}
                            {/* Nếu CHƯA có component SupplyChain, dùng placeholder. Khi bạn có file ./SupplyChain, bật import và thay dòng dưới bằng <SupplyChain /> */}
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
