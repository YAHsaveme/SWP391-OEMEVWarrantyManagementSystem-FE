// src/components/admin/UserManagement.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, styled } from "@mui/material/styles";
import authService from "../../services/authService";
import centerService from "../../services/centerService";
import axiosInstance from "../../services/axiosInstance";

// --- GlassCard component for consistent look ---
const GlassCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
  background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(
    theme.palette.background.paper,
    0.75
  )} 100%)`,
  boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.05)}`,
}));

// --- Main component ---
export default function UserManagement({ search, setSearch, theme }) {
  // Data & pagination
  const [users, setUsers] = useState([]); // raw user list from server (includes deleted flag)
  const [page, setPage] = useState(0); // backend page index (0-based)
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [roleFilter, setRoleFilter] = useState(""); // "" => all roles

  const [deletedFilter, setDeletedFilter] = useState("");
  // Loading & notifications
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  // Dialogs & forms
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Reset password modal (admin action)
  const [openResetPass, setOpenResetPass] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetErrors, setResetErrors] = useState({});
  const [resetTargetId, setResetTargetId] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "SC_STAFF",
    centerId: "",
  });
  const [createErrors, setCreateErrors] = useState({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit form
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
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Centers
  const [centers, setCenters] = useState([]);

  // Debounce search
  const searchDebounceRef = useRef(null);

  // Email & phone validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Vietnamese phone pattern (adjust if you want different rules)
  const phoneRegex = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

  // Get current user info for disabling certain ops (like deleting yourself)
  const currentUser = useMemo(() => {
    try {
      // authService.getCurrentUser returns the server-stored user or reads from local storage
      // If your authService exposes a different method, adjust accordingly.
      return authService.getCurrentUser ? authService.getCurrentUser() : null;
    } catch {
      return null;
    }
  }, []);

  // ---------- Utility: parse server errors into { fieldErrors: {}, message: "" } ----------
  function parseServerErrors(err) {
    const out = { fieldErrors: {}, message: "" };
    const data = err?.response?.data;
    if (!data) {
      out.message = err?.message || "Lỗi không xác định từ server";
      return out;
    }

    if (typeof data.message === "string") out.message = data.message;

    // common shapes
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

  // ---------- Fetch centers (display names only) ----------
  const fetchCenters = async () => {
    try {
      // Try centerService.getAll() first (common), fallback to axiosInstance
      let res;
      if (centerService && typeof centerService.getAll === "function") {
        res = await centerService.getAll();
        // centerService may return { data } or an array; normalize:
        const payload = res?.data ?? res;
        setCenters(Array.isArray(payload) ? payload : []);
      } else {
        const r = await axiosInstance.get("/centers/get-all");
        setCenters(Array.isArray(r.data) ? r.data : []);
      }
    } catch (err) {
      console.error("Lỗi tải trung tâm:", err);
      setCenters([]);
    }
  };

  // ---------- Fetch users (admin search) ----------
  const fetchUsers = async (p = page, size = pageSize, q = search || "", role = roleFilter) => {
    try {
      setListLoading(true);
      // Uses authService.adminSearchUsers({ q, role, page, size })
      const data = await authService.adminSearchUsers({ q: q || "", role: role || "", page: p, size });
      // Expect pageable: { content, totalPages, totalElements, number }
      if (data && Array.isArray(data.content)) {
        // Sort theo ngày tạo mới nhất (createdAt hoặc createAt)
        const sorted = [...data.content].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.createAt || 0);
          const dateB = new Date(b.createdAt || b.createAt || 0);
          return dateB - dateA; // mới nhất lên đầu
        });

        setUsers(sorted);
        setTotalPages(Number.isInteger(data.totalPages) ? data.totalPages : 0);
        setTotalElements(Number.isInteger(data.totalElements) ? data.totalElements : 0);
        setPage(typeof data.number === "number" ? data.number : p);
      }
      else {
        // fallback
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

  // ---------- Effects ----------
  useEffect(() => {
    fetchCenters();
  }, []);

  // initial load & whenever pageSize changes, reload first page
  useEffect(() => {
    fetchUsers(0, pageSize, search, roleFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // debounce search and role filter
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(0);
      fetchUsers(0, pageSize, search, roleFilter);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  // ---------- Paging handlers ----------
  const handlePageChange = (event, value) => {
    const newPage = value - 1;
    setPage(newPage);
    fetchUsers(newPage, pageSize, search, roleFilter);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(0);
  };

  // ---------- Helpers ----------
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

  const getCenterName = (centerId) => {
    if (!centerId) return "-";
    const c = centers.find((x) => x.id === centerId || x.centerId === centerId);
    return c ? (c.centerName || c.name || "-") : "-";
  };

  // ---------- Create user ----------
  const validateCreateForm = () => {
    const err = {};
    if (!createForm.fullName?.trim()) err.fullName = "Họ tên là bắt buộc";
    if (!createForm.email?.trim()) err.email = "Email là bắt buộc";
    else if (!emailRegex.test(createForm.email.trim())) err.email = "Email không hợp lệ";
    if (!createForm.password) err.password = "Mật khẩu là bắt buộc";
    else if (createForm.password.length < 8) err.password = "Mật khẩu phải >= 8 ký tự";
    if (!createForm.confirmPassword) err.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (createForm.password !== createForm.confirmPassword) err.confirmPassword = "Mật khẩu xác nhận không khớp";
    if (createForm.phone && !phoneRegex.test(createForm.phone.trim())) err.phone = "Số điện thoại không hợp lệ";
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
        fullName: createForm.fullName.trim(),
        centerId: createForm.centerId || undefined, // if empty send undefined
        password: createForm.password,
        email: createForm.email.trim(),
        phone: createForm.phone?.trim() || undefined,
        role: createForm.role,
      };
      // POST /api/auth/register
      await authService.register(payload);
      setSnack({ open: true, severity: "success", message: "Tạo người dùng thành công" });
      setOpenCreate(false);
      setCreateForm({ fullName: "", email: "", phone: "", password: "", confirmPassword: "", role: "SC_STAFF", centerId: "" });
      setCreateErrors({});
      // refresh list (go to first page)
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

  // ---------- Edit user ----------
  const openEditModal = (user) => {
    // do not expose id in UI; keep in state for API call
    setEditForm({
      id: user.id,
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "",
      centerId: user.centerId || user.centerID || "",
      newPassword: "",
    });
    setEditErrors({});
    setOpenEdit(true);
  };

  const validateEditForm = () => {
    const err = {};
    if (!editForm.fullName?.trim()) err.fullName = "Họ tên là bắt buộc";
    if (!editForm.email?.trim()) err.email = "Email là bắt buộc";
    else if (!emailRegex.test(editForm.email.trim())) err.email = "Email không hợp lệ";
    if (editForm.phone && !phoneRegex.test(editForm.phone.trim())) err.phone = "Số điện thoại không hợp lệ";
    if (editForm.newPassword && editForm.newPassword.length > 0 && editForm.newPassword.length < 8) err.newPassword = "Mật khẩu mới phải >= 8 ký tự";
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
      const payload = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone?.trim() || undefined,
        role: editForm.role,
        centerId: editForm.centerId || undefined,
      };
      // PUT /api/auth/admin/users/{userId}
      await authService.adminUpdateUser(editForm.id, payload);

      // If newPassword provided -> call adminChangePassword
      if (editForm.newPassword?.trim()) {
        await authService.adminChangePassword(editForm.id, editForm.newPassword.trim());
      }

      // If centerId changed (and provided) -> call update center endpoint
      if (editForm.centerId) {
        // PUT /api/auth/admin/users/{centerId}/update-center?userId={userId}
        await authService.updateUserCenter(editForm.centerId, editForm.id);
      }

      setSnack({ open: true, severity: "success", message: "Cập nhật người dùng thành công" });
      setOpenEdit(false);
      // refresh current page
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

  // ---------- Delete & Recover ----------
  const openDeleteDialog = (userId) => {
    setDeleteTargetId(userId);
    setOpenDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    try {
      setActionLoading(true);
      // DELETE /api/auth/users/{userId}
      await authService.deleteUser(deleteTargetId);
      setSnack({ open: true, severity: "success", message: "Xóa thành công" });
      setOpenDeleteConfirm(false);
      setDeleteTargetId(null);
      // If page empties after deletion, go previous page
      const isPageEmptyAfterDelete = users.filter(u => !u.deleted).length === 1 && page > 0;
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

  const handleRecover = async (userId) => {
    try {
      setActionLoading(true);
      // POST /api/auth/users/{userId}/recovery
      await authService.recoverUser(userId);
      setSnack({ open: true, severity: "success", message: "Phục hồi tài khoản thành công" });
      fetchUsers(page, pageSize, search, roleFilter);
    } catch (err) {
      console.error("Lỗi phục hồi user:", err);
      const parsed = parseServerErrors(err);
      setSnack({ open: true, severity: "error", message: parsed.message || "Phục hồi thất bại" });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Reset password (admin) ----------
  const openResetPasswordModal = (userId) => {
    setResetTargetId(userId);
    setResetPasswordValue("");
    setResetErrors({});
    setOpenResetPass(true);
  };

  const validateResetPassword = () => {
    const err = {};
    if (!resetPasswordValue) err.password = "Mật khẩu là bắt buộc";
    else if (resetPasswordValue.length < 8) err.password = "Mật khẩu phải >= 8 ký tự";
    setResetErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateResetPassword()) {
      setSnack({ open: true, severity: "error", message: "Vui lòng sửa lỗi trên form" });
      return;
    }
    try {
      setActionLoading(true);
      // PUT /api/auth/admin/users/{userId}/password  body: { newPassword }
      await authService.adminChangePassword(resetTargetId, resetPasswordValue);
      setSnack({ open: true, severity: "success", message: "Đặt lại mật khẩu thành công" });
      setOpenResetPass(false);
      setResetTargetId(null);
      setResetPasswordValue("");
    } catch (err) {
      console.error("Lỗi đặt lại mật khẩu:", err);
      const parsed = parseServerErrors(err);
      setSnack({ open: true, severity: "error", message: parsed.message || "Đặt lại mật khẩu thất bại" });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------- Render ----------
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
            Tạo, phân quyền, xem / sửa / xóa / phục hồi tài khoản.
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
              value={search || ""}
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
                <MenuItem value="SC_MANAGER">SC_MANAGER</MenuItem>
                <MenuItem value="EVM_STAFF">EVM_STAFF</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={deletedFilter}
                label="Trạng thái"
                onChange={(e) => { setDeletedFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">Tất cả</MenuItem>
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="deleted">Đã xóa</MenuItem>
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
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead style={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <tr>
                  {["STT", "Họ tên", "Email", "SĐT", "Vai trò", "Center", "Trạng thái", "Ngày tạo", "Hành động"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.secondary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.length > 0 ? (
                  users
                    .filter((u) => {
                      if (deletedFilter === "active") return !u.deleted;
                      if (deletedFilter === "deleted") return u.deleted;
                      return true;
                    })
                    .map((u, idx) => {
                      const rowIndex = page * pageSize + idx + 1;
                      const isDeleted = !!u.deleted;
                      const isSelf = currentUser && currentUser.id && u.id === currentUser.id;
                      return (
                        <tr
                          key={`${u.email || rowIndex}-${page}-${idx}`}
                          style={{
                            backgroundColor: "transparent",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = alpha(theme.palette.primary.main, 0.03))
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>{rowIndex}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>{u.fullName}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>{u.email}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>{u.phone || "-"}</td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Chip
                              size="small"
                              label={u.role}
                              color={
                                u.role === "ADMIN"
                                  ? "secondary"
                                  : u.role === "EVM_STAFF"
                                    ? "info"
                                    : u.role === "SC_TECHNICIAN"
                                      ? "warning"
                                      : u.role === "SC_MANAGER"
                                        ? "success"
                                        : "default"
                              }
                              variant="outlined"
                            />
                          </td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>
                            {getCenterName(u.centerId)}
                          </td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>
                            {isDeleted ? (
                              <Chip size="small" label="Đã xoá" color="error" variant="outlined" />
                            ) : (
                              <Chip size="small" label="Hoạt động" color="success" variant="outlined" />
                            )}
                          </td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="body2">{formatDate(u.createAt || u.createdAt)}</Typography>
                          </td>
                          <td style={{ padding: "10px", borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Stack direction="row" spacing={1} justifyContent="center">
                              {!isDeleted ? (
                                <>
                                  <Button size="small" variant="outlined" onClick={() => openEditModal(u)} disabled={actionLoading}>
                                    Cập nhật
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => openResetPasswordModal(u.id)}
                                    disabled={actionLoading}
                                  >
                                    Đặt lại mật khẩu
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => openDeleteDialog(u.id)}
                                    disabled={isSelf || actionLoading}
                                  >
                                    {isSelf ? "Không thể xóa chính bạn" : "Xóa"}
                                  </Button>
                                </>
                              ) : (
                                <Button size="small" variant="outlined" onClick={() => handleRecover(u.id)} disabled={actionLoading}>
                                  Phục hồi
                                </Button>
                              )}
                            </Stack>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "gray" }}>
                      Không có người dùng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tổng: {totalElements} người dùng • Trang {page + 1} / {Math.max(1, totalPages)}
            </Typography>

            <Pagination
              count={Math.max(1, totalPages)}
              page={Math.min(Math.max(1, page + 1), Math.max(1, totalPages))}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </CardContent >
      </GlassCard >

      {/* Create Dialog */}
      <Dialog Dialog open={openCreate} onClose={() => setOpenCreate(false)
      } maxWidth="sm" fullWidth >
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
              helperText={createErrors.password || "Mật khẩu ít nhất 8 ký tự"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => setShowCreatePassword(!showCreatePassword)} size="small" sx={{ minWidth: 0 }}>
                      {showCreatePassword ? "Ẩn" : "Hiện"}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Xác nhận mật khẩu"
              type={showCreatePassword ? "text" : "password"}
              value={createForm.confirmPassword}
              onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
              fullWidth
              error={!!createErrors.confirmPassword}
              helperText={createErrors.confirmPassword}
            />

            <FormControl fullWidth>
              <InputLabel>Trung tâm</InputLabel>
              <Select value={createForm.centerId} label="Trung tâm" onChange={(e) => setCreateForm({ ...createForm, centerId: e.target.value })}>
                <MenuItem value="">Không có</MenuItem>
                {centers.map((c) => (<MenuItem key={c.id} value={c.id}>{c.centerName || c.name}</MenuItem>))}
              </Select>
            </FormControl>

            <TextField label="Vai trò" select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} fullWidth>
              {["SC_STAFF", "SC_TECHNICIAN", "SC_MANAGER", "EVM_STAFF", "ADMIN"].map((r) => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
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
      < Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth >
        <DialogTitle>Cập nhật người dùng</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Họ tên" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} fullWidth error={!!editErrors.fullName} helperText={editErrors.fullName} />
            <TextField label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth error={!!editErrors.email} helperText={editErrors.email} />
            <TextField label="Số điện thoại" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} fullWidth error={!!editErrors.phone} helperText={editErrors.phone} />

            <FormControl fullWidth>
              <InputLabel>Trung tâm</InputLabel>
              <Select value={editForm.centerId || ""} label="Trung tâm" onChange={(e) => setEditForm({ ...editForm, centerId: e.target.value })}>
                <MenuItem value="">Không có</MenuItem>
                {centers.map((c) => (<MenuItem key={c.id} value={c.id}>{c.centerName || c.name}</MenuItem>))}
              </Select>
            </FormControl>

            <TextField label="Vai trò" select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} fullWidth>
              {["SC_STAFF", "SC_TECHNICIAN", "SC_MANAGER", "EVM_STAFF", "ADMIN"].map((r) => (<MenuItem key={r} value={r}>{r}</MenuItem>))}
            </TextField>

            <TextField
              label="Mật khẩu mới (nếu muốn đổi)"
              type={showEditPassword ? "text" : "password"}
              value={editForm.newPassword || ""}
              onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              fullWidth
              error={!!editErrors.newPassword}
              helperText={editErrors.newPassword || "Nếu để trống thì không đổi mật khẩu"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={() => setShowEditPassword(!showEditPassword)} size="small" sx={{ minWidth: 0 }}>
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
      </Dialog >

      {/* Reset password dialog */}
      < Dialog open={openResetPass} onClose={() => setOpenResetPass(false)} maxWidth="xs" fullWidth >
        <DialogTitle>Đặt lại mật khẩu</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Mật khẩu mới"
              type="password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              fullWidth
              error={!!resetErrors.password}
              helperText={resetErrors.password || "Mật khẩu tối thiểu 8 ký tự"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetPass(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Đặt lại"}
          </Button>
        </DialogActions>
      </Dialog >

      {/* Delete confirm */}
      < Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
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
      </Dialog >

      {/* Snackbar */}
      < Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar >
    </Box >
  );
}
