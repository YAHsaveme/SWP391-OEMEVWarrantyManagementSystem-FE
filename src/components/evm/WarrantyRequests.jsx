// src/components/evm/WarrantyRequests.jsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
    Box, Grid, Card, CardContent, Typography, Chip, Button, Table, TableHead,
    TableRow, TableCell, TableBody, Paper, IconButton, TextField, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, FormControl,
    InputLabel, Select, MenuItem, Stack, Tooltip, Checkbox
} from "@mui/material";
import { Visibility, CheckCircle, Cancel, Search, Refresh, LocalShipping, Add, Delete } from "@mui/icons-material";

import claimService, { CLAIM_STATUS } from "../../services/claimService";
import ticketService from "../../services/ticketService";
import centerService from "../../services/centerService";
import shipmentService from "../../services/shipmentService";
import inventoryLotService from "../../services/inventoryLotService";
import partService from "../../services/partService";  // ← THÊM IMPORT NÀY
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

const buildShipmentItemsFromTicket = (ticketItems, partInfoMap, shipmentType) => {
    const items = Array.isArray(ticketItems) ? ticketItems : [];
    const result = [];
    let counter = 0;
    const genId = (partId) => `${partId || "no-part"}-${Date.now()}-${counter++}`;

    items.forEach((item, idx) => {
        const partId = item?.partId || item?.part?.id || null;
        if (!partId) return;

        const partName = item?.partName || item?.part?.name || "—";
        const partNo = item?.partNo || item?.part?.partNo || "—";
        const requiredQuantity = Number(item?.requireQuantity ?? item?.quantity ?? 0) || 0;
        const info = partInfoMap?.[partId];
        const isSerialized = info?.isSerialized ?? false;

        if (shipmentType === "manufacturer" && isSerialized) {
            const rows = Math.max(1, requiredQuantity) || 1;
            for (let i = 0; i < rows; i++) {
                result.push({
                    id: genId(partId) + `-${idx}-${i}`,
                    partId,
                    partName,
                    partNo,
                    quantity: 1,
                    requiredQuantity,
                    isSerialized: true,
                    serialNo: "",
                    batchNo: "",
                    mfgDate: "",
                    partLotId: "",
                    partLot: null,
                });
            }
        } else {
            result.push({
                id: genId(partId) + `-${idx}`,
                partId,
                partName,
                partNo,
                quantity: shipmentType === "manufacturer" ? (isSerialized ? 1 : requiredQuantity) : (item?.quantity ?? 0),
                requiredQuantity,
                isSerialized,
                serialNo: "",
                batchNo: "",
                mfgDate: "",
                partLotId: "",
                partLot: null,
            });
        }
    });

    return result;
};

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

    const canDispatch = data?.status === "REQUESTED";
    const canReceive = data?.status === "IN_TRANSIT" || data?.status === "DISPATCHED"; // legacy safe
    const canClose = data?.status === "DELIVERED";

    const doDispatch = async () => {
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
                        <Button variant="contained" onClick={doDispatch} disabled={!canDispatch || busy}>Dispatch</Button>
                        <Button color="success" variant="contained" onClick={doReceive} disabled={!canReceive || busy}>Receive</Button>
                        <Button color="inherit" variant="contained" onClick={doClose} disabled={!canClose || busy}>Close</Button>
                        {data?.status && <Chip size="small" label={data.status === "DISPATCHED" ? "IN_TRANSIT" : data.status} color={data.status === "IN_TRANSIT" ? "info" : data.status === "DELIVERED" ? "success" : "default"} />}
                    </Stack>
                </Stack>
            )}
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
            const list = await ticketService.getAll();
            const arr = Array.isArray(list) ? list : [];
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
        const needle = norm(q);
        const filtered = rows.filter((t) => {
            const cId = String(t.centerId ?? "");
            const cName = String(t.centerName ?? "");
            // Filter center chỉ để lọc hiển thị, không bắt buộc
            if (filterCenter) {
                if (!(cId === String(filterCenter) || cName === filterCenter)) return false;
            }
            if (filterStatus !== "all" && t.status !== filterStatus) return false;

            const item = Array.isArray(t.items) && t.items[0] ? t.items[0] : {};
            const cStr = norm(cName || cId);
            const pStr = norm(item.partName || item.partNo || item.partId);
            const vinStr = norm(t.vin || t.vehicleVin || "");
            if (needle && !(cStr.includes(needle) || pStr.includes(needle) || vinStr.includes(needle))) return false;
            return true;
        });

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
    const [shipmentType, setShipmentType] = useState("manufacturer"); // "manufacturer" | "center"
    const [shipmentNote, setShipmentNote] = useState("");
    const [shipmentTrackingNo, setShipmentTrackingNo] = useState("");
    const [shipmentFromCenterId, setShipmentFromCenterId] = useState("");
    const [shipmentItems, setShipmentItems] = useState([]);
    const [shipmentSubmitting, setShipmentSubmitting] = useState(false);
    const [availableLots, setAvailableLots] = useState({}); // { partId: [lots...] }
    const [loadingLots, setLoadingLots] = useState(false);
    const [partInfoMap, setPartInfoMap] = useState({}); // { partId: { isSerialized, ... } }
    const [loadingPartInfo, setLoadingPartInfo] = useState(false);
    const [ticketShipment, setTicketShipment] = useState(null);
    const [dispatchTrackingNo, setDispatchTrackingNo] = useState("");
    const [dispatchBusy, setDispatchBusy] = useState(false);
    const [createdShipmentId, setCreatedShipmentId] = useState(null);
    const [selectedPartIds, setSelectedPartIds] = useState(new Set()); // Chỉ dùng cho Center-to-Center

    // Load centers cho Center-to-Center shipment dùng suggest-center API
    // Chỉ suggest centers có các parts đã được chọn
    // Tự động gọi khi chọn part bên phải
    useEffect(() => {
        if (shipmentType === "center" && shipmentDialogOpen && selectedPartIds.size > 0) {
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

                    // Parse response: { multiCenterSuggestions: [{ centerIds: [...], centerNames: [...], items: [...] }] }
                    const suggestions = response?.multiCenterSuggestions || [];
                    const centersList = [];

                    const centerMap = new Map(); // Dùng Map để tránh duplicate centers

                    suggestions.forEach((suggestion, idx) => {
                        const centerIds = Array.isArray(suggestion.centerIds) ? suggestion.centerIds : [];
                        const centerNames = Array.isArray(suggestion.centerNames) ? suggestion.centerNames : [];

                        // Tạo center objects từ arrays
                        centerIds.forEach((centerId, i) => {
                            const centerIdStr = String(centerId);
                            // Chỉ thêm nếu chưa có (tránh duplicate)
                            if (!centerMap.has(centerIdStr)) {
                                centerMap.set(centerIdStr, {
                                    id: centerId,
                                    centerId: centerId,
                                    name: centerNames[i] || `Center ${centerId}`,
                                    centerName: centerNames[i] || `Center ${centerId}`,
                                    items: suggestion.items || [], // Giữ lại items để có availableQuantity
                                });
                            }
                        });
                    });

                    const uniqueCenters = Array.from(centerMap.values());
                    console.log("[suggest-center] Parsed centers (unique):", uniqueCenters);

                    // Lọc centers không đáp ứng tồn theo parts đã chọn (dựa trên items từ suggest-center)
                    // Điều kiện: cho mỗi partId đã chọn, tổng availableQuantity trong items của center phải >= requiredQuantity
                    const requiredMap = new Map();
                    Array.from(selectedPartIds).forEach((pid) => {
                        const req = shipmentItems.find(i => i.partId === pid)?.requiredQuantity || 1;
                        requiredMap.set(String(pid), Number(req) || 1);
                    });

                    const centersMeetingDemand = uniqueCenters.filter(center => {
                        const items = Array.isArray(center.items) ? center.items : [];
                        if (items.length === 0) return false; // không có dữ liệu hàng hoá → ẩn
                        const sumAvailByPart = items.reduce((acc, it) => {
                            const k = String(it.partId || it.part?.id || it.partID || it.id || "");
                            if (!k) return acc;
                            acc[k] = (acc[k] || 0) + Number(it.availableQuantity ?? it.quantity ?? 0);
                            return acc;
                        }, {});
                        for (const [pid, requiredQty] of requiredMap.entries()) {
                            if ((sumAvailByPart[pid] || 0) < (requiredQty || 1)) return false;
                        }
                        return true;
                    });

                    // Lọc ra center đích của ticket (center tạo ticket = nơi cần phụ tùng)
                    // Center nguồn phải KHÁC với center đích
                    const ticketDestinationCenterId = viewData?.centerId ? String(viewData.centerId) : null;
                    const filteredCenters = centersMeetingDemand.filter(center => {
                        const centerIdStr = String(center.id ?? center.centerId);
                        // Loại bỏ center đích khỏi danh sách center nguồn
                        return centerIdStr !== ticketDestinationCenterId;
                    });

                    console.log("[suggest-center] Ticket destination center:", ticketDestinationCenterId);
                    console.log("[suggest-center] Filtered centers (excluding destination):", filteredCenters);

                    // Xác minh tồn kho thật sự cho từng center bằng suggestPartLots
                    const demandPartQuantities = Array.from(selectedPartIds).map(pid => {
                        const rq = shipmentItems.find(i => i.partId === pid)?.requiredQuantity || 1;
                        return { partId: pid, quantity: rq };
                    });

                    let validatedCenters = [];
                    if (demandPartQuantities.length > 0 && filteredCenters.length > 0) {
                        try {
                            const checks = await Promise.all(filteredCenters.map(async (c) => {
                                const cid = String(c.id ?? c.centerId);
                                try {
                                    const res = await shipmentService.suggestPartLots({ centerId: cid, partQuantities: demandPartQuantities });
                                    const suggestedItems = Array.isArray(res?.suggestedItems) ? res.suggestedItems : [];
                                    const sumAvailByPart = suggestedItems.reduce((acc, si) => {
                                        const k = String(si.partId);
                                        acc[k] = (acc[k] || 0) + Number(si.availableQuantity ?? 0);
                                        return acc;
                                    }, {});
                                    for (const { partId, quantity } of demandPartQuantities) {
                                        if ((sumAvailByPart[String(partId)] || 0) < (Number(quantity) || 1)) {
                                            return null; // không đủ
                                        }
                                    }
                                    return c; // đủ
                                } catch (_) {
                                    return null; // lỗi coi như không đủ
                                }
                            }));
                            validatedCenters = checks.filter(Boolean);
                        } catch (e) {
                            console.warn("[suggest-center] validate by lots failed, fallback to filteredCenters", e);
                            validatedCenters = filteredCenters;
                        }
                    } else {
                        validatedCenters = filteredCenters;
                    }

                    setShipmentCenters(validatedCenters);

                    // Tự động chọn center đầu tiên đã xác minh và load lots luôn
                    if (validatedCenters.length > 0 && !shipmentFromCenterId && shipmentItems.length > 0) {
                        const firstCenter = validatedCenters[0];
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
                                    partQuantities
                                });

                                console.log("[suggest-part-lots] Response:", result);

                                // Parse suggestedItems
                                const suggestedItems = Array.isArray(result?.suggestedItems) ? result.suggestedItems : [];
                                const lotsMap = {};          // { partId: Lot[] }
                                const availableQtyMap = {};  // { partId: totalAvailable }

                                for (const si of suggestedItems) {
                                    const partId = si.partId;
                                    if (!partId) continue;

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
                                        name: si.serialNo || si.batchNo || si.partLotId,
                                        lotName: si.serialNo || si.batchNo || si.partLotId,
                                    };

                                    if (!lotsMap[partId]) lotsMap[partId] = [];
                                    if (!lotsMap[partId].some(l => (l.partLotId || l.id) === (lot.partLotId || lot.id))) {
                                        lotsMap[partId].push(lot);
                                        availableQtyMap[partId] = (availableQtyMap[partId] || 0) + lot.availableQuantity;
                                    }
                                }

                                setAvailableLots(lotsMap);

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
            // Reset khi đóng dialog, chuyển sang manufacturer, hoặc chưa chọn parts
            setShipmentCenters([]);
            setLoadingCenters(false);
            setShipmentFromCenterId(""); // Reset center selection
        }
    }, [shipmentType, shipmentDialogOpen, selectedPartIds.size, shipmentItems.length, viewData?.centerId]); // Thêm viewData.centerId để lọc center đích

    const openView = async (id) => {
        setViewOpen(true);
        setViewLoading(true);
        setViewData(null);
        setDetailRejectReason("");
        setCreatedShipmentId(null);
        try {
            const d = await ticketService.get(id);
            setViewData(d);
            try {
                const s = await shipmentService.getByTicketId(id);
                if (s && s.id) {
                    setTicketShipment(s);
                    setDispatchTrackingNo(s.trackingNo || "");
                } else {
                    setTicketShipment(null);
                    setDispatchTrackingNo("");
                }
            } catch (_) {
                setTicketShipment(null);
                setDispatchTrackingNo("");
            }
        } catch (e) {
            console.error("load ticket detail failed:", e);
        } finally {
            setViewLoading(false);
        }
    };

    const approveFromDetail = async () => {
        if (!viewData?.id) return;
        setDetailSubmitting(true);
        try {
            await ticketService.updateStatus(
                viewData.id,
                TICKET_STATUS.APPROVED,
                "Phê duyệt yêu cầu bổ sung phụ tùng"
            );
            // Giữ dialog mở và cập nhật trạng thái ngay để ẩn nút Phê duyệt/Từ chối và hiện "Tạo Shipment"
            setViewData(prev => ({ ...(prev || {}), status: TICKET_STATUS.APPROVED }));
            notify("✅ Đã phê duyệt. Bạn có thể tạo Shipment.", "success");
            // Reload danh sách để cập nhật trạng thái
            await load();
        } catch (e) {
            notify("⚠️ Phê duyệt thất bại: " + (e?.response?.data?.message || e.message), "error");
        } finally {
            setDetailSubmitting(false);
        }
    };

    // Duyệt ticket trực tiếp từ bảng
    const approveFromTable = async (ticketId) => {
        if (!ticketId) return;
        try {
            await ticketService.updateStatus(
                ticketId,
                TICKET_STATUS.APPROVED,
                "Phê duyệt yêu cầu bổ sung phụ tùng"
            );
            notify("✅ Đã phê duyệt ticket.", "success");
            await load();
        } catch (e) {
            notify("⚠️ Phê duyệt thất bại: " + (e?.response?.data?.message || e.message), "error");
        }
    };

    // Duyệt tất cả ticket của center hiện tại
    const approveAllByCenter = async () => {
        if (!filterCenter) {
            notify("Vui lòng chọn trung tâm trước.", "warning");
            return;
        }
        const ticketsToApprove = viewRows.filter(t => t.status === TICKET_STATUS.UNDER_REVIEW);
        if (ticketsToApprove.length === 0) {
            notify("Không có ticket nào đang chờ duyệt trong trung tâm này.", "info");
            return;
        }
        if (!window.confirm(`Bạn có chắc muốn duyệt ${ticketsToApprove.length} ticket của trung tâm này?`)) {
            return;
        }
        try {
            await Promise.all(
                ticketsToApprove.map(t => 
                    ticketService.updateStatus(
                        t.id,
                        TICKET_STATUS.APPROVED,
                        "Phê duyệt yêu cầu bổ sung phụ tùng"
                    )
                )
            );
            notify(`✅ Đã duyệt ${ticketsToApprove.length} ticket.`, "success");
            await load();
        } catch (e) {
            notify("⚠️ Duyệt thất bại: " + (e?.response?.data?.message || e.message), "error");
        }
    };

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

        setShipmentNote("");
        setShipmentTrackingNo("");
        setShipmentFromCenterId("");
        setShipmentType("manufacturer");
        setAvailableLots({});
        setPartInfoMap({});
        setShipmentItems([]); // Khởi tạo rỗng, sẽ set sau khi load partInfo
        setShipmentDialogOpen(true);

        // Load part info TRƯỚC, sau đó mới build items với đúng số dòng cho serialized
        const ticketItems = Array.isArray(viewData.items) ? viewData.items : [];
        const partIdsToLoad = ticketItems.map(i => i.partId || i.part?.id).filter(Boolean);

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

                // Build shipment items với đúng số dòng cho serialized (mỗi dòng = 1 unit)
                const builtItems = buildShipmentItemsFromTicket(ticketItems, newInfoMap, "manufacturer");
                setShipmentItems(builtItems);
                
                // Reset selected items - Manufacturer sẽ chọn tất cả
                setSelectedPartIds(new Set(partIdsToLoad));
            } finally {
                setLoadingPartInfo(false);
            }
        } else {
            // Nếu không có items, vẫn set selectedPartIds rỗng
            setSelectedPartIds(new Set());
        }
    };

    const handleShipmentTypeChange = async (newType) => {
        setShipmentType(newType);
        if (newType === "center") {
            // Center-to-Center: reset selection (không chọn mặc định, user sẽ tự chọn)
            setSelectedPartIds(new Set());
            setShipmentItems([]);
            setAvailableLots({});
        } else {
            // Manufacturer: chọn tất cả items và khôi phục lại từ viewData
            const allPartIds = Array.isArray(viewData?.items)
                ? viewData.items.map(i => i.partId || i.part?.id).filter(Boolean)
                : [];
            setSelectedPartIds(new Set(allPartIds));
            const rebuiltItems = buildShipmentItemsFromTicket(viewData?.items || [], partInfoMap, "manufacturer");
            setShipmentItems(rebuiltItems);
            setAvailableLots({});
        }
    };

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
        if (centerId && shipmentType === "center" && shipmentItems.length > 0) {
            setLoadingLots(true);
            try {
                // Dùng suggest-part-lots API để load tất cả lots cho các parts đã chọn
                const partQuantities = shipmentItems
                    .filter(item => item.partId)
                    .map(item => ({
                        partId: item.partId,
                        quantity: item.requiredQuantity || 1 // Dùng requiredQuantity từ ticket
                    }));

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

                    // ⛔ Clamp + auto-assign lots for serialized
                    // Xóa parts không có inventory khỏi shipmentItems
                    const partsWithoutInventory = [];
                    const partsToRemove = [];
                    
                    setShipmentItems(prev => {
                        let next = [...prev];
                        // Xóa parts không có inventory và lưu lại để bỏ chọn
                        next = next.filter(it => {
                            if (!it.partId) return true;
                            const totalAvail = availableQtyMap[it.partId] || 0;
                            if (totalAvail === 0) {
                                partsWithoutInventory.push(it.partName || it.partId);
                                partsToRemove.push(it.partId);
                                return false; // Xóa part không có inventory
                            }
                            return true;
                        });
                        
                        // Cập nhật selectedPartIds - bỏ chọn parts không có inventory
                        if (partsToRemove.length > 0) {
                            setSelectedPartIds(prev => {
                                const newSet = new Set(prev);
                                partsToRemove.forEach(pid => newSet.delete(pid));
                                return newSet;
                            });
                            
                            notify(`Center nguồn không có tồn kho cho: ${partsWithoutInventory.join(", ")}. Đã tự động bỏ chọn.`, "warning");
                        }
                        
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

                        // Tự tạo đủ dòng cho serialized và gán lot không trùng
                        // Auto-select lot cho non-serialized parts
                        const partIds = Array.from(new Set(next.map(i => i.partId).filter(Boolean)));
                        for (const pid of partIds) {
                            const isSerialized = partInfoMap[pid]?.isSerialized ?? false;
                            const lots = lotsMap[pid] || [];
                            
                            if (isSerialized) {
                                // Serialized: Tạo đủ số dòng và gán lot không trùng
                                const desired = Math.min(
                                    (next.find(i => i.partId === pid)?.requiredQuantity) || 0,
                                    lots.length
                                );
                                const rows = next.filter(i => i.partId === pid);
                                // Thêm dòng tới khi đủ desired
                                while (rows.length < desired) {
                                    const base = rows[0];
                                    next.push({
                                        id: `${pid}-${Date.now()}-${Math.random()}`,
                                        partId: pid,
                                        partName: base?.partName || "",
                                        partNo: base?.partNo || "",
                                        quantity: 1,
                                        requiredQuantity: base?.requiredQuantity || desired,
                                        isSerialized: true,
                                        serialNo: "",
                                        batchNo: "",
                                        mfgDate: "",
                                        partLotId: "",
                                        partLot: null,
                                    });
                                    rows.push({});
                                }
                                // Gán lot không trùng
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
                            } else {
                                // Non-serialized: Auto-select lot đầu tiên có available quantity > 0
                                for (let i = 0; i < next.length; i++) {
                                    const item = next[i];
                                    if (item.partId === pid && !item.partLotId && lots.length > 0) {
                                        // Tìm lot đầu tiên có availableQuantity > 0
                                        const firstAvailableLot = lots.find(l => (l.availableQuantity || 0) > 0) || lots[0];
                                        if (firstAvailableLot) {
                                            const availableQty = firstAvailableLot.availableQuantity || 0;
                                            const requiredQty = item.requiredQuantity || 0;
                                            // Tạo object mới để đảm bảo immutability
                                            next[i] = {
                                                ...item,
                                                partLotId: firstAvailableLot.partLotId || firstAvailableLot.id,
                                                partLot: firstAvailableLot,
                                                quantity: availableQty > 0 
                                                    ? Math.min(requiredQty || availableQty, Math.max(1, availableQty))
                                                    : item.quantity
                                            };
                                        }
                                    }
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
        // Validate SerialNo nếu đang update SerialNo (chặn trùng giữa các dòng)
        if (field === "serialNo" && shipmentType === "manufacturer") {
            const trimmedSerialNo = String(value || "").trim();
            if (trimmedSerialNo) {
                const duplicateItem = shipmentItems.find(i =>
                    i.id !== itemId &&
                    i.serialNo &&
                    String(i.serialNo).trim().toLowerCase() === trimmedSerialNo.toLowerCase()
                );
                if (duplicateItem) {
                    notify(`SerialNo "${trimmedSerialNo}" đã được sử dụng ở dòng khác. Mỗi SerialNo chỉ được nhập một lần.`, "warning");
                    return;
                }
            }
        }

        // Validate quantity nếu đang update quantity
        if (field === "quantity" && shipmentType === "manufacturer") {
            const item = shipmentItems.find(i => i.id === itemId);
            if (item && item.partId) {
                const newQty = Number(value) || 0;
                const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                if (isSerialized && newQty !== 1) {
                    notify("Phụ tùng serialized phải có số lượng = 1", "warning");
                    return;
                }
                if (!isSerialized) {
                    const maxQty = getMaxQuantityByPartId[item.partId];
                    if (maxQty !== undefined) {
                        const otherItemsTotal = shipmentItems
                            .filter(i => i.id !== itemId && i.partId === item.partId)
                            .reduce((sum, i) => sum + Number(i.quantity || 0), 0);
                        const newTotal = otherItemsTotal + newQty;
                        if (newTotal > maxQty) {
                            const remaining = maxQty - otherItemsTotal;
                            notify(`Tổng số lượng theo PartId không được vượt quá yêu cầu ticket (${maxQty}). Các items khác: ${otherItemsTotal}, bạn nhập: ${newQty} → Tổng: ${newTotal}. Tối đa còn lại: ${remaining}`, "warning");
                            return; // ← CHẶN CẬP NHẬT
                        }
                    }
                }
                // Nếu OK → Cập nhật quantity
                setShipmentItems(prev => prev.map(i =>
                    i.id === itemId ? { ...i, quantity: newQty } : i
                ));
                return; // ← THOÁT SỚM
            }
        }

        // Các field khác (batchNo, mfgDate, ...) → Cập nhật bình thường
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

    const createShipment = async () => {
        if (!viewData?.id) return;
        if (shipmentType === "center" && !shipmentFromCenterId) {
            notify("Vui lòng chọn trung tâm gửi hàng (fromCenterId)", "warning");
            return;
        }
        // Validate items theo backend rules
        if (shipmentType === "manufacturer") {
            const quantityByPartId = {};
            shipmentItems.forEach(item => {
                if (item.partId) {
                    quantityByPartId[item.partId] = (quantityByPartId[item.partId] || 0) + Number(item.quantity || 0);
                }
            });
            for (const [partId, totalQty] of Object.entries(quantityByPartId)) {
                const maxQty = getMaxQuantityByPartId[partId];
                if (maxQty !== undefined && totalQty > maxQty) {
                    const partName = shipmentItems.find(i => i.partId === partId)?.partName || partId;
                    notify(`Tổng số lượng cho "${partName}" (${totalQty}) vượt quá yêu cầu ticket (${maxQty})`, "warning");
                    return;
                }
            }
            const serialNos = shipmentItems
                .filter(item => {
                    const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                    return isSerialized && item.serialNo && item.serialNo.trim();
                })
                .map(item => item.serialNo.trim().toLowerCase());
            const uniqueSerialNos = new Set(serialNos);
            if (serialNos.length !== uniqueSerialNos.size) {
                const duplicates = serialNos.filter((sn, idx) => serialNos.indexOf(sn) !== idx);
                notify(`Có SerialNo bị trùng lặp giữa các dòng: ${[...new Set(duplicates)].join(", ")}. Mỗi SerialNo chỉ được nhập một lần.`, "warning");
                return;
            }
        }
        for (const item of shipmentItems) {
            const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
            if (shipmentType === "manufacturer") {
                if (isSerialized) {
                    if (!item.serialNo?.trim()) {
                        notify(`Vui lòng nhập Serial No cho phụ tùng serialized "${item.partName}"`, "warning");
                        return;
                    }
                    if (!item.batchNo?.trim()) {
                        notify(`Vui lòng nhập Batch No cho phụ tùng serialized "${item.partName}"`, "warning");
                        return;
                    }
                    if (!item.mfgDate) {
                        notify(`Vui lòng chọn Manufacturing Date cho phụ tùng serialized "${item.partName}"`, "warning");
                        return;
                    }
                    if (Number(item.quantity) !== 1) {
                        notify(`Số lượng cho phụ tùng serialized "${item.partName}" phải = 1`, "warning");
                        return;
                    }
                } else {
                    if (!item.quantity || Number(item.quantity) < 1) {
                        notify(`Số lượng phải >= 1 cho "${item.partName}"`, "warning");
                        return;
                    }
                    if (!item.batchNo?.trim()) {
                        notify(`Vui lòng nhập Batch No cho phụ tùng non-serialized "${item.partName}"`, "warning");
                        return;
                    }
                    if (!item.mfgDate) {
                        notify(`Vui lòng chọn Manufacturing Date cho phụ tùng non-serialized "${item.partName}"`, "warning");
                        return;
                    }
                }
            } else {
                // Center-to-Center: validate available quantity
                const lots = availableLots[item.partId] || [];
                const totalAvail = lots.reduce((s, l) => s + (l.availableQuantity || 0), 0);
                if (totalAvail === 0) {
                    notify(`Center nguồn không có tồn kho cho "${item.partName}". Vui lòng chọn center khác hoặc bỏ chọn phụ tùng này.`, "warning");
                    return;
                }
                if (!item.quantity || Number(item.quantity) < 1) {
                    notify(`Số lượng phải >= 1 cho "${item.partName}"`, "warning");
                    return;
                }
                if (!item.partLotId) {
                    notify(`Vui lòng chọn Part Lot cho "${item.partName}"`, "warning");
                    return;
                }
                // Kiểm tra quantity không vượt quá available quantity của lot đã chọn
                const selectedLot = lots.find(l => (l.partLotId || l.id) === item.partLotId);
                if (selectedLot && Number(item.quantity) > (selectedLot.availableQuantity || 0)) {
                    notify(`Số lượng cho "${item.partName}" (${item.quantity}) vượt quá tồn kho của lot (${selectedLot.availableQuantity})`, "warning");
                    return;
                }
            }
        }
        // Validate: Center-to-Center phải chọn ít nhất 1 phụ tùng
        if (shipmentType === "center" && selectedPartIds.size === 0) {
            notify("Vui lòng chọn ít nhất một phụ tùng để ship (Center-to-Center)", "warning");
            return;
        }

        setShipmentSubmitting(true);
        try {
            if (shipmentType === "manufacturer") {
                const items = shipmentItems.map(item => {
                    const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                    const payload = {
                        partId: item.partId,
                        quantity: Number(item.quantity),
                    };

                    // Normalize mfgDate
                    let mfgDate = item.mfgDate;
                    if (mfgDate) {
                        if (typeof mfgDate === 'string' && mfgDate.length === 16) {
                            mfgDate = new Date(mfgDate).toISOString();
                        } else if (!mfgDate.includes('T')) {
                            mfgDate = new Date(mfgDate + 'T00:00:00').toISOString();
                        }
                    } else {
                        mfgDate = new Date().toISOString();
                    }

                    if (isSerialized) {
                        payload.serialNo = item.serialNo.trim();
                        payload.batchNo = item.batchNo.trim();
                        payload.mfgDate = mfgDate;
                    } else {
                        payload.batchNo = item.batchNo.trim();
                        payload.mfgDate = mfgDate;
                    }
                    return payload;
                });
                const body = {
                    ticketId: viewData.id,
                    note: shipmentNote.trim() || "",
                    items: items,
                };
                const res = await shipmentService.createFromManufacturer(body);
                const newId = res?.id ?? res?.shipmentId ?? res?.data?.id ?? res?.data?.shipmentId;
                if (newId) {
                    try {
                        const s = await shipmentService.get(newId);
                        setTicketShipment(s || { id: newId, status: "REQUESTED" });
                        setDispatchTrackingNo("");
                    } catch (_) {
                        setTicketShipment({ id: newId, status: "REQUESTED" });
                        setDispatchTrackingNo("");
                    }
                    setCreatedShipmentId(newId);
                    // Chuyển sang tab Chi tiết vận đơn trong Overview
                    try { window.dispatchEvent(new CustomEvent("open-shipment", { detail: { id: newId } })); } catch (_) { }
                    navigate(`/overview`);
                }
            } else {
                const body = {
                    fromCenterId: shipmentFromCenterId,
                    ticketId: viewData.id,
                    note: shipmentNote.trim() || "",
                    items: shipmentItems.map(item => ({
                        partLotId: item.partLotId,
                        quantity: Number(item.quantity),
                    })),
                };
                const res = await shipmentService.createBetweenCenters(body);
                const newId = res?.id ?? res?.shipmentId ?? res?.data?.id ?? res?.data?.shipmentId;
                if (newId) {
                    try {
                        const s = await shipmentService.get(newId);
                        setTicketShipment(s || { id: newId, status: "REQUESTED" });
                        setDispatchTrackingNo("");
                    } catch (_) {
                        setTicketShipment({ id: newId, status: "REQUESTED" });
                        setDispatchTrackingNo("");
                    }
                    setCreatedShipmentId(newId);
                    // Chuyển sang tab Chi tiết vận đơn trong Overview
                    try { window.dispatchEvent(new CustomEvent("open-shipment", { detail: { id: newId } })); } catch (_) { }
                    navigate(`/overview`);
                }
            }
            notify("✅ Tạo shipment thành công!", "success");

            // Đóng dialog
            setShipmentDialogOpen(false);
            setViewOpen(false);

            // ✅ Cập nhật local state ngay để list phản ánh có shipment
            setRows(prev =>
                prev.map(t =>
                    t.id === viewData.id
                        ? { ...t, status: TICKET_STATUS.IN_PROGRESS, hasShipment: true }
                        : t
                )
            );

            // Nếu đang lọc khác 'all', chuyển sang IN_PROGRESS để thấy ticket
            if (filterStatus !== "all") {
                setFilterStatus(TICKET_STATUS.IN_PROGRESS);
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

    const dispatchShipmentNow = async () => {
        const sid = createdShipmentId || ticketShipment?.id;
        if (!sid) return;
        const tracking = (dispatchTrackingNo || "").trim();
        if (!tracking) {
            notify("Vui lòng nhập Tracking No trước khi Dispatch", "warning");
            return;
        }
        setDispatchBusy(true);
        try {
            await shipmentService.dispatch(sid, tracking);
            notify("Đã Dispatch (bắt đầu vận chuyển)", "success");
            try {
                const s = await shipmentService.get(sid);
                setTicketShipment(s || ticketShipment);
            } catch (_) { }
        } catch (e) {
            notify("Dispatch thất bại: " + (e?.response?.data?.message || e.message), "error");
        } finally {
            setDispatchBusy(false);
        }
    };

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
                                <em>— Chọn trung tâm —</em>
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
                {filterCenter && (
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Alert severity="info" variant="outlined" sx={{ flex: 1 }}>
                            Đang lọc theo trung tâm: <b>{centers.find(c => String(c.id ?? c.centerId) === String(filterCenter))?.name ?? filterCenter}</b>
                        </Alert>
                        <Button 
                            variant="contained" 
                            color="success" 
                            startIcon={<CheckCircle />}
                            onClick={approveAllByCenter}
                            disabled={viewRows.filter(t => t.status === TICKET_STATUS.UNDER_REVIEW).length === 0}
                        >
                            Duyệt tất cả ticket của trung tâm này
                        </Button>
                    </Stack>
                )}
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
                            <TableCell align="center" width={120}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {viewRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
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
                                const canApprove = t.status === TICKET_STATUS.UNDER_REVIEW;
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
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                {canApprove && (
                                                    <Tooltip title="Duyệt ticket">
                                                        <IconButton 
                                                            color="success" 
                                                            size="small"
                                                            onClick={() => approveFromTable(t.id)}
                                                        >
                                                            <CheckCircle />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton color="info" size="small" onClick={() => openView(t.id)}>
                                                        <Visibility />
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
                                    <TextField label="Trạng thái" value={viewData.status || "—"} fullWidth InputProps={{ readOnly: true }} />
                                </Stack>
                                <TextField label="Lý do / Ghi chú" value={viewData.reasonNote || "—"} fullWidth multiline minRows={2} InputProps={{ readOnly: true }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Danh sách phụ tùng</Typography>
                                    <Paper variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Part</TableCell>
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
                    {viewData?.status === TICKET_STATUS.APPROVED && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LocalShipping />}
                            onClick={openShipmentDialog}
                        >
                            Tạo Shipment
                        </Button>
                    )}
                    {viewData?.status === TICKET_STATUS.UNDER_REVIEW && (
                        <>
                            <Button variant="contained" color="success" onClick={approveFromDetail} disabled={detailSubmitting}>
                                {detailSubmitting ? "Đang phê duyệt..." : "Phê duyệt"}
                            </Button>
                            <Button variant="contained" color="error" onClick={rejectFromDetail} disabled={detailSubmitting}>
                                {detailSubmitting ? "Đang từ chối..." : "Từ chối"}
                            </Button>
                        </>
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
                                {/* Chọn loại shipment */}
                                <FormControl fullWidth>
                                    <InputLabel>Loại Shipment</InputLabel>
                                    <Select
                                        value={shipmentType}
                                        label="Loại Shipment"
                                        onChange={(e) => handleShipmentTypeChange(e.target.value)}
                                        disabled={shipmentSubmitting}
                                    >
                                        <MenuItem value="manufacturer">Manufacturer (EVM) → Center</MenuItem>
                                        <MenuItem value="center">Center → Center</MenuItem>
                                    </Select>
                                </FormControl>
                                {/* Center nguồn - chỉ hiện khi chọn Center → Center */}
                                {shipmentType === "center" && (
                                    <FormControl fullWidth required>
                                        <InputLabel>Center nguồn</InputLabel>
                                        <Select
                                            value={shipmentFromCenterId}
                                            label="Center nguồn"
                                            onChange={(e) => handleFromCenterChange(e.target.value)}
                                            disabled={shipmentSubmitting || loadingCenters}
                                            size="small"
                                        >
                                            <MenuItem value="">
                                                <em>— Chọn Center nguồn —</em>
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
                                                Đang tải danh sách center...
                                            </Typography>
                                        )}
                                        {!loadingCenters && shipmentCenters.length === 0 && selectedPartIds.size > 0 && (
                                            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>
                                                {viewData?.centerId
                                                    ? "Không tìm thấy center nguồn khác với center đích của ticket"
                                                    : "Vui lòng chọn phụ tùng bên phải để hiển thị center nguồn"}
                                            </Typography>
                                        )}
                                    </FormControl>
                                )}
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
                                        {/* Hiển thị nhiều dòng cho serialized (cả Manufacturer và Center->Center); còn lại mỗi partId 1 dòng */}
                                        {shipmentItems
                                            .filter((item, idx, self) => {
                                                const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                                                // Cho phép nhiều dòng cho serialized parts (cả manufacturer và center)
                                                if (isSerialized) return true;
                                                // Non-serialized: chỉ hiển thị 1 dòng cho mỗi partId
                                                return idx === self.findIndex(i => i.partId === item.partId);
                                            })
                                            .map((item, idx) => {
                                                const isSerialized = item.isSerialized ?? partInfoMap[item.partId]?.isSerialized ?? false;
                                                const rowsOfPart = shipmentItems.filter(i => i.partId === item.partId);
                                                const totalRowsOfPart = rowsOfPart.length;
                                                const currentRowIndex = rowsOfPart.findIndex(i => i.id === item.id) + 1;
                                                const lotsCount = (availableLots[item.partId] || []).length;
                                                const ticketMax = item.requiredQuantity || getMaxQuantityByPartId[item.partId] || Infinity;
                                                const capRows = Math.min(lotsCount || 0, ticketMax || Infinity);
                                                const canAddRow = shipmentType === "center" && isSerialized && totalRowsOfPart < capRows;
                                                const partTypeLabel = isSerialized ? " (Serialized)" : " (Non-serialized)";
                                                const rowLabel = isSerialized && totalRowsOfPart > 1 
                                                    ? ` - Dòng ${currentRowIndex}/${totalRowsOfPart}` 
                                                    : "";
                                                return (
                                                    <Paper key={item.id || `${item.partId}-${idx}`} variant="outlined" sx={{ p: 2 }}>
                                                        <Stack spacing={2}>
                                                            <Typography variant="subtitle2" fontWeight={600}>
                                                                {item.partName || item.partNo || `Item ${idx + 1}`}
                                                                {loadingPartInfo ? "" : <span style={{ fontSize: "0.85em", color: "#666", fontWeight: "normal" }}>{partTypeLabel}{rowLabel}</span>}
                                                            </Typography>
                                                            {shipmentType === "manufacturer" ? (
                                                                <>
                                                                    {isSerialized ? (
                                                                        <>
                                                                            {/* Layout ngang cho Serialized: Số lượng + Serial No + Batch No + Mfg Date */}
                                                                            <Stack direction="row" spacing={1}>
                                                                                <TextField
                                                                                    label="Số lượng"
                                                                                    type="number"
                                                                                    value={1}
                                                                                    size="small"
                                                                                    disabled={true}
                                                                                    required
                                                                                    sx={{ width: 100 }}
                                                                                    helperText=""
                                                                                />
                                                                                <TextField
                                                                                    label="Serial No *"
                                                                                    value={item.serialNo || ""}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "serialNo", e.target.value)}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    sx={{ flex: 1 }}
                                                                                    helperText=""
                                                                                />
                                                                                <TextField
                                                                                    label="Batch No *"
                                                                                    value={item.batchNo || ""}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "batchNo", e.target.value)}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    sx={{ flex: 1 }}
                                                                                    helperText=""
                                                                                />
                                                                                <TextField
                                                                                    label="Mfg Date *"
                                                                                    type="date"
                                                                                    value={item.mfgDate ? item.mfgDate.split('T')[0] : ""}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "mfgDate", new Date(e.target.value + 'T00:00:00').toISOString())}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    InputLabelProps={{ shrink: true }}
                                                                                    sx={{ flex: 1 }}
                                                                                    helperText=""
                                                                                />
                                                                            </Stack>
                                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                                                                                Phụ tùng serialized: SerialNo phải unique. BatchNo và MfgDate cũng bắt buộc.
                                                                            </Typography>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {/* Layout ngang cho Non-serialized: Số lượng + Batch No + Mfg Date */}
                                                                            <Stack direction="row" spacing={1}>
                                                                                <TextField
                                                                                    label="Số lượng"
                                                                                    type="number"
                                                                                    value={item.quantity}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "quantity", e.target.value)}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    sx={{ width: 120 }}
                                                                                    inputProps={{
                                                                                        min: 1,
                                                                                        max: getMaxQuantityByPartId[item.partId] || undefined
                                                                                    }}
                                                                                    helperText=""
                                                                                />
                                                                                <TextField
                                                                                    label="Batch No *"
                                                                                    value={item.batchNo || ""}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "batchNo", e.target.value)}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    sx={{ flex: 1 }}
                                                                                    helperText=""
                                                                                />
                                                                                <TextField
                                                                                    label="Mfg Date *"
                                                                                    type="date"
                                                                                    value={item.mfgDate ? item.mfgDate.split('T')[0] : ""}
                                                                                    onChange={(e) => updateShipmentItem(item.id, "mfgDate", new Date(e.target.value + 'T00:00:00').toISOString())}
                                                                                    size="small"
                                                                                    disabled={shipmentSubmitting}
                                                                                    required
                                                                                    InputLabelProps={{ shrink: true }}
                                                                                    sx={{ flex: 1 }}
                                                                                    helperText=""
                                                                                />
                                                                            </Stack>
                                                                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                                                                                Phụ tùng non-serialized: BatchNo và MfgDate bắt buộc.
                                                                            </Typography>
                                                                        </>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <FormControl fullWidth required>
                                                                    <InputLabel>Part Lot</InputLabel>
                                                                    <Select
                                                                        value={item.partLotId}
                                                                        label="Part Lot"
                                                                        onChange={(e) => handleShipmentItemLotChange(item.id, e.target.value)}
                                                                        disabled={shipmentSubmitting || loadingLots || (availableLots[item.partId] || []).length === 0}
                                                                        size="small"
                                                                    >
                                                                        <MenuItem value="">
                                                                            <em>— Chọn Part Lot —</em>
                                                                        </MenuItem>
                                                                        {(availableLots[item.partId] || []).map((lot) => {
                                                                            const lotId = lot.id || lot.lotId || lot.partLotId;
                                                                            // Hiển thị tên lot: ưu tiên serialNo, sau đó batchNo, cuối cùng partLotId
                                                                            const lotName = lot.name || lot.lotName ||
                                                                                lot.serialNo ||
                                                                                lot.batchNo ||
                                                                                lot.partLotId ||
                                                                                lotId || "Unknown Lot";
                                                                            const qty = lot.availableQuantity || lot.availableQty || 0;

                                                                            // Hiển thị đầy đủ thông tin: serialNo, batchNo, partLotId
                                                                            const displayParts = [];
                                                                            if (lot.serialNo) {
                                                                                displayParts.push(`Serial: ${lot.serialNo}`);
                                                                            }
                                                                            if (lot.batchNo) {
                                                                                displayParts.push(`Batch: ${lot.batchNo}`);
                                                                            }
                                                                            if (lot.partLotId && lotName !== lot.serialNo && lotName !== lot.batchNo) {
                                                                                displayParts.push(`Lot: ${lot.partLotId}`);
                                                                            }
                                                                            const displayText = displayParts.length > 0
                                                                                ? displayParts.join(" | ")
                                                                                : lotName;

                                                                            return (
                                                                                <MenuItem key={lotId} value={lotId}>
                                                                                    {displayText} (Còn: {qty})
                                                                                </MenuItem>
                                                                            );
                                                                        })}
                                                                    </Select>
                                                                </FormControl>
                                                            )}
                                                            {shipmentType === "center" && isSerialized && (
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
                        disabled={shipmentSubmitting || shipmentItems.length === 0 || (shipmentType === "center" && !shipmentFromCenterId)}
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
    const [mode, setMode] = useState("warranty");

    // ====== CLAIMS (warranty) ======
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
    const [filterStatus, setFilterStatus] = useState("all");
    const [query, setQuery] = useState("");
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);

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

    const [updatingClaimId, setUpdatingClaimId] = useState(null);
    const handleUpdateStatus = async (claimId, status) => {
        if (updatingClaimId === claimId) return;
        setUpdatingClaimId(claimId);
        try {
            const updated = await claimService.updateStatus(claimId, status);
            setRequests((prev) => prev.map((r) => (r.id === claimId ? updated : r)));
            setSnack({ open: true, message: `Đã cập nhật: ${status}`, severity: "success" });
            window.dispatchEvent(new CustomEvent("claim-sync"));
        } catch (err) {
            console.error("Update status failed:", err);
            setSnack({ open: true, message: "Không thể cập nhật trạng thái", severity: "error" });
        } finally {
            setUpdatingClaimId(null);
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

    /* 🔧 MOVE useMemo LÊN TRÊN TRƯỚC EARLY RETURN */
    const totals = useMemo(() => {
        const all = requests.length;
        const under = requests.filter((r) => r.status === CLAIM_STATUS.UNDER_REVIEW).length;
        const approved = requests.filter((r) => r.status === CLAIM_STATUS.APPROVED).length;
        const rejected = requests.filter((r) => r.status === CLAIM_STATUS.REJECTED).length;
        return { all, under, approved, rejected };
    }, [requests]);

    // Early return giờ an toàn
    if (mode === "warranty" && loading) {
        return (
            <Box sx={{ p: 4 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h5" fontWeight={700} sx={nonEditableSx}>Yêu cầu bảo hành</Typography>
                    <Button variant="outlined" color="secondary" onClick={() => setMode("ticket")}>
                        Chuyển sang: Yêu cầu bổ sung phụ tùng
                    </Button>
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
                    {mode === "warranty" ? "Yêu cầu bảo hành" : "Yêu cầu bổ sung phụ tùng"}
                </Typography>
                <Button variant="outlined" color="secondary" onClick={() => setMode(mode === "warranty" ? "ticket" : "warranty")}>
                    {mode === "warranty" ? "Chuyển sang: Yêu cầu bổ sung phụ tùng" : "Chuyển sang: Yêu cầu bảo hành"}
                </Button>
            </Stack>
            {mode === "warranty" ? (
                <>
                    {/* header lọc + search */}
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 3 }}>
                        <Box>
                            <Typography variant="h4" fontWeight="bold" sx={nonEditableSx}>Warranty Requests</Typography>
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
                                    <TableCell sx={nonEditableSx}>Odometer</TableCell>
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
                                                    {r.status === CLAIM_STATUS.UNDER_REVIEW && (
                                                        <>
                                                            <Tooltip title={isUpdating ? "Đang xử lý..." : "Phê duyệt"}>
                                                                <span>
                                                                    <IconButton
                                                                        color="success"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdateStatus(r.id, CLAIM_STATUS.APPROVED)}
                                                                    >
                                                                        <CheckCircle />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                            <Tooltip title={isUpdating ? "Đang xử lý..." : "Từ chối"}>
                                                                <span>
                                                                    <IconButton
                                                                        color="error"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdateStatus(r.id, CLAIM_STATUS.REJECTED)}
                                                                    >
                                                                        <Cancel />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    });
                                })()}
                            </TableBody>
                        </Table>
                    </Paper>
                    {/* Dialog xem chi tiết claim */}
                    <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
                        <DialogTitle sx={nonEditableSx}>Chi tiết đơn bảo hành</DialogTitle>
                        <DialogContent dividers>
                            {!selectedClaim ? (
                                <Typography color="text.secondary" sx={nonEditableSx}>Không có dữ liệu</Typography>
                            ) : (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="VIN" value={selectedClaim.vin} fullWidth InputProps={{ readOnly: true }} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Claim Type" value={selectedClaim.claimType || "—"} fullWidth InputProps={{ readOnly: true }} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Odometer (km)" value={selectedClaim.odometerKm || 0} fullWidth InputProps={{ readOnly: true }} />
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
                                    {Array.isArray(selectedClaim.attachmentUrls) && selectedClaim.attachmentUrls.length > 0 && (
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" sx={nonEditableSx}>Đính kèm:</Typography>
                                            <Stack spacing={1}>
                                                {selectedClaim.attachmentUrls.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.9rem", color: "#1976d2", textDecoration: "none" }}>
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
                            <Button onClick={() => setViewOpen(false)} variant="outlined">Đóng</Button>
                        </DialogActions>
                    </Dialog>
                    <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                        <Alert severity={snack.severity}>{snack.message}</Alert>
                    </Snackbar>
                </>
            ) : (
                <ReplenishmentTicketList />
            )}
        </Box>
    );
}

export default WarrantyRequests;