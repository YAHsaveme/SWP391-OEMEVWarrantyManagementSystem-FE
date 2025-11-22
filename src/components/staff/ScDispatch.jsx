import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Button,
    Chip,
    CircularProgress,
    Snackbar,
    Alert,
    Tooltip,
    IconButton,
} from "@mui/material";
import {
    Refresh as RefreshIcon,
    Send as SendIcon,
} from "@mui/icons-material";
import shipmentService from "../../services/shipmentService";
import centerService from "../../services/centerService";
import axiosInstance from "../../services/axiosInstance";

const statusMeta = {
    REQUESTED: { color: "warning", label: "REQUESTED" },
    IN_TRANSIT: { color: "info", label: "IN_TRANSIT" },
    DELIVERED: { color: "success", label: "DELIVERED" },
    RECEIVED: { color: "success", label: "RECEIVED" },
    CLOSED: { color: "default", label: "CLOSED" },
    COMPLETED: { color: "default", label: "COMPLETED" },
};

const summarizeParts = (items = []) => {
    const names = items
        .map((item) => (
            item?.partName ||
            item?.part?.partName ||
            item?.partNo ||
            item?.part?.partNo ||
            item?.partCode ||
            item?.part?.partCode
        ))
        .filter(Boolean);
    if (names.length === 0) return "Phụ tùng chưa xác định";
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} phụ tùng khác`;
};

const normalizeShipment = (raw = {}) => {
    const id = raw.id || raw.shipmentId || raw.code || raw.uuid || raw._id || "";
    const status = raw.status || raw.shipmentStatus || raw.state || "REQUESTED";
    return {
        id,
        status,
        ticketId: raw.ticketId || raw.ticketID || raw.ticket?.id || "",
        trackingNo: raw.trackingNo || raw.tracking || raw.trackingNumber || "",
        note: raw.note || raw.description || "",
        createdAt: raw.createdAt || raw.created_at || raw.createdDate || null,
        fromCenterId: raw.fromCenterId || raw.sourceCenterId || raw.sourceCenter?.id || raw.fromCenter?.id || null,
        fromCenterName: raw.fromCenterName || raw.sourceCenterName || raw.sourceCenter?.name || raw.fromCenter?.name || null,
        toCenterId: raw.toCenterId || raw.destinationCenterId || raw.destCenterId || raw.toCenter?.id || raw.destinationCenter?.id || null,
        toCenterName: raw.toCenterName || raw.destinationCenterName || raw.destCenterName || raw.toCenter?.name || raw.destinationCenter?.name || null,
        items: Array.isArray(raw.items) ? raw.items : Array.isArray(raw.shipmentItems) ? raw.shipmentItems : [],
        partsSummary: summarizeParts(Array.isArray(raw.items) ? raw.items : Array.isArray(raw.shipmentItems) ? raw.shipmentItems : []),
    };
};

const statusChip = (status) => {
    const meta = statusMeta[status] || { color: "default", label: status || "—" };
    return <Chip color={meta.color} label={meta.label} size="small" />;
};

export default function ScDispatch() {
    const [centerId, setCenterId] = useState("");
    const [centerName, setCenterName] = useState("");
    const [centerMap, setCenterMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [shipments, setShipments] = useState([]);
    const [trackingInput, setTrackingInput] = useState({});
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await axiosInstance.get("/auth/users/me");
                const user = res.data || {};
                if (user.centerId) {
                    setCenterId(String(user.centerId));
                    setCenterName(user.centerName || "");
                } else {
                    setSnack({ open: true, message: "Tài khoản của bạn chưa được gán trung tâm kho.", severity: "warning" });
                    setLoading(false);
                }
            } catch (err) {
                console.error("[ScDispatch] fetchCurrentUser error:", err);
                setSnack({ open: true, message: "Không thể xác định trung tâm của bạn.", severity: "error" });
                setLoading(false);
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const loadCenters = async () => {
            try {
                const res = await centerService.getAll();
                const arr = Array.isArray(res) ? res : res?.data || [];
                const map = {};
                arr.forEach((c) => {
                    const id = c.id || c.centerId;
                    if (id) map[String(id)] = c.name || c.centerName || `Center ${id}`;
                });
                setCenterMap(map);
            } catch (err) {
                console.error("[ScDispatch] loadCenters error:", err);
            }
        };
        loadCenters();
    }, []);

    const loadShipments = async () => {
        if (!centerId) return;
        setLoading(true);
        try {
            const res = await shipmentService.getAll();
            const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : res?.content || [];
            const normalized = rawList.map(normalizeShipment).filter((s) => String(s.fromCenterId || "") === String(centerId));
            setShipments(normalized);
            setTrackingInput((prev) => {
                const next = { ...prev };
                normalized.forEach((s) => {
                    if (s.trackingNo && !next[s.id]) next[s.id] = s.trackingNo;
                });
                return next;
            });
        } catch (err) {
            console.error("[ScDispatch] loadShipments error:", err);
            setSnack({ open: true, message: err?.response?.data?.message || "Không thể tải danh sách shipment", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (centerId) {
            loadShipments();
        }
    }, [centerId]);

    useEffect(() => {
        if (!centerId) return;
        const handler = () => {
            loadShipments();
        };
        window.addEventListener("shipment-dispatch", handler);
        window.addEventListener("shipment-received", handler);
        window.addEventListener("shipment-close", handler);
        return () => {
            window.removeEventListener("shipment-dispatch", handler);
            window.removeEventListener("shipment-received", handler);
            window.removeEventListener("shipment-close", handler);
        };
    }, [centerId]);

    const awaitingDispatch = useMemo(() => shipments.filter((s) => (s.status || "").toUpperCase() === "REQUESTED"), [shipments]);
    const inTransit = useMemo(() => shipments.filter((s) => (s.status || "").toUpperCase() === "IN_TRANSIT"), [shipments]);

    const handleDispatch = async (shipment) => {
        const tracking = (trackingInput[shipment.id] || "").trim();
        if (!tracking) {
            setSnack({ open: true, message: "Vui lòng nhập Tracking No trước khi Dispatch", severity: "warning" });
            return;
        }
        try {
            await shipmentService.dispatch(shipment.id, tracking);
            setSnack({ open: true, message: "Đã dispatch shipment", severity: "success" });
            // Truyền fromCenterId để EVM biết chỉ reload kho nguồn, không reload kho đích
            window.dispatchEvent(new CustomEvent("shipment-dispatch", {
                detail: {
                    id: shipment.id,
                    fromCenterId: shipment.fromCenterId || centerId,
                    toCenterId: shipment.toCenterId
                }
            }));
            await loadShipments();
        } catch (err) {
            setSnack({ open: true, message: err?.response?.data?.message || err.message || "Dispatch thất bại", severity: "error" });
        }
    };

    if (!centerId) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">
                    Đang xác định trung tâm của bạn...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }} elevation={0}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
                    <Stack spacing={0.5}>
                        <Typography variant="h5" fontWeight={700}>
                            Giao hàng (Nguồn: {centerMap[centerId] || centerName || "Center"})
                        </Typography>
                        <Typography color="text.secondary">
                            Xử lý các lô hàng giữa các trung tâm đang chờ điều phối từ trung tâm của bạn.
                        </Typography>
                    </Stack>
                    <Tooltip title="Tải lại">
                        <span>
                            <IconButton onClick={loadShipments} disabled={loading}>
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Chờ điều phối ({awaitingDispatch.length})
                </Typography>
                {loading ? (
                    <Box sx={{ py: 3, textAlign: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : awaitingDispatch.length === 0 ? (
                    <Typography color="text.secondary">Không có lô hàng nào đang chờ điều phối.</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Phụ tùng</TableCell>
                                <TableCell>Đến trung tâm</TableCell>
                                <TableCell align="right">Số phụ tùng</TableCell>
                                <TableCell>Mã vận đơn</TableCell>
                                <TableCell align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {awaitingDispatch.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={600}>{s.partsSummary}</Typography>
                                        {s.note ? (
                                            <Typography variant="caption" color="text.secondary">
                                                Ghi chú: {s.note}
                                            </Typography>
                                        ) : null}
                                    </TableCell>
                                    <TableCell>
                                        {s.toCenterName || centerMap[s.toCenterId] || s.toCenterId || "—"}
                                    </TableCell>
                                    <TableCell align="right">{s.items.length}</TableCell>
                                    <TableCell width="220">
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Nhập mã vận đơn"
                                            value={trackingInput[s.id] ?? s.trackingNo ?? ""}
                                            onChange={(e) => setTrackingInput((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Dispatch">
                                            <span>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    startIcon={<SendIcon />}
                                                    onClick={() => handleDispatch(s)}
                                                >
                                                    Dispatch
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Đang vận chuyển ({inTransit.length})
                </Typography>
                {loading ? (
                    <Box sx={{ py: 3, textAlign: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : inTransit.length === 0 ? (
                    <Typography color="text.secondary">Không có lô hàng nào đang được vận chuyển từ trung tâm của bạn.</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Phụ tùng</TableCell>
                                <TableCell>Đến trung tâm</TableCell>
                                <TableCell>Mã vận đơn</TableCell>
                                <TableCell>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {inTransit.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <Typography fontWeight={600}>{s.partsSummary}</Typography>
                                        {s.note ? (
                                            <Typography variant="caption" color="text.secondary">
                                                Ghi chú: {s.note}
                                            </Typography>
                                        ) : null}
                                    </TableCell>
                                    <TableCell>{s.toCenterName || centerMap[s.toCenterId] || s.toCenterId || "—"}</TableCell>
                                    <TableCell>{s.trackingNo || "—"}</TableCell>
                                    <TableCell>{statusChip(s.status)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
