"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    IconButton,
    Divider,
    TextField,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Tooltip,
    Pagination,
} from "@mui/material";
import {
    Visibility,
    CheckCircle,
    Cancel,
    Search,
    Refresh,
} from "@mui/icons-material";
import claimService, { CLAIM_STATUS } from "../../services/claimService";

export default function WarrantyRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const [filterStatus, setFilterStatus] = useState(CLAIM_STATUS.UNDER_REVIEW);
    const [query, setQuery] = useState("");
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // 🟢 Fetch data
    const fetchRequests = async () => {
        try {
            setLoading(true);
            let data = [];
            if (filterStatus === "all") data = await claimService.getAll();
            else data = await claimService.getByStatus(filterStatus);

            const arr = Array.isArray(data) ? data : [data];
            setRequests(arr);
        } catch (err) {
            console.error("Fetch failed:", err);
            setSnack({ open: true, message: "Không thể tải danh sách yêu cầu", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    // 🧠 Lắng nghe thay đổi toàn hệ thống
    useEffect(() => {
        fetchRequests();
        const handleSync = () => fetchRequests();
        window.addEventListener("claim-sync", handleSync);
        return () => window.removeEventListener("claim-sync", handleSync);
    }, [filterStatus]);

    // 🔍 Search VIN
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return fetchRequests();
        try {
            setLoading(true);
            const data = await claimService.getByVin(query.trim());
            setRequests(Array.isArray(data) ? data : [data]);
        } catch (err) {
            console.error("Search failed:", err);
            setSnack({ open: true, message: "Không tìm thấy VIN", severity: "warning" });
        } finally {
            setLoading(false);
        }
    };

    // 🔄 Update status
    const handleUpdateStatus = async (claimId, status) => {
        try {
            const updated = await claimService.updateStatus(claimId, status);
            setRequests((prev) => prev.map((r) => (r.id === claimId ? updated : r)));
            setSnack({ open: true, message: `Đã cập nhật: ${status}`, severity: "success" });

            // 🔁 Đồng bộ toàn bộ hệ thống
            window.dispatchEvent(new CustomEvent("claim-sync"));
        } catch (err) {
            console.error("Update status failed:", err);
            setSnack({ open: true, message: "Không thể cập nhật trạng thái", severity: "error" });
        }
    };

    // 👁️ View claim
    const handleView = async (id) => {
        try {
            setLoading(true);
            const detail = await claimService.getById(id);
            setSelectedClaim(detail);
            setViewOpen(true);
        } catch (err) {
            console.error("Load detail failed:", err);
            setSnack({ open: true, message: "Không thể tải chi tiết", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    // Pagination slice
    const paginated = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return requests.slice(start, start + rowsPerPage);
    }, [requests, page, rowsPerPage]);

    const totals = useMemo(() => {
        const all = requests.length;
        const under = requests.filter((r) => r.status === CLAIM_STATUS.UNDER_REVIEW).length;
        const approved = requests.filter((r) => r.status === CLAIM_STATUS.APPROVED).length;
        const rejected = requests.filter((r) => r.status === CLAIM_STATUS.REJECTED).length;
        return { all, under, approved, rejected };
    }, [requests]);

    if (loading)
        return (
            <Box sx={{ py: 10, textAlign: "center" }}>
                <CircularProgress />
            </Box>
        );

    return (
        <Box sx={{ p: 4 }}>
            {/* Header */}
            <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Warranty Requests
                    </Typography>
                    <Typography color="text.secondary">
                        Phê duyệt hoặc từ chối các đơn bảo hành đang chờ xử lý.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2}>
                    <form onSubmit={handleSearch}>
                        <TextField
                            size="small"
                            placeholder="Tìm theo VIN..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1 }} /> }}
                        />
                    </form>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Trạng thái"
                            onChange={(e) => {
                                setPage(1);
                                setFilterStatus(e.target.value);
                            }}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value={CLAIM_STATUS.UNDER_REVIEW}>Chờ phê duyệt</MenuItem>
                            <MenuItem value={CLAIM_STATUS.APPROVED}>Đã phê duyệt</MenuItem>
                            <MenuItem value={CLAIM_STATUS.REJECTED}>Từ chối</MenuItem>
                            <MenuItem value={CLAIM_STATUS.COMPLETED}>Hoàn tất</MenuItem>
                        </Select>
                    </FormControl>

                    <Tooltip title="Tải lại">
                        <IconButton color="primary" onClick={fetchRequests}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: "Tất cả", value: totals.all, color: "primary" },
                    { label: "Chờ duyệt", value: totals.under, color: "warning" },
                    { label: "Đã duyệt", value: totals.approved, color: "success" },
                    { label: "Từ chối", value: totals.rejected, color: "error" },
                ].map((card, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    {card.label}
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color={`${card.color}.main`}>
                                    {card.value}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Table */}
            <Paper sx={{ borderRadius: 3, boxShadow: 4 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: "action.hover" }}>
                        <TableRow>
                            <TableCell>VIN</TableCell>
                            <TableCell>Tóm tắt lỗi</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell>Odometer</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary">Không có dữ liệu</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell sx={{ fontFamily: "monospace" }}>{r.vin}</TableCell>
                                    <TableCell>{r.summary || "—"}</TableCell>
                                    <TableCell>{new Date(r.errorDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{r.odometerKm}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={r.status}
                                            color={
                                                r.status === CLAIM_STATUS.APPROVED
                                                    ? "success"
                                                    : r.status === CLAIM_STATUS.REJECTED
                                                        ? "error"
                                                        : r.status === CLAIM_STATUS.UNDER_REVIEW
                                                            ? "warning"
                                                            : "default"
                                            }
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Xem chi tiết">
                                            <IconButton color="info" onClick={() => handleView(r.id)}>
                                                <Visibility />
                                            </IconButton>
                                        </Tooltip>

                                        {r.status === CLAIM_STATUS.UNDER_REVIEW && (
                                            <>
                                                <Tooltip title="Phê duyệt">
                                                    <IconButton
                                                        color="success"
                                                        onClick={() => handleUpdateStatus(r.id, CLAIM_STATUS.APPROVED)}
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Từ chối">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleUpdateStatus(r.id, CLAIM_STATUS.REJECTED)}
                                                    >
                                                        <Cancel />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                    <Pagination
                        count={Math.ceil(requests.length / rowsPerPage)}
                        page={page}
                        onChange={(e, value) => setPage(value)}
                        color="primary"
                    />
                </Box>
            </Paper>

            {/* View Dialog */}
            <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Chi tiết đơn bảo hành</DialogTitle>
                <DialogContent dividers>
                    {!selectedClaim ? (
                        <Typography color="text.secondary">Không có dữ liệu</Typography>
                    ) : (
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField label="VIN" value={selectedClaim.vin} fullWidth InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Claim Type"
                                    value={selectedClaim.claimType || "—"}
                                    fullWidth
                                    InputProps={{ readOnly: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Odometer (km)"
                                    value={selectedClaim.odometerKm || 0}
                                    fullWidth
                                    InputProps={{ readOnly: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Error Date"
                                    value={selectedClaim.errorDate ? new Date(selectedClaim.errorDate).toLocaleString() : "—"}
                                    fullWidth
                                    InputProps={{ readOnly: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Summary"
                                    multiline
                                    minRows={3}
                                    value={selectedClaim.summary || ""}
                                    fullWidth
                                    InputProps={{ readOnly: true }}
                                />
                            </Grid>

                            {Array.isArray(selectedClaim.attachmentUrls) &&
                                selectedClaim.attachmentUrls.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2">Đính kèm:</Typography>
                                        <Stack spacing={1}>
                                            {selectedClaim.attachmentUrls.map((url, i) => (
                                                <a
                                                    key={i}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: "0.9rem",
                                                        color: "#1976d2",
                                                        textDecoration: "none",
                                                    }}
                                                >
                                                    📎 {decodeURIComponent(url.split("/").pop())}
                                                </a>
                                            ))}
                                        </Stack>
                                    </Grid>
                                )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewOpen(false)} variant="outlined">
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack({ ...snack, open: false })}
            >
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
