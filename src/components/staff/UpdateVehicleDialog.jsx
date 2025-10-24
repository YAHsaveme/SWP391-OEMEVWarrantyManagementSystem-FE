import React, { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Typography, Snackbar, Alert,
} from "@mui/material";
import axios from "axios";

/* ====== CONFIG ====== */
const API_BASE = "http://localhost:8080";

/* ====== TOKEN HELPERS (đồng bộ với trang list) ====== */
function readRawToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        ""
    );
}
function sanitizeToken(t) {
    if (!t) return "";
    t = String(t).trim();
    if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1); // bỏ ngoặc kép
    if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim(); // bỏ "Bearer " thừa
    return t;
}
function getToken() {
    return sanitizeToken(readRawToken());
}

/* ====== DATE HELPERS ====== */
const toLocalInput = (iso) => {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch {
        return "";
    }
};
const toIso = (localStr) => {
    if (!localStr) return null;
    const d = new Date(localStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

export default function UpdateVehicleDialog({ open, onClose, vehicle, onUpdated }) {
    const [formData, setFormData] = useState({
        modelCode: "",
        model: "",
        inServiceDate: "",
        productionDate: "",
        intakeContactName: "",
        intakeContactPhone: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    /* Prefill khi open/vehicle đổi */
    useEffect(() => {
        if (vehicle) {
            setFormData({
                modelCode: vehicle.modelCode || "",
                model: vehicle.model || "",
                inServiceDate: toLocalInput(vehicle.inServiceDate),
                productionDate: toLocalInput(vehicle.productionDate),
                intakeContactName: vehicle.intakeContactName || "",
                intakeContactPhone: vehicle.intakeContactPhone || "",
            });
            setToast((t) => ({ ...t, open: false }));
        }
    }, [vehicle, open]);

    if (!vehicle) return null;

    const handleChange = (field) => (e) =>
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    const validate = () => {
        const {
            modelCode, model, inServiceDate, productionDate,
            intakeContactName, intakeContactPhone,
        } = formData;

        if (!modelCode.trim()) return "Vui lòng nhập Model Code.";
        if (!model.trim()) return "Vui lòng nhập Model.";
        if (!inServiceDate) return "Vui lòng chọn In-service date.";
        if (!productionDate) return "Vui lòng chọn Production date.";

        const inServISO = toIso(inServiceDate);
        const prodISO = toIso(productionDate);
        if (!inServISO) return "In-service date không hợp lệ.";
        if (!prodISO) return "Production date không hợp lệ.";
        if (new Date(prodISO) > new Date(inServISO))
            return "Production date không thể sau In-service date.";

        if (!intakeContactName.trim()) return "Vui lòng nhập tên người tiếp nhận.";
        const phoneOk = /^[0-9+\-()\s]{6,20}$/.test((intakeContactPhone || "").trim());
        if (!phoneOk) return "Số điện thoại không hợp lệ.";

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

            const payload = {
                // tuỳ BE có cần VIN trong body hay không; để an toàn vẫn gửi
                vin: vehicle.vin,
                modelCode: formData.modelCode.trim(),
                model: formData.model.trim(),
                inServiceDate: toIso(formData.inServiceDate),
                productionDate: toIso(formData.productionDate),
                intakeContactName: formData.intakeContactName.trim(),
                intakeContactPhone: formData.intakeContactPhone.trim(),
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
                if (String(msg).toLowerCase().includes("invalid") || String(msg).toLowerCase().includes("expired")) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("token");
                    setToast({ open: true, message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", severity: "error" });
                    return;
                }
                throw new Error(msg);
            }

            setToast({ open: true, message: "✅ Cập nhật vehicle thành công.", severity: "success" });

            // >>> QUAN TRỌNG: báo parent để refetch list NGAY
            onUpdated?.();  // parent sẽ đóng dialog + fetchVehicles()

        } catch (e2) {
            setToast({ open: true, message: `Cập nhật thất bại: ${e2.message}`, severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

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

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Model Code"
                                    value={formData.modelCode}
                                    onChange={handleChange("modelCode")}
                                    required
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Model"
                                    value={formData.model}
                                    onChange={handleChange("model")}
                                    required
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="In-service Date"
                                    type="datetime-local"
                                    value={formData.inServiceDate}
                                    onChange={handleChange("inServiceDate")}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Production Date"
                                    type="datetime-local"
                                    value={formData.productionDate}
                                    onChange={handleChange("productionDate")}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Intake Contact Name"
                                    value={formData.intakeContactName}
                                    onChange={handleChange("intakeContactName")}
                                    required
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Intake Contact Phone"
                                    value={formData.intakeContactPhone}
                                    onChange={handleChange("intakeContactPhone")}
                                    placeholder="+84 912 345 678"
                                    required
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
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
