// src/components/admin/TechnicianManagement.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Stack,
    Button,
    Typography,
    TextField,
    InputAdornment,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    CircularProgress,
    Card,
    Snackbar,
    Alert,
    Pagination,
    Select,
    FormControl,
    InputLabel,
    Backdrop,
    Checkbox,
    ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, styled } from "@mui/material/styles";
import technicianService from "../../services/technicianService";
import centerService from "../../services/centerService";

const GlassCard = styled(Card)(({ theme }) => ({
    borderRadius: 20,
    border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
        theme.palette.background.paper,
        0.75
    )} 100%)`,
    boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
}));

const SKILL_OPTIONS = [
    "TRIAGE",
    "HV_POWERTRAIN",
    "CHARGING",
    "LOWV_COMM",
    "MECH_SEALING",
    "SOFTWARE_FIRMWARE",
];

export default function TechnicianManagement({ search, setSearch, theme }) {
    const [technicians, setTechnicians] = useState([]);
    const [filteredTechs, setFilteredTechs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
    const [centers, setCenters] = useState([]);
    const [selectedCenter, setSelectedCenter] = useState("all");

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [openTechModal, setOpenTechModal] = useState(false);
    const [techUser, setTechUser] = useState(null);
    const [techSkills, setTechSkills] = useState([]);
    const [techErrors, setTechErrors] = useState({});
    const [techModalLoading, setTechModalLoading] = useState(false);

    const searchDebounce = useRef(null);

    const formatDate = (iso) => {
        try {
            if (!iso) return "-";
            const d = new Date(iso);
            if (isNaN(d)) return "-";
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}/${mm}/${dd}`;
        } catch {
            return "-";
        }
    };

    const fetchCenters = async () => {
        try {
            const res = await centerService.getAll();
            const payload = res?.data ?? res;
            setCenters(Array.isArray(payload) ? payload : []);
        } catch {
            setCenters([]);
        }
    };

    const getCenterName = (centerId) => {
        if (!centerId) return "-";
        const c = centers.find((x) => x.id === centerId || x.centerId === centerId);
        return c ? c.centerName || c.name || "-" : "-";
    };

    const loadAllTechnicians = async () => {
        try {
            setLoading(true);
            const res = await technicianService.getAll();
            const payload = res?.data ?? res;
            setTechnicians(Array.isArray(payload) ? payload : []);
        } catch (err) {
            setSnack({ open: true, severity: "error", message: "Không thể tải kỹ thuật viên" });
        } finally {
            setLoading(false);
        }
    };

    // Filter theo search và trung tâm
    const applyFilters = () => {
        let list = [...technicians];
        if (selectedCenter !== "all") {
            list = list.filter((t) => t.centerId === selectedCenter);
        }
        if (search && search.trim() !== "") {
            const q = search.toLowerCase();
            list = list.filter(
                (t) =>
                    (t.fullName || "").toLowerCase().includes(q) ||
                    (t.email || "").toLowerCase().includes(q)
            );
        }
        setFilteredTechs(list);
    };

    useEffect(() => {
        fetchCenters();
        loadAllTechnicians();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [technicians, search, selectedCenter]);

    const openTech = async (user) => {
        setTechUser(user);
        setTechSkills([]);
        setTechErrors({});
        setOpenTechModal(true);
        setTechModalLoading(true);
        try {
            const res = await technicianService.getById(user.userId || user.id);
            const payload = res?.data ?? res;
            setTechUser(payload || user);
            setTechSkills(Array.isArray(payload?.skills) ? payload.skills : []);
        } catch {
            setTechSkills([]);
        } finally {
            setTechModalLoading(false);
        }
    };

    const validateTech = () => {
        const err = {};
        if (!Array.isArray(techSkills) || techSkills.length === 0)
            err.skills = "Chọn ít nhất 1 kỹ năng";
        setTechErrors(err);
        return Object.keys(err).length === 0;
    };

    const createTechProfile = async () => {
        if (!techUser) return;
        if (!validateTech()) {
            setSnack({ open: true, severity: "error", message: "Vui lòng chọn ít nhất 1 kỹ năng" });
            return;
        }
        try {
            setActionLoading(true);
            const res = await technicianService.createProfile(techUser.userId || techUser.id, {
                skills: techSkills,
            });
            setSnack({ open: true, severity: "success", message: "Tạo hồ sơ thành công" });
            loadAllTechnicians();
        } catch {
            setSnack({ open: true, severity: "error", message: "Tạo hồ sơ thất bại" });
        } finally {
            setActionLoading(false);
        }
    };

    const updateTechProfile = async () => {
        if (!techUser) return;
        if (!validateTech()) {
            setSnack({ open: true, severity: "error", message: "Vui lòng chọn ít nhất 1 kỹ năng" });
            return;
        }
        try {
            setActionLoading(true);
            await technicianService.updateProfile(techUser.userId || techUser.id, {
                skills: techSkills,
            });
            setSnack({ open: true, severity: "success", message: "Cập nhật kỹ năng thành công" });
            loadAllTechnicians();
        } catch {
            setSnack({ open: true, severity: "error", message: "Cập nhật thất bại" });
        } finally {
            setActionLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(filteredTechs.length / pageSize));
    const visible = filteredTechs.slice(page * pageSize, page * pageSize + pageSize);

    return (
        <Box>
            <Backdrop open={loading || actionLoading} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <CircularProgress color="inherit" />
            </Backdrop>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Quản lý kỹ thuật viên</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Xem, tạo, cập nhật kỹ năng kỹ thuật viên.
                    </Typography>
                </Box>
                <Button variant="contained" onClick={loadAllTechnicians}>Tải lại</Button>
            </Stack>

            <GlassCard>
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mb={2} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên hoặc email..."
                            value={search || ""}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 250 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Trung tâm</InputLabel>
                            <Select
                                value={selectedCenter}
                                label="Trung tâm"
                                onChange={(e) => {
                                    setSelectedCenter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="all">Tất cả trung tâm</MenuItem>
                                {centers.map((c) => (
                                    <MenuItem key={c.id} value={c.id || c.centerId}>
                                        {c.centerName || c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box sx={{ ml: "auto" }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: "inline", mr: 1 }}>
                                Số bản ghi:
                            </Typography>
                            <Select
                                size="small"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(0);
                                }}
                            >
                                {[5, 10, 25, 50].map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    </Stack>

                    <Box sx={{ width: "100%", overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "separate",
                                borderSpacing: 0,
                                tableLayout: "auto",
                                backgroundColor: alpha(theme.palette.background.paper, 0.05),
                                borderRadius: 12,
                                overflow: "hidden",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                        color: theme.palette.getContrastText(theme.palette.background.default),
                                    }}
                                >
                                    {["STT", "Tên", "Email", "SĐT", "Kỹ năng", "Trung tâm", "Hành động"].map((col) => (
                                        <th
                                            key={col}
                                            style={{
                                                padding: "12px 14px",
                                                textAlign: "center",
                                                fontWeight: 700,
                                                borderBottom: `2px solid ${alpha(theme.palette.divider, 0.4)}`,
                                                fontSize: "0.9rem",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {visible.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            style={{
                                                padding: 14,
                                                textAlign: "center",
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                                color: alpha(theme.palette.text.primary, 0.8),
                                            }}
                                        >
                                            Không có kỹ thuật viên.
                                        </td>
                                    </tr>
                                ) : (
                                    visible.map((t, i) => (
                                        <tr
                                            key={t.id}
                                            style={{
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                                backgroundColor: i % 2 === 0
                                                    ? alpha(theme.palette.background.default, 0.3)
                                                    : alpha(theme.palette.background.paper, 0.1),
                                                transition: "background 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = alpha(theme.palette.primary.main, 0.1))}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = i % 2 === 0
                                                ? alpha(theme.palette.background.default, 0.3)
                                                : alpha(theme.palette.background.paper, 0.1))}
                                        >
                                            <td style={{ textAlign: "center", padding: "10px 8px" }}>
                                                {page * pageSize + i + 1}
                                            </td>
                                            <td style={{ textAlign: "left", padding: "10px 12px", wordBreak: "break-word" }}>
                                                {t.fullName}
                                            </td>
                                            <td style={{ textAlign: "left", padding: "10px 12px", wordBreak: "break-word" }}>
                                                {t.email}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 12px" }}>
                                                {t.phone || "-"}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 12px", wordBreak: "break-word" }}>
                                                {Array.isArray(t.skills) ? t.skills.join(", ") : "-"}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 12px" }}>
                                                {getCenterName(t.centerId)}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 12px" }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => openTech(t)}
                                                    sx={{
                                                        fontSize: "0.75rem",
                                                        borderRadius: 3,
                                                        px: 1.5,
                                                        py: 0.25,
                                                    }}
                                                >
                                                    XEM / SỬA
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Tổng: {filteredTechs.length} kỹ thuật viên • Trang {page + 1} / {totalPages}
                        </Typography>
                        <Pagination
                            count={totalPages}
                            page={Math.min(Math.max(1, page + 1), totalPages)}
                            onChange={(e, v) => setPage(v - 1)}
                            color="primary"
                        />
                    </Box>
                </CardContent>
            </GlassCard>

            {/* Dialog giữ nguyên */}
            <Dialog open={openTechModal} onClose={() => setOpenTechModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Kỹ thuật viên: {techUser?.fullName ?? ""}</DialogTitle>
                <DialogContent>
                    {techModalLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Stack spacing={2} mt={1}>
                            <Typography>Email: {techUser?.email}</Typography>
                            <Typography>SĐT: {techUser?.phone || "-"}</Typography>
                            <FormControl fullWidth>
                                <InputLabel>Kỹ năng</InputLabel>
                                <Select
                                    multiple
                                    value={techSkills}
                                    onChange={(e) =>
                                        setTechSkills(
                                            typeof e.target.value === "string"
                                                ? e.target.value.split(",")
                                                : e.target.value
                                        )
                                    }
                                    renderValue={(s) => s.join(", ")}
                                    label="Kỹ năng"
                                >
                                    {SKILL_OPTIONS.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            <Checkbox checked={techSkills.indexOf(s) > -1} />
                                            <ListItemText primary={s} />
                                        </MenuItem>
                                    ))}
                                </Select>
                                {techErrors.skills && (
                                    <Typography variant="caption" color="error">
                                        {techErrors.skills}
                                    </Typography>
                                )}
                            </FormControl>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTechModal(false)}>Đóng</Button>
                    {techUser?.technicianId ? (
                        <Button variant="contained" onClick={updateTechProfile} disabled={actionLoading}>
                            {actionLoading ? <CircularProgress size={18} /> : "Cập nhật kỹ năng"}
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={createTechProfile} disabled={actionLoading}>
                            {actionLoading ? <CircularProgress size={18} /> : "Tạo hồ sơ kỹ thuật viên"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
            >
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
