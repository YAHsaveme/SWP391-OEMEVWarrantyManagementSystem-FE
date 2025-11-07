import React, { useMemo, useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Stack,
    Snackbar, Alert, CircularProgress, InputAdornment,
    IconButton, Tooltip
} from "@mui/material";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";

import axios from "axios";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { vi } from "date-fns/locale";
import vehicleService from "../../services/vehicleService";
import eventService from "../../services/eventService";
import SearchIcon from "@mui/icons-material/Search";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

/* ====== CONFIG ====== */
const API_BASE = "http://localhost:8080";

/* ====== TOKEN HELPERS ====== */
function readRawToken() {
    return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        ""
    );
}
function sanitizeToken(t) {
    if (!t) return "";
    t = String(t).trim();
    if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
    if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim();
    return t;
}
function getToken() {
    return sanitizeToken(readRawToken());
}

/* ====== DATE HELPERS ====== */
const pad2 = (n) => String(n).padStart(2, "0");
const toIsoWithOffset = (d) => {
    if (!(d instanceof Date)) return "";
    const y = d.getFullYear();
    const M = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const h = pad2(d.getHours());
    const m = pad2(d.getMinutes());
    const s = pad2(d.getSeconds());
    const tzMin = -d.getTimezoneOffset();
    const sign = tzMin >= 0 ? "+" : "-";
    const hh = pad2(Math.floor(Math.abs(tzMin) / 60));
    const mm = pad2(Math.abs(tzMin) % 60);
    return `${y}-${M}-${day}T${h}:${m}:${s}${sign}${hh}:${mm}`;
};
const parseAnyToDate = (s) => {
    if (!s) return null;
    try {
        let x = String(s).trim()
            .replace(" ", "T")
            .replace(/(\.\d{3})\d+/, "$1");
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x)) x += ":00";
        const d = new Date(x);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

