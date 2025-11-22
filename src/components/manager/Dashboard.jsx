import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Assessment as AssessmentIcon,
    BarChart as BarChartIcon,
    Speed as SpeedIcon,
    Analytics as AnalyticsIcon,
    Inventory as InventoryIcon,
    Assignment as AssignmentIcon,
    AttachMoney as AttachMoneyIcon,
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    AccessTime as AccessTimeIcon,
    ShowChart as ShowChartIcon,
} from "@mui/icons-material";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import dashboardService from "../../services/dashboardService";
import authService from "../../services/authService";

// Helper: convert input (Date | string) -> ISO datetime string or undefined
const toIsoDateTime = (date) => {
    if (!date) return undefined;
    // If already Date object, use toISOString, else try to construct Date
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return undefined;
        return d.toISOString(); // e.g. 2025-11-21T13:27:21.448Z
    } catch (e) {
        return undefined;
    }
};

// Helper function để format giá trị hiển thị
const formatValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Có" : "Không";
    if (typeof value === "number") {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toLocaleString("vi-VN");
    }
    if (typeof value === "object") {
        if (Array.isArray(value)) return `${value.length} mục`;
        return Object.keys(value).length > 0 ? `${Object.keys(value).length} trường` : "Trống";
    }
    return String(value);
};

