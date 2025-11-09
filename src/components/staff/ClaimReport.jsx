// src/components/staff/ClaimReport.jsx
// Component cho SC-STAFF: Quản lý Claim Reports
"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    TextField,
    Button,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Snackbar,
    InputAdornment,
    Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
    Assessment as AssessmentIcon,
    Add as AddIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Download as DownloadIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
    AttachMoney as AttachMoneyIcon,
    Description as DescriptionIcon,
    Receipt as ReceiptIcon,
} from "@mui/icons-material";
import claimReportService from "../../services/claimReportService";
import claimService from "../../services/claimService";
import Autocomplete from "@mui/material/Autocomplete";

// Helper function để format giá trị hiển thị
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
        return new Date(dateString).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
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
                        {value}
                    </Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Dialog tạo Report mới
function CreateReportDialog({ open, onClose, onCreate, claims, setSnack }) {
    const [claimId, setClaimId] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!claimId) {
            setSnack({
                open: true,
                message: "Vui lòng chọn claim",
                severity: "error",
            });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                claimId: claimId.trim(),
                note: note.trim() || undefined,
            };
            const created = await claimReportService.create(payload);
            onCreate?.(created);
            setSnack({
                open: true,
                message: "Tạo report thành công",
                severity: "success",
            });
            onClose?.();
            // Reset form
            setClaimId("");
            setNote("");
        } catch (err) {
            console.error("Create report failed:", err);
            const errorData = err.response?.data;
            let message = "Tạo report thất bại, vui lòng thử lại sau!";
            if (errorData) {
                if (typeof errorData === "string") {
                    message = errorData;
                } else if (errorData.message) {
                    message = errorData.message;
                } else if (errorData.error) {
                    message = errorData.error;
                }
            } else if (err.message) {
                message = err.message;
            }
            setSnack({ open: true, message, severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>Tạo Report mới</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={claims}
                                getOptionLabel={(option) =>
                                    `${option.vin || option.id} - ${option.summary?.substring(0, 50) || "No summary"}`
                                }
                                value={claims.find((c) => c.id === claimId) || null}
                                onChange={(_, newValue) => setClaimId(newValue?.id || "")}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Chọn Claim *"
                                        required
                                        placeholder="Tìm kiếm theo VIN hoặc ID"
                                    />
                                )}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Ghi chú"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                fullWidth
                                multiline
                                rows={4}
                                placeholder="Nhập ghi chú (tùy chọn)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" disabled={submitting}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={20} /> : "Tạo Report"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// Dialog xem chi tiết Report
function ViewReportDialog({ open, onClose, report, onUpdate }) {
    if (!report) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Chi tiết Report</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Report ID
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                            {report.id || "—"}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Claim ID
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                            {report.claimId || "—"}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            VIN
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                            {report.vin || "—"}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Ngày tạo
                        </Typography>
                        <Typography variant="body1">{formatDate(report.createdAt)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                            Tóm tắt Claim
                        </Typography>
                        <Typography variant="body1">{report.claimSummary || "—"}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Tổng giá phụ tùng
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight={700}>
                            {formatCurrency(report.partsTotalPrice)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Tổng giá lao động
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight={700}>
                            {formatCurrency(report.laborTotalPrice)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Tổng giá gộp
                        </Typography>
                        <Typography variant="h6" color="success.main" fontWeight={700}>
                            {formatCurrency(report.grossTotalPrice)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Bảo hành trả
                        </Typography>
                        <Typography variant="h6" color="info.main" fontWeight={700}>
                            {formatCurrency(report.warrantyPay)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Khách hàng trả
                        </Typography>
                        <Typography variant="h6" color="warning.main" fontWeight={700}>
                            {formatCurrency(report.customerPay)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Chênh lệch
                        </Typography>
                        <Typography
                            variant="h6"
                            color={report.variance >= 0 ? "success.main" : "error.main"}
                            fontWeight={700}
                        >
                            {formatCurrency(report.variance)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                            Ghi chú
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                            {report.note || "—"}
                        </Typography>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">
                    Đóng
                </Button>
                <Button
                    onClick={() => {
                        onUpdate?.(report);
                        onClose();
                    }}
                    variant="contained"
                    startIcon={<EditIcon />}
                >
                    Cập nhật Ghi chú
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Dialog cập nhật Note
function UpdateNoteDialog({ open, onClose, report, onUpdate, setSnack }) {
    const [note, setNote] = useState(report?.note || "");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (report) {
            setNote(report.note || "");
        }
    }, [report]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!report?.id) return;

        setSubmitting(true);
        try {
            const updated = await claimReportService.update(report.id, { note });
            onUpdate?.(updated);
            setSnack({
                open: true,
                message: "Cập nhật ghi chú thành công",
                severity: "success",
            });
            onClose?.();
        } catch (err) {
            console.error("Update note failed:", err);
            const errorData = err.response?.data;
            let message = "Cập nhật ghi chú thất bại, vui lòng thử lại sau!";
            if (errorData) {
                if (typeof errorData === "string") {
                    message = errorData;
                } else if (errorData.message) {
                    message = errorData.message;
                } else if (errorData.error) {
                    message = errorData.error;
                }
            } else if (err.message) {
                message = err.message;
            }
            setSnack({ open: true, message, severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>Cập nhật Ghi chú</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Report ID: <strong>{report?.id || "—"}</strong>
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Ghi chú"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                fullWidth
                                multiline
                                rows={6}
                                placeholder="Nhập ghi chú"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined" disabled={submitting}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={20} /> : "Cập nhật"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ClaimReport() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reports, setReports] = useState([]);
    const [claims, setClaims] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Dialog states
    const [createOpen, setCreateOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [updateNoteOpen, setUpdateNoteOpen] = useState(false);
    const [activeReport, setActiveReport] = useState(null);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    // Fetch reports và claims
    useEffect(() => {
        let mounted = true;
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const [reportsData, claimsData] = await Promise.all([
                    claimReportService.getAll(),
                    claimService.getAll(),
                ]);
                if (mounted) {
                    setReports(Array.isArray(reportsData) ? reportsData : []);
                    setClaims(Array.isArray(claimsData) ? claimsData : []);
                }
            } catch (err) {
                console.error("Fetch data failed:", err);
                setError("Không thể tải dữ liệu báo cáo");
                if (mounted) {
                    setReports([]);
                    setClaims([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetch();
        return () => {
            mounted = false;
        };
    }, []);

    // Filter reports
    const filteredReports = useMemo(() => {
        let filtered = [...reports];

        // Search by VIN, claimId, or report ID
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.vin?.toLowerCase().includes(query) ||
                    r.claimId?.toLowerCase().includes(query) ||
                    r.id?.toLowerCase().includes(query) ||
                    r.claimSummary?.toLowerCase().includes(query)
            );
        }

        // Filter by date range
        if (dateFrom) {
            filtered = filtered.filter(
                (r) => !r.createdAt || new Date(r.createdAt) >= new Date(dateFrom)
            );
        }
        if (dateTo) {
            filtered = filtered.filter(
                (r) => !r.createdAt || new Date(r.createdAt) <= new Date(dateTo + "T23:59:59")
            );
        }

        return filtered;
    }, [reports, searchQuery, dateFrom, dateTo]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = filteredReports.length;
        const totalPartsPrice = filteredReports.reduce(
            (sum, r) => sum + (Number(r.partsTotalPrice) || 0),
            0
        );
        const totalLaborPrice = filteredReports.reduce(
            (sum, r) => sum + (Number(r.laborTotalPrice) || 0),
            0
        );
        const totalGrossPrice = filteredReports.reduce(
            (sum, r) => sum + (Number(r.grossTotalPrice) || 0),
            0
        );
        const totalWarrantyPay = filteredReports.reduce(
            (sum, r) => sum + (Number(r.warrantyPay) || 0),
            0
        );
        const totalCustomerPay = filteredReports.reduce(
            (sum, r) => sum + (Number(r.customerPay) || 0),
            0
        );

        return {
            total,
            totalPartsPrice,
            totalLaborPrice,
            totalGrossPrice,
            totalWarrantyPay,
            totalCustomerPay,
        };
    }, [filteredReports]);

    const handleCreateReport = (newReport) => {
        setReports((prev) => [newReport, ...prev]);
    };

    const handleViewReport = async (report) => {
        try {
            // Fetch latest data
            const latest = await claimReportService.getById(report.id);
            setActiveReport(latest);
            setViewOpen(true);
        } catch (err) {
            console.error("Fetch report failed:", err);
            setSnack({
                open: true,
                message: "Không thể tải chi tiết report",
                severity: "error",
            });
        }
    };

    const handleUpdateNote = (report) => {
        setActiveReport(report);
        setUpdateNoteOpen(true);
    };

    const handleNoteUpdated = (updated) => {
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        if (activeReport?.id === updated.id) {
            setActiveReport(updated);
        }
    };

    const handleExport = () => {
        const headers = [
            "ID",
            "Claim ID",
            "VIN",
            "Tóm tắt Claim",
            "Tổng giá phụ tùng",
            "Tổng giá lao động",
            "Tổng giá gộp",
            "Bảo hành trả",
            "Khách hàng trả",
            "Chênh lệch",
            "Ngày tạo",
            "Ghi chú",
        ];
        const rows = filteredReports.map((r) => [
            r.id || "",
            r.claimId || "",
            r.vin || "",
            r.claimSummary || "",
            r.partsTotalPrice || 0,
            r.laborTotalPrice || 0,
            r.grossTotalPrice || 0,
            r.warrantyPay || 0,
            r.customerPay || 0,
            r.variance || 0,
            formatDate(r.createdAt),
            (r.note || "").replace(/"/g, '""'),
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${cell}"`).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `claim-reports-${new Date().toISOString().split("T")[0]}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
                <CircularProgress />
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} gutterBottom>
                        Quản lý Claim Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tạo, xem và quản lý báo cáo claims
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                    >
                        Tạo Report
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExport}
                        disabled={filteredReports.length === 0}
                    >
                        Xuất CSV
                    </Button>
                </Stack>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                        label="Tổng số Reports"
                        value={stats.total}
                        icon={ReceiptIcon}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                        label="Tổng giá gộp"
                        value={formatCurrency(stats.totalGrossPrice)}
                        icon={AttachMoneyIcon}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                        label="Bảo hành trả"
                        value={formatCurrency(stats.totalWarrantyPay)}
                        icon={DescriptionIcon}
                        color="info"
                    />
                </Grid>
            </Grid>

            {/* Filters */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <FilterListIcon color="action" />
                        <Typography variant="subtitle1" fontWeight={600}>
                            Bộ lọc
                        </Typography>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Tìm kiếm theo VIN, Claim ID, Report ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Từ ngày"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Đến ngày"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="outlined" size="small" onClick={handleResetFilters}>
                                Đặt lại bộ lọc
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Reports Table */}
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        Danh sách Reports ({filteredReports.length})
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>VIN</TableCell>
                                    <TableCell>Claim ID</TableCell>
                                    <TableCell>Tổng giá gộp</TableCell>
                                    <TableCell>Bảo hành trả</TableCell>
                                    <TableCell>Khách hàng trả</TableCell>
                                    <TableCell>Ngày tạo</TableCell>
                                    <TableCell align="right">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredReports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">Không có report nào</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredReports.map((report) => (
                                        <TableRow key={report.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                                    {report.vin || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                                                    {report.claimId?.substring(0, 8) || "—"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} color="success.main">
                                                    {formatCurrency(report.grossTotalPrice)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="info.main">
                                                    {formatCurrency(report.warrantyPay)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="warning.main">
                                                    {formatCurrency(report.customerPay)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{formatDate(report.createdAt)}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleViewReport(report)}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Cập nhật ghi chú">
                                                        <IconButton
                                                            size="small"
                                                            color="secondary"
                                                            onClick={() => handleUpdateNote(report)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <CreateReportDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={handleCreateReport}
                claims={claims}
                setSnack={setSnack}
            />

            <ViewReportDialog
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                report={activeReport}
                onUpdate={handleUpdateNote}
            />

            <UpdateNoteDialog
                open={updateNoteOpen}
                onClose={() => setUpdateNoteOpen(false)}
                report={activeReport}
                onUpdate={handleNoteUpdated}
                setSnack={setSnack}
            />

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnack({ ...snack, open: false })}
                    severity={snack.severity}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
