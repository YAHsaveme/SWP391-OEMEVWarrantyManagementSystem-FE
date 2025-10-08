"use client";

import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { alpha } from "@mui/material/styles";
import axiosInstance from "../../services/axiosInstance"; // ⚙️ axios có token sẵn

export default function UserManagement({ search, setSearch, theme, GlassCard }) {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "SC_STAFF",
    centerId: "",
  });

  // 📦 Load danh sách user từ DB
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/auth/users/get-all-user");
      console.log("📥 Dữ liệu API trả về:", res.data);

      // ✅ Lấy mảng user thực từ field `content`
      const data = res.data;
      setUsers(Array.isArray(data.content) ? data.content : []);
    } catch (err) {
      console.error("❌ Lỗi load user:", err);
      setUsers([]); // tránh undefined
    }
  };

  // 📤 Submit form tạo user
  const handleCreateUser = async () => {
    try {
      setLoading(true);
      await axiosInstance.post("/auth/register", form);
      setOpen(false);
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "SC_STAFF",
        centerId: "",
      });
      fetchUsers();
    } catch (err) {
      console.error("❌ Lỗi tạo user:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Tạo người dùng thất bại!");
    } finally {
      setLoading(false);
    }
  };

  // 🧠 Xử lý danh sách lọc
  const filteredUsers = (users || []).filter(
    (u) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
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
            Tạo, phân quyền, và xem danh sách tài khoản.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => setOpen(true)}>
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: "100%", md: 320 } }}
            />
          </Stack>

          <Box sx={{ width: "100%", overflow: "auto" }}>
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
            >
              <Box
                component="thead"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
              >
                <Box component="tr">
                  {["#", "Họ tên", "Email", "SĐT", "Vai trò", "CenterID", "Ngày tạo"].map(
                    (h) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{
                          textAlign: "left",
                          p: 1.25,
                          fontSize: 13,
                          color: "text.secondary",
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        {h}
                      </Box>
                    )
                  )}
                </Box>
              </Box>
              <Box component="tbody">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u, idx) => (
                    <Box
                      key={u.id || idx}
                      component="tr"
                      sx={{
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.primary.main, 0.03),
                        },
                      }}
                    >
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {idx + 1}
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {u.fullName}
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {u.email}
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {u.phone || "-"}
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
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
                              : "default"
                          }
                          variant="outlined"
                        />
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {u.centerId || "-"}
                      </Box>
                      <Box
                        component="td"
                        sx={{ p: 1.25, borderBottom: `1px solid ${theme.palette.divider}` }}
                      >
                        {new Date(u.createAt || Date.now()).toLocaleDateString()}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box component="tr">
                    <Box
                      component="td"
                      colSpan={7}
                      sx={{
                        textAlign: "center",
                        py: 3,
                        color: "text.secondary",
                        fontStyle: "italic",
                      }}
                    >
                      Không có người dùng nào.
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </GlassCard>

      {/* Popup thêm người dùng */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm người dùng mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Họ tên"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Số điện thoại"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Mật khẩu"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
            />
            <TextField
              label="Trung tâm (centerId)"
              value={form.centerId}
              onChange={(e) => setForm({ ...form, centerId: e.target.value })}
              fullWidth
            />
            <TextField
              label="Vai trò"
              select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              fullWidth
            >
              {["SC_STAFF", "SC_TECHNICIAN", "EVM_STAFF", "ADMIN"].map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Tạo"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
