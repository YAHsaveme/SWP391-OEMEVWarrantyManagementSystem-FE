import React, { useMemo, useState, useEffect } from "react";
import {
    Box, Grid, Card, CardContent, Typography, TextField,
    Button, Stack, Paper, InputAdornment, FormControl, Select, MenuItem,
    IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
    DialogActions, Chip, Badge, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import staffInventory from "../../services/staffInventoryFacade";
import authService from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";

/* ===== Helpers ===== */
const noSelect = { userSelect: "none", cursor: "default" };

// Bỏ dấu tiếng Việt
const ascii = (s = "") =>
    s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D");

// Chuẩn hoá chuỗi để search
const normSearch = (s = "") =>
    ascii(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

function getCenterIdFromToken() {
    const raw =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");
    if (!raw) return null;
    try {
        const payload = JSON.parse(atob(raw.split(".")[1]));
        return payload.centerId || payload.centerid || null;
    } catch {
        return null;
    }
}

function normalizePart(row = {}, fallbackCenterName = "Trung tâm") {
    const n = { ...row };
    n.partId = row.partId ?? row.uuid ?? row.id ?? null;
    n.partNo = row.partNo ?? row.code ?? "";
    n.partName = row.partName ?? row.name ?? "";
    n.centerId = row.centerId ?? row.center?.id ?? null;
    n.centerName = row.centerName ?? row.center?.name ?? fallbackCenterName;
    n.minQty = Number(row.minQty ?? 0);
    n.maxQty = Number(row.maxQty ?? 0);
    n.quantity = Number(row.quantity ?? 0);
    n.remainingToMax = Math.max(0, n.maxQty - n.quantity);
    n.isShort = n.quantity < n.minQty;
    return n;
}

const unwrap = (x) =>
    Array.isArray(x) ? x
        : Array.isArray(x?.data) ? x.data
            : Array.isArray(x?.items) ? x.items
                : Array.isArray(x?.content) ? x.content
                    : Array.isArray(x?.results) ? x.results : [];

/* ===== Component ===== */
export default function Inventory() {
    const [centerId, setCenterId] = useState(() => getCenterIdFromToken());
    const [centerName, setCenterName] = useState("");

    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [kw, setKw] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [cart, setCart] = useState([]);
    const [sending, setSending] = useState(false);

    const [shipOpen, setShipOpen] = useState(false);
    const [shipLoading, setShipLoading] = useState(false);
    const [shipRows, setShipRows] = useState([]);

    // === LẤY centerId từ /me nếu token không có ===
    useEffect(() => {
        if (centerId) return;
        (async () => {
            try {
                const me = await authService.getCurrentUser();
                const cid = me?.centerId || me?.centerid || null;
                if (cid) setCenterId(cid);
                else setMsg("Không tìm thấy trung tâm. Vui lòng đăng nhập lại.");
            } catch {
                setMsg("Không lấy được thông tin người dùng (/me).");
            }
        })();
    }, [centerId]);

    // === LOAD INVENTORY (luôn dùng no-cache) ===
    const load = async () => {
        if (!centerId) return setMsg("Chưa xác định trung tâm."); // ← giữ nguyên
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/inventory-parts/${centerId}/list-by-center`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            const raw = unwrap(res);
            const onlyMine = raw.filter(
                (r) => String(r.centerId ?? r.center?.id) === String(centerId)
            );
            const fb = onlyMine[0]?.centerName || "Trung tâm";
            const norm = onlyMine.map((r) => normalizePart(r, fb));
            setParts(norm);
            setCenterName(norm[0]?.centerName || fb);
        } catch (e) {
            console.error(e);
            setParts([]);
            setMsg("Tải dữ liệu thất bại.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (centerId) load();
    }, [centerId]);

    // === LOAD SHIPMENTS ===
    async function loadShipments() {
        if (!centerId) return;
        setShipLoading(true);
        try {
            const resp = await axiosInstance.get("shipments/get-all");
            const arr = unwrap(resp);
            const mine = arr.filter((s) => {
                const toId =
                    s?.toCenterId ??
                    s?.destinationCenterId ??
                    s?.destinationCenter?.id ??
                    s?.toCenter?.id ??
                    s?.destination?.id;
                return String(toId) === String(centerId);
            });
            
            // Sort: IN_TRANSIT → DELIVERED/RECEIVED → CLOSED/COMPLETED, sau đó mới nhất trước
            const statusOrder = { "IN_TRANSIT": 1, "DELIVERED": 2, "RECEIVED": 2, "REQUESTED": 3, "CLOSED": 4, "COMPLETED": 4 };
            mine.sort((a, b) => {
                const statusA = statusOrder[a?.status] || 99;
                const statusB = statusOrder[b?.status] || 99;
                if (statusA !== statusB) return statusA - statusB;
                // Nếu cùng status, sort theo createdAt (mới nhất trước)
                const dateA = new Date(a?.createdAt || a?.created_at || 0).getTime();
                const dateB = new Date(b?.createdAt || b?.created_at || 0).getTime();
                return dateB - dateA;
            });
            
            setShipRows(mine);
        } catch {
            setMsg("Tải shipments thất bại.");
        } finally {
            setShipLoading(false);
        }
    }

    useEffect(() => {
        if (shipOpen) loadShipments();
    }, [shipOpen, centerId]);

    // Listen for shipment-close event từ EVM
    useEffect(() => {
        const handleShipmentClose = () => {
            // Reload shipments khi EVM close shipment (kể cả khi dialog đóng, sẽ reload khi mở lại)
            // Reload ngay lập tức nếu dialog đang mở
            if (shipOpen) {
                loadShipments();
            }
            // Nếu dialog đóng, khi mở lại sẽ tự động reload (useEffect [shipOpen])
        };
        
        window.addEventListener("shipment-close", handleShipmentClose);
        return () => {
            window.removeEventListener("shipment-close", handleShipmentClose);
        };
    }, [shipOpen]);

    // === HANDLE RECEIVE – QUAN TRỌNG NHẤT ===
    async function handleReceive(id) {
        try {
            await axiosInstance.post(`shipments/${id}/receive`);
            setMsg("Đã nhận hàng vào kho.");

            // Dispatch event để notify EVM
            window.dispatchEvent(new CustomEvent("shipment-received", {
                detail: { shipmentId: id, centerId: centerId }
            }));

            // Refetch shipments
            await loadShipments();

            // Refetch inventory với no-cache → cập nhật tồn kho ngay
            const invRes = await axiosInstance.get(`/inventory-parts/${centerId}/list-by-center`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            const raw = unwrap(invRes);
            const onlyMine = raw.filter(
                (r) => String(r.centerId ?? r.center?.id) === String(centerId)
            );
            const fb = onlyMine[0]?.centerName || centerName || "Trung tâm";
            const norm = onlyMine.map((r) => normalizePart(r, fb));

            setParts(norm);
            setCenterName(norm[0]?.centerName || fb);

        } catch (e) {
            const m = e?.response?.data?.message || "Receive thất bại";
            setMsg(`Lỗi: ${m}`);
        }
    }

    async function handleClose(id) {
        try {
            await axiosInstance.post(`shipments/${id}/close`);
            setMsg("Đã close shipment.");
            await loadShipments();
        } catch (e) {
            setMsg(e?.response?.data?.message || "Close thất bại");
        }
    }

    // === FILTER & SEARCH ===
    const filtered = useMemo(() => {
        let arr = parts;
        const q = normSearch(kw);
        if (q) {
            const tokens = q.split(" ");
            arr = arr.filter((p) => {
                const name = normSearch(p.partName || "");
                const code = normSearch(p.partNo || "");
                const qty = String(p.quantity || 0);
                const inText = tokens.every(t => name.includes(t)) || tokens.every(t => code.includes(t));
                const inQty = qty.includes(q.replace(/\s+/g, ""));
                return inText || inQty;
            });
        }
        if (statusFilter === "shortage") arr = arr.filter(p => p.isShort);
        else if (statusFilter === "enough") arr = arr.filter(p => !p.isShort);
        return [...arr].sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
    }, [parts, kw, statusFilter]);

    // === CART LOGIC ===
    const addToCart = (p) => {
        const cap = Number(p.remainingToMax ?? 0);
        const suggest = Math.max(1, cap || 1);
        setCart(prev => {
            const exists = prev.find(it => it.partId === p.partId);
            if (exists) {
                return prev.map(it =>
                    it.partId === p.partId
                        ? { ...it, qty: cap ? Math.min((it.qty || 0) + suggest, cap) : (it.qty || 0) + suggest }
                        : it
                );
            }
            return [...prev, { partId: p.partId, partNo: p.partNo, partName: p.partName, maxAllowed: cap, qty: suggest }];
        });
    };

    const removeFromCart = (partId) => setCart(prev => prev.filter(it => it.partId !== partId));

    const updateQty = (partId, val) => {
        const digits = String(val).replace(/[^\d]/g, "");
        const num = digits === "" ? 0 : parseInt(digits, 10);
        setCart(prev => prev.map(it => {
            if (it.partId !== partId) return it;
            const cap = Math.max(0, Number(it.maxAllowed || 0));
            const safe = cap ? Math.min(Math.max(num, 0), cap) : Math.max(num, 0);
            return { ...it, qty: safe };
        }));
    };

    const canSend = cart.length > 0 && cart.every(it => (it.qty || 0) > 0);

    const sendTicket = async () => {
        if (!centerId) return setMsg("Chưa xác định trung tâm.");
        if (!canSend) return setMsg("Vui lòng nhập quantity hợp lệ.");
        setSending(true);
        try {
            const items = cart.map(it => ({ partId: String(it.partId), quantity: Number(it.qty) }));
            await staffInventory.createReplenishTicket(centerId, items);
            setMsg("Đã tạo ticket bổ sung.");
            setCart([]);
            await load(); // refresh lại sau khi gửi
        } catch (e) {
            const m = e?.response?.data?.message || e?.message || "Gửi ticket thất bại";
            setMsg(`Lỗi: ${m}`);
        } finally {
            setSending(false);
        }
    };

    // === RENDER ===
    return (
        <Box>
            <Grid container spacing={2}>
                {/* LEFT: LIST */}
                <Grid item xs={12} md={7}>
                    <Card>
                        <CardContent sx={noSelect}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                <TextField
                                    placeholder="Tìm kiếm phụ tùng"
                                    value={kw}
                                    onChange={(e) => setKw(e.target.value)}
                                    size="small"
                                    sx={{ width: 320 }}
                                    autoComplete="off"
                                    type="search"
                                    spellCheck={false}
                                    inputProps={{
                                        autoComplete: "off",
                                        autoCorrect: "off",
                                        autoCapitalize: "none",
                                        name: "inventory-search",
                                        id: "inventory-search",
                                    }}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                    }}
                                />
                                <Stack direction="row" spacing={1}>
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                            <MenuItem value="all">Tất cả</MenuItem>
                                            <MenuItem value="shortage">Thiếu hàng</MenuItem>
                                            <MenuItem value="enough">Đủ hàng</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Button size="small" variant="outlined" onClick={() => setShipOpen(true)}>
                                        <Badge color="warning" overlap="circular" badgeContent={shipRows.filter(s => s.status === "IN_TRANSIT").length || 0}>
                                            Incoming Shipments
                                        </Badge>
                                    </Button>
                                </Stack>
                            </Stack>

                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block", ...noSelect }}>
                                Inventory: Phụ tùng của Center — {centerName || "?"}
                            </Typography>

                            <Stack spacing={1.2}>
                                {loading && <Typography sx={noSelect}>Đang tải...</Typography>}
                                {!loading && filtered.map(p => (
                                    <Paper key={p.partId} variant="outlined" sx={{ p: 1, borderRadius: 2, bgcolor: p.isShort ? "rgba(255,0,0,0.05)" : "inherit", ...noSelect }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Box sx={{ flex: 1, minWidth: 0, ...noSelect }}>
                                                <Typography sx={{ fontWeight: 600, lineHeight: 1.2, ...noSelect }}>{p.partName}</Typography>
                                                <Typography variant="caption" color={p.isShort ? "error.main" : "text.secondary"} sx={noSelect}>
                                                    Tối đa: {p.maxQty} — {p.isShort ? "Thiếu" : "Đủ"}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ width: 70, textAlign: "right", fontWeight: 600, ...noSelect }}>{p.quantity}</Typography>
                                            <IconButton
                                                color="primary" size="small"
                                                onClick={() => addToCart(p)}
                                                disabled={Number(p.remainingToMax ?? 0) <= 0}
                                                title={Number(p.remainingToMax ?? 0) > 0 ? "Thêm vào ticket" : "Đã đạt max"}
                                            >
                                                <AddIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Paper>
                                ))}
                                {!loading && filtered.length === 0 && <Typography color="text.secondary" sx={noSelect}>Không có dữ liệu.</Typography>}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* RIGHT: TICKET */}
                <Grid item xs={12} md={5}>
                    <Card>
                        <CardContent>
                            <Typography align="center" sx={{ fontWeight: 700, mb: 1, ...noSelect }}>Ticket</Typography>
                            <Stack spacing={1.2}>
                                {cart.map(it => (
                                    <Paper key={it.partId} variant="outlined" sx={{ p: 1, borderRadius: 2, ...noSelect }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Box sx={{ flex: 1, minWidth: 0, ...noSelect }}>
                                                <Typography sx={{ fontWeight: 600, lineHeight: 1.2, ...noSelect }}>
                                                    {it.partName} {it.partNo ? `• ${it.partNo}` : ""}
                                                </Typography>
                                                {Number(it.maxAllowed || 0) > 0 && (
                                                    <Typography variant="caption" color="text.secondary" sx={noSelect}>
                                                        Có thể bổ sung ≤ {it.maxAllowed}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <TextField
                                                size="small" value={it.qty} onChange={(e) => updateQty(it.partId, e.target.value)}
                                                sx={{ width: 110 }} label="Quantity" inputProps={{ inputMode: "numeric" }}
                                            />
                                            <IconButton size="small" color="error" onClick={() => removeFromCart(it.partId)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Paper>
                                ))}
                                {cart.length === 0 && <Typography color="text.secondary" align="center" sx={noSelect}>Chưa chọn part nào</Typography>}
                            </Stack>
                            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                                <Button variant="contained" fullWidth disabled={!canSend || sending} onClick={sendTicket}>
                                    {sending ? "Đang gửi..." : "Gửi ticket"}
                                </Button>
                                <Button fullWidth variant="outlined" disabled={cart.length === 0} onClick={() => setCart([])}>
                                    Xoá hết
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* DIALOG: INCOMING SHIPMENTS */}
            <Dialog open={shipOpen} onClose={() => setShipOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Incoming Shipments</DialogTitle>
                <DialogContent dividers>
                    {shipLoading ? (
                        <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} /></Stack>
                    ) : shipRows.length === 0 ? (
                        <Typography color="text.secondary">Không có shipment đang về.</Typography>
                    ) : (
                        <Stack spacing={1}>
                            {shipRows.map(s => (
                                <Paper 
                                    key={s.id} 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2, 
                                        borderRadius: 1,
                                        "&:hover": { bgcolor: "action.hover" }
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                Từ: {s.sourceCenter?.name || s.fromCenter?.name || "Manufacturer"}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {s.trackingNo ? `Tracking: ${s.trackingNo}` : "Chưa có tracking number"}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {/* Chỉ hiển thị status chip nếu không phải CLOSED/COMPLETED */}
                                            {s.status !== "CLOSED" && s.status !== "COMPLETED" && (
                                                <Chip size="small" label={s.status}
                                                    color={
                                                        s.status === "IN_TRANSIT" ? "warning" : 
                                                        s.status === "RECEIVED" || s.status === "DELIVERED" ? "success" : 
                                                        "default"
                                                    }
                                                />
                                            )}
                                            {s.status === "IN_TRANSIT" && (
                                                <Button size="small" variant="contained" onClick={() => handleReceive(s.id)}>Receive</Button>
                                            )}
                                            {(s.status === "CLOSED" || s.status === "COMPLETED") && (
                                                <Chip size="small" label="Hoàn thành" color="success" />
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                {s.createdAt || s.created_at ? new Date(s.createdAt || s.created_at).toLocaleDateString() : ""}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setShipOpen(false)}>Đóng</Button></DialogActions>
            </Dialog>

            <Snackbar open={!!msg} autoHideDuration={2500} onClose={() => setMsg("")}>
                <Alert severity="info" onClose={() => setMsg("")} sx={{ userSelect: "none", cursor: "default" }}>{msg}</Alert>
            </Snackbar>
        </Box>
    );
}