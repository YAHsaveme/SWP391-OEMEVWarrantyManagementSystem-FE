// src/components/staff/Appointment.jsx
// Appointment creator — compact vertical calendar + slot picker + skill-based suggestions
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
    Box, Paper, Typography, Button, IconButton, Grid, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Checkbox, FormControlLabel, RadioGroup, Radio, CircularProgress, Snackbar, Alert,
    Tooltip, MenuItem, Select, FormControl, InputLabel, Chip, Divider, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import dayjs from "dayjs";

import appointmentService from "../../services/appointmentService";
import scheduleService from "../../services/scheduleService";
import claimService, { CLAIM_STATUS } from "../../services/claimService";
import technicianService from "../../services/technicianService";
import eventService from "../../services/eventService";

import "@fontsource/poppins";

const PRIMARY = "#0284c7";

// Mapping giữa tiếng Việt (hiển thị) và tiếng Anh (backend)
const SKILL_MAPPING = {
    "Hệ truyền động điện cao áp": "HV_POWERTRAIN",
    "Sạc & hệ thống sạc": "CHARGING",
    "Điện áp thấp & truyền thông": "LOWV_COMM",
    "Cơ khí & độ kín/chống thấm": "MECH_SEALING",
    "Phần mềm & firmware": "SOFTWARE_FIRMWARE",
};

// Reverse mapping: tiếng Anh -> tiếng Việt
const SKILL_REVERSE_MAPPING = Object.fromEntries(
    Object.entries(SKILL_MAPPING).map(([vi, en]) => [en, vi])
);

// Danh sách skills để hiển thị (tiếng Việt)
const SKILLS = Object.keys(SKILL_MAPPING);

// Helper functions
const skillToBackend = (skillVi) => SKILL_MAPPING[skillVi] || skillVi;
const skillFromBackend = (skillEn) => SKILL_REVERSE_MAPPING[skillEn] || skillEn;
const skillsToBackend = (skillsVi) => skillsVi.map(skillToBackend).join(",");
const skillsFromBackend = (skillsEnStr) => {
    if (!skillsEnStr) return [];
    return skillsEnStr.split(",").map(s => skillFromBackend(s.trim())).filter(Boolean);
};

