"use client";

import React from "react";
import {
    Box, Button, Container, Divider, Grid, InputAdornment, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
    Toolbar, Tooltip, Snackbar, Alert, CircularProgress, TableContainer,
    TablePagination, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Chip, Stack, ToggleButton, Autocomplete, Checkbox, FormControlLabel
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import {
    Search, Add, Edit, DeleteOutline, Restore, PlayArrow,
    Inventory2, Build, InfoOutlined
} from "@mui/icons-material";
import RefreshIcon from "@mui/icons-material/Refresh";

/* ================= BASE + AUTH (ép về :8080) ================= */
const API_BASE = "http://localhost:8080";
const buildUrl = (u) => (/^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`);

const getAccessToken = () =>
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    "";

async function authFetch(url, init = {}) {
    const headers = new Headers(init.headers || {});
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", headers.get("Accept") || "application/json");
    if (init.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", headers.get("Content-Type") || "application/json");
    }
    return fetch(buildUrl(url), { ...init, headers, mode: "cors" });
}

/* ================= APIs ================= */
const partApi = {
    async getAll(signal) {
        const res = await authFetch("/api/parts/get-all", { method: "GET", signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    async getActives(signal) {
        const res = await authFetch("/api/parts/get-active", { method: "GET", signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    async create(payload) {
        const res = await authFetch("/api/parts/create", { method: "POST", body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async update(partId, payload) {
        const res = await authFetch(`/api/parts/${encodeURIComponent(partId)}/update`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async remove(id) {
        const res = await authFetch(`/api/parts/${encodeURIComponent(id)}/delete`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async recover(id) {
        const res = await authFetch(`/api/parts/${encodeURIComponent(id)}/recover`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
};

const lotApi = {
    async getAll(signal) {
        const res = await authFetch("/api/part-lots/get-all", { method: "GET", signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    async getActives(signal) {
        const res = await authFetch("/api/part-lots/get-active", { method: "GET", signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : raw?.data ?? [];
    },
    async create(payload) {
        const res = await authFetch("/api/part-lots/create", { method: "POST", body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async update(lotId, payload) {
        const res = await authFetch(`/api/part-lots/${encodeURIComponent(lotId)}/update`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async remove(lotId) {
        const res = await authFetch(`/api/part-lots/${encodeURIComponent(lotId)}/delete`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
    async recover(lotId) {
        const res = await authFetch(`/api/part-lots/${encodeURIComponent(lotId)}/recover`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json().catch(() => ({}));
    },
};

/* ================= Styled (gọn) ================= */
const HeadCell = styled(TableCell)(({ theme }) => ({
    background: alpha(theme.palette.background.paper, 0.35),
    fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`
}));
const RowCell = styled(TableCell)(({ theme }) => ({
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    paddingTop: 10, paddingBottom: 10
}));

/* Search pill */
const PillTextField = styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": { borderRadius: 999, height: 36 },
    "& .MuiOutlinedInput-input": { paddingTop: 8, paddingBottom: 8 },
}));

