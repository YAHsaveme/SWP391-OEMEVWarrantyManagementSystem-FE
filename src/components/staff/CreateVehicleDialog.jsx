import React, { useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Typography,
    Snackbar,
    Alert,
} from "@mui/material";

export default function CreateVehicleDialog({ open, onClose }) {
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
    const [formData, setFormData] = useState({
        vin: "",
        modelCode: "",
        licensePlate: "",
        color: "",
        year: currentYear,
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    const handleChange = (field) => (e) => {
        setFormData((s) => ({ ...s, [field]: e.target.value }));
    };

    const validate = () => {
        const { vin, modelCode, licensePlate, color, year } = formData;
        if (!vin || vin.length < 11) return "VIN phải có độ dài hợp lệ.";
        if (!modelCode) return "Vui lòng chọn EV Model.";
        if (!licensePlate) return "Vui lòng nhập biển số.";
        if (!color) return "Vui lòng nhập màu xe.";
        if (!year || Number.isNaN(+year) || +year < 1980 || +year > new Date().getFullYear() + 1)
            return "Năm sản xuất không hợp lệ.";
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
            // TODO: gọi API thật, ví dụ:
            // await fetch("/api/vehicles/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
            console.log("Creating vehicle:", formData);

            setToast({ open: true, message: "Vehicle registered successfully.", severity: "success" });
            onClose?.();
            // reset (tuỳ ý)
            setFormData((s) => ({ ...s, vin: "", licensePlate: "", color: "", modelCode: "" }));
        } catch (error) {
            setToast({ open: true, message: "Failed to register vehicle.", severity: "error" });
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
                                onChange={handleChange("vin")}
                                inputProps={{ style: { fontFamily: "monospace" } }}
                                required
                                fullWidth
                            />

                            <FormControl fullWidth required>
                                <InputLabel id="modelCode-label">EV Model</InputLabel>
                                <Select
                                    labelId="modelCode-label"
                                    label="EV Model"
                                    value={formData.modelCode}
                                    onChange={handleChange("modelCode")}
                                >
                                    <MenuItem value="MODEL-S-2024">Model S 2024</MenuItem>
                                    <MenuItem value="MODEL-3-2024">Model 3 2024</MenuItem>
                                    <MenuItem value="IONIQ-5-2024">IONIQ 5 2024</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="License Plate"
                                placeholder="ABC-1234"
                                value={formData.licensePlate}
                                onChange={handleChange("licensePlate")}
                                required
                                fullWidth
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Color"
                                        placeholder="Midnight Silver"
                                        value={formData.color}
                                        onChange={handleChange("color")}
                                        required
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Year"
                                        type="number"
                                        placeholder="2024"
                                        value={formData.year}
                                        onChange={handleChange("year")}
                                        required
                                        fullWidth
                                        inputProps={{ min: 1980, max: new Date().getFullYear() + 1 }}
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