const STATUS_LABELS = {
    BOOKED: "Đã đặt lịch hẹn",
    IN_PROGRESS: "Đang xử lý",
    DONE: "Hoàn thành",
    CANCELLED: "Đã hủy"
};

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
    const [technicians, setTechnicians] = useState([]);
    // Map VIN -> recall status để hiển thị trong dropdown
    const [vinRecallMap, setVinRecallMap] = useState(new Map()); // { vin: { hasRecall, claimType } }
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

    // All appointments list
    const [allAppointments, setAllAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [filterClaimId, setFilterClaimId] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");

    // Detail dialog
    const [detailDialog, setDetailDialog] = useState({ open: false, appointment: null, loading: false });

    // Edit dialog
    const [editDialog, setEditDialog] = useState({ open: false, appointment: null });
    const [editForm, setEditForm] = useState({ note: "", requiredSkill: "", technicianId: "", selectedSlotKeys: new Set() });
    const [editLoading, setEditLoading] = useState(false);
    
    // Edit calendar/slots state
    const [editCalYear, setEditCalYear] = useState(today.getFullYear());
    const [editCalMonth, setEditCalMonth] = useState(today.getMonth());
    const [editActiveDate, setEditActiveDate] = useState("");
    const [editMonthSlotsByTech, setEditMonthSlotsByTech] = useState({});
    const [editSuggestions, setEditSuggestions] = useState([]);

    // Load tất cả claims (để hiển thị VIN trong appointments) và APPROVED claims (để filter dropdown)
    const [allClaims, setAllClaims] = useState([]); // Tất cả claims để tìm VIN
    useEffect(() => {
        (async () => {
            try {
                // Load tất cả claims để tìm VIN cho appointments
                let allRes;
                try {
                    allRes = await claimService.getAll();
                } catch (err) {
                    console.warn("Load all claims failed:", err);
                    allRes = [];
                }
                const allArr = Array.isArray(allRes) ? allRes : (allRes?.data ? allRes.data : []);
                setAllClaims(allArr);
                
                // Load tất cả claims APPROVED cho dropdown
                let res;
                try {
                    res = await claimService.getByStatus(CLAIM_STATUS.APPROVED);
                } catch (err) {
                    console.warn("Load APPROVED claims failed, trying getAll:", err);
                    // Fallback: load tất cả và filter APPROVED
                    res = allRes;
                }
                
                let arr = Array.isArray(res) ? res : (res?.data ? res.data : []);
                
                // Filter chỉ lấy APPROVED nếu đã load từ getAll
                if (arr.length > 0 && arr[0]?.status) {
                    arr = arr.filter(c => c.status === CLAIM_STATUS.APPROVED);
                }
                
                console.log("Loaded APPROVED claims count:", arr.length);
                
                // Sort theo ngày tạo (mới nhất trước)
                arr.sort((a, b) => {
                    const dateA = new Date(a.openedAt || a.createdAt || a.errorDate || 0).getTime();
                    const dateB = new Date(b.openedAt || b.createdAt || b.errorDate || 0).getTime();
                    return dateB - dateA;
                });
                
                setClaims(arr);
                
                // Check recall cho các VINs (async, không block) - dùng allArr để check nhiều VIN hơn
                const vinsToCheck = [...new Set(allArr.map(c => c.vin).filter(Boolean))];
                if (vinsToCheck.length > 0) {
                    const recallMap = new Map();
                    console.log("VINs to check recall:", vinsToCheck.length);
                    
                    // Check recall cho từng VIN (giới hạn 20 để không quá chậm)
                    await Promise.all(
                        vinsToCheck.slice(0, 20).map(async (vin) => {
                            try {
                                const recallResult = await eventService.checkRecallByVin(vin);
                                const claimType = recallResult?.hasRecall ? "RECALL" : "WARRANTY";
                                recallMap.set(vin, {
                                    hasRecall: recallResult?.hasRecall || false,
                                    claimType: claimType
                                });
                            } catch (err) {
                                // Ignore lỗi check recall
                                recallMap.set(vin, { hasRecall: false, claimType: "WARRANTY" });
                            }
                        })
                    );
                    
                    console.log("Recall map size:", recallMap.size);
                    setVinRecallMap(recallMap);
                }
            } catch (err) {
                console.error("Không tải được claims", err);
                setClaims([]);
                setAllClaims([]);
            }
        })();
    }, []);

    // initial load technicians
    useEffect(() => {
        (async () => {
            try {
                const res = await technicianService.getAll();
                // technicianService.getAll() returns array directly, not {success, data}
                if (Array.isArray(res)) {
                    setTechnicians(res);
                } else if (res && Array.isArray(res.data)) {
                    setTechnicians(res.data);
                } else {
                    // Try alternative API
                    try {
                        const altRes = await scheduleService.getAllTechnicians();
                        if (altRes.success && Array.isArray(altRes.data)) {
                            setTechnicians(altRes.data);
                        }
                    } catch (altErr) {
                        console.warn("Không tải được technicians từ scheduleService", altErr);
                    }
                }
            } catch (err) {
                console.warn("Không tải được technicians", err);
            }
        })();
    }, []);

    // Load all appointments
    const loadAllAppointments = async () => {
        setLoadingAppointments(true);
        try {
            const res = await appointmentService.getAll();
            if (res.success) {
                setAllAppointments(res.data || []);
            } else {
                showSnack("error", "Không thể tải danh sách appointments");
            }
        } catch (err) {
            console.error("Load appointments error:", err);
            showSnack("error", "Lỗi khi tải appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Load appointments by claim
    const loadAppointmentsByClaim = async (claimId) => {
        if (!claimId) {
            loadAllAppointments();
            return;
        }
        setLoadingAppointments(true);
        try {
            const res = await appointmentService.getByClaim(claimId);
            if (res.success) {
                setAllAppointments(res.data || []);
            } else {
                showSnack("error", "Không thể tải appointments theo claim");
            }
        } catch (err) {
            console.error("Load appointments by claim error:", err);
            showSnack("error", "Lỗi khi tải appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Load appointments by status
    const loadAppointmentsByStatus = async (status) => {
        if (status === "ALL") {
            loadAllAppointments();
            return;
        }
        setLoadingAppointments(true);
        try {
            const res = await appointmentService.getByStatus(status);
            if (res.success) {
                setAllAppointments(res.data || []);
            } else {
                showSnack("error", "Không thể tải appointments theo status");
            }
        } catch (err) {
            console.error("Load appointments by status error:", err);
            showSnack("error", "Lỗi khi tải appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Load appointment by ID (for detail view)
    const loadAppointmentById = async (appointmentId) => {
        setDetailDialog({ open: true, appointment: null, loading: true });
        try {
            const res = await appointmentService.getById(appointmentId);
            if (res.success) {
                setDetailDialog({ open: true, appointment: res.data, loading: false });
            } else {
                showSnack("error", "Không thể tải chi tiết appointment");
                setDetailDialog({ open: false, appointment: null, loading: false });
            }
        } catch (err) {
            console.error("Load appointment by ID error:", err);
            showSnack("error", "Lỗi khi tải chi tiết appointment");
            setDetailDialog({ open: false, appointment: null, loading: false });
        }
    };

    // Update appointment
    const handleUpdate = async () => {
        if (!editDialog.appointment) return;
        setEditLoading(true);
        try {
            const apt = editDialog.appointment;
            const payload = {};

            // Theo API: claimId, requiredSkill, technicianId, slotIds, note, workingStartTime, workingEndTime
            // Bắt buộc phải có các field này
            if (!apt.claimId) {
                showSnack("error", "Thiếu claimId");
                setEditLoading(false);
                return;
            }
            payload.claimId = apt.claimId;

            // requiredSkill - convert từ tiếng Việt sang tiếng Anh để gửi lên backend
            if (editForm.requiredSkill && editForm.requiredSkill.trim()) {
                payload.requiredSkill = skillToBackend(editForm.requiredSkill.trim());
            } else if (apt.requiredSkill) {
                // Nếu không có trong form, dùng từ appointment (đã là tiếng Anh)
                payload.requiredSkill = apt.requiredSkill;
            } else {
                showSnack("error", "Thiếu requiredSkill");
                setEditLoading(false);
                return;
            }

            // technicianId - sử dụng từ editForm nếu có, nếu không dùng từ appointment cũ
            const technicianId = editForm.technicianId || apt.technicianId;
            if (!technicianId) {
                showSnack("error", "Thiếu technicianId");
                setEditLoading(false);
                return;
            }
            payload.technicianId = technicianId;

            // slotIds - sử dụng từ editForm nếu có, nếu không dùng từ appointment cũ
            let slotIds = [];
            if (editForm.selectedSlotKeys && editForm.selectedSlotKeys.size > 0) {
                // Lấy slotIds từ selectedSlotKeys
                const selected = Array.from(editForm.selectedSlotKeys);
                const manualSlots = [];
                
                selected.forEach(key => {
                    if (key.includes("|")) {
                        // Manual format: date|startTime - cần tìm slotId
                        const [d, st] = key.split("|");
                        if (editForm.technicianId) {
                            const techKey = `${editForm.technicianId}_${editCalYear}_${editCalMonth}`;
                            const map = editMonthSlotsByTech[techKey] || {};
                            const slot = (map[d] || []).find(x => x.startTime === st);
                            if (slot && slot.slotId) {
                                slotIds.push(slot.slotId);
                                return;
                            }
                        }
                        manualSlots.push({ slotDate: d, startTime: st });
                    } else {
                        // Direct slotId
                        if (key && key.trim()) {
                            slotIds.push(key);
                        }
                    }
                });
                
                // Nếu vẫn còn manual slots, thử tìm từ cache
                if (manualSlots.length > 0 && editForm.technicianId) {
                    const techKey = `${editForm.technicianId}_${editCalYear}_${editCalMonth}`;
                    const map = editMonthSlotsByTech[techKey] || {};
                    manualSlots.forEach(ms => {
                        const slot = (map[ms.slotDate] || []).find(s => s.startTime === ms.startTime);
                        if (slot && slot.slotId && !slotIds.includes(slot.slotId)) {
                            slotIds.push(slot.slotId);
                        }
                    });
                }
            }
            
            // Nếu không có slotIds từ editForm, dùng từ appointment cũ
            if (slotIds.length === 0) {
                if (apt.slotIds && Array.isArray(apt.slotIds) && apt.slotIds.length > 0) {
                    slotIds = apt.slotIds;
                } else if (apt.slots && Array.isArray(apt.slots) && apt.slots.length > 0) {
                    const extractedSlotIds = apt.slots.map(s => s.slotId || s.id).filter(Boolean);
                    if (extractedSlotIds.length > 0) {
                        slotIds = extractedSlotIds;
                    }
                }
            }
            
            if (slotIds.length === 0) {
                showSnack("error", "Thiếu slotIds");
                setEditLoading(false);
                return;
            }
            payload.slotIds = slotIds;

            // note - có thể để trống
            payload.note = editForm.note !== undefined ? (editForm.note || "") : (apt.note || "");

            // exclusions - giữ nguyên từ appointment hiện có (không cho edit)
            if (apt.exclusions && Array.isArray(apt.exclusions) && apt.exclusions.length > 0) {
                payload.exclusions = apt.exclusions;
            }

            // workingStartTime và workingEndTime từ slots đã chọn hoặc từ appointment cũ
            let slotsForTime = [];
            if (editForm.selectedSlotKeys && editForm.selectedSlotKeys.size > 0 && editForm.technicianId) {
                // Lấy thông tin slots từ cache
                const techKey = `${editForm.technicianId}_${editCalYear}_${editCalMonth}`;
                const map = editMonthSlotsByTech[techKey] || {};
                editForm.selectedSlotKeys.forEach(key => {
                    if (key.includes("|")) {
                        const [d, st] = key.split("|");
                        const slot = (map[d] || []).find(x => x.startTime === st);
                        if (slot) {
                            slotsForTime.push({ slotDate: d, workDate: d, startTime: slot.startTime, endTime: slot.endTime });
                        }
                    }
                });
            }
            
            // Nếu không có từ editForm, dùng từ appointment cũ
            if (slotsForTime.length === 0 && apt.slots && Array.isArray(apt.slots) && apt.slots.length > 0) {
                slotsForTime = apt.slots;
            }
            
            if (slotsForTime.length > 0) {
                const sortedSlots = [...slotsForTime].sort((a, b) => {
                    const dateA = a.slotDate || a.workDate || "";
                    const dateB = b.slotDate || b.workDate || "";
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    const timeA = a.startTime || "";
                    const timeB = b.startTime || "";
                    return timeA.localeCompare(timeB);
                });
                const firstSlot = sortedSlots[0];
                const lastSlot = sortedSlots[sortedSlots.length - 1];

                if (firstSlot && (firstSlot.slotDate || firstSlot.workDate) && firstSlot.startTime) {
                    const dateStr = firstSlot.slotDate || firstSlot.workDate;
                    const timeStr = firstSlot.startTime;
                    try {
                        const startDate = new Date(`${dateStr}T${timeStr}`);
                        if (!isNaN(startDate.getTime())) {
                            payload.workingStartTime = startDate.toISOString();
                        }
                    } catch (e) {
                        console.warn("Error parsing workingStartTime:", e);
                    }
                }

                if (lastSlot && (lastSlot.slotDate || lastSlot.workDate) && lastSlot.endTime) {
                    const dateStr = lastSlot.slotDate || lastSlot.workDate;
                    const timeStr = lastSlot.endTime;
                    try {
                        const endDate = new Date(`${dateStr}T${timeStr}`);
                        if (!isNaN(endDate.getTime())) {
                            payload.workingEndTime = endDate.toISOString();
                        }
                    } catch (e) {
                        console.warn("Error parsing workingEndTime:", e);
                    }
                }
            }

            console.log("[Appointment] Update payload:", payload);
            const res = await appointmentService.update(apt.id, payload);
            if (res.success) {
                showSnack("success", "Cập nhật appointment thành công");
                setEditDialog({ open: false, appointment: null });
                setEditForm({ note: "", requiredSkill: "", technicianId: "", selectedSlotKeys: new Set() });
                setEditActiveDate("");
                setEditSuggestions([]);
                setEditMonthSlotsByTech({});
                loadAllAppointments();
            } else {
                const errorMsg = res.message || res.error?.message || "Cập nhật thất bại";
                showSnack("error", errorMsg);
                console.error("[Appointment] Update failed:", res);
            }
        } catch (err) {
            console.error("Update appointment error:", err);
            // Kiểm tra xem có phải lỗi authentication không
            const errorData = err.response?.data || err.error || {};
            const errorMessage = errorData.message || errorData.error || err.message || "Lỗi khi cập nhật appointment";

            // Chỉ hiển thị lỗi, không tự động đăng xuất (để interceptor xử lý)
            if (err.response?.status === 401 || errorMessage.toLowerCase().includes("token")) {
                // Interceptor sẽ xử lý đăng xuất
                showSnack("error", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            } else {
                showSnack("error", errorMessage);
            }
        } finally {
            setEditLoading(false);
        }
    };

    // Open edit dialog
    const openEditDialog = async (appointment) => {
        // Convert skill từ backend (tiếng Anh) sang tiếng Việt để hiển thị trong form
        const skillVi = appointment.requiredSkill 
            ? skillsFromBackend(appointment.requiredSkill)[0] || appointment.requiredSkill
            : "";
        
        // Khởi tạo selectedSlotKeys từ slots hiện có
        const initialSlotKeys = new Set();
        if (appointment.slots && Array.isArray(appointment.slots)) {
            appointment.slots.forEach(slot => {
                if (slot.slotId) {
                    initialSlotKeys.add(slot.slotId);
                } else if (slot.slotDate || slot.workDate) {
                    const key = `${slot.slotDate || slot.workDate}|${slot.startTime || ""}`;
                    initialSlotKeys.add(key);
                }
            });
        }
        
        setEditForm({
            note: appointment.note || "",
            requiredSkill: skillVi,
            technicianId: appointment.technicianId || "",
            selectedSlotKeys: initialSlotKeys
        });
        
        // Reset edit calendar
        const today = new Date();
        setEditCalYear(today.getFullYear());
        setEditCalMonth(today.getMonth());
        setEditActiveDate("");
        setEditSuggestions([]);
        setEditMonthSlotsByTech({});
        
        // Load slots cho technician hiện tại nếu có
        if (appointment.technicianId) {
            try {
                await loadEditMonthSlotsForTech(appointment.technicianId);
            } catch (err) {
                console.warn("Failed to load slots for technician:", err);
            }
        }
        
        setEditDialog({ open: true, appointment });
    };
    
    // Load month slots for edit form
    const loadEditMonthSlotsForTech = async (techId) => {
        if (!techId) return {};
        const key = `${techId}_${editCalYear}_${editCalMonth}`;
        if (editMonthSlotsByTech[key]) return editMonthSlotsByTech[key];
        try {
            const from = dayjs(new Date(editCalYear, editCalMonth, 1)).format("YYYY-MM-DD");
            const to = dayjs(new Date(editCalYear, editCalMonth + 1, 0)).format("YYYY-MM-DD");
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
            setEditMonthSlotsByTech(prev => ({ ...prev, [key]: map }));
            return map;
        } catch (err) {
            console.error("loadEditMonthSlotsForTech err", err);
            return {};
        }
    };
    
    // Get merged slots for edit active date
    const getEditMergedSlotsForActiveDate = () => {
        if (!editActiveDate) return [];
        if (editForm.technicianId) {
            const key = `${editForm.technicianId}_${editCalYear}_${editCalMonth}`;
            const map = editMonthSlotsByTech[key] || {};
            if (map[editActiveDate]) return map[editActiveDate];
        }
        return [];
    };
    
    // Toggle slot in edit form
    const toggleEditSlot = (slot) => {
        if (!editActiveDate) { showSnack("warning", "Chọn ngày trước."); return; }
        const key = slot.slotId ?? `${editActiveDate}|${slot.startTime}`;
        if (slot.status === "CANCELLED_BY_TECH" || slot.status === "BLOCKED" || slot.status === "HOLD") {
            showSnack("info", "Slot không thể chọn (bị khóa/hủy).");
            return;
        }
        setEditForm(prev => {
            const nextKeys = new Set(prev.selectedSlotKeys);
            nextKeys.has(key) ? nextKeys.delete(key) : nextKeys.add(key);
            return { ...prev, selectedSlotKeys: nextKeys };
        });
    };
    
    // Auto-load slots when technician or month changes in edit form
    useEffect(() => {
        if (editDialog.open && editForm.technicianId) {
            loadEditMonthSlotsForTech(editForm.technicianId).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editForm.technicianId, editCalYear, editCalMonth, editDialog.open]);

    // Filter handlers
    useEffect(() => {
        if (filterClaimId) {
            loadAppointmentsByClaim(filterClaimId);
        } else if (filterStatus !== "ALL") {
            loadAppointmentsByStatus(filterStatus);
        } else {
            loadAllAppointments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterClaimId, filterStatus]);

    // Initial load
    useEffect(() => {
        loadAllAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Convert tiếng Việt sang tiếng Anh để gửi lên backend
            const payload = { requiredSkill: skillsToBackend(form.requiredSkills), workDate: activeDate };
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
            if (form.requiredSkills.length) payload.requiredSkill = skillsToBackend(form.requiredSkills);

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
                // Reload all appointments
                loadAllAppointments();
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
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllAppointments}
                        disabled={loadingAppointments}
                        sx={{ textTransform: "none" }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpen(true)}
                        sx={{ textTransform: "none" }}
                    >
                        Tạo lịch hẹn
                    </Button>
                </Box>
            </Paper>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <FilterListIcon />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Bộ lọc</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Lọc theo Claim</InputLabel>
                            <Select
                                value={filterClaimId}
                                label="Lọc theo Claim"
                                onChange={(e) => setFilterClaimId(e.target.value)}
                            >
                                <MenuItem value="">Tất cả</MenuItem>
                                {claims.length === 0 ? (
                                    <MenuItem value="" disabled>
                                        Không có yêu cầu APPROVED
                                    </MenuItem>
                                ) : (
                                    (() => {
                                        // Sort claims: recall trước, sau đó warranty, và sort theo ngày tạo
                                        const sorted = [...claims].sort((a, b) => {
                                            const vinA = a.vin || "";
                                            const vinB = b.vin || "";
                                            const recallA = vinRecallMap.get(vinA);
                                            const recallB = vinRecallMap.get(vinB);
                                            const typeA = recallA?.claimType || a.claimType || "WARRANTY";
                                            const typeB = recallB?.claimType || b.claimType || "WARRANTY";
                                            
                                            // Sort theo loại: RECALL trước, sau đó WARRANTY
                                            if (typeA !== typeB) {
                                                return typeA === "RECALL" ? -1 : 1;
                                            }
                                            
                                            // Nếu cùng loại, sort theo ngày tạo (mới nhất trước)
                                            const dateA = new Date(a.openedAt || a.createdAt || a.errorDate || 0).getTime();
                                            const dateB = new Date(b.openedAt || b.createdAt || b.errorDate || 0).getTime();
                                            return dateB - dateA;
                                        });
                                        
                                        return sorted.map(c => {
                                            const vin = c.vin ?? c.plate ?? c.id;
                                            const recallInfo = vinRecallMap.get(vin);
                                            const claimType = recallInfo?.claimType || c.claimType || "WARRANTY";
                                            const typeLabel = claimType === "RECALL" ? "Thu hồi" : "Bảo hành";
                                            const typeColor = claimType === "RECALL" ? "warning" : "info";
                                            
                                            return (
                                                <MenuItem key={c.id} value={c.id}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                                        <Typography variant="body2" sx={{ flex: 1 }}>{vin}</Typography>
                                                        <Chip 
                                                            label={typeLabel} 
                                                            size="small" 
                                                            color={typeColor}
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                                        />
                                                    </Box>
                                                </MenuItem>
                                            );
                                        });
                                    })()
                                )}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Lọc theo Status</InputLabel>
                            <Select
                                value={filterStatus}
                                label="Lọc theo Status"
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <MenuItem value="ALL">Tất cả</MenuItem>
                                <MenuItem value="BOOKED">Đã đặt lịch hẹn</MenuItem>
                                <MenuItem value="IN_PROGRESS">Đang xử lý</MenuItem>
                                <MenuItem value="DONE">Hoàn thành</MenuItem>
                                <MenuItem value="CANCELLED">Đã hủy</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* All Appointments Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                {loadingAppointments ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>VIN</strong></TableCell>
                                <TableCell><strong>Kỹ thuật viên</strong></TableCell>
                                <TableCell><strong>Kỹ năng</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Thời gian</strong></TableCell>
                                <TableCell><strong>Thao tác</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allAppointments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="text.secondary" sx={{ py: 2 }}>
                                            Không có appointments nào
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                allAppointments.map((apt) => {
                                    // Tìm claim từ allClaims (tất cả claims) để lấy VIN
                                    const claim = allClaims.find(c => c.id === apt.claimId);
                                    const technician = technicians.find(t =>
                                        t.id === apt.technicianId ||
                                        t.userId === apt.technicianId ||
                                        t.technicianId === apt.technicianId
                                    );
                                    const technicianName = apt.technicianName || technician?.fullName || technician?.name || technician?.technicianName || "—";
                                    const slots = apt.slots || [];
                                    return (
                                        <TableRow key={apt.id} hover>
                                            <TableCell>{claim?.vin || apt.vin || "—"}</TableCell>
                                            <TableCell>{technicianName}</TableCell>
                                            <TableCell>{apt.requiredSkill ? skillsFromBackend(apt.requiredSkill).join(", ") || apt.requiredSkill : "—"}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={STATUS_LABELS[apt.status] || STATUS_LABELS["BOOKED"]}
                                                    size="small"
                                                    color={
                                                        apt.status === "DONE" ? "success" :
                                                            apt.status === "IN_PROGRESS" ? "warning" :
                                                                apt.status === "CANCELLED" ? "error" : "info"
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {slots.length > 0 ? (
                                                    slots.slice(0, 2).map((s, idx) => (
                                                        <Typography key={idx} variant="caption" display="block">
                                                            {s.slotDate || s.workDate || ""} {fmtTime(s.startTime)}-{fmtTime(s.endTime)}
                                                        </Typography>
                                                    ))
                                                ) : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Xem chi tiết">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => loadAppointmentById(apt.id)}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openEditDialog(apt)}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

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
                                    {claims.length === 0 ? (
                                        <MenuItem value="" disabled>
                                            Không có yêu cầu APPROVED
                                        </MenuItem>
                                    ) : (
                                        (() => {
                                            // Sort claims: recall trước, sau đó warranty, và sort theo ngày tạo
                                            const sorted = [...claims].sort((a, b) => {
                                                const vinA = a.vin || "";
                                                const vinB = b.vin || "";
                                                const recallA = vinRecallMap.get(vinA);
                                                const recallB = vinRecallMap.get(vinB);
                                                const typeA = recallA?.claimType || a.claimType || "WARRANTY";
                                                const typeB = recallB?.claimType || b.claimType || "WARRANTY";
                                                
                                                // Sort theo loại: RECALL trước, sau đó WARRANTY
                                                if (typeA !== typeB) {
                                                    return typeA === "RECALL" ? -1 : 1;
                                                }
                                                
                                                // Nếu cùng loại, sort theo ngày tạo (mới nhất trước)
                                                const dateA = new Date(a.openedAt || a.createdAt || a.errorDate || 0).getTime();
                                                const dateB = new Date(b.openedAt || b.createdAt || b.errorDate || 0).getTime();
                                                return dateB - dateA;
                                            });
                                            
                                            return sorted.map(c => {
                                                const vin = c.vin ?? c.plate ?? c.id;
                                                const recallInfo = vinRecallMap.get(vin);
                                                const claimType = recallInfo?.claimType || c.claimType || "WARRANTY";
                                                const typeLabel = claimType === "RECALL" ? "Thu hồi" : "Bảo hành";
                                                const typeColor = claimType === "RECALL" ? "warning" : "info";
                                                
                                                return (
                                                    <MenuItem key={c.id} value={c.id}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                                            <Typography variant="body2" sx={{ flex: 1 }}>{vin}</Typography>
                                                            <Chip 
                                                                label={typeLabel} 
                                                                size="small" 
                                                                color={typeColor}
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: "0.7rem" }}
                                                            />
                                                        </Box>
                                                    </MenuItem>
                                                );
                                            });
                                        })()
                                    )}
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

            {/* Detail Dialog */}
            <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, appointment: null, loading: false })} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Chi tiết cuộc hẹn
                    <IconButton onClick={() => setDetailDialog({ open: false, appointment: null, loading: false })}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {detailDialog.loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : detailDialog.appointment ? (
                        (() => {
                            const apt = detailDialog.appointment;
                            // Tìm claim từ allClaims (tất cả claims) để lấy VIN
                            const claim = allClaims.find(c => c.id === apt.claimId);
                            const technician = technicians.find(t =>
                                t.id === apt.technicianId ||
                                t.userId === apt.technicianId ||
                                t.technicianId === apt.technicianId
                            );
                            const technicianName = apt.technicianName || technician?.fullName || technician?.name || technician?.technicianName || apt.technicianId || "—";
                            return (
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">VIN</Typography>
                                        <Typography variant="body1">{claim?.vin || apt.vin || "—"}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Trung tâm</Typography>
                                        <Typography variant="body1">{apt.centerName || technician?.centerName || "—"}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Kỹ thuật viên</Typography>
                                        <Typography variant="body1">{technicianName}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Kỹ năng</Typography>
                                        <Typography variant="body1">{apt.requiredSkill ? skillsFromBackend(apt.requiredSkill).join(", ") || apt.requiredSkill : "—"}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Status</Typography>
                                        <Box mt={0.5}>
                                            <Chip
                                                label={STATUS_LABELS[apt.status] || STATUS_LABELS["BOOKED"]}
                                                size="small"
                                                color={
                                                    apt.status === "DONE" ? "success" :
                                                        apt.status === "IN_PROGRESS" ? "warning" :
                                                            apt.status === "CANCELLED" ? "error" : "info"
                                                }
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                                        <Typography variant="body1">{apt.note || "Không có ghi chú"}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Thời gian làm việc</Typography>
                                        {(apt.slots || []).length === 0 ? (
                                            <Typography color="text.secondary">Không có slot</Typography>
                                        ) : (
                                            <Stack spacing={1}>
                                                {apt.slots.map((slot, idx) => (
                                                    <Paper key={idx} sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
                                                        <Typography variant="body2">
                                                            <strong>Ngày:</strong> {slot.slotDate || slot.workDate || "—"}
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            <strong>Giờ:</strong> {fmtTime(slot.startTime)} - {fmtTime(slot.endTime)}
                                                        </Typography>
                                                        {slot.status && (
                                                            <Typography variant="body2">
                                                                <strong>Status:</strong> {slot.status}
                                                            </Typography>
                                                        )}
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        )}
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Tạo lúc</Typography>
                                        <Typography variant="body1">
                                            {apt.createdAt ? dayjs(apt.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            );
                        })()
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialog({ open: false, appointment: null, loading: false })}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, appointment: null })} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Chỉnh sửa 
                    <IconButton onClick={() => setEditDialog({ open: false, appointment: null })}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {editDialog.appointment && (
                        (() => {
                            const apt = editDialog.appointment;
                            // Tìm claim từ allClaims (tất cả claims) để lấy VIN
                            const claim = allClaims.find(c => c.id === apt.claimId);
                            const technician = technicians.find(t =>
                                t.id === apt.technicianId ||
                                t.userId === apt.technicianId ||
                                t.technicianId === apt.technicianId
                            );
                            const technicianName = apt.technicianName || technician?.fullName || technician?.name || technician?.technicianName || "—";
                            return (
                                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                    {/* Thông tin Appointment (Read-only) */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "primary.main" }}>
                                            Thông tin 
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">VIN</Typography>
                                        <Typography variant="body1">{claim?.vin || apt.vin || "—"}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Trung tâm</Typography>
                                        <Typography variant="body1">{apt.centerName || technician?.centerName || "—"}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Status</Typography>
                                        <Box mt={0.5}>
                                            <Chip
                                                label={STATUS_LABELS[apt.status] || STATUS_LABELS["BOOKED"]}
                                                size="small"
                                                color={
                                                    apt.status === "DONE" ? "success" :
                                                        apt.status === "IN_PROGRESS" ? "warning" :
                                                            apt.status === "CANCELLED" ? "error" : "info"
                                                }
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 1 }} />
                                    </Grid>

                                    {/* Các field có thể chỉnh sửa */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "primary.main" }}>
                                            Chỉnh sửa
                                        </Typography>
                                    </Grid>
                                    
                                    {/* Kỹ thuật viên */}
                                    <Grid item xs={12}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Kỹ thuật viên</InputLabel>
                                            <Select
                                                value={editForm.technicianId || ""}
                                                label="Kỹ thuật viên"
                                                onChange={async (e) => {
                                                    const techId = e.target.value;
                                                    setEditForm(prev => ({ ...prev, technicianId: techId }));
                                                    if (techId) {
                                                        try {
                                                            await loadEditMonthSlotsForTech(techId);
                                                        } catch (err) {
                                                            console.warn("Failed to load slots:", err);
                                                        }
                                                    }
                                                }}
                                            >
                                                <MenuItem value="">Chưa chọn</MenuItem>
                                                {technicians.map(tech => (
                                                    <MenuItem key={tech.id || tech.userId || tech.technicianId} value={tech.id || tech.userId || tech.technicianId}>
                                                        {tech.fullName || tech.name || tech.technicianName || tech.id || "—"}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary" }}>
                                                Chọn kỹ thuật viên mới cho appointment này
                                            </Typography>
                                        </FormControl>
                                    </Grid>
                                    
                                    {/* Kỹ năng */}
                                    <Grid item xs={12}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Kỹ năng yêu cầu</InputLabel>
                                            <Select
                                                value={editForm.requiredSkill || ""}
                                                label="Kỹ năng yêu cầu"
                                                onChange={(e) => setEditForm(prev => ({ ...prev, requiredSkill: e.target.value }))}
                                            >
                                                <MenuItem value="">Chưa chọn</MenuItem>
                                                {SKILLS.map(skill => (
                                                    <MenuItem key={skill} value={skill}>{skill}</MenuItem>
                                                ))}
                                            </Select>
                                            <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary" }}>
                                                Chọn kỹ năng yêu cầu cho appointment này
                                            </Typography>
                                        </FormControl>
                                    </Grid>
                                    
                                    {/* Calendar và Slots cho Edit */}
                                    {editForm.technicianId && (
                                        <>
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                                                    Chọn slot làm việc
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                {/* Edit Calendar */}
                                                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                                        <IconButton size="small" onClick={() => { if (editCalMonth === 0) { setEditCalMonth(11); setEditCalYear(y => y - 1); } else setEditCalMonth(m => m - 1); }}>
                                                            ◀
                                                        </IconButton>
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                                                            {new Date(editCalYear, editCalMonth).toLocaleString("vi-VN", { month: "long", year: "numeric" })}
                                                        </Typography>
                                                        <IconButton size="small" onClick={() => { if (editCalMonth === 11) { setEditCalMonth(0); setEditCalYear(y => y + 1); } else setEditCalMonth(m => m + 1); }}>
                                                            ▶
                                                        </IconButton>
                                                    </Box>
                                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1.5 }}>
                                                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(x => (
                                                            <Typography key={x} align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "primary.main", py: 0.5 }}>
                                                                {x}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75 }}>
                                                        {getMonthDays(editCalYear, editCalMonth).map((d, i) => {
                                                            const dStr = d ? fmtDate(d) : null;
                                                            const isActive = dStr && dStr === editActiveDate;
                                                            const past = d && dayjs(d).isBefore(dayjs().startOf("day"));
                                                            const isToday = dStr === fmtDate(new Date());
                                                            return (
                                                                <Paper
                                                                    key={i}
                                                                    onClick={() => d && !past && setEditActiveDate(fmtDate(d))}
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
                                                                        "&:hover": d && !past ? { bgcolor: isActive ? "action.selected" : "action.hover", borderColor: "primary.main" } : {}
                                                                    }}
                                                                >
                                                                    <Typography sx={{ fontWeight: isActive ? 700 : 600, fontSize: "0.85rem", color: past ? "text.disabled" : isActive ? "primary.main" : isToday ? "primary.main" : "text.primary" }}>
                                                                        {d ? d.getDate() : ""}
                                                                    </Typography>
                                                                </Paper>
                                                            );
                                                        })}
                                                    </Box>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                {/* Edit Slots Panel */}
                                                {editActiveDate ? (
                                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                                        <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: "0.95rem" }}>
                                                            {dayjs(editActiveDate).format("DD/MM/YYYY")}
                                                        </Typography>
                                                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                                                            {getEditMergedSlotsForActiveDate().length === 0 ? (
                                                                <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 3 }}>
                                                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                                                        Không có slot cho ngày này
                                                                    </Typography>
                                                                </Box>
                                                            ) : getEditMergedSlotsForActiveDate().map((s, idx) => {
                                                                const key = s.slotId ?? `${editActiveDate}|${s.startTime}`;
                                                                const selected = editForm.selectedSlotKeys.has(key);
                                                                const disabled = s.status === "CANCELLED_BY_TECH" || s.status === "BLOCKED" || s.status === "HOLD";
                                                                return (
                                                                    <Tooltip key={key} title={s.status ?? "FREE"} arrow>
                                                                        <Paper
                                                                            onClick={() => !disabled && toggleEditSlot(s)}
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
                                                                                "&:hover": !disabled ? { bgcolor: selected ? "action.selected" : "action.hover", borderColor: "primary.main" } : {}
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
                                                ) : (
                                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", textAlign: "center", py: 4 }}>
                                                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                                            Chọn ngày để xem slot
                                                        </Typography>
                                                    </Paper>
                                                )}
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                                                    Đã chọn {editForm.selectedSlotKeys.size} slot(s)
                                                </Typography>
                                            </Grid>
                                        </>
                                    )}
                                    
                                    {/* Ghi chú */}
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Ghi chú"
                                            fullWidth
                                            multiline
                                            rows={3}
                                            value={editForm.note}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                            size="small"
                                            placeholder="Nhập ghi chú cho appointment..."
                                        />
                                    </Grid>
                                </Grid>
                            );
                        })()
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog({ open: false, appointment: null })}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdate}
                        disabled={editLoading}
                    >
                        {editLoading ? <CircularProgress size={16} /> : "Cập nhật"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack(prev => ({ ...prev, open: false }))}>
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}