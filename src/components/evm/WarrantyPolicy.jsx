"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DisableIcon,
  Restore as RestoreIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import warrantyPolicyService from "../../services/warrantyPolicyService";

export default function WarrantyPolicy() {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [search, setSearch] = useState({ keyword: "", status: "", modelCode: "" });
  const [openForm, setOpenForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailPolicy, setDetailPolicy] = useState(null);
  const [formData, setFormData] = useState({
    modelCode: "",
    effectiveFrom: "",
    effectiveTo: "",
    termMonths: "",
    mileageKm: "",
    batterySohThreshold: "",
    exclusions: "",
    laborCoveragePct: "",
    partsCoveragePct: "",
    perClaimCapVND: "",
    goodwill: {
      graceMonths: "",
      graceKm: "",
      tiersPct: "",
    },
    changeNotes: "",
  });
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await warrantyPolicyService.search({
        keyword: search.keyword,
        status: search.status,
        modelCode: search.modelCode,
        page: 0,
        size: 20,
      });
      setPolicies(res?.items || res?.data?.items || []);
    } catch (err) {
      console.error("❌ Load policies failed:", err);
      setSnack({ open: true, message: "Không tải được danh sách", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleCreateOrUpdate = async () => {
  try {
    setLoading(true);

    const payload = {
      effectiveFrom: formData.effectiveFrom
        ? new Date(formData.effectiveFrom).toISOString()
        : null,
      effectiveTo: formData.effectiveTo
        ? new Date(formData.effectiveTo).toISOString()
        : null,
      termMonths: Number(formData.termMonths || 0),
      mileageKm: Number(formData.mileageKm || 0),
      batterySohThreshold: Number(formData.batterySohThreshold || 0),
      exclusions:
        typeof formData.exclusions === "string"
          ? formData.exclusions
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
          : Array.isArray(formData.exclusions)
          ? formData.exclusions.filter((s) => s)
          : [],

      laborCoveragePct: Number(formData.laborCoveragePct || 0),
      partsCoveragePct: Number(formData.partsCoveragePct || 0),
      perClaimCapVND: Number(formData.perClaimCapVND || 0),
      goodwill: {
        graceMonths: Number(formData.goodwill?.graceMonths || 0),
        graceKm: Number(formData.goodwill?.graceKm || 0),
        tiersPct: Number(formData.goodwill?.tiersPct || 0),
      },
      changeNotes: formData.changeNotes?.trim() || "",
    };

    console.log("📦 Payload gửi lên BE:", payload);

    if (editPolicy) {
      // ✅ Cập nhật chính sách
      await warrantyPolicyService.updateInfo(editPolicy.id, payload);
      setSnack({
        open: true,
        message: "✅ Cập nhật chính sách thành công!",
        severity: "success",
      });
    } else {
      // ✅ Tạo mới chính sách
      const createPayload = { ...payload, modelCode: formData.modelCode };
      await warrantyPolicyService.create(createPayload);
      setSnack({
        open: true,
        message: "✅ Tạo chính sách thành công!",
        severity: "success",
      });
    }

    loadPolicies();
    setOpenForm(false);
  } catch (err) {
    console.error("❌ Save failed:", err);
    setSnack({
      open: true,
      message: "❌ Lưu thất bại! Kiểm tra dữ liệu nhập hoặc schema API.",
      severity: "error",
    });
  } finally {
    setLoading(false);
  }
};

  const handleDisable = async (p) => {
    try {
      setLoading(true);
      await warrantyPolicyService.disable(p.id, { changeNotes: "Vô hiệu hoá chính sách", effectiveTo: new Date() });
      setSnack({ open: true, message: "Đã vô hiệu hoá chính sách", severity: "warning" });
      loadPolicies();
    } catch (err) {
      console.error("❌ Disable failed:", err);
      setSnack({ open: true, message: "Thất bại khi vô hiệu hoá", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (p) => {
    try {
      setLoading(true);
      await warrantyPolicyService.restore(p.id, { changeNotes: "Khôi phục chính sách" });
      setSnack({ open: true, message: "Đã khôi phục chính sách", severity: "success" });
      loadPolicies();
    } catch (err) {
      console.error("❌ Restore failed:", err);
      setSnack({ open: true, message: "Khôi phục thất bại", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (p) => {
  setEditPolicy(p);
  setFormData({
    ...p,
    exclusions: Array.isArray(p.exclusions)
      ? p.exclusions.join(", ")
      : p.exclusions || "",
  });
  setOpenForm(true);
};

  const resetForm = () => {
    setEditPolicy(null);
    setFormData({
      modelCode: "",
      effectiveFrom: "",
      effectiveTo: "",
      termMonths: "",
      mileageKm: "",
      batterySohThreshold: "",
      exclusions: "",
      laborCoveragePct: "",
      partsCoveragePct: "",
      perClaimCapVND: "",
      goodwill: { graceMonths: "", graceKm: "", tiersPct: "" },
      changeNotes: "",
    });
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Chính sách bảo hành
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Tìm theo mã model..."
            value={search.modelCode}
            onChange={(e) => setSearch({ ...search, modelCode: e.target.value })}
          />
          <IconButton onClick={loadPolicies} color="primary">
            <SearchIcon />
          </IconButton>
          <Tooltip title="Tải lại">
            <IconButton onClick={loadPolicies}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => {
              resetForm();
              setOpenForm(true);
            }}
          >
            Thêm mới
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: 600, overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã Model</TableCell>
              <TableCell>Thời hạn (tháng)</TableCell>
              <TableCell>Số km</TableCell>
              <TableCell>Hiệu lực</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
  {loading ? (
    <TableRow>
      <TableCell colSpan={16} align="center">
        <CircularProgress size={30} />
      </TableCell>
    </TableRow>
  ) : policies.length === 0 ? (
    <TableRow>
      <TableCell colSpan={16} align="center">
        Không có dữ liệu
      </TableCell>
    </TableRow>
  ) : (
    policies.map((p) => (
  <TableRow key={p.id} hover>
    <TableCell>{p.modelCode}</TableCell>
    <TableCell>{p.termMonths}</TableCell>
    <TableCell>{p.mileageKm}</TableCell>
    <TableCell>
      {p.effectiveFrom ? new Date(p.effectiveFrom).toLocaleDateString() : "-"}{" "}
      →{" "}
      {p.effectiveTo ? new Date(p.effectiveTo).toLocaleDateString() : "-"}
    </TableCell>
    <TableCell>
      <Chip
        label={p.status}
        color={p.status === "ACTIVE" ? "success" : "default"}
        size="small"
      />
    </TableCell>
    <TableCell align="center">
      <Tooltip title="Xem chi tiết">
        <IconButton
          color="info"
          onClick={() => {
            setDetailPolicy(p);
            setOpenDetail(true);
          }}
        >
          <VisibilityIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Sửa">
        <IconButton onClick={() => openEdit(p)} color="primary">
          <EditIcon />
        </IconButton>
      </Tooltip>

      {p.status === "ACTIVE" ? (
        <Tooltip title="Vô hiệu hoá">
          <IconButton onClick={() => handleDisable(p)} color="error">
            <DisableIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Khôi phục">
          <IconButton onClick={() => handleRestore(p)} color="success">
            <RestoreIcon />
          </IconButton>
        </Tooltip>
      )}
    </TableCell>
  </TableRow>
))
  )}
</TableBody>
        </Table>
      </TableContainer>

      {/* Form Dialog */}
<Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
  <DialogTitle>
    {editPolicy ? "Cập nhật chính sách bảo hành" : "Tạo chính sách bảo hành mới"}
  </DialogTitle>

  <DialogContent dividers>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Mã model - chỉ có khi tạo mới */}
      {!editPolicy && (
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Mã Model"
            value={formData.modelCode || ""}
            onChange={(e) => setFormData({ ...formData, modelCode: e.target.value })}
          />
        </Grid>
      )}

      {/* Ngày hiệu lực */}
      <Grid item xs={6}>
        <TextField
          fullWidth
          type="date"
          label="Ngày bắt đầu hiệu lực"
          InputLabelProps={{ shrink: true }}
          value={formData.effectiveFrom?.split("T")[0] || ""}
          onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
        />
      </Grid>

      <Grid item xs={6}>
        <TextField
          fullWidth
          type="date"
          label="Ngày hết hiệu lực"
          InputLabelProps={{ shrink: true }}
          value={formData.effectiveTo?.split("T")[0] || ""}
          onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
        />
      </Grid>

      {/* Thông tin thời hạn */}
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Thời hạn (tháng)"
          value={formData.termMonths || ""}
          onChange={(e) => setFormData({ ...formData, termMonths: Number(e.target.value) })}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Số km tối đa"
          value={formData.mileageKm || ""}
          onChange={(e) => setFormData({ ...formData, mileageKm: Number(e.target.value) })}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Ngưỡng SOH (%)"
          value={formData.batterySohThreshold || ""}
          onChange={(e) => setFormData({ ...formData, batterySohThreshold: Number(e.target.value) })}
        />
      </Grid>

      {/* Ngoại lệ */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Ngoại lệ (ngăn cách bằng dấu phẩy)"
          value={
            Array.isArray(formData.exclusions)
              ? formData.exclusions.join(", ")
              : formData.exclusions || ""
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              exclusions: e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter((x) => x),
            })
          }
        />
      </Grid>

      {/* Coverage */}
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Labor Coverage (%)"
          value={formData.laborCoveragePct || ""}
          onChange={(e) => setFormData({ ...formData, laborCoveragePct: Number(e.target.value) })}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Parts Coverage (%)"
          value={formData.partsCoveragePct || ""}
          onChange={(e) => setFormData({ ...formData, partsCoveragePct: Number(e.target.value) })}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Giới hạn bồi thường (VND)"
          value={formData.perClaimCapVND || ""}
          onChange={(e) => setFormData({ ...formData, perClaimCapVND: Number(e.target.value) })}
        />
      </Grid>

      {/* Goodwill group */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 600 }}>
          Thông tin thiện chí (Goodwill)
        </Typography>
      </Grid>

      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Grace Months"
          value={formData.goodwill?.graceMonths || 0}
          onChange={(e) =>
            setFormData({
              ...formData,
              goodwill: { ...formData.goodwill, graceMonths: Number(e.target.value) },
            })
          }
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Grace Km"
          value={formData.goodwill?.graceKm || 0}
          onChange={(e) =>
            setFormData({
              ...formData,
              goodwill: { ...formData.goodwill, graceKm: Number(e.target.value) },
            })
          }
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="Tiers Pct (%)"
          value={formData.goodwill?.tiersPct || 0}
          onChange={(e) =>
            setFormData({
              ...formData,
              goodwill: { ...formData.goodwill, tiersPct: Number(e.target.value) },
            })
          }
        />
      </Grid>

      {/* Ghi chú thay đổi */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Ghi chú thay đổi"
          value={formData.changeNotes || ""}
          onChange={(e) => setFormData({ ...formData, changeNotes: e.target.value })}
        />
      </Grid>
    </Grid>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setOpenForm(false)}>Hủy</Button>
    <Button
      variant="contained"
      onClick={handleCreateOrUpdate}
      disabled={loading}
    >
      {loading ? <CircularProgress size={20} /> : "Lưu"}
    </Button>
  </DialogActions>
</Dialog>

          {/* Popup xem chi tiết */}
<Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
  <DialogTitle>Chi tiết chính sách bảo hành</DialogTitle>
  <DialogContent dividers>
    {detailPolicy ? (
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Mã Model:</Typography>
          <Typography>{detailPolicy.modelCode}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Phiên bản:</Typography>
          <Typography>{detailPolicy.versionNo || "-"}</Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="subtitle2">Hiệu lực từ:</Typography>
          <Typography>{detailPolicy.effectiveFrom ? new Date(detailPolicy.effectiveFrom).toLocaleDateString() : "-"}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2">Hiệu lực đến:</Typography>
          <Typography>{detailPolicy.effectiveTo ? new Date(detailPolicy.effectiveTo).toLocaleDateString() : "-"}</Typography>
        </Grid>

        <Grid item xs={4}>
          <Typography variant="subtitle2">Thời hạn:</Typography>
          <Typography>{detailPolicy.termMonths} tháng</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">Số km:</Typography>
          <Typography>{detailPolicy.mileageKm}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">SOH tối thiểu:</Typography>
          <Typography>{detailPolicy.batterySohThreshold}</Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={600}>Chi tiết bảo hành</Typography>
        </Grid>

        <Grid item xs={4}>
          <Typography variant="subtitle2">Lao động (%):</Typography>
          <Typography>{detailPolicy.laborCoveragePct}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">Phụ tùng (%):</Typography>
          <Typography>{detailPolicy.partsCoveragePct}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">Giới hạn bồi thường (VND):</Typography>
          <Typography>{detailPolicy.perClaimCapVND?.toLocaleString("vi-VN")}</Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2">Ngoại lệ:</Typography>
          <Typography>{(detailPolicy.exclusions || []).join(", ") || "-"}</Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" fontWeight={600}>Thông tin thiện chí (Goodwill)</Typography>
        </Grid>

        <Grid item xs={4}>
          <Typography variant="subtitle2">Grace Months:</Typography>
          <Typography>{detailPolicy.goodwill?.graceMonths}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">Grace Km:</Typography>
          <Typography>{detailPolicy.goodwill?.graceKm}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2">Tiers Pct (%):</Typography>
          <Typography>{detailPolicy.goodwill?.tiersPct}</Typography>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Ghi chú thay đổi:</Typography>
          <Typography>{detailPolicy.changeNotes || "-"}</Typography>
        </Grid>
      </Grid>
    ) : (
      <Typography>Đang tải...</Typography>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
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
