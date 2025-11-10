"use client";

import React from "react";
import {
    Box, Button, Container, Divider, Grid, InputAdornment, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
    Toolbar, Tooltip, Snackbar, Alert, CircularProgress, TableContainer,
    TablePagination, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Chip, Stack, ToggleButton, Autocomplete, Checkbox, FormControlLabel, MenuItem
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
    async search({ q = "", page = 0, size = 10 }) {
        const url = `/api/parts/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`;
        const res = await authFetch(url, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json(); // Expect Spring Page
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
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            try {
                const json = JSON.parse(text);
                let message = json.message || json.error || text;
                // Format lại message database error thành message thân thiện hơn
                if (message.includes("Duplicate entry") && message.includes("uk_partlot_serial_no")) {
                    const match = message.match(/Duplicate entry '([^']+)'/);
                    const serialNo = match ? match[1] : "";
                    message = `Số serial "${serialNo}" đã tồn tại trong hệ thống. Serial No phải unique toàn hệ thống.`;
                } else if (message.includes("Đã tồn tại PartLot") || message.includes("PartLot với partId")) {
                    // Format lại thông báo lỗi PartLot duplicate với batchNo và mfgDate
                    const batchMatch = message.match(/batchNo=([^,]+)/);
                    const mfgDateMatch = message.match(/mfgDate=([^,]+)/);
                    const batchNo = batchMatch ? batchMatch[1].trim() : "";
                    let mfgDate = mfgDateMatch ? mfgDateMatch[1].trim() : "";
                    
                    // Format lại ngày nếu có
                    if (mfgDate) {
                        try {
                            const dateObj = new Date(mfgDate);
                            if (!isNaN(dateObj.getTime())) {
                                mfgDate = dateObj.toLocaleDateString("vi-VN");
                            }
                        } catch {
                            // Giữ nguyên nếu không parse được
                        }
                    }
                    
                    if (batchNo && mfgDate) {
                        message = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}" và Ngày sản xuất "${mfgDate}". Vui lòng sử dụng Batch No hoặc Ngày sản xuất khác.`;
                    } else if (batchNo) {
                        message = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}". Vui lòng sử dụng Batch No khác.`;
                    } else if (message.includes("BatchNo phải unique")) {
                        message = "Đã tồn tại lô phụ tùng với cùng Batch No và Ngày sản xuất. Vui lòng thay đổi Batch No hoặc Ngày sản xuất.";
                    } else {
                        message = "Đã tồn tại lô phụ tùng với thông tin tương tự. Vui lòng kiểm tra lại Batch No và Ngày sản xuất.";
                    }
                } else if (message.includes("Duplicate entry") && message.includes("part_lots")) {
                    message = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                } else if (res.status === 409) {
                    // HTTP 409 Conflict - thường là duplicate entry
                    message = message || "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                }
                throw new Error(message || `HTTP ${res.status} – ${text}`);
            } catch (e) {
                if (e instanceof Error && e.message !== text) throw e;
                // Format lại message database error nếu không parse được JSON
                let errorMsg = text || "Lỗi tạo lô phụ tùng";
                if (text.includes("Duplicate entry") && text.includes("uk_partlot_serial_no")) {
                    const match = text.match(/Duplicate entry '([^']+)'/);
                    const serialNo = match ? match[1] : "";
                    errorMsg = `Số serial "${serialNo}" đã tồn tại trong hệ thống. Serial No phải unique toàn hệ thống.`;
                } else if (text.includes("Đã tồn tại PartLot") || text.includes("PartLot với partId")) {
                    // Format lại thông báo lỗi PartLot duplicate với batchNo và mfgDate
                    const batchMatch = text.match(/batchNo=([^,]+)/);
                    const mfgDateMatch = text.match(/mfgDate=([^,]+)/);
                    const batchNo = batchMatch ? batchMatch[1].trim() : "";
                    let mfgDate = mfgDateMatch ? mfgDateMatch[1].trim() : "";
                    
                    // Format lại ngày nếu có
                    if (mfgDate) {
                        try {
                            const dateObj = new Date(mfgDate);
                            if (!isNaN(dateObj.getTime())) {
                                mfgDate = dateObj.toLocaleDateString("vi-VN");
                            }
                        } catch {
                            // Giữ nguyên nếu không parse được
                        }
                    }
                    
                    if (batchNo && mfgDate) {
                        errorMsg = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}" và Ngày sản xuất "${mfgDate}". Vui lòng sử dụng Batch No hoặc Ngày sản xuất khác.`;
                    } else if (batchNo) {
                        errorMsg = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}". Vui lòng sử dụng Batch No khác.`;
                    } else if (text.includes("BatchNo phải unique")) {
                        errorMsg = "Đã tồn tại lô phụ tùng với cùng Batch No và Ngày sản xuất. Vui lòng thay đổi Batch No hoặc Ngày sản xuất.";
                    } else {
                        errorMsg = "Đã tồn tại lô phụ tùng với thông tin tương tự. Vui lòng kiểm tra lại Batch No và Ngày sản xuất.";
                    }
                } else if (text.includes("Duplicate entry")) {
                    errorMsg = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                } else if (res.status === 409) {
                    errorMsg = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                }
                throw new Error(errorMsg);
            }
        }
        return res.json().catch(() => ({}));
    },
    async update(lotId, payload) {
        const res = await authFetch(`/api/part-lots/${encodeURIComponent(lotId)}/update`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            try {
                const json = JSON.parse(text);
                let message = json.message || json.error || text;
                // Format lại message database error thành message thân thiện hơn
                if (message.includes("Duplicate entry") && message.includes("uk_partlot_serial_no")) {
                    const match = message.match(/Duplicate entry '([^']+)'/);
                    const serialNo = match ? match[1] : "";
                    message = `Số serial "${serialNo}" đã tồn tại trong hệ thống. Serial No phải unique toàn hệ thống.`;
                } else if (message.includes("Đã tồn tại PartLot") || message.includes("PartLot với partId")) {
                    // Format lại thông báo lỗi PartLot duplicate với batchNo và mfgDate
                    const batchMatch = message.match(/batchNo=([^,]+)/);
                    const mfgDateMatch = message.match(/mfgDate=([^,]+)/);
                    const batchNo = batchMatch ? batchMatch[1].trim() : "";
                    let mfgDate = mfgDateMatch ? mfgDateMatch[1].trim() : "";
                    
                    // Format lại ngày nếu có
                    if (mfgDate) {
                        try {
                            const dateObj = new Date(mfgDate);
                            if (!isNaN(dateObj.getTime())) {
                                mfgDate = dateObj.toLocaleDateString("vi-VN");
                            }
                        } catch {
                            // Giữ nguyên nếu không parse được
                        }
                    }
                    
                    if (batchNo && mfgDate) {
                        message = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}" và Ngày sản xuất "${mfgDate}". Vui lòng sử dụng Batch No hoặc Ngày sản xuất khác.`;
                    } else if (batchNo) {
                        message = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}". Vui lòng sử dụng Batch No khác.`;
                    } else if (message.includes("BatchNo phải unique")) {
                        message = "Đã tồn tại lô phụ tùng với cùng Batch No và Ngày sản xuất. Vui lòng thay đổi Batch No hoặc Ngày sản xuất.";
                    } else {
                        message = "Đã tồn tại lô phụ tùng với thông tin tương tự. Vui lòng kiểm tra lại Batch No và Ngày sản xuất.";
                    }
                } else if (message.includes("Duplicate entry") && message.includes("part_lots")) {
                    message = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                } else if (res.status === 409) {
                    // HTTP 409 Conflict - thường là duplicate entry
                    message = message || "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                }
                throw new Error(message || `HTTP ${res.status} – ${text}`);
            } catch (e) {
                if (e instanceof Error && e.message !== text) throw e;
                // Format lại message database error nếu không parse được JSON
                let errorMsg = text || "Lỗi cập nhật lô phụ tùng";
                if (text.includes("Duplicate entry") && text.includes("uk_partlot_serial_no")) {
                    const match = text.match(/Duplicate entry '([^']+)'/);
                    const serialNo = match ? match[1] : "";
                    errorMsg = `Số serial "${serialNo}" đã tồn tại trong hệ thống. Serial No phải unique toàn hệ thống.`;
                } else if (text.includes("Duplicate entry")) {
                    errorMsg = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                } else if (res.status === 409) {
                    errorMsg = "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
                }
                throw new Error(errorMsg);
            }
        }
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
    async search({ q = "", page = 0, size = 10 }) {
        const url = `/api/part-lots/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`;
        const res = await authFetch(url, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json();
    },
    async getByPart(partId) {
        const res = await authFetch(`/api/part-lots/by-part/${encodeURIComponent(partId)}/get`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text().catch(() => "")}`);
        return res.json();
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

        // Chuẩn hóa enum + fallback hợp lệ
        let category = normalizeEnum(form.category);
        let unitOfMeasure = normalizeEnum(form.unitOfMeasure);
        const unitCandidates = new Set(["PCS", "EA", "UNIT", "PIECE", "CAI", "CÁI"]);
        const knownCategories = new Set(["BATTERY", "MOTOR", "TIRE", "BRAKE", "ELECTRIC", "ACCESSORY", "OTHER"]);

        // Nếu người dùng nhập nhầm "PCS" vào Nhóm/Loại → đẩy sang Đơn vị
        if (unitCandidates.has(category) && !unitOfMeasure) {
            unitOfMeasure = category;
            category = "OTHER";
        }
        // Nếu category rỗng hoặc không nằm trong tập enum BE → gán OTHER
        if (!category || !knownCategories.has(category)) category = "OTHER";
        // Nếu đơn vị trống → gán PCS mặc định
        if (!unitOfMeasure) unitOfMeasure = "PCS";

        // Khi update (có initial): không gửi partNo (theo Swagger API)
        // Khi create: gửi partNo
        const payload = {
            ...(initial ? {} : { partNo: String(form.partNo).trim() }),
            partName: String(form.partName).trim(),
            category,
            unitOfMeasure,
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
                <TextField 
                    label="Part No" 
                    value={form.partNo} 
                    onChange={handleChange("partNo")} 
                    size="small"
                    disabled={!!initial}
                    
                />
                <TextField label="Tên phụ tùng" value={form.partName} onChange={handleChange("partName")} size="small" />
                {/* Category (enum theo BE) */}
                <TextField
                    label="Nhóm/Loại"
                    value={form.category}
                    onChange={handleChange("category")}
                    size="small"
                    select
                    SelectProps={{ native: false }}
                >
                    {[
                        "BATTERY",
                        "MOTOR",
                        "TIRE",
                        "BRAKE",
                        "ELECTRIC",
                        "ACCESSORY",
                        "OTHER",
                    ].map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                </TextField>

                {/* Đơn vị (free text) */}
                <TextField
                    label="Đơn vị"
                    value={form.unitOfMeasure}
                    onChange={handleChange("unitOfMeasure")}
                    size="small"
                    placeholder="VD: PCS, EA, UNIT…"
                />
                <TextField label="Giá (VND)" type="number" value={form.unitPrice} onChange={handleChange("unitPrice")} size="small" />
                <FormControlLabel
                    control={<Checkbox checked={!!form.isSerialized} onChange={(e) => setForm(s => ({ ...s, isSerialized: e.target.checked }))} size="small" />}
                    label="Theo dõi theo serial "
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
        mfgDate: "", // yyyy-mm-dd
        status: "RELEASED"
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
                    partName: p.partName || "",
                    isSerialized: Boolean(p.isSerialized)
                }));
                setParts(options);

                if (initial?.partId) {
                    const found = options.find(o => String(o.id) === String(initial.partId));
                    if (found) {
                        setSelectedPart(found);
                    } else {
                        // Nếu không tìm thấy trong active list (có thể part đã bị xóa), hiển thị thông báo
                        // Backend sẽ validate và reject nếu part bị xóa khi update
                        setSelectedPart({
                            id: initial.partId,
                            partNo: initial.partNo || "—",
                            partName: initial.partName || "—",
                            isSerialized: initial.isSerialized ?? false
                        });
                    }
                } else {
                    setSelectedPart(null);
                }
            } catch (err) {
                // Bỏ qua AbortError - đây là expected behavior khi component unmount
                if (err?.name === "AbortError") return;
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
            mfgDate: initial?.mfgDate ? String(initial.mfgDate).slice(0, 10) : "",
            status: initial?.status || "RELEASED"
        });
        setServerErr("");
    }, [initial, open]);

    // Clear SerialNo khi chuyển sang non-serialized (chỉ khi tạo mới, không phải update)
    React.useEffect(() => {
        if (!initial && selectedPart?.isSerialized === false) {
            setForm(s => ({ ...s, serialNo: "" }));
        }
    }, [selectedPart?.isSerialized, initial]);

    const handleChange = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

    const handleSubmit = async () => {
        // Khi update, partId luôn lấy từ initial. Khi tạo mới, lấy từ selectedPart hoặc form.partId
        const finalPartId = initial?.partId ? String(initial.partId).trim() : (selectedPart?.id ?? form.partId);
        // Lấy isSerialized từ selectedPart (khi tạo mới) hoặc từ initial (khi update, nếu có)
        const partIsSerialized = selectedPart?.isSerialized ?? initial?.isSerialized;

        // client-side validation theo logic backend
        if (!String(finalPartId).trim()) return setServerErr("Vui lòng chọn phụ tùng");
        
        // Validate SerialNo theo isSerialized
        if (partIsSerialized === true) {
            // Serialized: SerialNo bắt buộc, không được trống
            if (!form.serialNo?.trim()) return setServerErr("Serial No không được để trống cho phụ tùng serialized");
        } else if (partIsSerialized === false) {
            // Non-serialized: SerialNo phải null hoặc empty
            if (form.serialNo?.trim()) return setServerErr("Phụ tùng non-serialized không được có Serial No. Serial No phải để trống.");
        }
        // Nếu partIsSerialized === undefined (chưa chọn part), bỏ qua validation SerialNo, để backend validate
        
        // BatchNo: bắt buộc cho cả serialized và non-serialized
        if (!form.batchNo?.trim()) return setServerErr("Batch No không được để trống");
        
        // MfgDate: bắt buộc, format đúng, không được là ngày tương lai
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.mfgDate))) return setServerErr("Ngày sản xuất dạng YYYY-MM-DD");
        if (!safeDate(form.mfgDate)) return setServerErr("Ngày sản xuất không hợp lệ");
        const mfgDateObj = new Date(form.mfgDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (mfgDateObj > today) return setServerErr("Ngày sản xuất không được là ngày tương lai");

        const payload = {
            partId: String(finalPartId).trim(),
            batchNo: String(form.batchNo).trim(),
            mfgDate: String(form.mfgDate).slice(0, 10)
        };
        
        // SerialNo: nếu non-serialized thì gửi null, nếu serialized thì gửi giá trị
        if (partIsSerialized === true) {
            payload.serialNo = String(form.serialNo).trim();
        } else if (partIsSerialized === false) {
            payload.serialNo = null; // Non-serialized: SerialNo phải null
        } else {
            // Nếu chưa biết isSerialized, gửi giá trị hiện tại (backend sẽ validate)
            payload.serialNo = form.serialNo?.trim() || null;
        }
        
        // Chỉ thêm status khi update (API create không yêu cầu status)
        if (initial) {
            payload.status = String(form.status).trim();
        }

        setSubmitting(true);
        setServerErr("");
        try {
            await onSubmit(payload);
            onClose(true);
        } catch (e) {
            let errorMessage = e?.message || "Lỗi lưu dữ liệu";
            
            // Format lại thông báo lỗi PartLot duplicate với batchNo và mfgDate
            if (errorMessage.includes("Đã tồn tại PartLot") || errorMessage.includes("PartLot với partId")) {
                // Tìm batchNo và mfgDate trong message
                const batchMatch = errorMessage.match(/batchNo=([^,]+)/);
                const mfgDateMatch = errorMessage.match(/mfgDate=([^,]+)/);
                const batchNo = batchMatch ? batchMatch[1].trim() : "";
                let mfgDate = mfgDateMatch ? mfgDateMatch[1].trim() : "";
                
                // Format lại ngày nếu có
                if (mfgDate) {
                    try {
                        const dateObj = new Date(mfgDate);
                        if (!isNaN(dateObj.getTime())) {
                            mfgDate = dateObj.toLocaleDateString("vi-VN");
                        }
                    } catch {
                        // Giữ nguyên nếu không parse được
                    }
                }
                
                if (batchNo && mfgDate) {
                    errorMessage = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}" và Ngày sản xuất "${mfgDate}". Vui lòng sử dụng Batch No hoặc Ngày sản xuất khác.`;
                } else if (batchNo) {
                    errorMessage = `Đã tồn tại lô phụ tùng với Batch No "${batchNo}". Vui lòng sử dụng Batch No khác.`;
                } else if (errorMessage.includes("BatchNo phải unique")) {
                    errorMessage = "Đã tồn tại lô phụ tùng với cùng Batch No và Ngày sản xuất. Vui lòng thay đổi Batch No hoặc Ngày sản xuất.";
                } else {
                    errorMessage = "Đã tồn tại lô phụ tùng với thông tin tương tự. Vui lòng kiểm tra lại Batch No và Ngày sản xuất.";
                }
            }
            
            setServerErr(errorMessage);
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
                {/* Dropdown tìm theo Part Name / Part No - chỉ hiển thị khi tạo mới */}
                {!initial ? (
                    <Autocomplete
                        options={parts}
                        loading={partsLoading}
                        value={selectedPart}
                        onChange={(e, val) => {
                            setSelectedPart(val);
                            setForm((s) => ({ ...s, partId: val?.id ?? "" }));
                        }}
                        getOptionLabel={(o) => o?.partName || ""}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Phụ tùng"
                                size="small"
                                placeholder="Chọn phụ tùng"
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
                                <Typography noWrap>{option.partName || "—"}</Typography>
                            </li>
                        )}
                        isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                        clearOnBlur={false}
                    />
                ) : (
                    <TextField
                        label="Phụ tùng"
                        value={selectedPart?.partName || initial?.partName || "—"}
                        size="small"
                        disabled
                    />
                )}

                {/* Ẩn Part ID khỏi UI: Part ID sẽ tự gắn theo lựa chọn ở Autocomplete */}

                <TextField
                    label="Serial No"
                    value={form.serialNo}
                    onChange={handleChange("serialNo")}
                    size="small"
                    required={selectedPart?.isSerialized === true}
                    disabled={selectedPart?.isSerialized === false}
                    helperText={
                        selectedPart?.isSerialized === false 
                            ? "Phụ tùng non-serialized không được có Serial No" 
                            : "Serial No phải unique trong toàn hệ thống"
                    }
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
                {/* Chỉ hiển thị status khi update (API create không yêu cầu status) */}
                {initial && (
                    <TextField
                        select
                        label="Trạng thái"
                        value={form.status}
                        onChange={handleChange("status")}
                        size="small"
                        required
                    >
                        <MenuItem value="RELEASED">RELEASED</MenuItem>
                        <MenuItem value="HOLDING">HOLDING</MenuItem>
                        <MenuItem value="IN_USED">IN_USED</MenuItem>
                        <MenuItem value="SHIPMENT">SHIPMENT</MenuItem>
                    </TextField>
                )}
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
    const [totalCount, setTotalCount] = React.useState(0);
    const [serverPaging, setServerPaging] = React.useState(false); // true khi đang dùng API search

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

    // Dùng server search khi có từ khóa
    const searchParts = React.useCallback(async (_page = page, _size = pageSize) => {
        try {
            setLoading(true); setError("");
            const res = await partApi.search({ q, page: _page, size: _size });
            const content = Array.isArray(res?.content) ? res.content : [];
            setRows(content.map((x) => ({
                id: x.id,
                partNo: x.partNo,
                partName: x.partName,
                category: x.category,
                unitOfMeasure: x.unitOfMeasure,
                unitPrice: x.unitPrice,
                createAt: x.createAt ?? x.createdAt ?? null,
                isDelete: Boolean(x.isDelete),
                isSerialized: Boolean(x.isSerialized),
            })));
            setTotalCount(Number(res?.totalElements || content.length));
            setServerPaging(true);
        } catch (e) {
            const msg = e?.message || "Lỗi search parts";
            setError(msg);
            setSnack({ open: true, type: "error", msg });
        } finally {
            setLoading(false);
        }
    }, [q, page, pageSize]);

    // Tự động search khi có query (với debounce) hoặc loadAll khi không có query
    React.useEffect(() => {
        if (q.trim()) {
            // Debounce search để tránh gọi API quá nhiều
            const timeoutId = setTimeout(() => {
                setPage(0);
                searchParts(0, pageSize);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else {
            // Không có query thì loadAll và reset serverPaging
            setServerPaging(false);
            const ctrl = new AbortController();
            loadAll(ctrl.signal);
            return () => ctrl.abort();
        }
    }, [q, searchParts, pageSize, loadAll]);

    const pageRows = React.useMemo(() => {
        if (serverPaging) return rows; // server đã phân trang và filter
        // Client-side: chỉ sort và paginate khi không có query
        const sorted = [...rows].sort((a, b) => (Number(a.unitPrice) || 0) - (Number(b.unitPrice) || 0));
        return sorted.slice(page * pageSize, page * pageSize + pageSize);
    }, [rows, page, pageSize, serverPaging]);


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
                            placeholder="Tìm Part No / Tên / Nhóm"
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
                        count={serverPaging ? totalCount : pageRows.length + (page * pageSize)}
                        page={page}
                        onPageChange={(e, p) => { setPage(p); serverPaging ? searchParts(p, pageSize) : null; }}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(e) => { const sz = parseInt(e.target.value, 10); setPageSize(sz); setPage(0); serverPaging ? searchParts(0, sz) : null; }}
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
                content={confirm.row ? `${confirm.type === "delete" ? "Xóa" : "Khôi phục"} "${confirm.row.partNo}"` : ""}
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
    const [totalCount, setTotalCount] = React.useState(0);
    const [serverPaging, setServerPaging] = React.useState(false);

    const [openCreate, setOpenCreate] = React.useState(false);
    const [editRow, setEditRow] = React.useState(null);

    const [confirm, setConfirm] = React.useState({ open: false, type: null, row: null });
    const [confirmLoading, setConfirmLoading] = React.useState(false);

    const [activeOnly, setActiveOnly] = React.useState(false);

    const [detailRow, setDetailRow] = React.useState(null);

    // Filter by Part
    const [selectedPartId, setSelectedPartId] = React.useState(null);
    const [parts, setParts] = React.useState([]);
    const [partsLoading, setPartsLoading] = React.useState(false);

    const normalize = (list) =>
        list.map((x) => ({
            id: x.id,
            partId: x.partId,
            partNo: x.partNo ?? x.part?.partNo ?? "—",
            serialNo: x.serialNo ?? "—",
            batchNo: x.batchNo ?? "—",
            mfgDate: x.mfgDate ?? null,                 // YYYY-MM-DD
            createAt: x.createAt ?? x.createdAt ?? null,
            status: x.status || "RELEASED", // Giữ nguyên status từ API hoặc mặc định RELEASED
            isDelete: Boolean(x.isDelete), // Lưu thông tin isDelete để hiển thị nút recover
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

    // Load danh sách parts active cho dropdown filter
    const loadParts = React.useCallback(async (signal) => {
        try {
            setPartsLoading(true);
            const list = await partApi.getActives(signal);
            const options = (Array.isArray(list) ? list : []).map(p => ({
                id: p.id,
                partNo: p.partNo || "",
                partName: p.partName || ""
            }));
            setParts(options);
        } catch (err) {
            if (err?.name === "AbortError") return;
            console.error("Load parts failed:", err);
        } finally {
            setPartsLoading(false);
        }
    }, []);

    // Load part lots by partId
    const loadLotsByPart = React.useCallback(async (partId, signal) => {
        try {
            setLoading(true);
            setError("");
            const list = await lotApi.getByPart(partId);
            const normalized = Array.isArray(list) ? list : [];
            setRows(normalize(normalized));
            setTotalCount(normalized.length);
            setServerPaging(false); // Client-side pagination
            setPage(0);
            setSnack({ open: true, type: "success", msg: `Tải ${normalized.length} lô phụ tùng` });
        } catch (e) {
            if (e?.name === "AbortError") return;
            const msg = e?.message || "Lỗi tải danh sách lô phụ tùng";
            setError(msg);
            setSnack({ open: true, type: "error", msg });
        } finally {
            setLoading(false);
        }
    }, [normalize]);

    const toggleActive = async () => {
        if (activeOnly) {
            setActiveOnly(false);
            setServerPaging(false);
            await loadLots();
        } else {
            setActiveOnly(true);
            setServerPaging(false);
            await loadActiveLots();
        }
    };

    const doLotCreate = async (payload) => {
        await lotApi.create(payload);
        setSnack({ open: true, type: "success", msg: "Đã tạo lô" });
        // Reload data sau khi tạo - reload theo chế độ hiện tại
        if (selectedPartId) {
            // Đang filter by part, reload lại filter đó
            const ctrl = new AbortController();
            await loadLotsByPart(selectedPartId, ctrl.signal);
        } else if (serverPaging && q.trim()) {
            await searchLots(page, pageSize);
        } else if (activeOnly) {
            const ctrl = new AbortController();
            await loadActiveLots(ctrl.signal);
        } else {
            const ctrl = new AbortController();
            await loadLots(ctrl.signal);
        }
    };

    const doLotUpdate = async (payload) => {
        await lotApi.update(editRow.id, payload);
        setSnack({ open: true, type: "success", msg: "Đã cập nhật lô" });
        // Reload data sau khi cập nhật - reload theo chế độ hiện tại
        if (selectedPartId) {
            // Đang filter by part, reload lại filter đó
            const ctrl = new AbortController();
            await loadLotsByPart(selectedPartId, ctrl.signal);
        } else if (serverPaging && q.trim()) {
            await searchLots(page, pageSize);
        } else if (activeOnly) {
            const ctrl = new AbortController();
            await loadActiveLots(ctrl.signal);
        } else {
            const ctrl = new AbortController();
            await loadLots(ctrl.signal);
        }
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
            // Reload data sau khi xóa/khôi phục - reload theo chế độ hiện tại
            if (selectedPartId) {
                // Đang filter by part, reload lại filter đó
                const ctrl = new AbortController();
                await loadLotsByPart(selectedPartId, ctrl.signal);
            } else if (serverPaging && q.trim()) {
                // Đang ở chế độ search, reload bằng searchLots
                await searchLots(page, pageSize);
            } else if (activeOnly) {
                // Đang filter active only, reload bằng loadActiveLots
                const ctrl = new AbortController();
                await loadActiveLots(ctrl.signal);
            } else {
                // Reload tất cả
                const ctrl = new AbortController();
                await loadLots(ctrl.signal);
            }
            setConfirm({ open: false, type: null, row: null });
        } catch (e) {
            setSnack({ open: true, type: "error", msg: e?.message || "Thao tác thất bại" });
        } finally {
            setConfirmLoading(false);
        }
    };

    const searchLots = React.useCallback(async (_page = page, _size = pageSize) => {
        try {
            setLoading(true); setError("");
            const res = await lotApi.search({ q, page: _page, size: _size });
            const content = Array.isArray(res?.content) ? res.content : [];
            setRows(content.map((x) => ({
                id: x.id,
                partId: x.partId,
                partNo: x.partNo ?? x.part?.partNo ?? "—",
                partName: x.partName ?? x.part?.partName ?? x.part?.name ?? "—",
                serialNo: x.serialNo ?? "—",
                batchNo: x.batchNo ?? "—",
                mfgDate: x.mfgDate ?? null,
                createAt: x.createAt ?? x.createdAt ?? null,
                status: x.status || "RELEASED", // Giữ nguyên status từ API hoặc mặc định RELEASED
                isDelete: Boolean(x.isDelete), // Lưu thông tin isDelete để hiển thị nút recover
            })));
            setTotalCount(Number(res?.totalElements || content.length));
            setServerPaging(true);
        } catch (e) {
            const msg = e?.message || "Lỗi search lô phụ tùng";
            setError(msg);
            setSnack({ open: true, type: "error", msg });
        } finally {
            setLoading(false);
        }
    }, [q, page, pageSize]);

    // Tự động search khi có query (với debounce) hoặc loadLots khi không có query
    // Load parts khi component mount
    React.useEffect(() => {
        const ctrl = new AbortController();
        loadParts(ctrl.signal);
        return () => ctrl.abort();
    }, [loadParts]);

    // Handler khi chọn part để filter
    const handlePartChange = React.useCallback(async (partId) => {
        setSelectedPartId(partId);
        if (partId) {
            const ctrl = new AbortController();
            await loadLotsByPart(partId, ctrl.signal);
        } else {
            // Clear filter, load tất cả
            setServerPaging(false);
            const ctrl = new AbortController();
            if (activeOnly) {
                await loadActiveLots(ctrl.signal);
            } else {
                await loadLots(ctrl.signal);
            }
        }
    }, [loadLotsByPart, loadLots, loadActiveLots, activeOnly]);

    React.useEffect(() => {
        // Nếu đang filter by part, không search
        if (selectedPartId) return;
        
        if (q.trim()) {
            // Debounce search để tránh gọi API quá nhiều
            const timeoutId = setTimeout(() => {
                setPage(0);
                searchLots(0, pageSize);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else {
            // Không có query thì loadLots và reset serverPaging
            setServerPaging(false);
            const ctrl = new AbortController();
            if (activeOnly) {
                loadActiveLots(ctrl.signal);
            } else {
                loadLots(ctrl.signal);
            }
            return () => ctrl.abort();
        }
    }, [q, searchLots, pageSize, loadLots, loadActiveLots, activeOnly, selectedPartId]);

    const pageRows = React.useMemo(() => {
        if (serverPaging) return rows; // server đã phân trang và filter
        // Client-side: chỉ paginate khi không có query
        const start = page * pageSize;
        return rows.slice(start, start + pageSize);
    }, [rows, page, pageSize, serverPaging]);

    const dTitle = confirm.type === "delete" ? "Xóa lô phụ tùng?" :
        confirm.type === "recover" ? "Khôi phục lô phụ tùng?" : "";
    // Ưu tiên batchNo vì nó luôn có giá trị, sau đó serialNo, cuối cùng partNo
    const displayName = confirm.row ? (
        (confirm.row.batchNo && confirm.row.batchNo !== "—") ? confirm.row.batchNo :
        (confirm.row.serialNo && confirm.row.serialNo !== "—") ? confirm.row.serialNo :
        (confirm.row.partNo && confirm.row.partNo !== "—") ? confirm.row.partNo :
        "lô phụ tùng này"
    ) : "";
    const dText = confirm.row ? `${confirm.type === "delete" ? "Xóa" : "Khôi phục"} "${displayName}"` : "";
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
                            placeholder="Tìm Batch No / Part No"
                            size="small"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }}
                            sx={{ minWidth: 280, maxWidth: 380 }}
                        />

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                        {/* Dropdown chọn Part để filter */}
                        <Autocomplete
                            options={parts}
                            loading={partsLoading}
                            value={parts.find(p => p.id === selectedPartId) || null}
                            onChange={(e, val) => {
                                handlePartChange(val?.id || null);
                            }}
                            getOptionLabel={(o) => o ? `${o.partName}${o.partNo ? ` (${o.partNo})` : ""}` : ""}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Lọc theo phụ tùng"
                                    size="small"
                                    placeholder="Chọn phụ tùng..."
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {partsLoading ? <CircularProgress size={16} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                    sx={{ minWidth: 200 }}
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Typography noWrap>{option.partName || "—"}</Typography>
                                </li>
                            )}
                            isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                            clearOnBlur={false}
                        />

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                        <Tooltip title="Chuyển sang Quản lý Phụ tùng">
                            <span>
                                <IconButton 
                                    size="small" 
                                    onClick={onSwitch}
                                    sx={{ 
                                        height: 36, 
                                        width: 36,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        "&:hover": {
                                            borderColor: "primary.main",
                                            bgcolor: alpha("#1976d2", 0.08)
                                        }
                                    }}
                                >
                                    <Build fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Tải lại">
                            <span>
                                <IconButton 
                                    size="small" 
                                    onClick={() => { 
                                        // Clear filter và reload
                                        setSelectedPartId(null);
                                        setQ("");
                                        setServerPaging(false);
                                        const ctrl = new AbortController();
                                        if (activeOnly) {
                                            loadActiveLots(ctrl.signal);
                                        } else {
                                            loadLots(ctrl.signal);
                                        }
                                    }} 
                                    disabled={loading} 
                                    sx={{ height: 36, width: 36 }}
                                >
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
                            <PlayArrow fontSize="small" style={{ marginRight: 5 }} />
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
                                    {/* giữ nguyên colSpan hiện tại */}
                                    <RowCell colSpan={6}>
                                        <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                                            Không có dữ liệu phù hợp
                                        </Box>
                                    </RowCell>
                                </TableRow>
                            )}

                            {pageRows.map((r) => {
                                const created = fmtDate(r.createAt);
                                const statusColor = r.status === "RELEASED" ? "success" : r.status === "HOLDING" ? "warning" : r.status === "IN_USED" ? "info" : r.status === "SHIPMENT" ? "primary" : "default";
                                return (
                                    <TableRow key={r.id} hover>
                                        {/* Chỉ hiển thị Batch No, ẩn ID */}
                                        <RowCell>
                                            <Typography fontWeight={800} noWrap>{r.batchNo}</Typography>
                                        </RowCell>
                                        <RowCell><Typography noWrap>{r.partNo}</Typography></RowCell>
                                        <RowCell><Typography noWrap>{fmtDay(r.mfgDate)}</Typography></RowCell>
                                        <RowCell>
                                            <Typography fontWeight={700} sx={{ lineHeight: 1 }} noWrap>{created.time}</Typography>
                                            <Typography color="text.secondary" sx={{ lineHeight: 1.1 }} noWrap>{created.date}</Typography>
                                        </RowCell>
                                        <RowCell>
                                            <Chip label={r.status || "RELEASED"} size="small" color={statusColor} variant="filled" />
                                        </RowCell>

                                        {/* ICON ACTIONS → mở popup */}
                                        <RowCell align="right">
                                            <Tooltip title="Chi tiết">
                                                <IconButton size="small" onClick={() => setDetailRow(r)}>
                                                    <InfoOutlined fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {!r.isDelete ? (
                                                <>
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton size="small" onClick={() => setEditRow(r)}>
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
                        count={serverPaging ? totalCount : rows.length}
                        page={page}
                        onPageChange={(e, p) => { setPage(p); serverPaging ? searchLots(p, pageSize) : null; }}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(e) => { const sz = parseInt(e.target.value, 10); setPageSize(sz); setPage(0); serverPaging ? searchLots(0, sz) : null; }}
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
                            {/* Ẩn Part ID trong popup chi tiết */}
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
