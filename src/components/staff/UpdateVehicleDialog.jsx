import React, { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Typography, Snackbar, Alert,
} from "@mui/material";
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

// 👉 Trả ISO-8601 có OFFSET, ví dụ "2025-11-23T20:48:00+07:00"
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

// Parse mọi dạng từ BE: "YYYY-MM-DD HH:mm:ss[.SSS][+hh:mm]" hoặc với 'T'
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

export default function UpdateVehicleDialog({ open, onClose, vehicle, onUpdated }) {
    const [formData, setFormData] = useState({
        modelCode: "",
        model: "",
        inServiceDate: "",     // "YYYY-MM-DDTHH:mm:ss+07:00"
        productionDate: "",    // "YYYY-MM-DDTHH:mm:ss+07:00"
        intakeContactName: "",
        intakeContactPhone: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        if (vehicle) {
            const inServD = parseAnyToDate(vehicle.inServiceDate);
            const prodD = parseAnyToDate(vehicle.productionDate);
            setFormData({
                modelCode: vehicle.modelCode || "",
                model: vehicle.model || "",
                inServiceDate: inServD ? toIsoWithOffset(inServD) : "",
                productionDate: prodD ? toIsoWithOffset(prodD) : "",
                intakeContactName: vehicle.intakeContactName || "",
                intakeContactPhone: vehicle.intakeContactPhone || "",
            });
            setToast((t) => ({ ...t, open: false }));
        }
    }, [vehicle, open]);

    if (!vehicle) return null;

    const validate = () => {
        const { modelCode, model, inServiceDate, productionDate, intakeContactName, intakeContactPhone } = formData;

        if (!modelCode.trim()) return "Vui lòng nhập Model Code.";
        if (!model.trim()) return "Vui lòng nhập Model.";
        if (!inServiceDate) return "Vui lòng chọn In-service date.";
        if (!productionDate) return "Vui lòng chọn Production date.";

        const inServ = parseAnyToDate(inServiceDate);
        const prod = parseAnyToDate(productionDate);
        if (!inServ) return "In-service date không hợp lệ.";
        if (!prod) return "Production date không hợp lệ.";
        if (prod > inServ) return "Production date không thể sau In-service date.";

        if (!intakeContactName.trim()) return "Vui lòng nhập tên người tiếp nhận.";

        const phone = (intakeContactPhone || "").replace(/\s/g, "");
        if (!/^0\d{9,10}$/.test(phone)) return "Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.";

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setToast({ open: true, message: err, severity: "error" });
            return;
        }
        if (!vehicle?.vin?.trim()) {
            setToast({ open: true, message: "VIN của xe đang trống!", severity: "error" });
            return;
        }

        try {
            setSubmitting(true);

            // Chuẩn hoá phone về 0xxxxxxxxx (nếu người dùng nhập +84/84…)
            let phone = (formData.intakeContactPhone || "").trim();
            if (/^\+84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(3);
            else if (/^84\d{9,10}$/.test(phone)) phone = "0" + phone.slice(2);

            const payload = {
                vin: vehicle.vin,
                modelCode: formData.modelCode.trim(),
                model: formData.model.trim(),
                inServiceDate: formData.inServiceDate,     // ISO có offset, ví dụ "...T20:48:00+07:00"
                productionDate: formData.productionDate,   // ISO có offset
                intakeContactName: formData.intakeContactName.trim(),
                intakeContactPhone: phone,
            };

            const token = getToken();
            const res = await axios.put(
                `${API_BASE}/api/vehicles/update/${encodeURIComponent(vehicle.vin)}`,
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
                const msg = typeof res.data === "string" ? res.data : res.data?.message || `HTTP ${res.status}`;
                throw new Error(msg);
            }

            setToast({ open: true, message: "✅ Cập nhật vehicle thành công.", severity: "success" });
            onUpdated?.();
            onClose?.();
        } catch (e2) {
            setToast({ open: true, message: `Cập nhật thất bại: ${e2.message}`, severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // Picker nhận Date, state lưu chuỗi ISO có offset
    const onPickInService = (val) =>
        setFormData((s) => ({ ...s, inServiceDate: val ? toIsoWithOffset(val) : "" }));
    const onPickProduction = (val) =>
        setFormData((s) => ({ ...s, productionDate: val ? toIsoWithOffset(val) : "" }));

    return (
        <>
            <Dialog open={open} onClose={() => !submitting && onClose?.()} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit} noValidate>
                    <DialogTitle>Update Vehicle</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            VIN:&nbsp;
                            <Typography component="span" fontFamily="monospace" fontWeight={700}>
                                {vehicle.vin}
                            </Typography>
                        </Typography>

                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Model Code"
                                        value={formData.modelCode}
                                        onChange={(e) => setFormData((s) => ({ ...s, modelCode: e.target.value }))}
                                        required fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Model"
                                        value={formData.model}
                                        onChange={(e) => setFormData((s) => ({ ...s, model: e.target.value }))}
                                        required fullWidth
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <DateTimePicker
                                        ampm={false}
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

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Intake Contact Name"
                                        value={formData.intakeContactName}
                                        onChange={(e) =>
                                            setFormData((s) => ({ ...s, intakeContactName: e.target.value }))
                                        }
                                        required fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Intake Contact Phone"
                                        value={formData.intakeContactPhone}
                                        onChange={(e) =>
                                            setFormData((s) => ({ ...s, intakeContactPhone: e.target.value }))
                                        }
                                        placeholder="0909xxxxxx"
                                        required fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </LocalizationProvider>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={onClose} variant="outlined" disabled={submitting}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? "Saving..." : "Update Vehicle"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={2600}
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
