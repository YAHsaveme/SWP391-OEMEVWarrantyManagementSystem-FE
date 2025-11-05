// src/components/evm/InventoryMovement.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Container, Paper, Grid, Typography, TextField, Button, Stack,
    Table, TableHead, TableRow, TableCell, TableBody, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip,
    CircularProgress, Snackbar, Divider, MenuItem, Autocomplete
} from "@mui/material";

import {
    Search as SearchIcon,
    Add as AddIcon,
    Undo as UndoIcon,
    Visibility as VisibilityIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material";

import inventoryMovementService from "../../services/inventoryMovementService";
import axiosInstance from "../../services/axiosInstance";

/**
 * InventoryMovement.jsx
 *
 * - Trang quản lý Luân chuyển kho (Inventory Movements)
 * - Tự động load claims/appointments (không hiện ID), load các part liên quan khi chọn claim
 * - Cho phép tạo Service Use (xuất kho) và Return (trả linh kiện)
 * - Hiển thị lịch sử movement (search)
 *
 * NOTE:
 * - Component cố gắng tương thích với nhiều backend route phổ biến:
 *   /api/appointments, /api/appointments/get-all, /api/warranty-claims, /api/warranty-claims/get-all, v.v.
 * - Nếu backend của bạn có endpoint khác, thay URL trong `candidateClaimEndpoints` / `candidatePartsEndpoints`.
 */

// ---------- utility ----------
const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return iso;
    }
};

// try a sequence of endpoints until one returns array-ish data
async function tryFetchList(endpoints = []) {
    for (const e of endpoints) {
        try {
            const res = await axiosInstance.get(e);
            if (!res) continue;
            const data = res.data;
            if (Array.isArray(data) && data.length >= 0) return data;
            // some APIs wrap with { content: [...] } or { data: [...] }
            if (data?.content && Array.isArray(data.content)) return data.content;
            if (data?.data && Array.isArray(data.data)) return data.data;
        } catch (err) {
            // ignore and try next
            // console.debug("tryFetchList failed for", e, err?.message);
        }
    }
    return [];
}

// try a single resource endpoint with id param options
async function tryFetchResourceById(candidates = [], id) {
    for (const c of candidates) {
        try {
            const url = c.replace("{id}", encodeURIComponent(id));
            const res = await axiosInstance.get(url);
            if (!res) continue;
            const data = res.data;
            if (data) return data;
        } catch (err) {
            // ignore
        }
    }
    return null;
}