// Component tái sử dụng cho Metric Card
const MetricCard = ({ label, value, icon: Icon, color = "primary" }) => (
    <Card
        elevation={0}
        sx={{
            height: "100%",
            borderRadius: 1.5,
            border: (t) => `1px solid ${alpha(t.palette.divider, 0.3)}`,
            transition: "all 0.3s ease",
            background: (t) =>
                t.palette.mode === "dark"
                    ? alpha(t.palette.background.paper, 0.8)
                    : "#ffffff",
            "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: (t) => `0 4px 12px ${alpha(t.palette[color].main, 0.15)}`,
                border: (t) => `1px solid ${alpha(t.palette[color].main, 0.3)}`,
            },
        }}
    >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                    sx={{
                        p: 0.8,
                        borderRadius: 1,
                        bgcolor: (t) => alpha(t.palette[color].main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 36,
                        minHeight: 36,
                    }}
                >
                    <Icon sx={{ fontSize: 18, color: `${color}.main` }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        textTransform="uppercase"
                        letterSpacing={0.3}
                        fontSize="0.65rem"
                        sx={{ display: "block", mb: 0.25 }}
                    >
                        {label}
                    </Typography>
                    <Typography
                        variant="h6"
                        fontWeight={700}
                        color={`${color}.main`}
                        sx={{ lineHeight: 1.2, fontSize: "1.1rem" }}
                    >
                        {formatValue(value)}
                    </Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle, color = "primary" }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box
            sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: (t) => alpha(t.palette[color].main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Icon color={color} sx={{ fontSize: 20 }} />
        </Box>
        <Box>
            <Typography variant="subtitle1" fontWeight={700} fontSize="0.95rem">
                {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                {subtitle}
            </Typography>
        </Box>
    </Box>
);

export default function Dashboard() {
    const [centerId, setCenterId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [summary, setSummary] = useState(null);

    // Load centerId từ user khi component mount
    useEffect(() => {
        const loadCenterId = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                console.log("[Dashboard] Current user:", currentUser);
                
                // Lấy centerId từ nhiều nguồn có thể
                const cId = currentUser?.centerId || 
                           currentUser?.center?.id || 
                           currentUser?.center?.centerId ||
                           currentUser?.id || // Nếu user.id chính là centerId
                           null;
                
                console.log("[Dashboard] Extracted centerId:", cId);
                
                if (cId) {
                    setCenterId(String(cId));
                } else {
                    setError("Không tìm thấy centerId trong thông tin người dùng. Vui lòng liên hệ quản trị viên.");
                    setLoading(false);
                }
            } catch (err) {
                console.error("[Dashboard] Failed to load centerId:", err);
                setError("Không thể tải thông tin người dùng: " + (err?.response?.data?.message || err.message));
                setLoading(false);
            }
        };
        
        loadCenterId();
    }, []);

    // Chuẩn hóa dữ liệu cho biểu đồ đường - Ưu tiên monthlyClaims, fallback các options khác
    const chartData = useMemo(() => {
        // Option 1: monthlyClaims từ summary API (theo tháng)
        const monthlyData = summary?.monthlyClaims;
        if (monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0) {
            console.log("✅ Using monthlyClaims data");
            return monthlyData.map((item, idx) => ({
                name: item.month || item.date || item.label || item.name || `Tháng ${idx + 1}`,
                claims: item.count || item.claims || item.value || item.total || 0,
                approved: item.approved || 0,
                rejected: item.rejected || 0,
            }));
        }

        // Option 2: claimsByStatus từ summary (nếu có dữ liệu theo thời gian)
        const claimsByStatus = summary?.claimsByStatus;
        if (claimsByStatus && Array.isArray(claimsByStatus) && claimsByStatus.length > 0) {
            console.log("✅ Using claimsByStatus data");
            return claimsByStatus.map((item, idx) => ({
                name: item.date || item.month || item.period || `Kỳ ${idx + 1}`,
                claims: item.total || item.count || 0,
                approved: item.approved || 0,
                rejected: item.rejected || 0,
                pending: item.pending || 0,
            }));
        }

        // Option 3: Tạo dữ liệu từ performance metrics (nếu có rangeStart/rangeEnd)
        if (performance?.rangeStart && performance?.rangeEnd) {
            console.log("⚠️ Có rangeStart/rangeEnd nhưng chưa có time series data");
            // Có thể request thêm endpoint với date range sau
        }

        console.log("⚠️ Không có dữ liệu phù hợp cho biểu đồ đường");
        console.log("   - Summary keys:", summary ? Object.keys(summary) : "null");
        console.log("   - Performance keys:", performance ? Object.keys(performance) : "null");
        return [];
    }, [summary, performance]);

    // Chuẩn hóa dữ liệu byTechnician cho biểu đồ (nếu có)
    const technicianData = useMemo(() => {
        if (!performance?.byTechnician || !Array.isArray(performance.byTechnician)) {
            return [];
        }
        return performance.byTechnician.map(item => ({
            name: item.technicianName || item.name || "Technician",
            completed: item.completedTasks || item.completedCount || item.completed || 0,
            pending: item.pendingCount || item.pending || 0,
            avgDuration: Number(item.avgDuration) || 0,
            successRate: Number(item.successRate) || 0,
            rating: Number(item.rating) || 0,
        }));
    }, [performance]);

    useEffect(() => {
        if (!centerId) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Gọi 2 API song song
                const [performanceData, summaryData] = await Promise.all([
                    dashboardService.getPerformanceByCenter(centerId),
                    dashboardService.getSummaryByCenter(centerId),
                ]);

                console.log("📊 Performance Data:", performanceData);
                console.log("📈 Summary Data:", summaryData);
                console.log("📊 Performance Data Type:", typeof performanceData);
                console.log("📊 Performance Data Keys:", performanceData ? Object.keys(performanceData) : "null");
                console.log("📈 Summary Data Keys:", summaryData ? Object.keys(summaryData) : "null");
                console.log("📈 MonthlyClaims:", summaryData?.monthlyClaims || summaryData?.data?.monthlyClaims);

                // Handle nested response structure if needed
                const perfData = performanceData?.data || performanceData;
                const summData = summaryData?.data || summaryData;

                setPerformance(perfData);
                setSummary(summData);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Không thể tải dữ liệu dashboard"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [centerId]);

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 400,
                    gap: 2,
                }}
            >
                <CircularProgress size={48} />
                <Typography variant="body2" color="text.secondary">
                    Đang tải dữ liệu...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                    Tổng quan hệ thống quản lý bảo hành
                </Typography>
            </Box>

            {/* Biểu đồ đường - Full width */}
            {chartData.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        background: (t) =>
                            `linear-gradient(135deg, ${alpha(t.palette.info.main, 0.05)} 0%, ${alpha(t.palette.primary.main, 0.05)} 100%)`,
                        border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
                    }}
                >
                    <SectionHeader
                        icon={ShowChartIcon}
                        title="Biểu đồ xu hướng yêu cầu bảo hành"
                        subtitle={
                            summary?.monthlyClaims
                                ? "Xu hướng số lượng claims theo tháng"
                                : summary?.claimsByStatus
                                    ? "Xu hướng claims theo trạng thái"
                                    : "Dữ liệu theo thời gian"
                        }
                        color="info"
                    />
                    <Box sx={{ width: "100%", height: 350, mt: 2 }}>
                        <ResponsiveContainer>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.1)} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    stroke={alpha("#000", 0.7)}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    stroke={alpha("#000", 0.7)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 8,
                                        border: `1px solid ${alpha("#000", 0.1)}`,
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="claims"
                                    stroke="#1976d2"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Tổng yêu cầu"
                                />
                                {chartData.some(d => d.approved !== undefined && d.approved > 0) && (
                                    <Line
                                        type="monotone"
                                        dataKey="approved"
                                        stroke="#2e7d32"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Đã phê duyệt"
                                    />
                                )}
                                {chartData.some(d => d.rejected !== undefined && d.rejected > 0) && (
                                    <Line
                                        type="monotone"
                                        dataKey="rejected"
                                        stroke="#d32f2f"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Bị từ chối"
                                    />
                                )}
                                {chartData.some(d => d.pending !== undefined && d.pending > 0) && (
                                    <Line
                                        type="monotone"
                                        dataKey="pending"
                                        stroke="#ed6c02"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Đang chờ"
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            )}

            {/* 2 Sections chia đôi màn hình */}
            <Grid container spacing={2}>
                {/* Performance Section - Bên trái */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            height: "100%",
                            borderRadius: 2,
                            background: (t) =>
                                `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.05)} 0%, ${alpha(t.palette.secondary.main, 0.05)} 100%)`,
                            border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
                        }}
                    >
                        <SectionHeader
                            icon={SpeedIcon}
                            title="Performance Metrics"
                            subtitle="Chỉ số hiệu suất hệ thống"
                            color="primary"
                        />
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {/* Biểu đồ cột: completedTasks theo kỹ thuật viên/center */}
                            {technicianData.length > 0 && (
                                <Box sx={{ width: "100%", height: 280 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={technicianData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={alpha("#000", 0.08)} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={alpha("#000", 0.7)} />
                                            <YAxis tick={{ fontSize: 11 }} stroke={alpha("#000", 0.7)} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="completed" name="Hoàn tất" fill="#2e7d32" />
                                            {technicianData.some(d => d.pending > 0) && (
                                                <Bar dataKey="pending" name="Đang chờ" fill="#ed6c02" />
                                            )}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}

                            {/* Hiển thị tất cả fields từ performance nếu có (trừ các fields không cần thiết) */}
                            {performance && typeof performance === 'object' && Object.keys(performance).length > 0 ? (
                                Object.entries(performance)
                                    .filter(([key]) => {
                                        // Bỏ các fields không cần hiển thị
                                        const excludeFields = [
                                            'inProgressCount',
                                            'averageHandleMinutes',
                                            'medianHandleMinutes',
                                            'p90HandleMinutes',
                                            'throughputPerDay',
                                            'byTechnician',
                                            'rangeStart',
                                            'rangeEnd',
                                        ];
                                        return !excludeFields.includes(key);
                                    })
                                    .map(([key, value]) => {
                                        // Map field names to Vietnamese labels
                                        const labelMap = {
                                            completedCount: "Đã hoàn thành",
                                            bookedCount: "Đã đặt lịch",
                                            totalClaims: "Tổng số yêu cầu",
                                            approvedClaims: "Yêu cầu đã phê duyệt",
                                            rejectedClaims: "Yêu cầu bị từ chối",
                                            pendingClaims: "Yêu cầu đang chờ",
                                        };

                                        // Map field names to icons
                                        const iconMap = {
                                            completedCount: CheckCircleIcon,
                                            bookedCount: AssignmentIcon,
                                            totalClaims: AssignmentIcon,
                                            approvedClaims: CheckCircleIcon,
                                            rejectedClaims: WarningIcon,
                                            pendingClaims: WarningIcon,
                                        };

                                        // Map field names to colors
                                        const colorMap = {
                                            completedCount: "success",
                                            bookedCount: "info",
                                            totalClaims: "primary",
                                            approvedClaims: "success",
                                            rejectedClaims: "error",
                                            pendingClaims: "warning",
                                        };

                                        const Icon = iconMap[key] || AssignmentIcon;
                                        const color = colorMap[key] || "primary";
                                        const label = labelMap[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

                                        return (
                                            <MetricCard
                                                key={key}
                                                label={label}
                                                value={value}
                                                icon={Icon}
                                                color={color}
                                            />
                                        );
                                    })
                            ) : (
                                <Box
                                    sx={{
                                        p: 2,
                                        textAlign: "center",
                                        color: "text.secondary",
                                    }}
                                >
                                    <WarningIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2" fontSize="0.85rem">
                                        Không có dữ liệu performance
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block", mt: 0.5 }} fontSize="0.7rem">
                                        {performance ? `Cấu trúc: ${JSON.stringify(performance)}` : "API không trả về dữ liệu"}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Summary Section - Bên phải */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            height: "100%",
                            borderRadius: 2,
                            background: (t) =>
                                `linear-gradient(135deg, ${alpha(t.palette.secondary.main, 0.05)} 0%, ${alpha(t.palette.primary.main, 0.05)} 100%)`,
                            border: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
                        }}
                    >
                        <SectionHeader
                            icon={AssessmentIcon}
                            title="Tổng quan"
                            subtitle="Thống kê tổng hợp hệ thống"
                            color="secondary"
                        />
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {/* Biểu đồ tròn: successRate nếu có */}
                            {technicianData.some(d => d.successRate > 0) && (
                                <Box sx={{ width: "100%", height: 260 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Tooltip />
                                            <Legend />
                                            <Pie
                                                data={technicianData.map(d => ({ name: d.name, value: d.successRate }))}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label
                                            >
                                                {technicianData.map((_, idx) => (
                                                    <Cell key={`c-${idx}`} fill={["#1976d2", "#2e7d32", "#d32f2f", "#ed6c02", "#9c27b0"][idx % 5]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                            {/* Hiển thị tất cả fields từ summary nếu có (trừ các fields không cần thiết) */}
                            {summary && typeof summary === 'object' && Object.keys(summary).length > 0 ? (
                                Object.entries(summary)
                                    .filter(([key]) => {
                                        // Bỏ các fields không cần hiển thị (monthlyClaims đã dùng cho chart)
                                        const excludeFields = [
                                            'claimsByStatus',
                                            'claimsByType',
                                            'monthlyClaims', // Đã hiển thị trong biểu đồ đường
                                            'rangeStart',
                                            'rangeEnd',
                                        ];
                                        return !excludeFields.includes(key);
                                    })
                                    .map(([key, value]) => {
                                        // Map field names to Vietnamese labels
                                        const labelMap = {
                                            totalClaims: "Tổng số yêu cầu",
                                            totalReports: "Tổng số báo cáo",
                                            totalWarrantyPay: "Tổng chi trả bởi bảo hành",
                                            totalCustomerPay: "Tổng chi trả bởi khách hàng",
                                            totalParts: "Tổng số phụ tùng",
                                            totalServiceCenters: "Tổng số trung tâm",
                                            totalVehicles: "Tổng số xe",
                                            totalRevenue: "Tổng doanh thu",
                                        };

                                        // Map field names to icons
                                        const iconMap = {
                                            totalClaims: AssignmentIcon,
                                            totalReports: BarChartIcon,
                                            totalWarrantyPay: AttachMoneyIcon,
                                            totalCustomerPay: AttachMoneyIcon,
                                            totalParts: InventoryIcon,
                                            totalServiceCenters: PeopleIcon,
                                            totalVehicles: BarChartIcon,
                                            totalRevenue: AttachMoneyIcon,
                                        };

                                        const Icon = iconMap[key] || BarChartIcon;
                                        const label = labelMap[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

                                        return (
                                            <MetricCard
                                                key={key}
                                                label={label}
                                                value={value}
                                                icon={Icon}
                                                color="secondary"
                                            />
                                        );
                                    })
                            ) : (
                                <Box
                                    sx={{
                                        p: 2,
                                        textAlign: "center",
                                        color: "text.secondary",
                                    }}
                                >
                                    <WarningIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2" fontSize="0.85rem">
                                        Không có dữ liệu tổng quan
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block", mt: 0.5 }} fontSize="0.7rem">
                                        {summary ? `Cấu trúc: ${JSON.stringify(summary)}` : "API không trả về dữ liệu"}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Empty State */}
            {(!performance || Object.keys(performance).length === 0) &&
                (!summary || Object.keys(summary).length === 0) && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            borderRadius: 3,
                            textAlign: "center",
                            border: (t) => `1px dashed ${t.palette.divider}`,
                        }}
                    >
                        <AnalyticsIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Chưa có dữ liệu
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Không có dữ liệu để hiển thị
                        </Typography>
                    </Paper>
                )}
        </Box>
    );
}

