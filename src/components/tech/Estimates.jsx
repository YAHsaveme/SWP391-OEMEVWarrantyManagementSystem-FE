// src/components/technician/Estimates.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Stack,
    TextField,
    InputAdornment,
    Button,
    IconButton,
    Tooltip,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Divider,
    CircularProgress,
    Snackbar,
    Alert,
    Collapse,
    Autocomplete,
    FormGroup,
    FormControlLabel,
    Checkbox,
} from "@mui/material";
import {
    Search as SearchIcon,
    Add,
    DeleteOutline,
    ExpandMore,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    Receipt as ReceiptIcon,
    CheckCircle as CheckCircleIcon,
    CompareArrows as CompareIcon,
} from "@mui/icons-material";
import estimatesService from "../../services/estimatesService";
import claimService, { CLAIM_STATUS } from "../../services/claimService";
import axiosInstance from "../../services/axiosInstance";
import vehicleService from "../../services/vehicleService";
import eventService from "../../services/eventService";
import axios from "axios";

const statusColor = {
    DIAGNOSING: "warning",
    ESTIMATING: "info",
    UNDER_REVIEW: "secondary",
    APPROVED: "success",
    COMPLETED: "default",
    REJECTED: "error",
};

/**
 * Fully-featured Estimates management UI that connects to all endpoints in estimatesService.js
 * Implements: create, update, getById, getByClaim, getByClaimAndVersion
 * - Does NOT expose raw IDs to the user (IDs are used internally only)
 * - Shows version numbers, allows selecting/viewing specific version, comparing versions
 * - Sorting, searching, filtering, validations, messages
 */
