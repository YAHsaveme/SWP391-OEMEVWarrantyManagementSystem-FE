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
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

import staffInventory from "../../services/staffInventoryFacade";
import authService from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";
import inventoryLotService from "../../services/inventoryLotService";
import partService from "../../services/partService";
import centerService from "../../services/centerService";

/* ===== Helpers ===== */
const noSelect = { userSelect: "none", cursor: "default" };

// Format currency VND
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value) || value === 0) return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

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
    // Lấy giá từ nhiều nguồn có thể
    n.price = Number(
        row.price ??
        row.unitPrice ??
        row.unitPriceVND ??
        row.unit_price_vnd ??
        row.part?.price ??
        row.part?.unitPrice ??
        row.part?.unitPriceVND ??
        row.part?.unit_price_vnd ??
        0
    );
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

    // Kiểm tra role: chỉ SC_MANAGER mới được gửi ticket
    const [userRole, setUserRole] = useState(null);
    const canSendTicket = userRole === "SC_MANAGER";

    const [shipOpen, setShipOpen] = useState(false);
    const [shipLoading, setShipLoading] = useState(false);
    const [shipRows, setShipRows] = useState([]);
    const [shipNeedsReload, setShipNeedsReload] = useState(false);
    const [centerMap, setCenterMap] = useState({});

    // === LẤY centerId và role từ /me nếu token không có ===
    useEffect(() => {
        (async () => {
            try {
                const me = await authService.getCurrentUser();
                const cid = me?.centerId || me?.centerid || null;
                if (cid && !centerId) setCenterId(cid);
                else if (!centerId) setMsg("Không tìm thấy trung tâm. Vui lòng đăng nhập lại.");

                // Lấy role từ user object hoặc localStorage
                const role = me?.role?.name || me?.role || localStorage.getItem("role");
                if (role) setUserRole(role);
            } catch {
                setMsg("Không lấy được thông tin người dùng (/me).");
                // Fallback: lấy role từ localStorage
                const role = localStorage.getItem("role");
                if (role) setUserRole(role);
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
            let aggregatedByPart = {};
            try {
                const lotsRes = await inventoryLotService.listByCenterWithId(centerId);
                const lotsRaw = Array.isArray(lotsRes?.inventoryLots)
                    ? lotsRes.inventoryLots
                    : Array.isArray(lotsRes)
                        ? lotsRes
                        : [];
                lotsRaw.forEach((lot) => {
                    const partId = lot.partId || lot.partLotPartId || lot.part?.id || lot.partLot?.partId;
                    if (!partId) return;
                    const isSerialized =
                        lot.isSerialized ??
                        lot.part?.isSerialized ??
                        Boolean(lot.serialNo || lot.partLotSerialNo || lot.partLot?.serialNo);
                    const rawQty = lot.quantity;
                    let qty = Number(rawQty);
                    if (Number.isNaN(qty)) {
                        qty = isSerialized ? 1 : 0;
                    }
                    if (isSerialized) {
                        if (rawQty === undefined || rawQty === null || Number.isNaN(Number(rawQty))) {
                            qty = 1;
                        }
                    }
                    aggregatedByPart[partId] = (aggregatedByPart[partId] || 0) + (Number.isNaN(qty) ? 0 : qty);
                });
            } catch (err) {
                console.warn("[Inventory] sync quantity with lots failed:", err);
            }

            // Fetch thông tin part để lấy giá nếu chưa có
            const partIds = [...new Set(onlyMine.map(r => r.partId ?? r.part?.id ?? r.uuid ?? r.id).filter(Boolean))];
            const partPriceMap = {};

            // Thử lấy giá từ response trước (nhiều nguồn có thể)
            onlyMine.forEach(r => {
                const partId = r.partId ?? r.part?.id ?? r.uuid ?? r.id;
                if (partId) {
                    // Thử nhiều nguồn giá khác nhau
                    const price =
                        r.price ??
                        r.unitPrice ??
                        r.unitPriceVND ??
                        r.unit_price_vnd ??
                        r.part?.price ??
                        r.part?.unitPrice ??
                        r.part?.unitPriceVND ??
                        r.part?.unit_price_vnd ??
                        r.part?.part?.price ??
                        r.part?.part?.unitPrice ??
                        0;
                    if (price > 0) {
                        const partIdStr = String(partId);
                        partPriceMap[partIdStr] = Number(price);
                        partPriceMap[partId] = Number(price);
                    }
                }
            });

            console.log("[Inventory] Price from response:", partPriceMap);

            // Chỉ fetch từ part service nếu chưa có đủ giá từ response và user có quyền
            // SC_MANAGER có thể không có quyền gọi API parts, nên chỉ dùng giá từ response
            const currentRole = authService.getRole();
            const shouldFetchParts = partIds.length > 0 && Object.keys(partPriceMap).length < partIds.length;

            if (shouldFetchParts && currentRole !== "SC_MANAGER") {
                try {
                    // Thử nhiều endpoint khác nhau (chỉ cho EVM_STAFF hoặc role khác)
                    let allParts = [];
                    try {
                        allParts = await partService.getAll();
                        console.log("[Inventory] getAll() succeeded, got", allParts.length, "parts");
                    } catch (getAllErr) {
                        console.warn("[Inventory] getAll() failed, trying getActive():", getAllErr);
                        try {
                            allParts = await partService.getActive();
                            console.log("[Inventory] getActive() succeeded, got", allParts.length, "parts");
                        } catch (getActiveErr) {
                            console.warn("[Inventory] getActive() also failed, trying list():", getActiveErr);
                            try {
                                allParts = await partService.list();
                                console.log("[Inventory] list() succeeded, got", allParts.length, "parts");
                            } catch (listErr) {
                                console.warn("[Inventory] list() also failed:", listErr);
                                throw listErr;
                            }
                        }
                    }

                    console.log("[Inventory] All parts from API:", allParts);
                    console.log("[Inventory] First part sample:", allParts[0]);

                    const partIdsStr = partIds.map(id => String(id));
                    allParts.forEach(part => {
                        // API trả về field 'id', không phải 'partId'
                        const partId = part.id ?? part.uuid ?? part.partId;
                        if (partId) {
                            const partIdStr = String(partId);
                            // Kiểm tra xem partId này có trong danh sách cần không
                            if (partIdsStr.includes(partIdStr)) {
                                // API trả về 'unitPrice', không phải 'price'
                                const price = part.unitPrice ?? part.price ?? part.unitPriceVND ?? part.unit_price_vnd ?? 0;
                                if (price > 0) {
                                    // Map về cả string và original ID để đảm bảo match
                                    partPriceMap[partIdStr] = Number(price);
                                    if (partId !== partIdStr) {
                                        partPriceMap[partId] = Number(price);
                                    }
                                    console.log(`[Inventory] Found price for part ${partIdStr} (${part.partName || part.partNo}):`, price);
                                } else {
                                    console.warn(`[Inventory] Part ${partIdStr} has unitPrice = 0 or null, part data:`, {
                                        id: part.id,
                                        partNo: part.partNo,
                                        partName: part.partName,
                                        unitPrice: part.unitPrice
                                    });
                                }
                            }
                        }
                    });
                } catch (err) {
                    console.warn("[Inventory] Failed to fetch part prices:", err);
                    if (err?.response?.data) {
                        console.warn("[Inventory] Error response:", err.response.data);
                    }
                }
            }

            console.log("[Inventory] Part price map:", partPriceMap);
            console.log("[Inventory] Part IDs:", partIds);

            const norm = onlyMine.map((r) => {
                const partId = r.partId ?? r.part?.id ?? r.uuid ?? r.id ?? null;
                const overrideQty = partId ? aggregatedByPart[partId] : undefined;
                // Thử lấy giá từ nhiều key khác nhau (string và original ID)
                const partIdStr = partId ? String(partId) : null;
                const price = partId ? (
                    partPriceMap[partIdStr] ??
                    partPriceMap[partId] ??
                    r.price ??
                    r.unitPrice ??
                    r.unitPriceVND ??
                    r.unit_price_vnd ??
                    r.part?.price ??
                    r.part?.unitPrice ??
                    r.part?.unitPriceVND ??
                    r.part?.unit_price_vnd ??
                    0
                ) : 0;
                const merged = overrideQty !== undefined ? { ...r, quantity: overrideQty, price: Number(price) || 0 } : { ...r, price: Number(price) || 0 };
                return normalizePart(merged, fb);
            });
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

    // === LOAD CENTERS MAP ===
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
                console.error("[Inventory] loadCenters error:", err);
            }
        };
        loadCenters();
    }, []);

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
        else if (shipNeedsReload) {
            loadShipments();
            setShipNeedsReload(false);
        }
    }, [shipOpen, centerId, shipNeedsReload]);

    // Listen for shipment events
    useEffect(() => {
        // Dispatch: chỉ reload shipments list, KHÔNG reload inventory (vì chưa receive, chưa cộng vào kho đích)
        const handleDispatch = () => {
            if (shipOpen) {
                loadShipments();
            } else {
                setShipNeedsReload(true);
            }
            // KHÔNG gọi load() - vì dispatch chỉ trừ kho nguồn, chưa cộng vào kho đích
        };

        // Receive: reload cả shipments list VÀ inventory (vì đã cộng vào kho đích)
        const handleReceive = () => {
            if (shipOpen) {
                loadShipments();
            } else {
                setShipNeedsReload(true);
            }
            // Gọi load() để refresh inventory vì đã cộng vào kho đích
            load();
        };

        // Close: chỉ reload shipments list
        const handleClose = () => {
            if (shipOpen) {
                loadShipments();
            } else {
                setShipNeedsReload(true);
            }
        };

        window.addEventListener("shipment-dispatch", handleDispatch);
        window.addEventListener("shipment-received", handleReceive);
        window.addEventListener("shipment-close", handleClose);

        return () => {
            window.removeEventListener("shipment-dispatch", handleDispatch);
            window.removeEventListener("shipment-received", handleReceive);
            window.removeEventListener("shipment-close", handleClose);
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
            await load(); // refresh lại sau khi gửi

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
            return [...prev, {
                partId: p.partId,
                partNo: p.partNo,
                partName: p.partName,
                maxAllowed: cap,
                qty: suggest,
                price: p.price || 0
            }];
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
                <Grid item xs={12} md={canSendTicket ? 7 : 12}>
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
                                            Hàng tới
                                        </Badge>
                                    </Button>
                                </Stack>
                            </Stack>

                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block", ...noSelect }}>
                                Kho: Phụ tùng của Trung tâm — {centerName || "?"}
                            </Typography>

                            <Stack spacing={2}>
                                {loading && <Typography sx={noSelect}>Đang tải...</Typography>}
                                {!loading && filtered.map(p => (
                                    <Paper
                                        key={p.partId}
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            ...noSelect
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            {/* Dòng 1: Tên phụ tùng, Quantity và Replenish */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: "1rem",
                                                        color: "text.primary",
                                                        ...noSelect
                                                    }}
                                                >
                                                    {p.partName}
                                                </Typography>
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Typography
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: "text.primary",
                                                            ...noSelect
                                                        }}
                                                    >
                                                        [Số lượng: {p.quantity}]
                                                    </Typography>
                                                    {canSendTicket && (
                                                        <Button
                                                            startIcon={<AddIcon />}
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => addToCart(p)}
                                                            disabled={Number(p.remainingToMax ?? 0) <= 0}
                                                            sx={{
                                                                color: "error.main",
                                                                borderColor: "error.main",
                                                                textTransform: "none",
                                                                fontWeight: 500,
                                                                "&:hover": {
                                                                    bgcolor: "rgba(211, 47, 47, 0.08)",
                                                                    borderColor: "error.dark"
                                                                },
                                                                "&:disabled": {
                                                                    borderColor: "action.disabled",
                                                                    color: "action.disabled"
                                                                }
                                                            }}
                                                        >
                                                            Yêu cầu thêm
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>

                                            {/* Dòng 2: Min/Max và Status + Giá */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "text.primary",
                                                        fontWeight: 500,
                                                        ...noSelect
                                                    }}
                                                >
                                                    Tối thiểu: {p.minQty} • Tối đa: {p.maxQty}
                                                </Typography>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    {canSendTicket && p.price > 0 && (
                                                        <>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: "text.primary",
                                                                    fontWeight: 600,
                                                                    ...noSelect
                                                                }}
                                                            >
                                                                {formatCurrency(p.price)}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: "text.primary",
                                                                    fontWeight: 500,
                                                                    ...noSelect
                                                                }}
                                                            >
                                                                •
                                                            </Typography>
                                                        </>
                                                    )}
                                                    <FiberManualRecordIcon
                                                        sx={{
                                                            fontSize: 10,
                                                            color: p.isShort ? "error.main" : "success.main"
                                                        }}
                                                    />
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: "text.primary",
                                                            fontWeight: 500,
                                                            ...noSelect
                                                        }}
                                                    >
                                                        {p.isShort ? "Thiếu" : "Đủ"}
                                                    </Typography>
                                                </Stack>
                                            </Stack>

                                        </Stack>
                                    </Paper>
                                ))}
                                {!loading && filtered.length === 0 && <Typography color="text.secondary" sx={noSelect}>Không có dữ liệu.</Typography>}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* RIGHT: TICKET - Chỉ hiển thị cho SC_MANAGER */}
                {canSendTicket && (
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
                                                    {it.price > 0 && (
                                                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500, ...noSelect }}>
                                                            Giá: {formatCurrency(it.price)}
                                                        </Typography>
                                                    )}
                                                    {Number(it.maxAllowed || 0) > 0 && (
                                                        <Typography variant="caption" color="text.secondary" sx={noSelect}>
                                                            Có thể bổ sung ≤ {it.maxAllowed}
                                                        </Typography>
                                                    )}
                                                    {it.price > 0 && it.qty > 0 && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, ...noSelect }}>
                                                            Thành tiền: {formatCurrency(it.price * it.qty)}
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
                )}
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
                                                Từ: {
                                                    s.sourceCenter?.name ||
                                                    s.fromCenter?.name ||
                                                    (s.fromCenterId && centerMap[String(s.fromCenterId)]) ||
                                                    (s.sourceCenterId && centerMap[String(s.sourceCenterId)]) ||
                                                    (s.fromCenterId ? `Trung tâm ${s.fromCenterId}` : "Trung tâm chưa xác định")
                                                }
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