export default function CreateVehicleDialog({ open, onClose, onCreated }) {
    const nowIsoWithOffset = useMemo(() => toIsoWithOffset(new Date()), []);
    const [formData, setFormData] = useState({
        vin: "",
        modelCode: "",
        model: "",
        inServiceDate: nowIsoWithOffset,
        productionDate: nowIsoWithOffset,
        intakeContactName: "",
        intakeContactPhone: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
    const [loadingModel, setLoadingModel] = useState(false);
    const [checkingRecall, setCheckingRecall] = useState(false);
    const [modelLocked, setModelLocked] = useState(false); // Lock model sau khi lấy mẫu xe

    // ====== EV Models ======
    const [evModels, setEvModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                setModelsLoading(true);
                const token = getToken();
                const res = await axios.get(`${API_BASE}/api/ev-models/get-all`, {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : undefined,
                        Accept: "application/json",
                    },
                    validateStatus: () => true,
                });
                if (res.status >= 400 || !Array.isArray(res.data)) {
                    throw new Error(res.data?.message || "Không tải được danh sách model.");
                }
                // Filter chỉ lấy models không bị xóa
                const activeModels = res.data.filter(m => !m.isDelete && m.isDelete !== true && m.is_delete !== true);
                console.log("📦 Loaded EV Models:", activeModels.length, "active out of", res.data.length, "total");
                setEvModels(activeModels);
            } catch (e) {
                setEvModels([]);
            } finally {
                setModelsLoading(false);
            }
        })();
    }, [open]);

    const onChange = (field) => (e) => {
        const val = e.target.value;
        // Chuẩn hoá VIN: upper-case, bỏ khoảng trắng
        if (field === "vin") {
            const up = String(val || "").toUpperCase().replace(/\s+/g, "");
            setFormData((s) => ({ ...s, vin: up }));
            return;
        }
        setFormData((s) => ({ ...s, [field]: val }));
    };

    const onPickInService = (val) =>
        setFormData((s) => ({ ...s, inServiceDate: val ? toIsoWithOffset(val) : "" }));
    const onPickProduction = (val) =>
        setFormData((s) => ({ ...s, productionDate: val ? toIsoWithOffset(val) : "" }));

    const findModelName = (code) => {
        if (!code) return "";
        const hit = evModels.find(
            (m) => m.modelCode?.toLowerCase() === String(code).toLowerCase()
        );
        return hit?.modelName || hit?.name || hit?.model || "";
    };

    const handleModelCodeSelect = (_, option) => {
        const code = option?.modelCode || "";
        const name = option?.modelName || option?.name || option?.model || "";
        setFormData((s) => ({ ...s, modelCode: code, model: name || findModelName(code) }));
    };

    useEffect(() => {
        if (evModels.length && formData.modelCode && !formData.model) {
            const name = findModelName(formData.modelCode);
            if (name) setFormData((s) => ({ ...s, model: name }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evModels]);

    // ⛳ Lấy mẫu xe từ VIN (theo BE: extract VDS từ VIN → tìm model theo VDS)
    const handleGetModelFromVin = async () => {
        const vin = formData.vin?.trim().toUpperCase();
        if (!vin || vin.length !== 17) {
            setToast({ open: true, message: "VIN phải có đúng 17 ký tự.", severity: "warning" });
            return;
        }
        try {
            setLoadingModel(true);
            
            // Extract VDS từ VIN (theo BE: substring(3, 8) = chars 4-8, index 3-7)
            const vds = vin.substring(3, 8);
            if (!/^[A-Z0-9]{5}$/.test(vds)) {
                setToast({ open: true, message: "VDS trích xuất từ VIN không hợp lệ.", severity: "error" });
                return;
            }
            
            console.log("🔍 VIN:", vin);
            console.log("🔍 Extracted VDS:", vds);
            console.log("📋 Total models loaded:", evModels.length);
            console.log("📋 Available models with VDS:", evModels.map(m => ({ 
                code: m.modelCode || m.code, 
                vds: m.vds || m.VDS, 
                model: m.modelName || m.name || m.model,
                isDelete: m.isDelete || m.is_delete
            })));
            
            // Tìm model có VDS khớp (exact match trước, sau đó partial match)
            let foundModel = evModels.find((m) => {
                const modelVds = String(m.vds || m.VDS || "").toUpperCase().trim();
                const match = modelVds === vds;
                if (match) {
                    console.log("✅ Exact match found:", { modelCode: m.modelCode || m.code, modelVds, extractedVds: vds });
                }
                return match;
            });
            
            // Nếu không tìm thấy exact match, thử partial match
            if (!foundModel) {
                console.log("⚠️ No exact match, trying partial match...");
                foundModel = evModels.find((m) => {
                    const modelVds = String(m.vds || m.VDS || "").toUpperCase().trim();
                    const match = modelVds && vds && (modelVds.includes(vds) || vds.includes(modelVds));
                    if (match) {
                        console.log("✅ Partial match found:", { modelCode: m.modelCode || m.code, modelVds, extractedVds: vds });
                    }
                    return match;
                });
            }
            
            if (!foundModel) {
                console.log("❌ No match found. VDS extracted:", vds);
                console.log("Available VDS values:", evModels.map(m => m.vds || m.VDS).filter(Boolean));
            }
            
            if (foundModel) {
                setFormData((s) => ({
                    ...s,
                    modelCode: foundModel.modelCode || foundModel.code || "",
                    model: foundModel.modelName || foundModel.name || foundModel.model || "",
                }));
                setModelLocked(true);
                setToast({ 
                    open: true, 
                    message: `✅ Đã tìm thấy mẫu xe: ${foundModel.modelCode}`, 
                    severity: "success" 
                });
            } else {
                // Nếu không tìm thấy trong danh sách, thử gọi API (nếu có)
                try {
                    const modelData = await vehicleService.findEvModelByVin(vin);
                    if (modelData) {
                        setFormData((s) => ({
                            ...s,
                            modelCode: modelData.modelCode || modelData.code || "",
                            model: modelData.modelName || modelData.name || modelData.model || "",
                        }));
                        setModelLocked(true);
                        setToast({ open: true, message: "✅ Đã lấy thông tin mẫu xe từ VIN.", severity: "success" });
                    }
                } catch (apiErr) {
                    // API không tồn tại hoặc lỗi → báo không tìm thấy
                    setToast({ 
                        open: true, 
                        message: `Không tìm thấy mẫu xe với VDS: ${vds}. Vui lòng kiểm tra lại VIN hoặc thêm model mới.`, 
                        severity: "error" 
                    });
                }
            }
        } catch (err) {
            console.error("Get model from VIN failed:", err);
            setToast({ open: true, message: "Lỗi khi xử lý VIN.", severity: "error" });
        } finally {
            setLoadingModel(false);
        }
    };

    // 🔍 Check Recall theo ModelCode (theo BE: check recall theo model, không cần VIN)
    const handleCheckRecall = async () => {
        // Theo BE: check recall cần ModelCode và ProductionDate
        // Nếu chưa có modelCode, yêu cầu user "Lấy mẫu xe" trước
        if (!formData.modelCode) {
            setToast({ 
                open: true, 
                message: "Vui lòng nhấn 'Lấy mẫu xe' trước để có Model Code, sau đó mới check recall.", 
                severity: "warning" 
            });
            return;
        }
        
        // Cảnh báo nếu chưa có ProductionDate (có thể ảnh hưởng đến kết quả check)
        if (!formData.productionDate) {
            setToast({ 
                open: true, 
                message: "⚠️ Chưa có Production Date. Kết quả check recall có thể không chính xác. Vui lòng nhập Production Date trước.", 
                severity: "warning" 
            });
            // Vẫn tiếp tục check nhưng sẽ không filter theo ProductionDate
        }
        
        try {
            setCheckingRecall(true);
            
            // Lấy events theo ModelCode (theo BE: listByModelCode)
            // Nếu bị Access Denied, thử dùng getAll rồi filter client-side
            let eventsList = [];
            try {
                const allEvents = await eventService.listByModelCode(formData.modelCode.trim());
                eventsList = Array.isArray(allEvents) ? allEvents : [];
            } catch (apiErr) {
                // Nếu bị Access Denied, thử dùng getAll
                if (apiErr?.response?.status === 403 || apiErr?.response?.status === 401 || 
                    (apiErr?.response?.data?.message || "").includes("Access Denied") ||
                    (apiErr?.response?.data?.error || "").includes("Access Denied")) {
                    console.warn("⚠️ listByModelCode bị Access Denied, thử dùng getAll...");
                    try {
                        const allEvents = await eventService.getAll();
                        eventsList = Array.isArray(allEvents) ? allEvents : [];
                        // Filter client-side theo ModelCode
                        eventsList = eventsList.filter(event => {
                            if (!event.modelRanges || !Array.isArray(event.modelRanges)) return false;
                            return event.modelRanges.some(range => 
                                range.modelCode === formData.modelCode.trim()
                            );
                        });
                    } catch (getAllErr) {
                        throw apiErr; // Throw lỗi ban đầu nếu getAll cũng fail
                    }
                } else {
                    throw apiErr;
                }
            }
            
            console.log("🔍 Check Recall - ModelCode:", formData.modelCode);
            console.log("📋 Total events loaded:", eventsList.length);
            console.log("📋 All events for model:", eventsList.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                modelRanges: e.modelRanges
            })));
            console.log("📅 ProductionDate from form (raw):", formData.productionDate);
            
            // Filter: chỉ lấy RECALL events theo ModelCode và ProductionDate
            // Normalize ProductionDate giống BE (toDateOnly - set time về 00:00:00)
            let productionDate = formData.productionDate ? parseAnyToDate(formData.productionDate) : null;
            if (productionDate) {
                productionDate = new Date(productionDate);
                productionDate.setHours(0, 0, 0, 0); // Normalize như BE toDateOnly()
            }
            
            console.log("📅 ProductionDate (normalized):", productionDate?.toISOString());
            console.log("📅 ProductionDate (Date object):", productionDate);
            
            const recallEvents = eventsList.filter(event => {
                console.log(`\n🔎 Checking event: ${event.name} (${event.type})`);
                
                // 1. Chỉ lấy RECALL type (theo BE: e.getType() == EventType.RECALL)
                if (event.type !== "RECALL") {
                    console.log(`  ❌ Not RECALL type: ${event.type}`);
                    return false;
                }
                console.log(`  ✅ Is RECALL type`);
                
                // Note: BE không check startDate/endDate trong checkRecallByVin
                // Repository đã filter isDeleteFalse, nên events đã được filter sẵn
                
                // 2. Check ModelCode trong EventModelRange
                // Note: BE listByModelCode chỉ check ModelCode, KHÔNG filter theo ProductionDate
                // Chỉ khi có ProductionDate thì mới filter (giống checkRecallByVin)
                if (event.modelRanges && Array.isArray(event.modelRanges)) {
                    console.log(`  📋 ModelRanges:`, event.modelRanges.map(r => ({
                        modelCode: r.modelCode,
                        from: r.productionFrom,
                        to: r.productionTo
                    })));
                    
                    const hasModelCode = event.modelRanges.some(range => 
                        range.modelCode === formData.modelCode.trim()
                    );
                    
                    if (!hasModelCode) {
                        console.log(`  ❌ No matching ModelCode: ${formData.modelCode.trim()}`);
                        return false; // Không có ModelCode khớp
                    }
                    console.log(`  ✅ Has matching ModelCode: ${formData.modelCode.trim()}`);
                    
                    // Note: BE listByModelCode KHÔNG filter theo ProductionDate
                    // Chỉ checkRecallByVin mới filter theo ProductionDate
                    // Vì vậy trong form (check theo ModelCode), KHÔNG filter theo ProductionDate
                    // Để tránh false negative (không tìm thấy recall khi ProductionDate trong form khác với DB)
                    console.log(`  ⚠️ Check recall theo ModelCode: KHÔNG filter theo ProductionDate (giống BE listByModelCode)`);
                    console.log(`  ℹ️ ProductionDate trong form có thể khác với ProductionDate trong DB sau khi lưu`);
                    console.log(`  ℹ️ Để check chính xác, nên check recall theo VIN sau khi đăng ký xe`);
                    // Nếu không có ProductionDate, chỉ cần có ModelCode là đủ (giống listByModelCode)
                } else {
                    console.log(`  ❌ No modelRanges`);
                    return false;
                }
                
                console.log(`  ✅ Event passed all checks: ${event.name}`);
                return true;
            });
            
            console.log("✅ Applicable recall events:", recallEvents);
            
            if (recallEvents.length === 0) {
                setToast({ 
                    open: true, 
                    message: `Model "${formData.modelCode}" không thuộc chiến dịch recall nào.`, 
                    severity: "success" 
                });
            } else {
                const eventNames = recallEvents.map(e => e.name || e.title || e.code || "Recall Event").join(", ");
                setToast({ 
                    open: true, 
                    message: `⚠️ Model "${formData.modelCode}" thuộc ${recallEvents.length} chiến dịch recall: ${eventNames}`, 
                    severity: "warning" 
                });
            }
        } catch (err) {
            console.error("Check recall failed:", err);
            let msg = err?.response?.data?.message || err?.message || "Lỗi kiểm tra recall.";
            
            // Xử lý lỗi Access Denied cụ thể
            if (err?.response?.status === 403 || err?.response?.status === 401 || 
                msg.includes("Access Denied") || err?.response?.data?.error === "Access Denied") {
                msg = "Không có quyền truy cập để kiểm tra recall. Vui lòng liên hệ quản trị viên hoặc đăng nhập với quyền phù hợp.";
            }
            
            setToast({ open: true, message: msg, severity: "error" });
        } finally {
            setCheckingRecall(false);
        }
    };

    const validate = () => {
        const f = formData;
        if (!f.vin || f.vin.trim().length < 11) return "VIN phải ≥ 11 ký tự.";
        if (!f.modelCode.trim()) return "Vui lòng chọn Model Code.";
        if (modelsLoading) return "Đang tải/kiểm tra Model Code, vui lòng đợi.";
        if (!f.model) return "Model Code không hợp lệ hoặc chưa được map sang Model.";
        if (!f.inServiceDate) return "Vui lòng chọn In-service date.";
        if (!f.productionDate) return "Vui lòng chọn Production date.";

        const inServ = parseAnyToDate(f.inServiceDate);
        const prod = parseAnyToDate(f.productionDate);
        if (!inServ) return "In-service date không hợp lệ.";
        if (!prod) return "Production date không hợp lệ.";
        if (prod > inServ) return "Production date không thể sau In-service date.";

        if (!f.intakeContactName.trim()) return "Vui lòng nhập tên người tiếp nhận.";

        const phoneRaw = (f.intakeContactPhone || "").replace(/\s/g, "");
        if (!/^0\d{9,10}$/.test(phoneRaw) && !/^\+84\d{9,10}$/.test(phoneRaw) && !/^84\d{9,10}$/.test(phoneRaw)) {
            return "Số điện thoại phải là 0xxxxxxxxx (hoặc +84/84 sẽ tự chuyển về 0).";
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setToast({ open: true, message: err, severity: "error" });
            return;
        }

        let phone = (formData.intakeContactPhone || "").trim();
        if (/^\+84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(3);
        else if (/^84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(2);

        const payload = {
            vin: formData.vin.trim(),
            modelCode: formData.modelCode.trim(),
            model: formData.model.trim(),
            inServiceDate: formData.inServiceDate,
            productionDate: formData.productionDate,
            intakeContactName: formData.intakeContactName.trim(),
            intakeContactPhone: phone,
        };

        console.log("📤 Creating vehicle - Payload:", {
            ...payload,
            productionDateRaw: formData.productionDate,
            productionDateParsed: parseAnyToDate(formData.productionDate)
        });

        try {
            setSubmitting(true);
            const token = getToken();
            const res = await axios.post(`${API_BASE}/api/vehicles/create`, payload, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                validateStatus: () => true,
            });

            if (res.status >= 400) {
                console.error("❌ Create vehicle failed:", res.status, res.data);
                // Extract error message từ response
                let errorMsg = "Tạo vehicle thất bại.";
                if (typeof res.data === "string") {
                    errorMsg = res.data;
                } else if (res.data) {
                    // Thử nhiều cách extract message
                    errorMsg = res.data.message || 
                               res.data.error || 
                               res.data.msg || 
                               (res.data.details && Array.isArray(res.data.details) 
                                   ? res.data.details.map(d => d.message || d).join(", ")
                                   : null) ||
                               JSON.stringify(res.data);
                }
                
                // Xử lý các lỗi phổ biến
                if (errorMsg.includes("VIN đã tồn tại") || errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
                    errorMsg = `VIN ${formData.vin.trim()} đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.`;
                } else if (errorMsg.includes("Không tìm thấy") && errorMsg.includes("model")) {
                    errorMsg = `Model Code "${formData.modelCode}" không tồn tại. Vui lòng kiểm tra lại.`;
                }
                
                console.error("Create vehicle error:", res.status, res.data);
                setToast({ open: true, message: errorMsg, severity: "error" });
                return;
            }

            console.log("✅ Vehicle created successfully:", res.data);
            console.log("📅 ProductionDate in response:", res.data?.productionDate);
            
            setToast({ open: true, message: "✅ Vehicle created successfully.", severity: "success" });
            onCreated?.();
            onClose?.();

            const nowNext = toIsoWithOffset(new Date());
            setFormData({
                vin: "",
                modelCode: "",
                model: "",
                inServiceDate: nowNext,
                productionDate: nowNext,
                intakeContactName: "",
                intakeContactPhone: "",
            });
            setModelLocked(false); // Reset lock khi tạo thành công
        } catch {
            setToast({ open: true, message: "Failed to create vehicle.", severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // ====== STYLES ======
    const FIELD_SX = { "& .MuiInputBase-root": { minHeight: 44 } };
    const COMMON_LABEL = { sx: { whiteSpace: "nowrap" } };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit} noValidate>
                    <DialogTitle>Đăng kí VIN xe điện mới vào hệ thống.</DialogTitle>

                    {/* ✅ BỔ SUNG DialogContent */}
                    <DialogContent dividers>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Stack spacing={2.25}>
                                {/* VIN với nút Lấy mẫu xe */}
                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                    <TextField
                                        label="VIN (Vehicle Identification Number)"
                                        placeholder="1HGBH41JXMN109186"
                                        value={formData.vin}
                                        onChange={onChange("vin")}
                                        inputProps={{ 
                                            style: { fontFamily: "monospace" },
                                            maxLength: 17
                                        }}
                                        required
                                        size="small"
                                        sx={{ ...FIELD_SX, flex: 1 }}
                                        InputLabelProps={COMMON_LABEL}
                                        helperText={`${formData.vin.length}/17 ký tự`}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={handleGetModelFromVin}
                                        disabled={!formData.vin || formData.vin.length !== 17 || loadingModel}
                                        size="small"
                                        sx={{ 
                                            minWidth: 140,
                                            whiteSpace: "nowrap",
                                            height: "40px",
                                            mt: 2.5
                                        }}
                                    >
                                        {loadingModel ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                                        Lấy mẫu xe
                                    </Button>
                                </Stack>

                                {/* CÁC PHẦN DƯỚI: KÉO SANG TRÁI */}
                                <Box sx={{ ml: { xs: 0, sm: -1.5 } }}>
                                    {/* Model + Model Code */}
                                    <Grid
                                        container
                                        rowSpacing={{ xs: 2, sm: 2.5 }}
                                        columnSpacing={{ xs: 1.5, sm: 2 }}
                                        alignItems="stretch"
                                    >
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Model"
                                                value={formData.model}
                                                fullWidth
                                                required
                                                size="small"
                                                sx={FIELD_SX}
                                                InputLabelProps={COMMON_LABEL}
                                                InputProps={{ readOnly: true }}
                                                placeholder="Tự động điền từ Model Code"
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Model Code"
                                                value={formData.modelCode}
                                                fullWidth
                                                required
                                                size="small"
                                                sx={FIELD_SX}
                                                InputLabelProps={COMMON_LABEL}
                                                InputProps={{ 
                                                    readOnly: true,
                                                    endAdornment: (
                                                        <Stack direction="row" spacing={0.5} sx={{ mr: 0.5 }}>
                                                            {modelsLoading ? (
                                                                <InputAdornment position="end">
                                                                    <CircularProgress size={18} />
                                                                </InputAdornment>
                                                            ) : null}
                                                            {formData.modelCode && (
                                                                <Tooltip title="Kiểm tra Recall theo Model">
                                                                    <span>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={handleCheckRecall}
                                                                            disabled={!formData.modelCode || checkingRecall}
                                                                            color="warning"
                                                                            sx={{ 
                                                                                p: 0.75,
                                                                                "&:hover": { bgcolor: "warning.light", color: "white" }
                                                                            }}
                                                                        >
                                                                            {checkingRecall ? <CircularProgress size={18} /> : <ReportProblemIcon fontSize="small" />}
                                                                        </IconButton>
                                                                    </span>
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                    ),
                                                }}
                                                placeholder={modelLocked ? "Đã lấy từ VIN" : "Nhấn 'Lấy mẫu xe' để tự động điền"}
                                                helperText={modelLocked ? "Đã khóa sau khi lấy mẫu xe" : "Vui lòng nhấn 'Lấy mẫu xe' để tự động điền"}
                                            />
                                        </Grid>
                                    </Grid>

                                    {/* Dates */}
                                    <Grid
                                        container
                                        rowSpacing={{ xs: 2, sm: 2.5 }}
                                        columnSpacing={{ xs: 1.5, sm: 2 }}
                                        alignItems="stretch"
                                        sx={{ mt: { xs: 0.75, sm: 1 } }}
                                    >
                                        <Grid item xs={12} sm={6}>
                                            <DateTimePicker
                                                ampm={false}
                                                label="In-service Date"
                                                value={parseAnyToDate(formData.inServiceDate)}
                                                onChange={onPickInService}
                                                slotProps={{
                                                    textField: {
                                                        required: true,
                                                        fullWidth: true,
                                                        size: "small",
                                                        sx: FIELD_SX,
                                                        InputLabelProps: COMMON_LABEL,
                                                    },
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <DateTimePicker
                                                ampm={false}
                                                label="Production Date"
                                                value={parseAnyToDate(formData.productionDate)}
                                                onChange={onPickProduction}
                                                slotProps={{
                                                    textField: {
                                                        required: true,
                                                        fullWidth: true,
                                                        size: "small",
                                                        sx: FIELD_SX,
                                                        InputLabelProps: COMMON_LABEL,
                                                    },
                                                }}
                                            />
                                        </Grid>
                                    </Grid>

                                    {/* Contacts */}
                                    <Grid
                                        container
                                        rowSpacing={{ xs: 2, sm: 2.5 }}
                                        columnSpacing={{ xs: 1.5, sm: 2 }}
                                        alignItems="stretch"
                                        sx={{ mt: { xs: 0.75, sm: 1 } }}
                                    >
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Intake Contact Name"
                                                value={formData.intakeContactName}
                                                onChange={onChange("intakeContactName")}
                                                required
                                                fullWidth
                                                size="small"
                                                sx={FIELD_SX}
                                                InputLabelProps={COMMON_LABEL}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Intake Contact Phone"
                                                value={formData.intakeContactPhone}
                                                onChange={onChange("intakeContactPhone")}
                                                placeholder="0xxxxxxxxx hoặc +84xxxxxxxxx"
                                                required
                                                fullWidth
                                                size="small"
                                                sx={FIELD_SX}
                                                InputLabelProps={COMMON_LABEL}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Stack>
                        </LocalizationProvider>
                    </DialogContent>

                    {/* Actions */}
                    <DialogActions>
                        <Button onClick={onClose} variant="outlined">Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? "Registering..." : "Register Vehicle"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </>
    );
}