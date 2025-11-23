// src/components/evm/WarrantyRequests.jsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
    Box, Grid, Card, CardContent, Typography, Chip, Button, Table, TableHead,
    TableRow, TableCell, TableBody, Paper, IconButton, TextField, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, FormControl,
    InputLabel, Select, MenuItem, Stack, Tooltip, Checkbox
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { Visibility, Search, Refresh, LocalShipping, Add, Delete, Remove } from "@mui/icons-material";

import claimService, { CLAIM_STATUS } from "../../services/claimService";
import ticketService from "../../services/ticketService";
import centerService from "../../services/centerService";
import shipmentService from "../../services/shipmentService";
import inventoryLotService from "../../services/inventoryLotService";
import inventoryPartService from "../../services/inventoryPartService";
import partService from "../../services/partService";
import diagnosticsService from "../../services/diagnosticsService";
import estimatesService from "../../services/estimatesService";
import eventService from "../../services/eventService";
import authService from "../../services/authService";
import axiosInstance from "../../services/axiosInstance";
import { useNavigate } from "react-router-dom";

// Map trạng thái cho UI (ticket)
const TICKET_STATUS = {
    UNDER_REVIEW: "UNDER_REVIEW",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
};

// 🔒 Style vùng không nhập liệu
const nonEditableSx = { userSelect: "none", caretColor: "transparent", cursor: "default" };

/* =========================
   Ticket List (EVM duyệt yêu cầu bổ sung) — KHÔNG tạo shipment
   ========================= */
