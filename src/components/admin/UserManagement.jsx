"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Stack,
  Button,
  Typography,
  TextField,
  InputAdornment,
  CardContent,
  Chip,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, styled } from "@mui/material/styles";
import axiosInstance from "../../services/axiosInstance";
import centerService from "../../services/centerService";

// Local GlassCard (đơn giản, không phụ thuộc Dashboard export)
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
    theme.palette.background.paper,
    0.75
  )} 100%)`,
  boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
}));

export default function UserManagement({ search, setSearch, theme }) {
  // data & pagination
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0); // backend page index (0-based)
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // filters
  const [roleFilter, setRoleFilter] = useState(""); // "" => all

  // loading & snack
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  // dialogs & forms
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "SC_STAFF",
    centerId: "",
  });
  const [createErrors, setCreateErrors] = useState({});

  const [editForm, setEditForm] = useState({
    id: "",
    fullName: "",
    email: "",
    phone: "",
    role: "",
    centerId: "",
    newPassword: "",
  });
  const [editErrors, setEditErrors] = useState({});

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // debounce search (we use search prop from Dashboard)
  const searchDebounceRef = useRef(null);

  // Utility: parse server validation errors into { fieldErrors: {}, message: "" }
  function parseServerErrors(err) {
    const out = { fieldErrors: {}, message: "" };
    const data = err?.response?.data;
    if (!data) {
      out.message = err.message || "Lỗi không xác định từ server";
      return out;
    }
    if (typeof data.message === "string") out.message = data.message;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      data.errors.forEach((e) => {
        if (e.field) out.fieldErrors[e.field] = e.message || e.defaultMessage || JSON.stringify(e);
      });
      if (!out.message) out.message = "Một số trường không hợp lệ";
    }
    if (Array.isArray(data.fieldErrors)) {
      data.fieldErrors.forEach((e) => {
        if (e.field) out.fieldErrors[e.field] = e.defaultMessage || e.message || JSON.stringify(e);
      });
      if (!out.message) out.message = "Một số trường không hợp lệ";
    }
    if (data.errors && typeof data.errors === "object" && !Array.isArray(data.errors)) {
      Object.keys(data.errors).forEach((k) => {
        const v = data.errors[k];
        out.fieldErrors[k] = Array.isArray(v) ? v.join(", ") : String(v);
      });
      if (!out.message) out.message = "Một số trường không hợp lệ";
    }
    if (!out.message && typeof data === "string") out.message = data;
    return out;
  }

  // fetch users (supports pageable response: { content, totalPages, number, totalElements })
  const fetchUsers = async (p = page, size = pageSize, q = search, role = roleFilter) => {
    try {
      setListLoading(true);
      // Endpoint per your swagger: GET /api/auth/admin/users
      const res = await axiosInstance.get("/auth/admin/users", { params: { q: q || undefined, role: role || undefined, page: p, size } });
      const data = res.data;
      // if pageable structure
      if (data && Array.isArray(data.content)) {
        setUsers(data.content.filter(user => !user.deleted));
        setTotalPages(Number.isInteger(data.totalPages) ? data.totalPages : 0);
        setTotalElements(Number.isInteger(data.totalElements) ? data.totalElements : 0);
        setPage(typeof data.number === "number" ? data.number : p);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
        setTotalElements(data.length);
        setPage(0);
      } else {
        // fallback: try data.content again or empty
        setUsers(Array.isArray(data?.content) ? data.content : []);
        setTotalPages(data?.totalPages || 0);
        setTotalElements(data?.totalElements || 0);
      }
    } catch (err) {
      console.error("Lỗi load users:", err);
      setSnack({ open: true, severity: "error", message: "Không thể tải danh sách người dùng" });
      setUsers([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setListLoading(false);
    }
  };

  // Thêm state và useEffect để tải danh sách trung tâm
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const res = await axiosInstance.get("/centers/get-all");
        setCenters(res.data || []);
      } catch (err) {
        console.error("Lỗi tải trung tâm:", err);
      }
    };
    fetchCenters();
  }, []);

  // initial load and pageSize changes
  useEffect(() => {
    fetchUsers(0, pageSize, search, roleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // watch search prop and roleFilter -> debounce fetch
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(0);
      fetchUsers(0, pageSize, search, roleFilter);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  // handles
  const handlePageChange = (event, value) => {
    const newPage = value - 1;
    setPage(newPage);
    fetchUsers(newPage, pageSize, search, roleFilter);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(0);
    // fetchUsers will be triggered by useEffect(pageSize)
  };

  // Create
  const validateCreateForm = () => {
    const err = {};
    if (!createForm.fullName?.trim()) err.fullName = "Họ tên là bắt buộc";
    if (!createForm.email?.trim()) err.email = "Email là bắt buộc";
    if (!createForm.password) err.password = "Mật khẩu là bắt buộc";
    setCreateErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateCreateForm()) {
      setSnack({ open: true, severity: "error", message: "Vui lòng sửa lỗi trên form" });
      return;
    }
    try {
      setActionLoading(true);
      const payload = {
        fullName: createForm.fullName,
        centerId: createForm.centerId || undefined,
        password: createForm.password,
        email: createForm.email,
        phone: createForm.phone,
        role: createForm.role,
      };
      // POST /api/auth/register
      await axiosInstance.post("/auth/register", payload);
      setSnack({ open: true, severity: "success", message: "Tạo người dùng thành công" });
      setOpenCreate(false);
      setCreateForm({ fullName: "", email: "", phone: "", password: "", role: "SC_STAFF", centerId: "" });
      setCreateErrors({});
      fetchUsers(0, pageSize, search, roleFilter);
    } catch (err) {
      console.error("Lỗi tạo user:", err);
      const parsed = parseServerErrors(err);
      setCreateErrors(parsed.fieldErrors || {});
      setSnack({ open: true, severity: "error", message: parsed.message || "Tạo người dùng thất bại" });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit
  const openEditModal = async (user) => {
    try {
      setEditForm({
        id: user.id,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
        centerId: user.centerId || user.centerID || "",
        newPassword: "",
        hasTechnicianProfile: false, // mặc định
      });

      setEditErrors({});
      setOpenEdit(true);
    } catch (err) {
      console.error("Lỗi khi mở form edit:", err);
      setSnack({
        open: true,
        severity: "error",
        message: "Không thể mở form chỉnh sửa người dùng",
      });
    }
  };

  const validateEditForm = () => {
    const err = {};
    if (!editForm.fullName?.trim()) err.fullName = "Họ tên là bắt buộc";
    if (!editForm.email?.trim()) err.email = "Email là bắt buộc";
    setEditErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!validateEditForm()) {
      setSnack({ open: true, severity: "error", message: "Vui lòng sửa lỗi trên form" });
      return;
    }

    try {
      setActionLoading(true);

      // Cập nhật thông tin chung
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        centerId: editForm.centerId || undefined,
      };
      await axiosInstance.put(`/auth/admin/users/${editForm.id}`, payload);

      // Nếu cần mật khẩu mới → gọi API đổi mật khẩu riêng
      if (editForm.newPassword?.trim()) {
        await axiosInstance.put(`/auth/admin/users/${editForm.id}/password`, {
          newPassword: editForm.newPassword,
        });
      }

      // Nếu có centerId → gọi API gán/cập nhật center riêng
      if (editForm.centerId) {
        await axiosInstance.put(`/auth/admin/users/${editForm.centerId}/update-center`, null, {
          params: { userId: editForm.id },
        });
      }

      // Hoàn tất
      setSnack({ open: true, severity: "success", message: "Cập nhật người dùng thành công" });
      setOpenEdit(false);
      fetchUsers(page, pageSize, search, roleFilter);
    } catch (err) {
      console.error("Lỗi cập nhật user:", err);
      const parsed = parseServerErrors(err);
      setEditErrors(parsed.fieldErrors || {});
      setSnack({ open: true, severity: "error", message: parsed.message || "Cập nhật thất bại" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete
  const openDeleteDialog = (userId) => {
    setDeleteTargetId(userId);
    setOpenDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    try {
      setActionLoading(true);
      // DELETE /api/auth/users/{userId}
      await axiosInstance.delete(`/auth/users/${deleteTargetId}`);
      setSnack({ open: true, severity: "success", message: "Xóa thành công" });
      setOpenDeleteConfirm(false);
      setDeleteTargetId(null);

      // adjust page if needed
      const isPageEmptyAfterDelete = users.length === 1 && page > 0;
      const newPage = isPageEmptyAfterDelete ? page - 1 : page;
      fetchUsers(newPage, pageSize, search, roleFilter);
    } catch (err) {
      console.error("Lỗi xóa user:", err);
      const parsed = parseServerErrors(err);
      setSnack({ open: true, severity: "error", message: parsed.message || "Xóa thất bại" });
    } finally {
      setActionLoading(false);
    }
  };

  // format date as yyyy/mm/dd
  const formatDate = (iso) => {
    try {
      return new Date(iso || Date.now()).toISOString().slice(0, 10).replace(/-/g, "/");
    } catch {
      return "-";
    }
  };

  const getCenterName = (centerId) => {
    if (!centerId) return "-";
    const center = centers.find((c) => c.id === centerId || c.centerId === centerId);
    return center ? center.centerName || center.name : `#${centerId}`;
  };

  return (
    <Box>
      {/* Backdrop for list load or action */}
      <Backdrop open={listLoading || actionLoading} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-end" }}
        gap={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Quản lý người dùng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo, phân quyền, xem / sửa / xóa tài khoản.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Thêm người dùng
          </Button>
        </Stack>
      </Stack>

      {/* Table */}
      <GlassCard>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            mb={2}
          >
            <TextField
              size="small"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
              sx={{ minWidth: { xs: "100%", md: 320 } }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={roleFilter}
                label="Vai trò"
                onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="SC_STAFF">SC_STAFF</MenuItem>
                <MenuItem value="SC_TECHNICIAN">SC_TECHNICIAN</MenuItem>
                <MenuItem value="EVM_STAFF">EVM_STAFF</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">Số bản ghi:</Typography>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={pageSize} onChange={handlePageSizeChange}>
                  {[5, 10, 25, 50].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                </Select>
              </FormControl>
            </Box>
          </Stack>

          <Box sx={{ width: "100%", overflow: "auto" }}>
            <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <Box component="thead" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <Box component="tr">
                  {["STT", "Họ tên", "Email", "SĐT", "Vai trò", "Center", "Ngày tạo", "Hành động"].map((h) => (
                    <Box key={h} component="th" sx={{
                      textAlign: "center",
                      verticalAlign: "middle",
                      p: 1.25,
                      fontSize: 13,
                      color: "text.secondary",
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      whiteSpace: "nowrap",
                    }}>{h}</Box>
                  ))}
                </Box>
              </Box>

              <Box component="tbody">
                {users.length > 0 ? (
                  users
                    .filter((u) =>
                      (u.fullName || "").toLowerCase().includes((search || "").toLowerCase()) ||
                      (u.email || "").toLowerCase().includes((search || "").toLowerCase())
                    )
                    .map((u, idx) => (
                      <Box key={u.id || idx} component="tr" sx={{ "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.03) } }}>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{page * pageSize + idx + 1}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{u.fullName}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{u.email}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{u.phone || "-"}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <Chip size="small" label={u.role} color={u.role === "ADMIN" ? "secondary" : u.role === "EVM_STAFF" ? "info" : u.role === "SC_TECHNICIAN" ? "warning" : "default"} variant="outlined" />
                        </Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{getCenterName(u.centerId)}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>{formatDate(u.createAt || u.createdAt)}</Box>
                        <Box component="td" sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => openEditModal(u)}>Cập nhật</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => openDeleteDialog(u.id)}>Xóa</Button>
                          </Stack>
                        </Box>
                      </Box>
                    ))
                ) : (
                  <Box component="tr">
                    <Box component="td" colSpan={8} sx={{ textAlign: "center", py: 3, color: "text.secondary", fontStyle: "italic" }}>
                      Không có người dùng.
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tổng: {totalElements} người dùng • Trang {page + 1} / {Math.max(1, totalPages)}
            </Typography>

            <Pagination
              count={Math.max(1, totalPages)}
              page={page + 1}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </CardContent>
      </GlassCard>

      {/* Create Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm người dùng mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Họ tên" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} fullWidth error={!!createErrors.fullName} helperText={createErrors.fullName} />
            <TextField label="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} fullWidth error={!!createErrors.email} helperText={createErrors.email} />
            <TextField label="Số điện thoại" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} fullWidth error={!!createErrors.phone} helperText={createErrors.phone} />
            <TextField
              label="Mật khẩu"
              type={showCreatePassword ? "text" : "password"}
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              fullWidth
              error={!!createErrors.password}
              helperText={createErrors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      size="small"
                      sx={{ minWidth: 0 }}
                    >
                      {showCreatePassword ? "Ẩn" : "Hiện"}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Trung tâm</InputLabel>
              <Select
                value={createForm.centerId}
                label="Trung tâm"
                onChange={(e) => setCreateForm({ ...createForm, centerId: e.target.value })}
              >
                <MenuItem value="">Không có</MenuItem>
                {centers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.centerName || c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Vai trò" select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} fullWidth>
              {["SC_STAFF", "SC_TECHNICIAN", "EVM_STAFF", "ADMIN"].map((r) => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Tạo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cập nhật người dùng</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Họ tên" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} fullWidth error={!!editErrors.fullName} helperText={editErrors.fullName} />
            <TextField label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth error={!!editErrors.email} helperText={editErrors.email} />
            <TextField label="Số điện thoại" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} fullWidth error={!!editErrors.phone} helperText={editErrors.phone} />
            <FormControl fullWidth>
              <InputLabel>Trung tâm</InputLabel>
              <Select
                value={editForm.centerId || ""}
                label="Trung tâm"
                onChange={(e) => setEditForm({ ...editForm, centerId: e.target.value })}
              >
                <MenuItem value="">Không có</MenuItem>
                {centers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.centerName || c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Vai trò" select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} fullWidth>
              {["SC_STAFF", "SC_TECHNICIAN", "EVM_STAFF", "ADMIN"].map((r) => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
            </TextField>
            <TextField
              label="Mật khẩu mới (nếu muốn đổi)"
              type={showEditPassword ? "text" : "password"}
              value={editForm.newPassword || ""}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              fullWidth
              error={!!editErrors.newPassword}
              helperText={editErrors.newPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      size="small"
                      sx={{ minWidth: 0 }}
                    >
                      {showEditPassword ? "Ẩn" : "Hiện"}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdateUser} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xóa tài khoản này? Hành động không thể hoàn tác.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirmed} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}