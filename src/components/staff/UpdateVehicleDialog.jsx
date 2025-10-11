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
    const initialYear = useMemo(() => new Date().getFullYear().toString(), []);
    const [formData, setFormData] = useState({
        licensePlate: "",
        color: "",
        year: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        if (vehicle) {
            setFormData({
                licensePlate: vehicle.licensePlate || "",
                color: vehicle.color || "",
                year:
                    (typeof vehicle.year === "number" ? vehicle.year.toString() : vehicle.year) ||
                    initialYear,
            });
        }
    }, [vehicle, initialYear]);

    if (!vehicle) return null;

    const handleChange = (field) => (e) => setFormData((s) => ({ ...s, [field]: e.target.value }));

    const validate = () => {
        const { licensePlate, color, year } = formData;
        if (!licensePlate) return "Please input License Plate.";
        if (!color) return "Please input Color.";
        const y = Number(year);
        if (!y || Number.isNaN(y) || y < 1980 || y > new Date().getFullYear() + 1)
            return "Year is invalid.";
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
            // TODO: Call API /api/vehicles/update/{vin}
            // await fetch(`/api/vehicles/update/${vehicle.vin}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(formData) });
            console.log("Updating vehicle:", vehicle?.vin, formData);
            setToast({ open: true, message: "Vehicle updated successfully.", severity: "success" });
            onClose?.();
        } catch (e2) {
            setToast({ open: true, message: "Failed to update vehicle.", severity: "error" });
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
                            Update vehicle information for VIN:{" "}
                            <Typography component="span" fontFamily="monospace" fontWeight={700}>
                                {vehicle.vin}
                            </Typography>
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label="License Plate"
                                    value={formData.licensePlate}
                                    onChange={handleChange("licensePlate")}
                                    required
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Color"
                                    value={formData.color}
                                    onChange={handleChange("color")}
                                    required
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Year"
                                    type="number"
                                    value={formData.year}
                                    onChange={handleChange("year")}
                                    required
                                    fullWidth
                                    inputProps={{ min: 1980, max: new Date().getFullYear() + 1 }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={onClose} variant="outlined">Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? "Saving..." : "Update Vehicle"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={2400}
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
