import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Button, Chip, Container, Divider, Grid, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
    IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel,
    Autocomplete, CircularProgress,
} from "@mui/material";
import { Add, Delete, Restore, Edit, Search, Visibility } from "@mui/icons-material";
import eventService from "../../services/eventService";
import evModelService from "../../services/evModelService";
import partService from "../../services/partService";
import axiosInstance from "../../services/axiosInstance";
import partLotService from "../../services/partLotService";

// Exclusions cho phép
const ALLOWED_EXCLUSIONS = [
    "ACCIDENT_DAMAGE",
    "WATER_INGRESSION",
    "UNAUTHORIZED_MOD",
    "LACK_OF_MAINTENANCE",
    "WEAR_AND_TEAR"
];

const EXCLUSION_LABELS = {
    ACCIDENT_DAMAGE: "Hư hỏng do tai nạn",
    WATER_INGRESSION: "Ngấm nước",
    UNAUTHORIZED_MOD: "Sửa đổi không được phép",
    LACK_OF_MAINTENANCE: "Thiếu bảo trì",
    WEAR_AND_TEAR: "Mòn tự nhiên"
};

// Format date cho input type="date"
const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Parse date từ input - trả về ISO string cho backend
const parseDateFromInput = (str) => {
    if (!str || !str.trim()) return null;
    // Input từ date picker là YYYY-MM-DD, tạo Date object và convert sang ISO string
    const d = new Date(str + "T00:00:00"); // Thêm time để tránh timezone issues
    if (isNaN(d.getTime())) return null;
    // Backend sẽ normalize về date-only, nên gửi full ISO string
    return d.toISOString();
};

