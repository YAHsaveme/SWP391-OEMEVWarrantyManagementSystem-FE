"use client"

import React, { useState } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Grid,
    Card,
    CardHeader,
    CardContent,
    Chip,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    Divider,
    LinearProgress,
} from "@mui/material";

import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BuildIcon from "@mui/icons-material/Build";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PeopleIcon from "@mui/icons-material/People";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AnalyticsIcon from "@mui/icons-material/Analytics";

const drawerWidth = 260;

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [claimsTab, setClaimsTab] = useState("all");

    // mock data
    const stats = {
        totalClaims: 1247,
        pendingClaims: 89,
        approvedClaims: 1098,
        rejectedClaims: 60,
        serviceCenters: 45,
        activeTechnicians: 234,
        partsInventory: 15678,
        lowStockItems: 23,
    };

    const recentClaims = [
        { id: "WC-2024-001", vin: "WVWZZZ1JZ3W386752", issue: "Battery degradation", status: "pending", priority: "high", date: "2024-01-15" },
        { id: "WC-2024-002", vin: "WVWZZZ1JZ3W386753", issue: "Motor malfunction", status: "approved", priority: "medium", date: "2024-01-14" },
        { id: "WC-2024-003", vin: "WVWZZZ1JZ3W386754", issue: "Charging port issue", status: "in-progress", priority: "low", date: "2024-01-13" },
        { id: "WC-2024-004", vin: "WVWZZZ1JZ3W386755", issue: "BMS error", status: "completed", priority: "high", date: "2024-01-12" },
    ];

    const serviceCenters = [
        { id: "SC-001", name: "Trung tâm dịch vụ Hà Nội", location: "Hà Nội", activeClaims: 23, technicians: 8, status: "active" },
        { id: "SC-002", name: "Trung tâm dịch vụ TP.HCM", location: "TP. Hồ Chí Minh", activeClaims: 31, technicians: 12, status: "active" },
        { id: "SC-003", name: "Trung tâm dịch vụ Đà Nẵng", location: "Đà Nẵng", activeClaims: 15, technicians: 6, status: "active" },
        { id: "SC-004", name: "Trung tâm dịch vụ Cần Thơ", location: "Cần Thơ", activeClaims: 8, technicians: 4, status: "maintenance" },
    ];

    // helpers (return MUI color names or translated labels)
    const getStatusColor = (status) => {
        switch (status) {
            case "pending": return "warning";
            case "approved": return "success";
            case "in-progress": return "info";
            case "completed": return "default";
            case "rejected": return "error";
            default: return "default";
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high": return "error";
            case "medium": return "warning";
            case "low": return "success";
            default: return "default";
        }
    };

    const priorityLabel = (p) => (p === "high" ? "Cao" : p === "medium" ? "Trung bình" : "Thấp");
    const statusLabel = (s) =>
        s === "pending" ? "Chờ duyệt" : s === "approved" ? "Đã duyệt" : s === "in-progress" ? "Đang xử lý" : s === "completed" ? "Hoàn thành" : "Từ chối";

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f6f8fb" }}>
            <AppBar position="fixed" color="inherit" elevation={1} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <DirectionsCarIcon sx={{ fontSize: 32, color: "primary.main" }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>OEM EV Warranty System</Typography>
                            <Typography variant="body2" color="text.secondary">Admin Dashboard</Typography>
                        </Box>
                    </Box>

                    <Box>
                        <Button variant="outlined" startIcon={<NotificationsIcon />} sx={{ mr: 1 }}>Thông báo</Button>
                        <Button variant="outlined" startIcon={<SettingsIcon />}>Cài đặt</Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box", top: "64px" },
                }}
            >
                <List>
                    <ListItemButton selected={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
                        <ListItemIcon><BarChartIcon /></ListItemIcon>
                        <ListItemText primary="Tổng quan" />
                    </ListItemButton>

                    <ListItemButton selected={activeTab === "claims"} onClick={() => setActiveTab("claims")}>
                        <ListItemIcon><DescriptionIcon /></ListItemIcon>
                        <ListItemText primary="Yêu cầu bảo hành" />
                    </ListItemButton>

                    <ListItemButton selected={activeTab === "service-centers"} onClick={() => setActiveTab("service-centers")}>
                        <ListItemIcon><BuildIcon /></ListItemIcon>
                        <ListItemText primary="Trung tâm dịch vụ" />
                    </ListItemButton>

                    <ListItemButton selected={activeTab === "inventory"} onClick={() => setActiveTab("inventory")}>
                        <ListItemIcon><Inventory2Icon /></ListItemIcon>
                        <ListItemText primary="Kho phụ tùng" />
                    </ListItemButton>

                    <ListItemButton selected={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
                        <ListItemIcon><AnalyticsIcon /></ListItemIcon>
                        <ListItemText primary="Phân tích & Báo cáo" />
                    </ListItemButton>
                </List>
            </Drawer>

            {/* Main content */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: "64px" }}>
                {/* OVERVIEW */}
                {activeTab === "overview" && (
                    <Box>
                        <Typography variant="h5" fontWeight={700} mb={1}>Tổng quan hệ thống</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>Theo dõi tình trạng tổng thể của hệ thống bảo hành</Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Tổng yêu cầu" />
                                    <CardContent>
                                        <Typography variant="h4" fontWeight={700}>{stats.totalClaims.toLocaleString()}</Typography>
                                        <Chip icon={<TrendingUpIcon />} label="+12% so với tháng trước" color="success" size="small" sx={{ mt: 1 }} />
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Chờ duyệt" />
                                    <CardContent>
                                        <Typography variant="h4" color="warning.main" fontWeight={700}>{stats.pendingClaims}</Typography>
                                        <Chip icon={<TrendingDownIcon />} label="-5% so với tuần trước" color="warning" size="small" sx={{ mt: 1 }} />
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Trung tâm dịch vụ" />
                                    <CardContent>
                                        <Typography variant="h4" fontWeight={700}>{stats.serviceCenters}</Typography>
                                        <Typography variant="body2" color="text.secondary">Đang hoạt động</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Kỹ thuật viên" />
                                    <CardContent>
                                        <Typography variant="h4" fontWeight={700}>{stats.activeTechnicians}</Typography>
                                        <Typography variant="body2" color="text.secondary">Đang làm việc</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Card sx={{ mt: 3 }}>
                            <CardHeader title="Yêu cầu bảo hành gần đây" subheader="Danh sách các yêu cầu bảo hành mới nhất" />
                            <CardContent>
                                <Box display="grid" gap={2}>
                                    {recentClaims.map((c) => (
                                        <Box key={c.id} display="flex" justifyContent="space-between" alignItems="center" p={2} borderRadius={1} sx={{ border: 1, borderColor: "divider" }}>
                                            <Box>
                                                <Typography fontWeight={700}>{c.id}</Typography>
                                                <Typography variant="body2" color="text.secondary">VIN: {c.vin} • {c.date}</Typography>
                                                <Typography>{c.issue}</Typography>
                                            </Box>

                                            <Box sx={{ display: "flex", gap: 1 }}>
                                                <Chip label={priorityLabel(c.priority)} color={getPriorityColor(c.priority)} size="small" />
                                                <Chip label={statusLabel(c.status)} color={getStatusColor(c.status)} size="small" />
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* CLAIMS */}
                {activeTab === "claims" && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>Quản lý yêu cầu bảo hành</Typography>
                                <Typography variant="body2" color="text.secondary">Xem và quản lý tất cả yêu cầu bảo hành</Typography>
                            </Box>
                            <Button variant="contained" startIcon={<DescriptionIcon />}>Tạo yêu cầu mới</Button>
                        </Box>

                        <Box display="flex" gap={2} mb={2}>
                            <TextField
                                placeholder="Tìm kiếm theo VIN, ID yêu cầu..."
                                size="small"
                                fullWidth
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                            />
                            <Button variant="outlined" startIcon={<FilterListIcon />}>Lọc</Button>
                        </Box>

                        <Tabs value={claimsTab} onChange={(e, v) => setClaimsTab(v)}>
                            <Tab label={`Tất cả (${stats.totalClaims})`} value="all" />
                            <Tab label={`Chờ duyệt (${stats.pendingClaims})`} value="pending" />
                            <Tab label={`Đã duyệt (${stats.approvedClaims})`} value="approved" />
                            <Tab label={`Từ chối (${stats.rejectedClaims})`} value="rejected" />
                        </Tabs>

                        <Divider sx={{ my: 2 }} />

                        <Box display="grid" gap={2}>
                            {recentClaims
                                .filter((c) => claimsTab === "all" ? true : claimsTab === c.status || (claimsTab === "pending" && c.status === "pending"))
                                .map((claim) => (
                                    <Card key={claim.id}>
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography fontWeight={700}>{claim.id}</Typography>
                                                    <Typography variant="body2" color="text.secondary">VIN: {claim.vin}</Typography>
                                                    <Typography>{claim.issue}</Typography>
                                                    <Typography variant="caption" color="text.secondary">Ngày tạo: {claim.date}</Typography>
                                                </Box>

                                                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                                                    <Box>
                                                        <Chip label={priorityLabel(claim.priority)} color={getPriorityColor(claim.priority)} size="small" sx={{ mr: 1 }} />
                                                        <Chip label={statusLabel(claim.status)} color={getStatusColor(claim.status)} size="small" />
                                                    </Box>
                                                    <Box display="flex" gap={1}>
                                                        <Button size="small" variant="outlined">Xem chi tiết</Button>
                                                        <Button size="small" variant="contained">Xử lý</Button>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                        </Box>
                    </Box>
                )}

                {/* SERVICE CENTERS */}
                {activeTab === "service-centers" && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>Quản lý trung tâm dịch vụ</Typography>
                                <Typography variant="body2" color="text.secondary">Theo dõi hoạt động của các trung tâm dịch vụ</Typography>
                            </Box>
                            <Button variant="contained" startIcon={<BuildIcon />}>Thêm trung tâm mới</Button>
                        </Box>

                        <Grid container spacing={2}>
                            {serviceCenters.map((center) => (
                                <Grid item xs={12} md={6} lg={4} key={center.id}>
                                    <Card>
                                        <CardHeader
                                            title={center.name}
                                            subheader={center.location}
                                            action={<Chip label={center.status === "active" ? "Hoạt động" : "Bảo trì"} color={center.status === "active" ? "success" : "warning"} />}
                                        />
                                        <CardContent>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2" color="text.secondary">Yêu cầu đang xử lý</Typography>
                                                <Typography fontWeight={700}>{center.activeClaims}</Typography>
                                            </Box>

                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2" color="text.secondary">Kỹ thuật viên</Typography>
                                                <Typography fontWeight={700}>{center.technicians}</Typography>
                                            </Box>

                                            <Box display="flex" gap={1} mt={2}>
                                                <Button fullWidth variant="outlined" size="small">Xem chi tiết</Button>
                                                <Button fullWidth variant="contained" size="small">Quản lý</Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* INVENTORY */}
                {activeTab === "inventory" && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="h5" fontWeight={700}>Quản lý kho phụ tùng</Typography>
                                <Typography variant="body2" color="text.secondary">Theo dõi tồn kho và phân bổ phụ tùng</Typography>
                            </Box>
                            <Button variant="contained" startIcon={<Inventory2Icon />}>Nhập kho</Button>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardHeader title="Tổng phụ tùng" />
                                    <CardContent>
                                        <Typography variant="h4" fontWeight={700}>{stats.partsInventory.toLocaleString()}</Typography>
                                        <Typography variant="body2" color="text.secondary">Đang có trong kho</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardHeader title="Sắp hết hàng" />
                                    <CardContent>
                                        <Typography variant="h4" color="warning.main" fontWeight={700}>{stats.lowStockItems}</Typography>
                                        <Typography variant="body2" color="text.secondary">Cần bổ sung</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card>
                                    <CardHeader title="Đang vận chuyển" />
                                    <CardContent>
                                        <Typography variant="h4" color="info.main" fontWeight={700}>156</Typography>
                                        <Typography variant="body2" color="text.secondary">Đơn hàng đang giao</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Card sx={{ mt: 2 }}>
                            <CardHeader title="Cảnh báo tồn kho thấp" subheader="Các phụ tùng cần được bổ sung gấp" />
                            <CardContent>
                                {[
                                    { name: "Pin Lithium 60kWh", code: "BAT-60-001", current: 5, minimum: 10, status: "critical" },
                                    { name: "Motor điện 150kW", code: "MOT-150-002", current: 8, minimum: 15, status: "warning" },
                                    { name: "BMS Controller", code: "BMS-CTL-003", current: 12, minimum: 20, status: "warning" },
                                    { name: "Inverter 400V", code: "INV-400-004", current: 3, minimum: 8, status: "critical" },
                                ].map((item) => (
                                    <Box key={item.code} display="flex" justifyContent="space-between" alignItems="center" p={2} sx={{ borderBottom: 1, borderColor: "divider" }}>
                                        <Box>
                                            <Typography fontWeight={700}>{item.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">Mã: {item.code}</Typography>
                                        </Box>

                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box textAlign="right">
                                                <Typography variant="body2">Tồn kho: {item.current}</Typography>
                                                <Typography variant="caption" color="text.secondary">Tối thiểu: {item.minimum}</Typography>
                                            </Box>
                                            <Chip label={item.status === "critical" ? "Nguy cấp" : "Cảnh báo"} color={item.status === "critical" ? "error" : "warning"} />
                                            <Button variant="contained" size="small">Đặt hàng</Button>
                                        </Box>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* ANALYTICS */}
                {activeTab === "analytics" && (
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Phân tích & Báo cáo</Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>Thống kê chi tiết và xu hướng bảo hành</Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Tỷ lệ chấp nhận" />
                                    <CardContent>
                                        <Typography variant="h4" color="success.main">88.2%</Typography>
                                        <Typography variant="caption" color="text.secondary">+2.1% so với tháng trước</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Thời gian xử lý TB" />
                                    <CardContent>
                                        <Typography variant="h4" color="info.main">3.2 ngày</Typography>
                                        <Typography variant="caption" color="text.secondary">-0.5 ngày so với tháng trước</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Chi phí bảo hành" />
                                    <CardContent>
                                        <Typography variant="h4">2.4 tỷ VNĐ</Typography>
                                        <Typography variant="caption" color="text.secondary">Tháng này</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardHeader title="Mức độ hài lòng" />
                                    <CardContent>
                                        <Typography variant="h4" color="success.main">4.6/5</Typography>
                                        <Typography variant="caption" color="text.secondary">Từ 1,247 đánh giá</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} lg={6}>
                                <Card>
                                    <CardHeader title="Lỗi phổ biến nhất" subheader="Top 5 vấn đề thường gặp" />
                                    <CardContent>
                                        {[
                                            { issue: "Suy giảm pin", count: 234, percentage: 18.8 },
                                            { issue: "Lỗi motor", count: 189, percentage: 15.2 },
                                            { issue: "Sự cố sạc", count: 156, percentage: 12.5 },
                                            { issue: "Lỗi BMS", count: 134, percentage: 10.7 },
                                            { issue: "Inverter", count: 98, percentage: 7.9 },
                                        ].map((it, idx) => (
                                            <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Box display="flex" gap={2} alignItems="center">
                                                    <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "primary.main", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</Box>
                                                    <Typography>{it.issue}</Typography>
                                                </Box>
                                                <Box textAlign="right">
                                                    <Typography fontWeight={700}>{it.count}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{it.percentage}%</Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} lg={6}>
                                <Card>
                                    <CardHeader title="Hiệu suất trung tâm dịch vụ" subheader="Đánh giá theo thời gian xử lý" />
                                    <CardContent>
                                        {serviceCenters.map((c) => (
                                            <Box key={c.id} mb={2}>
                                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{(Math.floor(Math.random() * 2) + 2) + "." + Math.floor(Math.random() * 9)} ngày</Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={Math.floor(Math.random() * 40) + 60} />
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Box>
        </Box>
    );
}  