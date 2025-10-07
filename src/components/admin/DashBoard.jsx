"use client"

import React, { useMemo, useState } from "react";
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
  Divider,
  LinearProgress,
  Avatar,
  IconButton,
  Badge,
  Tooltip,
  Stack,
  useMediaQuery,
  CssBaseline,
} from "@mui/material";
import { createTheme, ThemeProvider, alpha, styled } from "@mui/material/styles";

import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BuildIcon from "@mui/icons-material/Build";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CancelIcon from "@mui/icons-material/Cancel";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";

const drawerWidth = 264;

/* ---------- Styled Helpers ---------- */
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
    theme.palette.background.paper,
    0.75
  )} 100%)`,
  boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
}));

const SoftChip = styled(Chip)(({ theme }) => ({
  borderRadius: 10,
  fontWeight: 600,
}));

const SidebarHeader = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: alpha(theme.palette.text.primary, 0.6),
  padding: theme.spacing(2, 2, 1),
}));

/* ---------- Mock Data ---------- */
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

/* Users (mock) */
const users = [
  { id: "U-001", name: "Nguyễn Văn A", email: "a.nguyen@oem.com", role: "admin", status: "active", lastActive: "2025-10-01" },
  { id: "U-002", name: "Trần Thị B", email: "b.tran@oem.com", role: "manager", status: "active", lastActive: "2025-10-05" },
  { id: "U-003", name: "Lê Văn C", email: "c.le@oem.com", role: "technician", status: "suspended", lastActive: "2025-09-28" },
  { id: "U-004", name: "Phạm D", email: "d.pham@oem.com", role: "viewer", status: "active", lastActive: "2025-10-06" },
  { id: "U-005", name: "Võ E", email: "e.vo@oem.com", role: "technician", status: "active", lastActive: "2025-10-03" },
];

/* ---------- Helpers ---------- */
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
  s === "pending" ? "Chờ duyệt"
    : s === "approved" ? "Đã duyệt"
      : s === "in-progress" ? "Đang xử lý"
        : s === "completed" ? "Hoàn thành"
          : "Từ chối";

/* ---------- Mini Sparkline ---------- */
const sparkData = [
  { x: 1, y: 24 },
  { x: 2, y: 32 },
  { x: 3, y: 28 },
  { x: 4, y: 36 },
  { x: 5, y: 44 },
  { x: 6, y: 40 },
  { x: 7, y: 48 },
];

const Sparkline = ({ colorKey = "primary" }) => (
  <Box sx={{ width: "100%", height: 48 }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sparkData} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${colorKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mui-palette-primary-main)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--mui-palette-primary-main)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke="var(--mui-palette-primary-main)" fill={`url(#grad-${colorKey})`} strokeWidth={2} />
        <RTooltip cursor={{ stroke: "var(--mui-palette-divider)" }} />
      </AreaChart>
    </ResponsiveContainer>
  </Box>
);

/* ---------- Metric Card ---------- */
const MetricCard = ({ title, value, chip, icon, tone = "primary" }) => (
  <GlassCard>
    <CardHeader
      avatar={<Avatar sx={{ bgcolor: `${tone}.main`, boxShadow: 2 }}>{icon}</Avatar>}
      title={<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>}
      action={chip}
    />
    <CardContent>
      <Stack spacing={1.25}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>{value}</Typography>
        <Sparkline />
      </Stack>
    </CardContent>
  </GlassCard>
);

/* ---------- Chips ---------- */
const StatusChip = ({ status }) => {
  const map = {
    approved: { icon: <CheckCircleIcon fontSize="small" />, label: statusLabel(status), color: "success" },
    pending: { icon: <HourglassBottomIcon fontSize="small" />, label: statusLabel(status), color: "warning" },
    "in-progress": { icon: <BuildIcon fontSize="small" />, label: statusLabel(status), color: "info" },
    completed: { icon: <CheckCircleIcon fontSize="small" />, label: statusLabel(status), color: "default" },
    rejected: { icon: <CancelIcon fontSize="small" />, label: statusLabel(status), color: "error" },
  }[status] || { label: status };
  return <SoftChip size="small" variant="outlined" color={map.color} icon={map.icon} label={map.label} />;
};