// ---------- component ----------
export default function InventoryMovement() {
    // UI state
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [claims, setClaims] = useState([]); // each claim: { id, vin, customerName, appointmentId, appointmentAt, ... }
    const [selectedClaim, setSelectedClaim] = useState(null);

    const [loadingParts, setLoadingParts] = useState(false);
    const [parts, setParts] = useState([]); // parts related to selected appointment
    const [selectedParts, setSelectedParts] = useState({}); // partId -> qty to use
    const [selectedPartLotsReturn, setSelectedPartLotsReturn] = useState({}); // partLotId -> qty to return

    const [openDetail, setOpenDetail] = useState(false);
    const [detailMovement, setDetailMovement] = useState(null);

    const [searchParams, setSearchParams] = useState({
        centerId: "",
        appointmentId: "",
        partLotId: "",
        direction: "",
        reason: "",
        page: 0,
        size: 10,
        startDate: "",
        endDate: "",
    });

    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyMeta, setHistoryMeta] = useState({ totalPages: 1, totalElements: 0, number: 0 });

    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
    const [busy, setBusy] = useState(false);

    // Candidate endpoints to find "claims / appointments" list.
    // The component will try each in order until it finds data.
    const candidateClaimEndpoints = [
        "warranty-claims/get-all",
        "warranty-claims",
        "appointments/get-all",
        "appointments",
        "appointments/search",
        "warranty-claims/search",
    ];

    // Candidate endpoints to get parts for appointment/claim
    // try: /api/appointments/{id}/parts, /api/warranty-claims/{id}/parts
    const candidatePartsEndpoints = [
        "appointments/{id}/parts",
        "appointments/{id}/parts/get",
        "warranty-claims/{id}/parts",
        "warranty-claims/{id}/appointment-parts",
        "appointments/{id}/parts/list",
    ];

    // Candidate endpoints to get appointment details (if needed)
    const candidateAppointmentDetailEndpoints = [
        "appointments/{id}/get",
        "warranty-claims/{id}/get",
    ];

    useEffect(() => {
        loadClaims();
        loadHistory(); // initial history
    }, []);

    // ---------- load claims ----------
    async function loadClaims() {
        setLoadingClaims(true);
        try {
            const raw = await tryFetchList(candidateClaimEndpoints);
            // Normalize to a friendly shape:
            const normalized = (raw || []).map((r) => {
                // attempt multiple common fields
                const vin = r.vin || r.vehicleVin || r.vehicle?.vin || r.vehicleVinCode || r.vinCode || r.vehicle?.vinCode;
                const cust = r.customerName || r.customer?.name || r.ownerName || r.customerNameText;
                const appId = r.appointmentId || r.appointment?.id || r.id || r.appointmentIdValue;
                const appAt = r.appointmentAt || r.appointmentDate || r.createdAt || r.appointment?.date;
                const title = [vin, cust, appAt].filter(Boolean).join(" • ");
                return {
                    raw: r,
                    id: r.id || appId,
                    vin: vin || "—",
                    customerName: cust || "—",
                    appointmentId: appId,
                    appointmentAt: appAt,
                    label: title || (r.title || r.name || String(r.id || "").slice(0, 8)),
                };
            });
            setClaims(normalized);
            setSnack({ open: true, message: `Tìm thấy ${normalized.length} appointment/claim`, severity: "success" });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Không thể tải danh sách claim/appointment", severity: "error" });
        } finally {
            setLoadingClaims(false);
        }
    }

    // ---------- load parts for appointment ----------
    async function loadPartsForAppointment(appointmentId) {
        setLoadingParts(true);
        setParts([]);
        setSelectedParts({});
        setSelectedPartLotsReturn({});
        if (!appointmentId) {
            setLoadingParts(false);
            return;
        }
        try {
            // try candidate endpoints
            const raw = await tryFetchResourceById(candidatePartsEndpoints, appointmentId);
            // If tryFetchResourceById returns null, try fetch list endpoints constructed
            let list = [];
            if (Array.isArray(raw)) list = raw;
            else if (raw?.content && Array.isArray(raw.content)) list = raw.content;
            else if (raw?.data && Array.isArray(raw.data)) list = raw.data;
            else if (raw && typeof raw === "object") {
                // maybe endpoint returned appointment object with parts inside
                list = raw.parts || raw.partList || raw.partQuantities || [];
            }

            // Fallback: try an endpoint that returns parts by query
            if (!list.length) {
                try {
                    const res = await axiosInstance.get("/api/parts/get-active");
                    if (Array.isArray(res.data)) {
                        // fallback: keep all active parts but mark qty=0; user can choose
                        list = res.data.map((p) => ({ ...p, availableQuantity: p.quantity ?? 0 }));
                    }
                } catch {
                    // ignore
                }
            }

            // normalize list: ensure fields partId, partNo, partName, availableQuantity, partLots (if any)
            const normalized = (list || []).map((p) => {
                const partId = p.partId || p.id || p.part?.id;
                const partNo = p.partNo || p.part?.partNo || p.code || p.sku;
                const partName = p.partName || p.part?.partName || p.name;
                const availableQuantity = p.availableQuantity ?? p.quantity ?? p.qty ?? 0;
                const partLots = p.partLots || p.lots || p.lotList || [];
                return { partId, partNo, partName, availableQuantity, partLots, raw: p };
            });

            setParts(normalized);
            setSnack({ open: true, message: `Tải ${normalized.length} phụ tùng liên quan`, severity: "success" });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Không thể tải parts cho appointment", severity: "error" });
        } finally {
            setLoadingParts(false);
        }
    }

    // when user selects claim, auto load parts
    useEffect(() => {
        if (selectedClaim?.appointmentId) {
            setSearchParams((s) => ({ ...s, appointmentId: selectedClaim.appointmentId }));
            loadPartsForAppointment(selectedClaim.appointmentId);
            // load history filtered by appointment
            loadHistory({ appointmentId: selectedClaim.appointmentId, page: 0 });
        }
    }, [selectedClaim]);

    // ---------- history (search) ----------
    async function loadHistory(overrides = {}) {
        setHistoryLoading(true);
        try {
            const params = {
                centerId: (overrides.centerId ?? searchParams.centerId) || undefined,
                appointmentId: (overrides.appointmentId ?? searchParams.appointmentId) || undefined,
                partLotId: (overrides.partLotId ?? searchParams.partLotId) || undefined,
                direction: (overrides.direction ?? searchParams.direction) || undefined,
                reason: (overrides.reason ?? searchParams.reason) || undefined,
                startDate: (overrides.startDate ?? searchParams.startDate) || undefined,
                endDate: (overrides.endDate ?? searchParams.endDate) || undefined,
                page: (overrides.page ?? searchParams.page) || 0,
                size: (overrides.size ?? searchParams.size) || 10,
            };
            // remove undefined
            Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
            const res = await inventoryMovementService.search(params);
            const data = res.data;
            if (Array.isArray(data)) {
                setHistory(data);
                setHistoryMeta({ totalPages: 1, totalElements: data.length, number: 0 });
            } else if (data?.content) {
                setHistory(data.content);
                setHistoryMeta({
                    totalPages: data.totalPages ?? 1,
                    totalElements: data.totalElements ?? data.content.length,
                    number: data.number ?? 0,
                });
            } else {
                // single object or unknown
                setHistory(data ? [data] : []);
                setHistoryMeta({ totalPages: 1, totalElements: data ? 1 : 0, number: 0 });
            }
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Lấy lịch sử thất bại", severity: "error" });
        } finally {
            setHistoryLoading(false);
        }
    }

    // ---------- actions: service use & return ----------
    async function doServiceUse() {
        // gather payload using selectedParts
        const appointmentId = selectedClaim?.appointmentId;
        if (!appointmentId) {
            setSnack({ open: true, message: "Vui lòng chọn 1 cuộc hẹn/claim trước", severity: "warning" });
            return;
        }
        const partQuantities = [];
        for (const p of parts) {
            const q = Number(selectedParts[p.partId] || 0);
            if (q > 0) {
                partQuantities.push({ partId: p.partId, quantity: q });
            }
        }
        if (!partQuantities.length) {
            setSnack({ open: true, message: "Chọn ít nhất 1 linh kiện và số lượng > 0", severity: "warning" });
            return;
        }
        setBusy(true);
        try {
            const payload = { appointmentId, partQuantities, note: `ServiceUse từ appointment (${selectedClaim.label})` };
            await inventoryMovementService.serviceUse(payload);
            setSnack({ open: true, message: "Xuất kho thành công", severity: "success" });
            // refresh parts & history
            loadPartsForAppointment(appointmentId);
            loadHistory({ appointmentId, page: 0 });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: err?.response?.data?.message || "Tạo service-use thất bại", severity: "error" });
        } finally {
            setBusy(false);
        }
    }

    async function doReturn() {
        const appointmentId = selectedClaim?.appointmentId;
        if (!appointmentId) {
            setSnack({ open: true, message: "Vui lòng chọn 1 cuộc hẹn/claim trước", severity: "warning" });
            return;
        }
        const partLotQuantities = [];
        // selectedPartLotsReturn: { partLotId: qty }
        Object.entries(selectedPartLotsReturn).forEach(([lotId, qty]) => {
            const qn = Number(qty || 0);
            if (qn > 0) partLotQuantities.push({ partLotId: lotId, quantity: qn });
        });
        if (!partLotQuantities.length) {
            setSnack({ open: true, message: "Chọn ít nhất 1 lot để trả (qty > 0)", severity: "warning" });
            return;
        }
        setBusy(true);
        try {
            const payload = { appointmentId, partLotQuantities, note: `Return từ appointment (${selectedClaim.label})` };
            await inventoryMovementService.returnParts(payload);
            setSnack({ open: true, message: "Trả linh kiện thành công", severity: "success" });
            loadPartsForAppointment(appointmentId);
            loadHistory({ appointmentId, page: 0 });
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: err?.response?.data?.message || "Tạo return thất bại", severity: "error" });
        } finally {
            setBusy(false);
        }
    }

    // ---------- for detail view ----------
    async function openMovementDetail(id) {
        setOpenDetail(true);
        setDetailMovement(null);
        try {
            const res = await inventoryMovementService.getById(id);
            setDetailMovement(res.data);
        } catch (err) {
            console.error(err);
            setSnack({ open: true, message: "Không lấy được chi tiết", severity: "error" });
        }
    }

    // ---------- computed ----------
    const totalPartsSelected = useMemo(() => {
        return Object.values(selectedParts).reduce((s, v) => s + (Number(v) || 0), 0);
    }, [selectedParts]);

    const totalReturnQty = useMemo(() => {
        return Object.values(selectedPartLotsReturn).reduce((s, v) => s + (Number(v) || 0), 0);
    }, [selectedPartLotsReturn]);

    // ---------- render ----------
    return (
        <Container maxWidth="lg" sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" fontWeight={700}>Luân chuyển kho</Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadClaims(); if (selectedClaim?.appointmentId) loadPartsForAppointment(selectedClaim.appointmentId); }}>
                                Tải lại
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => {
                                // open create service use dialog: we'll rely on parts table inputs (no separate dialog)
                                if (!selectedClaim) return setSnack({ open: true, message: "Chọn claim trước", severity: "warning" });
                                // scroll to parts? no-op
                                setSnack({ open: true, message: "Chọn linh kiện rồi nhấn 'Tạo Xuất kho'", severity: "info" });
                            }}>
                                Xuất kho
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Claim selector */}
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Autocomplete
                            options={claims}
                            getOptionLabel={(opt) => opt.label || opt.vin || opt.customerName || ""}
                            loading={loadingClaims}
                            value={selectedClaim}
                            onChange={(e, v) => setSelectedClaim(v)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Chọn claim / appointment"
                                    placeholder={loadingClaims ? "Đang tải..." : "Chọn cuộc hẹn (VIN • Chủ xe • Ngày)"}
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <SearchIcon fontSize="small" style={{ marginRight: 8 }} />
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                startIcon={<UndoIcon />}
                                onClick={() => {
                                    setSelectedClaim(null);
                                    setParts([]);
                                    setSelectedParts({});
                                    setSelectedPartLotsReturn({});
                                    setSearchParams((s) => ({ ...s, appointmentId: "" }));
                                }}
                            >
                                Bỏ chọn
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* Parts panel */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Linh kiện thuộc cuộc hẹn</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Nhập số lượng cần xuất cho mỗi linh kiện.
                        </Typography>

                        {loadingParts ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>
                        ) : parts.length === 0 ? (
                            <Box p={2}><Typography color="text.secondary">Không tìm thấy linh kiện cho cuộc hẹn này.</Typography></Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Part No</TableCell>
                                        <TableCell>Tên linh kiện</TableCell>
                                        <TableCell>Sẵn có</TableCell>
                                        <TableCell>Xuất (qty)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parts.map((p) => (
                                        <TableRow key={p.partId || p.partNo || p.partName}>
                                            <TableCell>{p.partNo || "—"}</TableCell>
                                            <TableCell>{p.partName || "—"}</TableCell>
                                            <TableCell>{p.availableQuantity ?? 0}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    inputProps={{ min: 0 }}
                                                    value={selectedParts[p.partId] ?? 0}
                                                    onChange={(e) => {
                                                        const v = Number(e.target.value || 0);
                                                        setSelectedParts((s) => ({ ...s, [p.partId]: v }));
                                                    }}
                                                    sx={{ width: 100 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                            <Typography variant="body2">Tổng SL xuất: <b>{totalPartsSelected}</b></Typography>
                            <Button variant="contained" onClick={doServiceUse} disabled={busy || totalPartsSelected === 0}>
                                {busy ? <CircularProgress size={18} /> : "Tạo Xuất kho"}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Return panel (use partLots from parts) */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Trả linh kiện (Return)</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Chọn các lot hợp lệ để trả
                        </Typography>

                        {loadingParts ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>
                        ) : parts.length === 0 ? (
                            <Box p={2}><Typography color="text.secondary">Không có lot để trả.</Typography></Box>
                        ) : (
                            <Box>
                                {parts.map((p) => (
                                    <Box key={p.partId || p.partNo} sx={{ mb: 1, borderBottom: "1px dashed #eee", pb: 1 }}>
                                        <Typography variant="subtitle2">{p.partNo || "—"} — {p.partName || "—"}</Typography>

                                        {(p.partLots?.length || 0) > 0 ? (
                                            p.partLots.map((lot) => {
                                                const lotId = lot.partLotId || lot.id || lot.partLotId || `${p.partId}_lot_${lot.partLotSerialNo || lot.partLotBatchNo || Math.random()}`;
                                                return (
                                                    <Grid container spacing={1} alignItems="center" key={lotId} sx={{ mt: 0.5 }}>
                                                        <Grid item xs={5}>
                                                            <Typography variant="body2">{lot.partLotSerialNo || lot.partLotBatchNo || "—"}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{fmtDate(lot.mfgDate)}</Typography>
                                                        </Grid>
                                                        <Grid item xs={3}><Typography>{lot.quantity ?? 0}</Typography></Grid>
                                                        <Grid item xs={4}>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                inputProps={{ min: 0 }}
                                                                value={selectedPartLotsReturn[lotId] ?? 0}
                                                                onChange={(e) => {
                                                                    const v = Number(e.target.value || 0);
                                                                    setSelectedPartLotsReturn((s) => ({ ...s, [lotId]: v }));
                                                                }}
                                                                sx={{ width: 110 }}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                );
                                            })
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">Không có lot cho part này.</Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        )}

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                            <Typography variant="body2">Tổng SL trả: <b>{totalReturnQty}</b></Typography>
                            <Button variant="contained" color="secondary" onClick={doReturn} disabled={busy || totalReturnQty === 0}>
                                {busy ? <CircularProgress size={18} /> : "Tạo Return"}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* History */}
            <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Lịch sử nhập - xuất kho</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Hiển thị lịch sử liên quan. Có thể lọc theo direction / reason / khoảng thời gian.
                </Typography>

                <Divider sx={{ mb: 1 }} />

                <Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Center</TableCell>
                                <TableCell>Appointment</TableCell>
                                <TableCell>Part</TableCell>
                                <TableCell>Direction</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Số lượng</TableCell>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Ghi chú</TableCell>
                                <TableCell>Chi tiết</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {historyLoading ? (
                                <TableRow><TableCell colSpan={9}><Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box></TableCell></TableRow>
                            ) : history.length === 0 ? (
                                <TableRow><TableCell colSpan={9}><Typography color="text.secondary" sx={{ p: 2 }}>Không có lịch sử</Typography></TableCell></TableRow>
                            ) : (
                                history.map((h) => (
                                    <TableRow key={h.id || `${h.partId}_${Math.random()}`}>
                                        <TableCell>{h.centerName || h.centerId || "—"}</TableCell>
                                        <TableCell>{h.appointmentNote || h.appointmentId ? (h.appointmentNote || "Cuộc hẹn") : "—"}</TableCell>
                                        <TableCell>{h.partName || h.partNo || h.partId || "—"}</TableCell>
                                        <TableCell><Chip label={h.direction || "—"} size="small" /></TableCell>
                                        <TableCell>{h.reason || "—"}</TableCell>
                                        <TableCell>{h.totalQuantity ?? (h.partLots?.reduce((s, pl) => s + (pl.quantity || 0), 0) ?? "—")}</TableCell>
                                        <TableCell>{fmtDate(h.movedAt)}</TableCell>
                                        <TableCell>{h.note || "—"}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => openMovementDetail(h.id)}>
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            {/* Movement detail dialog */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
                <DialogTitle>Chi tiết di chuyển kho</DialogTitle>
                <DialogContent dividers>
                    {detailMovement ? (
                        <Box>
                            <Typography variant="subtitle2">Center: {detailMovement.centerName || detailMovement.centerId}</Typography>
                            <Typography variant="subtitle2">Appointment note: {detailMovement.appointmentNote || "—"}</Typography>
                            <Typography variant="subtitle2">Part: {detailMovement.partName || detailMovement.partNo || "—"}</Typography>
                            <Typography variant="body2">Lý do: {detailMovement.reason}</Typography>
                            <Typography variant="body2">Direction: {detailMovement.direction}</Typography>
                            <Typography variant="body2">Tổng: {detailMovement.totalQuantity}</Typography>
                            <Typography variant="body2">Thời gian: {fmtDate(detailMovement.movedAt)}</Typography>

                            <Divider sx={{ my: 1 }} />

                            <Typography variant="subtitle2">Part lots</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Serial</TableCell>
                                        <TableCell>Batch</TableCell>
                                        <TableCell>Ngày SX</TableCell>
                                        <TableCell>Số lượng</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(detailMovement.partLots || []).map((l) => (
                                        <TableRow key={l.partLotId || l.partLotSerialNo || Math.random()}>
                                            <TableCell>{l.partLotSerialNo || "—"}</TableCell>
                                            <TableCell>{l.partLotBatchNo || "—"}</TableCell>
                                            <TableCell>{fmtDate(l.mfgDate)}</TableCell>
                                            <TableCell>{l.quantity ?? 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                message={snack.message}
            />
        </Container>
    );
}