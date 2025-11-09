// src/components/staff/Appointment.jsx
// Appointment creator — compact vertical calendar + slot picker + skill-based suggestions
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    Box, Paper, Typography, Button, IconButton, Grid, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Checkbox, FormControlLabel, RadioGroup, Radio, CircularProgress, Snackbar, Alert,
    Tooltip, MenuItem, Select
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

import appointmentService from "../../services/appointmentService";
import technicianService from "../../services/technicianService";
import scheduleService from "../../services/scheduleService";
import claimService from "../../services/claimService";

import "@fontsource/poppins";

const PRIMARY = "#0284c7";
const SKILLS = [
    "HV_POWERTRAIN",
    "CHARGING",
    "LOWV_COMM",
    "MECH_SEALING",
    "SOFTWARE_FIRMWARE",
];

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => dayjs(d).format("YYYY-MM-DD");
const fmtTime = (t) => {
    if (!t && t !== 0) return "—";
    const parts = String(t).split(":");
    return `${pad(parts[0] ?? "0")}:${pad(parts[1] ?? "0")}`;
};

export default function Appointment() {
    // data
    const [claims, setClaims] = useState([]);
    // dialog
    const [open, setOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // form
    const [form, setForm] = useState({
        claimId: "",
        requiredSkills: [],
        note: "",
    });

    // calendar / slots small sizes
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [activeDate, setActiveDate] = useState(""); // YYYY-MM-DD

    // month slots per tech cache
    const [monthSlotsByTech, setMonthSlotsByTech] = useState({}); // key: `${techId}_${year}_${month}` -> {date: [slot]}
    const [suggestions, setSuggestions] = useState([]); // from appointmentService.suggestTechnicians
    const [chosenTechId, setChosenTechId] = useState("");
    const [selectedSlotKeys, setSelectedSlotKeys] = useState(new Set()); // slotId or `${date}|${startTime}`

    // UI
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

    // store created appointments to display as card(s)
    const [createdAppointments, setCreatedAppointments] = useState([]);

    // initial load claims
    useEffect(() => {
        (async () => {
            try {
                const res = await claimService.getAll();
                const arr = res?.data ?? res ?? [];
                setClaims(arr);
            } catch (err) {
                console.warn("Không tải được claims", err);
            }
        })();
    }, []);

    const showSnack = (sev, msg) => setSnack({ open: true, severity: sev, message: msg });

    // month grid helpers
    const getMonthDays = (y, m) => {
        const first = new Date(y, m, 1);
        const start = first.getDay();
        const days = [];
        for (let i = 0; i < start; i++) days.push(null);
        const total = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= total; d++) days.push(new Date(y, m, d));
        while (days.length % 7 !== 0) days.push(null);
        return days;
    };
    const daysArr = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);

    // toggle skill
    const toggleSkill = (skill) => {
        setForm(prev => {
            const s = new Set(prev.requiredSkills);
            s.has(skill) ? s.delete(skill) : s.add(skill);
            return { ...prev, requiredSkills: Array.from(s) };
        });
    };

    // load month slots for tech (cached)
    const loadMonthSlotsForTech = async (techId) => {
        if (!techId) return {};
        const key = `${techId}_${calYear}_${calMonth}`;
        if (monthSlotsByTech[key]) return monthSlotsByTech[key];
        try {
            const from = dayjs(new Date(calYear, calMonth, 1)).format("YYYY-MM-DD");
            const to = dayjs(new Date(calYear, calMonth + 1, 0)).format("YYYY-MM-DD");
            const res = await scheduleService.getTechnicianSlots(techId, from, to);
            const payload = res?.data ?? res ?? [];
            const map = {};
            if (Array.isArray(payload)) {
                if (payload.length && payload[0].workDate && Array.isArray(payload[0].slots)) {
                    payload.forEach(d => (d.slots || []).forEach(s => {
                        const dStr = d.workDate;
                        if (!map[dStr]) map[dStr] = [];
                        map[dStr].push({ slotId: s.id ?? s.slotId, startTime: s.startTime ?? s.start, endTime: s.endTime ?? s.end, status: s.status ?? "FREE" });
                    }));
                } else {
                    payload.forEach(s => {
                        const dStr = s.workDate ?? s.date ?? s.slotDate;
                        if (!dStr) return;
                        if (!map[dStr]) map[dStr] = [];
                        map[dStr].push({ slotId: s.id ?? s.slotId, startTime: s.startTime ?? s.start, endTime: s.endTime ?? s.end, status: s.status ?? "FREE" });
                    });
                }
            } else if (typeof payload === "object") {
                const daysArrRes = payload.days ?? payload.data ?? [];
                daysArrRes.forEach(d => (d.slots || []).forEach(s => {
                    const dStr = d.workDate;
                    if (!map[dStr]) map[dStr] = [];
                    map[dStr].push({ slotId: s.id ?? s.slotId, startTime: s.startTime ?? s.start, endTime: s.endTime ?? s.end, status: s.status ?? "FREE" });
                }));
            }
            Object.keys(map).forEach(k => map[k].sort((a, b) => (a.startTime > b.startTime ? 1 : -1)));
            setMonthSlotsByTech(prev => ({ ...prev, [key]: map }));
            return map;
        } catch (err) {
            console.error("loadMonthSlotsForTech err", err);
            return {};
        }
    };

    // merged slot list for active date (either from chosen tech cache or union of suggestions)
    const getMergedSlotsForActiveDate = () => {
        if (!activeDate) return [];
        if (chosenTechId) {
            const key = `${chosenTechId}_${calYear}_${calMonth}`;
            const map = monthSlotsByTech[key] || {};
            if (map[activeDate]) return map[activeDate];
        }
        const merged = [];
        suggestions.forEach(s => {
            (s.availableSlots || []).forEach(as => {
                if (as.workDate === activeDate) {
                    if (!merged.some(m => m.startTime === as.startTime)) {
                        merged.push({ slotId: as.slotId, startTime: as.startTime, endTime: as.endTime, status: as.status ?? "FREE" });
                    }
                }
            });
        });
        merged.sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
        return merged;
    };

    // toggle slot selection
    const toggleSlot = (slot) => {
        if (!activeDate) { showSnack("warning", "Chọn ngày trước."); return; }
        const key = slot.slotId ?? `${activeDate}|${slot.startTime}`;
        if (slot.status === "CANCELLED_BY_TECH" || slot.status === "BLOCKED" || slot.status === "HOLD") {
            showSnack("info", "Slot không thể chọn (bị khóa/hủy).");
            return;
        }
        setSelectedSlotKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    // call appointmentService.suggestTechnicians (single unified API)
    const suggestBySkillsDateSlots = async (manual = false) => {
        if (!form.requiredSkills.length) {
            if (manual) showSnack("warning", "Chọn ít nhất 1 kỹ năng.");
            return;
        }

        setLoadingSuggest(true);
        try {
            const allSuggestions = [];

            // Gọi API cho từng kỹ năng riêng lẻ
            for (const skill of form.requiredSkills) {
                const payload = { requiredSkill: skill, workDate: activeDate };
                const res = await appointmentService.suggestTechnicians(payload);
                const data = res?.data ?? res ?? {};
                const arr = data?.suggestions ?? (Array.isArray(data) ? data : []);
                const normalized = (Array.isArray(arr) ? arr : []).map(s => ({
                    technicianId: s.technicianId ?? s.id,
                    technicianName: s.technicianName ?? s.raw?.fullName ?? s.raw?.name ?? "Không tên",
                    skills: s.skills ?? s.raw?.skills ?? [],
                    availableSlots: Array.isArray(s.availableSlots)
                        ? s.availableSlots
                        : (s.availableSlots ? [s.availableSlots] : []),
                    score: s.score ?? 0,
                    availableCount: Array.isArray(s.availableSlots)
                        ? s.availableSlots.length
                        : 0,
                    raw: s
                }));
                allSuggestions.push(...normalized);
            }

            // Gộp trùng kỹ thuật viên (ai có nhiều kỹ năng phù hợp thì tăng matchCount)
            const merged = Object.values(
                allSuggestions.reduce((acc, s) => {
                    const id = s.technicianId;
                    if (!acc[id]) acc[id] = { ...s, matchCount: 1 };
                    else acc[id].matchCount++;
                    return acc;
                }, {})
            );

            // Sắp xếp: ai có nhiều slot -> cao hơn, sau đó theo score, sau đó matchCount
            merged.sort(
                (a, b) =>
                    b.availableCount - a.availableCount ||
                    b.score - a.score ||
                    b.matchCount - a.matchCount
            );

            setSuggestions(merged);

            showSnack("success", `Đã có ${merged.length} gợi ý kỹ thuật viên.`);

            // preload top technician slots (non-blocking)
            if (merged.length > 0) {
                loadMonthSlotsForTech(merged[0].technicianId).catch(() => { });
            } else {
                if (manual) {
                    showSnack(
                        "warning",
                        "Không có kỹ thuật viên phù hợp cho ngày/kỹ năng đã chọn."
                    );
                }
            }
        } catch (err) {
            console.error("suggest err", err);
            showSnack("error", "Gợi ý kỹ thuật viên thất bại.");
        } finally {
            setLoadingSuggest(false);
        }
    };

    // auto-run suggestion debounce when skills + date + slot selection exist
    const autoSuggestRef = useRef(null);
    useEffect(() => {
        if (form.requiredSkills.length > 0) {
            if (autoSuggestRef.current) clearTimeout(autoSuggestRef.current);
            autoSuggestRef.current = setTimeout(() => suggestBySkillsDateSlots(false), 400);
        }
        return () => { if (autoSuggestRef.current) clearTimeout(autoSuggestRef.current); };
    }, [Array.from(form.requiredSkills).join(",")]);

    // when choose suggestion
    const chooseSuggestion = async (techId) => {
        setChosenTechId(techId);
        setSelectedSlotKeys(new Set());
        await loadMonthSlotsForTech(techId);
    };

    // create appointment
    const handleCreate = async () => {
        if (!form.claimId) { showSnack("warning", "Vui lòng chọn VIN."); return; }
        if (!form.requiredSkills.length && !chosenTechId) { showSnack("warning", "Vui lòng chọn ít nhất 1 kỹ năng hoặc 1 kỹ thuật viên."); return; }
        if (selectedSlotKeys.size === 0) { showSnack("warning", "Chọn ít nhất 1 slot."); return; }

        setFormLoading(true);
        try {
            const selected = Array.from(selectedSlotKeys);
            const slotIds = selected.filter(k => !k.includes("|"));
            const manual = selected.filter(k => k.includes("|")).map(k => {
                const [d, st] = k.split("|");
                let endTime = "";
                if (chosenTechId) {
                    const key = `${chosenTechId}_${calYear}_${calMonth}`;
                    const map = monthSlotsByTech[key] || {};
                    const s = (map[d] || []).find(x => x.startTime === st);
                    if (s) endTime = s.endTime ?? "";
                }
                return { slotDate: d, startTime: st, endTime, note: "" };
            });

            const payload = {};
            if (form.claimId) payload.claimId = form.claimId;
            if (form.note) payload.note = form.note;
            if (form.requiredSkills.length) payload.requiredSkill = form.requiredSkills.join(",");
            if (chosenTechId) payload.technicianId = chosenTechId;
            if (slotIds.length) payload.slotIds = slotIds;
            if (manual.length) payload.slots = manual;

            const res = await appointmentService.create(payload);

            if (res.success) {
                showSnack("success", "Đặt lịch hẹn thành công.");
                // prepare a display object for card: prefer response data if provided
                const created = res.data ?? res ?? {};
                // fallback construct details
                const card = {
                    id: created.appointmentId ?? created.id ?? `local-${Date.now()}`,
                    technicianName: created.technicianName ?? (suggestions.find(s => s.technicianId === chosenTechId)?.technicianName) ?? "—",
                    centerName: created.centerName ?? "—",
                    requiredSkill: payload.requiredSkill ?? "—",
                    status: created.status ?? "BOOKED",
                    note: payload.note ?? "",
                    slots: created.slotIds ? (created.slotIds.map(id => ({ slotId: id }))) : (created.slotIds || manual || []).map(x => ({
                        slotDate: x.slotDate ?? activeDate,
                        startTime: x.startTime ?? "—",
                        endTime: x.endTime ?? "—",
                    })),
                    createdAt: created.createdAt ?? new Date().toISOString(),
                    claimId: payload.claimId ?? form.claimId,
                    vin: claims.find(c => c.id === payload.claimId)?.vin ?? ""
                };
                // show as created card
                setCreatedAppointments(prev => [card, ...prev].slice(0, 6)); // keep last 6
                // close dialog and reset relevant states
                setOpen(false);
                setForm({ claimId: "", requiredSkills: [], note: "" });
                setActiveDate("");
                setSelectedSlotKeys(new Set());
                setSuggestions([]);
                setChosenTechId("");
            } else {
                showSnack("error", res.message || "Đặt lịch thất bại.");
            }
        } catch (err) {
            console.error("create err", err);
            showSnack("error", "Lỗi khi gọi API tạo lịch.");
        } finally {
            setFormLoading(false);
        }
    };

    // UI renderers
    const renderCompactCalendar = () => (
        <Paper elevation={0} sx={{ p: 1, width: 280 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Button size="small" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} sx={{ minWidth: 36 }}>◀</Button>
                <Typography sx={{ fontWeight: 700, color: PRIMARY, fontSize: 13 }}>
                    {new Date(calYear, calMonth).toLocaleString("vi-VN", { month: "short", year: "numeric" })}
                </Typography>
                <Button size="small" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} sx={{ minWidth: 36 }}>▶</Button>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.75 }}>
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(x => (
                    <Box key={x} sx={{ textAlign: "center", fontWeight: 700, color: PRIMARY, fontSize: 11 }}>
                        {x}
                    </Box>
                ))}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
                {daysArr.map((d, i) => {
                    const dStr = d ? fmtDate(d) : null;
                    const isActive = dStr && dStr === activeDate;
                    const past = d && dayjs(d).isBefore(dayjs().startOf("day"));
                    const hasSlots = suggestions.some(s =>
                        (s.availableSlots || []).some(as => as.workDate === dStr)
                    );

                    return (
                        <motion.div key={i} whileHover={{ scale: d && !past ? 1.02 : 1 }}>
                            <Paper
                                onClick={() => d && !past && setActiveDate(fmtDate(d))}
                                sx={{
                                    aspectRatio: "1 / 1",
                                    borderRadius: 1.5,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: d && !past ? "pointer" : "default",
                                    backgroundColor: !d
                                        ? "transparent"
                                        : past
                                            ? "#f1f5f9"
                                            : isActive
                                                ? "#e6f6ff"
                                                : "#fff",
                                    border: isActive ? `2px solid ${PRIMARY}` : "1px solid #e5e7eb",
                                    flexDirection: "column",
                                }}
                            >
                                <Typography sx={{ fontWeight: 700, color: past ? "#9ca3af" : "#065f46", fontSize: 13 }}>
                                    {d ? d.getDate() : ""}
                                </Typography>
                                {hasSlots && <Box sx={{ fontSize: 10, color: "#6b7280" }}>●</Box>}
                            </Paper>
                        </motion.div>
                    );
                })}
            </Box>
        </Paper>
    );

    const renderSlotsPanel = () => {
        const merged = getMergedSlotsForActiveDate();
        return (
            <Paper elevation={0} sx={{ p: 1, width: 280 }}>
                <Typography sx={{ fontWeight: 700, mb: 1, color: PRIMARY }}>{activeDate || "Chọn ngày"}</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                    {merged.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>Không có slot cho ngày này.</Typography>
                    ) : merged.map((s, idx) => {
                        const key = s.slotId ?? `${activeDate}|${s.startTime}`;
                        const selected = selectedSlotKeys.has(key);
                        const disabled = s.status === "CANCELLED_BY_TECH" || s.status === "BLOCKED" || s.status === "HOLD";
                        return (
                            <Tooltip key={key} title={s.status ?? "FREE"} arrow>
                                <motion.div whileHover={{ scale: !disabled ? 1.03 : 1 }}>
                                    <Paper
                                        onClick={() => !disabled && toggleSlot(s)}
                                        sx={{
                                            p: 1.1,
                                            textAlign: "center",
                                            borderRadius: 2,
                                            cursor: !disabled ? "pointer" : "default",
                                            backgroundColor: selected ? "#e6f6ff" : "#fff",
                                            border: selected ? `2px solid ${PRIMARY}` : "1px solid #e5e7eb",
                                            minHeight: 56,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            fontWeight: 700,
                                            color: s.status === "BOOKED" ? "#065f46" : "#374151",
                                            fontSize: 13
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 13 }}>{`Slot ${idx + 1}`}</Typography>
                                        <Typography sx={{ fontSize: 13 }}>{`${fmtTime(s.startTime)} - ${fmtTime(s.endTime)}`}</Typography>
                                    </Paper>
                                </motion.div>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    return (
        <Box p={3} sx={{ fontFamily: "Poppins, sans-serif" }}>
            <Paper sx={{ p: 2, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EventAvailableIcon sx={{ color: PRIMARY }} />
                    <Typography variant="h6" fontWeight={700}>Quản lý Lịch Hẹn</Typography>
                </Box>
                <Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: PRIMARY, "&:hover": { backgroundColor: PRIMARY } }}>Tạo lịch hẹn</Button>
                </Box>
            </Paper>

            {/* CREATED appointment cards (display under the title) */}
            <Box sx={{ mb: 2 }}>
                {createdAppointments.map((c) => (
                    <motion.div key={c.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} >
                        <Paper elevation={3} sx={{ p: 2, mb: 1, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box>
                                <Typography sx={{ fontWeight: 700 }}>{c.vin || "—"} • {c.technicianName || "—"}</Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>{c.requiredSkill || "—"} • {c.centerName || ""}</Typography>
                                <Typography sx={{ mt: 1 }}>{(c.slots || []).map(s => `${s.slotDate} ${fmtTime(s.startTime)}-${fmtTime(s.endTime)}`).join("; ")}</Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                                <Typography sx={{ fontWeight: 700, color: PRIMARY }}>{c.status || "BOOKED"}</Typography>
                                <Typography variant="caption">{dayjs(c.createdAt).format("YYYY-MM-DD HH:mm")}</Typography>
                            </Box>
                        </Paper>
                    </motion.div>
                ))}
            </Box>

            {/* Create dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box>Tạo lịch hẹn</Box>
                    <IconButton onClick={() => setOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Grid container spacing={2} justifyContent="center" alignItems="flex-start">
                        <Grid item xs={12} md={5}>
                            <Typography sx={{ fontWeight: 700, mb: 1 }}>Chọn xe (VIN)</Typography>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={form.claimId}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, claimId: e.target.value }))
                                }
                            >
                                <MenuItem value="">Chưa chọn</MenuItem>
                                {claims.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.vin ?? c.plate ?? c.id}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {/* KỸ NĂNG + GỢI Ý + CALENDAR + SLOT */}
                            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {/* KỸ NĂNG */}
                                <Box>
                                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                                        Kỹ năng yêu cầu
                                    </Typography>
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                        {["HV_POWERTRAIN", "CHARGING", "LOWV_COMM", "MECH_SEALING", "SOFTWARE_FIRMWARE"].map(
                                            (skill) => (
                                                <FormControlLabel
                                                    key={skill}
                                                    control={
                                                        <Checkbox
                                                            checked={form.requiredSkills.includes(skill)}
                                                            onChange={() => toggleSkill(skill)}
                                                            sx={{ color: PRIMARY }}
                                                        />
                                                    }
                                                    label={<Typography sx={{ fontSize: 13 }}>{skill}</Typography>}
                                                />
                                            )
                                        )}
                                    </Box>
                                </Box>

                                {/* GỢI Ý KỸ THUẬT VIÊN */}
                                <Box>
                                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                                        Gợi ý kỹ thuật viên
                                    </Typography>
                                    <Box sx={{ mb: 1, display: "flex", gap: 1 }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => suggestBySkillsDateSlots(true)}
                                            disabled={
                                                loadingSuggest || form.requiredSkills.length === 0 || !activeDate
                                            }
                                        >
                                            {loadingSuggest ? (
                                                <CircularProgress size={16} />
                                            ) : (
                                                "Gợi ý kỹ thuật viên tốt nhất"
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setSuggestions([]);
                                                setChosenTechId("");
                                                setSelectedSlotKeys(new Set());
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </Box>

                                    {suggestions.length === 0 ? (
                                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                            Chưa có gợi ý — chọn kỹ năng + ngày + slot hoặc nhấn Gợi ý.
                                        </Typography>
                                    ) : (
                                        <RadioGroup
                                            value={chosenTechId}
                                            onChange={(e) => chooseSuggestion(e.target.value)}
                                        >
                                            {suggestions.map((s) => (
                                                <Paper
                                                    key={s.technicianId}
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        border: "1px solid #e5e7eb",
                                                        borderRadius: 2,
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value={s.technicianId}
                                                        control={
                                                            <Radio
                                                                sx={{
                                                                    color: PRIMARY,
                                                                    "&.Mui-checked": { color: PRIMARY },
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Box>
                                                                <Typography sx={{ fontWeight: 700 }}>
                                                                    {s.technicianName}
                                                                </Typography>
                                                                <Typography variant="caption">
                                                                    {(s.skills || []).join(", ")}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ float: "right", color: "text.secondary" }}
                                                    >
                                                        {s.availableCount} slot khả dụng
                                                    </Typography>
                                                </Paper>
                                            ))}
                                        </RadioGroup>
                                    )}
                                </Box>

                                {/* CALENDAR + SLOT */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "flex-start",
                                        justifyContent: "center",
                                        width: "100%",
                                        gap: 4, // khoảng cách giữa 2 bên
                                        overflow: "visible", // cho phép nội dung hiển thị đầy đủ
                                        mt: 2,
                                    }}
                                >
                                    {/* Calendar bên trái */}
                                    <Box
                                        sx={{
                                            flex: "0 0 45%", // chiếm khoảng 45% chiều rộng dialog
                                            display: "flex",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <motion.div
                                            key="calendar"
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -8 }}
                                            style={{ width: "100%", maxWidth: 360 }}
                                        >
                                            {renderCompactCalendar()}
                                        </motion.div>
                                    </Box>

                                    {/* Slots bên phải */}
                                    <Box
                                        sx={{
                                            flex: "0 0 50%", // phần slot rộng hơn chút
                                            display: "flex",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {chosenTechId && activeDate ? (
                                            <motion.div
                                                key="slots"
                                                initial={{ opacity: 0, x: 8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 8 }}
                                                style={{ width: "100%", maxWidth: 380 }}
                                            >
                                                {renderSlotsPanel()}
                                            </motion.div>
                                        ) : (
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    textAlign: "center",
                                                    color: "text.secondary",
                                                    border: "1px dashed #d1d5db",
                                                    borderRadius: 2,
                                                    minHeight: 120,
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    {chosenTechId
                                                        ? "Không có slot cho ngày này."
                                                        : "Chọn kỹ thuật viên để xem slot khả dụng."}
                                                </Typography>
                                            </Paper>
                                        )}
                                    </Box>
                                </Box>

                                {/* GHI CHÚ */}
                                <TextField
                                    label="Ghi chú"
                                    fullWidth
                                    multiline
                                    variant="outlined"
                                    minRows={3}
                                    maxRows={8}
                                    value={form.note}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, note: e.target.value }))
                                    }
                                    placeholder="Nhập ghi chú cho cuộc hẹn (nếu có)..."
                                    sx={{
                                        mt: 1.5,
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: 2,
                                        },
                                        "& .MuiInputBase-input": {
                                            fontSize: 14,
                                            lineHeight: 1.5,
                                        },
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={formLoading}
                        sx={{ backgroundColor: PRIMARY, "&:hover": { backgroundColor: PRIMARY } }}
                    >
                        {formLoading ? <CircularProgress size={16} /> : "Đặt lịch hẹn"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(prev => ({ ...prev, open: false }))}>
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
