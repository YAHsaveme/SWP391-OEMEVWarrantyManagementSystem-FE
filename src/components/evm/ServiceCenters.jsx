"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import centerService from "../../services/centerService";

export default function ServiceCenters() {
  const [centers, setCenters] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | DELETED
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    region: "",
    city: "",
    address: "",
    phone: "",
  });
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res = await centerService.search(query, page, size, statusFilter);
      setCenters(res?.content || []);
      setTotalPages(res?.totalPages || 0);
    } catch (err) {
      console.error("❌ Lỗi load danh sách trung tâm:", err);
      setSnack({ open: true, message: "Không tải được danh sách trung tâm", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
}, [page, statusFilter]);

// Tìm kiếm center
const handleSearchCenters = async () => {
  setLoading(true);
  try {
    if (query.trim() === "") {
      // Nếu ô tìm kiếm trống → load lại danh sách gốc
      const res = await centerService.getAll();
      setCenters(res || []);
    } else {
      // Nếu có từ khóa → gọi API search
      const res = await centerService.search(query, page, size, statusFilter);
      setCenters(res?.content || []);
      setTotalPages(res?.totalPages || 0);
    }
  } catch (err) {
    console.error("❌ Lỗi tìm kiếm trung tâm:", err);
    setSnack({ open: true, message: "Không thể tìm kiếm trung tâm", severity: "error" });
  } finally {
    setLoading(false);
  }
};

  const handleOpenDialog = (item = null) => {
    if (item) setForm(item);
    else
      setForm({
        name: "",
        region: "",
        city: "",
        address: "",
        phone: "",
      });
    setEditing(item);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (editing) {
        await centerService.update(editing.id, form);
        setSnack({ open: true, message: "Cập nhật trung tâm thành công", severity: "success" });
      } else {
        await centerService.create(form);
        setSnack({ open: true, message: "Tạo trung tâm mới thành công", severity: "success" });
      }
      setOpenDialog(false);
      fetchCenters();
    } catch (err) {
      console.error("❌ Lỗi lưu trung tâm:", err);
      setSnack({ open: true, message: "Không thể lưu trung tâm", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa trung tâm này?")) return;
    try {
      await centerService.delete(id);
      setSnack({ open: true, message: "Đã xóa trung tâm", severity: "info" });
      fetchCenters();
    } catch (err) {
      setSnack({ open: true, message: "Lỗi khi xóa trung tâm", severity: "error" });
    }
  };

  const handleRecover = async (id) => {
    try {
      await centerService.recover(id);
      setSnack({ open: true, message: "Đã khôi phục trung tâm", severity: "success" });
      fetchCenters();
    } catch (err) {
      setSnack({ open: true, message: "Lỗi khi khôi phục trung tâm", severity: "error" });
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Quản lý Trung tâm Dịch vụ
      </Typography>

      {/* Thanh công cụ */}
      <Grid container spacing={2} alignItems="center" mb={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Tìm kiếm theo tên, khu vực, thành phố..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.6 }} />,
            }}
          />
        </Grid>
        <Grid item xs={12} md="auto">
            <TextField
                select
                label="Trạng thái"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                SelectProps={{ native: true }}
                size="small"
            >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="DELETED">Đã xóa</option>
            </TextField>
        </Grid>
        <Grid item xs={12} md="auto">
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearchCenters}
            disabled={loading}
          >
            Tìm kiếm
          </Button>
        </Grid>
        <Grid item xs={12} md="auto">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={async () => {
              setQuery("");
              setLoading(true);
              try {
                const res = await centerService.getAll();
                setCenters(res || []);
              } catch (err) {
                console.error("❌ Lỗi load lại danh sách:", err);
              } finally {
                setLoading(false);
              }
            }}
          >
            Làm mới
          </Button>
        </Grid>
        <Grid item xs={12} md="auto">
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog(null)}
          >
            Thêm trung tâm
          </Button>
        </Grid>
      </Grid>

      {/* Bảng danh sách */}
      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tên trung tâm</TableCell>
                <TableCell>Khu vực</TableCell>
                <TableCell>Thành phố</TableCell>
                <TableCell>Địa chỉ</TableCell>
                <TableCell>SĐT</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
                <TableCell align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {centers.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.region}</TableCell>
                  <TableCell>{c.city}</TableCell>
                  <TableCell>{c.address}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell align="center">
                    {c.delete ? (
                      <Typography color="error">Đã xóa</Typography>
                    ) : (
                      <Typography color="success.main">Hoạt động</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Sửa">
                      <IconButton onClick={() => handleOpenDialog(c)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {c.delete ? (
                      <Tooltip title="Khôi phục">
                        <IconButton color="success" onClick={() => handleRecover(c.id)}>
                          <RestoreIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Xóa">
                        <IconButton color="error" onClick={() => handleDelete(c.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && centers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Không có trung tâm nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && totalPages > 1 && (
         <Box display="flex" justifyContent="center" p={2}>
          <Button
            variant="outlined"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Trang trước
          </Button>
          <Typography sx={{ mx: 2, alignSelf: "center" }}>
            Trang {page + 1} / {totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Trang sau
          </Button>
        </Box>
    )}
        {loading && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <CircularProgress size={26} />
          </Box>
        )}
      </Paper>

      {/* Dialog thêm / sửa */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Cập nhật trung tâm" : "Thêm trung tâm mới"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            {["name", "region", "city", "address", "phone"].map((f) => (
              <Grid item xs={12} sm={f === "address" ? 12 : 6} key={f}>
                <TextField
                  label={
                    f === "name"
                      ? "Tên trung tâm"
                      : f === "region"
                      ? "Khu vực"
                      : f === "city"
                      ? "Thành phố"
                      : f === "address"
                      ? "Địa chỉ"
                      : "Số điện thoại"
                  }
                  fullWidth
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? <CircularProgress size={22} /> : "Lưu"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
