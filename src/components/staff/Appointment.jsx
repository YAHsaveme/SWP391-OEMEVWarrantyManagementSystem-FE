// src/components/staff/Appointment.jsx
import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, Button, IconButton, Grid, TextField, Select, MenuItem,
    FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress,
    Snackbar, Alert, Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import dayjs from "dayjs";

import appointmentService from "../../services/appointmentService";
import centerService from "../../services/centerService";
import technicianService from "../../services/technicianService";
import claimService from "../../services/claimService"; // ✅ để map VIN

const TYPE_OPTIONS = ["INSPECTION_ONLY", "REPAIR"];
const STATUS_OPTIONS = ["BOOKED", "IN_PROGRESS", "DONE", "CANCELLED"];

function statusColor(status) {
    switch (status) {
        case "BOOKED": return "info";
        case "IN_PROGRESS": return "warning";
        case "DONE": return "success";
        case "CANCELLED": return "error";
        default: return "default";
    }
}

export default function Appointment() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [centers, setCenters] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [claims, setClaims] = useState([]); // để hiển thị VIN

    const [filterStatus, setFilterStatus] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

    const [form, setForm] = useState({
        claimId: "",
        centerId: "",
        technicianId: "",
        requiredSkill: "",
        type: "INSPECTION_ONLY",
        note: "",
        slots: [{ slotDate: "", startTime: "", endTime: "", note: "" }],
    });

    // === Suggestion states (THÊM) ===
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [suggestPayload, setSuggestPayload] = useState({ requiredSkill: "", workDate: "" });
    const [suggestions, setSuggestions] = useState([]);

    // === Load all data ===
    useEffect(() => { loadData(); }, []);
    async function loadData() {
        setLoading(true);
        try {
            const [apptRes, centerRes, techRes, claimRes] = await Promise.all([
                appointmentService.getAll(),
                centerService.getAll(),
                technicianService.getAll(),
                claimService.getAll()
            ]);
            setAppointments(apptRes.data || apptRes || []);
            setCenters(centerRes.data || centerRes || []);
            // techRes might be wrapped in .data or raw
            setTechnicians(techRes.data || techRes || []);
            setClaims(claimRes.data || claimRes || []);
        } catch (err) {
            console.error(err);
            showSnack("error", "Không thể tải dữ liệu.");
        } finally { setLoading(false); }
    }

    function showSnack(sev, msg) {
        setSnack({ open: true, severity: sev, message: msg });
    }

    // === Filter by status ===
    async function handleFilterStatus() {
        if (!filterStatus) return loadData();
        setLoading(true);
        try {
            const res = await appointmentService.getByStatus(filterStatus);
            setAppointments(res.data || []);
        } catch (err) {
            console.error(err);
            showSnack("error", "Không thể lọc theo trạng thái.");
        } finally { setLoading(false); }
    }

    // === Form control ===
    function openCreate() {
        setForm({
            claimId: "",
            centerId: "",
            technicianId: "",
            requiredSkill: "",
            type: "INSPECTION_ONLY",
            note: "",
            slots: [{ slotDate: "", startTime: "", endTime: "", note: "" }],
        });
        setFormOpen(true);
    }

    function addSlotRow() {
        setForm(prev => ({ ...prev, slots: [...prev.slots, { slotDate: "", startTime: "", endTime: "", note: "" }] }));
    }

    function updateSlotRow(i, key, value) {
        setForm(prev => {
            const next = prev.slots.map((s, idx) => idx === i ? { ...s, [key]: value } : s);
            return { ...prev, slots: next };
        });
    }

    function removeSlotRow(i) {
        setForm(prev => ({ ...prev, slots: prev.slots.filter((_, idx) => idx !== i) }));
    }

    // Khi chọn trung tâm -> lọc kỹ thuật viên thuộc trung tâm đó (giữ nguyên ý bạn nhưng lấy từ technicianService)
    async function handleCenterChange(centerId) {
        setForm(prev => ({ ...prev, centerId, technicianId: "" }));
        try {
            const res = await technicianService.getAll();
            const allTechs = res.data || res || [];
            const filtered = allTechs.filter(t => t.centerId === centerId);
            setTechnicians(filtered);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleSubmit() {
        if (!form.centerId || form.slots.length === 0) {
            showSnack("warning", "Vui lòng chọn trung tâm và ít nhất một ca làm việc.");
            return;
        }
        setFormLoading(true);
        try {
            // ✅ Nếu backend yêu cầu slotIds là danh sách UUID, 
            // ta chỉ gửi ID của các slot được chọn.
            const slotIds = form.slots.map(s => s.id || s.slotId || s.slotUUID).filter(Boolean);

            // Nếu FE chưa có ID (VD: người dùng tự nhập ca làm việc thủ công)
            // => thì ta không gửi slotIds mà gửi thông tin thời gian dạng slotsDetails để backend tự xử lý.
            const payload = slotIds.length > 0
                ? {
                    claimId: form.claimId || undefined,
                    centerId: form.centerId,
                    requiredSkill: form.requiredSkill,
                    type: form.type,
                    technicianId: form.technicianId || undefined,
                    slotIds, // ✅ danh sách UUID hợp lệ
                    note: form.note
                }
                : {
                    claimId: form.claimId || undefined,
                    centerId: form.centerId,
                    requiredSkill: form.requiredSkill,
                    type: form.type,
                    technicianId: form.technicianId || undefined,
                    // ✅ gửi dạng custom cho backend tự tạo slot nếu không có ID
                    slots: form.slots.map(s => ({
                        slotDate: s.slotDate,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        note: s.note || ""
                    })),
                    note: form.note
                };

            console.log("🟢 Appointment payload gửi đi:", payload);

            const res = await appointmentService.create(payload);
            if (res.success) {
                showSnack("success", "Tạo lịch hẹn thành công.");
                setFormOpen(false);
                loadData();
                setSuggestions([]); // clear suggestion
            } else showSnack("error", res.message || "Tạo thất bại.");
        } catch (err) {
            console.error(err);
            showSnack("error", "Lỗi khi tạo lịch hẹn.");
        } finally { setFormLoading(false); }
    }

    function prettySlots(slots = []) {
        if (!Array.isArray(slots) || slots.length === 0) return "—";
        return slots.map(s => `${s.slotDate || ""} ${s.startTime || ""}-${s.endTime || ""}`).join("; ");
    }

    // === Suggest technicians (THÊM) ===
    async function handleSuggest() {
        if (!suggestPayload.requiredSkill || !suggestPayload.workDate) {
            showSnack("warning", "Vui lòng nhập kỹ năng và ngày làm việc.");
            return;
        }
        setSuggestLoading(true);
        try {
            const res = await appointmentService.suggestTechnicians(suggestPayload);
            // API may return { suggestions: [...] } under data or directly
            const sugList = res?.data?.suggestions || res?.suggestions || res?.data || res || [];
            setSuggestions(Array.isArray(sugList) ? sugList : []);
            showSnack("success", "Đã nhận gợi ý kỹ thuật viên.");
        } catch (err) {
            console.error(err);
            showSnack("error", "Gợi ý thất bại.");
        } finally { setSuggestLoading(false); }
    }

    function applySuggestion(sug) {
        // chỉ set technicianId vào form (không hiển thị ID)
        setForm(prev => ({ ...prev, technicianId: sug.technicianId || prev.technicianId, requiredSkill: prev.requiredSkill || (sug.skills && sug.skills[0]) || prev.requiredSkill }));
        showSnack("info", `Đã chọn ${sug.technicianName}`);
    }

    return (
        <Box p={3}>
            <Paper sx={{ p: 2, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EventAvailableIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Quản lý Lịch Hẹn</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Tạo lịch hẹn</Button>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>Làm mới</Button>
                </Box>
            </Paper>

            {/* Filter */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select value={filterStatus} label="Trạng thái"
                                onChange={(e) => setFilterStatus(e.target.value)}>
                                <MenuItem value="">Tất cả</MenuItem>
                                {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button variant="contained" onClick={handleFilterStatus}>Lọc</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <Paper sx={{ p: 1, boxShadow: 2, borderRadius: 2 }}>
                {loading ? (
                    <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f9fafc" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Xe (VIN)</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Trung tâm</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Kỹ thuật viên</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Kỹ năng</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Loại</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Ca làm việc</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Tạo lúc</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {appointments.length === 0 ? (
                                    <TableRow><TableCell colSpan={9} align="center">Không có dữ liệu</TableCell></TableRow>
                                ) : appointments.map((a, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell>{claims.find(c => c.id === a.claimId)?.vin || "—"}</TableCell>
                                        <TableCell>{a.centerName || "—"}</TableCell>
                                        <TableCell>{a.technicianName || "—"}</TableCell>
                                        <TableCell>{a.requiredSkill || "—"}</TableCell>
                                        <TableCell>{a.type || "—"}</TableCell>
                                        <TableCell>{prettySlots(a.slots)}</TableCell>
                                        <TableCell><Chip label={a.status} color={statusColor(a.status)} size="small" /></TableCell>
                                        <TableCell>{a.note || "—"}</TableCell>
                                        <TableCell>{dayjs(a.createdAt).format("YYYY-MM-DD HH:mm")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog form */}
            <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Tạo lịch hẹn</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Xe (VIN)</InputLabel>
                                <Select value={form.claimId} onChange={(e) => setForm({ ...form, claimId: e.target.value })}>
                                    <MenuItem value="">Chưa chọn</MenuItem>
                                    {claims.map(c => (
                                        <MenuItem key={c.id} value={c.id}>{c.vin}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Trung tâm</InputLabel>
                                <Select value={form.centerId}
                                    onChange={(e) => handleCenterChange(e.target.value)}>
                                    <MenuItem value="">Chưa chọn</MenuItem>
                                    {centers.map(c => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Kỹ thuật viên</InputLabel>
                                <Select value={form.technicianId}
                                    onChange={(e) => setForm({ ...form, technicianId: e.target.value })}>
                                    <MenuItem value="">Chưa chọn</MenuItem>
                                    {technicians.map(t => (
                                        <MenuItem key={t.id} value={t.id}>{t.fullName}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField label="Kỹ năng yêu cầu" fullWidth
                                value={form.requiredSkill}
                                onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })} />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Loại</InputLabel>
                                <Select value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField label="Ghi chú" value={form.note}
                                onChange={(e) => setForm({ ...form, note: e.target.value })} fullWidth />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Ca làm việc</Typography>
                            {form.slots.map((s, i) => (
                                <Grid container spacing={1} key={i} alignItems="center" sx={{ mb: 1 }}>
                                    <Grid item xs={3}>
                                        <TextField label="Ngày" type="date" value={s.slotDate}
                                            onChange={(e) => updateSlotRow(i, "slotDate", e.target.value)} fullWidth />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField label="Bắt đầu" type="time" value={s.startTime}
                                            onChange={(e) => updateSlotRow(i, "startTime", e.target.value)} fullWidth />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField label="Kết thúc" type="time" value={s.endTime}
                                            onChange={(e) => updateSlotRow(i, "endTime", e.target.value)} fullWidth />
                                    </Grid>
                                    <Grid item xs={1}>
                                        <Button color="error" onClick={() => removeSlotRow(i)}>X</Button>
                                    </Grid>
                                </Grid>
                            ))}
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={addSlotRow}>Thêm ca</Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFormOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={formLoading}>
                        {formLoading ? <CircularProgress size={18} /> : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Suggest Technicians (THÊM) */}
            <Paper sx={{ p: 2, mt: 3, boxShadow: 2 }}>
                <Typography variant="h6" fontWeight={700}>Gợi ý kỹ thuật viên</Typography>
                <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Grid item xs={12} md={4}>
                        <TextField label="Kỹ năng yêu cầu"
                            value={suggestPayload.requiredSkill}
                            onChange={(e) => setSuggestPayload({ ...suggestPayload, requiredSkill: e.target.value })}
                            fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField label="Ngày làm việc (YYYY-MM-DD)"
                            value={suggestPayload.workDate}
                            onChange={(e) => setSuggestPayload({ ...suggestPayload, workDate: e.target.value })}
                            fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: "flex", gap: 1 }}>
                        <Button variant="contained" onClick={handleSuggest} disabled={suggestLoading}>Gợi ý</Button>
                        <Button onClick={() => { setSuggestions([]); setSuggestPayload({ requiredSkill: "", workDate: "" }); }}>Xóa</Button>
                    </Grid>

                    {suggestLoading && (
                        <Grid item xs={12}><Box sx={{ textAlign: "center", py: 2 }}><CircularProgress /></Box></Grid>
                    )}

                    {suggestions.length > 0 && (
                        <Grid item xs={12}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Tên kỹ thuật viên</TableCell>
                                            <TableCell>Kỹ năng</TableCell>
                                            <TableCell>Số lịch</TableCell>
                                            <TableCell>Available Slots</TableCell>
                                            <TableCell>Score</TableCell>
                                            <TableCell>On Shift</TableCell>
                                            <TableCell>Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {suggestions.map((s) => (
                                            <TableRow key={s.technicianId || s.technicianName}>
                                                <TableCell>{s.technicianName}</TableCell>
                                                <TableCell>{(s.skills || []).join(", ")}</TableCell>
                                                <TableCell>{s.appointmentCount ?? "—"}</TableCell>
                                                <TableCell>{(s.availableSlots || []).slice(0, 3).map(as => `${as.workDate} ${as.startTime || ""}-${as.endTime || ""}`).join("; ") || "—"}</TableCell>
                                                <TableCell>{s.score ?? "—"}</TableCell>
                                                <TableCell>{s.isOnShift ? "✅" : "❌"}</TableCell>
                                                <TableCell><Button size="small" variant="outlined" onClick={() => applySuggestion(s)}>Chọn</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            <Snackbar open={snack.open} autoHideDuration={3000}
                onClose={() => setSnack(prev => ({ ...prev, open: false }))}>
                <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
