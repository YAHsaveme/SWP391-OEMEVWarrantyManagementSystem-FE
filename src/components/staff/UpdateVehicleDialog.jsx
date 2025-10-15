import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Typography,
    Snackbar,
    Alert,
} from "@mui/material";

export default function UpdateVehicleDialog({ open, onClose, vehicle }) {
    // helpers: convert ISO -> input datetime-local and ngược lại
    const toLocalInput = (iso) => {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            // pad helper
            const p = (n) => String(n).padStart(2, "0");
            const y = d.getFullYear();
            const m = p(d.getMonth() + 1);
            const day = p(d.getDate());
            const h = p(d.getHours());
            const min = p(d.getMinutes());
            return `${y}-${m}-${day}T${h}:${min}`;
        } catch {
            return "";
        }
    };
    const toIso = (localStr) => {
        if (!localStr) return null;
        // localStr dạng "YYYY-MM-DDTHH:mm" -> ISO Z
        const d = new Date(localStr);
        return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const [formData, setFormData] = useState({
        modelCode: "",
        model: "",
        inServiceDate: "",
        productionDate: "",
        intakeContactName: "",
        intakeContactPhone: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({
        open: false,
        message: "",
        severity: "success",
    });

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
        }
    }, [vehicle]);

    if (!vehicle) return null;

    const handleChange = (field) => (e) =>
        setFormData((s) => ({ ...s, [field]: e.target.value }));

    const validate = () => {
        const {
            modelCode,
            model,
            inServiceDate,
            productionDate,
            intakeContactName,
            intakeContactPhone,
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
        // Cho phép số, khoảng trắng, dấu +, -, ()
        const phoneOk = /^[0-9+\-()\s]{6,20}$/.test(intakeContactPhone.trim());
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

        try {
            setSubmitting(true);

            const payload = {
                // server nhận path param VIN, body KHÔNG cần lặp lại vin
                modelCode: formData.modelCode.trim(),
                model: formData.model.trim(),
                inServiceDate: toIso(formData.inServiceDate),
                productionDate: toIso(formData.productionDate),
                intakeContactName: formData.intakeContactName.trim(),
                intakeContactPhone: formData.intakeContactPhone.trim(),
            };

            const res = await fetch(`/api/vehicles/update/${encodeURIComponent(vehicle.vin)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `HTTP ${res.status}`);
            }

            setToast({
                open: true,
                message: "Cập nhật vehicle thành công.",
                severity: "success",
            });
            onClose?.();
        } catch (e2) {
            setToast({
                open: true,
                message: `Cập nhật thất bại: ${e2.message}`,
                severity: "error",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
                        <Button onClick={onClose} variant="outlined">
                            Cancel
                        </Button>
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
