// src/components/tech/InventoryMove.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Container, Paper, Grid, Typography, TextField, Button, Stack,
    Table, TableHead, TableRow, TableCell, TableBody, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip,
    CircularProgress, Snackbar, Divider, MenuItem, Autocomplete, Alert,
    FormControl, InputLabel, Select, Tooltip
} from "@mui/material";

import {
    Search as SearchIcon,
    Add as AddIcon,
    Undo as UndoIcon,
    Visibility as VisibilityIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";

import inventoryMovementService from "../../services/inventoryMovementService";
import axiosInstance from "../../services/axiosInstance";
import eventService from "../../services/eventService";
import appointmentService from "../../services/appointmentService";
import technicianService from "../../services/technicianService";
import inventoryPartService from "../../services/inventoryPartService";
import partService from "../../services/partService";
import claimService from "../../services/claimService";
import estimatesService from "../../services/estimatesService";
import vehicleService from "../../services/vehicleService";
import partLotService from "../../services/partLotService";
import inventoryLotService from "../../services/inventoryLotService";


/**
 * InventoryMove.jsx
 *
 * - Trang quản lý Luân chuyển kho (Inventory Movements) cho Technician
 * - Tự động load claims/appointments (không hiện ID), load các part liên quan khi chọn claim
 * - Cho phép tạo Service Use (xuất kho) và Return (trả phụ tùng)
 * - Hiển thị lịch sử movement (search)
 * - Hỗ trợ filter parts theo recall events cho xe thuộc RECALL
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
export default function InventoryMove() {
    // UI state
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [claims, setClaims] = useState([]); // each claim: { id, vin, customerName, appointmentId, appointmentAt, ... }
    const [selectedClaim, setSelectedClaim] = useState(null);

    const [loadingParts, setLoadingParts] = useState(false);
    const [parts, setParts] = useState([]); // parts selected for export (with available quantity)
    const [selectedParts, setSelectedParts] = useState({}); // partId -> qty to use
    const [selectedPartLotsReturn, setSelectedPartLotsReturn] = useState({}); // partLotId -> qty to return

    // Available parts for selection
    const [availablePartsList, setAvailablePartsList] = useState([]); // all parts that can be selected
    const [partCatalog, setPartCatalog] = useState({}); // map partId -> part info (for name lookup)
    const [loadingAvailableParts, setLoadingAvailableParts] = useState(false);
    const [openAddPartDialog, setOpenAddPartDialog] = useState(false);
    const [centerId, setCenterId] = useState("");

    // Service out items for return
    const [serviceOutItems, setServiceOutItems] = useState([]); // items from SERVICE_USE movements
    const [loadingServiceOut, setLoadingServiceOut] = useState(false);

    // Estimate parts info for selected claim
    const [estimateParts, setEstimateParts] = useState([]);
    const [loadingEstimateParts, setLoadingEstimateParts] = useState(false);
    const [latestEstimateMeta, setLatestEstimateMeta] = useState(null);
    const [estimateFetchError, setEstimateFetchError] = useState(null);

    // Recall events state
    const [recallEvents, setRecallEvents] = useState([]);
    const [loadingRecallEvents, setLoadingRecallEvents] = useState(false);

    const [openDetail, setOpenDetail] = useState(false);
    const [detailMovement, setDetailMovement] = useState(null);

    // Traceability states
    const [traceabilityType, setTraceabilityType] = useState("vin"); // "vin" | "serialNo"
    const [traceabilityInput, setTraceabilityInput] = useState("");
    const [traceabilityLoading, setTraceabilityLoading] = useState(false);
    const [traceabilityData, setTraceabilityData] = useState(null);
    const [openTraceability, setOpenTraceability] = useState(false);

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

    // Technician ID state
    const [technicianId, setTechnicianId] = useState("");

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

    // Fetch technician ID on mount
    useEffect(() => {
        const fetchTechnician = async () => {
            const currentUserId = localStorage.getItem("userId");
            if (!currentUserId) {
                setSnack({ open: true, message: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", severity: "error" });
                return;
            }

            try {
                console.log("[InventoryMove] Fetching technician for userId:", currentUserId);
                const res = await technicianService.getById(currentUserId);
                console.log("[InventoryMove] Technician API response:", res);

                // Thử nhiều cách lấy technicianId từ response
                const techId =
                    res?.scheduleId ||
                    res?.techScheduleId ||
                    res?.techSchedule?.id ||
                    res?.technicianId ||
                    res?.id ||
                    res?.techId ||
                    res?.userId ||
                    res?.data?.scheduleId ||
                    res?.data?.techScheduleId ||
                    res?.data?.technicianId ||
                    res?.data?.id ||
                    currentUserId; // Fallback

                console.log("[InventoryMove] Extracted technicianId:", techId);

                if (techId) {
                    setTechnicianId(String(techId));
                } else {
                    setSnack({ open: true, message: "Không tìm thấy kỹ thuật viên!", severity: "error" });
                }
            } catch (err) {
                console.error("[InventoryMove] Fetch technician failed:", err);
                setSnack({ open: true, message: "Lỗi khi tải thông tin kỹ thuật viên: " + (err?.response?.data?.message || err.message), severity: "error" });
            }
        };

        fetchTechnician();
    }, []);

    // Load appointments when technicianId is available
    useEffect(() => {
        if (technicianId) {
            loadClaims();
        }
    }, [technicianId]);

    useEffect(() => {
        loadHistory(); // initial history
    }, []);

    // ---------- load claims (appointments for current technician) ----------
    async function loadClaims() {
        if (!technicianId) {
            console.warn("[InventoryMove] No technicianId, skipping loadClaims");
            return;
        }

        setLoadingClaims(true);
        try {
            console.log("[InventoryMove] Loading appointments for technicianId:", technicianId);
            const res = await appointmentService.getByTechnician(technicianId);
            console.log("[InventoryMove] Appointments API response:", res);

            if (!res.success) {
                throw new Error(res.message || "Không thể tải appointments");
            }

            const raw = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.data || []);

            console.log("[InventoryMove] Raw appointments count:", raw.length);
            console.log("[InventoryMove] Sample appointment:", raw[0] ? JSON.stringify(raw[0], null, 2) : "No appointments");

            // Filter only IN_PROGRESS appointments
            const inProgressAppointments = (raw || []).filter(r => {
                const status = (r.status || r.appointmentStatus || r.state || r.appointment?.status || "").toString().toUpperCase().trim();
                const isInProgress = status === "IN_PROGRESS";
                if (!isInProgress) {
                    console.log("[InventoryMove] Filtered out appointment:", {
                        id: r.id || r.appointmentId,
                        status: status,
                        statusField: r.status || r.appointmentStatus || r.state || r.appointment?.status
                    });
                }
                return isInProgress;
            });

            console.log("[InventoryMove] Total appointments:", raw.length, "IN_PROGRESS:", inProgressAppointments.length);
            if (inProgressAppointments.length > 0) {
                console.log("[InventoryMove] First IN_PROGRESS appointment:", JSON.stringify(inProgressAppointments[0], null, 2));
            }

            // Normalize to a friendly shape and fetch claim details to get VIN + Intake contactName
            const normalized = await Promise.all(
                inProgressAppointments.map(async (r) => {
                    const appId = r.id || r.appointmentId;
                    const appAt = r.appointmentAt || r.appointmentDate || r.createdAt || r.workingStartTime;
                    const claimId = r.claimId || r.claim?.id;

                    let vin = "";
                    let intakeContactName = "";

                    // Always fetch claim details if claimId exists to get VIN and intakeContactName
                    if (claimId) {
                        try {
                            console.log("[InventoryMove] Fetching claim details for claimId:", claimId);
                            const claimData = await claimService.getById(claimId);
                            console.log("[InventoryMove] Claim data:", claimData);

                            // Extract VIN from claim
                            vin = claimData?.vin ||
                                claimData?.vehicleVin ||
                                claimData?.vehicle?.vin ||
                                claimData?.vehicle?.vehicleVin ||
                                claimData?.vehicleVinCode ||
                                "";

                            // Extract intakeContactName from claim
                            intakeContactName = claimData?.intakeContactName ||
                                claimData?.contactName ||
                                claimData?.customerName ||
                                claimData?.customer?.name ||
                                claimData?.ownerName ||
                                "";

                            // If intakeContactName is not in claim, try to get from vehicle
                            if (!intakeContactName || intakeContactName.trim().length === 0) {
                                if (vin && vin.trim().length > 0) {
                                    try {
                                        console.log("[InventoryMove] Fetching vehicle details for VIN:", vin);
                                        const vehicleData = await vehicleService.getByVin(vin);
                                        console.log("[InventoryMove] Vehicle data:", vehicleData);

                                        intakeContactName = vehicleData?.intakeContactName ||
                                            vehicleData?.contactName ||
                                            vehicleData?.ownerName ||
                                            vehicleData?.customerName ||
                                            "";
                                    } catch (err) {
                                        console.warn("[InventoryMove] Failed to fetch vehicle details for VIN:", vin, err);
                                    }
                                }
                            }

                            console.log("[InventoryMove] Extracted - VIN:", vin, "Intake contactName:", intakeContactName);
                        } catch (err) {
                            console.warn("[InventoryMove] Failed to fetch claim details for claimId:", claimId, err);
                            // Fallback: try to get from appointment data
                            vin = r.vin || r.vehicleVin || r.claim?.vin || r.vehicle?.vin || "";
                            intakeContactName = r.intakeContactName || r.claim?.intakeContactName || r.customerName || "";
                        }
                    } else {
                        // No claimId, try to get from appointment data
                        vin = r.vin || r.vehicleVin || r.vehicle?.vin || r.claim?.vin || "";
                        intakeContactName = r.intakeContactName || r.claim?.intakeContactName || r.customerName || "";
                    }

                    // Normalize (trim and validate)
                    vin = vin && vin !== "—" ? String(vin).trim() : "";
                    intakeContactName = intakeContactName && intakeContactName !== "—" ? String(intakeContactName).trim() : "";

                    // Build label: VIN • Intake contactName
                    const labelParts = [];
                    if (vin && vin.length > 0) labelParts.push(vin);
                    if (intakeContactName && intakeContactName.length > 0) labelParts.push(intakeContactName);

                    let label = "";
                    if (labelParts.length > 0) {
                        label = labelParts.join(" • ");
                    } else if (appId) {
                        // Fallback: Just appointment ID if no VIN/ContactName
                        label = `Appointment ${String(appId).slice(0, 8)}`;
                    } else {
                        label = "Appointment";
                    }

                    console.log("[InventoryMove] Normalized appointment:", { appId, claimId, vin, intakeContactName, label, status: r.status || r.appointmentStatus || r.state });

                    return {
                        raw: r,
                        id: appId,
                        vin: vin || "—",
                        customerName: intakeContactName || "—", // Store intakeContactName as customerName for consistency
                        intakeContactName: intakeContactName || "—",
                        appointmentId: appId,
                        claimId: claimId,
                        appointmentAt: appAt,
                        status: r.status || r.appointmentStatus || r.state,
                        label: label, // VIN • Intake contactName
                    };
                })
            );

            setClaims(normalized);
            console.log("[InventoryMove] Loaded", normalized.length, "IN_PROGRESS appointments");
            console.log("[InventoryMove] Normalized claims data:", JSON.stringify(normalized, null, 2));

            // Clear selectedClaim if it's not in the new list
            if (selectedClaim) {
                const stillExists = normalized.find(c =>
                    String(c.appointmentId || c.id) === String(selectedClaim.appointmentId || selectedClaim.id)
                );
                if (!stillExists) {
                    console.log("[InventoryMove] Selected claim no longer exists, clearing selection");
                    setSelectedClaim(null);
                }
            }

            if (normalized.length > 0) {
                setSnack({ open: true, message: `Tìm thấy ${normalized.length} cuộc hẹn Đang xử lý`, severity: "success" });
            } else {
                setSnack({ open: true, message: "Không có cuộc hẹn Đang xử lý nào được gán cho bạn", severity: "info" });
                // Clear selection if no appointments
                if (selectedClaim) {
                    setSelectedClaim(null);
                }
            }
        } catch (err) {
            console.error("[InventoryMove] Load claims error:", err);
            setSnack({ open: true, message: err?.response?.data?.message || err.message || "Không thể tải danh sách appointment", severity: "error" });
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
                    const res = await axiosInstance.get("parts/get-active");
                    if (Array.isArray(res.data)) {
                        // fallback: keep all active parts but mark qty=0; user can choose
                        list = res.data.map((p) => ({ ...p, availableQuantity: p.quantity ?? 0 }));
                    }
                } catch (err) {
                    console.warn("[InventoryMove] Fallback to get-active parts failed:", err);
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

    // Load recall events when claim is selected
    useEffect(() => {
        if (!selectedClaim?.vin) {
            setRecallEvents([]);
            return;
        }
        let mounted = true;
        (async () => {
            setLoadingRecallEvents(true);
            try {
                const result = await eventService.checkRecallByVin(selectedClaim.vin);
                if (mounted) {
                    setRecallEvents(result.events || []);
                }
            } catch (err) {
                console.error("Load recall events failed:", err);
                if (mounted) {
                    setRecallEvents([]);
                }
            } finally {
                if (mounted) setLoadingRecallEvents(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [selectedClaim?.vin]);

    // when user selects claim, auto load centerId and service out items
    useEffect(() => {
        if (selectedClaim?.appointmentId) {
            setSearchParams((s) => ({ ...s, appointmentId: selectedClaim.appointmentId }));
            // Get appointment details to extract centerId
            loadAppointmentDetails(selectedClaim.appointmentId);
            // Load service out items for return
            loadServiceOutItems(selectedClaim.appointmentId);
            // load history filtered by appointment
            loadHistory({ appointmentId: selectedClaim.appointmentId, page: 0 });
        } else {
            setParts([]);
            setSelectedParts({});
            setCenterId("");
            setServiceOutItems([]);
        }
    }, [selectedClaim]);

    // Load estimate parts for the selected claim
    useEffect(() => {
        if (selectedClaim?.claimId) {
            loadEstimateParts(selectedClaim.claimId);
        } else {
            setEstimateParts([]);
            setLatestEstimateMeta(null);
            setEstimateFetchError(null);
        }
    }, [selectedClaim?.claimId]);

    // Load appointment details to get centerId
    async function loadAppointmentDetails(appointmentId) {
        try {
            const res = await appointmentService.getById(appointmentId);
            if (res.success && res.data) {
                const appCenterId = res.data.centerId || res.data.center?.id || res.data.claim?.centerId;
                if (appCenterId) {
                    setCenterId(String(appCenterId));
                    // Load available parts with inventory quantities
                    loadAvailableParts(String(appCenterId));
                }
            }
        } catch (err) {
            console.error("[InventoryMove] Load appointment details failed:", err);
        }
    }

    // Load available parts from inventory with quantities
    async function loadAvailableParts(centerIdParam) {
        if (!centerIdParam) return;

        setLoadingAvailableParts(true);
        try {
            // Get all active parts
            const allPartsRes = await partService.getActive();
            const allParts = Array.isArray(allPartsRes) ? allPartsRes : (allPartsRes?.data || allPartsRes?.content || []);
            const catalogUpdate = {};
            allParts.forEach((p) => {
                const pid = String(p.id || p.partId || "");
                if (pid) {
                    catalogUpdate[pid] = {
                        partName: p.partName || p.name || "",
                        partNo: p.partNo || p.code || p.sku || "",
                    };
                }
            });

            // Get inventory for this center
            const inventoryRes = await inventoryPartService.listByCenter(centerIdParam);
            const inventoryParts = Array.isArray(inventoryRes) ? inventoryRes : (inventoryRes?.inventoryParts || inventoryRes?.content || []);

            // Create a map of partId -> available quantity
            const inventoryMap = {};
            inventoryParts.forEach(inv => {
                const pid = inv.partId || inv.part?.id;
                if (pid) {
                    inventoryMap[pid] = (inventoryMap[pid] || 0) + (inv.quantity || 0);
                }
            });

            // Combine parts with available quantities
            const partsWithQty = allParts.map(p => {
                const partId = p.id || p.partId;
                return {
                    partId,
                    partNo: p.partNo || p.code || p.sku,
                    partName: p.partName || p.name,
                    availableQuantity: inventoryMap[partId] || 0,
                    raw: p
                };
            });

            setPartCatalog((prev) => ({ ...prev, ...catalogUpdate }));
            setAvailablePartsList(partsWithQty);
        } catch (err) {
            console.error("[InventoryMove] Load available parts failed:", err);
            setSnack({ open: true, message: "Không thể tải danh sách phụ tùng", severity: "error" });
        } finally {
            setLoadingAvailableParts(false);
        }
    }

    async function loadEstimateParts(claimId) {
        if (!claimId) {
            setEstimateParts([]);
            setLatestEstimateMeta(null);
            setEstimateFetchError(null);
            return;
        }
        setLoadingEstimateParts(true);
        setEstimateFetchError(null);
        try {
            const data = await estimatesService.getByClaim(claimId);
            const arr = Array.isArray(data) ? data : data ? [data] : [];

            if (!arr.length) {
                setEstimateParts([]);
                setLatestEstimateMeta(null);
                return;
            }

            const toTime = (val) => {
                if (!val) return 0;
                const t = new Date(val).getTime();
                return Number.isNaN(t) ? 0 : t;
            };

            const sorted = [...arr].sort((a, b) => {
                const timeA = toTime(a.createdAt || a.updatedAt || a.approvedAt);
                const timeB = toTime(b.createdAt || b.updatedAt || b.approvedAt);
                if (timeA === timeB) {
                    const versionA = Number(a.versionNo ?? a.version ?? 0);
                    const versionB = Number(b.versionNo ?? b.version ?? 0);
                    return versionB - versionA;
                }
                return timeB - timeA;
            });

            const latest = sorted[0] || null;
            let rawItems = [];
            if (latest?.itemsJson) {
                try {
                    rawItems = typeof latest.itemsJson === "string" ? JSON.parse(latest.itemsJson) : latest.itemsJson;
                } catch (jsonErr) {
                    console.warn("[InventoryMove] Parse itemsJson failed:", jsonErr);
                    rawItems = [];
                }
            } else if (Array.isArray(latest?.items)) {
                rawItems = latest.items;
            }

            const normalized = (Array.isArray(rawItems) ? rawItems : []).map((item, idx) => {
                const partIdRaw = item.partId || item.part_id || item.id || item.itemId || "";
                const partId = partIdRaw ? String(partIdRaw) : `idx_${idx}`;
                const partNo = item.partNo || item.part_no || item.code || item.sku || "";
                const partName = item.partName || item.part_name || item.name || "";
                const quantity = Number(item.quantity ?? item.qty ?? item.amount ?? 0) || 0;
                return {
                    partId,
                    partNo,
                    partName,
                    quantity,
                };
            });

            setEstimateParts(normalized);
            setLatestEstimateMeta({
                estimateId: latest?.id ?? null,
                version: latest?.versionNo ?? latest?.version ?? null,
                createdAt: latest?.createdAt || latest?.updatedAt || latest?.approvedAt || null,
            });
        } catch (err) {
            console.error("[InventoryMove] Load estimate parts failed:", err);
            setEstimateParts([]);
            setLatestEstimateMeta(null);
            setEstimateFetchError(err?.response?.data?.message || err.message || "Không thể tải estimate cho claim này");
        } finally {
            setLoadingEstimateParts(false);
        }
    }

    // Load service out items (SERVICE_USE movements) for return
    async function loadServiceOutItems(appointmentId) {
        setLoadingServiceOut(true);
        try {
            const res = await inventoryMovementService.listByAppointment(appointmentId);
            const movements = Array.isArray(res.data) ? res.data : (res.data?.content || []);

            // Filter only SERVICE_USE movements (OUT direction)
            const serviceOutMovements = movements.filter(m =>
                m.reason === "SERVICE_USE" && m.direction === "OUT"
            );

            // Extract part lots from these movements
            const serviceOutLots = [];
            const partLotIdsToFetch = new Set();

            // Bước 1: Extract thông tin cơ bản và thu thập partLotIds cần fetch
            serviceOutMovements.forEach(movement => {
                // Log để debug cấu trúc movement
                console.log("[InventoryMove] Movement structure:", movement);

                if (movement.partLots && Array.isArray(movement.partLots)) {
                    movement.partLots.forEach(lot => {
                        // Log để debug cấu trúc dữ liệu
                        console.log("[InventoryMove] PartLot structure:", lot);

                        const partLotId = lot.id || lot.partLotId || lot.partLot_id || lot.partLot?.id;
                        if (partLotId) {
                            partLotIdsToFetch.add(partLotId);
                        }

                        // Tìm serialNo và batchNo từ nhiều nguồn có thể
                        // 1. Trực tiếp từ lot object (có thể là partLotSerialNo, partLotBatchNo)
                        // 2. Từ nested partLot object
                        // 3. Từ nested part object
                        const serialNo = lot.serialNo || lot.serial_no || lot.serialNumber || lot.serial
                            || lot.partLotSerialNo || lot.partLotSerial_no || lot.partLot?.serialNo || lot.partLot?.serial_no
                            || lot.part?.serialNo || lot.part?.serial_no
                            || null;
                        const batchNo = lot.batchNo || lot.batch_no || lot.batchNumber || lot.batch
                            || lot.partLotBatchNo || lot.partLotBatch_no || lot.partLot?.batchNo || lot.partLot?.batch_no
                            || lot.part?.batchNo || lot.part?.batch_no
                            || null;

                        serviceOutLots.push({
                            ...lot,
                            movementId: movement.id,
                            movementDate: movement.movedAt || movement.createdAt,
                            partName: movement.partName || lot.partName || lot.part?.partName || lot.partLot?.partName,
                            partNo: movement.partNo || lot.partNo || lot.part?.partNo || lot.partLot?.partNo,
                            // Map serialNo và batchNo từ nhiều nguồn có thể (bao gồm partLotSerialNo, partLotBatchNo)
                            serialNo: serialNo || lot.partLotSerialNo || lot.partLotSerial_no || null,
                            batchNo: batchNo || lot.partLotBatchNo || lot.partLotBatch_no || null,
                            // Giữ nguyên các field gốc để có thể dùng sau này
                            partLotSerialNo: lot.partLotSerialNo || lot.partLotSerial_no || null,
                            partLotBatchNo: lot.partLotBatchNo || lot.partLotBatch_no || null,
                            // Giữ nguyên các field khác
                            partLotId: partLotId,
                            quantity: lot.quantity || lot.qty || 1,
                        });
                    });
                }
            });

            // Bước 2: Fetch thông tin chi tiết partLot để lấy serialNo và batchNo
            if (partLotIdsToFetch.size > 0 && centerId) {
                console.log("[InventoryMove] Fetching partLot details for:", Array.from(partLotIdsToFetch));
                console.log("[InventoryMove] Center ID:", centerId);

                try {
                    // Fetch tất cả inventoryLots của center để tìm theo partLotId
                    const allLots = await inventoryLotService.listByCenterWithId(centerId);
                    const inventoryLots = Array.isArray(allLots?.inventoryLots)
                        ? allLots.inventoryLots
                        : (Array.isArray(allLots) ? allLots : []);

                    console.log("[InventoryMove] Fetched inventoryLots:", inventoryLots);

                    // Tạo map partLotId -> inventoryLot
                    const partLotMap = {};
                    inventoryLots.forEach(il => {
                        const ilPartLotId = il.partLotId || il.partLot_id || il.partLot?.id;
                        if (ilPartLotId) {
                            if (!partLotMap[ilPartLotId]) {
                                partLotMap[ilPartLotId] = [];
                            }
                            partLotMap[ilPartLotId].push(il);
                        }
                    });

                    console.log("[InventoryMove] PartLot map:", partLotMap);

                    // Bước 3: Merge thông tin serialNo và batchNo vào serviceOutLots
                    serviceOutLots.forEach(lot => {
                        const matchingLots = partLotMap[lot.partLotId];
                        if (matchingLots && matchingLots.length > 0) {
                            // Lấy lot đầu tiên (hoặc có thể cần logic phức tạp hơn)
                            const inventoryLot = matchingLots[0];

                            if (!lot.serialNo) {
                                lot.serialNo = inventoryLot.serialNo || inventoryLot.serial_no || inventoryLot.serialNumber || null;
                            }
                            if (!lot.batchNo) {
                                lot.batchNo = inventoryLot.batchNo || inventoryLot.batch_no || inventoryLot.batchNumber || null;
                            }

                            console.log(`[InventoryMove] Updated lot ${lot.partLotId}: serialNo=${lot.serialNo}, batchNo=${lot.batchNo}`);
                        } else {
                            console.warn(`[InventoryMove] No inventoryLot found for partLotId: ${lot.partLotId}`);
                        }
                    });
                } catch (err) {
                    console.error("[InventoryMove] Failed to fetch inventoryLots by center:", err);
                }
            } else {
                console.warn("[InventoryMove] Cannot fetch partLot details: missing partLotIds or centerId");
            }

            console.log("[InventoryMove] Service out lots (final):", serviceOutLots);

            setServiceOutItems(serviceOutLots);
        } catch (err) {
            console.error("[InventoryMove] Load service out items failed:", err);
            setServiceOutItems([]);
        } finally {
            setLoadingServiceOut(false);
        }
    }

    // ---------- history (search) ----------
    async function loadHistory(overrides = {}) {
        setHistoryLoading(true);
        try {
            const appointmentId = (overrides.appointmentId ?? searchParams.appointmentId) || undefined;

            // Ưu tiên dùng listByAppointment nếu có appointmentId
            if (appointmentId) {
                try {
                    const res = await inventoryMovementService.listByAppointment(appointmentId);
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
                        setHistory(data ? [data] : []);
                        setHistoryMeta({ totalPages: 1, totalElements: data ? 1 : 0, number: 0 });
                    }
                    return;
                } catch (err) {
                    console.warn("listByAppointment failed, falling back to search:", err);
                    // Fallback to search if listByAppointment fails
                }
            }

            // Dùng search API với các params
            const params = {
                centerId: (overrides.centerId ?? searchParams.centerId) || undefined,
                appointmentId: appointmentId,
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
            setSnack({ open: true, message: "Chọn ít nhất 1 phụ tùng và số lượng > 0", severity: "warning" });
            return;
        }
        setBusy(true);
        try {
            const payload = { appointmentId, partQuantities, note: `ServiceUse từ appointment (${selectedClaim.label})` };
            await inventoryMovementService.serviceUse(payload);
            setSnack({ open: true, message: "Xuất kho thành công", severity: "success" });
            // refresh service out items & history
            loadServiceOutItems(appointmentId);
            loadHistory({ appointmentId, page: 0 });
            // Clear selected parts
            setSelectedParts({});
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
        // selectedPartLotsReturn: { lotId: qty } where lotId is the key from serviceOutItems
        // We need to map back to actual partLotId from serviceOutItems
        Object.entries(selectedPartLotsReturn).forEach(([lotId, qty]) => {
            const qn = Number(qty || 0);
            if (qn > 0) {
                // Find the actual partLotId from serviceOutItems
                const item = serviceOutItems.find(item => {
                    const itemLotId = item.partLotId || item.id || `lot_${serviceOutItems.indexOf(item)}`;
                    return String(itemLotId) === String(lotId);
                });

                if (item) {
                    const actualPartLotId = item.partLotId || item.id;
                    if (actualPartLotId) {
                        partLotQuantities.push({ partLotId: String(actualPartLotId), quantity: qn });
                        console.log("[InventoryMove] Adding return:", { partLotId: actualPartLotId, quantity: qn });
                    } else {
                        console.warn("[InventoryMove] Item found but no partLotId:", item);
                    }
                } else {
                    console.warn("[InventoryMove] Item not found for lotId:", lotId);
                }
            }
        });

        if (!partLotQuantities.length) {
            setSnack({ open: true, message: "Chọn ít nhất 1 lot để trả (qty > 0)", severity: "warning" });
            return;
        }

        setBusy(true);
        try {
            const payload = { appointmentId, partLotQuantities, note: `Return từ appointment (${selectedClaim.label})` };
            console.log("[InventoryMove] Return payload:", JSON.stringify(payload, null, 2));
            await inventoryMovementService.returnParts(payload);
            setSnack({ open: true, message: "Trả phụ tùng thành công", severity: "success" });
            // refresh service out items & history
            loadServiceOutItems(appointmentId);
            loadHistory({ appointmentId, page: 0 });
            // Clear selected return lots
            setSelectedPartLotsReturn({});
        } catch (err) {
            console.error("[InventoryMove] Return error:", err);
            console.error("[InventoryMove] Error response:", err?.response?.data);
            const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err.message || "Tạo return thất bại";
            setSnack({ open: true, message: errorMessage, severity: "error" });
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

    // ---------- traceability ----------
    async function handleTraceability() {
        if (!traceabilityInput.trim()) {
            setSnack({ open: true, message: "Vui lòng nhập VIN hoặc Serial Number", severity: "warning" });
            return;
        }

        setTraceabilityLoading(true);
        setTraceabilityData(null);
        setOpenTraceability(true);

        try {
            if (traceabilityType === "vin") {
                const res = await inventoryMovementService.traceabilityByVin(traceabilityInput.trim());
                setTraceabilityData(res.data);
            } else if (traceabilityType === "serialNo") {
                // Thử lấy info trước
                try {
                    const res = await inventoryMovementService.traceabilityBySerialNoInfo(traceabilityInput.trim());
                    setTraceabilityData({ type: "info", data: res.data });
                } catch (err) {
                    // Nếu info fail, thử vin
                    try {
                        const res = await inventoryMovementService.traceabilityBySerialNoVin(traceabilityInput.trim());
                        setTraceabilityData({ type: "vin", data: res.data });
                    } catch (err2) {
                        throw err; // Throw original error
                    }
                }
            }
        } catch (err) {
            console.error("Traceability error:", err);
            setSnack({ open: true, message: err?.response?.data?.message || "Không tìm thấy thông tin", severity: "error" });
            setTraceabilityData(null);
        } finally {
            setTraceabilityLoading(false);
        }
    }

    // Add part to export list
    const handleAddPart = (part) => {
        if (!part || !part.partId) return;

        // Check if part already added
        if (parts.find(p => p.partId === part.partId)) {
            setSnack({ open: true, message: "Phụ tùng này đã được thêm", severity: "warning" });
            return;
        }

        // Add part with available quantity
        setParts([...parts, {
            ...part,
            availableQuantity: part.availableQuantity || 0
        }]);
        setSelectedParts({ ...selectedParts, [part.partId]: 0 });
        setOpenAddPartDialog(false);
    };

    // Remove part from export list
    const handleRemovePart = (partId) => {
        setParts(parts.filter(p => p.partId !== partId));
        const newSelected = { ...selectedParts };
        delete newSelected[partId];
        setSelectedParts(newSelected);
    };

    // ---------- computed ----------
    const estimatePartsDisplay = useMemo(() => {
        return (estimateParts || []).map((item) => {
            const catalogInfo = item.partId ? partCatalog[String(item.partId)] : null;
            const displayName = (item.partName && String(item.partName).trim()) ||
                (catalogInfo?.partName && String(catalogInfo.partName).trim()) ||
                (item.partNo && String(item.partNo).trim()) ||
                (catalogInfo?.partNo && String(catalogInfo.partNo).trim()) ||
                (item.partId && String(item.partId).trim()) ||
                "—";
            const displayPartNo = (item.partNo && String(item.partNo).trim()) ||
                (catalogInfo?.partNo && String(catalogInfo.partNo).trim()) ||
                "";
            return {
                ...item,
                displayName,
                displayPartNo,
            };
        });
    }, [estimateParts, partCatalog]);

    const totalPartsSelected = useMemo(() => {
        return Object.values(selectedParts).reduce((s, v) => s + (Number(v) || 0), 0);
    }, [selectedParts]);

    const totalReturnQty = useMemo(() => {
        return Object.values(selectedPartLotsReturn).reduce((s, v) => s + (Number(v) || 0), 0);
    }, [selectedPartLotsReturn]);

    // Get affected parts from recall events - map IDs to part names
    const affectedPartsFromRecall = useMemo(() => {
        if (!recallEvents || recallEvents.length === 0) return { ids: [], names: [] };
        const allAffectedPartIds = [];
        const allAffectedPartNames = [];

        recallEvents.forEach(event => {
            // Try to get affectedParts from multiple possible fields
            let partIds = [];

            // Try affectedParts (array)
            if (event.affectedParts && Array.isArray(event.affectedParts)) {
                partIds = event.affectedParts;
            }
            // Try affectedPartsJson (JSON string)
            else if (event.affectedPartsJson) {
                try {
                    const parsed = typeof event.affectedPartsJson === 'string'
                        ? JSON.parse(event.affectedPartsJson)
                        : event.affectedPartsJson;
                    if (Array.isArray(parsed)) {
                        partIds = parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse affectedPartsJson:", e);
                }
            }
            // Try affected_parts (snake_case)
            else if (event.affected_parts && Array.isArray(event.affected_parts)) {
                partIds = event.affected_parts;
            }

            if (partIds.length > 0) {
                partIds.forEach(partId => {
                    const partIdStr = String(partId).trim();
                    // Kiểm tra xem có phải là UUID (ID) không
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partIdStr);

                    if (isUUID) {
                        // Lưu ID
                        allAffectedPartIds.push(partIdStr);
                        // Tìm part theo ID trong availablePartsList để lấy tên (availablePartsList có partId, không phải id)
                        const part = availablePartsList.find(p => String(p.partId) === partIdStr || String(p.id) === partIdStr);
                        if (part) {
                            const partName = part.partName || part.partNo || partIdStr;
                            allAffectedPartNames.push(partName.toLowerCase());
                        }
                    } else {
                        // Nếu không phải UUID, giả định là tên part
                        allAffectedPartNames.push(partIdStr.toLowerCase());
                    }
                });
            }
        });

        // Remove duplicates
        const uniqueIds = [...new Set(allAffectedPartIds)];
        const uniqueNames = [...new Set(allAffectedPartNames)];

        return { ids: uniqueIds, names: uniqueNames };
    }, [recallEvents, availablePartsList]);

    // Filter parts for RECALL claims - only show parts that match affectedParts
    const availableParts = useMemo(() => {
        if (recallEvents.length === 0) {
            // Not a RECALL claim, show all parts
            return availablePartsList;
        }
        // RECALL claim - only show parts that match affectedParts (by ID or name)
        return availablePartsList.filter(part => {
            // availablePartsList có partId, không phải id
            const partId = String(part.partId || part.id);
            const partNameLower = (part.partName || "").toLowerCase();
            const partNoLower = (part.partNo || "").toLowerCase();

            // Kiểm tra theo ID trước (chính xác nhất)
            if (affectedPartsFromRecall.ids.includes(partId)) {
                return true;
            }

            // Kiểm tra theo tên (fallback)
            return affectedPartsFromRecall.names.some(affectedName =>
                partNameLower.includes(affectedName) ||
                affectedName.includes(partNameLower) ||
                partNoLower.includes(affectedName) ||
                affectedName.includes(partNoLower)
            );
        });
    }, [availablePartsList, recallEvents, affectedPartsFromRecall]);

    // Map affected part IDs to names for display
    const affectedPartsDisplayNames = useMemo(() => {
        if (!affectedPartsFromRecall || affectedPartsFromRecall.ids.length === 0) return [];

        return affectedPartsFromRecall.ids.map(id => {
            // Tìm part trong availablePartsList (availablePartsList có partId, không phải id)
            const part = availablePartsList.find(p => String(p.partId) === id || String(p.id) === id);
            if (part) {
                return part.partName || part.partNo || id;
            }
            // Nếu không tìm thấy trong availablePartsList, giữ nguyên ID
            return id;
        });
    }, [affectedPartsFromRecall, availablePartsList]);

    // Filter available parts (exclude already added AND filter by recall events if applicable)
    const availablePartsForSelection = useMemo(() => {
        const addedPartIds = new Set(parts.map(p => p.partId));

        // First, filter by recall events if applicable (same logic as availableParts)
        let filteredByRecall = availablePartsList;
        if (recallEvents.length > 0) {
            filteredByRecall = availablePartsList.filter(part => {
                const partId = String(part.partId || part.id);
                const partNameLower = (part.partName || "").toLowerCase();
                const partNoLower = (part.partNo || "").toLowerCase();

                // Kiểm tra theo ID trước (chính xác nhất)
                if (affectedPartsFromRecall.ids.includes(partId)) {
                    return true;
                }

                // Kiểm tra theo tên (fallback)
                return affectedPartsFromRecall.names.some(affectedName =>
                    partNameLower.includes(affectedName) ||
                    affectedName.includes(partNameLower) ||
                    partNoLower.includes(affectedName) ||
                    affectedName.includes(partNoLower)
                );
            });
        }

        // Then, exclude already added parts
        return filteredByRecall.filter(p => !addedPartIds.has(p.partId));
    }, [availablePartsList, parts, recallEvents, affectedPartsFromRecall]);

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
                                setSnack({ open: true, message: "Chọn phụ tùng rồi nhấn 'Tạo Xuất kho'", severity: "info" });
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
                            getOptionLabel={(opt) => {
                                if (!opt) return "";
                                // Always use the label field if it exists and is not empty
                                if (opt.label && opt.label.trim()) {
                                    return opt.label;
                                }
                                // Build label from VIN • Intake contactName (no Date)
                                const parts = [];
                                if (opt.vin && opt.vin !== "—" && String(opt.vin).trim().length > 0) {
                                    parts.push(String(opt.vin).trim());
                                }
                                // Prefer intakeContactName, fallback to customerName
                                const contactName = opt.intakeContactName || opt.customerName;
                                if (contactName && contactName !== "—" && String(contactName).trim().length > 0) {
                                    parts.push(String(contactName).trim());
                                }
                                if (parts.length > 0) {
                                    return parts.join(" • ");
                                }
                                // Fallback: Just appointment ID
                                if (opt.appointmentId || opt.id) {
                                    return `Appointment ${String(opt.appointmentId || opt.id).slice(0, 8)}`;
                                }
                                return "Appointment";
                            }}
                            isOptionEqualToValue={(option, value) => {
                                if (!option || !value) return option === value; // Both null/undefined
                                const optionId = String(option?.appointmentId || option?.id || "");
                                const valueId = String(value?.appointmentId || value?.id || "");
                                return optionId === valueId && optionId !== "";
                            }}
                            loading={loadingClaims}
                            value={selectedClaim || null}
                            onChange={(e, newValue) => {
                                console.log("[InventoryMove] Selected claim:", newValue);
                                console.log("[InventoryMove] Selected claim label:", newValue?.label);
                                setSelectedClaim(newValue);
                            }}
                            noOptionsText={loadingClaims ? "Đang tải..." : claims.length === 0 ? "Không có cuộc hẹn Đang xử lý" : "Không tìm thấy"}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Chọn đơn bảo hành / cuộc hẹn (Đang xử lý)"
                                    placeholder={loadingClaims ? "Đang tải..." : claims.length === 0 ? "Không có cuộc hẹn Đang xử lý" : "Chọn cuộc hẹn (VIN • Tên liên hệ)"}
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
                            renderOption={(props, option) => {
                                // Show VIN • Intake contactName (no Date)
                                let label = "";
                                if (option.label && option.label.trim()) {
                                    label = option.label;
                                } else {
                                    const parts = [];
                                    if (option.vin && option.vin !== "—" && String(option.vin).trim().length > 0) {
                                        parts.push(String(option.vin).trim());
                                    }
                                    // Prefer intakeContactName, fallback to customerName
                                    const contactName = option.intakeContactName || option.customerName;
                                    if (contactName && contactName !== "—" && String(contactName).trim().length > 0) {
                                        parts.push(String(contactName).trim());
                                    }
                                    if (parts.length > 0) {
                                        label = parts.join(" • ");
                                    } else if (option.appointmentId || option.id) {
                                        label = `Appointment ${String(option.appointmentId || option.id).slice(0, 8)}`;
                                    } else {
                                        label = "Appointment";
                                    }
                                }

                                return (
                                    <li {...props} key={option.appointmentId || option.id}>
                                        <Typography variant="body2">{label}</Typography>
                                    </li>
                                );
                            }}
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
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>Phụ tùng thuộc cuộc hẹn</Typography>
                            {recallEvents.length > 0 && (
                                <Chip
                                    label="RECALL - Chỉ chọn phụ tùng trong events"
                                    color="warning"
                                    size="small"
                                />
                            )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Thêm phụ tùng và nhập số lượng cần xuất.
                        </Typography>
                        {selectedClaim?.claimId && (
                            loadingEstimateParts ? (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    <Typography variant="caption">Đang tải phụ tùng từ Estimate...</Typography>
                                </Alert>
                            ) : estimateFetchError ? (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    <Typography variant="caption">{estimateFetchError}</Typography>
                                </Alert>
                            ) : estimatePartsDisplay.length > 0 ? (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={600}>
                                        Phụ tùng trong Estimate{latestEstimateMeta?.version ? ` (Version ${latestEstimateMeta.version})` : ""}:
                                    </Typography>
                                    <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                                        {estimatePartsDisplay.map((item, idx) => (
                                            <Typography key={`${item.partId}_${idx}`} variant="caption">
                                                • {item.displayName}{item.displayPartNo ? ` (${item.displayPartNo})` : ""} – SL: {item.quantity}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Alert>
                            ) : (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    <Typography variant="caption">Chưa có Estimate nào cho claim này.</Typography>
                                </Alert>
                            )
                        )}
                        {recallEvents.length > 0 && (affectedPartsFromRecall.ids.length > 0 || affectedPartsFromRecall.names.length > 0) && (
                            <Alert severity="info" sx={{ mb: 1 }}>
                                <Typography variant="caption">
                                    Phụ tùng được phép chọn: {affectedPartsDisplayNames.length > 0
                                        ? affectedPartsDisplayNames.join(", ")
                                        : affectedPartsFromRecall.ids.length > 0
                                            ? affectedPartsFromRecall.ids.join(", ")
                                            : "—"}
                                </Typography>
                            </Alert>
                        )}

                        {/* Button to add part */}
                        <Box sx={{ mb: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenAddPartDialog(true)}
                                disabled={!selectedClaim || loadingAvailableParts}
                                size="small"
                            >
                                Thêm phụ tùng
                            </Button>
                        </Box>

                        {loadingParts ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>
                        ) : parts.length === 0 ? (
                            <Box p={2}>
                                <Typography color="text.secondary">
                                    Chưa có phụ tùng nào được thêm. Nhấn "Thêm phụ tùng" để bắt đầu.
                                </Typography>
                            </Box>
                        ) : (
                            <Table size="small" sx={{ tableLayout: "auto", width: "100%" }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: "20%", px: 1 }}>Part No</TableCell>
                                        <TableCell sx={{ width: "35%", px: 1 }}>Tên phụ tùng</TableCell>
                                        <TableCell sx={{ width: "15%", px: 1 }} align="center">Sẵn có</TableCell>
                                        <TableCell sx={{ width: "20%", px: 1 }} align="center">Xuất (qty)</TableCell>
                                        <TableCell sx={{ width: "10%", px: 1 }} align="center">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parts.map((p) => (
                                        <TableRow key={p.partId || p.partNo || p.partName}>
                                            <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                <Tooltip title={p.partNo || "—"} arrow>
                                                    <Typography variant="body2" noWrap>
                                                        {p.partNo || "—"}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                <Tooltip title={p.partName || "—"} arrow>
                                                    <Typography variant="body2" noWrap>
                                                        {p.partName || "—"}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ px: 1 }}>
                                                <Typography variant="body2" fontWeight={600} color={p.availableQuantity > 0 ? "success.main" : "error.main"}>
                                                    {p.availableQuantity ?? 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ px: 1 }}>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    inputProps={{ min: 0, max: p.availableQuantity }}
                                                    value={selectedParts[p.partId] ?? 0}
                                                    onChange={(e) => {
                                                        const v = Math.min(Number(e.target.value || 0), p.availableQuantity);
                                                        setSelectedParts((s) => ({ ...s, [p.partId]: v }));
                                                    }}
                                                    sx={{ width: 70 }}
                                                    error={selectedParts[p.partId] > p.availableQuantity}
                                                    helperText={selectedParts[p.partId] > p.availableQuantity ? "Vượt quá" : ""}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ px: 1 }}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleRemovePart(p.partId)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
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
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Trả phụ tùng (Return)</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Chọn các lot hợp lệ để trả
                        </Typography>

                        {loadingServiceOut ? (
                            <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>
                        ) : serviceOutItems.length === 0 ? (
                            <Box p={2}>
                                <Typography color="text.secondary">
                                    Không có phụ tùng nào đã xuất (service out) để trả lại.
                                </Typography>
                            </Box>
                        ) : (
                            <Table size="small" sx={{ tableLayout: "auto", width: "100%" }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: "11%", px: 1 }}>Part No</TableCell>
                                        <TableCell sx={{ width: "20%", px: 1 }}>Tên phụ tùng</TableCell>
                                        <TableCell sx={{ width: "14%", px: 1 }}>Serial</TableCell>
                                        <TableCell sx={{ width: "16%", px: 1 }}>Batch</TableCell>
                                        <TableCell sx={{ width: "8%", px: 1 }} align="center">Số lượng</TableCell>
                                        <TableCell sx={{ width: "16%", px: 1 }}>Ngày xuất</TableCell>
                                        <TableCell sx={{ width: "15%", px: 1 }} align="center">Trả (qty)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {serviceOutItems.map((item, idx) => {
                                        const lotId = item.partLotId || item.id || `lot_${idx}`;
                                        const maxQty = item.quantity || 0;
                                        // Lấy serialNo và batchNo từ nhiều nguồn có thể (bao gồm partLotSerialNo, partLotBatchNo)
                                        const serialNo = item.serialNo || item.serial_no || item.serialNumber || item.serial
                                            || item.partLotSerialNo || item.partLotSerial_no || item.partLot?.serialNo || null;
                                        const batchNo = item.batchNo || item.batch_no || item.batchNumber || item.batch
                                            || item.partLotBatchNo || item.partLotBatch_no || item.partLot?.batchNo || null;

                                        // Debug log
                                        if (idx === 0) {
                                            console.log("[InventoryMove] First serviceOutItem:", item);
                                            console.log("[InventoryMove] Extracted serialNo:", serialNo, "batchNo:", batchNo);
                                        }

                                        return (
                                            <TableRow key={lotId}>
                                                <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                    <Tooltip title={item.partNo || "—"} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {item.partNo || "—"}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                    <Tooltip title={item.partName || "—"} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {item.partName || "—"}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                    <Tooltip title={serialNo || "—"} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {serialNo || "—"}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                    <Tooltip title={batchNo || "—"} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {batchNo || "—"}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center" sx={{ px: 1 }}>{maxQty}</TableCell>
                                                <TableCell sx={{ px: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                                                    <Tooltip title={fmtDate(item.movementDate)} arrow>
                                                        <Typography variant="body2" noWrap>
                                                            {fmtDate(item.movementDate)}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center" sx={{ px: 1 }}>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        inputProps={{ min: 0, max: maxQty }}
                                                        value={selectedPartLotsReturn[lotId] ?? 0}
                                                        onChange={(e) => {
                                                            const v = Math.min(Number(e.target.value || 0), maxQty);
                                                            setSelectedPartLotsReturn((s) => ({ ...s, [lotId]: v }));
                                                        }}
                                                        sx={{ width: 70 }}
                                                        error={selectedPartLotsReturn[lotId] > maxQty}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
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

            {/* Dialog to add part */}
            <Dialog open={openAddPartDialog} onClose={() => setOpenAddPartDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Chọn phụ tùng</DialogTitle>
                <DialogContent dividers>
                    {loadingAvailableParts ? (
                        <Box display="flex" justifyContent="center" p={2}>
                            <CircularProgress />
                        </Box>
                    ) : availablePartsForSelection.length === 0 ? (
                        <Typography color="text.secondary">Không còn phụ tùng nào để thêm</Typography>
                    ) : (
                        <Autocomplete
                            options={availablePartsForSelection}
                            getOptionLabel={(opt) => `${opt.partNo || ""} - ${opt.partName || ""} (Còn: ${opt.availableQuantity || 0})`}
                            loading={loadingAvailableParts}
                            onChange={(e, v) => {
                                if (v) handleAddPart(v);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Chọn phụ tùng"
                                    placeholder="Tên phụ tùng"
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
                            renderOption={(props, option) => (
                                <li {...props} key={option.partId}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {option.partNo || "—"} - {option.partName || "—"}
                                        </Typography>
                                        <Typography variant="caption" color={option.availableQuantity > 0 ? "success.main" : "error.main"}>
                                            Sẵn có: {option.availableQuantity || 0}
                                        </Typography>
                                    </Box>
                                </li>
                            )}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddPartDialog(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Traceability Section */}
            <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Truy xuất nguồn gốc phụ tùng</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Loại tra cứu</InputLabel>
                            <Select
                                value={traceabilityType}
                                label="Loại tra cứu"
                                onChange={(e) => setTraceabilityType(e.target.value)}
                            >
                                <MenuItem value="vin">Theo VIN</MenuItem>
                                <MenuItem value="serialNo">Theo Serial Number</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            size="small"
                            label={traceabilityType === "vin" ? "Nhập VIN" : "Nhập Serial Number"}
                            value={traceabilityInput}
                            onChange={(e) => setTraceabilityInput(e.target.value)}
                            placeholder={traceabilityType === "vin" ? "VD: VIN123456789" : "VD: SERIAL001"}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleTraceability}
                            disabled={traceabilityLoading || !traceabilityInput.trim()}
                            startIcon={traceabilityLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                        >
                            Tra cứu
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

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
                                <TableCell>Trung tâm</TableCell>
                                <TableCell>Cuộc hẹn</TableCell>
                                <TableCell>Phụ tùng</TableCell>
                                <TableCell>Hướng</TableCell>
                                <TableCell>Lý do</TableCell>
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
                            <Typography variant="subtitle2">Trung tâm: {detailMovement.centerName || detailMovement.centerId}</Typography>
                            <Typography variant="subtitle2">Ghi chú cuộc hẹn: {detailMovement.appointmentNote || "—"}</Typography>
                            <Typography variant="subtitle2">Phụ tùng: {detailMovement.partName || detailMovement.partNo || "—"}</Typography>
                            <Typography variant="body2">Lý do: {detailMovement.reason}</Typography>
                            <Typography variant="body2">Hướng: {detailMovement.direction}</Typography>
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

            {/* Traceability Dialog */}
            <Dialog open={openTraceability} onClose={() => setOpenTraceability(false)} maxWidth="md" fullWidth>
                <DialogTitle>Truy xuất nguồn gốc phụ tùng</DialogTitle>
                <DialogContent dividers>
                    {traceabilityLoading ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <CircularProgress />
                        </Box>
                    ) : traceabilityData ? (
                        <Box>
                            {traceabilityType === "vin" && Array.isArray(traceabilityData) ? (
                                // Traceability by VIN - returns array of parts
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                        Tìm thấy {traceabilityData.length} phụ tùng cho VIN: <strong>{traceabilityInput}</strong>
                                    </Typography>
                                    {traceabilityData.map((part, idx) => (
                                        <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                            <Typography variant="h6" sx={{ mb: 1 }}>{part.partName || part.partNo}</Typography>
                                            <Typography variant="body2"><strong>Part No:</strong> {part.partNo || "—"}</Typography>
                                            {part.serialNo && <Typography variant="body2"><strong>Serial No:</strong> {part.serialNo}</Typography>}
                                            {part.batchNo && <Typography variant="body2"><strong>Batch No:</strong> {part.batchNo}</Typography>}
                                            {part.productionDate && <Typography variant="body2"><strong>Ngày SX:</strong> {fmtDate(part.productionDate)}</Typography>}
                                            {part.supplier && <Typography variant="body2"><strong>Nhà cung cấp:</strong> {part.supplier}</Typography>}

                                            {part.movements && part.movements.length > 0 && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Lịch sử di chuyển:</Typography>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Ngày</TableCell>
                                                                <TableCell>Hướng</TableCell>
                                                                <TableCell>Lý do</TableCell>
                                                                <TableCell>Trung tâm</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {part.movements.map((mov, mIdx) => (
                                                                <TableRow key={mIdx}>
                                                                    <TableCell>{fmtDate(mov.date)}</TableCell>
                                                                    <TableCell><Chip label={mov.direction} size="small" /></TableCell>
                                                                    <TableCell>{mov.reason}</TableCell>
                                                                    <TableCell>{mov.centerName}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            ) : traceabilityData?.type === "info" ? (
                                // Traceability by SerialNo - info
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                        Thông tin Serial Number: <strong>{traceabilityInput}</strong>
                                    </Typography>
                                    <Typography variant="body2"><strong>Part Name:</strong> {traceabilityData.data.partName || "—"}</Typography>
                                    <Typography variant="body2"><strong>Part No:</strong> {traceabilityData.data.partNo || "—"}</Typography>
                                    <Typography variant="body2"><strong>Serial No:</strong> {traceabilityData.data.serialNo || "—"}</Typography>
                                    {traceabilityData.data.batchNo && <Typography variant="body2"><strong>Batch No:</strong> {traceabilityData.data.batchNo}</Typography>}
                                    {traceabilityData.data.mfgDate && <Typography variant="body2"><strong>Ngày SX:</strong> {fmtDate(traceabilityData.data.mfgDate)}</Typography>}
                                    {traceabilityData.data.currentCenter && <Typography variant="body2"><strong>Trung tâm hiện tại:</strong> {traceabilityData.data.currentCenter}</Typography>}
                                    {traceabilityData.data.movements && traceabilityData.data.movements.length > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Lịch sử di chuyển:</Typography>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Ngày</TableCell>
                                                        <TableCell>Hướng</TableCell>
                                                        <TableCell>Lý do</TableCell>
                                                        <TableCell>Trung tâm</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {traceabilityData.data.movements.map((mov, mIdx) => (
                                                        <TableRow key={mIdx}>
                                                            <TableCell>{fmtDate(mov.date)}</TableCell>
                                                            <TableCell><Chip label={mov.direction} size="small" /></TableCell>
                                                            <TableCell>{mov.reason}</TableCell>
                                                            <TableCell>{mov.centerName}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    )}
                                </Box>
                            ) : traceabilityData?.type === "vin" ? (
                                // Traceability by SerialNo - VIN
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                        VIN liên quan đến Serial Number: <strong>{traceabilityInput}</strong>
                                    </Typography>
                                    {traceabilityData.data.vin && <Typography variant="body2"><strong>VIN:</strong> {traceabilityData.data.vin}</Typography>}
                                    {traceabilityData.data.vehicleInfo && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="subtitle2">Thông tin xe:</Typography>
                                            <Typography variant="body2"><strong>VIN:</strong> {traceabilityData.data.vehicleInfo.vin}</Typography>
                                            {traceabilityData.data.vehicleInfo.model && <Typography variant="body2"><strong>Model:</strong> {traceabilityData.data.vehicleInfo.model}</Typography>}
                                            {traceabilityData.data.vehicleInfo.customerName && <Typography variant="body2"><strong>Khách hàng:</strong> {traceabilityData.data.vehicleInfo.customerName}</Typography>}
                                            {traceabilityData.data.vehicleInfo.installedDate && <Typography variant="body2"><strong>Ngày lắp:</strong> {fmtDate(traceabilityData.data.vehicleInfo.installedDate)}</Typography>}
                                        </Box>
                                    )}
                                    {traceabilityData.data.partInfo && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="subtitle2">Thông tin phụ tùng:</Typography>
                                            <Typography variant="body2"><strong>Part Name:</strong> {traceabilityData.data.partInfo.partName}</Typography>
                                            <Typography variant="body2"><strong>Part No:</strong> {traceabilityData.data.partInfo.partNo}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            ) : (
                                <Typography color="text.secondary">Không có dữ liệu</Typography>
                            )}
                        </Box>
                    ) : (
                        <Typography color="text.secondary">Nhập VIN hoặc Serial Number để tra cứu</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenTraceability(false);
                        setTraceabilityData(null);
                        setTraceabilityInput("");
                    }}>
                        Đóng
                    </Button>
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