export default function Estimates() {
    const [claims, setClaims] = useState([]);
    const [estimates, setEstimates] = useState([]); // flattened list used for quick search/sort
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    // Dialog states
    const [estimatesOpen, setEstimatesOpen] = useState(false);
    const [activeClaim, setActiveClaim] = useState(null);

    // Parts list for autocomplete
    const [parts, setParts] = useState([]);
    const [partsLoading, setPartsLoading] = useState(false);

    // Load claims & parts
    useEffect(() => {
        loadClaims();
        loadParts();
    }, [statusFilter]);

    const loadClaims = async () => {
        try {
            setLoading(true);
            const data = await claimService.getAll();

            const enriched = await Promise.all(
                (Array.isArray(data) ? data : data ? [data] : []).map(async (claim) => {
                    let customerName = "Không rõ";

                    if (claim.vin) {
                        try {
                            const vehicle = await vehicleService.getByVin(claim.vin);
                            customerName =
                                vehicle?.intakeContactName ||
                                vehicle?.intake_contact_name ||
                                vehicle?.customerName ||
                                vehicle?.ownerName ||
                                "Không rõ";
                        } catch (error) {
                            if (error.message?.includes("VIN không hợp lệ")) {
                                // VIN không có trong DB hoặc backend trả 400 → chỉ hiển thị “Không rõ”
                                console.info(`⚠️ VIN ${claim.vin} không tồn tại trong hệ thống.`);
                            } else {
                                console.warn(`❌ Lỗi khi lấy thông tin khách hàng VIN: ${claim.vin}`, error);
                            }
                        }
                    }

                    return { ...claim, intakeContactName: customerName };
                })
            );

            setClaims(enriched);
        } catch (err) {
            console.error("Load claims failed:", err);
            setSnack({
                open: true,
                message: "Không thể tải danh sách claims",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadParts = async () => {
        try {
            setPartsLoading(true);
            const res = await axiosInstance.get("parts/get-active");
            const raw = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
            const normalized = raw.map((p) => ({
                id: p.id,
                partNo: p.partNo || "",
                partName: p.partName || p.name || "(no name)",
                unitPriceVND: p.unitPrice ?? p.unitPriceVND ?? 0,
            }));
            setParts(normalized);
        } catch (err) {
            console.error("Load parts failed:", err);
            setSnack({ open: true, message: "Không tải được danh sách phụ tùng", severity: "warning" });
        } finally {
            setPartsLoading(false);
        }
    };

    // Filter claims by search
    const filteredClaims = useMemo(() => {
        const text = searchQuery.trim().toLowerCase();
        if (!text) return claims;
        return claims.filter((c) =>
            (c.vin || "").toLowerCase().includes(text) ||
            (c.summary || "").toLowerCase().includes(text) ||
            (c.intakeContactName || "").toLowerCase().includes(text)
        );
    }, [claims, searchQuery]);

    const handleClaimSelect = async (claim) => {
        try {
            setLoading(true);
            const detail = await claimService.getById(claim.id);
            setActiveClaim(detail || claim);
            setEstimatesOpen(true);
        } catch (err) {
            console.error("Load claim for estimates failed:", err);
            setSnack({ open: true, message: "Không thể tải claim cho estimates", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = async (e) => {
        e?.preventDefault();
        const text = searchQuery.trim();
        if (!text) {
            loadClaims();
            return;
        }

        try {
            setLoading(true);
            const data = await claimService.getByVin(text);
            if (Array.isArray(data)) setClaims(data);
            else if (data) setClaims([data]);
            else setClaims([]);
        } catch (err) {
            console.error("Search by VIN failed:", err);
            setSnack({ open: true, message: "Tìm kiếm thất bại", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    if (loading && claims.length === 0) {
        return (
            <Box sx={{ py: 10, textAlign: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <ReceiptIcon sx={{ fontSize: 40, color: "primary.main" }} />
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Quản lý Báo giá (Estimates)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Tạo, xem, và quản lý nhiều version báo giá cho mỗi claim. (Không hiển thị ID trên giao diện)
                    </Typography>
                </Box>
            </Stack>

            {/* Search + Filter */}
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <form onSubmit={handleSearchSubmit}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm theo VIN, summary, hoặc tên người liên hệ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </form>
                </Grid>

                <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="sort-label">Sắp xếp</InputLabel>
                        <Select
                            labelId="sort-label"
                            label="Sắp xếp"
                            value={"created_desc"}
                            onChange={() => { /* placeholder - local sorts inside dialog */ }}
                        >
                            <MenuItem value="created_desc">Mới nhất</MenuItem>
                            <MenuItem value="created_asc">Cũ nhất</MenuItem>
                            <MenuItem value="vin_asc">VIN A→Z</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {/* Claims List */}
            <Stack spacing={2}>
                {filteredClaims.map((claim) => (
                    <Card key={claim.id} elevation={3} sx={{ "&:hover": { boxShadow: 8 }, transition: "all 0.2s" }}>
                        <CardContent>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                                <Box flex={1}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="h6" fontWeight={700}>
                                            {claim.intakeContactName || "—"}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={claim.status}
                                            color={statusColor[claim.status] || "default"}
                                            variant={claim.status === "APPROVED" ? "filled" : "outlined"}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Stack>

                                    <Stack spacing={0.5}>
                                        <Row label="Khách hàng" value={claim.intakeContactName || "—"} />
                                        <Row label="VIN" value={<Mono>{claim.vin}</Mono>} />
                                        <Row label="Tóm tắt" value={claim.summary || "—"} />
                                        <Row
                                            label="Ngày tạo"
                                            value={new Date(claim.openedAt || claim.createdAt || claim.errorDate || Date.now()).toLocaleDateString("vi-VN")}
                                        />
                                    </Stack>
                                </Box>

                                <Stack direction="row" spacing={1} alignSelf={{ xs: "flex-start", sm: "center" }}>
                                    <Tooltip title="Quản lý Estimates">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<ReceiptIcon />}
                                            onClick={() => handleClaimSelect(claim)}
                                        >
                                            Estimates
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}

                {filteredClaims.length === 0 && (
                    <Card variant="outlined">
                        <CardContent sx={{ textAlign: "center", color: "text.secondary", py: 5 }}>
                            <ReceiptIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
                            <Typography>Không tìm thấy claim nào.</Typography>
                        </CardContent>
                    </Card>
                )}
            </Stack>

            {/* Estimates Dialog (full-featured) */}
            <EstimatesDialog
                open={estimatesOpen}
                onClose={() => setEstimatesOpen(false)}
                claim={activeClaim}
                parts={parts}
                partsLoading={partsLoading}
                setSnack={setSnack}
            />

            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Container>
    );
}

/* ---------- helpers ---------- */
function Mono({ children }) {
    return <Box component="span" sx={{ fontFamily: "monospace" }}>{children}</Box>;
}

function Row({ label, value }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                {value}
            </Typography>
        </Stack>
    );
}

// ------------------ EstimatesDialog component ------------------
function EstimatesDialog({ open, onClose, claim, parts, partsLoading, setSnack }) {
    const [list, setList] = React.useState([]); // existing estimates for claim (all versions)
    const [loadingLocal, setLoadingLocal] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [creating, setCreating] = React.useState(false);
    const [showOnlyLatest, setShowOnlyLatest] = React.useState(true);
    const [versionToView, setVersionToView] = React.useState(null);
    const [compareMode, setCompareMode] = React.useState({ on: false, otherVersion: null });
    const [viewMode, setViewMode] = React.useState(false); // true = view only, false = edit mode
    const [recallEvents, setRecallEvents] = React.useState([]);
    const [loadingEvents, setLoadingEvents] = React.useState(false);

    const emptyForm = {
        items: [], // each: { partId, partName, unitPriceVND, quantity }
        laborSlots: 0,
        laborRateVND: 100000,
        note: "",
    };
    const [form, setForm] = React.useState(emptyForm);
    const [expandedMap, setExpandedMap] = React.useState({});

    // load estimates for claim
    React.useEffect(() => {
        if (!open || !claim?.id) return;
        let mounted = true;
        (async () => {
            setLoadingLocal(true);
            try {
                const data = await estimatesService.getByClaim(claim.id);
                const arr = Array.isArray(data) ? data : data ? [data] : [];
                if (mounted) setList(arr);
            } catch (err) {
                console.error("Fetch estimates failed:", err);
                setSnack?.({ open: true, message: "Không tải được estimates", severity: "error" });
            } finally {
                if (mounted) setLoadingLocal(false);
            }
        })();
        return () => (mounted = false);
    }, [open, claim?.id, setSnack]);

    // Load recall events when dialog opens
    React.useEffect(() => {
        if (!open || !claim?.vin) {
            setRecallEvents([]);
            return;
        }
        let mounted = true;
        (async () => {
            setLoadingEvents(true);
            try {
                const result = await eventService.checkRecallByVin(claim.vin);
                if (mounted) {
                    setRecallEvents(result.events || []);
                }
            } catch (err) {
                console.error("Load recall events failed:", err);
                if (mounted) {
                    setRecallEvents([]);
                }
            } finally {
                if (mounted) setLoadingEvents(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [open, claim?.vin]);

    // sync editing -> form
    React.useEffect(() => {
        if (!editing) {
            setForm(emptyForm);
            return;
        }
        let items = [];
        try {
            const rawItems = editing.itemsJson ? (typeof editing.itemsJson === "string" ? JSON.parse(editing.itemsJson) : editing.itemsJson) : editing.items || [];
            items = (rawItems || []).map((it) => ({
                partId: it.partId || it.part_id || "",
                partName: it.partName || it.part_name || it.name || parts.find(p => p.id === it.partId)?.partName || "",
                unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
                quantity: it.quantity ?? it.qty ?? 1,
            }));
        } catch (e) {
            items = [];
        }
        setForm({
            items,
            laborSlots: editing.laborSlots ?? 0,
            laborRateVND: editing.laborRateVND ?? 100000,
            note: editing.note ?? "",
        });
    }, [editing, parts]);

    // helper - totals
    const partsSubtotal = React.useMemo(() => form.items.reduce((s, it) => s + (Number(it.unitPriceVND || 0) * Number(it.quantity || 0)), 0), [form.items]);
    const laborSubtotal = Number(form.laborSlots || 0) * Number(form.laborRateVND || 0);
    const grandTotal = partsSubtotal + laborSubtotal;

    // Get affected parts from recall events - map IDs to part names
    const affectedPartsFromRecall = React.useMemo(() => {
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
                        // Tìm part theo ID trong parts state của component để lấy tên
                        const part = parts.find(p => String(p.id) === partIdStr);
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
    }, [recallEvents, parts]);

    // Filter parts for RECALL claims - only show parts that match affectedParts
    const availableParts = React.useMemo(() => {
        if (recallEvents.length === 0) {
            // Not a RECALL claim, show all parts
            return parts;
        }
        // RECALL claim - only show parts that match affectedParts (by ID or name)
        return parts.filter(part => {
            const partId = String(part.id);
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
    }, [parts, recallEvents, affectedPartsFromRecall]);

    // item operations
    const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { partId: "", partName: "", unitPriceVND: 0, quantity: 1 }] }));
    const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, patch) => setForm((f) => {
        const items = [...f.items];
        items[idx] = { ...items[idx], ...patch };
        return { ...f, items };
    });

    // Build payload for create/update: backend expects itemsJson: [{partId, quantity}]
    const buildPayloadForApi = (overrideForm = null) => {
        const use = overrideForm || form;
        const itemsJson = (use.items || []).map((it) => ({ partId: it.partId || null, quantity: Number(it.quantity || 0) }));
        return {
            claim_id: claim?.id || claim?.claimId || null,
            itemsJson,
            laborSlots: Number(use.laborSlots || 0),
            laborRateVND: Number(use.laborRateVND || 0),
            note: use.note || "",
        };
    };

    // validation: ensure each item has partId (matches estimatesService.validatePayload)
    const validateFormBeforeSend = () => {
        // Check if recall events have valid affectedPartsJson/affectedParts
        if (recallEvents.length > 0) {
            const hasValidAffectedParts = recallEvents.some(event => {
                // Check if event has affectedParts (array)
                if (event.affectedParts && Array.isArray(event.affectedParts) && event.affectedParts.length > 0) {
                    return true;
                }
                // Check if event has affectedPartsJson (JSON string)
                if (event.affectedPartsJson) {
                    try {
                        const parsed = typeof event.affectedPartsJson === 'string' 
                            ? JSON.parse(event.affectedPartsJson) 
                            : event.affectedPartsJson;
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return true;
                        }
                    } catch (e) {
                        // Invalid JSON
                    }
                }
                // Check if event has affected_parts (snake_case)
                if (event.affected_parts && Array.isArray(event.affected_parts) && event.affected_parts.length > 0) {
                    return true;
                }
                return false;
            });
            
            if (!hasValidAffectedParts) {
                setSnack?.({ 
                    open: true, 
                    message: "⚠️ Recall event không có affectedPartsJson hợp lệ. Vui lòng kiểm tra lại recall event.", 
                    severity: "error" 
                });
                return false;
            }
            
            // Check if affectedPartsFromRecall is empty
            if (affectedPartsFromRecall.ids.length === 0 && affectedPartsFromRecall.names.length === 0) {
                setSnack?.({ 
                    open: true, 
                    message: "⚠️ Không tìm thấy phụ tùng được phép trong recall events.", 
                    severity: "error" 
                });
                return false;
            }
        }
        
        if (!form.items.length) {
            setSnack?.({ open: true, message: "Cần ít nhất 1 phụ tùng (item) trong estimate", severity: "warning" });
            return false;
        }
        for (const it of form.items) {
            if (!it.partId) {
                setSnack?.({ open: true, message: `Một item chưa chọn phụ tùng hợp lệ: "${it.partName || ''}"`, severity: "warning" });
                return false;
            }
            if (!it.quantity || Number(it.quantity) <= 0) {
                setSnack?.({ open: true, message: `Số lượng phải lớn hơn 0 cho "${it.partName}"`, severity: "warning" });
                return false;
            }
        }
        return true;
    };

    const handleCreate = async () => {
        if (!validateFormBeforeSend()) return;
        try {
            setLoadingLocal(true);
            const payload = buildPayloadForApi();
            const created = await estimatesService.create(payload);
            setList((prev) => [created, ...prev]);
            setSnack?.({ open: true, message: "Tạo estimate thành công", severity: "success" });
            setCreating(false);
            window.dispatchEvent(new CustomEvent("claim-updated", { detail: { ...claim, lastEstimate: created } }));
        } catch (err) {
            console.error("Create estimate error:", err);
            const msg = err?.response?.data || err;
            let friendlyMessage = "Tạo estimate thất bại";
            
            // Check for specific error messages
            if (typeof msg === "object" && msg.message) {
                if (msg.message.includes("affectedPartsJson")) {
                    friendlyMessage = "⚠️ Recall event không có affectedPartsJson hợp lệ. Vui lòng kiểm tra lại recall event trong hệ thống.";
                } else if (msg.message.includes("phải có trạng thái ESTIMATING")) {
                    friendlyMessage = "⚠️ Chưa có Diagnostics hoặc claim chưa chuyển sang giai đoạn lập báo giá (ESTIMATING).";
                } else if (msg.message.includes("Không tìm thấy claim")) {
                    friendlyMessage = "Claim không tồn tại hoặc đã bị xoá.";
                } else {
                    friendlyMessage = msg.message;
                }
            } else if (typeof msg === "string") {
                if (msg.includes("affectedPartsJson")) {
                    friendlyMessage = "⚠️ Recall event không có affectedPartsJson hợp lệ. Vui lòng kiểm tra lại recall event trong hệ thống.";
                } else if (msg.includes("phải có trạng thái ESTIMATING")) {
                    friendlyMessage = "⚠️ Chưa có Diagnostics hoặc claim chưa chuyển sang giai đoạn lập báo giá (ESTIMATING).";
                } else if (msg.includes("Không tìm thấy claim")) {
                    friendlyMessage = "Claim không tồn tại hoặc đã bị xoá.";
                } else {
                    friendlyMessage = msg;
                }
            }
            
            setSnack?.({ open: true, message: friendlyMessage, severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    const handleUpdate = async () => {
        if (!editing?.id) return;
        if (!validateFormBeforeSend()) return;
        try {
            setLoadingLocal(true);
            const payload = buildPayloadForApi();
            const updated = await estimatesService.update(editing.id, payload);
            setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setSnack?.({ open: true, message: "Cập nhật estimate thành công", severity: "success" });
            setEditing(null);
            window.dispatchEvent(new CustomEvent("claim-updated", { detail: { ...claim, lastEstimate: updated } }));
        } catch (err) {
            console.error("Update estimate error:", err);
            setSnack?.({ open: true, message: "Cập nhật estimate thất bại", severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    const openForEdit = async (est) => {
        try {
            setLoadingLocal(true);
            const full = await estimatesService.getById(est.id);
            setEditing(full || est);
            setCreating(false);
            setViewMode(false); // Enable edit mode
            setVersionToView(null); // Clear view mode
        } catch (err) {
            console.error("Load estimate failed:", err);
            setSnack?.({ open: true, message: "Không tải được estimate", severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    const openForView = async (est) => {
        try {
            setLoadingLocal(true);
            const full = await estimatesService.getById(est.id);
            setVersionToView(full || est);
            setViewMode(true); // Enable view only mode
            setEditing(null); // Clear edit mode
            setCreating(false);
            setCompareMode({ on: false, otherVersion: null });
        } catch (err) {
            console.error("Load estimate for view failed:", err);
            setSnack?.({ open: true, message: "Không tải được estimate", severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    const toggleExpand = (id) => setExpandedMap((m) => ({ ...m, [id]: !m[id] }));

    // Versions utilities
    const versions = React.useMemo(() => {
        // derive unique version numbers sorted desc
        const vset = new Set((list || []).map((x) => x.versionNo ?? x.version ?? 0));
        return Array.from(vset).sort((a, b) => Number(b) - Number(a));
    }, [list]);

    const handleViewVersion = async (versionNo) => {
        if (!claim?.id || versionNo === undefined || versionNo === null) return;
        try {
            setLoadingLocal(true);
            const resp = await estimatesService.getByClaimAndVersion(claim.id, versionNo);
            setVersionToView(resp);
            setViewMode(false); // Dropdown view is not read-only view mode
            setCompareMode({ on: false, otherVersion: null });
        } catch (err) {
            console.error("Load version failed:", err);
            setSnack?.({ open: true, message: "Không tải được version", severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    const handleCompareWith = async (otherVersionNo) => {
        if (!claim?.id || !versionToView) return;
        try {
            setLoadingLocal(true);
            const other = await estimatesService.getByClaimAndVersion(claim.id, otherVersionNo);
            setCompareMode({ on: true, otherVersion: other });
        } catch (err) {
            console.error("Compare load failed:", err);
            setSnack?.({ open: true, message: "Không tải được version để so sánh", severity: "error" });
        } finally {
            setLoadingLocal(false);
        }
    };

    // render
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <ReceiptIcon color="primary" />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Estimates cho Claim
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            VIN: {claim?.vin || "—"} • Khách: {claim?.intakeContactName || "—"}
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {/* top controls: Create button, version selector, show latest toggle, compare */}
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => {
                            setCreating(true);
                            setEditing(null);
                            setForm(emptyForm);
                            setViewMode(false);
                            setVersionToView(null);
                            setCompareMode({ on: false, otherVersion: null });
                        }}
                        sx={{ minWidth: 160 }}
                    >
                        Tạo Estimate mới
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="version-select-label">Chọn version</InputLabel>
                        <Select
                            labelId="version-select-label"
                            label="Chọn version"
                            value={versionToView ? (versionToView.versionNo ?? versionToView.version ?? "") : ""}
                            onChange={(e) => handleViewVersion(e.target.value)}
                        >
                            <MenuItem value="">-- Chọn version --</MenuItem>
                            {versions.map((v) => (
                                <MenuItem key={v} value={v}>Version {v}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox checked={showOnlyLatest} onChange={(e) => setShowOnlyLatest(e.target.checked)} />}
                            label="Chỉ hiển thị version mới nhất"
                        />
                    </FormGroup>

                    <Tooltip title="So sánh với một version khác (chọn version và click 'So sánh')">
                        <Button
                            variant="contained"
                            startIcon={<CompareIcon />}
                            onClick={() => {
                                if (!versionToView) {
                                    setSnack?.({ open: true, message: "Vui lòng chọn một version để bắt đầu so sánh", severity: "info" });
                                    return;
                                }
                                // prompt user to choose other version via small select below (we reuse versions list UI)
                                setCompareMode((m) => ({ ...m, on: !m.on }));
                            }}
                        >
                            {compareMode.on ? "Hủy So sánh" : "So sánh"}
                        </Button>
                    </Tooltip>
                </Stack>

                {/* list of estimates (versions) */}
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Danh sách Estimates hiện có (phiên bản)
                </Typography>

                {loadingLocal ? <CircularProgress /> : (
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {list.length === 0 && <Typography color="text.secondary">Chưa có estimate nào</Typography>}

                        {(showOnlyLatest ? (() => {
                            const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            return sorted.slice(0, 1);
                        })() : list).map((e) => {
                            const itemsPreview = (e.items || e.itemsJson || []).map((it) => {
                                return {
                                    partName: it.partName || it.part_name || it.name || (parts.find(p => p.id === it.partId)?.partName) || "—",
                                    quantity: it.quantity ?? 0,
                                    unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
                                };
                            });
                            return (
                                <Card key={e.id + "_v" + (e.versionNo ?? e.version)} variant="outlined" sx={{ bgcolor: "action.hover" }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CheckCircleIcon color="success" fontSize="small" />
                                                <Typography fontWeight={700}>Version {e.versionNo ?? e.version ?? "—"} • {new Date(e.createdAt || e.createdAt).toLocaleString("vi-VN")}</Typography>
                                            </Stack>

                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openForEdit(e)}>Chỉnh sửa</Button>
                                                <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => openForView(e)}>Xem</Button>
                                                <IconButton size="small" onClick={() => toggleExpand(e.id)}>
                                                    <ExpandMore sx={{ transform: expandedMap[e.id] ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
                                                </IconButton>
                                            </Stack>
                                        </Stack>

                                        <Collapse in={Boolean(expandedMap[e.id])} timeout="auto" unmountOnExit>
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="subtitle2">Phụ tùng:</Typography>
                                                {itemsPreview.length === 0 ? <Typography color="text.secondary">Không có phụ tùng</Typography> : (
                                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                        {itemsPreview.map((it, idx) => (
                                                            <Stack key={idx} direction="row" justifyContent="space-between">
                                                                <Typography variant="body2" sx={{ flex: 1 }}>{it.partName}</Typography>
                                                                <Typography variant="body2">{(it.quantity ?? 0)} × {(it.unitPriceVND ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                            </Stack>
                                                        ))}
                                                    </Stack>
                                                )}

                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="body2">Ghi chú: {e.note || "—"}</Typography>
                                                    <Typography variant="body2">Tổng phụ tùng: {(e.partsSubtotalVND ?? e.partsSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                    <Typography variant="body2">Tổng nhân công: {(e.laborSubtotalVND ?? e.laborSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                    <Typography variant="body2" color="primary" fontWeight={700}><strong>Tổng cộng:</strong> {(e.grandTotalVND ?? e.grandTotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                </Box>
                                            </Box>
                                        </Collapse>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Create/Edit form - Only show when editing or creating, not in view mode */}
                {!viewMode && (editing || creating) && (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={600}>
                                {editing ? "Chỉnh sửa Estimate" : "Tạo Estimate mới"}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button variant="contained" size="small" onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm); setViewMode(false); }}>Tạo mới</Button>
                                <Button variant="outlined" size="small" onClick={() => handleNewFromLatest(list, setForm, setSnack, parts)}>Sao chép gần nhất</Button>
                            </Stack>
                        </Stack>

                        {/* items table */}
                        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mb: 0 }}>
                                    Danh sách phụ tùng
                                </Typography>
                                {recallEvents.length > 0 && (
                                    <Chip 
                                        label="RECALL - Chỉ chọn phụ tùng trong events" 
                                        color="warning" 
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Stack>
                            {recallEvents.length > 0 && (affectedPartsFromRecall.ids.length > 0 || affectedPartsFromRecall.names.length > 0) && (
                                <Alert severity="info" sx={{ mb: 1 }}>
                                    <Typography variant="caption">
                                        Phụ tùng được phép chọn: {affectedPartsFromRecall.names.length > 0 
                                            ? affectedPartsFromRecall.names.join(", ") 
                                            : affectedPartsFromRecall.ids.join(", ")}
                                    </Typography>
                                </Alert>
                            )}
                            <Stack spacing={1}>
                                {form.items.map((it, idx) => (
                                    <Grid container spacing={1} key={idx} alignItems="center">
                                        <Grid item xs={6} md={5}>
                                            <Autocomplete
                                                size="small"
                                                options={availableParts}
                                                getOptionLabel={(option) => option.partName || ""}
                                                loading={partsLoading}
                                                value={availableParts.find(p => p.id === it.partId) || (it.partName ? { id: it.partId, partName: it.partName, unitPriceVND: it.unitPriceVND } : null)}
                                                onChange={(_, selected) => {
                                                    if (!selected) { updateItem(idx, { partId: "", partName: "", unitPriceVND: 0 }); return; }
                                                    updateItem(idx, { partId: selected.id, partName: selected.partName, unitPriceVND: selected.unitPriceVND ?? 0 });
                                                }}
                                                renderInput={(params) => (
                                                    <TextField 
                                                        {...params} 
                                                        label="Phụ tùng" 
                                                        helperText={recallEvents.length > 0 ? "Chỉ chọn phụ tùng trong recall events" : ""}
                                                    />
                                                )}
                                                noOptionsText={recallEvents.length > 0 ? "Không có phụ tùng phù hợp trong recall events" : "Không có phụ tùng"}
                                                freeSolo={false}
                                            />
                                        </Grid>

                                        <Grid item xs={3} md={2}>
                                            <TextField size="small" label="Số lượng" type="number" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })} />
                                        </Grid>

                                        <Grid item xs={3} md={3}>
                                            <TextField size="small" label="Đơn giá (VNĐ)" value={it.unitPriceVND ?? 0} InputProps={{ readOnly: true }} />
                                        </Grid>

                                        <Grid item xs={12} md={2}>
                                            <IconButton size="small" color="error" onClick={() => removeItem(idx)}><DeleteOutline /></IconButton>
                                        </Grid>
                                    </Grid>
                                ))}

                                <Button size="small" variant="outlined" startIcon={<Add />} onClick={addItem}>Thêm phụ tùng</Button>
                            </Stack>
                        </Box>

                        {/* labor & note */}
                        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>Chi phí nhân công & Ghi chú</Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <TextField label="Số giờ công" size="small" type="number" fullWidth value={form.laborSlots} onChange={(e) => setForm((f) => ({ ...f, laborSlots: Number(e.target.value || 0) }))} />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField label="Đơn giá công (VNĐ)" size="small" type="number" fullWidth value={form.laborRateVND} InputProps={{ readOnly: true }} />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField label="Ghi chú" fullWidth multiline minRows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* totals + actions */}
                        <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="body2">Tổng phụ tùng:</Typography></Grid>
                                <Grid item xs={6} textAlign="right"><Typography variant="body2" fontWeight={600}>{partsSubtotal.toLocaleString("vi-VN")} VNĐ</Typography></Grid>

                                <Grid item xs={6}><Typography variant="body2">Tổng nhân công:</Typography></Grid>
                                <Grid item xs={6} textAlign="right"><Typography variant="body2" fontWeight={600}>{laborSubtotal.toLocaleString("vi-VN")} VNĐ</Typography></Grid>

                                <Grid item xs={12}><Divider sx={{ my: 0.5 }} /></Grid>

                                <Grid item xs={6}><Typography variant="h6" fontWeight={700} color="primary">Tổng cộng:</Typography></Grid>
                                <Grid item xs={6} textAlign="right"><Typography variant="h6" fontWeight={700} color="primary">{grandTotal.toLocaleString("vi-VN")} VNĐ</Typography></Grid>
                            </Grid>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {editing ? (
                                <>
                                    <Button variant="outlined" onClick={() => { setCreating(false); setEditing(null); setForm(emptyForm); setViewMode(false); }}>Hủy</Button>
                                    <Button variant="contained" onClick={handleUpdate} disabled={loadingLocal}>{loadingLocal ? <CircularProgress size={20} /> : "Cập nhật Estimate"}</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outlined" onClick={() => { setCreating(false); setEditing(null); setForm(emptyForm); setViewMode(false); }}>Đặt lại</Button>
                                    <Button variant="contained" onClick={handleCreate} disabled={loadingLocal}>{loadingLocal ? <CircularProgress size={20} /> : "Tạo Estimate"}</Button>
                                </>
                            )}
                        </Stack>
                    </Stack>
                )}

                {/* view selected version - Show when in view mode */}
                {viewMode && versionToView && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Xem chi tiết Estimate (Chế độ xem - Không thể chỉnh sửa)</Typography>
                        {loadingLocal ? <CircularProgress /> : (
                            <Box>
                                <Card variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                                    <CardContent>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                                <Typography variant="h6" fontWeight={700}>
                                                    Version {versionToView.versionNo ?? versionToView.version ?? "—"} • {new Date(versionToView.createdAt || Date.now()).toLocaleString("vi-VN")}
                                                </Typography>
                                                <Chip label="Chế độ xem" color="info" size="small" />
                                            </Stack>

                                            <Divider />

                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Ghi chú:</Typography>
                                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
                                                    {versionToView.note || "—"}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Danh sách phụ tùng:</Typography>
                                                {((() => {
                                                    const items = versionToView.items || versionToView.itemsJson || [];
                                                    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
                                                    return parsedItems || [];
                                                })()).length === 0 ? (
                                                    <Typography color="text.secondary" sx={{ p: 1 }}>Không có phụ tùng</Typography>
                                                ) : (
                                                    <Box sx={{ p: 1, bgcolor: "background.paper", borderRadius: 1 }}>
                                                        <Stack spacing={1}>
                                                            {((() => {
                                                                const items = versionToView.items || versionToView.itemsJson || [];
                                                                const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
                                                                return parsedItems || [];
                                                            })()).map((it, idx) => {
                                                                const partName = it.partName || it.part_name || parts.find(p => p.id === it.partId)?.partName || "—";
                                                                const quantity = it.quantity ?? 0;
                                                                const unitPrice = it.unitPriceVND ?? it.unit_price_vnd ?? 0;
                                                                const total = quantity * unitPrice;
                                                                return (
                                                                    <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: idx < ((versionToView.items || versionToView.itemsJson || []).length - 1) ? "1px solid" : "none", borderColor: "divider" }}>
                                                                        <Box>
                                                                            <Typography variant="body2" fontWeight={600}>{partName}</Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Số lượng: {quantity} × {unitPrice.toLocaleString("vi-VN")} VNĐ
                                                                            </Typography>
                                                                        </Box>
                                                                        <Typography variant="body2" fontWeight={600} color="primary">
                                                                            {total.toLocaleString("vi-VN")} VNĐ
                                                                        </Typography>
                                                                    </Stack>
                                                                );
                                                            })}
                                                        </Stack>
                                                    </Box>
                                                )}
                                            </Box>

                                            <Divider />

                                            <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
                                                <Stack spacing={1}>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="body2">Tổng phụ tùng:</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{(versionToView.partsSubtotalVND ?? versionToView.partsSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="body2">Số giờ công:</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{versionToView.laborSlots ?? 0} giờ</Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="body2">Đơn giá công:</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{(versionToView.laborRateVND ?? 0).toLocaleString("vi-VN")} VNĐ/giờ</Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="body2">Tổng nhân công:</Typography>
                                                        <Typography variant="body2" fontWeight={600}>{(versionToView.laborSubtotalVND ?? versionToView.laborSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                    </Stack>
                                                    <Divider />
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="h6" fontWeight={700} color="primary">Tổng cộng:</Typography>
                                                        <Typography variant="h6" fontWeight={700} color="primary">{(versionToView.grandTotalVND ?? versionToView.grandTotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                    </Stack>
                                                </Stack>
                                            </Box>

                                            {/* compare UI */}
                                            {compareMode.on && (
                                                <Box sx={{ mt: 2 }}>
                                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                                        <InputLabel id="compare-with-label">So sánh với</InputLabel>
                                                        <Select
                                                            labelId="compare-with-label"
                                                            label="So sánh với"
                                                            value={compareMode.otherVersion?.versionNo ?? compareMode.otherVersion?.version ?? ""}
                                                            onChange={(e) => handleCompareWith(e.target.value)}
                                                        >
                                                            <MenuItem value="">-- Chọn version khác --</MenuItem>
                                                            {versions.filter(v => v !== (versionToView.versionNo ?? versionToView.version)).map(v => (
                                                                <MenuItem key={v} value={v}>Version {v}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>

                                                    {compareMode.on && compareMode.otherVersion && (
                                                        <Box sx={{ mt: 2, bgcolor: "background.paper", p: 2, borderRadius: 1 }}>
                                                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Kết quả so sánh (hiển thị khác biệt cơ bản)</Typography>
                                                            <Stack spacing={1}>
                                                                <Typography>Version hiện tại: {versionToView.versionNo ?? versionToView.version}</Typography>
                                                                <Typography>So sánh với: {compareMode.otherVersion.versionNo ?? compareMode.otherVersion.version}</Typography>

                                                                {/* Basic diff: parts count and grand total */}
                                                                <Typography>Số phụ tùng hiện tại: {((() => {
                                                                    const items = versionToView.items || versionToView.itemsJson || [];
                                                                    return typeof items === 'string' ? JSON.parse(items) : items;
                                                                })()).length}</Typography>
                                                                <Typography>Số phụ tùng so sánh: {((() => {
                                                                    const items = compareMode.otherVersion.items || compareMode.otherVersion.itemsJson || [];
                                                                    return typeof items === 'string' ? JSON.parse(items) : items;
                                                                })()).length}</Typography>
                                                                <Typography>Tổng hiện tại: {(versionToView.grandTotalVND ?? versionToView.grandTotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                                <Typography>Tổng so sánh: {(compareMode.otherVersion.grandTotalVND ?? compareMode.otherVersion.grandTotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                            </Stack>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </>
                )}

                {/* view selected version from dropdown - Show when not in view mode but versionToView is set from dropdown */}
                {!viewMode && versionToView && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Xem chi tiết version đã chọn</Typography>
                        {loadingLocal ? <CircularProgress /> : (
                            <Box>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                    <CardContent>
                                        <Stack spacing={1}>
                                            <Typography variant="h6">Version {versionToView.versionNo ?? versionToView.version ?? "—"} • {new Date(versionToView.createdAt || Date.now()).toLocaleString("vi-VN")}</Typography>
                                            <Typography variant="body2">Ghi chú: {versionToView.note || "—"}</Typography>
                                            <Typography variant="subtitle2">Phụ tùng:</Typography>
                                            {((() => {
                                                const items = versionToView.items || versionToView.itemsJson || [];
                                                return typeof items === 'string' ? JSON.parse(items) : items;
                                            })()).map((it, idx) => (
                                                <Stack key={idx} direction="row" justifyContent="space-between">
                                                    <Typography>{it.partName || it.part_name || parts.find(p => p.id === it.partId)?.partName || "—"}</Typography>
                                                    <Typography>{(it.quantity ?? 0)} × {(it.unitPriceVND ?? it.unit_price_vnd ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                                </Stack>
                                            ))}

                                            <Typography variant="body2">Tổng phụ tùng: {(versionToView.partsSubtotalVND ?? versionToView.partsSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                            <Typography variant="body2">Tổng nhân công: {(versionToView.laborSubtotalVND ?? versionToView.laborSubtotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                            <Typography variant="h6" color="primary">Tổng cộng: {(versionToView.grandTotalVND ?? versionToView.grandTotal ?? 0).toLocaleString("vi-VN")} VNĐ</Typography>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </>
                )}

                {/* Recall Events Section */}
                {claim?.vin && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                                    Recall Events ({recallEvents.length})
                                </Typography>
                                {loadingEvents ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : recallEvents.length === 0 ? (
                                    <Typography color="text.secondary">Không có recall events cho VIN này</Typography>
                                ) : (
                                    <Stack spacing={2}>
                                        {recallEvents.map((event) => (
                                            <Card key={event.id} variant="outlined" sx={{ bgcolor: "warning.light", opacity: 0.9 }}>
                                                <CardContent>
                                                    <Stack spacing={1}>
                                                        <Row label="Event Name" value={event.name || "—"} />
                                                        <Row label="Type" value={event.type || "—"} />
                                                        <Row label="Reason" value={event.reason || "—"} />
                                                        <Row label="Start Date" value={event.startDate ? new Date(event.startDate).toLocaleString("vi-VN") : "—"} />
                                                        <Row label="End Date" value={event.endDate ? new Date(event.endDate).toLocaleString("vi-VN") : "—"} />
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
                    </>
                )}

            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="outlined">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
}

// Helper to prefill from latest estimate
async function handleNewFromLatest(list, setForm, setSnack, parts) {
    if (!list || list.length === 0) {
        setForm((f) => ({ ...f, items: [], laborSlots: 0, laborRateVND: 100000, note: "" }));
        return;
    }
    try {
        const latest = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        if (!latest?.id) {
            setForm((f) => ({ ...f }));
            return;
        }
        const full = await estimatesService.getById(latest.id);
        let items = [];
        try {
            const rawItems = typeof full.itemsJson === "string" ? JSON.parse(full.itemsJson) : full.itemsJson || full.items || [];
            items = (rawItems || []).map(it => {
                const partInfo = parts.find(p => p.id === it.partId);
                return {
                    partId: it.partId || it.part_id || "",
                    partName: it.partName || it.part_name || it.name || partInfo?.partName || "",
                    unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? partInfo?.unitPriceVND ?? 0,
                    quantity: it.quantity ?? 1
                };
            });
        } catch (e) {
            items = [];
        }
        setForm({ items, laborSlots: full.laborSlots ?? 0, laborRateVND: full.laborRateVND ?? 100000, note: full.note ?? "" });
        setSnack?.({ open: true, message: "Đã sao chép estimate gần nhất", severity: "success" });
    } catch (err) {
        console.warn("Không thể tải latest estimate:", err);
        setSnack?.({ open: true, message: "Không tải được estimate mẫu", severity: "warning" });
    }
}
