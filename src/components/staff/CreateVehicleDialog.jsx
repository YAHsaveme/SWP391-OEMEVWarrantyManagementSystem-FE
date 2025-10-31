import React, { useMemo, useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Stack,
    Snackbar, Alert, CircularProgress, InputAdornment
} from "@mui/material";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";

import axios from "axios";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { vi } from "date-fns/locale";

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
                setEvModels(res.data);
            } catch (e) {
                setEvModels([]);
            } finally {
                setModelsLoading(false);
            }
        })();
    }, [open]);

    const onChange = (field) => (e) =>
        setFormData((s) => ({ ...s, [field]: e.target.value }));

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
                const msg = typeof res.data === "string" ? res.data : res.data?.message || "Tạo vehicle thất bại.";
                setToast({ open: true, message: `${res.status} ${msg}`, severity: "error" });
                return;
            }

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
                                {/* VIN */}
                                <TextField
                                    label="VIN (Vehicle Identification Number)"
                                    placeholder="1HGBH41JXMN109186"
                                    value={formData.vin}
                                    onChange={onChange("vin")}
                                    inputProps={{ style: { fontFamily: "monospace" } }}
                                    required
                                    fullWidth
                                    size="small"
                                    sx={FIELD_SX}
                                    InputLabelProps={COMMON_LABEL}
                                />

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
                                            <Autocomplete
                                                options={evModels}
                                                getOptionLabel={(o) => o?.modelCode || ""}
                                                isOptionEqualToValue={(o, v) => o.modelCode === v.modelCode}
                                                onChange={handleModelCodeSelect}
                                                loading={modelsLoading}
                                                disableClearable
                                                value={
                                                    evModels.find(
                                                        (m) => m.modelCode?.toLowerCase() === formData.modelCode.toLowerCase()
                                                    ) || null
                                                }
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.modelCode}>{option.modelCode}</li>
                                                )}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Model Code"
                                                        required
                                                        fullWidth
                                                        size="small"
                                                        sx={FIELD_SX}
                                                        InputLabelProps={COMMON_LABEL}
                                                        placeholder="Chọn mã model"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            readOnly: true,
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    {modelsLoading ? <CircularProgress size={18} /> : null}
                                                                    {params.InputProps.endAdornment}
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                )}
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