const PriorityChip = ({ priority }) => (
  <SoftChip size="small" color={getPriorityColor(priority)} label={`Ưu tiên: ${priorityLabel(priority)}`} variant="outlined" />
);

/* ---------- Main ---------- */
export default function Dashboard() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState(prefersDark ? "dark" : "light");
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");

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

  const filteredClaims = recentClaims.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.vin.toLowerCase().includes(search.toLowerCase()) ||
      c.issue.toLowerCase().includes(search.toLowerCase())
  );

  /* Admin shortcuts (6 mục theo bảng) */
  const adminShortcuts = [
    { key: "users", icon: <PeopleAltIcon />, title: "Người dùng", desc: "Tạo / xóa / phân quyền / hoạt động" },
    { key: "vehicles", icon: <DirectionsCarIcon />, title: "Hồ sơ xe", desc: "VIN, chủ xe, lịch sử dịch vụ" },
    { key: "claims", icon: <DescriptionIcon />, title: "Yêu cầu bảo hành", desc: "Duyệt / từ chối / báo cáo" },
    { key: "inventory", icon: <Inventory2Icon />, title: "Phụ tùng & sản phẩm", desc: "Danh mục, chính sách, tồn kho" },
    { key: "service-centers", icon: <BuildIcon />, title: "Trung tâm dịch vụ", desc: "Hoạt động, hiệu suất, nhân sự" },
    { key: "analytics", icon: <AnalyticsIcon />, title: "Báo cáo & AI", desc: "Tổng hợp & dự đoán chi phí" },
  ];

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
                <DirectionsCarIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} letterSpacing={0.3}>
                  OEM EV Warranty System
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Admin Dashboard
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Tìm kiếm yêu cầu, VIN, lỗi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: { xs: 160, sm: 260, md: 360 }, mr: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ opacity: 0.7 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Tooltip title="Chế độ sáng/tối">
                <IconButton color="inherit" onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
                  {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Thông báo">
                <IconButton color="inherit">
                  <Badge color="error" variant="dot">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title="Cài đặt">
                <IconButton color="inherit">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>

              <Avatar sx={{ width: 32, height: 32 }}>AD</Avatar>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              backgroundColor: "background.paper",
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              top: 64,
              p: 1,
            },
          }}
        >
          <SidebarHeader>Điều hướng</SidebarHeader>
          <List>
            {[
              { key: "overview", icon: <BarChartIcon />, label: "Tổng quan" },
              { key: "claims", icon: <DescriptionIcon />, label: "Yêu cầu bảo hành" },
              { key: "users", icon: <PeopleAltIcon />, label: "Người dùng" },
              { key: "service-centers", icon: <BuildIcon />, label: "Trung tâm dịch vụ" },
              { key: "inventory", icon: <Inventory2Icon />, label: "Kho phụ tùng" },
              { key: "analytics", icon: <AnalyticsIcon />, label: "Phân tích & Báo cáo" },
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

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ p: 2 }}>
            <Button fullWidth startIcon={<FilterListIcon />} variant="outlined">
              Bộ lọc nhanh
            </Button>
          </Box>
        </Drawer>

        {/* Main */}
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: "64px" }}>
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2}>
                <Box>
                  <Typography variant="h5" fontWeight={800} gutterBottom>
                    Tổng quan hệ thống
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Theo dõi tình trạng tổng thể của hệ thống bảo hành
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip icon={<TrendingUpIcon />} color="success" label="+12% MoM" />
                  <Chip icon={<TrendingDownIcon />} color="warning" label="-5% WoW" />
                </Stack>
              </Stack>

              {/* ADMIN SHORTCUTS (6 ô theo ma trận chức năng) */}
              <Grid container spacing={2.5} sx={{ mb: 1 }}>
                {adminShortcuts.map((s) => (
                  <Grid key={s.key} item xs={12} sm={6} md={4}>
                    <GlassCard onClick={() => setActiveTab(s.key)} sx={{ cursor: "pointer" }}>
                      <CardHeader
                        avatar={<Avatar sx={{ bgcolor: "primary.main" }}>{s.icon}</Avatar>}
                        title={<Typography fontWeight={700}>{s.title}</Typography>}
                        subheader={s.desc}
                      />
                    </GlassCard>
                  </Grid>
                ))}
              </Grid>

              {/* Metrics */}
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={3}>
                  <MetricCard
                    title="Tổng yêu cầu"
                    value={stats.totalClaims.toLocaleString()}
                    icon={<BarChartIcon />}
                    tone="primary"
                    chip={<SoftChip size="small" color="success" icon={<TrendingUpIcon />} label="+12% so với tháng trước" />}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <MetricCard
                    title="Chờ duyệt"
                    value={stats.pendingClaims}
                    icon={<HourglassBottomIcon />}
                    tone="warning"
                    chip={<SoftChip size="small" color="warning" icon={<TrendingDownIcon />} label="-5% so với tuần trước" />}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <MetricCard
                    title="Trung tâm dịch vụ"
                    value={stats.serviceCenters}
                    icon={<BuildIcon />}
                    tone="info"
                    chip={<SoftChip size="small" color="info" label="Đang hoạt động" />}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <MetricCard
                    title="Kỹ thuật viên"
                    value={stats.activeTechnicians}
                    icon={<SettingsIcon />}
                    tone="secondary"
                    chip={<SoftChip size="small" color="secondary" label="Đang làm việc" />}
                  />
                </Grid>
              </Grid>

              {/* Recent Claims & Service centers */}
              <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={7}>
                  <GlassCard>
                    <CardHeader
                      title={<Typography variant="h6" fontWeight={700}>Yêu cầu gần đây</Typography>}
                      subheader="Theo dõi các yêu cầu mới nhất từ hệ thống"
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Stack spacing={1.25}>
                        {filteredClaims.map((c) => (
                          <Box
                            key={c.id}
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", sm: "140px 1fr 160px 130px" },
                              gap: 1,
                              alignItems: "center",
                              p: 1.25,
                              borderRadius: 2,
                              border: `1px dashed ${alpha(theme.palette.divider, 0.6)}`,
                              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar variant="rounded" sx={{ width: 30, height: 30 }}>
                                <DescriptionIcon fontSize="small" />
                              </Avatar>
                              <Typography fontWeight={700}>{c.id}</Typography>
                            </Stack>

                            <Box sx={{ opacity: 0.9 }}>
                              <Typography variant="body2" fontWeight={600}>{c.issue}</Typography>
                              <Typography variant="caption" color="text.secondary">VIN: {c.vin}</Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <StatusChip status={c.status} />
                              <PriorityChip priority={c.priority} />
                            </Stack>

                            <Typography variant="caption" color="text.secondary" textAlign={{ xs: "left", sm: "right" }}>
                              {new Date(c.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </GlassCard>
                </Grid>

                <Grid item xs={12} md={5}>
                  <GlassCard>
                    <CardHeader
                      title={<Typography variant="h6" fontWeight={700}>Trung tâm dịch vụ</Typography>}
                      subheader="Tải công việc & nhân sự"
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Stack spacing={1.5}>
                        {serviceCenters.map((s) => {
                          const load = Math.min(100, Math.round((s.activeClaims / (s.technicians * 4)) * 100));
                          return (
                            <Box key={s.id}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Box>
                                  <Typography fontWeight={700}>{s.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {s.location} • KT: {s.technicians} • Y/C: {s.activeClaims}
                                  </Typography>
                                </Box>
                                <SoftChip
                                  size="small"
                                  color={s.status === "active" ? "success" : "warning"}
                                  label={s.status === "active" ? "Hoạt động" : "Bảo trì"}
                                />
                              </Stack>
                              <LinearProgress variant="determinate" value={load} sx={{ height: 8, borderRadius: 10 }} />
                            </Box>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </GlassCard>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* USERS MANAGEMENT */}
          {activeTab === "users" && (
            <Box>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-end" }} gap={2} mb={2}>
                <Box>
                  <Typography variant="h5" fontWeight={800} gutterBottom>
                    Quản lý người dùng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Tạo, phân quyền, khóa/mở khóa tài khoản.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained">Thêm người dùng</Button>
                  <Button variant="outlined">Nhập CSV</Button>
                </Stack>
              </Stack>

              <GlassCard>
                <CardContent>
                  {/* Filters */}
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }} mb={2}>
                    <TextField
                      size="small"
                      placeholder="Tìm theo tên, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                      sx={{ minWidth: { xs: "100%", md: 320 } }}
                    />
                    <TextField size="small" label="Vai trò" select SelectProps={{ native: true }} defaultValue="">
                      <option value="">Tất cả</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="technician">Technician</option>
                      <option value="viewer">Viewer</option>
                    </TextField>
                    <TextField size="small" label="Trạng thái" select SelectProps={{ native: true }} defaultValue="">
                      <option value="">Tất cả</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="suspended">Bị khóa</option>
                    </TextField>
                  </Stack>

                  {/* Table */}
                  <Box sx={{ width: "100%", overflow: "auto" }}>
                    <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                      <Box component="thead" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <Box component="tr">
                          {['Mã', 'Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Lần hoạt động cuối', 'Hành động'].map((h) => (
                            <Box key={h} component="th" sx={{ textAlign: 'left', p: 1.25, fontSize: 13, color: 'text.secondary', borderBottom: `1px solid ${theme.palette.divider}` }}>{h}</Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {users
                          .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
                          .map((u) => (
                            <Box key={u.id} component="tr" sx={{ '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.03) } }}>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>{u.id}</Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>{u.name}</Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>{u.email}</Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Chip size="small" label={u.role} color={u.role === 'admin' ? 'secondary' : u.role === 'manager' ? 'info' : u.role === 'technician' ? 'warning' : 'default'} variant="outlined" />
                              </Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Chip size="small" label={u.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'} color={u.status === 'active' ? 'success' : 'error'} variant="outlined" />
                              </Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>{new Date(u.lastActive).toLocaleDateString()}</Box>
                              <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Stack direction="row" spacing={1}>
                                  <Button size="small" variant="text">Xem / Sửa</Button>
                                  <Button size="small" variant="outlined" color={u.status === 'active' ? 'error' : 'success'}>
                                    {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                                  </Button>
                                  <Button size="small" variant="outlined">Đặt lại mật khẩu</Button>
                                </Stack>
                              </Box>
                            </Box>
                          ))}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </GlassCard>
            </Box>
          )}

          {/* Placeholder tabs (extend later) */}
          {activeTab !== "overview" && activeTab !== "users" && (
            <Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {activeTab === "claims" && "Yêu cầu bảo hành"}
                {activeTab === "service-centers" && "Trung tâm dịch vụ"}
                {activeTab === "inventory" && "Kho phụ tùng"}
                {activeTab === "analytics" && "Phân tích & Báo cáo"}
                {activeTab === "vehicles" && "Hồ sơ xe"}
              </Typography>
              <GlassCard>
                <CardContent>
                  <Typography color="text.secondary">
                    Nội dung sẽ được phát triển. Hãy yêu cầu nếu bạn muốn thêm bảng, biểu đồ hoặc bộ lọc cụ thể.
                  </Typography>
                </CardContent>
              </GlassCard>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
