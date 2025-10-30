"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Box, Stack, Button, Typography, TextField, InputAdornment, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
    CircularProgress, Card, Snackbar, Alert, Pagination, Select, FormControl, InputLabel,
    Backdrop, Table, TableHead, TableBody, TableRow, TableCell
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, styled } from "@mui/material/styles";
import authService from "../../services/authService";
import centerService from "../../services/centerService";

const GlassCard = styled(Card)(({ theme }) => ({
    borderRadius: 20,
    border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
    boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
}));

export default function TechnicianManagement({ search, setSearch, theme }) {
    const [technicians, setTechnicians] = useState([]);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [centerFilter, setCenterFilter] = useState("");
    const [skillFilter, setSkillFilter] = useState("");
    const [sortField, setSortField] = useState("stt");
    const [sortOrder, setSortOrder] = useState("asc");

    const [listLoading, setListLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

    const [openEdit, setOpenEdit] = useState(false);
    const [editForm, setEditForm] = useState({ id: "", fullName: "", email: "", phone: "", centerId: "", skills: [] });
    const [editErrors, setEditErrors] = useState({});

    const [centers, setCenters] = useState([]);
    const searchDebounceRef = useRef(null);
    const isMountedRef = useRef(true);

    // Cleanup khi component unmount
    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    // Load all centers
    useEffect(() => {
        const fetchCenters = async () => {
            try {
                const res = await centerService.getAll();
                if (isMountedRef.current) setCenters(res || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCenters();
    }, []);

    // Fetch technicians
    const fetchTechnicians = async (p = page, size = pageSize, q = search, center = centerFilter, skill = skillFilter) => {
        try {
            setListLoading(true);
            const res = await authService.getAllUsers(p, size, q);
            let allTechs = res?.content?.filter(u => u.role === "SC_TECHNICIAN") || [];
            if (center) allTechs = allTechs.filter(u => u.centerId === center);
            if (skill) allTechs = allTechs.filter(u => (u.skills || []).some(s => s.toLowerCase().includes(skill.toLowerCase())));
            // Sort
            allTechs.sort((a, b) => {
                let valA = sortField === "stt" ? a.id : (a[sortField] || "").toString().toLowerCase();
                let valB = sortField === "stt" ? b.id : (b[sortField] || "").toString().toLowerCase();
                if (valA < valB) return sortOrder === "asc" ? -1 : 1;
                if (valA > valB) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
            if (isMountedRef.current) {
                setTechnicians(allTechs);
                setTotalPages(res?.totalPages || 1);
                setTotalElements(allTechs.length);
                setPage(res?.number || p);
            }
        } catch (err) {
            if (isMountedRef.current) setSnack({ open: true, severity: "error", message: "Không thể tải danh sách kỹ thuật viên" });
        } finally {
            if (isMountedRef.current) setListLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicians(page, pageSize, search, centerFilter, skillFilter);
    }, [page, pageSize, sortField, sortOrder]);

    // Debounce search/filter
    useEffect(() => {
        const handler = setTimeout(() => {
            if (isMountedRef.current) {
                setPage(0);
                fetchTechnicians(0, pageSize, search, centerFilter, skillFilter);
            }
        }, 400);

        return () => clearTimeout(handler); // luôn trả về function
    }, [search, centerFilter, skillFilter]);

    const handlePageChange = (event, value) => {
        const newPage = value - 1;
        setPage(newPage);
        fetchTechnicians(newPage, pageSize, search, centerFilter, skillFilter);
    };
    const handlePageSizeChange = (e) => setPageSize(Number(e.target.value));

    const getCenterName = (centerId) => {
        if (!centerId) return "-";
        const center = centers.find(c => c.id === centerId);
        return center ? center.centerName || center.name : "-";
    };

    const openEditModal = (tech) => {
        setEditForm({
            id: tech.id,
            fullName: tech.fullName || "",
            email: tech.email || "",
            phone: tech.phone || "",
            centerId: tech.centerId || "",
            skills: tech.skills || [],
        });
        setEditErrors({});
        setOpenEdit(true);
    };

    const handleUpdateTechnician = async () => {
        try {
            setActionLoading(true);
            await authService.adminUpdateUser(editForm.id, {
                fullName: editForm.fullName,
                email: editForm.email,
                phone: editForm.phone,
                centerId: editForm.centerId || undefined,
                skills: editForm.skills,
            });
            if (isMountedRef.current) {
                setSnack({ open: true, severity: "success", message: "Cập nhật kỹ thuật viên thành công" });
                setOpenEdit(false);
                fetchTechnicians(page, pageSize, search, centerFilter, skillFilter);
            }
        } catch (err) {
            console.error(err);
            if (isMountedRef.current) setSnack({ open: true, severity: "error", message: "Cập nhật thất bại" });
        } finally {
            if (isMountedRef.current) setActionLoading(false);
        }
    };

    const resetFilters = () => {
        setSearch("");
        setCenterFilter("");
        setSkillFilter("");
        setSortField("stt");
        setSortOrder("asc");
    };

    return (
        <Box>
            {/* Loading */}
            <Backdrop open={listLoading || actionLoading} sx={{ zIndex: t => t.zIndex.drawer + 2 }}>
                <CircularProgress color="inherit" />
            </Backdrop>

            {/* Header */}
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-end" gap={2} mb={2}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Quản lý kỹ thuật viên</Typography>
                    <Typography variant="body2" color="text.secondary">Xem, sửa thông tin và kỹ năng kỹ thuật viên.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={resetFilters}>Reset filter</Button>
                </Stack>
            </Stack>

            {/* Filters */}
            <GlassCard>
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center" mb={2}>
                        <TextField size="small" placeholder="Tìm theo tên/email..." value={search} onChange={e => setSearch(e.target.value)}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                            sx={{ minWidth: { xs: "100%", md: 200 } }} />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Trung tâm</InputLabel>
                            <Select value={centerFilter} label="Trung tâm" onChange={e => setCenterFilter(e.target.value)}>
                                <MenuItem value="">Tất cả</MenuItem>
                                {centers.map(c => <MenuItem key={c.id} value={c.id}>{c.centerName || c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" placeholder="Kỹ năng" value={skillFilter} onChange={e => setSkillFilter(e.target.value)} sx={{ minWidth: 160 }} />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Sort theo</InputLabel>
                            <Select value={sortField} onChange={e => setSortField(e.target.value)}>
                                <MenuItem value="stt">STT</MenuItem>
                                <MenuItem value="fullName">Tên</MenuItem>
                                <MenuItem value="email">Email</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Thứ tự</InputLabel>
                            <Select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                                <MenuItem value="asc">Tăng</MenuItem>
                                <MenuItem value="desc">Giảm</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
                            <Typography variant="body2" color="text.secondary">Số bản ghi:</Typography>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select value={pageSize} onChange={handlePageSizeChange}>
                                    {[5, 10, 25, 50].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                    </Stack>

                    {/* Table */}
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableRow>
                                {["STT", "Tên", "Email", "SĐT", "Trung tâm", "Kỹ năng", "Hành động"].map(h => (
                                    <TableCell key={h} align="center" sx={{ fontSize: 13, color: "text.secondary", borderBottom: `1px solid ${theme.palette.divider}` }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {technicians.length > 0 ? technicians.map((u, idx) => (
                                <TableRow key={u.id} hover>
                                    <TableCell align="center">{page * pageSize + idx + 1}</TableCell>
                                    <TableCell align="center">{u.fullName}</TableCell>
                                    <TableCell align="center">{u.email}</TableCell>
                                    <TableCell align="center">{u.phone || "-"}</TableCell>
                                    <TableCell align="center">{getCenterName(u.centerId)}</TableCell>
                                    <TableCell align="center">{(u.skills || []).join(", ") || "-"}</TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button size="small" variant="outlined" onClick={() => openEditModal(u)}>Cập nhật</Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}>Không có kỹ thuật viên.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">Tổng: {totalElements} kỹ thuật viên • Trang {page + 1}/{Math.max(1, totalPages)}</Typography>
                        <Pagination count={Math.max(1, totalPages)} page={page + 1} onChange={handlePageChange} color="primary" showFirstButton showLastButton />
                    </Box>
                </CardContent>
            </GlassCard>

            {/* Edit Dialog */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Cập nhật kỹ thuật viên</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField label="Tên" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} fullWidth error={!!editErrors.fullName} helperText={editErrors.fullName} />
                        <TextField label="Email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} fullWidth error={!!editErrors.email} helperText={editErrors.email} />
                        <TextField label="SĐT" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} fullWidth />
                        <FormControl fullWidth size="small">
                            <InputLabel>Trung tâm</InputLabel>
                            <Select value={editForm.centerId} label="Trung tâm" onChange={e => setEditForm({ ...editForm, centerId: e.target.value })}>
                                <MenuItem value="">Không có</MenuItem>
                                {centers.map(c => <MenuItem key={c.id} value={c.id}>{c.centerName || c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Kỹ năng (phân tách bằng ,)" value={editForm.skills.join(", ")} onChange={e => setEditForm({ ...editForm, skills: e.target.value.split(",").map(s => s.trim()) })} fullWidth />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleUpdateTechnician} disabled={actionLoading}>Cập nhật</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.severity} sx={{ width: '100%' }}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