export default function EventManagement() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all | active | deleted
    const [modelFilter, setModelFilter] = useState(""); // Filter theo model code
    const [viewDetailOpen, setViewDetailOpen] = useState(false);
    const [eventDetail, setEventDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("create"); // 'create' | 'edit'
    const [form, setForm] = useState({
        name: "",
        reason: "",
        startDate: "",
        endDate: "",
        exclusions: [],
        affectedParts: [],
        modelRanges: [],
    });
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [evModels, setEvModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [parts, setParts] = useState([]);
    const [partsLoading, setPartsLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        fetchData();
        fetchEvModels();
        fetchParts();
    }, []);

    const fetchParts = async () => {
        try {
            setPartsLoading(true);
            const data = await partService.getActive();
            setParts(Array.isArray(data) ? data.filter(p => !p.isDelete) : []);
        } catch (e) {
            console.error("Lỗi tải Parts:", e);
            setParts([]);
        } finally {
            setPartsLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await eventService.getAll();
            setEvents(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setError(e?.response?.data?.message || e.message || "Lỗi tải dữ liệu Events");
        } finally {
            setLoading(false);
        }
    };

    const fetchEvModels = async () => {
        try {
            setModelsLoading(true);
            const data = await evModelService.getAll();
            setEvModels(Array.isArray(data) ? data.filter(m => !m.delete) : []);
        } catch (e) {
            console.error("Lỗi tải EV Models:", e);
            // Không block việc hiển thị events nếu evModels fail
            setEvModels([]);
        } finally {
            setModelsLoading(false);
        }
    };

    const searchEvents = async () => {
        const qStr = q.trim();
        // Nếu có filter theo model, dùng listByModelCode
        if (modelFilter && !qStr) {
            try {
                setLoading(true);
                const data = await eventService.listByModelCode(modelFilter);
                setEvents(Array.isArray(data) ? data : []);
                setError("");
            } catch (e) {
                setError(e?.response?.data?.message || e.message || "Lỗi lấy Events theo Model");
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!qStr) {
            await fetchData();
            return;
        }
        try {
            setLoading(true);
            const res = await eventService.search({
                keyword: qStr,
                page: 0,
                size: 100
            });
            const data = res.content || res || [];
            setEvents(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setError(e?.response?.data?.message || e.message || "Lỗi tìm kiếm Events");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (event) => {
        try {
            setDetailLoading(true);
            // Đảm bảo parts đã được load trước khi hiển thị
            if (parts.length === 0) {
                await fetchParts();
            }
            const detail = await eventService.get(event.id);
            setEventDetail(detail);
            setViewDetailOpen(true);
        } catch (e) {
            setToast({
                open: true,
                type: "error",
                msg: e?.response?.data?.message || e.message || "Lỗi tải chi tiết Event"
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = events;
        if (statusFilter === "active") {
            list = list.filter(e => !e.isDelete);
        } else if (statusFilter === "deleted") {
            list = list.filter(e => e.isDelete);
        }
        return list.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
        });
    }, [events, statusFilter]);

    const openCreate = () => {
        setMode("create");
        setSelectedEvent(null);
        const newForm = {
            name: "",
            reason: "",
            startDate: "",
            endDate: "",
            exclusions: [],
            affectedParts: [], // Khởi tạo là array rỗng
            modelRanges: [],
        };
        console.log("[EventManagement] openCreate - Initializing form:", newForm);
        setForm(newForm);
        setOpen(true);
    };

    const openEdit = async (e) => {
        setMode("edit");
        setSelectedEvent(e);
        
        // Đảm bảo parts đã được load trước khi parse
        if (parts.length === 0) {
            await fetchParts();
        }
        
        // Parse affectedPartsJson to get part IDs
        let affectedPartIds = [];
        if (e.affectedPartsJson) {
            try {
                const parsed = typeof e.affectedPartsJson === 'string' 
                    ? JSON.parse(e.affectedPartsJson) 
                    : e.affectedPartsJson;
                if (Array.isArray(parsed)) {
                    // Validate: nếu parsed là array of strings (tên parts), tìm ID
                    // Nếu parsed là array of IDs, dùng trực tiếp
                    affectedPartIds = parsed.map(item => {
                        if (typeof item === 'string') {
                            // Có thể là ID (UUID) hoặc tên part
                            // Thử tìm part theo ID trước
                            const partById = parts.find(p => String(p.id) === item);
                            if (partById) {
                                return String(partById.id);
                            }
                            // Nếu không tìm thấy theo ID, thử tìm theo tên
                            const partByName = parts.find(p => p.partName === item || p.partNo === item);
                            if (partByName) {
                                return String(partByName.id);
                            }
                            // Nếu không tìm thấy, giữ nguyên (có thể là ID hợp lệ nhưng part đã bị xóa)
                            return item;
                        }
                        // Nếu là object hoặc number, convert sang string
                        return String(item);
                    }).filter(id => id != null && id !== "");
                }
                console.log("[EventManagement] Parsed affectedPartsJson:", affectedPartIds);
            } catch (err) {
                console.warn("[EventManagement] Failed to parse affectedPartsJson:", err, "Raw value:", e.affectedPartsJson);
            }
        } else if (Array.isArray(e.affectedParts) && e.affectedParts.length > 0) {
            // Fallback: nếu có affectedParts (array of strings), tìm ID từ parts
            console.log("[EventManagement] Using affectedParts fallback, parts count:", parts.length);
            affectedPartIds = e.affectedParts.map(partName => {
                const part = parts.find(p => p.partName === partName || p.partNo === partName);
                if (part) {
                    return String(part.id);
                }
                console.warn("[EventManagement] Part not found for name:", partName);
                return null;
            }).filter(id => id != null && id !== "");
            console.log("[EventManagement] Mapped affectedPartIds from affectedParts:", affectedPartIds);
        }
        
        setForm({
            name: e.name || "",
            reason: e.reason || "",
            startDate: formatDateForInput(e.startDate),
            endDate: formatDateForInput(e.endDate),
            exclusions: Array.isArray(e.exclusions) ? e.exclusions : [],
            affectedParts: affectedPartIds, // Lưu array of IDs
            modelRanges: Array.isArray(e.modelRanges) ? e.modelRanges.map(r => ({
                modelCode: r.modelCode || "",
                productionFrom: formatDateForInput(r.productionFrom),
                productionTo: formatDateForInput(r.productionTo),
            })) : [],
        });
        console.log("[EventManagement] Form initialized with affectedParts:", affectedPartIds);
        setOpen(true);
    };

    const closeDialog = () => {
        setOpen(false);
        setSelectedEvent(null);
    };

    const addModelRange = () => {
        setForm((s) => ({
            ...s,
            modelRanges: [
                ...s.modelRanges,
                { modelCode: "", productionFrom: "", productionTo: "" }
            ]
        }));
    };

    const removeModelRange = (index) => {
        setForm((s) => ({
            ...s,
            modelRanges: s.modelRanges.filter((_, i) => i !== index)
        }));
    };

    const updateModelRange = (index, field, value) => {
        setForm((s) => ({
            ...s,
            modelRanges: s.modelRanges.map((r, i) =>
                i === index ? { ...r, [field]: value } : r
            )
        }));
    };

    const validate = () => {
        if (!form.name.trim()) return "Vui lòng nhập TÊN SỰ KIỆN";
        if (form.startDate && form.endDate) {
            const start = new Date(form.startDate);
            const end = new Date(form.endDate);
            if (start > end) return "Ngày bắt đầu không được sau ngày kết thúc";
        }
        if (form.modelRanges.length > 0) {
            for (let i = 0; i < form.modelRanges.length; i++) {
                const r = form.modelRanges[i];
                if (!r.modelCode) return `Model Range ${i + 1}: Vui lòng chọn Model Code`;
                if (r.productionFrom && r.productionTo) {
                    const from = new Date(r.productionFrom);
                    const to = new Date(r.productionTo);
                    if (from > to) {
                        return `Model Range ${i + 1}: Ngày sản xuất từ không được sau ngày đến`;
                    }
                }
            }
        }
        return "";
    };

    const submit = async () => {
        const msg = validate();
        if (msg) {
            setToast({ open: true, type: "error", msg });
            return;
        }

        try {
            setBusy(true);
            // Theo backend: khi create, endDate mặc định là null
            // Backend sẽ normalize dates về date-only (bỏ giờ)
            // Backend mong đợi affectedParts là array of IDs (strings), không phải JSON string
            // affectedPartsJson sẽ được backend tự động tạo từ affectedParts array
            console.log("[EventManagement] form.affectedParts before processing:", form.affectedParts);
            console.log("[EventManagement] form.affectedParts type:", typeof form.affectedParts, "isArray:", Array.isArray(form.affectedParts));
            
            const affectedPartsArray = form.affectedParts && Array.isArray(form.affectedParts) && form.affectedParts.length > 0
                ? form.affectedParts
                    .filter(id => {
                        const isValid = id != null && id !== "" && id !== undefined;
                        if (!isValid) {
                            console.warn("[EventManagement] Filtered out invalid ID:", id);
                        }
                        return isValid;
                    })
                    .map(id => {
                        const strId = String(id).trim();
                        console.log("[EventManagement] Processing ID:", id, "->", strId);
                        return strId;
                    })
                    .filter(id => id.length > 0)
                : null;
            
            console.log("[EventManagement] Final affectedPartsArray for payload:", affectedPartsArray);
            
            const payload = {
                name: form.name.trim(),
                reason: form.reason?.trim() || null,
                startDate: form.startDate ? parseDateFromInput(form.startDate) : null,
                // Create: endDate luôn null (theo backend code)
                // Update: có thể set endDate
                endDate: mode === "create" ? null : (form.endDate ? parseDateFromInput(form.endDate) : null),
                exclusions: form.exclusions.length > 0 ? form.exclusions : null,
                // Backend mong đợi affectedParts là array of IDs (theo ví dụ payload)
                affectedParts: affectedPartsArray, // Array of IDs (strings)
                modelRanges: form.modelRanges.length > 0 ? form.modelRanges.map(r => ({
                    modelCode: r.modelCode,
                    productionFrom: r.productionFrom ? parseDateFromInput(r.productionFrom) : null,
                    productionTo: r.productionTo ? parseDateFromInput(r.productionTo) : null,
                })) : null
            };
            
            console.log("[EventManagement] Submit payload:", JSON.stringify(payload, null, 2));
            console.log("[EventManagement] affectedParts in payload:", payload.affectedParts);
            console.log("[EventManagement] affectedParts type:", typeof payload.affectedParts, "isArray:", Array.isArray(payload.affectedParts));

            if (mode === "create") {
                await eventService.create(payload);
                setToast({ open: true, type: "success", msg: "Tạo Event thành công" });
            } else {
                await eventService.update(selectedEvent.id, payload);
                setToast({ open: true, type: "success", msg: "Cập nhật Event thành công" });
            }
            closeDialog();
            await fetchData();
        } catch (e) {
            setToast({
                open: true,
                type: "error",
                msg: e?.response?.data?.message || e.message || "Lỗi lưu Event"
            });
        } finally {
            setBusy(false);
        }
    };

    const askDelete = (e) => {
        setEventToDelete(e);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            setBusy(true);
            await eventService.delete(eventToDelete.id);
            setToast({ open: true, type: "success", msg: "Đã xoá Event" });
            await fetchData();
        } catch (e) {
            setToast({
                open: true,
                type: "error",
                msg: e?.response?.data?.message || e.message || "Lỗi xoá Event"
            });
        } finally {
            setBusy(false);
            setConfirmOpen(false);
            setEventToDelete(null);
        }
    };

    const handleRecover = async (e) => {
        try {
            setBusy(true);
            await eventService.restore(e.id);
            setToast({ open: true, type: "success", msg: "Đã khôi phục Event" });
            await fetchData();
        } catch (err) {
            setToast({
                open: true,
                type: "error",
                msg: err?.response?.data?.message || err.message || "Lỗi khôi phục Event"
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container sx={{ py: 4, userSelect: "none", "& input, & textarea, & .MuiInputBase-root": { userSelect: "text" } }}>
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs>
                        <Typography variant="h5" fontWeight={700}>
                            Quản lý sự kiện thu hồi xe
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={openCreate}
                            size="small"
                        >
                            Tạo sự kiện
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm kiếm theo tên, lý do..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                searchEvents();
                            }
                        }}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                        }}
                    />
                    <Autocomplete
                        size="small"
                        options={evModels}
                        loading={modelsLoading}
                        value={evModels.find(m => m.modelCode === modelFilter) || null}
                        onChange={(e, val) => {
                            setModelFilter(val?.modelCode || "");
                            if (val) {
                                setTimeout(() => searchEvents(), 100);
                            } else {
                                fetchData();
                            }
                        }}
                        getOptionLabel={(opt) => opt ? `${opt.modelCode} - ${opt.model || ""}` : ""}
                        renderInput={(params) => (
                            <TextField {...params} label="Filter theo Model" placeholder="Chọn model..." sx={{ minWidth: 200 }} />
                        )}
                        clearOnEscape
                    />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Trạng thái"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            <MenuItem value="active">Hoạt động</MenuItem>
                            <MenuItem value="deleted">Đã xoá</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            <Paper elevation={0} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Tên sự kiện</TableCell>
                            <TableCell>Lý do</TableCell>
                            <TableCell>Ngày bắt đầu</TableCell>
                            <TableCell>Ngày kết thúc</TableCell>
                            <TableCell>Phụ tùng bị ảnh hưởng</TableCell>
                            <TableCell>Phạm vi model</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">Không có dữ liệu</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell>{e.name || "—"}</TableCell>
                                    <TableCell>{e.reason || "—"}</TableCell>
                                    <TableCell>
                                        {e.startDate ? new Date(e.startDate).toLocaleDateString("vi-VN") : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {e.endDate ? new Date(e.endDate).toLocaleDateString("vi-VN") : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {Array.isArray(e.exclusions) && e.exclusions.length > 0 ? (
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {e.exclusions.slice(0, 2).map((ex, i) => (
                                                    <Chip key={i} label={EXCLUSION_LABELS[ex] || ex} size="small" />
                                                ))}
                                                {e.exclusions.length > 2 && (
                                                    <Chip label={`+${e.exclusions.length - 2}`} size="small" />
                                                )}
                                            </Stack>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {Array.isArray(e.modelRanges) && e.modelRanges.length > 0 ? (
                                            <Typography variant="body2">
                                                {e.modelRanges.length} model(s)
                                            </Typography>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={e.isDelete ? "Đã xoá" : "Hoạt động"}
                                            color={e.isDelete ? "default" : "success"}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton size="small" onClick={() => handleViewDetail(e)}>
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {!e.isDelete && (
                                                <>
                                                    <Tooltip title="Sửa">
                                                        <IconButton size="small" onClick={() => openEdit(e)}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Xoá">
                                                        <IconButton size="small" onClick={() => askDelete(e)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                            {e.isDelete && (
                                                <Tooltip title="Khôi phục">
                                                    <IconButton size="small" onClick={() => handleRecover(e)}>
                                                        <Restore fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Paper>

            {/* Form Dialog */}
            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md">
                <DialogTitle>
                    {mode === "create" ? "Tạo sự kiện thu hồi mới" : "Cập nhật sự kiện"}
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Tên sự kiện *"
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Lý do"
                            value={form.reason}
                            onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Ngày bắt đầu"
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Ngày kết thúc"
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    disabled={mode === "create"}
                                    
                                />
                            </Grid>
                        </Grid>

                        <Autocomplete
                            multiple
                            options={ALLOWED_EXCLUSIONS}
                            value={form.exclusions}
                            onChange={(e, val) => setForm((s) => ({ ...s, exclusions: val }))}
                            getOptionLabel={(opt) => EXCLUSION_LABELS[opt] || opt}
                            renderInput={(params) => (
                                <TextField {...params} label="Exclusions" placeholder="Chọn exclusions" />
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={option}
                                        label={EXCLUSION_LABELS[option] || option}
                                        size="small"
                                    />
                                ))
                            }
                        />

                        <Autocomplete
                            multiple
                            options={parts}
                            loading={partsLoading}
                            value={form.affectedParts.map(partId => {
                                // Tìm Part object từ ID
                                const part = parts.find(p => String(p.id) === String(partId));
                                if (!part) {
                                    console.warn("[EventManagement] Part not found for ID:", partId, "Available parts:", parts.map(p => p.id));
                                }
                                return part || null;
                            }).filter(Boolean)}
                            onChange={(e, val) => {
                                console.log("[EventManagement] Autocomplete onChange - val:", val);
                                console.log("[EventManagement] Autocomplete onChange - val type:", typeof val, "isArray:", Array.isArray(val));
                                
                                // Lưu chỉ ID của parts được chọn
                                const partIds = val
                                    .map((v, idx) => {
                                        console.log(`[EventManagement] Processing part ${idx}:`, v, "id:", v?.id);
                                        return v?.id;
                                    })
                                    .filter(id => {
                                        const isValid = id != null && id !== "" && id !== undefined;
                                        if (!isValid) {
                                            console.warn(`[EventManagement] Filtered out invalid part ID:`, id);
                                        }
                                        return isValid;
                                    })
                                    .map(id => {
                                        const strId = String(id).trim();
                                        console.log(`[EventManagement] Converting ID:`, id, "->", strId);
                                        return strId;
                                    })
                                    .filter(id => id.length > 0);
                                
                                console.log("[EventManagement] Final selected part IDs:", partIds);
                                console.log("[EventManagement] Setting form.affectedParts to:", partIds);
                                
                                setForm((s) => {
                                    const newForm = { ...s, affectedParts: partIds };
                                    console.log("[EventManagement] New form state:", newForm);
                                    return newForm;
                                });
                            }}
                            getOptionLabel={(opt) => {
                                if (!opt) return "";
                                return `${opt.partName || "—"}${opt.partNo ? ` (${opt.partNo})` : ""}`;
                            }}
                            isOptionEqualToValue={(a, b) => {
                                if (!a || !b) return a === b;
                                return String(a?.id) === String(b?.id);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Affected Parts"
                                    placeholder="Chọn parts từ danh sách..."
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {partsLoading ? <CircularProgress size={16} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                            renderOption={(props, option) => {
                                return (
                                    <li {...props} key={option.id}>
                                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                                            <Typography fontWeight={700} noWrap>
                                                {option.partName || "—"}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {option.partNo ? `Part No: ${option.partNo}` : "Không có Part No"}
                                            </Typography>
                                        </Box>
                                    </li>
                                );
                            }}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const label = option?.partName || option?.partNo || "";
                                    return (
                                        <Chip
                                            {...getTagProps({ index })}
                                            key={option?.id || index}
                                            label={label}
                                            size="small"
                                        />
                                    );
                                })
                            }
                        />

                        <Divider />
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle2">Phạm vi mẫu xe</Typography>
                                <Button size="small" startIcon={<Add />} onClick={addModelRange}>
                                    Thêm phạm vi mẫu xe
                                </Button>
                            </Stack>
                            {form.modelRanges.map((r, idx) => (
                                <Paper key={idx} sx={{ p: 2, mb: 1, bgcolor: "background.default" }}>
                                    <Stack spacing={2}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight={600}>
                                                Phạm vi mẫu xe ảnh hưởng {idx + 1}
                                            </Typography>
                                            <IconButton size="small" onClick={() => removeModelRange(idx)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                        <Autocomplete
                                            options={evModels}
                                            loading={modelsLoading}
                                            value={evModels.find(m => m.modelCode === r.modelCode) || null}
                                            onChange={(e, val) => updateModelRange(idx, "modelCode", val?.modelCode || "")}
                                            getOptionLabel={(opt) => opt ? `${opt.modelCode} - ${opt.model || ""}` : ""}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Model Code *" required />
                                            )}
                                        />
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <TextField
                                                    label="Ngày sản xuất từ"
                                                    type="date"
                                                    value={r.productionFrom}
                                                    onChange={(e) => updateModelRange(idx, "productionFrom", e.target.value)}
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            </Grid>
                                            <Grid item xs={6}>
                                                <TextField
                                                    label="Ngày sản xuất đến"
                                                    type="date"
                                                    value={r.productionTo}
                                                    onChange={(e) => updateModelRange(idx, "productionTo", e.target.value)}
                                                    fullWidth
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Stack>
                                </Paper>
                            ))}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={busy}>Hủy</Button>
                    <Button variant="contained" onClick={submit} disabled={busy}>
                        {busy ? "Đang lưu..." : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Detail Dialog */}
            <Dialog open={viewDetailOpen} onClose={() => setViewDetailOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Chi tiết sự kiện</DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : eventDetail ? (
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Tên sự kiện</Typography>
                                    <Typography variant="body1" fontWeight={600}>{eventDetail.name || "—"}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Lý do</Typography>
                                    <Typography variant="body1">{eventDetail.reason || "—"}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Ngày bắt đầu</Typography>
                                    <Typography variant="body1">
                                        {eventDetail.startDate ? new Date(eventDetail.startDate).toLocaleDateString("vi-VN") : "—"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Ngày kết thúc</Typography>
                                    <Typography variant="body1">
                                        {eventDetail.endDate ? new Date(eventDetail.endDate).toLocaleDateString("vi-VN") : "—"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Exclusions</Typography>
                                    {Array.isArray(eventDetail.exclusions) && eventDetail.exclusions.length > 0 ? (
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                            {eventDetail.exclusions.map((ex, i) => (
                                                <Chip key={i} label={EXCLUSION_LABELS[ex] || ex} size="small" />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body1">—</Typography>
                                    )}
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Affected Parts</Typography>
                                    {(() => {
                                        // Parse affectedParts từ eventDetail
                                        let affectedPartIds = [];
                                        
                                        // Thử parse từ affectedPartsJson trước
                                        if (eventDetail.affectedPartsJson) {
                                            try {
                                                const parsed = typeof eventDetail.affectedPartsJson === 'string' 
                                                    ? JSON.parse(eventDetail.affectedPartsJson) 
                                                    : eventDetail.affectedPartsJson;
                                                if (Array.isArray(parsed)) {
                                                    affectedPartIds = parsed.map(item => String(item));
                                                }
                                            } catch (err) {
                                                console.warn("[EventManagement] Failed to parse affectedPartsJson in detail view:", err);
                                            }
                                        }
                                        
                                        // Fallback: dùng affectedParts nếu có
                                        if (affectedPartIds.length === 0 && Array.isArray(eventDetail.affectedParts)) {
                                            affectedPartIds = eventDetail.affectedParts.map(item => String(item));
                                        }
                                        
                                        // Tìm part objects từ IDs
                                        const affectedPartObjects = affectedPartIds
                                            .map(partId => parts.find(p => String(p.id) === partId))
                                            .filter(Boolean);
                                        
                                        if (affectedPartObjects.length > 0) {
                                            return (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                                    {affectedPartObjects.map((part, i) => (
                                                        <Chip 
                                                            key={part.id || i} 
                                                            label={part.partName || part.partNo || part.id} 
                                                            size="small" 
                                                        />
                                                    ))}
                                                </Stack>
                                            );
                                        } else if (affectedPartIds.length > 0) {
                                            // Nếu có IDs nhưng không tìm thấy part objects (có thể part đã bị xóa)
                                            return (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                                    {affectedPartIds.map((partId, i) => (
                                                        <Chip 
                                                            key={i} 
                                                            label={`Part ID: ${partId}`} 
                                                            size="small" 
                                                            color="warning"
                                                        />
                                                    ))}
                                                </Stack>
                                            );
                                        } else {
                                            return <Typography variant="body1">—</Typography>;
                                        }
                                    })()}
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Model Ranges</Typography>
                                    {Array.isArray(eventDetail.modelRanges) && eventDetail.modelRanges.length > 0 ? (
                                        <Stack spacing={1}>
                                            {eventDetail.modelRanges.map((r, idx) => (
                                                <Paper key={idx} sx={{ p: 1.5, bgcolor: "background.default" }}>
                                                    <Typography variant="body2" fontWeight={600}>{r.modelCode}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Từ: {r.productionFrom ? new Date(r.productionFrom).toLocaleDateString("vi-VN") : "—"}
                                                        {" → "}
                                                        Đến: {r.productionTo ? new Date(r.productionTo).toLocaleDateString("vi-VN") : "—"}
                                                    </Typography>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography variant="body1">—</Typography>
                                    )}
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Ngày tạo</Typography>
                                    <Typography variant="body1">
                                        {eventDetail.createdAt ? new Date(eventDetail.createdAt).toLocaleString("vi-VN") : "—"}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">Không có dữ liệu</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDetailOpen(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Xác nhận xoá</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc muốn xoá Event "{eventToDelete?.name}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} disabled={busy}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={confirmDelete} disabled={busy}>
                        {busy ? "Đang xoá..." : "Xoá"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={6000}
                onClose={() => setToast((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={toast.type} onClose={() => setToast((s) => ({ ...s, open: false }))}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
}

