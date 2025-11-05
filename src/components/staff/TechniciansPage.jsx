// src/components/admin/TechniciansPage.jsx
// Final — VIP PRO (updated): Poppins + Motion + MUI v5
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box, Grid, Paper, Button, TextField, CircularProgress, Snackbar,
  Alert, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip
} from "@mui/material";
import { format, startOfMonth, endOfMonth } from "date-fns";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RestoreIcon from "@mui/icons-material/Restore";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

import technicianService from "../../services/technicianService";
import scheduleService from "../../services/scheduleService";
import centerService from "../../services/centerService";
import "@fontsource/poppins";

const fmt = (d) => format(d, "yyyy-MM-dd");
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const getMonthDays = (year, month) => {
  const first = new Date(year, month, 1);
  const days = [];
  const start = first.getDay();
  for (let i = 0; i < start; i++) days.push(null);
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};
const isPast = (d) => {
  if (!d) return false;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return dd < t;
};

const STATUS_UI = {
  FREE: { label: "Trống", bg: "#ffffff", border: "#e5e7eb", color: "#065f46" },
  BOOKED: { label: "Đã đặt", bg: "#d1fae5", border: "#34d399", color: "#065f46" },
  CANCELLED_BY_TECH: { label: "Đã hủy", bg: "#fee2e2", border: "#f87171", color: "#7f1d1d" },
  HOLD: { label: "Đang giữ chỗ", bg: "#fef9c3", border: "#fbbf24", color: "#92400e" },
  BLOCKED: { label: "Đã khóa", bg: "#f3f4f6", border: "#9ca3af", color: "#6b7280" },
  REASSIGNED: { label: "Đã chuyển giao", bg: "#fef3c7", border: "#f59e0b", color: "#78350f" },
};

