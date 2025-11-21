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
    FilterList as FilterListIcon,
    Search as SearchIcon,
    AttachMoney as AttachMoneyIcon,
    Description as DescriptionIcon,
    Receipt as ReceiptIcon,
} from "@mui/icons-material";
import claimReportService from "../../services/claimReportService";
import claimService, { CLAIM_STATUS } from "../../services/claimService";
import Autocomplete from "@mui/material/Autocomplete";
import axiosInstance from "../../services/axiosInstance";
import estimatesService from "../../services/estimatesService";

// Vehicle service — dùng để lấy thông tin khách hàng theo VIN
const vehiclesService = {
    getByVin: async (vin) => {
        if (!vin) return null;
        try {
            const res = await axiosInstance.get(`/vehicles/detail/${encodeURIComponent(vin)}`);
            return res.data;
        } catch (err) {
            console.warn(`Không thể lấy thông tin vehicle cho VIN: ${vin}`, err);
            return null;
        }
    },
};

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
                                getOptionLabel={(option) => {
                                    return option.vin || "—";
                                }}
                                value={claims.find((c) => c.id === claimId) || null}
                                onChange={(_, newValue) => setClaimId(newValue?.id || "")}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Chọn Claim *"
                                        required
                                        placeholder="Tìm kiếm theo VIN"
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
function ViewReportDialog({ open, onClose, report, onUpdate, claimMap = {} }) {
    if (!report) return null;

    const claimInfo = claimMap[report.claimId] || {};
    const [estimateData, setEstimateData] = React.useState(null);
    const [loadingEstimate, setLoadingEstimate] = React.useState(false);

    // Load estimate data when report changes
    React.useEffect(() => {
        if (!open || !report?.claimId) {
            setEstimateData(null);
            return;
        }

        let mounted = true;
        (async () => {
            setLoadingEstimate(true);
            try {
                const estimates = await estimatesService.getByClaim(report.claimId);
                const estimatesArray = Array.isArray(estimates) ? estimates : (estimates ? [estimates] : []);

                if (mounted && estimatesArray.length > 0) {
                    // Get latest estimate (highest version)
                    const latest = estimatesArray.sort((a, b) =>
                        (b.versionNo ?? b.version ?? 0) - (a.versionNo ?? a.version ?? 0)
                    )[0];
                    setEstimateData(latest);
                }
            } catch (err) {
                console.warn("Không thể tải estimate data:", err);
                if (mounted) setEstimateData(null);
            } finally {
                if (mounted) setLoadingEstimate(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [open, report?.claimId]);
    const claimDisplayName = claimInfo.intakeContactName && claimInfo.intakeContactName !== "—"
        ? claimInfo.intakeContactName
        : "—";

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Chi tiết Report</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} sx={{ mt: 1 }}>
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
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                            Claim
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                            {claimDisplayName}
                        </Typography>
                        {claimInfo.summary && claimInfo.summary !== "—" && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                                {claimInfo.summary}
                            </Typography>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                            Tóm tắt Claim
                        </Typography>
                        <Typography variant="body1">{report.claimSummary || claimInfo.summary || "—"}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    {/* ===== Chi tiết từ Estimate ===== */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: "primary.main", mb: 2 }}>
                            Chi tiết từ Estimate
                        </Typography>
                    </Grid>

                    {loadingEstimate ? (
                        <Grid item xs={12}>
                            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        </Grid>
                    ) : !estimateData ? (
                        <Grid item xs={12}>
                            <Alert severity="info">
                                Không tìm thấy estimate cho claim này
                            </Alert>
                        </Grid>
                    ) : (
                        <Grid item xs={12}>
                            <Card variant="outlined" sx={{ bgcolor: "action.hover", mb: 2 }}>
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Version Estimate
                                            </Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                Version {estimateData.versionNo ?? estimateData.version ?? "—"}
                                            </Typography>
                                        </Box>

                                        <Divider />

                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                                                Danh sách phụ tùng
                                            </Typography>
                                            {(() => {
                                                const items = estimateData.items || estimateData.itemsJson || [];
                                                const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

                                                if (!parsedItems || parsedItems.length === 0) {
                                                    return <Typography variant="body2" color="text.secondary">Không có phụ tùng</Typography>;
                                                }

                                                return (
                                                    <Stack spacing={1} sx={{ mt: 1 }}>
                                                        {parsedItems.map((item, idx) => {
                                                            const partName = item.partName || item.part_name || item.name || "—";
                                                            const quantity = item.quantity ?? 0;
                                                            const unitPrice = item.unitPriceVND ?? item.unit_price_vnd ?? 0;
                                                            const total = quantity * unitPrice;

                                                            return (
                                                                <Box
                                                                    key={idx}
                                                                    sx={{
                                                                        p: 1.5,
                                                                        bgcolor: "background.paper",
                                                                        borderRadius: 1,
                                                                        border: "1px solid",
                                                                        borderColor: "divider"
                                                                    }}
                                                                >
                                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                        <Box sx={{ flex: 1 }}>
                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                {partName}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Số lượng: {quantity} × Đơn giá: {formatCurrency(unitPrice)}
                                                                            </Typography>
                                                                        </Box>
                                                                        <Typography variant="body1" fontWeight={700} color="primary.main">
                                                                            {formatCurrency(total)}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Stack>
                                                );
                                            })()}
                                        </Box>

                                        <Divider />

                                        {/* Thông tin nhân công */}
                                        <Box sx={{ p: 1.5, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                                            <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom sx={{ mb: 1.5 }}>
                                                Chi phí nhân công
                                            </Typography>
                                            <Stack spacing={1}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Số giờ công:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {estimateData.laborSlots ?? 0} giờ
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Đơn giá công:
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {formatCurrency(estimateData.laborRateVND ?? 0)}/giờ
                                                    </Typography>
                                                </Stack>
                                                <Divider sx={{ my: 0.5 }} />
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" fontWeight={700}>
                                                        Tổng nhân công:
                                                    </Typography>
                                                    <Typography variant="body1" fontWeight={700} color="primary.main">
                                                        {formatCurrency(estimateData.laborSubtotalVND ?? estimateData.laborSubtotal ?? 0)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Box>

                                        {/* Ghi chú từ Estimate */}
                                        {estimateData.note && (
                                            <Box sx={{ p: 1.5, bgcolor: "info.lighter", borderRadius: 1, border: "1px solid", borderColor: "info.light" }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Ghi chú từ Estimate:
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                                                    {estimateData.note}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Tổng kết từ Estimate */}
                                        <Box sx={{ p: 2, bgcolor: "success.lighter", borderRadius: 1, border: "2px solid", borderColor: "success.main" }}>
                                            <Stack spacing={1}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" fontWeight={600}>
                                                        Tổng phụ tùng (Estimate):
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main">
                                                        {formatCurrency(estimateData.partsSubtotalVND ?? estimateData.partsSubtotal ?? 0)}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" fontWeight={600}>
                                                        Tổng nhân công (Estimate):
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} color="primary.main">
                                                        {formatCurrency(estimateData.laborSubtotalVND ?? estimateData.laborSubtotal ?? 0)}
                                                    </Typography>
                                                </Stack>
                                                <Divider sx={{ my: 1 }} />
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="h6" fontWeight={700} color="success.main">
                                                        Tổng cộng (Estimate):
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={700} color="success.main">
                                                        {formatCurrency(estimateData.grandTotalVND ?? estimateData.grandTotal ?? 0)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* ===== Tổng kết Report ===== */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: "success.main" }}>
                            Tổng kết báo cáo (Đã tính toán từ báo giá)
                        </Typography>
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
    const [claimMap, setClaimMap] = useState({}); // Map claimId -> claim info
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
                    const reportsArray = Array.isArray(reportsData) ? reportsData : [];
                    const claimsArray = Array.isArray(claimsData) ? claimsData : [];

                    // Filter chỉ lấy claims có status là COMPLETED
                    const completedClaims = claimsArray.filter(
                        (claim) => claim.status === CLAIM_STATUS.COMPLETED || claim.status === "COMPLETED"
                    );

                    setReports(reportsArray);
                    setClaims(completedClaims);

                    // Build claim map: claimId -> claim info
                    // Load vehicle info để lấy tên khách hàng
                    // Chỉ map những claim đã được filter (COMPLETED)
                    const map = {};
                    const loadVehiclePromises = completedClaims.map(async (claim) => {
                        if (claim.id && claim.vin) {
                            let intakeContactName = claim.intakeContactName || "—";

                            // Nếu không có intakeContactName trong claim, thử load từ vehicle
                            if (!intakeContactName || intakeContactName === "—") {
                                try {
                                    const vehicle = await vehiclesService.getByVin(claim.vin);
                                    if (vehicle) {
                                        intakeContactName = vehicle.intakeContactName ||
                                            vehicle.intake_contact_name ||
                                            vehicle.customerName ||
                                            vehicle.ownerName ||
                                            "—";
                                    }
                                } catch (err) {
                                    console.warn(`Không thể lấy thông tin vehicle cho VIN: ${claim.vin}`, err);
                                }
                            }

                            map[claim.id] = {
                                vin: claim.vin || "—",
                                summary: claim.summary || "—",
                                intakeContactName: intakeContactName,
                            };
                        }
                    });

                    await Promise.all(loadVehiclePromises);
                    setClaimMap(map);
                }
            } catch (err) {
                console.error("Fetch data failed:", err);
                setError("Không thể tải dữ liệu báo cáo");
                if (mounted) {
                    setReports([]);
                    setClaims([]);
                    setClaimMap({});
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

        // Search by VIN, claim summary, or customer name (not by ID)
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.vin?.toLowerCase().includes(query) ||
                    r.claimSummary?.toLowerCase().includes(query) ||
                    (claimMap[r.claimId]?.intakeContactName?.toLowerCase().includes(query)) ||
                    (claimMap[r.claimId]?.summary?.toLowerCase().includes(query))
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

        // Sort by createdAt (newest first)
        filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Descending order (newest first)
        });

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
                        Quản lý báo cáo yêu cầu bảo hành
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Xem và quản lý báo cáo yêu cầu bảo hành
                    </Typography>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <MetricCard
                        label="Tổng số báo cáo"
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
                                placeholder="Tìm kiếm theo VIN, tên khách hàng, tóm tắt..."
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
                        Danh sách báo cáo ({filteredReports.length})
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>VIN</TableCell>
                                    <TableCell>Khách hàng</TableCell>
                                    <TableCell>Tổng giá</TableCell>
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
                                    filteredReports.map((report) => {
                                        const claimInfo = claimMap[report.claimId] || {};
                                        // Chỉ hiển thị tên khách hàng
                                        const claimDisplay = claimInfo.intakeContactName && claimInfo.intakeContactName !== "—"
                                            ? claimInfo.intakeContactName
                                            : "—";
                                        return (
                                            <TableRow key={report.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                                        {report.vin || "—"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600} color="primary.main">
                                                        {claimDisplay}
                                                    </Typography>
                                                    {claimInfo.summary && claimInfo.summary !== "—" && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                                            {claimInfo.summary.length > 50
                                                                ? `${claimInfo.summary.substring(0, 50)}...`
                                                                : claimInfo.summary}
                                                        </Typography>
                                                    )}
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
                                        );
                                    })
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
                claimMap={claimMap}
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
