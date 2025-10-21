import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Box, Button, Chip, Container, Divider, Grid, InputAdornment, Paper, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
    FormControlLabel, Switch
} from "@mui/material";
import { Add, FilterList, Search } from "@mui/icons-material";

/* ================== API ================== */
const API_BASE = "http://localhost:8080";
const GET_ALL_MODELS = `${API_BASE}/api/ev-models/get-all`;
const CREATE_MODEL = `${API_BASE}/api/ev-models/create`;
const UPDATE_MODEL = (modelCode) =>
    `${API_BASE}/api/ev-models/update/${encodeURIComponent(modelCode)}`;
const DELETE_MODEL = (modelCode) =>
    `${API_BASE}/api/ev-models/delete/${encodeURIComponent(modelCode)}`;
const RECOVER_MODEL = (modelCode) =>
    `${API_BASE}/api/ev-models/recover/${encodeURIComponent(modelCode)}`;

/* ================== Helpers ================== */
const toStatus = (deleted) =>
    deleted ? { label: "Đã xoá", color: "default" } : { label: "Hoạt động", color: "success" };

export default function EvModelsManagement() {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("create"); // 'create' | 'edit'
    const [form, setForm] = useState({
        modelCode: "", model: "", battery_kWh: "", motor_kW: "",
        range_km: "", top_speed_kmh: "", abs: true,
    });
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

    const token = localStorage.getItem("token") || "";

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(GET_ALL_MODELS, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setModels(Array.isArray(res.data) ? res.data : []);
            setError("");
        } catch (e) {
            setError(e?.response?.data?.message || e.message || "Lỗi tải dữ liệu EV models");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = useMemo(() => {
        const key = q.trim().toLowerCase();
        if (!key) return models;
        return models.filter(m =>
            [m.modelCode, m.model].some(v => String(v || "").toLowerCase().includes(key))
        );
    }, [models, q]);

    const stats = useMemo(() => ({
        total: models.length,
        active: models.filter(m => !m.delete).length,
        deleted: models.filter(m => m.delete).length,
    }), [models]);

    const openCreate = () => {
        setMode("create");
        setForm({
            modelCode: "", model: "", battery_kWh: "", motor_kW: "",
            range_km: "", top_speed_kmh: "", abs: true,
        });
        setOpen(true);
    };

    const openEdit = (m) => {
        setMode("edit");
        setForm({
            modelCode: m.modelCode || "",
            model: m.model || "",
            battery_kWh: m.battery_kWh ?? "",
            motor_kW: m.motor_kW ?? "",
            range_km: m.range_km ?? "",
            top_speed_kmh: m.top_speed_kmh ?? "",
            abs: !!m.abs,
        });
        setOpen(true);
    };

    const closeDialog = () => setOpen(false);

    const onChange = (key) => (e) => {
        const value = key === "abs" ? e.target.checked : e.target.value;
        setForm((s) => ({ ...s, [key]: value }));
    };

    const validate = () => {
        if (!form.modelCode.trim()) return "Vui lòng nhập MÃ MODEL";
        if (!form.model.trim()) return "Vui lòng nhập TÊN MODEL";
        const numbers = ["battery_kWh", "motor_kW", "range_km", "top_speed_kmh"];
        for (const k of numbers) {
            const v = Number(form[k]);
            if (Number.isNaN(v) || v < 0) return `Trường ${k} phải là số không âm`;
        }
        return "";
    };

    const submit = async () => {
        const msg = validate();
        if (msg) {
            setToast({ open: true, type: "error", msg });
            return;
        }
        try {
            setBusy(true);
            if (mode === "create") {
                await axios.post(CREATE_MODEL, {
                    modelCode: form.modelCode.trim(),
                    model: form.model.trim(),
                    battery_kWh: Number(form.battery_kWh),
                    motor_kW: Number(form.motor_kW),
                    range_km: Number(form.range_km),
                    top_speed_kmh: Number(form.top_speed_kmh),
                    abs: !!form.abs,
                }, { headers: { Authorization: `Bearer ${token}` } });
                setToast({ open: true, type: "success", msg: "Tạo model thành công" });
            } else {
                // Update: gửi kèm modelCode trong body
                await axios.put(UPDATE_MODEL(form.modelCode.trim()), {
                    modelCode: form.modelCode.trim(),
                    model: form.model.trim(),
                    battery_kWh: Number(form.battery_kWh),
                    motor_kW: Number(form.motor_kW),
                    range_km: Number(form.range_km),
                    top_speed_kmh: Number(form.top_speed_kmh),
                    abs: !!form.abs,
                }, { headers: { Authorization: `Bearer ${token}` } });
                setToast({ open: true, type: "success", msg: "Cập nhật model thành công" });
            }
            closeDialog();
            await fetchData();
        } catch (e) {
            setToast({ open: true, type: "error", msg: e?.response?.data?.message || e.message });
        } finally {
            setBusy(false);
        }
    };

    // ======= Delete (soft delete) =======
    const handleDelete = async (m) => {
        const ok = window.confirm(`Xoá model "${m.model}" (${m.modelCode})?`);
        if (!ok) return;
        try {
            setBusy(true);
            await axios.delete(DELETE_MODEL(m.modelCode), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, type: "success", msg: "Đã xoá model" });
            await fetchData();
        } catch (e) {
            setToast({ open: true, type: "error", msg: e?.response?.data?.message || e.message });
        } finally {
            setBusy(false);
        }
    };

    // ======= Recover =======
    const handleRecover = async (m) => {
        try {
            setBusy(true);
            await axios.post(RECOVER_MODEL(m.modelCode), null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, type: "success", msg: "Đã khôi phục model" });
            await fetchData();
        } catch (e) {
            setToast({ open: true, type: "error", msg: e?.response?.data?.message || e.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Quản lý EV Models
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Lấy dữ liệu từ <code>/api/ev-models/get-all</code>
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent={{ md: "flex-end" }}>
                            <TextField
                                placeholder="Tìm theo mã hoặc tên model…"
                                size="small"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button variant="outlined" startIcon={<FilterList />} sx={{ borderRadius: 2 }}>
                                Lọc
                            </Button>
                            <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }} onClick={openCreate}>
                                Thêm model
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>

                <Stack direction={{ xs: "column", sm: "row" }} gap={1} mt={2}>
                    <Chip label={`Tổng: ${stats.total}`} color="primary" variant="outlined" />
                    <Chip label={`Hoạt động: ${stats.active}`} color="success" variant="outlined" />
                    <Chip label={`Đã xoá: ${stats.deleted}`} variant="outlined" />
                    {loading && <Chip label="Đang tải…" color="info" variant="outlined" />}
                    {error && <Chip label={error} color="error" />}
                </Stack>
            </Paper>

            {/* BẢNG EV MODELS */}
            <Paper elevation={0} sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="h6" fontWeight={700}>Bảng EV Models</Typography>
                </Box>
                <Divider />
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Mã model</TableCell>
                                <TableCell>Tên model</TableCell>
                                <TableCell>Pin (kWh)</TableCell>
                                <TableCell>Motor (kW)</TableCell>
                                <TableCell>Range (km)</TableCell>
                                <TableCell>Tốc độ tối đa</TableCell>
                                <TableCell>ABS</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Ngày tạo</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((m) => {
                                const st = toStatus(m.delete);
                                return (
                                    <TableRow key={m.modelCode} hover>
                                        <TableCell sx={{ fontFamily: "monospace" }}>{m.modelCode}</TableCell>
                                        <TableCell>{m.model}</TableCell>
                                        <TableCell>{m.battery_kWh}</TableCell>
                                        <TableCell>{m.motor_kW}</TableCell>
                                        <TableCell>{m.range_km}</TableCell>
                                        <TableCell>{m.top_speed_kmh}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={m.abs ? "Có" : "Không"} color={m.abs ? "success" : "default"} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={st.label} color={st.color} variant="outlined" />
                                        </TableCell>
                                        <TableCell>{m.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {!m.delete && (
                                                    <>
                                                        <Button size="small" variant="outlined" onClick={() => openEdit(m)}>Sửa</Button>
                                                        <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(m)}>
                                                            Xoá
                                                        </Button>
                                                    </>
                                                )}
                                                {m.delete && (
                                                    <Button size="small" variant="outlined" color="success" onClick={() => handleRecover(m)}>
                                                        Khôi phục
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            {/* POPUP FORM */}
            <Dialog open={open} onClose={busy ? undefined : closeDialog} fullWidth maxWidth="sm">
                <DialogTitle fontWeight={700}>{mode === "create" ? "Thêm EV Model" : "Chỉnh sửa EV Model"}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField
                            label="Mã model (modelCode)"
                            value={form.modelCode}
                            onChange={onChange("modelCode")}
                            InputProps={{ readOnly: mode === "edit" }}
                            required
                        />
                        <TextField label="Tên model" value={form.model} onChange={onChange("model")} required />
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                            <TextField label="Pin (kWh)" type="number" value={form.battery_kWh} onChange={onChange("battery_kWh")} />
                            <TextField label="Motor (kW)" type="number" value={form.motor_kW} onChange={onChange("motor_kW")} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                            <TextField label="Range (km)" type="number" value={form.range_km} onChange={onChange("range_km")} />
                            <TextField label="Tốc độ tối đa (km/h)" type="number" value={form.top_speed_kmh} onChange={onChange("top_speed_kmh")} />
                        </Stack>
                        <FormControlLabel control={<Switch checked={form.abs} onChange={onChange("abs")} />} label="ABS" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={busy}>Hủy</Button>
                    <Button onClick={submit} disabled={busy} variant="contained">
                        {mode === "create" ? "Tạo model" : "Lưu thay đổi"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(s => ({ ...s, open: false }))}>
                <Alert onClose={() => setToast(s => ({ ...s, open: false }))} severity={toast.type} variant="filled" sx={{ width: "100%" }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
}