const parseTimeToKey = (t) => {
  if (!t) return t;
  const m = t.match(/(\d{1,2})[:h](\d{2})?/);
  if (!m) {
    const m2 = t.match(/(\d{1,2})/);
    if (!m2) return t;
    return pad(Number(m2[1])) + ":00";
  }
  const hh = pad(Number(m[1]));
  const mm = pad(Number(m[2] ?? "00"));
  return `${hh}:${mm}`;
};

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [centersMap, setCentersMap] = useState({}); // id -> center object
  const [selectedTech, setSelectedTech] = useState(null);
  const [query, setQuery] = useState("");

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [days, setDays] = useState(() => getMonthDays(year, month));

  const [slotsByDate, setSlotsByDate] = useState({});
  const [activeDay, setActiveDay] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const [btnLoading, setBtnLoading] = useState({ save: false, cancel: false, restore: false, generate: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPayload, setDialogPayload] = useState({ title: "", message: "" });
  const dialogTimerRef = useRef();

  const [sundayConfirmOpen, setSundayConfirmOpen] = useState(false);
  const [pendingSundayDate, setPendingSundayDate] = useState(null);

  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  useEffect(() => setDays(getMonthDays(year, month)), [year, month]);

  // load centers & techs
  useEffect(() => {
    (async () => {
      try {
        const centersRes = await centerService.getAll();
        const centersArr = Array.isArray(centersRes) ? centersRes : centersRes?.data ?? [];
        const map = {};
        centersArr.forEach(c => { map[c.id ?? c._id ?? c.centerId] = c; });
        setCentersMap(map);
      } catch (err) {
        console.warn("Không tải được centers:", err);
      }

      try {
        const res = await technicianService.getAll();
        const arr = Array.isArray(res) ? res : res?.data ?? [];
        // map technician data and include centerId if present
        setTechnicians(arr.map(t => ({
          id: t.technicianId ?? t.id ?? t._id,
          name: t.fullName ?? t.name ?? "Không tên",
          centerId: t.centerId ?? t.center?.id ?? t.centerId ?? null
        })));
      } catch (err) {
        console.error(err);
        setSnack({ open: true, severity: "error", message: "Không thể tải danh sách kỹ thuật viên." });
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter(t => t.name.toLowerCase().includes(q));
  }, [technicians, query]);

  // load month slots
  const loadMonthSlots = async (techId) => {
    if (!techId) return;
    setLoading(true);
    try {
      const from = format(startOfMonth(new Date(year, month)), "yyyy-MM-dd");
      const to = format(endOfMonth(new Date(year, month)), "yyyy-MM-dd");
      const res = await scheduleService.getTechnicianSlots(techId, from, to);
      const payload = res?.data ?? res ?? [];
      const map = {};
      if (Array.isArray(payload)) {
        if (payload.length && payload[0].workDate && Array.isArray(payload[0].slots)) {
          payload.forEach(d => (d.slots || []).forEach(s => {
            const dStr = d.workDate;
            if (!map[dStr]) map[dStr] = [];
            map[dStr].push({ startTime: parseTimeToKey(s.startTime ?? s.start), endTime: s.endTime ?? s.end ?? "", status: s.status ?? "FREE" });
          }));
        } else {
          payload.forEach(s => {
            const dStr = s.workDate ?? s.date;
            if (!dStr) return;
            if (!map[dStr]) map[dStr] = [];
            map[dStr].push({ startTime: parseTimeToKey(s.startTime ?? s.start), endTime: s.endTime ?? s.end ?? "", status: s.status ?? "FREE" });
          });
        }
      } else if (typeof payload === "object") {
        const daysArr = payload.days ?? payload.data ?? [];
        daysArr.forEach(d => (d.slots || []).forEach(s => {
          const dStr = d.workDate;
          if (!map[dStr]) map[dStr] = [];
          map[dStr].push({ startTime: parseTimeToKey(s.startTime ?? s.start), endTime: s.endTime ?? s.end ?? "", status: s.status ?? "FREE" });
        }));
      }
      Object.keys(map).forEach(k => map[k].sort((a, b) => a.startTime > b.startTime ? 1 : -1));
      setSlotsByDate(map);
    } catch (err) {
      console.error(err);
      setSnack({ open: true, severity: "error", message: "Lỗi tải lịch tháng." });
    } finally {
      setLoading(false);
    }
  };

  const handleTechSelect = (tech) => {
    setSelectedTech(tech);
    setActiveDay(null);
    setSelectedSlots(new Set());
    loadMonthSlots(tech.id);
  };

  const handleDayClick = (d) => {
    if (!d) return;
    if (isPast(d)) {
      setSnack({ open: true, severity: "warning", message: "Không thể chọn ngày đã qua." });
      return;
    }
    // Sunday confirmation behavior
    if (d.getDay() === 0) {
      setPendingSundayDate(fmt(d));
      setSundayConfirmOpen(true);
      return;
    }
    handleDaySelect(d);
  };

  const handleDaySelect = (d) => {
    const ds = typeof d === "string" ? d : fmt(d);
    setActiveDay(ds);
    setSelectedSlots(new Set());
  };

  const toggleSelect = (timeKey) => {
    if (!activeDay) return;
    const daySlots = slotsByDate[activeDay] || [];
    const s = daySlots.find(x => x.startTime === timeKey);
    if (!s) return;
    if (s.status === "CANCELLED_BY_TECH" || s.status === "BLOCKED" || s.status === "HOLD" || s.status === "REASSIGNED") {
      setSnack({ open: true, severity: "info", message: `Không thể chọn slot: ${STATUS_UI[s.status]?.label ?? s.status}` });
      return;
    }
    setSelectedSlots(prev => {
      const n = new Set(prev);
      n.has(timeKey) ? n.delete(timeKey) : n.add(timeKey);
      return n;
    });
  };

  const patchSlot = (date, timeKey, newStatus) => {
    setSlotsByDate(prev => {
      const copy = { ...prev };
      if (!copy[date]) return prev;
      copy[date] = copy[date].map(s => s.startTime === timeKey ? { ...s, status: newStatus } : s);
      return copy;
    });
  };

  // Đặt lịch làm (book) — gửi centerId của kỹ thuật viên (nếu có)
  const handleSave = async () => {
    if (!selectedTech || !activeDay || selectedSlots.size === 0) {
      setSnack({ open: true, severity: "warning", message: "Chưa chọn slot để đặt." });
      return;
    }
    setBtnLoading(prev => ({ ...prev, save: true }));
    try {
      const centerId = selectedTech.centerId ?? null;
      let success = 0;
      for (const timeKey of Array.from(selectedSlots)) {
        const s = (slotsByDate[activeDay] || []).find(x => x.startTime === timeKey);
        if (!s || s.status !== "FREE") continue;
        // API requires centerId, workDate, startTime, note (optional)
        const res = await scheduleService.bookSchedule(selectedTech.id, { centerId, workDate: activeDay, startTime: timeKey, note: "" });
        if (res?.success) {
          const newStatus = res.data?.status ?? "BOOKED";
          patchSlot(activeDay, timeKey, newStatus);
          success++;
        }
      }
      openDialog("Đặt lịch thành công", `Đã đặt ${success} slot cho ngày ${activeDay}.`);
      setSelectedSlots(new Set());
    } catch (err) {
      console.error(err);
      openDialog("Đặt lịch thất bại", "Có lỗi khi gọi API đặt lịch.");
    } finally {
      setBtnLoading(prev => ({ ...prev, save: false }));
    }
  };

  // Hủy slot: gửi 1 lần với slotTimes array theo schema API
  const handleCancel = async () => {
    if (!selectedTech || !activeDay || selectedSlots.size === 0) {
      setSnack({ open: true, severity: "warning", message: "Chưa chọn slot để hủy." });
      return;
    }
    setBtnLoading(prev => ({ ...prev, cancel: true }));
    try {
      // chỉ hủy những slot đang BOOKED
      const timesToCancel = Array.from(selectedSlots).filter(t => {
        const s = (slotsByDate[activeDay] || []).find(x => x.startTime === t);
        return s && s.status === "BOOKED";
      });
      if (timesToCancel.length === 0) {
        setSnack({ open: true, severity: "info", message: "Không có slot Đã đặt để hủy." });
        setBtnLoading(prev => ({ ...prev, cancel: false }));
        return;
      }
      const res = await scheduleService.cancelSchedule(selectedTech.id, { dateFrom: activeDay, dateTo: activeDay, slotTimes: timesToCancel, note: "" });
      if (res?.success) {
        timesToCancel.forEach(tk => patchSlot(activeDay, tk, "CANCELLED_BY_TECH"));
        openDialog("Hủy thành công", `Đã hủy ${timesToCancel.length} slot cho ${activeDay}.`);
      } else {
        openDialog("Hủy thất bại", res?.message || "Hủy thất bại.");
      }
      setSelectedSlots(new Set());
    } catch (err) {
      console.error(err);
      openDialog("Hủy thất bại", "Có lỗi khi gọi API hủy.");
    } finally {
      setBtnLoading(prev => ({ ...prev, cancel: false }));
    }
  };

  // Khôi phục slot bị hủy: gửi slotTimes (tất cả slot bị hủy của ngày)
  const handleRestore = async () => {
    if (!selectedTech || !activeDay) {
      setSnack({ open: true, severity: "warning", message: "Chưa chọn ngày hoặc kỹ thuật viên." });
      return;
    }
    setBtnLoading(prev => ({ ...prev, restore: true }));
    try {
      const cancelled = (slotsByDate[activeDay] || []).filter(s => s.status === "CANCELLED_BY_TECH").map(s => s.startTime);
      if (cancelled.length === 0) {
        setSnack({ open: true, severity: "info", message: "Không có slot bị hủy để khôi phục." });
        setBtnLoading(prev => ({ ...prev, restore: false }));
        return;
      }
      const res = await scheduleService.restoreSchedule(selectedTech.id, { dateFrom: activeDay, dateTo: activeDay, slotTimes: cancelled });
      if (res?.success) {
        cancelled.forEach(tk => patchSlot(activeDay, tk, "FREE"));
        openDialog("Khôi phục thành công", `Đã khôi phục ${cancelled.length} slot bị hủy.`);
      } else {
        openDialog("Khôi phục thất bại", res?.message || "Khôi phục thất bại.");
      }
    } catch (err) {
      console.error(err);
      openDialog("Khôi phục thất bại", "Có lỗi khi gọi API khôi phục.");
    } finally {
      setBtnLoading(prev => ({ ...prev, restore: false }));
    }
  };

  const handleGenerateMonth = async () => {
    if (!selectedTech) {
      setSnack({ open: true, severity: "warning", message: "Chưa chọn kỹ thuật viên." });
      return;
    }
    setBtnLoading(prev => ({ ...prev, generate: true }));
    try {
      const targetMonth = `${year}-${pad(month + 1)}`;
      const res = await scheduleService.generateMonthSchedule(selectedTech.id, { targetMonth });
      if (res?.success) {
        await loadMonthSlots(selectedTech.id);
        openDialog("Tạo lịch tháng", `Đã tạo lịch tháng ${targetMonth} (trừ Chủ nhật).`);
      } else {
        openDialog("Tạo lịch thất bại", res?.message || "Tạo lịch thất bại.");
      }
    } catch (err) {
      console.error(err);
      openDialog("Tạo lịch thất bại", "Có lỗi khi gọi API tạo tháng.");
    } finally {
      setBtnLoading(prev => ({ ...prev, generate: false }));
    }
  };

  // Khi user xác nhận tạo Chủ nhật
  const confirmCreateSunday = async (confirm) => {
    setSundayConfirmOpen(false);
    if (!confirm) {
      // nếu user hủy, vẫn mở panel ngày để thao tác thủ công
      if (pendingSundayDate) handleDaySelect(pendingSundayDate);
      setPendingSundayDate(null);
      return;
    }
    // create sunday schedule via API (use centerId from selectedTech if present)
    try {
      setLoading(true);
      const centerId = selectedTech?.centerId ?? null;
      const res = await scheduleService.createSundaySchedule(selectedTech.id, { centerId, date: pendingSundayDate });
      if (res?.success) {
        await loadMonthSlots(selectedTech.id);
        openDialog("Tạo Chủ nhật", `Đã tạo lịch Chủ nhật cho ${pendingSundayDate}.`);
        handleDaySelect(pendingSundayDate);
      } else {
        openDialog("Tạo Chủ nhật thất bại", res?.message || "Tạo thất bại.");
      }
    } catch (err) {
      console.error(err);
      openDialog("Tạo Chủ nhật thất bại", "Lỗi khi gọi API tạo Chủ nhật.");
    } finally {
      setLoading(false);
      setPendingSundayDate(null);
    }
  };

  const openDialogAuto = (title, message) => {
    setDialogPayload({ title, message });
    setDialogOpen(true);
    if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current);
    dialogTimerRef.current = setTimeout(() => setDialogOpen(false), 5000);
  };

  const openDialog = openDialogAuto;

  // helper UI mapping
  const uiFor = (status) => STATUS_UI[status] ?? STATUS_UI.FREE;

  useEffect(() => setSelectedSlots(new Set()), [activeDay]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Quản lý lịch kỹ thuật viên</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Chọn kỹ thuật viên → Chọn ngày → Chọn slot → Hành động
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Left: technicians (show center name) */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Danh sách kỹ thuật viên</Typography>
            <TextField 
              fullWidth 
              size="small" 
              placeholder="Tìm kỹ thuật viên..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)} 
              InputProps={{ 
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary", fontSize: 18 }} /> 
              }} 
              sx={{ mb: 2 }}
            />
            <Box sx={{ maxHeight: 580, overflowY: "auto", "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 3 } }}>
              {filtered.length === 0 ? (
                <Typography variant="body2" sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                  Không tìm thấy kỹ thuật viên
                </Typography>
              ) : (
                filtered.map(t => (
                  <Paper 
                    key={t.id}
                    onClick={() => handleTechSelect(t)} 
                    sx={{
                      p: 1.5, 
                      mb: 1, 
                      cursor: "pointer", 
                      borderRadius: 1.5,
                      border: selectedTech?.id === t.id ? "2px solid" : "1px solid",
                      borderColor: selectedTech?.id === t.id ? "primary.main" : "divider",
                      bgcolor: selectedTech?.id === t.id ? "action.selected" : "background.paper",
                      boxShadow: selectedTech?.id === t.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                      transition: "all .15s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: selectedTech?.id === t.id ? "action.selected" : "action.hover",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                      }
                    }}
                  >
                    <Typography sx={{ fontWeight: selectedTech?.id === t.id ? 700 : 600, fontSize: "0.95rem", mb: 0.5 }}>
                      {t.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                      {t.centerId ? (centersMap[t.centerId]?.name ?? "Trung tâm: ...") : "Chưa gán trung tâm"}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Center: calendar (with Generate button) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<ArrowBackIosNewIcon fontSize="small" />} 
                onClick={() => {
                  if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
                }}
                sx={{ textTransform: "none" }}
              >
                Tháng trước
              </Button>

              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {new Date(year, month).toLocaleString("vi-VN", { month: "long", year: "numeric" })}
              </Typography>

              <Button 
                variant="outlined" 
                size="small"
                endIcon={<ArrowForwardIosIcon fontSize="small" />} 
                onClick={() => {
                  if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
                }}
                sx={{ textTransform: "none" }}
              >
                Tháng sau
              </Button>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2.5 }}>
              <Button 
                variant="contained" 
                startIcon={<AutoFixHighIcon />} 
                onClick={handleGenerateMonth}
                disabled={btnLoading.generate || !selectedTech}
                size="small"
                sx={{ minWidth: 160, textTransform: "none" }}
              >
                {btnLoading.generate ? <CircularProgress size={18} /> : "Tạo lịch tháng"}
              </Button>
            </Box>

            {!selectedTech ? (
              <Typography align="center" sx={{ color: "text.secondary", py: 10 }}>Chọn kỹ thuật viên để xem lịch.</Typography>
            ) : (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1.5, px: 0.5 }}>
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
                    <Typography 
                      key={d} 
                      align="center" 
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: "0.8rem",
                        color: "primary.main",
                        py: 0.75
                      }}
                    >
                      {d}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75 }}>
                  {days.map((d, i) => {
                    const dateStr = d ? fmt(d) : null;
                    const selected = dateStr && dateStr === activeDay;
                    const past = d && isPast(d);
                    const count = dateStr ? (slotsByDate[dateStr]?.length ?? 0) : 0;
                    const isToday = d && fmt(d) === fmt(new Date());
                    
                    return (
                      <Paper 
                        key={i}
                        onClick={() => d && !past && handleDayClick(d)} 
                        sx={{
                          aspectRatio: "1",
                          minHeight: 68,
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          justifyContent: "center",
                          borderRadius: 1.5, 
                          cursor: d && !past ? "pointer" : "default",
                          backgroundColor: !d ? "transparent" : past ? "action.disabledBackground" : selected ? "action.selected" : isToday ? "action.hover" : "background.paper",
                          border: !d ? "none" : selected ? "2px solid" : isToday ? "2px solid" : "1px solid",
                          borderColor: selected ? "primary.main" : isToday ? "primary.light" : "divider",
                          transition: "all .2s ease",
                          position: "relative",
                          "&:hover": d && !past ? { 
                            bgcolor: selected ? "action.selected" : "action.hover",
                            borderColor: "primary.main",
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            zIndex: 1
                          } : {}
                        }}
                      >
                        <Typography 
                          sx={{ 
                            fontWeight: selected ? 700 : 600, 
                            fontSize: "0.95rem",
                            color: past ? "text.disabled" : selected ? "primary.main" : isToday ? "primary.main" : "text.primary"
                          }}
                        >
                          {d ? d.getDate() : ""}
                        </Typography>
                        {count > 0 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: past ? "text.disabled" : selected ? "primary.main" : "text.secondary", 
                              fontSize: "0.7rem",
                              mt: 0.25,
                              fontWeight: 500
                            }}
                          >
                            {count} slot
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Right: slot list + actions */}
        <Grid item xs={12} md={3}>
          {activeDay && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>Slots</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        {activeDay}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => { setActiveDay(null); setSelectedSlots(new Set()); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={24} /></Box>
                  ) : (
                    <>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, mb: 2 }}>
                        {(slotsByDate[activeDay] || []).map((s, idx) => {
                          const ui = uiFor(s.status);
                          const key = s.startTime;
                          const selected = selectedSlots.has(key);
                          const canSelect = s.status === "FREE" || s.status === "BOOKED";

                          const formatTime = (time) => {
                            if (!time) return "—";
                            const parts = time.split(":");
                            const hh = parts[0].padStart(2, "0");
                            const mm = (parts[1] ?? "00").padStart(2, "0");
                            return `${hh}:${mm}`;
                          };

                          const start = formatTime(s.startTime);
                          const end = formatTime(s.endTime);

                          return (
                            <Tooltip key={idx} title={ui.label} arrow placement="top">
                                <Paper
                                onClick={() => toggleSelect(key)}
                                sx={{
                                  p: 1.5, 
                                  textAlign: "center", 
                                  borderRadius: 1.5,
                                  cursor: canSelect ? "pointer" : "default",
                                  backgroundColor: selected ? "action.selected" : ui.bg,
                                  border: selected ? "2px solid" : "1px solid",
                                  borderColor: selected ? "primary.main" : ui.border,
                                  color: ui.color, 
                                  fontWeight: selected ? 700 : 600,
                                  fontSize: "0.85rem",
                                  transition: "all .2s ease",
                                  "&:hover": canSelect ? { 
                                    bgcolor: selected ? "action.selected" : "action.hover",
                                    borderColor: "primary.main",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                                  } : {}
                                }}
                              >
                                {`${start} - ${end}`}
                              </Paper>
                            </Tooltip>
                          );
                        })}

                        {(!slotsByDate[activeDay] || slotsByDate[activeDay].length === 0) && (
                          <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 4 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              Không có slot cho ngày này
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Paper 
                        elevation={0} 
                        variant="outlined"
                        sx={{ 
                          mt: 2, 
                          p: 2, 
                          borderRadius: 2, 
                          display: "flex", 
                          flexDirection: "column", 
                          gap: 1.5 
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Hành động</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          Chú ý: Chọn slot Trống để Đặt lịch làm; chọn slot Đã đặt để Hủy; Khôi phục sẽ bật lại tất cả slot đã hủy.
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                          <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<AddCircleOutlineIcon />} 
                            onClick={handleSave} 
                            disabled={btnLoading.save}
                            size="small"
                            fullWidth
                          >
                            {btnLoading.save ? <CircularProgress size={18} /> : "Đặt lịch làm"}
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            startIcon={<DeleteOutlineIcon />} 
                            onClick={handleCancel} 
                            disabled={btnLoading.cancel}
                            size="small"
                            fullWidth
                          >
                            {btnLoading.cancel ? <CircularProgress size={18} /> : "Hủy slot"}
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="info" 
                            startIcon={<RestoreIcon />} 
                            onClick={handleRestore} 
                            disabled={btnLoading.restore}
                            size="small"
                            fullWidth
                          >
                            {btnLoading.restore ? <CircularProgress size={18} /> : "Khôi phục slot đã hủy"}
                          </Button>
                        </Box>
                      </Paper>
                    </>
                  )}
                </Paper>
          )}
        </Grid>
      </Grid>

      {/* Sunday confirm dialog */}
      <Dialog open={sundayConfirmOpen} onClose={() => confirmCreateSunday(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tạo lịch Chủ nhật</DialogTitle>
        <DialogContent>
          <Typography>Bạn có muốn tạo lịch Chủ nhật cho ngày <strong>{pendingSundayDate}</strong> không? (Sẽ gọi API tạo lịch Chủ nhật cho kỹ thuật viên)</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => confirmCreateSunday(false)}>Hủy</Button>
          <Button variant="contained" onClick={() => confirmCreateSunday(true)}>Tạo lịch Chủ nhật</Button>
        </DialogActions>
      </Dialog>

      {/* center popup dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleOutlineIcon color="success" />
          <Box sx={{ flex: 1 }}>{dialogPayload.title}</Box>
          <IconButton onClick={() => { setDialogOpen(false); if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current); }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent><Typography>{dialogPayload.message}</Typography></DialogContent>
        <DialogActions><Button onClick={() => { setDialogOpen(false); if (dialogTimerRef.current) clearTimeout(dialogTimerRef.current); }}>Đóng</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
