import React, { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Stack, Typography,
    Snackbar, Alert,
} from "@mui/material";
import axios from "axios";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { vi } from "date-fns/locale";

/* ====== CONFIG ====== */
const API_BASE = "http://localhost:8080";

/* ====== TOKEN HELPERS (đồng bộ với UpdateVehicleDialog) ====== */
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

/* ====== DATE HELPERS (GIỐNG UpdateVehicleDialog) ====== */
const pad2 = (n) => String(n).padStart(2, "0");

// ISO-8601 kèm offset, ví dụ: "2025-11-23T20:48:00+07:00"
const toIsoWithOffset = (d) => {
    if (!(d instanceof Date)) return "";
    const y = d.getFullYear();
    const M = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const h = pad2(d.getHours());
    const m = pad2(d.getMinutes());
    const s = pad2(d.getSeconds());
    const tzMin = -d.getTimezoneOffset(); // VN: +420
    const sign = tzMin >= 0 ? "+" : "-";
    const hh = pad2(Math.floor(Math.abs(tzMin) / 60));
    const mm = pad2(Math.abs(tzMin) % 60);
    return `${y}-${M}-${day}T${h}:${m}:${s}${sign}${hh}:${mm}`;
};

// Parse mọi dạng từ BE: "YYYY-MM-DD HH:mm:ss[.SSS][+hh:mm]" hoặc có 'T'
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
        inServiceDate: nowIsoWithOffset,    // "YYYY-MM-DDTHH:mm:ss+07:00"
        productionDate: nowIsoWithOffset,   // "YYYY-MM-DDTHH:mm:ss+07:00"
        intakeContactName: "",
        intakeContactPhone: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    const onChange = (field) => (e) =>
        setFormData((s) => ({ ...s, [field]: e.target.value }));

    // Date pickers nhận Date, state lưu chuỗi ISO có offset
    const onPickInService = (val) =>
        setFormData((s) => ({ ...s, inServiceDate: val ? toIsoWithOffset(val) : "" }));
    const onPickProduction = (val) =>
        setFormData((s) => ({ ...s, productionDate: val ? toIsoWithOffset(val) : "" }));

    const validate = () => {
        const f = formData;
        if (!f.vin || f.vin.trim().length < 11) return "VIN phải ≥ 11 ký tự.";
        if (!f.model.trim()) return "Vui lòng nhập Model.";
        if (!f.modelCode.trim()) return "Vui lòng nhập Model Code.";
        if (!f.inServiceDate) return "Vui lòng chọn In-service date.";
        if (!f.productionDate) return "Vui lòng chọn Production date.";

        const inServ = parseAnyToDate(f.inServiceDate);
        const prod = parseAnyToDate(f.productionDate);
        if (!inServ) return "In-service date không hợp lệ.";
        if (!prod) return "Production date không hợp lệ.";
        if (prod > inServ) return "Production date không thể sau In-service date.";

        if (!f.intakeContactName.trim()) return "Vui lòng nhập tên người tiếp nhận.";

        // Chuẩn theo BE: bắt đầu bằng 0, 10–11 chữ số (nếu người dùng nhập +84 sẽ chuẩn hoá trước khi gửi)
        const phoneRaw = (f.intakeContactPhone || "").replace(/\s/g, "");
        if (
            !/^0\d{9,10}$/.test(phoneRaw) &&
            !/^\+84\d{9,10}$/.test(phoneRaw) &&
            !/^84\d{9,10}$/.test(phoneRaw)
        ) {
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

        // Chuẩn hoá phone về đầu 0 cho đúng BE
        let phone = (formData.intakeContactPhone || "").trim();
        if (/^\+84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(3);
        else if (/^84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(2);

        const payload = {
            vin: formData.vin.trim(),
            modelCode: formData.modelCode.trim(),
            model: formData.model.trim(),
            inServiceDate: formData.inServiceDate,      // ISO có offset
            productionDate: formData.productionDate,    // ISO có offset
            intakeContactName: formData.intakeContactName.trim(),
            intakeContactPhone: phone,                  // 0xxxxxxxxx
        };

        try {
            setSubmitting(true);
            const token = getToken();

            const res = await axios.post(
                `${API_BASE}/api/vehicles/create`,
                payload,
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : undefined,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    validateStatus: () => true,
                }
            );

            if (res.status >= 400) {
                const msg =
                    typeof res.data === "string" ? res.data : res.data?.message || "Tạo vehicle thất bại.";
                setToast({ open: true, message: `${res.status} ${msg}`, severity: "error" });
                return;
            }

            setToast({ open: true, message: "✅ Vehicle created successfully.", severity: "success" });
            onCreated?.();
            onClose?.();

            // reset form cho lần sau
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
        } catch (error) {
            setToast({ open: true, message: "Failed to create vehicle.", severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit} noValidate>
                    <DialogTitle>Register New Vehicle</DialogTitle>

                    <DialogContent dividers>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Add a new vehicle to the service center system
                        </Typography>

                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Stack spacing={2}>
                                <TextField
                                    label="VIN (Vehicle Identification Number)"
                                    placeholder="1HGBH41JXMN109186"
                                    value={formData.vin}
                                    onChange={onChange("vin")}
                                    inputProps={{ style: { fontFamily: "monospace" } }}
                                    required
                                    fullWidth
                                />

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Model"
                                            value={formData.model}
                                            onChange={onChange("model")}
                                            required
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Model Code"
                                            value={formData.modelCode}
                                            onChange={onChange("modelCode")}
                                            required
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <DateTimePicker
                                            ampm={false} // ✅ 24h format (giống UpdateVehicleDialog)
                                            label="In-service Date"
                                            value={parseAnyToDate(formData.inServiceDate)}
                                            onChange={onPickInService}
                                            slotProps={{ textField: { required: true, fullWidth: true } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <DateTimePicker
                                            ampm={false}
                                            label="Production Date"
                                            value={parseAnyToDate(formData.productionDate)}
                                            onChange={onPickProduction}
                                            slotProps={{ textField: { required: true, fullWidth: true } }}
                                        />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Intake Contact Name"
                                            value={formData.intakeContactName}
                                            onChange={onChange("intakeContactName")}
                                            required
                                            fullWidth
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
                                        />
                                    </Grid>
                                </Grid>
                            </Stack>
                        </LocalizationProvider>
                    </DialogContent>

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
