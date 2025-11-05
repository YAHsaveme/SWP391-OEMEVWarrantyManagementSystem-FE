// src/components/staff/Appointment.jsx
// Appointment creator — compact vertical calendar + slot picker + skill-based suggestions
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    Box, Paper, Typography, Button, IconButton, Grid, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Checkbox, FormControlLabel, RadioGroup, Radio, CircularProgress, Snackbar, Alert,
    Tooltip, MenuItem
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import dayjs from "dayjs";

import appointmentService from "../../services/appointmentService";
import scheduleService from "../../services/scheduleService";
import claimService from "../../services/claimService";

import "@fontsource/poppins";

const PRIMARY = "#0284c7";
const SKILLS = [
    "TRIAGE",
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
        if (!form.requiredSkills.length) { if (manual) showSnack("warning", "Chọn ít nhất 1 kỹ năng."); return; }
        if (!activeDate) { if (manual) showSnack("warning", "Chọn ngày trước."); return; }
        setLoadingSuggest(true);
        try {
            const payload = { requiredSkill: form.requiredSkills.join(","), workDate: activeDate };
            const res = await appointmentService.suggestTechnicians(payload);
            const data = res?.data ?? res ?? {};
            const arr = data?.suggestions ?? (Array.isArray(data) ? data : []);
            const normalized = (Array.isArray(arr) ? arr : []).map(s => ({
                technicianId: s.technicianId ?? s.id,
                technicianName: s.technicianName ?? s.raw?.fullName ?? s.raw?.name ?? "Không tên",
                skills: s.skills ?? s.raw?.skills ?? [],
                availableSlots: Array.isArray(s.availableSlots) ? s.availableSlots : (s.availableSlots ? [s.availableSlots] : []),
                score: s.score ?? 0,
                availableCount: Array.isArray(s.availableSlots) ? s.availableSlots.length : 0,
                raw: s
            }));
            normalized.sort((a, b) => (b.availableCount - a.availableCount) || (b.score - a.score));
            setSuggestions(normalized);
            showSnack("success", `Đã có ${normalized.length} gợi ý kỹ thuật viên.`);
            // optionally pre-load monthSlots for top suggestion (non-blocking)
            if (normalized.length > 0) {
                // preload top tech slots (do not auto-select)
                loadMonthSlotsForTech(normalized[0].technicianId).catch(() => { });
            } else {
                // no suggestions -> popup
                if (manual) {
                    showSnack("warning", "Không có kỹ thuật viên phù hợp cho ngày/kỹ năng đã chọn.");
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
        if (form.requiredSkills.length > 0 && activeDate && selectedSlotKeys.size > 0) {
            if (autoSuggestRef.current) clearTimeout(autoSuggestRef.current);
            autoSuggestRef.current = setTimeout(() => suggestBySkillsDateSlots(false), 450);
        }
        return () => { if (autoSuggestRef.current) clearTimeout(autoSuggestRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Array.from(form.requiredSkills).join(","), activeDate, Array.from(selectedSlotKeys).join(",")]);

    // when choose suggestion
    const chooseSuggestion = async (techId) => {
        setChosenTechId(techId);
        setSelectedSlotKeys(new Set());
        await loadMonthSlotsForTech(techId);
    };

    // create appointment
    const handleCreate = async () => {
        if (!form.claimId) { showSnack("warning", "Vui lòng chọn VIN."); return; }
        if (!chosenTechId) { showSnack("warning", "Vui lòng chọn kỹ thuật viên."); return; }
        if (selectedSlotKeys.size === 0) { showSnack("warning", "Chọn ít nhất 1 slot."); return; }

        setFormLoading(true);
        try {
            const selected = Array.from(selectedSlotKeys);
            
            // Collect slotIds from selected keys
            const slotIds = [];
            const manualSlots = [];
            
            selected.forEach(key => {
                if (key.includes("|")) {
                    // Manual format: date|startTime - need to find slotId
                    const [d, st] = key.split("|");
                    
                    // First, try to find in chosen tech's cache
                    if (chosenTechId) {
                        const techKey = `${chosenTechId}_${calYear}_${calMonth}`;
                        const map = monthSlotsByTech[techKey] || {};
                        const slot = (map[d] || []).find(x => x.startTime === st);
                        if (slot && slot.slotId) {
                            slotIds.push(slot.slotId);
                            return;
                        }
                    }
                    
                    // If not found in cache, try to find in suggestions
                    let foundSlotId = null;
                    suggestions.forEach(s => {
                        if (foundSlotId) return;
                        (s.availableSlots || []).forEach(as => {
                            if (as.workDate === d && as.startTime === st && as.slotId) {
                                foundSlotId = as.slotId;
                            }
                        });
                    });
                    
                    if (foundSlotId) {
                        slotIds.push(foundSlotId);
                    } else {
                        // Still not found - add to manual slots for later processing
                        manualSlots.push({ slotDate: d, startTime: st, endTime: "", note: "" });
                    }
                } else {
                    // Direct slotId - validate it's not empty
                    if (key && key.trim()) {
                        slotIds.push(key);
                    }
                }
            });

            // Build payload - backend requires slotIds array, not slots
            const payload = {
                claimId: form.claimId,
                technicianId: chosenTechId,
            };
            
            if (form.note) payload.note = form.note;
            if (form.requiredSkills.length) payload.requiredSkill = form.requiredSkills.join(",");
            
            // If we still have manual slots, try one more time to find slotIds
            if (manualSlots.length > 0) {
                // Try from chosen tech's cache first
                if (chosenTechId) {
                    const techKey = `${chosenTechId}_${calYear}_${calMonth}`;
                    const map = monthSlotsByTech[techKey] || {};
                    manualSlots.forEach(ms => {
                        const slot = (map[ms.slotDate] || []).find(s => s.startTime === ms.startTime);
                        if (slot && slot.slotId && !slotIds.includes(slot.slotId)) {
                            slotIds.push(slot.slotId);
                        }
                    });
                }
                
                // Also try from suggestions
                manualSlots.forEach(ms => {
                    suggestions.forEach(s => {
                        (s.availableSlots || []).forEach(as => {
                            if (as.workDate === ms.slotDate && as.startTime === ms.startTime && as.slotId) {
                                if (!slotIds.includes(as.slotId)) {
                                    slotIds.push(as.slotId);
                                }
                            }
                        });
                    });
                });
            }
            
            if (slotIds.length === 0) {
                showSnack("error", "Không thể xác định slot IDs. Vui lòng chọn lại slot.");
                setFormLoading(false);
                return;
            }
            
            payload.slotIds = slotIds;

            console.log("[Appointment] Final payload before create:", payload);
            console.log("[Appointment] Slot IDs:", slotIds);
            console.log("[Appointment] Selected slots:", Array.from(selectedSlotKeys));
            
            const res = await appointmentService.create(payload);

            if (res.success) {
                showSnack("success", "Đặt lịch hẹn thành công.");
                // prepare a display object for card: prefer response data if provided
                const created = res.data ?? res ?? {};
                const selectedTech = suggestions.find(s => s.technicianId === chosenTechId);
                const selectedClaim = claims.find(c => c.id === payload.claimId);
                
                // Get slot details from response or reconstruct from slotIds
                let slotsData = [];
                if (created.slots && Array.isArray(created.slots)) {
                    slotsData = created.slots;
                } else if (created.slotIds && Array.isArray(created.slotIds)) {
                    // If we only have slotIds, try to get details from cache
                    if (chosenTechId) {
                        const techKey = `${chosenTechId}_${calYear}_${calMonth}`;
                        const map = monthSlotsByTech[techKey] || {};
                        created.slotIds.forEach(slotId => {
                            // Search through all dates in the map
                            Object.keys(map).forEach(date => {
                                const daySlots = map[date] || [];
                                const slot = daySlots.find(s => s.slotId === slotId);
                                if (slot) {
                                    slotsData.push({
                                        slotId: slot.slotId,
                                        slotDate: date,
                                        workDate: date,
                                        startTime: slot.startTime,
                                        endTime: slot.endTime
                                    });
                                }
                            });
                        });
                    }
                    // If still no slots, create minimal entries
                    if (slotsData.length === 0) {
                        slotsData = created.slotIds.map(id => ({ slotId: id }));
                    }
                } else {
                    // Fallback: use slotIds we sent
                    slotsData = slotIds.map(id => ({ slotId: id }));
                }
                
                // fallback construct details
                const card = {
                    id: created.appointmentId ?? created.id ?? `local-${Date.now()}`,
                    technicianName: created.technicianName ?? selectedTech?.technicianName ?? "—",
                    centerName: created.centerName ?? selectedTech?.raw?.centerName ?? null,
                    requiredSkill: payload.requiredSkill ?? (form.requiredSkills.length > 0 ? form.requiredSkills.join(",") : null),
                    status: created.status ?? "BOOKED",
                    note: payload.note ?? form.note ?? "",
                    slots: slotsData,
                    createdAt: created.createdAt ?? new Date().toISOString(),
                    claimId: payload.claimId,
                    vin: created.vin ?? selectedClaim?.vin ?? ""
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
                const errorData = res.error || {};
                const errorMsg = errorData.message || res.message || errorData.error || JSON.stringify(errorData) || "Đặt lịch thất bại.";
                showSnack("error", errorMsg);
                console.error("[Appointment] Create failed - Full error:", res);
                console.error("[Appointment] Error data:", errorData);
                console.error("[Appointment] Payload that failed:", payload);
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
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <IconButton size="small" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
                    ◀
                </IconButton>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {new Date(calYear, calMonth).toLocaleString("vi-VN", { month: "long", year: "numeric" })}
                </Typography>
                <IconButton size="small" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
                    ▶
                </IconButton>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1.5 }}>
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(x => (
                    <Typography 
                        key={x} 
                        align="center" 
                        sx={{ 
                            fontWeight: 700, 
                            fontSize: "0.75rem",
                            color: "primary.main",
                            py: 0.5
                        }}
                    >
                        {x}
                    </Typography>
                ))}
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75 }}>
                {daysArr.map((d, i) => {
                    const dStr = d ? fmtDate(d) : null;
                    const isActive = dStr && dStr === activeDate;
                    const past = d && dayjs(d).isBefore(dayjs().startOf("day"));
                    const isToday = dStr === fmtDate(new Date());
                    const hasSlotsFromSuggestions = suggestions.some(s => (s.availableSlots || []).some(as => as.workDate === dStr));
                    
                    return (
                        <Paper
                            key={i}
                            onClick={() => d && !past && setActiveDate(fmtDate(d))}
                            sx={{
                                aspectRatio: "1",
                                minHeight: 40,
                                borderRadius: 1.5,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: d && !past ? "pointer" : "default",
                                backgroundColor: !d ? "transparent" : past ? "action.disabledBackground" : isActive ? "action.selected" : isToday ? "action.hover" : "background.paper",
                                border: !d ? "none" : isActive ? "2px solid" : isToday ? "2px solid" : "1px solid",
                                borderColor: isActive ? "primary.main" : isToday ? "primary.light" : "divider",
                                transition: "all .15s ease",
                                position: "relative",
                                "&:hover": d && !past ? {
                                    bgcolor: isActive ? "action.selected" : "action.hover",
                                    borderColor: "primary.main",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                    zIndex: 1
                                } : {}
                            }}
                        >
                            <Typography 
                                sx={{ 
                                    fontWeight: isActive ? 700 : 600, 
                                    fontSize: "0.85rem",
                                    color: past ? "text.disabled" : isActive ? "primary.main" : isToday ? "primary.main" : "text.primary"
                                }}
                            >
                                {d ? d.getDate() : ""}
                            </Typography>
                            {hasSlotsFromSuggestions && (
                                <Box 
                                    sx={{ 
                                        position: "absolute",
                                        bottom: 2,
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        bgcolor: "primary.main",
                                        opacity: isActive ? 1 : 0.6
                                    }} 
                                />
                            )}
                        </Paper>
                    );
                })}
            </Box>
        </Paper>
    );

    const renderSlotsPanel = () => {
        const merged = getMergedSlotsForActiveDate();
        return (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", width: "100%" }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: "0.95rem" }}>
                    {activeDate ? dayjs(activeDate).format("DD/MM/YYYY") : "Chọn ngày"}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                    {merged.length === 0 ? (
                        <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 3 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Không có slot cho ngày này
                            </Typography>
                        </Box>
                    ) : merged.map((s, idx) => {
                        const key = s.slotId ?? `${activeDate}|${s.startTime}`;
                        const selected = selectedSlotKeys.has(key);
                        const disabled = s.status === "CANCELLED_BY_TECH" || s.status === "BLOCKED" || s.status === "HOLD";
                        return (
                            <Tooltip key={key} title={s.status ?? "FREE"} arrow>
                                <Paper
                                    onClick={() => !disabled && toggleSlot(s)}
                                    sx={{
                                        p: 1.5,
                                        textAlign: "center",
                                        borderRadius: 1.5,
                                        cursor: !disabled ? "pointer" : "default",
                                        backgroundColor: selected ? "action.selected" : "background.paper",
                                        border: selected ? "2px solid" : "1px solid",
                                        borderColor: selected ? "primary.main" : "divider",
                                        minHeight: 60,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        transition: "all .15s ease",
                                        "&:hover": !disabled ? {
                                            bgcolor: selected ? "action.selected" : "action.hover",
                                            borderColor: "primary.main",
                                            transform: "translateY(-2px)",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                        } : {}
                                    }}
                                >
                                    <Typography sx={{ fontWeight: selected ? 700 : 600, fontSize: "0.8rem", mb: 0.5 }}>
                                        {fmtTime(s.startTime)} - {fmtTime(s.endTime)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                                        {s.status === "BOOKED" ? "Đã đặt" : "Trống"}
                                    </Typography>
                                </Paper>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Paper>
        );
    };

    return (
        <Box>
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 2, 
                    mb: 2, 
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center" 
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <EventAvailableIcon sx={{ color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Quản lý Lịch Hẹn</Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setOpen(true)}
                    sx={{ textTransform: "none" }}
                >
                    Tạo lịch hẹn
                </Button>
            </Paper>

            {/* CREATED appointment cards (display under the title) */}
            <Box sx={{ mb: 2 }}>
                {createdAppointments.map((c) => (
                    <Paper 
                        key={c.id} 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            mb: 1, 
                            borderRadius: 2, 
                            border: "1px solid",
                            borderColor: "divider",
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            transition: "all .15s ease",
                            "&:hover": {
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                            }
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                                {(c.vin || "—")} • {(c.technicianName || "—")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                                {(c.requiredSkill || "—")} {c.centerName ? `• ${c.centerName}` : ""}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {(c.slots || []).length > 0 
                                    ? (c.slots || []).map(s => {
                                        const date = s.slotDate || s.workDate || "";
                                        const start = fmtTime(s.startTime);
                                        const end = fmtTime(s.endTime);
                                        return date ? `${date} ${start}-${end}` : `${start}-${end}`;
                                    }).filter(Boolean).join("; ")
                                    : "Không có thông tin slot"
                                }
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                                {c.status || "BOOKED"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {dayjs(c.createdAt).format("YYYY-MM-DD HH:mm")}
                            </Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Create dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.5 }}>
                    <Box component="span" sx={{ fontWeight: 700, fontSize: "1.25rem" }}>Tạo lịch hẹn</Box>
                    <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ pt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Chọn xe (VIN)</Typography>
                                <TextField 
                                    select 
                                    fullWidth 
                                    size="small" 
                                    value={form.claimId} 
                                    onChange={(e) => setForm(prev => ({ ...prev, claimId: e.target.value }))}
                                    sx={{ borderRadius: 1 }}
                                >
                                    <MenuItem value="">Chưa chọn</MenuItem>
                                    {claims.map(c => <MenuItem key={c.id} value={c.id}>{c.vin ?? c.plate ?? c.id}</MenuItem>)}
                                </TextField>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Kỹ năng yêu cầu</Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
                                    {SKILLS.map(skill => (
                                        <FormControlLabel
                                            key={skill}
                                            control={
                                                <Checkbox 
                                                    checked={form.requiredSkills.includes(skill)} 
                                                    onChange={() => toggleSkill(skill)} 
                                                    size="small"
                                                />
                                            }
                                            label={<Typography sx={{ fontSize: "0.875rem" }}>{skill}</Typography>}
                                        />
                                    ))}
                                </Box>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                                    Chọn 1 hoặc nhiều kỹ năng → calendar sẽ hiện bên dưới.
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <TextField
                                    label="Ghi chú"
                                    fullWidth
                                    size="small"
                                    value={form.note}
                                    onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                                    multiline
                                    rows={2}
                                />
                            </Box>

                            <Box sx={{ mb: 3, display: "flex", gap: 1 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => suggestBySkillsDateSlots(true)}
                                    disabled={loadingSuggest || form.requiredSkills.length === 0 || !activeDate}
                                    size="small"
                                    sx={{ textTransform: "none" }}
                                >
                                    {loadingSuggest ? <CircularProgress size={16} /> : "Gợi ý kỹ thuật viên tốt nhất"}
                                </Button>
                                <Button 
                                    variant="outlined"
                                    onClick={() => { setSuggestions([]); setChosenTechId(""); setSelectedSlotKeys(new Set()); }}
                                    size="small"
                                    sx={{ textTransform: "none" }}
                                >
                                    Reset gợi ý
                                </Button>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Gợi ý kỹ thuật viên</Typography>
                                {suggestions.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                                        Chưa có gợi ý — chọn kỹ năng + ngày + slot (auto) hoặc nhấn Gợi ý.
                                    </Typography>
                                ) : (
                                    <RadioGroup value={chosenTechId} onChange={(e) => chooseSuggestion(e.target.value)}>
                                        {suggestions.map(s => (
                                            <Paper 
                                                key={s.technicianId} 
                                                sx={{ 
                                                    p: 1.5, 
                                                    mb: 1, 
                                                    borderRadius: 1.5,
                                                    border: "1px solid",
                                                    borderColor: chosenTechId === s.technicianId ? "primary.main" : "divider",
                                                    bgcolor: chosenTechId === s.technicianId ? "action.selected" : "background.paper",
                                                    transition: "all .15s ease"
                                                }}
                                            >
                                                <FormControlLabel 
                                                    value={s.technicianId} 
                                                    control={<Radio size="small" />} 
                                                    label={
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                                                {s.technicianName}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                                                                {(s.skills || []).join(", ")}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "primary.main", fontWeight: 500 }}>
                                                                Có {s.availableCount} slot khả dụng
                                                            </Typography>
                                                        </Box>
                                                    } 
                                                    sx={{ width: "100%", m: 0 }}
                                                />
                                            </Paper>
                                        ))}
                                    </RadioGroup>
                                )}
                            </Box>
                        </Grid>

                        {/* Right column: stacked calendar + slots */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {form.requiredSkills.length > 0 && (
                                    <Box>
                                        {renderCompactCalendar()}
                                    </Box>
                                )}

                                {activeDate && (
                                    <Box>
                                        {renderSlotsPanel()}
                                    </Box>
                                )}
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                                    Ghi chú: Sau khi chọn kỹ năng → chọn ngày → chọn slot, hệ thống sẽ tự động gợi ý kỹ thuật viên phù hợp. Bạn có thể chọn kỹ thuật viên (radio) rồi nhấn "Đặt lịch hẹn".
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleCreate} 
                        disabled={formLoading} 
                        sx={{ textTransform: "none" }}
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
