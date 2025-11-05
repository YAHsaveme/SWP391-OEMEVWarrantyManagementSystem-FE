// src/components/evm/ShipmentDetailPage.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
    Box, Paper, Stack, Typography, Chip, TextField, Button,
    CircularProgress, Divider, Table, TableHead, TableRow, TableCell, TableBody,
    Snackbar, Alert, Tooltip, IconButton
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useParams, useSearchParams, useNavigate } from "react-router-dom"; // ← thêm useNavigate
import shipmentService from "../../services/shipmentService";
import centerService from "../../services/centerService";

const prettyTime = (t) => (t ? new Date(t).toLocaleString() : "—");

// === KEY LƯU TRỮ ===
const LAST_SHIPMENT_KEY = "last-viewed-shipment-id";
const PENDING_SHIPMENTS_KEY = "pending-shipments-list"; // Danh sách shipments chưa close

function normalizeShipment(d = {}) {
    const n = {};
    n.id = d.id || d.shipmentId || d.code || d.uuid || d._id || "";
    n.ticketId = d.ticketId || d.ticketID || d.ticket?.id || d.ticket?.ticketId || "";
    n.fromCenterId = d.fromCenterId || d.sourceCenterId || d.sourceCenter?.id || d.fromCenter?.id || null;
    n.toCenterId = d.toCenterId || d.destinationCenterId || d.destCenterId || d.toCenter?.id || d.destinationCenter?.id || null;
    n.fromCenterName = d.fromCenterName || d.sourceCenterName || d.sourceCenter?.name || d.fromCenter?.name || null;
    n.toCenterName = d.toCenterName || d.destinationCenterName || d.destCenterName || d.toCenter?.name || d.destinationCenter?.name || null;
    n.status = d.status || d.shipmentStatus || d.state || null;
    n.trackingNo = d.trackingNo || d.tracking || d.trackingNumber || "";
    n.createdAt = d.createdAt || d.created_at || d.createdDate || d.created_time || null;
    n.dispatchedAt = d.dispatchedAt || d.startTransitAt || null;
    n.receivedAt = d.receivedAt || d.deliveredAt || null;
    n.items = Array.isArray(d.items) ? d.items : Array.isArray(d.shipmentItems) ? d.shipmentItems : [];
    n.items = n.items.map((it) => ({
        partId: it.partId || it.part?.id || it.id,
        partNo: it.partNo || it.part?.partNo,
        partName: it.partName || it.part?.name || it.name,
        quantity: it.quantity || it.qty || it.amount || 0,
        isSerialized:
            it.isSerialized !== undefined
                ? it.isSerialized
                : (it.serialNo || it.serial || it.sn) != null ||
                  (it.partLot && (it.partLot.serialNo || it.partLot.serial))
                ? true
                : it.serialized || it.is_serialized || it.part?.isSerialized || false,
        // SerialNo: cố gắng lấy từ nhiều field khác nhau và cả nested partLot
        serialNo:
            it.serialNo ||
            it.serial ||
            it.sn ||
            it.serialNumber ||
            it.serial_no ||
            it.partLot?.serialNo ||
            it.partLot?.serial ||
            null,
        // BatchNo: tương tự, ưu tiên lot
        batchNo:
            it.batchNo ||
            it.batch ||
            it.lotNo ||
            it.partLot?.batchNo ||
            it.partLot?.lotNo ||
            null,
        // Ngày sản xuất: hỗ trợ nhiều key + lot
        mfgDate:
            it.mfgDate ||
            it.mfg_date ||
            it.manufactureDate ||
            it.mfg ||
            it.partLot?.mfgDate ||
            it.partLot?.manufacturingDate ||
            null,
    }));
    return n;
}