// Inline Shipment panel reused inside the ticket dialog
function InlineShipmentPanel({ shipmentId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [trackingNo, setTrackingNo] = useState("");
    const [snack, setSnack] = useState({ open: false, msg: "", sev: "info" });

    const reload = async () => {
        if (!shipmentId) return;
        setLoading(true);
        try {
            const d = await shipmentService.get(shipmentId);
            setData(d || null);
            setTrackingNo(d?.trackingNo || "");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); }, [shipmentId]);

    const isCenterToCenter = Boolean(data?.fromCenterId || data?.fromCenter?.id);
    const canDispatch = data?.status === "REQUESTED" && !isCenterToCenter;
    const canReceive = !isCenterToCenter && (data?.status === "IN_TRANSIT" || data?.status === "DISPATCHED");
    const canClose = !isCenterToCenter && data?.status === "DELIVERED";

    const doDispatch = async () => {
        if (!canDispatch) {
            setSnack({ open: true, sev: "warning", msg: "Shipment Center → Center sẽ được trung tâm nguồn dispatch." });
            return;
        }
        if (!trackingNo.trim()) {
            setSnack({ open: true, sev: "warning", msg: "Nhập Tracking No trước khi Dispatch" });
            return;
        }
        setBusy(true);
        try {
            await shipmentService.dispatch(shipmentId, trackingNo.trim());
            setSnack({ open: true, sev: "success", msg: "Đã Dispatch" });
            await reload();
        } catch (e) {
            setSnack({ open: true, sev: "error", msg: e?.response?.data?.message || e.message || "Dispatch failed" });
        } finally {
            setBusy(false);
        }
    };

    const doReceive = async () => {
        if (!canReceive) return;
        setBusy(true);
        try {
            await shipmentService.receive(shipmentId);
            setSnack({ open: true, sev: "success", msg: "Đã Receive" });
            await reload();
        } catch (e) {
            setSnack({ open: true, sev: "error", msg: e?.response?.data?.message || e.message || "Receive failed" });
        } finally {
            setBusy(false);
        }
    };

    const doClose = async () => {
        if (!canClose) return;
        setBusy(true);
        try {
            await shipmentService.close(shipmentId);
            setSnack({ open: true, sev: "success", msg: "Đã Close" });
            await reload();
        } catch (e) {
            setSnack({ open: true, sev: "error", msg: e?.response?.data?.message || e.message || "Close failed" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            {loading ? (
                <Box sx={{ textAlign: "center", py: 2 }}><CircularProgress size={20} /></Box>
            ) : !data ? (
                <Typography color="text.secondary">Không tải được shipment.</Typography>
            ) : (
                <Stack spacing={1}>
                    <Typography variant="subtitle2">Shipment đã tạo</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                        <TextField
                            label="Tracking No"
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                            size="small"
                            sx={{ minWidth: 260 }}
                            disabled={!canDispatch || busy}
                            helperText={canDispatch ? "Điền mã vận đơn rồi bấm Dispatch" : ""}
                            InputProps={{ readOnly: !canDispatch }}
                        />
                        {!isCenterToCenter && (
                            <>
                        <Button variant="contained" onClick={doDispatch} disabled={!canDispatch || busy}>Dispatch</Button>
                        <Button color="success" variant="contained" onClick={doReceive} disabled={!canReceive || busy}>Receive</Button>
                        <Button color="inherit" variant="contained" onClick={doClose} disabled={!canClose || busy}>Close</Button>
                            </>
                        )}
                        <Chip size="small" label={data?.status || "—"} color={data?.status === "IN_TRANSIT" ? "info" : data?.status === "DELIVERED" ? "success" : "default"} />
                    </Stack>
                    {isCenterToCenter && (
                        <Typography variant="caption" color="text.secondary">
                            Shipment Center → Center sẽ được trung tâm nguồn dispatch và nhận hàng. EVM chỉ theo dõi tiến độ tại đây.
                        </Typography>
                    )}
                </Stack>
            )}
            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack({ ...snack, open: false })}
            >
                <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Paper>
    );
}

function ReplenishmentTicketList() {
    // ====== DATA & LOAD LIST ======
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const loadLockRef = useRef(false);
    // Snackbar thông báo cục bộ cho Ticket/Shipment
    const [snack, setSnack] = useState({ open: false, msg: "", sev: "info" });
    const notify = (msg, sev = "info") => setSnack({ open: true, msg, sev });
    const [shippedIds, setShippedIds] = useState(new Set());
    const navigate = useNavigate();
    const load = async () => {
        if (loadLockRef.current) return;
        loadLockRef.current = true;
        setLoading(true);
        try {
            // ⚠️ QUAN TRỌNG: EVM staff phải thấy TẤT CẢ tickets từ tất cả centers
            // Không filter theo centerId, không truyền params để đảm bảo backend trả về tất cả
            console.log("[WarrantyRequests] Loading tickets for EVM staff...");
            const currentRole = localStorage.getItem("currentRole");
            
            // ⚠️ FIX: Thêm await để lấy user info đúng cách
            let currentUser = null;
            try {
                currentUser = await authService.getCurrentUser();
            } catch (e) {
                console.warn("[WarrantyRequests] Failed to get current user:", e);
                // Fallback: lấy từ localStorage
                currentUser = authService.getStoredUser();
            }
            
            console.log("[WarrantyRequests] Current user role:", currentRole);
            console.log("[WarrantyRequests] Current user:", currentUser ? {
                id: currentUser.id,
                role: currentUser.role,
                centerId: currentUser.centerId,
                center: currentUser.center
            } : "null");
            console.log("[WarrantyRequests] Calling ticketService.getAll() without params to get ALL tickets...");
            
            // ⚠️ Đảm bảo gọi getAll() mà không có params để backend trả về TẤT CẢ tickets
            // Nếu backend đang filter theo role, cần sửa backend controller
            const list = await ticketService.getAll();
            console.log("[WarrantyRequests] Raw tickets from API:", list);
            const arr = Array.isArray(list) ? list : [];
            console.log("[WarrantyRequests] Loaded tickets:", arr.length);
            
            // ⚠️ DEBUG: Kiểm tra xem có tickets từ center 2 không
            const center2Tickets = arr.filter(t => {
                const cId = String(t.centerId ?? "");
                const cName = String(t.centerName ?? "");
                return cId.includes("2") || cName.toLowerCase().includes("vin 2") || cName.toLowerCase().includes("center 2");
            });
            console.log("[WarrantyRequests] Tickets from Center 2 (or similar):", center2Tickets.length);
            if (center2Tickets.length > 0) {
                console.log("[WarrantyRequests] Sample Center 2 tickets:", center2Tickets.slice(0, 3).map(t => ({
                    id: t.id,
                    centerId: t.centerId,
                    centerName: t.centerName,
                    status: t.status,
                    createdAt: t.createdAt
                })));
            } else {
                console.warn("[WarrantyRequests] ⚠️ KHÔNG TÌM THẤY tickets từ Center 2!");
            }
            
            console.log("[WarrantyRequests] Sample tickets (all centers):", arr.slice(0, 5).map(t => ({
                id: t.id,
                centerId: t.centerId,
                centerName: t.centerName,
                status: t.status,
                createdAt: t.createdAt
            })));
            
            // ⚠️ DEBUG: Log tất cả tickets để kiểm tra
            console.log("[WarrantyRequests] ========== ALL TICKETS DETAILS ==========");
            arr.forEach((t, idx) => {
                console.log(`[WarrantyRequests] Ticket ${idx + 1}:`, {
                    id: t.id,
                    centerId: t.centerId,
                    centerName: t.centerName,
                    status: t.status,
                    createdAt: t.createdAt,
                    items: t.items
                });
            });
            console.log("[WarrantyRequests] ===========================================");
            
            setRows(arr);

            // 🟦 Kiểm tra ticket nào có shipment
            const shipped = new Set();
            await Promise.all(
                arr.map(async (t) => {
                    let has = false;
                    try {
                        if (typeof shipmentService.existsForTicket === "function") {
                            has = await shipmentService.existsForTicket(t.id);
                        } else {
                            const data = await shipmentService.getByTicketId(t.id);
                            has = Array.isArray(data) ? data.length > 0 : !!data?.id;
                        }
                    } catch (_) { has = false; }
                    if (has) shipped.add(t.id);
                })
            );
            setShippedIds(shipped);
        } finally {
            setLoading(false);
            setTimeout(() => (loadLockRef.current = false), 300);
        }
    };
    useEffect(() => { load(); }, []);

    // ====== CENTERS (lọc theo trung tâm) ======
    const [centers, setCenters] = useState([]);
    // ⚠️ QUAN TRỌNG: EVM staff phải thấy TẤT CẢ tickets từ tất cả centers
    // Không được filter theo centerId của user hiện tại - mặc định là "" (tất cả)
    const [filterCenter, setFilterCenter] = useState("");
    const [shipmentCenters, setShipmentCenters] = useState([]); // Centers cho Center-to-Center shipment
    const [loadingCenters, setLoadingCenters] = useState(false); // Loading state cho suggest-center
    useEffect(() => {
        (async () => {
            try {
                const list = await centerService.getAll();
                setCenters(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error("load centers failed:", e);
                setCenters([]);
            }
        })();
    }, []);

    // ⚠️ DEBUG: Log khi filterCenter thay đổi để đảm bảo EVM staff thấy TẤT CẢ tickets
    useEffect(() => {
        console.log("[WarrantyRequests] filterCenter changed:", filterCenter);
        if (filterCenter) {
            console.warn("[WarrantyRequests] ⚠️ WARNING: filterCenter is set to:", filterCenter, "- This will filter tickets!");
            console.warn("[WarrantyRequests] ⚠️ EVM staff should see ALL tickets, not filtered by center!");
        } else {
            console.log("[WarrantyRequests] ✅ filterCenter is empty - showing ALL tickets (correct for EVM staff)");
        }
    }, [filterCenter]);

    // ====== FILTER STATES ======
    const [filterStatus, setFilterStatus] = useState("all");
    const [q, setQ] = useState("");

    const norm = (v) =>
        (v ?? "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase()
            .trim();

    const viewRows = useMemo(() => {
        console.log("[WarrantyRequests] ========== FILTERING TICKETS ==========");
        console.log("[WarrantyRequests] viewRows - Filtering tickets:", {
            totalRows: rows.length,
            filterCenter,
            filterStatus,
            searchQuery: q
        });
        
        // ⚠️ DEBUG: Log tất cả tickets trước khi filter
        console.log("[WarrantyRequests] All tickets before filter:", rows.map(t => ({
            id: t.id,
            centerId: t.centerId,
            centerName: t.centerName,
            status: t.status
        })));
        
        const needle = norm(q);
        const filtered = rows.filter((t) => {
            const cId = String(t.centerId ?? "");
            const cName = String(t.centerName ?? "");
            const matchesCenter =
                !filterCenter ||
                cId === String(filterCenter) ||
                cName === filterCenter;
            if (!matchesCenter) {
                console.log(`[WarrantyRequests] ❌ Filtered out ticket ${t.id} - center mismatch: centerId="${cId}", centerName="${cName}" vs filterCenter="${filterCenter}"`);
                return false;
            }

            if (filterStatus !== "all" && t.status !== filterStatus) {
                console.log(`[WarrantyRequests] ❌ Filtered out ticket ${t.id} - status mismatch: ${t.status} vs ${filterStatus}`);
                return false;
            }

            const item = Array.isArray(t.items) && t.items[0] ? t.items[0] : {};
            const cStr = norm(cName || cId);
            const pStr = norm(item.partName || item.partNo || item.partId);
            if (needle && !(cStr.includes(needle) || pStr.includes(needle))) {
                console.log(`[WarrantyRequests] ❌ Filtered out ticket ${t.id} - search mismatch: needle="${needle}"`);
                return false;
            }
            console.log(`[WarrantyRequests] ✅ Ticket ${t.id} passed all filters`);
            return true;
        });
        
        console.log("[WarrantyRequests] Filtered tickets count:", filtered.length);
        console.log("[WarrantyRequests] Filtered tickets:", filtered.map(t => ({
            id: t.id,
            centerId: t.centerId,
            centerName: t.centerName,
            status: t.status
        })));
        console.log("[WarrantyRequests] ======================================");
        console.log("[WarrantyRequests] viewRows - Filtered tickets:", filtered.length);

        const orderStatus = { UNDER_REVIEW: 1, REJECTED: 2, APPROVED: 3, IN_PROGRESS: 4, COMPLETED: 5 };
        return [...filtered].sort((a, b) => {
            const sa = orderStatus[a.status] || 99;
            const sb = orderStatus[b.status] || 99;
            if (sa !== sb) return sa - sb;
            const da = new Date(a.createdAt || a.createdDate || a.updatedAt || 0).getTime();
            const db = new Date(b.createdAt || b.createdDate || b.updatedAt || 0).getTime();
            return db - da;
        });
    }, [rows, filterCenter, filterStatus, q]);

    // ====== VIEW DETAIL / APPROVE / REJECT ======
    const [viewOpen, setViewOpen] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewData, setViewData] = useState(null);
    const [detailRejectReason, setDetailRejectReason] = useState("");
    const [detailSubmitting, setDetailSubmitting] = useState(false);

    // ====== CREATE SHIPMENT ======
    const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
    const [shipmentType] = useState("center"); // Chỉ hỗ trợ Center → Center
    const [shipmentNote, setShipmentNote] = useState("");
    const [shipmentFromCenterId, setShipmentFromCenterId] = useState("");
    const [shipmentItems, setShipmentItems] = useState([]);
    const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
    const [availableLots, setAvailableLots] = useState({}); // { partId: [lots...] }
    const [loadingLots, setLoadingLots] = useState(false);
    const [partInfoMap, setPartInfoMap] = useState({}); // { partId: { isSerialized, ... } }
    const [loadingPartInfo, setLoadingPartInfo] = useState(false);
    const [ticketShipment, setTicketShipment] = useState(null);
    const [createdShipmentId, setCreatedShipmentId] = useState(null);
    const [selectedPartIds, setSelectedPartIds] = useState(new Set()); // Chỉ dùng cho Center-to-Center
    const [insufficientByPart, setInsufficientByPart] = useState({}); // { partId: { required, totalAvail } }
    const [centerSuggestions, setCenterSuggestions] = useState([]); // Danh sách center suggestions từ suggestOptimalCenter
    const [loadingSuggestions, setLoadingSuggestions] = useState(false); // Loading state cho suggestOptimalCenter
    const [hasNoCenters, setHasNoCenters] = useState(false); // Flag: không có center nào có hàng

    // Load centers cho Center-to-Center shipment dùng suggest-center API
    // Chỉ suggest centers có các parts đã được chọn
    // Tự động gọi khi chọn part bên phải
    useEffect(() => {
        if (shipmentDialogOpen && selectedPartIds.size > 0) {
            setLoadingCenters(true);
            (async () => {
                try {
                    const partIdsArray = Array.from(selectedPartIds);
                    console.log("[suggest-center] Calling with partIds:", partIdsArray);
                    // Dùng requiredQuantity từ shipmentItems thay vì quantity=1
                    const partQuantities = partIdsArray.map(pid => {
                        const item = shipmentItems.find(i => i.partId === pid);
                        return {
                            partId: pid,
                            quantity: item?.requiredQuantity || 1
                        };
                    });
                    const response = await shipmentService.suggestCenter({
                        partQuantities
                    });
                    console.log("[suggest-center] Response:", response);

                    const centerMap = new Map();
                    const pushCenter = (id, name, items) => {
                        const cid = String(id || "").trim();
                        if (!cid) return;
                        if (!centerMap.has(cid)) {
                            centerMap.set(cid, {
                                id: cid,
                                centerId: cid,
                                name: name || `Center ${cid}`,
                                centerName: name || `Center ${cid}`,
                                items: Array.isArray(items) ? items : [],
                            });
                        }
                    };

                    const pushFromEntry = (entry) => {
                        if (!entry) return;

                        if (Array.isArray(entry)) {
                            entry.forEach(pushFromEntry);
                            return;
                        }

                        // Common fields
                        const baseItems = entry.items || entry.partLots || entry.availableParts || entry.parts || [];

                        if (entry.centerId || entry.id) {
                            pushCenter(entry.centerId || entry.id, entry.centerName || entry.name, baseItems);
                        }

                        if (Array.isArray(entry.centerIds)) {
                            entry.centerIds.forEach((id, idx) => {
                                const name = Array.isArray(entry.centerNames)
                                    ? entry.centerNames[idx]
                                    : entry.centerName || entry.name;
                                const bucketItems = Array.isArray(entry.itemsPerCenter)
                                    ? entry.itemsPerCenter[idx]
                                    : baseItems;
                                pushCenter(id, name, bucketItems);
                            });
                        }

                        if (Array.isArray(entry.centers)) {
                            entry.centers.forEach((center) => {
                                pushCenter(center.id || center.centerId, center.name || center.centerName, center.items || center.availableParts || baseItems);
                            });
                        }

                        if (Array.isArray(entry.availableCenters)) {
                            entry.availableCenters.forEach((center) => {
                                if (typeof center === "string" || typeof center === "number") {
                                    pushCenter(center, null, baseItems);
                                } else {
                                    pushCenter(center.id || center.centerId, center.name || center.centerName, center.items || center.availableParts || baseItems);
                                }
                            });
                        }

                        if (Array.isArray(entry.centerSuggestions)) {
                            entry.centerSuggestions.forEach(pushFromEntry);
                        }

                        if (Array.isArray(entry.multiCenterSuggestions)) {
                            entry.multiCenterSuggestions.forEach(pushFromEntry);
                        }

                        if (Array.isArray(entry.suggestions)) {
                            entry.suggestions.forEach(pushFromEntry);
                        }
                    };

                    pushFromEntry(response);

                    const uniqueCenters = Array.from(centerMap.values());
                    console.log("[suggest-center] Parsed centers (unique):", uniqueCenters);

                    const ticketDestinationCenterId = viewData?.centerId ? String(viewData.centerId) : null;
                    console.log("[suggest-center] Ticket destination center:", ticketDestinationCenterId);
                    console.log("[suggest-center] Centers returned from API (including destination if any):", uniqueCenters);

                    let filteredCenters = uniqueCenters.filter(center => String(center.id ?? center.centerId) !== ticketDestinationCenterId);
                    console.log("[suggest-center] Centers after excluding destination:", filteredCenters);
                    
                    // ⚠️ QUAN TRỌNG: Verify tất cả centers bằng suggestPartLots để loại bỏ centers không đủ hàng
                    if (filteredCenters.length > 0) {
                        console.log("[suggest-center] Verifying stock for", filteredCenters.length, "centers...");
                        
                        // Lấy required quantities từ viewData.items
                        const requiredByPartId = {};
                        if (Array.isArray(viewData?.items)) {
                            viewData.items.forEach(item => {
                                const partId = item.partId || item.part?.id;
                                if (partId && selectedPartIds.has(partId)) {
                                    requiredByPartId[partId] = (requiredByPartId[partId] || 0) + Number(item.requireQuantity ?? item.quantity ?? 0);
                                }
                            });
                        }
                        
                        // Verify từng center
                        const verificationPromises = filteredCenters.map(async (center) => {
                            const centerId = String(center.id ?? center.centerId);
                            try {
                                const lotsResult = await shipmentService.suggestPartLots({
                                    centerId: centerId,
                                    partQuantities: Object.keys(requiredByPartId).map(partId => ({
                                        partId,
                                        quantity: requiredByPartId[partId]
                                    }))
                                });
                                
                                const suggestedItems = Array.isArray(lotsResult?.suggestedItems) ? lotsResult.suggestedItems : [];
                                const availableByPartId = {};
                                suggestedItems.forEach(si => {
                                    const partId = si.partId;
                                    if (partId) {
                                        availableByPartId[partId] = (availableByPartId[partId] || 0) + Number(si.availableQuantity ?? 0);
                                    }
                                });
                                
                                // Kiểm tra xem có đủ hàng không
                                let hasEnoughStock = true;
                                Object.keys(requiredByPartId).forEach(partId => {
                                    const required = requiredByPartId[partId];
                                    const available = availableByPartId[partId] || 0;
                                    console.log(`[Verify] Center ${centerId}, Part ${partId}: required=${required}, available=${available}`);
                                    if (available < required) {
                                        hasEnoughStock = false;
                                    }
                                });
                                
                                return { center, hasEnoughStock };
                            } catch (e) {
                                console.warn(`[suggest-center] Failed to verify center ${centerId}:`, e);
                                return { center, hasEnoughStock: false };
                            }
                        });
                        
                        const verificationResults = await Promise.all(verificationPromises);
                        
                        // Chỉ giữ lại centers đủ hàng
                        filteredCenters = verificationResults
                            .filter(result => result.hasEnoughStock)
                            .map(result => result.center);
                        
                        console.log(`[suggest-center] Sau khi verify: ${filteredCenters.length} centers đủ hàng`);
                    }
                    
                    if (filteredCenters.length === 0) {
                        try {
                            const allCenters = await centerService.getAll();
                            const normalized = (Array.isArray(allCenters) ? allCenters : []).map((c) => ({
                                id: c.id || c.centerId,
                                centerId: c.id || c.centerId,
                                name: c.name || c.centerName,
                                centerName: c.name || c.centerName,
                                items: [],
                            }));
                            const fallbackCenters = normalized.filter(c => String(c.centerId) !== ticketDestinationCenterId);
                            if (fallbackCenters.length > 0) {
                                console.log("[suggest-center] Fallback to all centers:", fallbackCenters);
                                setShipmentCenters(fallbackCenters);
                                setLoadingCenters(false);
                                return;
                            }
                        } catch (fallbackErr) {
                            console.warn("[suggest-center] Fallback load centers failed:", fallbackErr);
                        }
                    }
                    setShipmentCenters(filteredCenters);

                    // Tự động chọn center đầu tiên và load lots luôn
                    if (filteredCenters.length > 0 && !shipmentFromCenterId && shipmentItems.length > 0) {
                        const firstCenter = filteredCenters[0];
                        const firstCenterId = String(firstCenter.id ?? firstCenter.centerId);
                        console.log("[suggest-center] Auto-selecting first center:", firstCenterId);
                        // Set center và load lots
                        setShipmentFromCenterId(firstCenterId);
                        // Load lots cho các parts đã chọn
                        const partQuantities = shipmentItems
                            .filter(item => item.partId)
                            .map(item => ({
                                partId: item.partId,
                                quantity: item.requiredQuantity || 1
                            }));

                        if (partQuantities.length > 0) {
                            setLoadingLots(true);
                            try {
                                const result = await shipmentService.suggestPartLots({
                                    centerId: firstCenterId,
                                    partQuantities // 👈 đúng theo Swagger
                                });

                                console.log("[suggest-part-lots] Response:", result);

                                // Parse suggestedItems
                                const suggestedItems = Array.isArray(result?.suggestedItems) ? result.suggestedItems : [];
                                const lotsMap = {};          // { partId: Lot[] }
                                const availableQtyMap = {};  // { partId: totalAvailable }

                                for (const si of suggestedItems) {
                                    const partId = si.partId;
                                    if (!partId) continue;

                                    // Chuẩn hoá Lot
                                    const lot = {
                                        id: si.partLotId,
                                        partLotId: si.partLotId,
                                        partId: si.partId,
                                        partNo: si.partNo,
                                        partName: si.partName,
                                        batchNo: si.batchNo,
                                        mfgDate: si.mfgDate,
                                        serialNo: si.serialNo,
                                        availableQuantity: si.availableQuantity ?? 0,
                                        suggestedQuantity: si.suggestedQuantity ?? 0,
                                        // Tên hiện thị: ưu tiên serialNo, sau đó batchNo, cuối cùng partLotId
                                        name: si.serialNo || si.batchNo || si.partLotId,
                                        lotName: si.serialNo || si.batchNo || si.partLotId,
                                    };

                                    // Push và dedupe theo partLotId
                                    if (!lotsMap[partId]) lotsMap[partId] = [];
                                    if (!lotsMap[partId].some(l => (l.partLotId || l.id) === (lot.partLotId || lot.id))) {
                                        lotsMap[partId].push(lot);
                                        availableQtyMap[partId] = (availableQtyMap[partId] || 0) + lot.availableQuantity;
                                    }
                                }

                                setAvailableLots(lotsMap);

                                // ⛔ Only clamp quantity and auto-assign lots for serialized
                                setShipmentItems(prev => {
                                    let next = [...prev];
                                    next = next.map(it => {
                                        if (!it.partId) return it;
                                        const isSerialized = it.isSerialized ?? partInfoMap[it.partId]?.isSerialized ?? false;
                                        const totalAvail = availableQtyMap[it.partId] || 0;
                                        const want = Number(it.requiredQuantity) || 0;
                                        return {
                                            ...it,
                                            quantity: isSerialized ? 1 : Math.min(totalAvail, want || totalAvail),
                                        };
                                    });

                                    // Không tự thêm dòng mới cho serialized nữa.
                                    // Chỉ auto-assign lot không trùng cho các dòng hiện có (nếu trống).
                                    const partIds = Array.from(new Set(next.map(i => i.partId).filter(Boolean)));
                                    for (const pid of partIds) {
                                        const isSerialized = partInfoMap[pid]?.isSerialized ?? false;
                                        if (!isSerialized) continue;
                                        const lots = lotsMap[pid] || [];
                                        const used = new Set(next.filter(i => i.partId === pid && i.partLotId).map(i => i.partLotId));
                                        for (const row of next.filter(i => i.partId === pid)) {
                                            if (row.partLotId) continue;
                                            const free = lots.find(l => !used.has(l.partLotId || l.id));
                                            if (free) {
                                                row.partLotId = free.partLotId || free.id;
                                                row.partLot = free;
                                                used.add(row.partLotId);
                                            }
                                        }
                                    }
                                    return next;
                                });
                            } catch (e) {
                                console.error("Auto-load lots failed:", e);
                            } finally {
                                setLoadingLots(false);
                            }
                        }
                    }
                } catch (e) {
                    console.error("load shipment centers failed:", e);
                    setShipmentCenters([]);
                } finally {
                    setLoadingCenters(false);
                }
            })();
        } else {
            // Reset khi đóng dialog hoặc chưa chọn parts
            setShipmentCenters([]);
            setLoadingCenters(false);
            setShipmentFromCenterId(""); // Reset center selection
        }
    }, [shipmentDialogOpen, selectedPartIds.size, shipmentItems.length, viewData?.centerId]); // Thêm viewData.centerId để lọc center đích

    const openView = async (id) => {
        setViewOpen(true);
        setViewLoading(true);
        setViewData(null);
        setDetailRejectReason("");
        setCreatedShipmentId(null);
        // Reset suggestions khi mở dialog mới
        setCenterSuggestions([]);
        setHasNoCenters(false);
        setLoadingSuggestions(false);
        try {
            const d = await ticketService.get(id);
            setViewData(d);

            // Gọi suggestCenter ngay khi mở ticket detail (từ SC_STAFF)
            if (d?.items && Array.isArray(d.items) && d.items.length > 0) {
                await loadCenterSuggestionsForTicket(d);
            }

            try {
                const s = await shipmentService.getByTicketId(id);
                if (s && s.id) {
                    setTicketShipment(s);
                } else {
                    setTicketShipment(null);
                }
            } catch (_) {
                setTicketShipment(null);
            }
        } catch (e) {
            console.error("load ticket detail failed:", e);
        } finally {
            setViewLoading(false);
        }
    };

    // Load center suggestions cho ticket (dùng khi mở ticket detail)
    const loadCenterSuggestionsForTicket = async (ticketData) => {
        if (!ticketData?.items || !Array.isArray(ticketData.items) || ticketData.items.length === 0) {
            setHasNoCenters(true);
            setCenterSuggestions([]);
            return;
        }

        setLoadingSuggestions(true);
        setHasNoCenters(false);
        setCenterSuggestions([]);

        try {
            // Chuẩn bị partQuantities từ ticket items
            const partQuantities = ticketData.items.map(item => ({
                partId: item.partId || item.part?.id,
                quantity: item.requireQuantity ?? item.quantity ?? 1
            })).filter(pq => pq.partId);

            if (partQuantities.length === 0) {
                setHasNoCenters(true);
                setCenterSuggestions([]);
                return;
            }

            // Gọi suggest-center (endpoint đúng theo Swagger)
            const response = await shipmentService.suggestCenter({ partQuantities });

            console.log("[suggestCenter] Response for ticket:", response);
            
            // ⚠️ LUÔN LUÔN verify bằng suggestPartLots vì suggestCenter có thể trả về sai
            // Không tin tưởng vào availableQuantity từ suggestCenter response

            // Parse response - có thể là multiCenterSuggestions hoặc centerSuggestions
            const suggestions = response?.multiCenterSuggestions || response?.centerSuggestions || response?.suggestions || [];

            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                setHasNoCenters(true);
                setCenterSuggestions([]);
            } else {
                setHasNoCenters(false);
                // Lấy center đích từ ticket (center nhận hàng)
                const ticketDestinationCenterId = ticketData?.centerId ? String(ticketData.centerId) : null;

                // Tạo map để tính required quantity cho mỗi partId từ ticket
                const requiredByPartId = {};
                ticketData.items.forEach(item => {
                    const partId = item.partId || item.part?.id;
                    if (partId) {
                        requiredByPartId[partId] = (requiredByPartId[partId] || 0) + Number(item.requireQuantity ?? item.quantity ?? 0);
                    }
                });

                // Flatten và deduplicate tất cả centers từ suggestions
                const centerMap = new Map(); // { centerId: { id, name, canFulfillAll, partsCanFulfillFully, partAvailabilities } } }

                suggestions.forEach(s => {
                    const centerIds = Array.isArray(s.centerIds) ? s.centerIds : [s.centerId || s.id].filter(Boolean);
                    const centerNames = Array.isArray(s.centerNames) ? s.centerNames : [s.centerName || s.name].filter(Boolean);

                    // Parse available quantities từ items/availableParts trong suggestion
                    const partAvailabilities = {}; // { partId: availableQuantity }
                    const items = s.items || s.availableParts || s.parts || [];
                    items.forEach(item => {
                        const partId = item.partId || item.part?.id;
                        if (partId) {
                            const avail = Number(item.availableQuantity ?? item.availableQty ?? item.quantity ?? 0);
                            if (partAvailabilities[partId]) {
                                partAvailabilities[partId] += avail;
                            } else {
                                partAvailabilities[partId] = avail;
                            }
                        }
                    });

                    // ⚠️ KHÔNG tính toán canFulfillAll từ suggestCenter response vì không đáng tin
                    // Sẽ verify lại bằng suggestPartLots sau
                    centerIds.forEach((id, idx) => {
                        const centerIdStr = String(id);
                        // Lọc bỏ center đích
                        if (centerIdStr === ticketDestinationCenterId) {
                            return;
                        }

                        // Nếu chưa có trong map, thêm vào (tạm thời set canFulfillAll = false, sẽ verify sau)
                        if (!centerMap.has(centerIdStr)) {
                            centerMap.set(centerIdStr, {
                                centerId: centerIdStr,
                                centerName: centerNames[idx] || `Center ${centerIdStr}`,
                                canFulfillAll: false, // ⚠️ Tạm thời false, sẽ verify bằng suggestPartLots
                                partsCanFulfillFully: 0,
                                partAvailabilities: { ...partAvailabilities }, // Lưu tạm từ suggestCenter (có thể không chính xác)
                            });
                        } else {
                            // Nếu đã có, merge partAvailabilities (cộng dồn)
                            const existing = centerMap.get(centerIdStr);
                            Object.keys(partAvailabilities).forEach(pid => {
                                existing.partAvailabilities[pid] = (existing.partAvailabilities[pid] || 0) + partAvailabilities[pid];
                            });
                            // Không update canFulfillAll ở đây, sẽ verify bằng suggestPartLots
                        }
                    });
                });

                // ⚠️ QUAN TRỌNG: LUÔN LUÔN gọi suggestPartLots cho TẤT CẢ centers để verify số lượng thực tế
                // Backend suggestCenter có thể trả về center không đủ hàng, KHÔNG BAO GIỜ tin tưởng vào nó
                if (centerMap.size > 0) {
                    console.log("[loadCenterSuggestions] Verifying stock for", centerMap.size, "centers using suggestPartLots...");
                    console.log("[loadCenterSuggestions] Required quantities:", requiredByPartId);
                    console.log("[loadCenterSuggestions] Part quantities for API:", partQuantities);
                    
                    // ⚠️ QUAN TRỌNG: Load partInfo để biết part nào là serialized
                    // Nếu chưa có partInfoMap, cần load trước
                    let partInfo = partInfoMap || {};
                    const partIdsToCheck = Array.from(new Set(partQuantities.map(pq => pq.partId).filter(Boolean)));
                    const missingPartIds = partIdsToCheck.filter(pid => !partInfo[pid]);
                    
                    if (missingPartIds.length > 0) {
                        console.log(`[Verify] Loading part info for ${missingPartIds.length} parts:`, missingPartIds);
                        try {
                            const allParts = await partService.getAll();
                            const partsArray = Array.isArray(allParts) ? allParts : [];
                            missingPartIds.forEach(pid => {
                                const part = partsArray.find(p => (p.id || p._id) === pid);
                                if (part) {
                                    const raw = part.isSerialized;
                                    const isSerialized = typeof raw === "boolean" ? raw
                                        : typeof raw === "number" ? raw === 1
                                        : typeof raw === "string" ? ["1", "true"].includes(raw.toLowerCase())
                                        : false;
                                    partInfo[pid] = { isSerialized, partNo: part.partNo || "", partName: part.partName || "" };
                                }
                            });
                            console.log(`[Verify] Loaded part info:`, partInfo);
                        } catch (e) {
                            console.warn(`[Verify] Failed to load part info:`, e);
                        }
                    }
                    
                    // ⚠️ DÙNG suggestPartLots để verify số lượng thực tế từ InventoryLots
                    // Không dùng suggest-center trực tiếp để đánh giá đủ hay thiếu
                    const verificationPromises = Array.from(centerMap.keys()).map(async (centerId) => {
                        try {
                            console.log(`[Verify] ========================================`);
                            console.log(`[Verify] Checking center ${centerId}`);
                            console.log(`[Verify] PartQuantities to check:`, JSON.stringify(partQuantities, null, 2));
                            console.log(`[Verify] Required quantities:`, JSON.stringify(requiredByPartId, null, 2));
                            
                            // ⚠️ DÙNG suggestPartLots API để lấy số lượng thực tế từ InventoryLots
                            const lotsResult = await shipmentService.suggestPartLots({
                                centerId: centerId,
                                partQuantities // Dùng partQuantities từ ticket items
                            });
                            
                            console.log(`[Verify] Center ${centerId} suggestPartLots FULL response:`, JSON.stringify(lotsResult, null, 2));
                            
                            // Parse available quantity từ suggestPartLots
                            const suggestedItems = Array.isArray(lotsResult?.suggestedItems) ? lotsResult.suggestedItems : [];
                            const accurateAvailabilities = {};
                            
                            console.log(`[Verify] Center ${centerId} - suggestPartLots returned ${suggestedItems.length} items:`, suggestedItems);
                            
                            // ⚠️ Nếu suggestPartLots trả trống → hiển thị "hết hàng"
                            if (suggestedItems.length === 0) {
                                console.warn(`[Verify] ⚠️ Center ${centerId} - suggestPartLots trả về trống → HẾT HÀNG`);
                                // Set available = 0 cho tất cả parts
                                Object.keys(requiredByPartId).forEach(partId => {
                                    accurateAvailabilities[partId] = 0;
                                });
                            } else {
                                // ⚠️ QUAN TRỌNG: Với serialized parts, đếm số lots có availableQuantity > 0
                                // Với non-serialized parts, cộng dồn availableQuantity
                                suggestedItems.forEach(si => {
                                    const partId = si.partId;
                                    if (!partId) return;
                                    
                                    const isSerialized = partInfo[partId]?.isSerialized ?? false;
                                    const availQty = Number(si.availableQuantity ?? si.suggestedQuantity ?? 0);
                                    
                                    // ⚠️ QUAN TRỌNG: Chỉ tính lots có availableQuantity > 0
                                    if (availQty <= 0) {
                                        console.log(`[Verify] Center ${centerId}, Part ${partId}: lot ${si.partLotId} - SKIP (availableQuantity=${availQty} <= 0)`);
                                        return; // Bỏ qua lots không có hàng
                                    }
                                    
                                    if (isSerialized) {
                                        // Serialized: mỗi lot có availableQuantity > 0 = 1 đơn vị
                                        // Đếm số lots có availableQuantity > 0
                                        accurateAvailabilities[partId] = (accurateAvailabilities[partId] || 0) + 1;
                                        console.log(`[Verify] Center ${centerId}, Part ${partId} (SERIALIZED): lot ${si.partLotId} - availableQuantity=${si.availableQuantity}, counted as 1`);
                                    } else {
                                        // Non-serialized: cộng dồn availableQuantity
                                        accurateAvailabilities[partId] = (accurateAvailabilities[partId] || 0) + availQty;
                                        console.log(`[Verify] Center ${centerId}, Part ${partId} (NON-SERIALIZED): lot ${si.partLotId} - availableQuantity=${si.availableQuantity}, added=${availQty}`);
                                    }
                                });
                            }
                            
                            console.log(`[Verify] Center ${centerId} - Total accurateAvailabilities:`, accurateAvailabilities);
                            
                            // ⚠️ QUAN TRỌNG: Kiểm tra xem có part nào không có trong accurateAvailabilities không
                            // Nếu part không có trong suggestedItems, có nghĩa là center không có part đó
                            Object.keys(requiredByPartId).forEach(partId => {
                                if (!(partId in accurateAvailabilities)) {
                                    accurateAvailabilities[partId] = 0;
                                    console.warn(`[Verify] ⚠️ Center ${centerId}, Part ${partId}: KHÔNG CÓ trong suggestedItems - set available = 0`);
                                }
                            });
                            
                            // Verify xem center có đủ hàng không - so sánh với requiredByPartId
                            let canFulfillAllAccurate = true;
                            let partsCanFulfillFullyAccurate = 0;
                            const verificationDetails = [];
                            
                            console.log(`[Verify] Center ${centerId} - Starting verification. Required:`, requiredByPartId, "Available:", accurateAvailabilities);
                            
                            Object.keys(requiredByPartId).forEach(partId => {
                                const required = Number(requiredByPartId[partId]) || 0;
                                const available = Number(accurateAvailabilities[partId] || 0);
                                
                                // ⚠️ QUAN TRỌNG: available phải >= required (không được ít hơn)
                                const isEnough = available >= required && available > 0;
                                
                                verificationDetails.push({ partId, required, available, isEnough });
                                
                                const partName = partInfo[partId]?.partName || partId;
                                const isSerialized = partInfo[partId]?.isSerialized ?? false;
                                const partType = isSerialized ? "SERIALIZED" : "NON-SERIALIZED";
                                
                                console.log(`[Verify] Center ${centerId}, Part ${partId} (${partType}): required=${required}, available=${available}, isEnough=${isEnough}`);
                                
                                if (isEnough) {
                                    partsCanFulfillFullyAccurate++;
                                    console.log(`[Verify] ✅ Center ${centerId}, Part ${partName}: ĐỦ HÀNG (${available} >= ${required})`);
                                } else {
                                    canFulfillAllAccurate = false;
                                    console.warn(`[Verify] ❌ Center ${centerId}, Part ${partName}: KHÔNG ĐỦ HÀNG - cần ${required}, chỉ có ${available}`);
                                }
                            });
                            
                            // ⚠️ FINAL CHECK: Đảm bảo canFulfillAllAccurate chỉ = true khi TẤT CẢ parts đều đủ
                            if (canFulfillAllAccurate && verificationDetails.some(d => !d.isEnough)) {
                                console.error(`[Verify] ❌❌❌ Center ${centerId} - LOGIC ERROR: canFulfillAllAccurate=true nhưng có parts không đủ!`);
                                canFulfillAllAccurate = false;
                            }
                            
                            console.log(`[Verify] Center ${centerId} - Verification summary: canFulfillAll=${canFulfillAllAccurate}, partsCanFulfillFully=${partsCanFulfillFullyAccurate}`);
                            
                            console.log(`[Verify] Center ${centerId} final result: canFulfillAll=${canFulfillAllAccurate}, details:`, verificationDetails);
                            
                            return {
                                centerId,
                                partAvailabilities: accurateAvailabilities,
                                canFulfillAll: canFulfillAllAccurate,
                                partsCanFulfillFully: partsCanFulfillFullyAccurate,
                                hasEnoughStock: canFulfillAllAccurate, // Chỉ đủ hàng nếu canFulfillAll = true
                                verificationDetails
                            };
                        } catch (e) {
                            console.error(`[loadCenterSuggestions] Failed to verify center ${centerId}:`, e);
                            return {
                                centerId,
                                partAvailabilities: {},
                                canFulfillAll: false,
                                partsCanFulfillFully: 0,
                                hasEnoughStock: false,
                                verificationDetails: []
                            };
                        }
                    });
                    
                    // Chờ tất cả verifications
                    const verificationResults = await Promise.all(verificationPromises);
                    
                    // Update centerMap với số lượng chính xác và filter bỏ centers không đủ hàng
                    const centersToRemove = [];
                    verificationResults.forEach(result => {
                        const center = centerMap.get(result.centerId);
                        if (center) {
                            center.partAvailabilities = result.partAvailabilities;
                            center.canFulfillAll = result.canFulfillAll;
                            center.partsCanFulfillFully = result.partsCanFulfillFully;
                            
                            // ⚠️ Đánh dấu để xóa nếu không đủ hàng
                            if (!result.hasEnoughStock) {
                                centersToRemove.push(result.centerId);
                                const details = result.verificationDetails.map(d => 
                                    `Part ${d.partId}: cần ${d.required}, có ${d.available}`
                                ).join(", ");
                                console.log(`[loadCenterSuggestions] ❌ Center ${result.centerId} KHÔNG ĐỦ HÀNG - ${details}`);
                            } else {
                                console.log(`[loadCenterSuggestions] ✅ Center ${result.centerId} ĐỦ HÀNG`);
                            }
                        }
                    });
                    
                    // Xóa các centers không đủ hàng
                    centersToRemove.forEach(centerId => {
                        centerMap.delete(centerId);
                    });
                    
                    console.log(`[loadCenterSuggestions] ✅ Sau khi verify: ${centerMap.size} centers đủ hàng, ❌ ${centersToRemove.length} centers bị loại bỏ`);
                }

                // Convert map thành array và normalize format
                // ⚠️ CHỈ lấy những centers có canFulfillAll = true (đã được verify)
                const normalized = Array.from(centerMap.values())
                    .filter(center => {
                        // Double-check: chỉ lấy centers có canFulfillAll = true
                        const isValid = center.canFulfillAll === true;
                        if (!isValid) {
                            console.warn(`[loadCenterSuggestions] ❌ Filtering out center ${center.centerId} (${center.centerName}) - canFulfillAll=${center.canFulfillAll}`);
                            console.warn(`[loadCenterSuggestions] ❌ Center ${center.centerId} partAvailabilities:`, center.partAvailabilities);
                            console.warn(`[loadCenterSuggestions] ❌ Center ${center.centerId} requiredByPartId:`, requiredByPartId);
                        } else {
                            // Verify lại một lần nữa để chắc chắn
                            let allPartsEnough = true;
                            Object.keys(requiredByPartId).forEach(partId => {
                                const required = Number(requiredByPartId[partId]) || 0;
                                const available = Number(center.partAvailabilities[partId] || 0);
                                if (available < required || available === 0) {
                                    allPartsEnough = false;
                                    console.error(`[loadCenterSuggestions] ❌❌❌ Center ${center.centerId} - Part ${partId}: available=${available} < required=${required} - KHÔNG ĐỦ!`);
                                }
                            });
                            if (!allPartsEnough) {
                                console.error(`[loadCenterSuggestions] ❌❌❌ Center ${center.centerId} (${center.centerName}) - KHÔNG ĐỦ HÀNG nhưng canFulfillAll=true - SẼ BỊ LOẠI BỎ!`);
                                return false; // Loại bỏ center này
                            }
                        }
                        return isValid;
                    })
                    .map(center => {
                        // Log để debug
                        console.log(`[loadCenterSuggestions] ✅ Including center ${center.centerId} (${center.centerName}) with partAvailabilities:`, center.partAvailabilities);
                        return {
                    centerIds: [center.centerId],
                    centerNames: [center.centerName],
                    items: [],
                            canFulfillAll: true, // ⚠️ Đảm bảo luôn là true vì đã filter
                    partsCanFulfillFully: center.partsCanFulfillFully,
                            partAvailabilities: center.partAvailabilities || {}, // ⚠️ QUAN TRỌNG: Copy partAvailabilities từ verification
                        };
                    });

                console.log(`[loadCenterSuggestions] Final normalized centers (only canFulfillAll=true):`, normalized.length);
                normalized.forEach((n, idx) => {
                    console.log(`[loadCenterSuggestions] Normalized center ${idx + 1}:`, {
                        centerId: n.centerIds[0],
                        centerName: n.centerNames[0],
                        canFulfillAll: n.canFulfillAll,
                        partAvailabilities: n.partAvailabilities
                    });
                });

                if (normalized.length === 0) {
                    setHasNoCenters(true);
                    setCenterSuggestions([]);
                } else {
                    setCenterSuggestions(normalized);
                }
            }
        } catch (e) {
            console.error("[suggestCenter] Error:", e);
            setHasNoCenters(true);
            setCenterSuggestions([]);
            // Không hiển thị error snackbar ở đây vì đây là auto-load
        } finally {
            setLoadingSuggestions(false);
        }
    };

    // Không cần approveFromDetail nữa - khi tạo shipment thành công thì tự động approve

    const rejectFromDetail = async () => {
        if (!viewData?.id) return;
        const reason = detailRejectReason.trim();
        if (!reason) { notify("Vui lòng nhập lý do từ chối.", "warning"); return; }
        setDetailSubmitting(true);
        try {
            await ticketService.updateStatus(viewData.id, TICKET_STATUS.REJECTED, reason);
            setViewOpen(false);
            await load();
        } catch (e) {
            notify("⚠️ Từ chối thất bại: " + (e?.response?.data?.message || e.message), "error");
        } finally {
            setDetailSubmitting(false);
        }
    };

    // ====== SHIPMENT HANDLERS (ĐƯA RA NGOÀI) ======
    const getMaxQuantityByPartId = useMemo(() => {
        if (!viewData?.items) return {};
        const maxMap = {};
        Array.isArray(viewData.items) && viewData.items.forEach(item => {
            const partId = item.partId || item.part?.id;
            if (partId) {
                const qty = item.requireQuantity ?? item.quantity ?? 0;
                maxMap[partId] = (maxMap[partId] || 0) + Number(qty);
            }
        });
        return maxMap;
    }, [viewData?.items]);

    const getCurrentTotalQuantityByPartId = useMemo(() => {
        const totalMap = {};
        shipmentItems.forEach(item => {
            if (item.partId) {
                totalMap[item.partId] = (totalMap[item.partId] || 0) + Number(item.quantity || 0);
            }
        });
        return totalMap;
    }, [shipmentItems]);

    // Load lots dùng suggest-part-lots API
    const loadLotsForPart = async (partId, centerId) => {
        if (!partId || !centerId || !centerId.trim()) return [];
        try {
            const result = await shipmentService.suggestPartLots({
                centerId,
                parts: [{ partId, quantity: 1 }] // Tạm thời dùng quantity=1, có thể adjust sau
            });
            // Response format: { partId: { partLots: [...] } } hoặc { partLots: [...] }
            const partData = result[partId] || result;
            const lots = Array.isArray(partData?.partLots) ? partData.partLots :
                Array.isArray(partData) ? partData : [];
            return lots;
        } catch (e) {
            console.error("Load lots failed:", e);
            return [];
        }
    };

    const openShipmentDialog = async () => {
        if (!viewData) return;

        // Initialize shipment items từ center suggestions (chọn tất cả parts từ ticket)
        const allPartIds = Array.isArray(viewData.items)
            ? viewData.items.map(i => i.partId || i.part?.id).filter(Boolean)
            : [];

        setShipmentItems([]);
        setShipmentNote("");
        setShipmentFromCenterId("");
        setAvailableLots({});
        setPartInfoMap({});
        // Center-to-Center: chọn tất cả parts từ ticket
        setSelectedPartIds(new Set(allPartIds));
        setShipmentDialogOpen(true);

        // Nếu đã có center suggestions, sử dụng chúng để populate shipmentCenters
        if (centerSuggestions.length > 0) {
            const allCenterIds = new Set();
            const centerMap = new Map();

            centerSuggestions.forEach(s => {
                const ids = Array.isArray(s.centerIds) ? s.centerIds : [s.centerIds].filter(Boolean);
                const names = Array.isArray(s.centerNames) ? s.centerNames : [s.centerNames].filter(Boolean);
                ids.forEach((id, idx) => {
                    const cid = String(id);
                    if (!allCenterIds.has(cid)) {
                        allCenterIds.add(cid);
                        centerMap.set(cid, {
                            id: cid,
                            centerId: cid,
                            name: names[idx] || `Center ${cid}`,
                            centerName: names[idx] || `Center ${cid}`,
                            items: s.items || [],
                        });
                    }
                });
            });

            const ticketDestinationCenterId = viewData?.centerId ? String(viewData.centerId) : null;
            const filtered = Array.from(centerMap.values()).filter(c => String(c.centerId) !== ticketDestinationCenterId);
            setShipmentCenters(filtered);
        }

        // Load part info for ALL items
        const partIdsToLoad = allPartIds;

        if (partIdsToLoad.length > 0) {
            setLoadingPartInfo(true);
            try {
                // lấy toàn bộ parts (hoặc bạn có thể làm endpoint get-by-ids nếu có)
                const allParts = await partService.getAll();
                const byId = {};
                (Array.isArray(allParts) ? allParts : []).forEach(p => {
                    if (p?.id) byId[p.id] = p;
                });

                const newInfoMap = {};
                partIdsToLoad.forEach(pid => {
                    const p = byId[pid];
                    if (!p) return;
                    const raw = p.isSerialized;

                    // chuẩn hóa kiểu bool cho isSerialized
                    const isSerialized =
                        typeof raw === "boolean"
                            ? raw
                            : typeof raw === "number"
                                ? raw === 1
                                : typeof raw === "string"
                                    ? ["1", "true"].includes(raw.toLowerCase())
                                    : false;

                    newInfoMap[pid] = {
                        isSerialized,
                        partNo: p.partNo || "",
                        partName: p.partName || "",
                    };
                    console.log(
                        `[PART INFO] ${p.partNo} (${p.id}) → DB: ${raw} (${typeof raw}) → UI: ${isSerialized ? "SERIALIZED" : "NON-SERIALIZED"
                        }`
                    );
                });

                setPartInfoMap(newInfoMap);
            } finally {
                setLoadingPartInfo(false);
            }
        }
    };

    // Không cần handleShipmentTypeChange nữa vì chỉ có Center-to-Center

    // Toggle chọn/bỏ chọn phụ tùng (chỉ dùng cho Center-to-Center)
    const togglePartSelection = async (partId) => {
        const newSelected = new Set(selectedPartIds);
        if (newSelected.has(partId)) {
            newSelected.delete(partId);
            // Xóa TẤT CẢ items có cùng partId (tránh duplicate)
            setShipmentItems(items => items.filter(item => item.partId !== partId));
        } else {
            newSelected.add(partId);
            // Kiểm tra xem đã có item với partId này chưa
            const existingItem = shipmentItems.find(item => item.partId === partId);
            if (existingItem) {
                // Đã có rồi, không thêm nữa
                return;
            }

            // Thêm item vào shipmentItems từ viewData
            const ticketItem = viewData?.items?.find(it => (it.partId || it.part?.id) === partId);
            if (ticketItem) {
                const itemPartId = ticketItem.partId || ticketItem.part?.id || null;
                const newItem = {
                    id: `${itemPartId}-${Date.now()}-${Math.random()}`, // Unique ID: partId-timestamp-random
                    partId: itemPartId,
                    partName: ticketItem.partName || ticketItem.part?.name || "—",
                    partNo: ticketItem.partNo || ticketItem.part?.partNo || "—",
                    quantity: 0, // Sẽ được cập nhật khi chọn center
                    requiredQuantity: ticketItem.requireQuantity ?? ticketItem.quantity ?? 0, // Giữ lại để hiển thị
                    isSerialized: partInfoMap[itemPartId]?.isSerialized ?? null,
                    serialNo: "",
                    batchNo: "",
                    mfgDate: "",
                    partLotId: "",
                    partLot: null,
                };
                setShipmentItems(items => [...items, newItem]);
            }
        }
        // Cập nhật selectedPartIds - dùng Array.from để trigger useEffect
        setSelectedPartIds(newSelected);
    };

    // Thêm 1 dòng cho phụ tùng serialized (Center -> Center): mỗi dòng = 1 lot
    const addSerializedLotRow = (partId) => {
        const base = shipmentItems.find(i => i.partId === partId);
        if (!base) return;
        // chọn lot chưa dùng nếu có
        const lots = availableLots[partId] || [];
        const used = new Set(shipmentItems.filter(i => i.partId === partId && i.partLotId).map(i => i.partLotId));
        const free = lots.find(l => !used.has(l.partLotId || l.id));
        const newItem = {
            id: `${partId}-${Date.now()}-${Math.random()}`,
            partId,
            partName: base.partName,
            partNo: base.partNo,
            quantity: 1,
            requiredQuantity: base.requiredQuantity,
            isSerialized: true,
            serialNo: "",
            batchNo: "",
            mfgDate: "",
            partLotId: free ? (free.partLotId || free.id) : "",
            partLot: free || null,
        };
        setShipmentItems(items => [...items, newItem]);
    };

    // Xóa 1 dòng item (dùng cho serialized multi-row)
    const removeItemRow = (itemId) => {
        setShipmentItems(items => items.filter(i => i.id !== itemId));
    };

    const handleFromCenterChange = async (centerId) => {
        setShipmentFromCenterId(centerId);
        setShipmentItems(items => items.map(item => ({ ...item, partLotId: "", partLot: null })));
        if (centerId && selectedPartIds.size > 0) {
            setLoadingLots(true);
            try {
                // Dùng suggest-part-lots API để load tất cả lots cho các parts đã chọn
                // Lấy partQuantities từ viewData.items (ticket items) thay vì shipmentItems
                const partQuantities = Array.isArray(viewData?.items)
                    ? viewData.items
                        .filter(item => {
                            const partId = item.partId || item.part?.id;
                            return partId && selectedPartIds.has(partId);
                        })
                    .map(item => ({
                            partId: item.partId || item.part?.id,
                            quantity: item.requireQuantity ?? item.quantity ?? 1
                        }))
                    : [];

                if (partQuantities.length > 0) {
                    const result = await shipmentService.suggestPartLots({
                        centerId,
                        partQuantities // 👈 đúng theo Swagger
                    });

                    console.log("[suggest-part-lots] Response:", result);

                    // Response format: { centerId, centerName, suggestedItems: [...], message }
                    const suggestedItems = Array.isArray(result?.suggestedItems) ? result.suggestedItems : [];
                    const lotsMap = {};          // { partId: Lot[] }
                    const availableQtyMap = {};  // { partId: totalAvailable }

                    for (const si of suggestedItems) {
                        const partId = si.partId;
                        if (!partId) continue;

                        // Chuẩn hoá Lot
                        const lot = {
                            id: si.partLotId,
                            partLotId: si.partLotId,
                            partId: si.partId,
                            partNo: si.partNo,
                            partName: si.partName,
                            batchNo: si.batchNo,
                            mfgDate: si.mfgDate,
                            serialNo: si.serialNo,
                            availableQuantity: si.availableQuantity ?? 0,
                            suggestedQuantity: si.suggestedQuantity ?? 0,
                            // Tên hiện thị: ưu tiên serialNo, sau đó batchNo, cuối cùng partLotId
                            name: si.serialNo || si.batchNo || si.partLotId,
                            lotName: si.serialNo || si.batchNo || si.partLotId,
                        };

                        // Push và dedupe theo partLotId
                        if (!lotsMap[partId]) lotsMap[partId] = [];
                        if (!lotsMap[partId].some(l => (l.partLotId || l.id) === (lot.partLotId || lot.id))) {
                            lotsMap[partId].push(lot);
                            availableQtyMap[partId] = (availableQtyMap[partId] || 0) + lot.availableQuantity;
                        }
                    }

                    setAvailableLots(lotsMap);

                    // Tạo shipmentItems từ ticket items nếu chưa có
                    if (shipmentItems.length === 0 && Array.isArray(viewData?.items)) {
                        const newItems = viewData.items
                            .filter(item => {
                                const partId = item.partId || item.part?.id;
                                return partId && selectedPartIds.has(partId);
                            })
                            .map((item, idx) => {
                                const partId = item.partId || item.part?.id;
                                return {
                                    id: `${partId}-${idx}-${Date.now()}`,
                                    partId: partId,
                                    partName: item.partName || item.part?.name || "—",
                                    partNo: item.partNo || item.part?.partNo || "—",
                                    quantity: 0, // Sẽ được set sau
                                    requiredQuantity: item.requireQuantity ?? item.quantity ?? 0,
                                    isSerialized: partInfoMap[partId]?.isSerialized ?? null,
                                    serialNo: "",
                                    batchNo: "",
                                    mfgDate: "",
                                    partLotId: "",
                                    partLot: null,
                                };
                            });
                        setShipmentItems(newItems);
                    }

                    // Ghi nhận part thiếu tồn kho so với yêu cầu ticket
                    const insuff = {};
                    // Lấy required quantity từ ticket items (chính xác hơn)
                    const ticketItemsForSelected = Array.isArray(viewData?.items) 
                        ? viewData.items.filter(item => {
                        const partId = item.partId || item.part?.id;
                            return partId && selectedPartIds.has(partId);
                        })
                        : [];
                    
                    ticketItemsForSelected.forEach(ticketItem => {
                        const partId = ticketItem.partId || ticketItem.part?.id;
                        if (!partId) return;
                        const required = Number(ticketItem.requireQuantity ?? ticketItem.quantity ?? 0);
                        const totalAvail = availableQtyMap[partId] || 0;
                        console.log(`[Validation] Part ${partId}: required=${required}, available=${totalAvail}`);
                        if (required > totalAvail) {
                            insuff[partId] = { 
                                required, 
                                totalAvail,
                                partName: ticketItem.partName || ticketItem.part?.name || partId
                            };
                        }
                    });
                    setInsufficientByPart(insuff);
                    
                    // ⚠️ Cảnh báo nếu center không đủ hàng cho bất kỳ part nào
                    const insufficientParts = Object.keys(insuff);
                    if (insufficientParts.length > 0) {
                        const partNames = insufficientParts.map(pid => {
                            const info = insuff[pid];
                            return `${info.partName} (cần ${info.required}, có ${info.totalAvail})`;
                        }).join(", ");
                        notify(`⚠️ Center này không đủ hàng: ${partNames}. Vui lòng chọn center khác.`, "error");
                        // Reset center selection nếu không đủ hàng
                        setShipmentFromCenterId("");
                        setAvailableLots({});
                        setShipmentItems([]);
                        return; // Dừng lại, không tiếp tục tạo shipment items
                    }

                    // ⛔ Clamp + auto-assign lots và fill quantity
                    setShipmentItems(prev => {
                        // Nếu prev rỗng, tạo từ ticket items
                        let next = prev.length > 0 ? [...prev] : (Array.isArray(viewData?.items) ? viewData.items
                            .filter(item => {
                                const partId = item.partId || item.part?.id;
                                return partId && selectedPartIds.has(partId);
                            })
                            .map((item, idx) => {
                                const partId = item.partId || item.part?.id;
                                return {
                                    id: `${partId}-${idx}-${Date.now()}`,
                                    partId: partId,
                                    partName: item.partName || item.part?.name || "—",
                                    partNo: item.partNo || item.part?.partNo || "—",
                                    quantity: 0,
                                    requiredQuantity: item.requireQuantity ?? item.quantity ?? 0,
                                    isSerialized: partInfoMap[partId]?.isSerialized ?? null,
                                    serialNo: "",
                                    batchNo: "",
                                    mfgDate: "",
                                    partLotId: "",
                                    partLot: null,
                                };
                            }) : []);
                        
                        next = next.map(it => {
                            if (!it.partId) return it;
                            const isSerialized = it.isSerialized ?? partInfoMap[it.partId]?.isSerialized ?? false;
                            const totalAvail = availableQtyMap[it.partId] || 0;
                            const want = Number(it.requiredQuantity) || 0;
                            return {
                                ...it,
                                // Non-serialized: set quantity từ available hoặc required
                                quantity: isSerialized ? 1 : Math.min(want || totalAvail || 1, totalAvail || want || 1),
                            };
                        });

                        // Tự tạo đủ dòng cho serialized và gán lot không trùng
                        // ⚠️ QUAN TRỌNG: Chỉ tạo số dòng = số lots có availableQuantity > 0, không vượt quá required
                        const partIds = Array.from(new Set(next.map(i => i.partId).filter(Boolean)));
                        for (const pid of partIds) {
                            const isSerialized = partInfoMap[pid]?.isSerialized ?? false;
                            if (!isSerialized) continue;
                            const lots = lotsMap[pid] || [];
                            // ⚠️ Chỉ tính lots có availableQuantity > 0
                            const availableLots = lots.filter(l => (l.availableQuantity || 0) > 0);
                            const required = (next.find(i => i.partId === pid)?.requiredQuantity) || 0;
                            // ⚠️ Chỉ tạo số dòng = số lots available (có availableQuantity > 0), không vượt quá required
                            const maxRows = Math.min(required, availableLots.length);
                            const rows = next.filter(i => i.partId === pid);
                            // Thêm dòng tới khi đủ maxRows (không vượt quá số lots available)
                            while (rows.length < maxRows) {
                                const base = rows[0];
                                next.push({
                                    id: `${pid}-${Date.now()}-${Math.random()}`,
                                    partId: pid,
                                    partName: base?.partName || "",
                                    partNo: base?.partNo || "",
                                    quantity: 1,
                                    requiredQuantity: required,
                                    isSerialized: true,
                                    serialNo: "",
                                    batchNo: "",
                                    mfgDate: "",
                                    partLotId: "",
                                    partLot: null,
                                });
                                rows.push({});
                            }
                            // Gán lot không trùng (chỉ từ availableLots)
                            const used = new Set(next.filter(i => i.partId === pid && i.partLotId).map(i => i.partLotId));
                            for (const row of next.filter(i => i.partId === pid)) {
                                if (row.partLotId) continue;
                                const free = availableLots.find(l => !used.has(l.partLotId || l.id));
                                if (free) {
                                    row.partLotId = free.partLotId || free.id;
                                    row.partLot = free;
                                    used.add(row.partLotId);
                                }
                            }
                        }
                        return next;
                    });
                }
            } catch (e) {
                console.error("Load lots failed:", e);
                setAvailableLots({});
            } finally {
                setLoadingLots(false);
            }
        }
    };

    const updateShipmentItem = (itemId, field, value) => {
        // Validate quantity nếu đang update quantity (chỉ cho Center-to-Center)
        if (field === "quantity") {
            const item = shipmentItems.find(i => i.id === itemId);
            if (item && item.partId) {
                const newQty = Number(value) || 0;
                
                // ⚠️ QUAN TRỌNG: Lấy số lượng yêu cầu từ ticket (không được nhỏ hơn)
                const requiredQty = item.requiredQuantity || 0;
                const ticketMax = getMaxQuantityByPartId[item.partId] ?? requiredQty ?? Infinity;
                
                const lots = availableLots[item.partId] || [];
                const lot = lots.find(l => (l.id || l.lotId || l.partLotId) === item.partLotId);
                const lotAvail = lot ? (lot.availableQuantity ?? lot.availableQty ?? Infinity) : Infinity;
                
                // ⚠️ QUAN TRỌNG: Số lượng PHẢI BẰNG requiredQty (không được ít hơn, không được nhiều hơn)
                // Nếu user nhập số khác requiredQty, tự động điều chỉnh về requiredQty
                let finalQty = newQty;
                
                // ⚠️ QUAN TRỌNG: Số lượng phải BẰNG yêu cầu ticket
                if (requiredQty > 0 && newQty !== requiredQty) {
                    finalQty = requiredQty;
                    notify(`Số lượng phải = ${requiredQty} (yêu cầu ticket). Đã điều chỉnh về ${finalQty}.`, "warning");
                }
                
                // Kiểm tra không vượt quá tồn kho
                const maxQty = Math.min(ticketMax, lotAvail);
                if (finalQty > maxQty) {
                    finalQty = maxQty;
                    notify(`Số lượng tối đa cho lot này là ${maxQty}. Đã điều chỉnh về ${finalQty}.`, "warning");
                }
                
                // Đảm bảo >= 1
                finalQty = Math.max(1, finalQty);
                
                console.log(`[updateShipmentItem] Part ${item.partId}: newQty=${newQty}, requiredQty=${requiredQty}, finalQty=${finalQty}, maxQty=${maxQty}`);
                
                setShipmentItems(prev => prev.map(i =>
                    i.id === itemId ? { ...i, quantity: finalQty } : i
                ));
                return;
            }
        }

        // Các field khác → Cập nhật bình thường
        setShipmentItems(items => items.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const handleShipmentItemLotChange = async (itemId, partLotId) => {
        const item = shipmentItems.find(i => i.id === itemId);
        if (!item || !item.partId || !shipmentFromCenterId) return;

        const lots = availableLots[item.partId] || [];
        const selectedLot = lots.find(lot => (lot.id || lot.lotId || lot.partLotId) === partLotId);

        // Không cho 2 dòng cùng part chọn trùng 1 lot
        const duplicated = shipmentItems.some(i =>
            i.id !== itemId && i.partId === item.partId && i.partLotId === partLotId
        );
        if (duplicated) {
            notify("Lot đã được chọn ở dòng khác. Vui lòng chọn lot khác.", "warning");
            return;
        }

        updateShipmentItem(itemId, "partLotId", partLotId);
        updateShipmentItem(itemId, "partLot", selectedLot || null);

        // Non-serialized: clamp theo tồn của lot
        const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
        if (!isSerialized && selectedLot) {
            const avail = selectedLot?.availableQuantity ?? 0;
            const now = Number(item.quantity) || 1;
            updateShipmentItem(itemId, "quantity", Math.min(now, Math.max(1, avail)));
        }
    };

    // Helper: Check xem có đủ hàng để tạo shipment không
    const canCreateShipment = React.useMemo(() => {
        if (!shipmentFromCenterId || shipmentItems.length === 0) return false;
        if (!viewData?.items || !Array.isArray(viewData.items)) return false;
        
        // Tính tổng số lượng muốn ship cho mỗi partId
        const totalQuantityByPartId = {};
        shipmentItems.forEach(item => {
            if (item.partId) {
                totalQuantityByPartId[item.partId] = (totalQuantityByPartId[item.partId] || 0) + Number(item.quantity || 0);
            }
        });
        
        // Tính số lượng yêu cầu từ ticket cho các parts đã chọn
        const requiredQuantityByPartId = {};
        viewData.items.forEach(ticketItem => {
            const partId = ticketItem.partId || ticketItem.part?.id;
            if (partId && selectedPartIds.has(partId)) {
                requiredQuantityByPartId[partId] = (requiredQuantityByPartId[partId] || 0) + Number(ticketItem.requireQuantity ?? ticketItem.quantity ?? 0);
            }
        });
        
        // Check từng item: phải có đầy đủ thông tin
        for (const item of shipmentItems) {
            if (!item.partId || !item.partLotId || !item.quantity || Number(item.quantity) < 1) {
                return false;
            }
            
            // Check lot đã chọn có đủ không
            const lots = availableLots[item.partId] || [];
            const selectedLot = lots.find(l => (l.partLotId || l.id) === item.partLotId);
            if (!selectedLot || Number(item.quantity) > Number(selectedLot.availableQuantity || 0)) {
                return false;
            }
        }
        
        // Check theo partId: tổng số lượng muốn ship không vượt quá tồn kho
        const validatedPartIds = new Set();
        for (const item of shipmentItems) {
            if (!item.partId || validatedPartIds.has(item.partId)) continue;
            validatedPartIds.add(item.partId);
            
            const lots = availableLots[item.partId] || [];
            const totalAvail = lots.reduce((s, l) => s + Number(l.availableQuantity || 0), 0);
            const totalWantToShip = totalQuantityByPartId[item.partId] || 0;
            
            // Không đủ hàng trong kho
            if (totalAvail === 0 || totalWantToShip > totalAvail) {
                return false;
            }
        }
        
        // ⚠️ QUAN TRỌNG: Kiểm tra số lượng ship phải BẰNG số lượng yêu cầu trong ticket
        // Chỉ check các parts đã được chọn và có trong shipmentItems
        const shipmentPartIds = new Set(shipmentItems.map(item => item.partId).filter(Boolean));
        
        console.log(`[canCreateShipment] Debug info:`, {
            selectedPartIds: Array.from(selectedPartIds),
            shipmentPartIds: Array.from(shipmentPartIds),
            requiredQuantityByPartId,
            totalQuantityByPartId,
            shipmentItems: shipmentItems.map(item => ({ partId: item.partId, quantity: item.quantity }))
        });
        
        // ⚠️ QUAN TRỌNG: Đảm bảo tất cả parts đã chọn đều có trong shipmentItems
        // Nếu có part được chọn nhưng không có trong shipmentItems, không cho phép tạo shipment
        for (const partId of selectedPartIds) {
            if (!shipmentPartIds.has(partId)) {
                console.log(`[canCreateShipment] ❌ Part ${partId} được chọn nhưng chưa có trong shipmentItems`);
                return false;
            }
        }
        
        // Kiểm tra số lượng ship phải BẰNG số lượng yêu cầu cho TẤT CẢ parts đã chọn
        for (const partId of selectedPartIds) {
            const required = requiredQuantityByPartId[partId] || 0;
            const shipping = totalQuantityByPartId[partId] || 0;
            
            console.log(`[canCreateShipment] Checking part ${partId}: required=${required}, shipping=${shipping}`);
            
            // Nếu ticket không yêu cầu part này (required = 0), không cần check
            if (required === 0) {
                console.log(`[canCreateShipment] ⚠️ Part ${partId}: required=0, bỏ qua`);
                continue;
            }
            
            // ⚠️ QUAN TRỌNG: Số lượng ship PHẢI BẰNG số lượng yêu cầu (không được ít hơn, không được nhiều hơn)
            if (shipping !== required) {
                console.log(`[canCreateShipment] ❌ Part ${partId}: required=${required}, shipping=${shipping} - KHÔNG KHỚP (sẽ disable button)`);
                return false;
            }
            
            console.log(`[canCreateShipment] ✅ Part ${partId}: required=${required}, shipping=${shipping} - KHỚP`);
        }
        
        console.log(`[canCreateShipment] ✅ Tất cả parts đều khớp với yêu cầu ticket - ENABLE button`);
        return true;
    }, [
        shipmentFromCenterId, 
        shipmentItems, // ⚠️ QUAN TRỌNG: Khi quantity thay đổi, shipmentItems sẽ thay đổi và trigger re-calculation
        availableLots, 
        viewData?.items, 
        Array.from(selectedPartIds).sort().join(','), // ⚠️ Convert Set thành string để React detect thay đổi
        getMaxQuantityByPartId
    ]);

    const createShipment = async () => {
        if (!viewData?.id) return;
        if (!shipmentFromCenterId) {
            notify("Vui lòng chọn trung tâm gửi hàng (fromCenterId)", "warning");
            return;
        }

        // Validate: Center-to-Center phải chọn ít nhất 1 phụ tùng
        if (selectedPartIds.size === 0) {
            notify("Vui lòng chọn ít nhất một phụ tùng để ship", "warning");
                    return;
                }

        // Validate items theo backend rules (Center-to-Center)
        // Tính tổng số lượng thực tế muốn ship cho mỗi partId
        const totalQuantityByPartId = {};
        shipmentItems.forEach(item => {
            if (item.partId) {
                totalQuantityByPartId[item.partId] = (totalQuantityByPartId[item.partId] || 0) + Number(item.quantity || 0);
            }
        });
        
        // ⚠️ QUAN TRỌNG: Validate số lượng ship phải BẰNG số lượng yêu cầu trong ticket
        const requiredQuantityByPartId = {};
        if (Array.isArray(viewData?.items)) {
            viewData.items.forEach(ticketItem => {
                const partId = ticketItem.partId || ticketItem.part?.id;
                if (partId && selectedPartIds.has(partId)) {
                    requiredQuantityByPartId[partId] = (requiredQuantityByPartId[partId] || 0) + Number(ticketItem.requireQuantity ?? ticketItem.quantity ?? 0);
                }
            });
        }
        
        // ⚠️ QUAN TRỌNG: Đảm bảo tất cả parts đã chọn đều có trong shipmentItems
        const shipmentPartIds = new Set(shipmentItems.map(item => item.partId).filter(Boolean));
        for (const partId of selectedPartIds) {
            if (!shipmentPartIds.has(partId)) {
                const ticketItem = viewData.items.find(item => (item.partId || item.part?.id) === partId);
                const partName = ticketItem?.partName || ticketItem?.part?.name || partId;
                notify(`Phụ tùng "${partName}" đã được chọn nhưng chưa được thêm vào danh sách ship. Vui lòng kiểm tra lại.`, "error");
                return;
            }
        }
        
        // Kiểm tra số lượng ship có khớp với yêu cầu không
        for (const partId of selectedPartIds) {
            const required = requiredQuantityByPartId[partId] || 0;
            const shipping = totalQuantityByPartId[partId] || 0;
            
            console.log(`[createShipment] Validating part ${partId}: required=${required}, shipping=${shipping}`);
            
            if (required > 0 && shipping !== required) {
                const partName = shipmentItems.find(item => item.partId === partId)?.partName || partId;
                notify(`Số lượng ship (${shipping}) không khớp với yêu cầu ticket (${required}) cho "${partName}". Vui lòng điều chỉnh số lượng.`, "error");
                return;
            }
        }
        
        console.log(`[createShipment] ✅ Tất cả parts đều khớp với yêu cầu ticket`);

        // ⚠️ Validate theo partId (không phải theo từng item) để tránh duplicate check
        const validatedPartIds = new Set();
        
        for (const item of shipmentItems) {
            if (!item.partId) continue;
            
            // Chỉ validate mỗi partId một lần
            if (validatedPartIds.has(item.partId)) continue;
            validatedPartIds.add(item.partId);
            
                const lots = availableLots[item.partId] || [];
            const totalAvail = lots.reduce((s, l) => s + Number(l.availableQuantity || 0), 0);
            
            // Check 1: Center không có tồn kho
                if (totalAvail === 0) {
                notify(`Center nguồn không có tồn kho cho "${item.partName || item.partId}". Vui lòng chọn center khác hoặc bỏ chọn phụ tùng này.`, "error");
                    return;
                }
            
            // Check 2: Tổng số lượng muốn ship > tồn kho (QUAN TRỌNG NHẤT)
            const totalWantToShip = totalQuantityByPartId[item.partId] || 0;
            if (totalWantToShip > totalAvail) {
                notify(`Center nguồn chỉ có ${totalAvail}/${totalWantToShip} cho "${item.partName || item.partId}". Vui lòng chọn center khác hoặc giảm số lượng.`, "error");
                    return;
                }
            
            console.log(`[createShipment] Part ${item.partId}: totalWantToShip=${totalWantToShip}, totalAvail=${totalAvail}, OK=${totalWantToShip <= totalAvail}`);
        }
        
        // Validate từng item riêng lẻ
        for (const item of shipmentItems) {
                if (!item.quantity || Number(item.quantity) < 1) {
                notify(`Số lượng phải >= 1 cho "${item.partName || item.partId}"`, "error");
                    return;
                }
            
                if (!item.partLotId) {
                notify(`Vui lòng chọn Part Lot cho "${item.partName || item.partId}"`, "error");
                    return;
                }
            
                // Kiểm tra quantity không vượt quá available quantity của lot đã chọn
            const lots = availableLots[item.partId] || [];
                const selectedLot = lots.find(l => (l.partLotId || l.id) === item.partLotId);
            if (selectedLot && Number(item.quantity) > Number(selectedLot.availableQuantity || 0)) {
                notify(`Số lượng cho "${item.partName || item.partId}" (${item.quantity}) vượt quá tồn kho của lot (${selectedLot.availableQuantity})`, "error");
                    return;
                }
        }

        // ⚠️ FINAL VALIDATION: Kiểm tra lại một lần nữa trước khi gửi request
        // Tính lại số lượng yêu cầu và số lượng ship
        const finalRequiredByPartId = {};
        const finalShippingByPartId = {};
        
        if (Array.isArray(viewData?.items)) {
            viewData.items.forEach(ticketItem => {
                const partId = ticketItem.partId || ticketItem.part?.id;
                if (partId && selectedPartIds.has(partId)) {
                    finalRequiredByPartId[partId] = (finalRequiredByPartId[partId] || 0) + Number(ticketItem.requireQuantity ?? ticketItem.quantity ?? 0);
                }
            });
        }
        
        shipmentItems.forEach(item => {
            if (item.partId) {
                finalShippingByPartId[item.partId] = (finalShippingByPartId[item.partId] || 0) + Number(item.quantity || 0);
            }
        });
        
        // Validate số lượng một lần nữa
        for (const partId of selectedPartIds) {
            const required = finalRequiredByPartId[partId] || 0;
            const shipping = finalShippingByPartId[partId] || 0;
            
            if (required > 0 && shipping !== required) {
                const partName = shipmentItems.find(item => item.partId === partId)?.partName || partId;
                notify(`Số lượng ship (${shipping}) không khớp với yêu cầu ticket (${required}) cho "${partName}". Vui lòng điều chỉnh số lượng.`, "error");
                setShipmentSubmitting(false);
                return;
            }
            
            // Validate lại available quantity từ lots
            const lots = availableLots[partId] || [];
            const totalAvail = lots.reduce((s, l) => s + Number(l.availableQuantity || 0), 0);
            if (shipping > totalAvail) {
                const partName = shipmentItems.find(item => item.partId === partId)?.partName || partId;
                notify(`Số lượng ship (${shipping}) vượt quá tồn kho (${totalAvail}) cho "${partName}". Vui lòng điều chỉnh số lượng.`, "error");
                setShipmentSubmitting(false);
                return;
            }
        }
        
        console.log("[createShipment] ✅ Final validation passed:", {
            requiredByPartId: finalRequiredByPartId,
            shippingByPartId: finalShippingByPartId
        });

        setShipmentSubmitting(true);
        try {
                const body = {
                    fromCenterId: shipmentFromCenterId,
                    ticketId: viewData.id,
                    note: shipmentNote.trim() || "",
                    items: shipmentItems.map(item => ({
                        partId: item.partId, // ⚠️ Thêm partId để backend có thể update inventoryPart
                        partLotId: item.partLotId,
                        quantity: Number(item.quantity),
                    })),
                };
                
                console.log("[createShipment] Payload gửi lên API:", JSON.stringify(body, null, 2));
                console.log("[createShipment] Shipment items chi tiết:", shipmentItems.map(item => ({
                    partId: item.partId,
                    partName: item.partName,
                    partLotId: item.partLotId,
                    quantity: item.quantity,
                    requiredQuantity: item.requiredQuantity,
                    availableQuantity: availableLots[item.partId]?.find(l => (l.partLotId || l.id) === item.partLotId)?.availableQuantity
                })));
                console.log("[createShipment] Required vs Shipping:", {
                    required: finalRequiredByPartId,
                    shipping: finalShippingByPartId
                });
                
                const res = await shipmentService.createBetweenCenters(body);
                console.log("[createShipment] API response:", res);
                const newId = res?.id ?? res?.shipmentId ?? res?.data?.id ?? res?.data?.shipmentId;
                if (newId) {
                    try {
                        const s = await shipmentService.get(newId);
                        setTicketShipment(s || { id: newId, status: "REQUESTED" });
                    } catch (_) {
                        setTicketShipment({ id: newId, status: "REQUESTED" });
                    }
                    setCreatedShipmentId(newId);
                    // Chuyển sang tab Chi tiết vận đơn trong Overview
                    try { window.dispatchEvent(new CustomEvent("open-shipment", { detail: { id: newId } })); } catch (_) { }
                    navigate(`/overview`);
                }

            notify("✅ Tạo shipment thành công! Trung tâm nguồn sẽ dispatch shipment này.", "success");

            // ✅ Khi tạo shipment thành công → mới đổi status ticket thành APPROVED
            try {
                await ticketService.updateStatus(
                    viewData.id,
                    TICKET_STATUS.APPROVED,
                    "Đã tạo yêu cầu vận chuyển bổ sung phụ tùng"
                );
                // Cập nhật viewData để UI phản ánh status mới
                setViewData(prev => ({ ...(prev || {}), status: TICKET_STATUS.APPROVED }));
            } catch (err) {
                console.warn("Update ticket status to APPROVED failed:", err);
                // Không block flow nếu update status thất bại
            }

            // Đóng dialog
            setShipmentDialogOpen(false);
            setViewOpen(false);

            // ✅ Cập nhật local state ngay để list phản ánh có shipment và status APPROVED
            setRows(prev =>
                prev.map(t =>
                    t.id === viewData.id
                        ? { ...t, status: TICKET_STATUS.APPROVED, hasShipment: true }
                        : t
                )
            );

            // Nếu đang lọc khác 'all', chuyển sang APPROVED để thấy ticket
            if (filterStatus !== "all") {
                setFilterStatus(TICKET_STATUS.APPROVED);
            }

            // Refresh lại 1 ticket để đồng bộ từ backend
            try {
                const refreshed = await ticketService.get(viewData.id);
                setRows(prev => prev.map(t => (t.id === refreshed.id ? refreshed : t)));
            } catch (err) {
                console.warn("Refresh ticket after shipment failed:", err);
            }
        } catch (e) {
            notify("⚠️ Tạo shipment thất bại: " + (e?.response?.data?.message || e.message), "error");

        } finally {
            setShipmentSubmitting(false);
        }
    };

    // Không cần dispatchShipmentNow vì Center-to-Center sẽ được dispatch bởi SC Staff ở source center

    if (loading) {
        return (
            <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header + bộ lọc */}
            <Stack spacing={2} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700} sx={nonEditableSx}>
                        Yêu cầu bổ sung phụ tùng
                    </Typography>
                    <Button variant="outlined" onClick={load} disabled={loadLockRef.current}>Tải lại</Button>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Trung tâm</InputLabel>
                        <Select
                            value={filterCenter}
                            label="Trung tâm"
                            onChange={(e) => setFilterCenter(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>Tất cả trung tâm</em>
                            </MenuItem>
                            {centers.map((c) => (
                                <MenuItem key={c.id ?? c.centerId} value={String(c.id ?? c.centerId)}>
                                    {c.name ?? c.centerName ?? `Center ${c.id ?? c.centerId}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Trạng thái"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value={TICKET_STATUS.UNDER_REVIEW}>Chờ phê duyệt</MenuItem>
                            <MenuItem value={TICKET_STATUS.APPROVED}>Đã phê duyệt</MenuItem>
                            <MenuItem value={TICKET_STATUS.REJECTED}>Từ chối</MenuItem>
                            <MenuItem value={TICKET_STATUS.IN_PROGRESS}>Đang xử lý</MenuItem>
                            <MenuItem value={TICKET_STATUS.COMPLETED}>Hoàn tất</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        placeholder="Tìm center/part..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        autoComplete="off"
                        inputProps={{ autoComplete: "off", spellCheck: "false", autoCorrect: "off", autoCapitalize: "none" }}
                    />
                </Stack>
            </Stack>
            {/* Bảng tickets */}
            <Paper sx={{ borderRadius: 3, boxShadow: 4 }}>
                <Table>
                    <TableHead sx={{ bgcolor: "action.hover" }}>
                        <TableRow>
                            <TableCell>Center</TableCell>
                            <TableCell>Part</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {viewRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary">
                                        Không có ticket
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            viewRows.map((t) => {
                                const item = Array.isArray(t.items) && t.items[0] ? t.items[0] : {};
                                const qty = item.requireQuantity ?? item.quantity ?? 0;
                                const partLabel = item.partName || item.partNo || item.partId;
                                return (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.centerName || t.centerId}</TableCell>
                                        <TableCell>{partLabel}</TableCell>
                                        <TableCell align="right">{qty}</TableCell>
                                        <TableCell>
                                            {t.status === TICKET_STATUS.APPROVED ? (
                                                <Chip size="small" color="success" label="APPROVED" />
                                            ) : t.status === TICKET_STATUS.REJECTED ? (
                                                <Chip size="small" color="error" label="REJECTED" />
                                            ) : t.status === TICKET_STATUS.UNDER_REVIEW ? (
                                                <Chip size="small" color="warning" label="UNDER_REVIEW" />
                                            ) : t.status === TICKET_STATUS.IN_PROGRESS ? (
                                                <Chip size="small" color="info" label="IN_PROGRESS" />
                                            ) : (
                                                <Chip size="small" label={t.status} />
                                            )}
                                        </TableCell>
                                        <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Xem chi tiết">
                                                <span>
                                                    <IconButton color="info" onClick={() => openView(t.id)}>
                                                        <Visibility />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Paper>
            {/* Dialog chi tiết + duyệt/từ chối */}
            <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md" disableEnforceFocus>
                <DialogTitle>Chi tiết yêu cầu bổ sung</DialogTitle>
                <DialogContent dividers>
                    {viewLoading ? (
                        <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box>
                    ) : !viewData ? (
                        <Typography color="text.secondary">Không có dữ liệu</Typography>
                    ) : (
                        <>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField label="Trung tâm" value={viewData.centerName || viewData.centerId || "—"} fullWidth InputProps={{ readOnly: true }} />
                                    {/* Bỏ hiển thị trạng thái APPROVED - chỉ hiển thị khi REJECTED hoặc UNDER_REVIEW */}
                                    {viewData.status !== TICKET_STATUS.APPROVED && (
                                    <TextField label="Trạng thái" value={viewData.status || "—"} fullWidth InputProps={{ readOnly: true }} />
                                    )}
                                </Stack>
                                <TextField label="Lý do / Ghi chú" value={viewData.reasonNote || "—"} fullWidth multiline minRows={2} InputProps={{ readOnly: true }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Danh sách phụ tùng</Typography>
                                    <Paper variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Phụ tùng</TableCell>
                                                    <TableCell>Mã</TableCell>
                                                    <TableCell align="right">Số lượng yêu cầu</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Array.isArray(viewData.items) && viewData.items.length > 0 ? (
                                                    viewData.items.map((it, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{it.partName || it.partId || "—"}</TableCell>
                                                            <TableCell>{it.partNo || "—"}</TableCell>
                                                            <TableCell align="right">{it.requireQuantity ?? it.quantity ?? 0}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} align="center">
                                                            <Typography color="text.secondary">Không có phụ tùng</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Paper>
                                </Box>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                        label="Ngày tạo"
                                        value={viewData.createdAt ? new Date(viewData.createdAt).toLocaleString() : "—"}
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                    />
                                </Stack>
                                {viewData.status === TICKET_STATUS.UNDER_REVIEW && (
                                    <TextField
                                        label="Lý do từ chối (nếu cần)"
                                        value={detailRejectReason}
                                        onChange={(e) => setDetailRejectReason(e.target.value)}
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        placeholder="Nhập lý do trước khi bấm TỪ CHỐI"
                                    />
                                )}
                                {viewData?.status === TICKET_STATUS.APPROVED && (createdShipmentId || ticketShipment?.id) && (
                                    <InlineShipmentPanel shipmentId={createdShipmentId || ticketShipment?.id} />
                                )}
                            </Stack>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewOpen(false)}>Đóng</Button>
                    {/* Cho phép tạo shipment khi UNDER_REVIEW nếu đã có suggestions (khi tạo shipment thành công mới đổi thành APPROVED) */}
                    {viewData?.status === TICKET_STATUS.UNDER_REVIEW && centerSuggestions.length > 0 && !hasNoCenters && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LocalShipping />}
                            onClick={openShipmentDialog}
                            disabled={loadingSuggestions}
                        >
                            Giao hàng
                        </Button>
                    )}
                    {/* Nếu đã APPROVED (đã tạo shipment) thì vẫn cho phép tạo thêm shipment nếu cần */}
                    {viewData?.status === TICKET_STATUS.APPROVED && centerSuggestions.length > 0 && !hasNoCenters && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LocalShipping />}
                            onClick={openShipmentDialog}
                            disabled={loadingSuggestions}
                        >
                            Giao hàng
                            </Button>
                    )}
                    {/* Nút Reject - chỉ hiển thị khi UNDER_REVIEW */}
                    {viewData?.status === TICKET_STATUS.UNDER_REVIEW && (
                            <Button variant="contained" color="error" onClick={rejectFromDetail} disabled={detailSubmitting}>
                                {detailSubmitting ? "Đang từ chối..." : "Từ chối"}
                            </Button>
                    )}
                </DialogActions>
            </Dialog>
            {/* Dialog tạo Shipment */}
            <Dialog
                open={shipmentDialogOpen}
                onClose={() => !shipmentSubmitting && setShipmentDialogOpen(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>Tạo Shipment</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Bên trái: Form tạo shipment */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                {/* Center nguồn - bắt buộc cho Center → Center */}
                                    <FormControl fullWidth required>
                                    <InputLabel>Trung tâm</InputLabel>
                                        <Select
                                            value={shipmentFromCenterId}
                                            label="Center nguồn"
                                            onChange={(e) => handleFromCenterChange(e.target.value)}
                                            disabled={shipmentSubmitting || loadingCenters}
                                            size="small"
                                        >
                                            <MenuItem value="">
                                            <em>— Chọn trung tâm —</em>
                                            </MenuItem>
                                            {shipmentCenters.map((center) => {
                                                const centerId = String(center.id ?? center.centerId);
                                                const centerName = center.name || center.centerName || `Center ${centerId}`;
                                                return (
                                                    <MenuItem key={centerId} value={centerId}>
                                                        {centerName}
                                                    </MenuItem>
                                                );
                                            })}
                                        </Select>
                                        {loadingCenters && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Đang tải danh sách trung tâm...
                                            </Typography>
                                        )}
                                        {!loadingCenters && shipmentCenters.length === 0 && selectedPartIds.size > 0 && (
                                            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>
                                                {viewData?.centerId
                                                ? "Không tìm thấy center nguồn phù hợp"
                                                    : "Vui lòng chọn phụ tùng bên phải để hiển thị center nguồn"}
                                            </Typography>
                                        )}
                                    </FormControl>
                                {/* Ghi chú */}
                                <TextField
                                    label="Ghi chú (Note)"
                                    value={shipmentNote}
                                    onChange={(e) => setShipmentNote(e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    disabled={shipmentSubmitting}
                                    placeholder="Nhập ghi chú về shipment (tùy chọn)"
                                />
                                {/* Danh sách items */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                        Danh sách phụ tùng
                                    </Typography>
                                    {(loadingLots || loadingPartInfo) && (
                                        <Box sx={{ textAlign: "center", py: 2 }}>
                                            <CircularProgress size={24} />
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {loadingPartInfo ? "Đang tải thông tin phụ tùng..." : "Đang tải inventory lots..."}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Stack spacing={2}>
                                        {/* Hiển thị nhiều dòng cho serialized; Non-serialized: mỗi partId 1 dòng */}
                                        {shipmentItems
                                            .filter((item, idx, self) => {
                                                const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                                                if (isSerialized) return true; // cho phép nhiều dòng cho serialized
                                                return idx === self.findIndex(i => i.partId === item.partId);
                                            })
                                            .map((item, idx) => {
                                                const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                                                const rowsOfPart = shipmentItems.filter(i => i.partId === item.partId).length;
                                                const lotsCount = (availableLots[item.partId] || []).length;
                                                const ticketMax = item.requiredQuantity || getMaxQuantityByPartId[item.partId] || Infinity;
                                                const capRows = Math.min(lotsCount || 0, ticketMax || Infinity);
                                                const canAddRow = isSerialized && rowsOfPart < capRows;
                                                const partTypeLabel = isSerialized ? " (Serialized)" : " (Non-serialized)";
                                                return (
                                                    <Paper key={item.id || `${item.partId}-${idx}`} variant="outlined" sx={{ p: 2 }}>
                                                        <Stack spacing={2}>
                                                            <Typography variant="subtitle2" fontWeight={600}>
                                                                {item.partName || item.partNo || `Item ${idx + 1}`}
                                                                {loadingPartInfo ? "" : <span style={{ fontSize: "0.85em", color: "#666", fontWeight: "normal" }}>{partTypeLabel}</span>}
                                                            </Typography>
                                                            {/* Center-to-Center shipment form */}
                                                            <>
                                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                                    <FormControl fullWidth required sx={{ flex: 1 }}>
                                                                    <InputLabel>Part Lot</InputLabel>
                                                                        <Select value={item.partLotId} label="Part Lot" onChange={(e) => handleShipmentItemLotChange(item.id, e.target.value)} disabled={shipmentSubmitting || loadingLots} size="small">
                                                                            <MenuItem value=""><em>— Chọn Part Lot —</em></MenuItem>
                                                                            {(availableLots[item.partId] || []).length === 0 && !loadingLots && (
                                                                                <MenuItem value="" disabled>
                                                                                    <em>— Không có lot khả dụng —</em>
                                                                        </MenuItem>
                                                                            )}
                                                                        {(availableLots[item.partId] || []).map((lot) => {
                                                                            const lotId = lot.id || lot.lotId || lot.partLotId;
                                                                                const lotName = lot.name || lot.lotName || lot.serialNo || lot.batchNo || lot.partLotId || lotId || "Unknown Lot";
                                                                            const qty = lot.availableQuantity || lot.availableQty || 0;
                                                                            const displayParts = [];
                                                                                if (lot.serialNo) displayParts.push(`Serial: ${lot.serialNo}`);
                                                                                if (lot.batchNo) displayParts.push(`Batch: ${lot.batchNo}`);
                                                                                if (lot.partLotId && lotName !== lot.serialNo && lotName !== lot.batchNo) displayParts.push(`Lot: ${lot.partLotId}`);
                                                                                const displayText = displayParts.length > 0 ? displayParts.join(" | ") : lotName;
                                                                                return (<MenuItem key={lotId} value={lotId}>{displayText} (Còn: {qty})</MenuItem>);
                                                                        })}
                                                                    </Select>
                                                                </FormControl>
                                                                    {!isSerialized && (
                                                                        <Box sx={{ width: 100 }}>
                                                                            <TextField
                                                                                size="small"
                                                                                type="number"
                                                                                label="Số lượng"
                                                                                value={item.quantity ?? 1}
                                                                                onChange={(e) => {
                                                                                    const newValue = e.target.value;
                                                                                    updateShipmentItem(item.id, "quantity", newValue);
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    // ⚠️ Khi blur, đảm bảo số lượng = requiredQuantity
                                                                                    const currentQty = Number(item.quantity || 0);
                                                                                    const requiredQty = item.requiredQuantity || 0;
                                                                                    if (requiredQty > 0 && currentQty !== requiredQty) {
                                                                                        updateShipmentItem(item.id, "quantity", requiredQty);
                                                                                    }
                                                                                }}
                                                                                inputProps={{ 
                                                                                    min: Math.max(1, item.requiredQuantity || 1), // ⚠️ Min phải >= requiredQuantity
                                                                                    max: getMaxQuantityByPartId[item.partId] || Infinity,
                                                                                    step: 1 
                                                                                }}
                                                                                helperText={
                                                                                    item.requiredQuantity 
                                                                                        ? (Number(item.quantity || 0) !== item.requiredQuantity
                                                                                            ? `⚠️ Yêu cầu: ${item.requiredQuantity} (hiện tại: ${item.quantity || 0})`
                                                                                            : `✓ Yêu cầu: ${item.requiredQuantity}`)
                                                                                        : ""
                                                                                }
                                                                                error={item.requiredQuantity && Number(item.quantity || 0) !== item.requiredQuantity}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': { borderRadius: 999 },
                                                                                    '& input': { textAlign: 'center', fontWeight: 600 }
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    )}
                                                                </Stack>
                                                                {insufficientByPart?.[item.partId] && (
                                                                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: "block" }}>
                                                                        Center nguồn chỉ có {insufficientByPart[item.partId].totalAvail}/{insufficientByPart[item.partId].required}. Vui lòng chọn center khác hoặc giảm số lượng.
                                                                    </Typography>
                                                                )}
                                                            </>

                                                            {isSerialized && (
                                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                    <Tooltip title="Xóa dòng">
                                                                        <span>
                                                                            <IconButton size="small" onClick={() => removeItemRow(item.id)} disabled={shipmentSubmitting}>
                                                                                <Delete fontSize="small" />
                                                                            </IconButton>
                                                                        </span>
                                                                    </Tooltip>
                                                                    <Tooltip title="Thêm lot">
                                                                        <span>
                                                                            <IconButton size="small" onClick={() => addSerializedLotRow(item.partId)} disabled={!canAddRow || shipmentSubmitting}>
                                                                                <Add fontSize="small" />
                                                                            </IconButton>
                                                                        </span>
                                                                    </Tooltip>
                                                                </Stack>
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                );
                                            })}
                                    </Stack>
                                    {shipmentItems.length === 0 && (
                                        <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                                            Không có phụ tùng trong ticket này
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>
                        </Grid>
                        {/* Bên phải: Danh sách ticket items */}
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2, height: "100%", maxHeight: "70vh", overflow: "auto" }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                    Danh sách phụ tùng yêu cầu (Ticket Items)
                                    {shipmentType === "center" && (
                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontWeight: "normal" }}>
                                            Chọn phụ tùng cần ship (Center-to-Center)
                                        </Typography>
                                    )}
                                </Typography>
                                {viewData?.items && Array.isArray(viewData.items) && viewData.items.length > 0 ? (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                {shipmentType === "center" && <TableCell><b>Chọn</b></TableCell>}
                                                <TableCell><b>Phụ tùng</b></TableCell>
                                                <TableCell><b>Mã</b></TableCell>
                                                <TableCell align="right"><b>Số lượng</b></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {viewData.items.map((it, i) => {
                                                const partId = it.partId || it.part?.id;
                                                const isSelected = selectedPartIds.has(partId);
                                                return (
                                                    <TableRow
                                                        key={i}
                                                        sx={{
                                                            backgroundColor: shipmentType === "center" && isSelected ? "action.selected" : "transparent",
                                                            cursor: shipmentType === "center" ? "pointer" : "default"
                                                        }}
                                                        onClick={() => shipmentType === "center" && !shipmentSubmitting && togglePartSelection(partId)}
                                                    >
                                                        {shipmentType === "center" && (
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onChange={() => !shipmentSubmitting && togglePartSelection(partId)}
                                                                    disabled={shipmentSubmitting}
                                                                />
                                                            </TableCell>
                                                        )}
                                                        <TableCell>{it.partName || it.part?.name || it.partId || "—"}</TableCell>
                                                        <TableCell>{it.partNo || it.part?.partNo || "—"}</TableCell>
                                                        <TableCell align="right">{it.requireQuantity ?? it.quantity ?? 0}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                                        Không có phụ tùng trong ticket này
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShipmentDialogOpen(false)} disabled={shipmentSubmitting}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={createShipment}
                        disabled={shipmentSubmitting || !canCreateShipment}
                        title={!canCreateShipment ? (
                            shipmentItems.length === 0 || !shipmentFromCenterId 
                                ? "Vui lòng chọn trung tâm và phụ tùng" 
                                : "Số lượng ship không khớp với yêu cầu ticket hoặc không đủ hàng"
                        ) : ""}
                    >
                        {shipmentSubmitting ? "Đang tạo..." : "Tạo Shipment"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar cho Ticket/Shipment (ReplenishmentTicketList) */}
            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnack(s => ({ ...s, open: false }))}
                    severity={snack.sev}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

/* =========================
   WarrantyRequests — Main Component
   ========================= */
function WarrantyRequests() {
    // ⚠️ QUAN TRỌNG: 
    // - SC_MANAGER chỉ thấy "Yêu cầu bảo hành", không thấy "Yêu cầu bổ sung phụ tùng"
    // - EVM_STAFF chỉ thấy "Yêu cầu bổ sung phụ tùng", không có mode switching
    const currentRole = authService.getRole();
    const isScManager = currentRole === "SC_MANAGER";
    const isEvmStaff = currentRole === "EVM_STAFF";
    
    // ⚠️ EVM_STAFF: luôn hiển thị ReplenishmentTicketList, không có mode switching
    if (isEvmStaff) {
        return <ReplenishmentTicketList />;
    }
    
    // SC_MANAGER luôn ở mode "warranty"
    const [mode, setMode] = useState("warranty");
    
    // ⚠️ Đảm bảo SC_MANAGER luôn ở mode "warranty"
    useEffect(() => {
        if (isScManager) {
            if (mode === "ticket") {
                console.warn("[WarrantyRequests] SC_MANAGER không được phép xem replenishment tickets, chuyển về warranty mode");
                setMode("warranty");
            }
            // Đảm bảo SC_MANAGER luôn ở mode warranty
            if (mode !== "warranty") {
                setMode("warranty");
            }
        }
    }, [mode, isScManager]);

    // ====== CLAIMS (warranty) ======
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const [filterStatus, setFilterStatus] = useState(CLAIM_STATUS.UNDER_REVIEW);
    const [query, setQuery] = useState("");
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);

    // State cho Diagnostics, Estimates, Recall Events
    const [vehicleInfo, setVehicleInfo] = useState(null);
    const [centerName, setCenterName] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [openedByUserName, setOpenedByUserName] = useState("");
    const [diagnostics, setDiagnostics] = useState([]);
    const [estimates, setEstimates] = useState([]);
    const [recallEvents, setRecallEvents] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let list = [];
            if (filterStatus === "all") list = await claimService.getAll();
            else list = await claimService.getByStatus(filterStatus);
            const arr = Array.isArray(list) ? list : [list];
            setRequests(arr);
        } catch (err) {
            console.error("Fetch failed:", err);
            setSnack({ open: true, message: "Không thể tải danh sách yêu cầu", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === "warranty") {
            fetchRequests();
            const handleSync = () => fetchRequests();
            window.addEventListener("claim-sync", handleSync);
            return () => window.removeEventListener("claim-sync", handleSync);
        }
    }, [filterStatus, mode]);

    const [searching, setSearching] = useState(false);
    const handleSearch = async (e) => {
        e.preventDefault();
        if (searching) return;
        if (!query.trim()) return fetchRequests();
        setSearching(true);
        setLoading(true);
        try {
            const list = await claimService.getByVin(query.trim());
            setRequests(Array.isArray(list) ? list : [list]);
        } catch (err) {
            console.error("Search failed:", err);
            setSnack({ open: true, message: "Không tìm thấy VIN", severity: "warning" });
        } finally {
            setLoading(false);
            setTimeout(() => setSearching(false), 300);
        }
    };

    const handleView = async (id) => {
        setViewOpen(true);
        try {
            const detail = await claimService.getById(id);
            setSelectedClaim(detail);
        } catch (err) {
            console.error("Load detail failed:", err);
            setSnack({ open: true, message: "Không thể tải chi tiết", severity: "error" });
            setViewOpen(false);
        }
    };

    // Load current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await axiosInstance.get("/auth/users/me");
                setCurrentUser(res.data);
            } catch (err) {
                console.error("❌ Lỗi khi lấy thông tin user:", err);
            }
        };
        fetchCurrentUser();
    }, []);

    // Load center name
    useEffect(() => {
        const fetchCenterName = async () => {
            try {
                const userRes = await axiosInstance.get("/auth/users/me");
                const user = userRes.data;
                if (!user.centerId) {
                    setCenterName("—");
                    return;
                }
                const centerRes = await axiosInstance.get(`/centers/detail/${user.centerId}`);
                const center = centerRes.data;
                setCenterName(center?.name || "Không rõ tên trung tâm");
            } catch (err) {
                console.error("❌ Lỗi khi tải tên trung tâm:", err);
                setCenterName("Không xác định");
            }
        };
        if (viewOpen) {
            fetchCenterName();
        }
    }, [viewOpen]);

    // Load vehicle info
    useEffect(() => {
        if (!viewOpen || !selectedClaim?.vin) return;
        const fetchVehicle = async () => {
            try {
                const res = await axiosInstance.get(`/vehicles/detail/${encodeURIComponent(selectedClaim.vin)}`);
                setVehicleInfo(res.data);
            } catch (err) {
                console.error("❌ Vehicle fetch error:", err);
                setVehicleInfo(null);
            }
        };
        fetchVehicle();
    }, [viewOpen, selectedClaim?.vin]);

    // Load opened by user name
    useEffect(() => {
        if (!viewOpen || !selectedClaim?.openedBy) {
            setOpenedByUserName("");
            return;
        }
        const fetchUserName = async () => {
            try {
                // Try to get user by ID - using getAllUsers and find
                const res = await axiosInstance.get("/auth/users/get-all-user", { params: { page: 0 } });
                const users = Array.isArray(res.data?.content) ? res.data.content : (Array.isArray(res.data) ? res.data : []);
                const user = users.find(u => u.id === selectedClaim.openedBy);
                if (user) {
                    setOpenedByUserName(user.fullName || user.username || selectedClaim.openedBy);
                } else {
                    // If not found in first page, try to get directly
                    try {
                        const userRes = await axiosInstance.get(`/auth/users/${selectedClaim.openedBy}/get`);
                        setOpenedByUserName(userRes.data?.fullName || userRes.data?.username || selectedClaim.openedBy);
                    } catch (e) {
                        setOpenedByUserName(selectedClaim.openedBy);
                    }
                }
            } catch (err) {
                console.error("❌ Load user name error:", err);
                setOpenedByUserName(selectedClaim.openedBy);
            }
        };
        fetchUserName();
    }, [viewOpen, selectedClaim?.openedBy]);

    // Load Diagnostics, Estimates, and Recall Events
    useEffect(() => {
        if (!viewOpen || !selectedClaim?.id) return;

        const loadAllData = async () => {
            setLoadingData(true);
            try {
                // Load Diagnostics
                try {
                    const diagData = await diagnosticsService.getByClaim(selectedClaim.id);
                    setDiagnostics(Array.isArray(diagData) ? diagData : []);
                } catch (err) {
                    console.error("Load diagnostics failed:", err);
                    setDiagnostics([]);
                }

                // Load Estimates
                try {
                    const estData = await estimatesService.getByClaim(selectedClaim.id);
                    setEstimates(Array.isArray(estData) ? estData : []);
                } catch (err) {
                    console.error("Load estimates failed:", err);
                    setEstimates([]);
                }

                // Load Recall Events
                if (selectedClaim.vin) {
                    try {
                        const recallData = await eventService.checkRecallByVin(selectedClaim.vin);
                        setRecallEvents(recallData.events || []);
                    } catch (err) {
                        console.error("Load recall events failed:", err);
                        setRecallEvents([]);
                    }
                }
            } finally {
                setLoadingData(false);
            }
        };

        loadAllData();
    }, [viewOpen, selectedClaim?.id, selectedClaim?.vin]);

    // Helper function to render list items
    const renderDetailListItem = (label, value) => (
        <Box sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontWeight: 600 }}>
                    {label}:
                </Typography>
                <Typography variant="body2" sx={{ flex: 1 }}>
                    {value || "—"}
                </Typography>
            </Stack>
        </Box>
    );

    /* 🔧 MOVE useMemo LÊN TRÊN TRƯỚC EARLY RETURN */
    const totals = useMemo(() => {
        const all = requests.length;
        const under = requests.filter((r) => r.status === CLAIM_STATUS.UNDER_REVIEW).length;
        const approved = requests.filter((r) => r.status === CLAIM_STATUS.APPROVED).length;
        const rejected = requests.filter((r) => r.status === CLAIM_STATUS.REJECTED).length;
        return { all, under, approved, rejected };
    }, [requests]);

    // Early return giờ an toàn (chỉ cho SC_MANAGER)
    if (mode === "warranty" && loading) {
        return (
            <Box sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h5" fontWeight={700} sx={nonEditableSx}>Yêu cầu bảo hành</Typography>
                </Stack>
                <Box sx={{ py: 10, textAlign: "center" }}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={nonEditableSx}>
                    Yêu cầu bảo hành
                </Typography>
            </Stack>
            {mode === "warranty" ? (
                <>
                    {/* header lọc + search */}
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 3 }}>
                        <Box>
                            <Typography variant="h4" fontWeight="bold" sx={nonEditableSx}>Yêu cầu bảo hành</Typography>
                            <Typography color="text.secondary" sx={nonEditableSx}>Phê duyệt hoặc từ chối các đơn bảo hành đang chờ xử lý.</Typography>
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
                                    onChange={(e) => { setPage(1); setFilterStatus(e.target.value); }}
                                >
                                    <MenuItem value="all">Tất cả</MenuItem>
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
                    {/* cards thống kê */}
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
                                        <Typography variant="body2" color="text.secondary" sx={nonEditableSx}>{card.label}</Typography>
                                        <Typography variant="h5" fontWeight="bold" color={`${card.color}.main`} sx={nonEditableSx}>
                                            {card.value}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    {/* bảng claims */}
                    <Paper sx={{ borderRadius: 3, boxShadow: 4 }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: "action.hover" }}>
                                <TableRow>
                                    <TableCell sx={nonEditableSx}>VIN</TableCell>
                                    <TableCell sx={nonEditableSx}>Tóm tắt lỗi</TableCell>
                                    <TableCell sx={nonEditableSx}>Ngày tạo</TableCell>
                                    <TableCell sx={nonEditableSx}>Quãng đường xe đã chạy</TableCell>
                                    <TableCell sx={nonEditableSx}>Trạng thái</TableCell>
                                    <TableCell sx={nonEditableSx} align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(() => {
                                    const start = (page - 1) * rowsPerPage;
                                    const paginated = requests.slice(start, start + rowsPerPage);
                                    if (paginated.length === 0) {
                                        return (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Typography color="text.secondary" sx={nonEditableSx}>Không có dữ liệu</Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                    return paginated.map((r) => {
                                        const isUpdating = updatingClaimId === r.id;
                                        return (
                                            <TableRow key={r.id}>
                                                <TableCell sx={{ ...nonEditableSx, fontFamily: "monospace" }}>{r.vin}</TableCell>
                                                <TableCell sx={nonEditableSx}>{r.summary || "—"}</TableCell>
                                                <TableCell sx={nonEditableSx}>{new Date(r.errorDate).toLocaleDateString()}</TableCell>
                                                <TableCell sx={nonEditableSx}>{r.odometerKm}</TableCell>
                                                <TableCell sx={nonEditableSx}>
                                                    <Chip
                                                        label={r.status}
                                                        color={
                                                            r.status === CLAIM_STATUS.APPROVED ? "success"
                                                                : r.status === CLAIM_STATUS.REJECTED ? "error"
                                                                    : r.status === CLAIM_STATUS.UNDER_REVIEW ? "warning"
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
                                                </TableCell>
                                            </TableRow>
                                        );
                                    });
                                })()}
                            </TableBody>
                        </Table>
                    </Paper>
                    {/* Dialog xem chi tiết claim */}
                    <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="lg">
                        <DialogTitle sx={nonEditableSx}>Xem chi tiết</DialogTitle>
                        <DialogContent dividers>
                            {!selectedClaim ? (
                                <Typography color="text.secondary" sx={nonEditableSx}>Không có dữ liệu</Typography>
                            ) : (
                                <Box>
                                    {loadingData && (
                                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                            <CircularProgress />
                                        </Box>
                                    )}

                                    {/* Claim Information - List Format */}
                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                                                Thông tin yêu cầu
                                            </Typography>
                                            <Box>
                                                {renderDetailListItem("VIN", <Box component="span" sx={{ fontFamily: "monospace" }}>{selectedClaim.vin || "—"}</Box>)}
                                                {renderDetailListItem("Tên khách", vehicleInfo?.intakeContactName || selectedClaim.intakeContactName || "—")}
                                                {renderDetailListItem("SDT", vehicleInfo?.intakeContactPhone || "—")}
                                                {renderDetailListItem("Trung tâm", centerName)}
                                                {renderDetailListItem("Opened By", openedByUserName || selectedClaim.openedBy || "—")}
                                                {renderDetailListItem("Claim Type", selectedClaim.claimType || "—")}
                                                {renderDetailListItem("Status", selectedClaim.status || "—")}
                                                {renderDetailListItem("Opened At", selectedClaim.openedAt ? new Date(selectedClaim.openedAt).toLocaleString("vi-VN") : "—")}
                                                {renderDetailListItem("Error Date", selectedClaim.errorDate ? new Date(selectedClaim.errorDate).toLocaleString("vi-VN") : "—")}
                                                {renderDetailListItem("Coverage Type", selectedClaim.coverageType || "—")}
                                                {renderDetailListItem("Odometer (km)", selectedClaim.odometerKm || "—")}
                                                {renderDetailListItem("Summary", selectedClaim.summary || "—")}
                                                {renderDetailListItem("Exclusion", selectedClaim.exclusion || "—")}
                                            </Box>

                                            {/* Attachments */}
                                            {Array.isArray(selectedClaim.attachmentUrls) && selectedClaim.attachmentUrls.filter((url) => url && url !== "string").length > 0 && (
                                                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                        Attachments:
                                                    </Typography>
                                                    <Stack spacing={1} direction="row" flexWrap="wrap">
                                                        {selectedClaim.attachmentUrls
                                                            ?.filter((url) => typeof url === "string" && url.trim() && url !== "string")
                                                            .map((url, i) => {
                                                                const fileName = decodeURIComponent(url.split("/").pop());
                                                                const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
                                                                const isPdf = /\.pdf$/i.test(fileName);
                                                                return (
                                                                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                        {isImage ? (
                                                                            <Tooltip title="Click to view" arrow>
                                                                                <img
                                                                                    src={url}
                                                                                    alt={fileName}
                                                                                    style={{
                                                                                        maxWidth: "120px",
                                                                                        maxHeight: "120px",
                                                                                        borderRadius: "8px",
                                                                                        border: "1px solid #ddd",
                                                                                        cursor: "pointer",
                                                                                    }}
                                                                                    onClick={() => window.open(url, "_blank")}
                                                                                />
                                                                            </Tooltip>
                                                                        ) : isPdf ? (
                                                                            <Tooltip title="Click to view PDF" arrow>
                                                                                <DescriptionIcon
                                                                                    color="action"
                                                                                    sx={{ fontSize: 40, cursor: "pointer" }}
                                                                                    onClick={() => window.open(url, "_blank")}
                                                                                />
                                                                            </Tooltip>
                                                                        ) : (
                                                                            <a
                                                                                href={url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{
                                                                                    fontSize: "0.85rem",
                                                                                    color: "#1976d2",
                                                                                    textDecoration: "none",
                                                                                }}
                                                                            >
                                                                                📎 {fileName}
                                                                            </a>
                                                                        )}
                                                                    </Box>
                                                                );
                                                            })}
                                                    </Stack>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Diagnostics Section */}
                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                                                Diagnostics ({diagnostics.length})
                                            </Typography>
                                            {diagnostics.length === 0 ? (
                                                <Typography color="text.secondary">Chưa có diagnostics</Typography>
                                            ) : (
                                                <Stack spacing={2}>
                                                    {diagnostics.map((diag) => (
                                                        <Card key={diag.id} variant="outlined" sx={{ bgcolor: "action.hover" }}>
                                                            <CardContent>
                                                                <Stack spacing={1}>
                                                                    {renderDetailListItem("Phase", diag.phase || "—")}
                                                                    {renderDetailListItem("Outcome", diag.outcome || "—")}
                                                                    {renderDetailListItem("SOH (%)", diag.sohPct ?? "—")}
                                                                    {renderDetailListItem("SOC (%)", diag.socPct ?? "—")}
                                                                    {renderDetailListItem("Pack Voltage", diag.packVoltage ?? "—")}
                                                                    {renderDetailListItem("Cell Delta (mV)", diag.cellDeltaMv ?? "—")}
                                                                    {renderDetailListItem("Cycles", diag.cycles ?? "—")}
                                                                    {renderDetailListItem("Performed By", diag.performedByName || "—")}
                                                                    {renderDetailListItem("Recorded At", diag.recordedAt ? new Date(diag.recordedAt).toLocaleString("vi-VN") : "—")}
                                                                    {renderDetailListItem("Notes", diag.notes || "—")}
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                ))}
                                            </Stack>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Estimates Section */}
                                    <Card variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                                                Estimates ({estimates.length})
                                            </Typography>
                                            {estimates.length === 0 ? (
                                                <Typography color="text.secondary">Chưa có estimates</Typography>
                                            ) : (
                                                <Stack spacing={2}>
                                                    {estimates.map((est) => {
                                                        const items = est.itemsJson ? (typeof est.itemsJson === "string" ? JSON.parse(est.itemsJson) : est.itemsJson) : est.items || [];
                                                        return (
                                                            <Card key={est.id} variant="outlined" sx={{ bgcolor: "action.hover" }}>
                                                                <CardContent>
                                                                    <Stack spacing={1}>
                                                                        {renderDetailListItem("Version", est.versionNo ?? est.version ?? "—")}
                                                                        {renderDetailListItem("Created At", est.createdAt ? new Date(est.createdAt).toLocaleString("vi-VN") : "—")}
                                                                        {renderDetailListItem("Note", est.note || "—")}
                                                                        {renderDetailListItem("Labor Slots", est.laborSlots ?? "—")}
                                                                        {renderDetailListItem("Labor Rate (VND)", est.laborRateVND ? est.laborRateVND.toLocaleString("vi-VN") : "—")}
                                                                        {renderDetailListItem("Parts Subtotal (VND)", est.partsSubtotalVND ? est.partsSubtotalVND.toLocaleString("vi-VN") : "—")}
                                                                        {renderDetailListItem("Labor Subtotal (VND)", est.laborSubtotalVND ? est.laborSubtotalVND.toLocaleString("vi-VN") : "—")}
                                                                        {renderDetailListItem("Grand Total (VND)", est.grandTotalVND ? est.grandTotalVND.toLocaleString("vi-VN") : "—")}
                                                                        {items.length > 0 && (
                                                                            <Box sx={{ mt: 1 }}>
                                                                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                                                    Items:
                                                                                </Typography>
                                                                                <Stack spacing={0.5}>
                                                                                    {items.map((item, idx) => (
                                                                                        <Box key={idx} sx={{ pl: 2, py: 0.5, borderLeft: "2px solid", borderColor: "primary.main" }}>
                                                                                            <Typography variant="body2">
                                                                                                {item.partName || item.part_name || "—"} × {item.quantity ?? 0} = {(item.unitPriceVND ?? item.unit_price_vnd ?? 0) * (item.quantity ?? 0)} VND
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    ))}
                                                                                </Stack>
                                                                            </Box>
                                                                        )}
                                                                    </Stack>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })}
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Recall Events Section */}
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                                                Recall Events ({recallEvents.length})
                                            </Typography>
                                            {recallEvents.length === 0 ? (
                                                <Typography color="text.secondary">Không có recall events cho VIN này</Typography>
                                            ) : (
                                                <Stack spacing={2}>
                                                    {recallEvents.map((event) => (
                                                        <Card key={event.id} variant="outlined" sx={{ bgcolor: "warning.light", opacity: 0.9 }}>
                                                            <CardContent>
                                                                <Stack spacing={1}>
                                                                    {renderDetailListItem("Event Name", event.name || "—")}
                                                                    {renderDetailListItem("Type", event.type || "—")}
                                                                    {renderDetailListItem("Reason", event.reason || "—")}
                                                                    {renderDetailListItem("Start Date", event.startDate ? new Date(event.startDate).toLocaleString("vi-VN") : "—")}
                                                                    {renderDetailListItem("End Date", event.endDate ? new Date(event.endDate).toLocaleString("vi-VN") : "—")}
                                                                    {event.affectedParts && event.affectedParts.length > 0 && (
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                                                                Affected Parts:
                                                                            </Typography>
                                                                            <Stack spacing={0.5}>
                                                                                {event.affectedParts.map((part, idx) => (
                                                                                    <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                                                                        • {part}
                                                                                    </Typography>
                                                                                ))}
                                                                            </Stack>
                                                                        </Box>
                                                                    )}
                                                                    {event.exclusions && event.exclusions.length > 0 && (
                                                                        <Box>
                                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                                                                Exclusions:
                                                                            </Typography>
                                                                            <Stack spacing={0.5}>
                                                                                {event.exclusions.map((excl, idx) => (
                                                                                    <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                                                                        • {excl}
                                                                                    </Typography>
                                                                                ))}
                                                                            </Stack>
                                                                        </Box>
                                                                    )}
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setViewOpen(false)} variant="outlined">Đóng</Button>
                        </DialogActions>
                    </Dialog>
                    <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                        <Alert severity={snack.severity}>{snack.message}</Alert>
                    </Snackbar>
                </>
            ) : (
                // ⚠️ SC_MANAGER không được phép xem replenishment tickets
                <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="h6" color="text.secondary">
                        SC_MANAGER chỉ có quyền xem "Yêu cầu bảo hành"
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

export default WarrantyRequests;