/* ================= Helpers ================= */
const safeDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
};
const fmtDate = (iso) => {
    const d = safeDate(iso);
    if (!d) return { time: "—", date: "—" };
    const pad = (x) => String(x).padStart(2, "0");
    return { time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` };
};
const fmtDay = (iso) => {
    const d = safeDate(iso);
    if (!d) return "—";
    const pad = (x) => String(x).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const fmtVND = (n) =>
    (n === null || n === undefined || n === "") ? "—"
        : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(n));
const normalizeEnum = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

/* ============= Reusable confirm dialog ============= */
function ConfirmDialog({ open, title, content, confirmText = "Xác nhận", color = "primary", onClose, onConfirm, loading }) {
    return (
        <Dialog open={open} onClose={() => onClose?.(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ py: 1.5 }}>{title}</DialogTitle>
            <DialogContent sx={{ pt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{content}</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 1, pt: 0 }}>
                <Button onClick={() => onClose?.(false)} disabled={loading} size="small">Hủy</Button>
                <Button variant="contained" color={color} onClick={onConfirm} disabled={loading} size="small">
                    {loading ? "Đang xử lý..." : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ================= Dialog Create/Update (Parts) – gọn ================= */
function PartFormDialog({ open, onClose, onSubmit, initial }) {
    const [form, setForm] = React.useState({
        partNo: "", partName: "", category: "", unitOfMeasure: "", unitPrice: "", isSerialized: false
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [serverErr, setServerErr] = React.useState("");

    React.useEffect(() => {
        setForm({
            partNo: initial?.partNo || "",
            partName: initial?.partName || "",
            category: initial?.category || "",
            unitOfMeasure: initial?.unitOfMeasure || "",
            unitPrice: initial?.unitPrice ?? "",
            isSerialized: initial?.isSerialized ?? false,
        });
        setServerErr("");
    }, [initial, open]);

    const handleChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

    const handleSubmit = async () => {
        // client-side validation
        if (!String(form.partNo).trim() || !String(form.partName).trim()) {
            setServerErr("Vui lòng nhập Part No và Tên phụ tùng");
            return;
        }
        const priceNum = form.unitPrice === "" ? 0 : Number(form.unitPrice);
        if (Number.isNaN(priceNum) || priceNum < 0) {
            setServerErr("Giá không hợp lệ");
            return;
        }

        const payload = {
            partNo: String(form.partNo).trim(),
            partName: String(form.partName).trim(),
            category: normalizeEnum(form.category),
            unitOfMeasure: normalizeEnum(form.unitOfMeasure),
            unitPrice: priceNum,
            isSerialized: Boolean(form.isSerialized),
        };

        setSubmitting(true);
        setServerErr("");
        try {
            await onSubmit(payload);
            onClose(true);
        } catch (e) {
            setServerErr(e?.message || "Lỗi lưu dữ liệu");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ py: 1.5 }}>{initial ? "Cập nhật phụ tùng" : "Thêm phụ tùng"}</DialogTitle>
            <DialogContent sx={{ pt: 0.5, display: "grid", gap: 1.25 }}>
                <TextField label="Part No" value={form.partNo} onChange={handleChange("partNo")} size="small" />
                <TextField label="Tên phụ tùng" value={form.partName} onChange={handleChange("partName")} size="small" />
                <TextField label="Nhóm/Loại" value={form.category} onChange={handleChange("category")} size="small" />
                <TextField label="Đơn vị" value={form.unitOfMeasure} onChange={handleChange("unitOfMeasure")} size="small" />
                <TextField label="Giá (VND)" type="number" value={form.unitPrice} onChange={handleChange("unitPrice")} size="small" />
                <FormControlLabel
                    control={<Checkbox checked={!!form.isSerialized} onChange={(e) => setForm(s => ({ ...s, isSerialized: e.target.checked }))} size="small" />}
                    label="Theo dõi theo serial (isSerialized)"
                />
                {serverErr && <Alert severity="error" variant="outlined">{serverErr}</Alert>}
            </DialogContent>
            <DialogActions sx={{ p: 1, pt: 0 }}>
                <Button onClick={() => onClose(false)} disabled={submitting} size="small">Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={submitting} size="small">
                    {submitting ? "Đang lưu..." : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ================= Dialog Create/Update (Lots) – KHÔNG CÓ PART NO ================= */
function LotFormDialog({ open, onClose, onSubmit, initial }) {
    const [form, setForm] = React.useState({
        partId: "",
        serialNo: "",
        batchNo: "",
        mfgDate: "" // yyyy-mm-dd
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [serverErr, setServerErr] = React.useState("");

    // Danh sách parts ACTIVE cho dropdown
    const [parts, setParts] = React.useState([]);
    const [partsLoading, setPartsLoading] = React.useState(false);
    // Part đang chọn trong Autocomplete
    const [selectedPart, setSelectedPart] = React.useState(null);

    // Khi mở dialog: load parts ACTIVE + sync initial
    React.useEffect(() => {
        if (!open) return;
        const ab = new AbortController();
        (async () => {
            try {
                setPartsLoading(true);
                const list = await partApi.getActives(ab.signal);
                const options = (Array.isArray(list) ? list : []).map(p => ({
                    id: p.id,
                    partNo: p.partNo || "",
                    partName: p.partName || ""
                }));
                setParts(options);

                if (initial?.partId) {
                    const found = options.find(o => String(o.id) === String(initial.partId));
                    setSelectedPart(found || null);
                } else {
                    setSelectedPart(null);
                }
            } catch (err) {
                console.error("Load active parts failed:", err);
            } finally {
                setPartsLoading(false);
            }
        })();
        return () => ab.abort();
    }, [open, initial?.partId]);

    // Sync form khi mở/sửa
    React.useEffect(() => {
        setForm({
            partId: initial?.partId || "",
            serialNo: initial?.serialNo || "",
            batchNo: initial?.batchNo || "",
            mfgDate: initial?.mfgDate ? String(initial.mfgDate).slice(0, 10) : ""
        });
        setServerErr("");
    }, [initial, open]);

    const handleChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

    const handleSubmit = async () => {
        const finalPartId = selectedPart?.id ?? form.partId;

        // client-side validation
        if (!String(finalPartId).trim()) return setServerErr("Vui lòng chọn phụ tùng");
        if (!form.serialNo?.trim() || form.serialNo.trim().length < 3) return setServerErr("Serial No tối thiểu 3 ký tự");
        if (!form.batchNo?.trim() || form.batchNo.trim().length < 3) return setServerErr("Batch No tối thiểu 3 ký tự");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.mfgDate))) return setServerErr("Ngày sản xuất dạng YYYY-MM-DD");
        if (!safeDate(form.mfgDate)) return setServerErr("Ngày sản xuất không hợp lệ");

        const payload = {
            partId: String(finalPartId).trim(),
            serialNo: String(form.serialNo).trim(),
            batchNo: String(form.batchNo).trim(),
            mfgDate: String(form.mfgDate).slice(0, 10)
        };

        setSubmitting(true);
        setServerErr("");
        try {
            await onSubmit(payload);
            onClose(true);
        } catch (e) {
            setServerErr(e?.message || "Lỗi lưu dữ liệu");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ py: 1.5 }}>
                {initial ? "Cập nhật lô phụ tùng" : "Thêm lô phụ tùng"}
            </DialogTitle>
            <DialogContent sx={{ pt: 0.5, display: "grid", gap: 1.25 }}>
                {/* Dropdown tìm theo Part Name / Part No */}
                <Autocomplete
                    options={parts}
                    loading={partsLoading}
                    value={selectedPart}
                    onChange={(e, val) => {
                        setSelectedPart(val);
                        setForm((s) => ({ ...s, partId: val?.id ?? "" }));
                    }}
                    getOptionLabel={(o) => o ? `${o.partName}${o.partNo ? ` (${o.partNo})` : ""}` : ""}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Phụ tùng"
                            size="small"
                            placeholder="Tìm theo tên hoặc Part No…"
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
                    renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                            <Box sx={{ display: "flex", flexDirection: "column" }}>
                                <Typography fontWeight={700} noWrap>{option.partName || "—"}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {option.partNo ? `Part No: ${option.partNo}` : "Không có Part No"}
                                </Typography>
                            </Box>
                        </li>
                    )}
                    isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                    clearOnBlur={false}
                />

                {/* Ẩn/Read-only để xem id khi cần (vẫn cho phép paste ID nếu muốn) */}
                <TextField
                    label="Part ID (tự điền khi chọn ở trên)"
                    value={selectedPart?.id ?? form.partId}
                    onChange={handleChange("partId")}
                    size="small"
                    InputProps={{ readOnly: Boolean(selectedPart) }}
                />

                <TextField
                    label="Serial No"
                    value={form.serialNo}
                    onChange={handleChange("serialNo")}
                    size="small"
                    required
                />
                <TextField
                    label="Batch No"
                    value={form.batchNo}
                    onChange={handleChange("batchNo")}
                    size="small"
                    required
                />
                <TextField
                    label="Ngày sản xuất"
                    type="date"
                    value={form.mfgDate}
                    onChange={handleChange("mfgDate")}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    required
                />
                {serverErr && <Alert severity="error" variant="outlined">{serverErr}</Alert>}
            </DialogContent>
            <DialogActions sx={{ p: 1 }}>
                <Button onClick={() => onClose(false)} size="small" disabled={submitting}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={handleSubmit} size="small" disabled={submitting}>
                    {submitting ? "Đang lưu..." : "Lưu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


/* ================= View 1: Phụ tùng ================= */
function PartsView({ onSwitch }) {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [q, setQ] = React.useState("");
    const [snack, setSnack] = React.useState({ open: false, type: "success", msg: "" });
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);

    const [openCreate, setOpenCreate] = React.useState(false);
    const [editRow, setEditRow] = React.useState(null);

    const [confirm, setConfirm] = React.useState({ open: false, type: null, row: null });
    const [confirmLoading, setConfirmLoading] = React.useState(false);

    const [activeOnly, setActiveOnly] = React.useState(false);

    const normalizeList = (list) =>
        list.map((x) => ({
            id: x.id,
            partNo: x.partNo,
            partName: x.partName,
            category: x.category,
            unitOfMeasure: x.unitOfMeasure,
            unitPrice: x.unitPrice,
            createAt: x.createAt ?? x.createdAt ?? null,
            isDelete: Boolean(x.isDelete),
            isSerialized: Boolean(x.isSerialized),
        }));

    const loadAll = React.useCallback(async (signal) => {
        try {
            setLoading(true); setError("");
            const list = await partApi.getAll(signal);
            setRows(normalizeList(list));
            setSnack({ open: true, type: "success", msg: `Tải ${list.length} phụ tùng` });
        } catch (e) {
            if (e?.name === "AbortError") return;
            const msg = e?.message || "Lỗi tải danh sách parts";
            setError(msg);
            setSnack({ open: true, type: "error", msg: `Lỗi tải dữ liệu: ${msg}` });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadActiveOnly = React.useCallback(async (signal) => {
        try {
            setLoading(true); setError("");
            const list = await partApi.getActives(signal);
            setRows(normalizeList(list));
            setSnack({ open: true, type: "success", msg: `Tải ${list.length} phụ tùng ACTIVE` });
            setPage(0);
        } catch (e) {
            if (e?.name === "AbortError") return;
            const msg = e?.message || "Lỗi tải danh sách ACTIVE";
            setError(msg);
            setSnack({ open: true, type: "error", msg: `Lỗi tải dữ liệu: ${msg}` });
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleActive = async () => {
        if (activeOnly) {
            setActiveOnly(false);
            await loadAll();
        } else {
            setActiveOnly(true);
            await loadActiveOnly();
        }
    };

    React.useEffect(() => {
        const ctrl = new AbortController();
        loadAll(ctrl.signal);
        return () => ctrl.abort();
    }, [loadAll]);

    const filtered = React.useMemo(() => {
        if (!q.trim()) return rows;
        const kw = q.trim().toLowerCase();
        return rows.filter(r =>
            (r.partNo && r.partNo.toLowerCase().includes(kw)) ||
            (r.partName && r.partName.toLowerCase().includes(kw)) ||
            (r.category && r.category.toLowerCase().includes(kw)) ||
            (r.unitOfMeasure && r.unitOfMeasure.toLowerCase().includes(kw))
        );
    }, [rows, q]);

    const pageRows = React.useMemo(() => {
        const start = page * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const closeConfirm = () => setConfirm({ open: false, type: null, row: null });

    const handleConfirm = async () => {
        if (!confirm.type || !confirm.row) return;
        setConfirmLoading(true);
        try {
            if (confirm.type === "delete") {
                await partApi.remove(confirm.row.id);
                setSnack({ open: true, type: "success", msg: "Đã xóa" });
            } else if (confirm.type === "recover") {
                await partApi.recover(confirm.row.id);
                setSnack({ open: true, type: "success", msg: "Đã khôi phục" });
            }
            await loadAll();
            closeConfirm();
        } catch (e) {
            setSnack({ open: true, type: "error", msg: e?.message || "Thao tác thất bại" });
        } finally {
            setConfirmLoading(false);
        }
    };

    const doUpdate = async (payload) => {
        await partApi.update(editRow.id, payload);
        setSnack({ open: true, type: "success", msg: "Đã cập nhật" });
        await loadAll();
    };
    const doCreate = async (payload) => {
        await partApi.create(payload);
        setSnack({ open: true, type: "success", msg: "Đã tạo phụ tùng" });
        await loadAll();
    };

    const confirmTitle =
        confirm.type === "delete" ? "Xóa phụ tùng?" :
            confirm.type === "recover" ? "Khôi phục phụ tùng?" : "";

    const confirmText = confirm.row
        ? `${confirmTitle} "${confirm.row.partNo}" (${String(confirm.row.id).slice(0, 8)}…)`
        : "";

    const confirmColor = confirm.type === "delete" ? "error" : "primary";
    const confirmBtn = confirm.type === "delete" ? "Xóa" : "Khôi phục";

    return (
        <>
            <Paper elevation={0} sx={{ p: 1.25, mb: 1.25, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        Quản lý Phụ tùng
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <PillTextField
                            placeholder="Tìm Part No / Tên / Nhóm / Đơn vị…"
                            size="small"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPage(0); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 280, maxWidth: 380 }}
                        />

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Inventory2 />}
                            onClick={onSwitch}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25 }}
                        >
                            Lô phụ tùng
                        </Button>

                        <Tooltip title="Tải lại">
                            <span>
                                <IconButton size="small" onClick={() => loadAll()} disabled={loading} sx={{ height: 36, width: 36 }}>
                                    {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>

                        <ToggleButton
                            value="active"
                            selected={activeOnly}
                            onChange={toggleActive}
                            size="small"
                            disabled={loading}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25, px: 1.25, "&.Mui-selected": { borderColor: "primary.main" } }}
                        >
                            <PlayArrow fontSize="small" style={{ marginRight: 6 }} />
                            Chỉ ACTIVE
                        </ToggleButton>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => setOpenCreate(true)}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25 }}
                        >
                            Thêm
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 1.5, overflow: "hidden" }}>
                <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>Danh sách</Typography>
                </Box>
                <Divider />

                <TableContainer sx={{ width: "100%" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <HeadCell>Part No</HeadCell>
                                <HeadCell>Tên phụ tùng</HeadCell>
                                <HeadCell>Nhóm/Loại</HeadCell>
                                <HeadCell>Đơn vị</HeadCell>
                                <HeadCell>Giá</HeadCell>
                                <HeadCell>Ngày tạo</HeadCell>
                                <HeadCell align="right">Thao tác</HeadCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {!loading && pageRows.length === 0 && (
                                <TableRow>
                                    <RowCell colSpan={7}>
                                        <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                                            Không có dữ liệu phù hợp
                                        </Box>
                                    </RowCell>
                                </TableRow>
                            )}

                            {pageRows.map((r) => {
                                const d = fmtDate(r.createAt);
                                return (
                                    <TableRow key={r.id} hover>
                                        <RowCell>
                                            <Typography fontWeight={800} noWrap>{r.partNo || "—"}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap title={r.id}>
                                                {r.id ? `(${String(r.id).slice(0, 8)}…)` : ""}
                                            </Typography>
                                        </RowCell>
                                        <RowCell><Typography noWrap>{r.partName || "—"}</Typography></RowCell>
                                        <RowCell><Typography noWrap>{r.category || "—"}</Typography></RowCell>
                                        <RowCell><Typography noWrap>{r.unitOfMeasure || "—"}</Typography></RowCell>
                                        <RowCell><Typography noWrap>{fmtVND(r.unitPrice)}</Typography></RowCell>
                                        <RowCell>
                                            <Typography fontWeight={700} sx={{ lineHeight: 1 }} noWrap>{d.time}</Typography>
                                            <Typography color="text.secondary" sx={{ lineHeight: 1.1 }} noWrap>{d.date}</Typography>
                                        </RowCell>

                                        <RowCell align="right">
                                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                                                {!r.isDelete ? (
                                                    <>
                                                        <Tooltip title="Chỉnh sửa">
                                                            <IconButton size="small" sx={{ "&:hover": { transform: "scale(1.08)" }, transition: "all .15s" }} onClick={() => setEditRow(r)}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Xóa">
                                                            <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, type: "delete", row: r })}>
                                                                <DeleteOutline fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                ) : (
                                                    <Tooltip title="Khôi phục">
                                                        <IconButton size="small" color="primary" onClick={() => setConfirm({ open: true, type: "recover", row: r })}>
                                                            <Restore fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </RowCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
                    <TablePagination
                        component="div"
                        count={filtered.length}
                        page={page}
                        onPageChange={(e, p) => setPage(p)}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        labelRowsPerPage="Hàng/trang"
                    />
                </Box>
            </Paper>

            <PartFormDialog open={openCreate} onClose={() => setOpenCreate(false)} onSubmit={doCreate} />
            <PartFormDialog open={!!editRow} initial={editRow} onClose={() => setEditRow(null)} onSubmit={doUpdate} />

            <ConfirmDialog
                open={confirm.open}
                title={confirm.type === "delete" ? "Xóa phụ tùng?" : "Khôi phục phụ tùng?"}
                content={confirm.row ? `${confirm.type === "delete" ? "Xóa" : "Khôi phục"} "${confirm.row.partNo}" (${String(confirm.row.id).slice(0, 8)}…)` : ""}
                confirmText={confirm.type === "delete" ? "Xóa" : "Khôi phục"}
                color={confirm.type === "delete" ? "error" : "primary"}
                loading={confirmLoading}
                onClose={closeConfirm}
                onConfirm={handleConfirm}
            />

            <Snackbar open={snack.open} autoHideDuration={1800} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                <Alert severity={snack.type} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>

            {error && (
                <Box sx={{ mt: 1 }}>
                    <Alert severity="error" variant="outlined">{error}</Alert>
                </Box>
            )}
        </>
    );
}

/* ================= View 2: Lô phụ tùng – FIELDS MỚI + ICON ACTION ================= */
function LotsView({ onSwitch }) {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [q, setQ] = React.useState("");
    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);
    const [snack, setSnack] = React.useState({ open: false, type: "success", msg: "" });

    const [openCreate, setOpenCreate] = React.useState(false);
    const [editRow, setEditRow] = React.useState(null);

    const [confirm, setConfirm] = React.useState({ open: false, type: null, row: null });
    const [confirmLoading, setConfirmLoading] = React.useState(false);

    const [activeOnly, setActiveOnly] = React.useState(false);

    const [detailRow, setDetailRow] = React.useState(null);

    const normalize = (list) =>
        list.map((x) => ({
            id: x.id,
            partId: x.partId,
            partNo: x.partNo ?? x.part?.partNo ?? "—",
            serialNo: x.serialNo ?? "—",
            batchNo: x.batchNo ?? "—",
            mfgDate: x.mfgDate ?? null,                 // YYYY-MM-DD
            createAt: x.createAt ?? x.createdAt ?? null,
            status: (x.isDelete === true || x.status === "DELETED") ? "DELETED" : "ACTIVE",
        }));

    const loadLots = React.useCallback(async (signal) => {
        try {
            setLoading(true); setError("");
            const list = await lotApi.getAll(signal);
            setRows(normalize(list));
            setSnack({ open: true, type: "success", msg: `Tải ${list.length} lô phụ tùng` });
        } catch (e) {
            if (e?.name === "AbortError") return;
            const msg = e?.message || "Lỗi tải danh sách lô phụ tùng";
            setError(msg);
            setSnack({ open: true, type: "error", msg });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadActiveLots = React.useCallback(async (signal) => {
        try {
            setLoading(true); setError("");
            const list = await lotApi.getActives(signal);
            setRows(normalize(list));
            setSnack({ open: true, type: "success", msg: `Tải ${list.length} lô ACTIVE` });
            setPage(0);
        } catch (e) {
            if (e?.name === "AbortError") return;
            const msg = e?.message || "Lỗi tải danh sách lô ACTIVE";
            setError(msg);
            setSnack({ open: true, type: "error", msg });
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleActive = async () => {
        if (activeOnly) {
            setActiveOnly(false);
            await loadLots();
        } else {
            setActiveOnly(true);
            await loadActiveLots();
        }
    };

    const doLotCreate = async (payload) => {
        await lotApi.create(payload);
        setSnack({ open: true, type: "success", msg: "Đã tạo lô" });
        await loadLots();
    };

    const doLotUpdate = async (payload) => {
        await lotApi.update(editRow.id, payload);
        setSnack({ open: true, type: "success", msg: "Đã cập nhật lô" });
        await loadLots();
    };

    const handleConfirm = async () => {
        if (!confirm.type || !confirm.row) return;
        setConfirmLoading(true);
        try {
            if (confirm.type === "delete") {
                await lotApi.remove(confirm.row.id);
                setSnack({ open: true, type: "success", msg: "Đã xóa lô" });
            } else if (confirm.type === "recover") {
                await lotApi.recover(confirm.row.id);
                setSnack({ open: true, type: "success", msg: "Đã khôi phục lô" });
            }
            await loadLots();
            setConfirm({ open: false, type: null, row: null });
        } catch (e) {
            setSnack({ open: true, type: "error", msg: e?.message || "Thao tác thất bại" });
        } finally {
            setConfirmLoading(false);
        }
    };

    React.useEffect(() => {
        const ctrl = new AbortController();
        loadLots(ctrl.signal);
        return () => ctrl.abort();
    }, [loadLots]);

    const filtered = React.useMemo(() => {
        if (!q.trim()) return rows;
        const kw = q.trim().toLowerCase();
        return rows.filter(r =>
            (r.serialNo && String(r.serialNo).toLowerCase().includes(kw)) ||
            (r.batchNo && String(r.batchNo).toLowerCase().includes(kw)) ||
            (r.partNo && String(r.partNo).toLowerCase().includes(kw))
        );
    }, [rows, q]);

    const pageRows = React.useMemo(() => {
        const start = page * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const dTitle = confirm.type === "delete" ? "Xóa lô phụ tùng?" :
        confirm.type === "recover" ? "Khôi phục lô phụ tùng?" : "";
    const dText = confirm.row ? `${dTitle} "${confirm.row.serialNo}" (${String(confirm.row.id).slice(0, 8)}…)` : "";
    const dBtn = confirm.type === "delete" ? "Xóa" : "Khôi phục";
    const dColor = confirm.type === "delete" ? "error" : "primary";

    return (
        <>
            <Paper elevation={0} sx={{ p: 1.25, mb: 1.25, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        Quản lý Lô phụ tùng
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <PillTextField
                            placeholder="Tìm Serial / Batch / Part No…"
                            size="small"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }}
                            sx={{ minWidth: 280, maxWidth: 380 }}
                        />

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Build />}
                            onClick={onSwitch}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25 }}
                        >
                            Phụ tùng
                        </Button>

                        <Tooltip title="Tải lại">
                            <span>
                                <IconButton size="small" onClick={() => loadLots()} disabled={loading} sx={{ height: 36, width: 36 }}>
                                    {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>

                        <ToggleButton
                            value="active"
                            selected={activeOnly}
                            onChange={toggleActive}
                            size="small"
                            disabled={loading}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25, px: 1.25, "&.Mui-selected": { borderColor: "primary.main" } }}
                        >
                            <PlayArrow fontSize="small" style={{ marginRight: 6 }} />
                            Chỉ ACTIVE
                        </ToggleButton>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => setOpenCreate(true)}
                            sx={{ height: 36, textTransform: "none", borderRadius: 1.25 }}
                        >
                            Thêm lô
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 1.5, overflow: "hidden" }}>
                <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>Danh sách</Typography>
                </Box>
                <Divider />

                <TableContainer sx={{ width: "100%" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {/* BỎ Serial No để bảng gọn hơn */}
                                <HeadCell>Batch No</HeadCell>
                                <HeadCell>Part No</HeadCell>
                                <HeadCell>Ngày SX</HeadCell>
                                <HeadCell>Ngày tạo</HeadCell>
                                <HeadCell>Trạng thái</HeadCell>
                                <HeadCell align="right">Action</HeadCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {!loading && pageRows.length === 0 && (
                                <TableRow>
                                    {/* giảm colSpan vì bớt 1 cột */}
                                    <RowCell colSpan={6}>
                                        <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                                            Không có dữ liệu phù hợp
                                        </Box>
                                    </RowCell>
                                </TableRow>
                            )}

                            {pageRows.map((r) => {
                                const created = fmtDate(r.createAt);
                                const isDeleted = r.status === "DELETED";
                                return (
                                    <TableRow key={r.id} hover>
                                        {/* Batch No (kèm ID rút gọn) */}
                                        <RowCell>
                                            <Typography fontWeight={800} noWrap>{r.batchNo}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap title={r.id}>
                                                {r.id ? `(${String(r.id).slice(0, 8)}…)` : ""}
                                            </Typography>
                                        </RowCell>
                                        <RowCell><Typography noWrap>{r.partNo}</Typography></RowCell>
                                        <RowCell><Typography noWrap>{fmtDay(r.mfgDate)}</Typography></RowCell>
                                        <RowCell>
                                            <Typography fontWeight={700} sx={{ lineHeight: 1 }} noWrap>{created.time}</Typography>
                                            <Typography color="text.secondary" sx={{ lineHeight: 1.1 }} noWrap>{created.date}</Typography>
                                        </RowCell>
                                        <RowCell>
                                            <Chip label={isDeleted ? "DELETED" : "ACTIVE"} size="small" color={isDeleted ? "default" : "success"} variant={isDeleted ? "outlined" : "filled"} />
                                        </RowCell>

                                        {/* ICON ACTIONS → mở popup */}
                                        <RowCell align="right">
                                            <Tooltip title="Chi tiết">
                                                <IconButton size="small" onClick={() => setDetailRow(r)}>
                                                    <InfoOutlined fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton size="small" onClick={() => setEditRow(r)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {!isDeleted ? (
                                                <Tooltip title="Xóa">
                                                    <IconButton size="small" color="error" onClick={() => setConfirm({ open: true, type: "delete", row: r })}>
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Khôi phục">
                                                    <IconButton size="small" color="primary" onClick={() => setConfirm({ open: true, type: "recover", row: r })}>
                                                        <Restore fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </RowCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
                    <TablePagination
                        component="div"
                        count={filtered.length}
                        page={page}
                        onPageChange={(e, p) => setPage(p)}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        labelRowsPerPage="Hàng/trang"
                    />
                </Box>
            </Paper>

            {/* Popup chi tiết lô */}
            <Dialog open={Boolean(detailRow)} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ py: 1.5 }}>Chi tiết lô phụ tùng</DialogTitle>
                <DialogContent sx={{ display: "grid", gap: 0.75, pt: 0.5 }}>
                    {detailRow && (
                        <>
                            <Typography><b>Serial No:</b> {detailRow.serialNo}</Typography>
                            <Typography><b>Batch No:</b> {detailRow.batchNo}</Typography>
                            <Typography><b>Part No:</b> {detailRow.partNo}</Typography>
                            <Typography><b>Part ID:</b> {detailRow.partId || "—"}</Typography>
                            <Typography><b>Ngày SX:</b> {fmtDay(detailRow.mfgDate)}</Typography>
                            {(() => { const d = fmtDate(detailRow.createAt); return <Typography><b>Ngày tạo:</b> {d.date} {d.time}</Typography>; })()}
                            <Typography><b>Trạng thái:</b> {detailRow.status}</Typography>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 1 }}>
                    <Button onClick={() => setDetailRow(null)} size="small">Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Create/Update Lô */}
            <LotFormDialog open={openCreate} onClose={() => setOpenCreate(false)} onSubmit={doLotCreate} />
            <LotFormDialog open={!!editRow} initial={editRow} onClose={() => setEditRow(null)} onSubmit={doLotUpdate} />

            {/* Confirm delete / recover */}
            <ConfirmDialog
                open={confirm.open}
                title={dTitle}
                content={dText}
                confirmText={dBtn}
                color={dColor}
                loading={confirmLoading}
                onClose={() => setConfirm({ open: false, type: null, row: null })}
                onConfirm={handleConfirm}
            />

            <Snackbar open={snack.open} autoHideDuration={1800} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                <Alert severity={snack.type} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>

            {error && (
                <Box sx={{ mt: 1 }}>
                    <Alert severity="error" variant="outlined">{error}</Alert>
                </Box>
            )}
        </>
    );
}

/* ================= Component duy nhất – KHÔNG TAB ================= */
export default function PartsAndLotsManagement() {
    const [view, setView] = React.useState("parts"); // "parts" | "lots"

    return (
        <Container sx={{ py: 2 }} maxWidth="lg">
            {view === "parts"
                ? <PartsView onSwitch={() => setView("lots")} />
                : <LotsView onSwitch={() => setView("parts")} />
            }
        </Container>
    );
}