export default function ShipmentDetailPage({ id: idProp }) {
    const { id: idFromParams } = useParams();
    const [searchParams] = useSearchParams(); // ← lấy query ?id=...
    const idFromQuery = searchParams.get("id");
    const navigate = useNavigate();

    // Ưu tiên: idProp → idFromQuery → idFromParams → localStorage
    const rawId = idProp || idFromQuery || idFromParams;
    const [id, setId] = useState(rawId);

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [data, setData] = useState(null);
    const [trackingNo, setTrackingNo] = useState("");
    const [snack, setSnack] = useState({ open: false, sev: "info", msg: "" });
    const [centerMap, setCenterMap] = useState({});
    const [pendingShipments, setPendingShipments] = useState([]); // Danh sách shipments chưa close

    // === KHÔI PHỤC ID TỪ localStorage KHI KHÔNG CÓ TRONG URL ===
    useEffect(() => {
        if (rawId) {
            localStorage.setItem(LAST_SHIPMENT_KEY, rawId);
            setId(rawId);
        } else {
            const saved = localStorage.getItem(LAST_SHIPMENT_KEY);
            if (saved) {
                setId(saved);
            }
        }
    }, [rawId]);

    // === LOAD DANH SÁCH PENDING SHIPMENTS ===
    const loadPendingShipments = async () => {
        try {
            // Load TẤT CẢ shipments từ backend và lọc ra những shipments chưa close
            const allShipments = await shipmentService.getAll();
            const pendingList = [];
            
                if (Array.isArray(allShipments)) {
                    for (const s of allShipments) {
                        const status = s?.status || s?.shipmentStatus || s?.state;
                        // Lọc ra shipments chưa close (REQUESTED, IN_TRANSIT, DELIVERED, DELIVERED_WITH_ISSUE)
                        if (status && !["CLOSED", "COMPLETED"].includes(status.toUpperCase())) {
                            pendingList.push({
                                id: s?.id || s?.shipmentId || s?.uuid || "",
                                status: status,
                                ticketId: s?.ticketId || s?.ticket?.id || "",
                                createdAt: s?.createdAt || s?.created_at || s?.createdDate || "",
                                fromCenterId: s?.fromCenterId || s?.fromCenter?.id || null,
                                toCenterId: s?.toCenterId || s?.toCenter?.id || null,
                                trackingNo: s?.trackingNo || s?.tracking || "",
                            });
                        }
                    }
                }
            
            // Cập nhật localStorage với danh sách hợp lệ
            const validIds = pendingList.map(s => s.id).filter(Boolean);
            localStorage.setItem(PENDING_SHIPMENTS_KEY, JSON.stringify(validIds));
            setPendingShipments(pendingList);
        } catch (e) {
            console.error("Load pending shipments failed:", e);
            // Fallback: thử load từ localStorage nếu backend fail
            try {
                const saved = localStorage.getItem(PENDING_SHIPMENTS_KEY);
                const savedIds = saved ? JSON.parse(saved) : [];
                const validPending = [];
                for (const sid of savedIds) {
                    try {
                        const s = await shipmentService.get(sid);
                        const status = s?.status || s?.shipmentStatus || s?.state;
                        if (status && !["CLOSED", "COMPLETED"].includes(status.toUpperCase())) {
                            validPending.push({
                                id: sid,
                                status: status,
                                ticketId: s?.ticketId || s?.ticket?.id || "",
                                createdAt: s?.createdAt || s?.created_at || "",
                                fromCenterId: s?.fromCenterId || s?.fromCenter?.id || null,
                                toCenterId: s?.toCenterId || s?.toCenter?.id || null,
                                trackingNo: s?.trackingNo || s?.tracking || "",
                            });
                        }
                    } catch (_) {
                        // Ignore nếu không load được
                    }
                }
                setPendingShipments(validPending);
            } catch (fallbackErr) {
                console.error("Fallback load failed:", fallbackErr);
            }
        }
    };

    useEffect(() => {
        loadPendingShipments();
        
        // Listen for events từ bên ngoài (ví dụ: khi SC-STAFF receive)
        const handleShipmentUpdate = () => {
            loadPendingShipments();
            if (id) reload(); // Reload current shipment nếu có
        };
        
        window.addEventListener("shipment-received", handleShipmentUpdate);
        window.addEventListener("shipment-dispatch", handleShipmentUpdate);
        window.addEventListener("shipment-close", handleShipmentUpdate);
        
        return () => {
            window.removeEventListener("shipment-received", handleShipmentUpdate);
            window.removeEventListener("shipment-dispatch", handleShipmentUpdate);
            window.removeEventListener("shipment-close", handleShipmentUpdate);
        };
    }, [id]);

    // === LOAD SHIPMENT ===
    async function reload() {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const raw = await shipmentService.get(id);
            const d = normalizeShipment(raw);
            setData(d);
            setTrackingNo(d.trackingNo || "");
            // Cập nhật lại localStorage (đảm bảo luôn mới nhất)
            localStorage.setItem(LAST_SHIPMENT_KEY, id);
            
            // Thêm vào danh sách pending shipments nếu chưa close
            if (d.status && !["CLOSED", "COMPLETED"].includes(d.status.toUpperCase())) {
                const saved = localStorage.getItem(PENDING_SHIPMENTS_KEY);
                const savedIds = saved ? JSON.parse(saved) : [];
                if (!savedIds.includes(id)) {
                    savedIds.push(id);
                    localStorage.setItem(PENDING_SHIPMENTS_KEY, JSON.stringify(savedIds));
                    // Cập nhật state
                    setPendingShipments(prev => {
                        if (prev.find(s => s.id === id)) return prev;
                        return [...prev, { id, status: d.status, ticketId: d.ticketId, createdAt: d.createdAt }];
                    });
                }
            } else {
                // Xóa khỏi danh sách pending nếu đã close
                const saved = localStorage.getItem(PENDING_SHIPMENTS_KEY);
                const savedIds = saved ? JSON.parse(saved) : [];
                const filtered = savedIds.filter(sid => sid !== id);
                localStorage.setItem(PENDING_SHIPMENTS_KEY, JSON.stringify(filtered));
                setPendingShipments(prev => prev.filter(s => s.id !== id));
            }
        } catch (e) {
            setSnack({
                open: true,
                sev: "error",
                msg: e?.response?.data?.message || e.message || "Load shipment failed",
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        reload();
    }, [id]);

    // === LOAD CENTERS ===
    useEffect(() => {
        (async () => {
            try {
                const centers = await centerService.getAll();
                const map = {};
                (Array.isArray(centers) ? centers : []).forEach((c) => {
                    const cId = c.id || c.centerId;
                    if (cId) map[cId] = c.name || c.centerName || `Center ${cId}`;
                });
                setCenterMap(map);
            } catch (e) {
                console.error("Load centers failed:", e);
            }
        })();
    }, []);

    // === LƯU TRACKING NO THEO SHIPMENT ===
    useEffect(() => {
        if (!id) return;
        const key = `shipment-tracking-${id}`;
        if (!trackingNo) {
            const saved = localStorage.getItem(key);
            if (saved) setTrackingNo(saved);
        }
        const onBeforeUnload = () => {
            try { localStorage.setItem(key, trackingNo || ""); } catch (_) { }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
            try { localStorage.setItem(key, trackingNo || ""); } catch (_) { }
        };
    }, [id, trackingNo]);

    // === STATUS CHIP ===
    const statusChip = (s) => {
        const map = {
            REQUESTED: { color: "warning", label: "REQUESTED" },
            IN_TRANSIT: { color: "info", label: "IN_TRANSIT" },
            DELIVERED: { color: "success", label: "DELIVERED" },
            RECEIVED: { color: "success", label: "RECEIVED" },
            CLOSED: { color: "default", label: "CLOSED" },
            DISPATCHED: { color: "info", label: "IN_TRANSIT" },
            COMPLETED: { color: "default", label: "CLOSED" },
        };
        const m = map[s] || { color: "default", label: s || "—" };
        return <Chip color={m.color} label={m.label} size="small" />;
    };

    const canDispatch = ["REQUESTED"].includes(data?.status);
    // canReceive removed - only sc-staff can receive
    const canClose = ["DELIVERED", "RECEIVED"].includes(data?.status); // Allow close after RECEIVED status

    // === ACTIONS ===
    async function doDispatch() {
        if (!trackingNo.trim()) {
            setSnack({ open: true, sev: "warning", msg: "Vui lòng nhập Tracking No trước khi Dispatch" });
            return;
        }
        setBusy(true);
        try {
            await shipmentService.dispatch(id, trackingNo.trim());
            setSnack({ open: true, sev: "success", msg: "Đã Dispatch (bắt đầu vận chuyển)" });
            await reload();
            await loadPendingShipments(); // Reload pending list
            window.dispatchEvent(new CustomEvent("shipment-dispatch", { detail: { id } }));
        } catch (e) {
            setSnack({ open: true, sev: "error", msg: e?.response?.data?.message || e.message || "Dispatch failed" });
        } finally {
            setBusy(false);
        }
    }


    async function doClose() {
        setBusy(true);
        try {
            await shipmentService.close(id);
            setSnack({ open: true, sev: "success", msg: "Đã Close shipment" });
            await reload();
            await loadPendingShipments(); // Reload pending list để cập nhật
            window.dispatchEvent(new CustomEvent("shipment-close", { detail: { id } }));
        } catch (e) {
            setSnack({ open: true, sev: "error", msg: e?.response?.data?.message || e.message || "Close failed" });
        } finally {
            setBusy(false);
        }
    }

    // === RENDER ===
    if (!id) {
        // Nếu có pending shipments, hiển thị danh sách để chọn
        if (pendingShipments.length > 0) {
            return (
                <Box sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                            Chọn shipment để xem chi tiết:
                        </Typography>
                        <Tooltip title="Tải lại danh sách">
                            <IconButton onClick={loadPendingShipments} size="small">
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Stack spacing={1}>
                        {pendingShipments.map((s) => (
                            <Paper
                                key={s.id}
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.hover" },
                                }}
                                onClick={() => {
                                    // Chỉ update id và reload, không navigate
                                    setId(s.id);
                                    localStorage.setItem(LAST_SHIPMENT_KEY, s.id);
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box sx={{ flex: 1 }}>
                                        <Typography fontWeight={600}>
                                            {s.fromCenterId ? (centerMap[s.fromCenterId] || "Manufacturer") : "Manufacturer"} → {s.toCenterId ? (centerMap[s.toCenterId] || "—") : "—"}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {s.trackingNo ? `Tracking: ${s.trackingNo}` : "Chưa có tracking number"}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {statusChip(s.status)}
                                        <Typography variant="caption" color="text.secondary">
                                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            );
        }
        return (
            <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">
                    Không có shipment nào được chọn. Vui lòng mở từ danh sách.
                </Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">Không tìm thấy shipment #{id}</Typography>
            </Box>
        );
    }

    return (
        <Box p={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700}>
                    Shipment
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Tooltip title="Tải lại">
                        <IconButton onClick={async () => { await reload(); await loadPendingShipments(); }} size="small">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    {statusChip(data.status)}
                </Stack>
            </Stack>
            
            {/* Danh sách shipments chưa close */}
            {pendingShipments.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "action.hover" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Danh sách shipments chưa close ({pendingShipments.length})
                        </Typography>
                        <Tooltip title="Tải lại danh sách">
                            <IconButton onClick={loadPendingShipments} size="small">
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {pendingShipments.map((s) => {
                            // Load center names từ centerMap
                            const fromName = s.fromCenterId ? (centerMap[s.fromCenterId] || "Manufacturer") : "Manufacturer";
                            const toName = s.toCenterId ? (centerMap[s.toCenterId] || "—") : "—";
                            const label = `${fromName} → ${toName}${s.trackingNo ? ` (${s.trackingNo})` : ""}`;
                            
                            return (
                                <Chip
                                    key={s.id}
                                    label={label}
                                    onClick={() => {
                                        // Chỉ update id và reload, không navigate
                                        setId(s.id);
                                        localStorage.setItem(LAST_SHIPMENT_KEY, s.id);
                                    }}
                                    color={s.id === id ? "primary" : "default"}
                                    variant={s.id === id ? "filled" : "outlined"}
                                    size="small"
                                    sx={{ cursor: "pointer" }}
                                />
                            );
                        })}
                    </Stack>
                </Paper>
            )}

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                    <Typography variant="subtitle2">Thông tin chung</Typography>
                    <Divider />
                    {/* Ẩn Ticket ID theo yêu cầu */}
                    <Typography>
                        <b>Source Center:</b>{" "}
                        {data.fromCenterName || centerMap[data.fromCenterId] || (data.fromCenterId ? `Center ${data.fromCenterId}` : "Manufacturer")}
                    </Typography>
                    <Typography>
                        <b>Destination Center:</b>{" "}
                        {data.toCenterName || centerMap[data.toCenterId] || (data.toCenterId ? `Center ${data.toCenterId}` : "—")}
                    </Typography>
                    <Typography><b>Created At:</b> {prettyTime(data.createdAt)}</Typography>
                    {data.dispatchedAt && <Typography><b>Dispatched At:</b> {prettyTime(data.dispatchedAt)}</Typography>}
                    {data.receivedAt && <Typography><b>Received At:</b> {prettyTime(data.receivedAt)}</Typography>}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Danh sách phụ tùng</Typography>
                {(() => { const hasSerialized = (data.items || []).some(it => it.isSerialized); return (
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Part</TableCell>
                            <TableCell align="right">Qty</TableCell>
                            {hasSerialized && <TableCell>Serial No</TableCell>}
                            <TableCell>Batch No</TableCell>
                            <TableCell>Mfg Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.items.map((it, i) => (
                            <TableRow key={i}>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell>{it.partName || it.partNo || it.partId}</TableCell>
                                <TableCell align="right">{it.quantity}</TableCell>
                                {hasSerialized && (
                                    <TableCell>{it.isSerialized ? (it.serialNo || "") : ""}</TableCell>
                                )}
                                <TableCell>{it.batchNo || (it.isSerialized ? "" : (it.batchNo || ""))}</TableCell>
                                <TableCell>{it.mfgDate ? new Date(it.mfgDate).toLocaleDateString() : ""}</TableCell>
                            </TableRow>
                        ))}
                        {data.items.length === 0 && (
                            <TableRow><TableCell colSpan={hasSerialized ? 6 : 5} align="center">Không có item</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                ); })()}

                <Divider sx={{ my: 2 }} />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                    <TextField
                        label="Tracking No"
                        value={trackingNo}
                        onChange={(e) => setTrackingNo(e.target.value)}
                        size="small"
                        disabled={!canDispatch || busy}
                        helperText={canDispatch ? "Nhập mã vận đơn trước khi Dispatch" : ""}
                        sx={{ minWidth: 260 }}
                    />
                    <Tooltip title="Bắt đầu vận chuyển">
                        <span>
                            <Button variant="contained" onClick={doDispatch} disabled={!canDispatch || busy || !trackingNo.trim()}>
                                Dispatch
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Đóng shipment (chỉ sau khi sc-staff đã receive)">
                        <span>
                            <Button color="inherit" variant="contained" onClick={doClose} disabled={!canClose || busy}>
                                Close
                            </Button>
                        </span>
                    </Tooltip>
                </Stack>
            </Paper>

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
            >
                <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}