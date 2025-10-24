import React, { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Stack, Typography,
    Snackbar, Alert,
} from "@mui/material";
import axios from "axios";

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

/* ---------- helper ---------- */
function toLocalDatetimeInput(date) {
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    // format dành cho <input type="datetime-local">
    return `${y}-${m}-${d}T${hh}:${mm}`;
}

export default function CreateVehicleDialog({ open, onClose, onCreated }) {
    // default datetime-local = now
    const nowLocal = useMemo(() => toLocalDatetimeInput(new Date()), []);
    const [formData, setFormData] = useState({
        vin: "",
        modelCode: "",
        model: "",
        inServiceDate: nowLocal,      // datetime-local for input
        productionDate: nowLocal,     // datetime-local for input
        intakeContactName: "",
        intakeContactPhone: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    const onChange = (field) => (e) => setFormData((s) => ({ ...s, [field]: e.target.value }));

    const validate = () => {
        const f = formData;
        if (!f.vin || f.vin.trim().length < 11) return "VIN phải ≥ 11 ký tự.";
        if (!f.model) return "Vui lòng nhập Model.";
        if (!f.modelCode) return "Vui lòng nhập Model Code.";
        if (!f.inServiceDate) return "Vui lòng chọn In Service Date.";
        if (!f.productionDate) return "Vui lòng chọn Production Date.";
        // Production phải TRƯỚC hoặc BẰNG In Service
        if (new Date(f.productionDate) > new Date(f.inServiceDate))
            return "Production Date không được sau In Service Date.";
        if (!f.intakeContactName) return "Vui lòng nhập tên người tiếp nhận.";
        if (!f.intakeContactPhone || f.intakeContactPhone.trim().length < 8)
            return "Số điện thoại người tiếp nhận không hợp lệ.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setToast({ open: true, message: err, severity: "error" });
            return;
        }

        // chuẩn payload đúng schema BE
        const payload = {
            vin: formData.vin.trim(),
            modelCode: formData.modelCode.trim(),
            model: formData.model.trim(),
            inServiceDate: new Date(formData.inServiceDate).toISOString(),
            productionDate: new Date(formData.productionDate).toISOString(),
            intakeContactName: formData.intakeContactName.trim(),
            intakeContactPhone: formData.intakeContactPhone.trim(),
        };

        try {
            setSubmitting(true);
            const token = getToken(); // dùng token đã sanitize

            const res = await axios.post(
                "http://localhost:8080/api/vehicles/create",
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
                const msg = typeof res.data === "string" ? res.data : res.data?.message || "Tạo vehicle thất bại.";
                if (String(msg).toLowerCase().includes("invalid") || String(msg).toLowerCase().includes("expired")) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("token");
                    setToast({ open: true, message: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", severity: "error" });
                    return;
                }
                setToast({ open: true, message: `${res.status} ${msg}`, severity: "error" });
                return;
            }

            // Thành công
            setToast({ open: true, message: "✅ Vehicle created successfully.", severity: "success" });

            // >>> QUAN TRỌNG: báo parent để refetch list ngay
            onCreated?.();

            // reset form (để nhập tiếp lần sau)
            setFormData({
                vin: "",
                modelCode: "",
                model: "",
                inServiceDate: toLocalDatetimeInput(new Date()),
                productionDate: toLocalDatetimeInput(new Date()),
                intakeContactName: "",
                intakeContactPhone: "",
            });

            // đóng dialog
            onClose?.();
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
                                        placeholder="IONIQ 5 / Model 3 ..."
                                        value={formData.model}
                                        onChange={onChange("model")}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Model Code"
                                        placeholder="IONIQ-5-2024 / MODEL-3-2024 ..."
                                        value={formData.modelCode}
                                        onChange={onChange("modelCode")}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="In Service Date"
                                        type="datetime-local"
                                        value={formData.inServiceDate}
                                        onChange={onChange("inServiceDate")}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Production Date"
                                        type="datetime-local"
                                        value={formData.productionDate}
                                        onChange={onChange("productionDate")}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                            </Grid>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Intake Contact Name"
                                        placeholder="Nguyễn Văn A"
                                        value={formData.intakeContactName}
                                        onChange={onChange("intakeContactName")}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Intake Contact Phone"
                                        placeholder="0987 654 321"
                                        value={formData.intakeContactPhone}
                                        onChange={onChange("intakeContactPhone")}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
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
