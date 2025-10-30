// src/components/tech/Diagnostics.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
  TableContainer,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Snackbar,
  Pagination,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import diagnosticsService from "../../services/diagnosticsService";
import axiosInstance from "../../services/axiosInstance";
import authService from "../../services/authService";

export default function Diagnostics() {
  const DIAGNOSTIC_PHASE = {
    PRE_REPAIR: "PRE_REPAIR",
    POST_REPAIR: "POST_REPAIR",
    COMPLETED: "COMPLETED",
  };

  // ✅ Lấy userId hiện tại từ localStorage (sau khi đăng nhập)
  const currentUserId = localStorage.getItem("userId");

  // Data
  const [claimsOptions, setClaimsOptions] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formValues, setFormValues] = useState({
    claimId: "",
    customerName: "",
    customerPhone: "",
    sohPct: "",
    socPct: "",
    packVoltage: "",
    cellDeltaMv: "",
    cycles: "",
    notes: "",
  });

  // Phase logic
  const [createPhaseHint, setCreatePhaseHint] = useState(null);
  const [createPhaseCount, setCreatePhaseCount] = useState(0);

  // Snackbar + confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState({ claimId: null, diagId: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const log = {
    info: (...args) => console.info("📡 [Diagnostics]", ...args),
    ok: (...args) => console.log("✅ [Diagnostics]", ...args),
    err: (...args) => console.error("❌ [Diagnostics]", ...args),
  };

  // ================== LOAD DATA ==================
  async function loadClaims() {
    try {
      setLoadingClaims(true);
      const [claimsRes, vehiclesRes] = await Promise.all([
        axiosInstance.get("claims/get-all"),
        axiosInstance.get("vehicles/get-all"),
      ]);

      const claims = Array.isArray(claimsRes.data) ? claimsRes.data : [];
      const vehicles = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];

      const merged = claims.map((claim) => {
        const match = vehicles.find((v) => v.vin === claim.vin);
        return {
          id: claim.id,
          vin: claim.vin,
          status: claim.status,
          claimType: claim.claimType,
          intakeContactName: match?.intakeContactName || claim.intakeContactName || "Không rõ",
          intakeContactPhone: match?.intakeContactPhone || claim.intakeContactPhone || "—",
        };
      });

      setClaimsOptions(merged);
      log.ok("Loaded claims merged", merged.length);
    } catch (err) {
      log.err("loadClaims error", err);
      setSnackbar({ open: true, message: "Không thể tải Claims/Vehicles", severity: "error" });
    } finally {
      setLoadingClaims(false);
    }
  }

  // ================== LOAD PAGE ==================
  async function loadPage(pageNumber = 1, useMy = true) {
    setLoading(true);
    setError(null);
    try {
      let items = [];
      if (useMy) {
        log.info("GET diagnostics/my-diagnostics");
        const resp = await diagnosticsService.getMyDiagnostics(pageNumber - 1, pageSize);
        items = Array.isArray(resp.content) ? resp.content : [];
        setTotalPages(resp.totalPages || 1);
      } else {
        log.info("GET diagnostics/get-all");
        const resp = await diagnosticsService.getAll();
        items = Array.isArray(resp) ? resp : [];
        setTotalPages(Math.max(1, Math.ceil(items.length / pageSize)));
      }

      setRows(items);
      setFilteredRows(items);
      log.ok("Diagnostics loaded", items.length);
    } catch (err) {
      log.err("Load diagnostics error", err);
      setError("Không thể tải danh sách diagnostics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
    loadPage();
  }, []);

  // ================== SEARCH ==================
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = rows.filter(
      (r) =>
        r.claimVin?.toLowerCase().includes(query) ||
        r.performedByName?.toLowerCase().includes(query) ||
        r.customerName?.toLowerCase().includes(query)
    );
    setFilteredRows(filtered);
  }, [searchQuery, rows]);

  // ================== VIEW DETAIL ==================
  async function handleView(id) {
    setDetailData(null);
    setDetailOpen(true);
    try {
      const resp = await diagnosticsService.getById(id);
      setDetailData(resp);
    } catch (err) {
      log.err("getById error", err);
      setSnackbar({ open: true, message: "Không lấy được chi tiết", severity: "error" });
      setDetailOpen(false);
    }
  }

  // ================== CREATE / EDIT ==================
  function handleOpenCreate() {
    setFormMode("create");
    setFormValues({
      claimId: "",
      customerName: "",
      customerPhone: "",
      sohPct: "",
      socPct: "",
      packVoltage: "",
      cellDeltaMv: "",
      cycles: "",
      notes: "",
    });
    setCreatePhaseHint(null);
    setCreatePhaseCount(0);
    setFormOpen(true);
  }

  async function onSelectClaimForForm(selected) {
    if (!selected) return;
    setFormValues((f) => ({
      ...f,
      claimId: selected.id,
      customerName: selected.intakeContactName,
      customerPhone: selected.intakeContactPhone,
    }));

    try {
      const resp = await diagnosticsService.getByClaim(selected.id);
      const arr = Array.isArray(resp) ? resp : [];
      setCreatePhaseCount(arr.length);
      setCreatePhaseHint(arr.length === 0 ? DIAGNOSTIC_PHASE.PRE_REPAIR : arr.length === 1 ? DIAGNOSTIC_PHASE.POST_REPAIR : null);
    } catch (err) {
      log.err("getByClaim error", err);
    }
  }

  async function handleSubmitCreate() {
    if (!formValues.claimId) {
      setSnackbar({ open: true, message: "Chưa chọn Claim", severity: "warning" });
      return;
    }

    try {
      const existing = await diagnosticsService.getByClaim(formValues.claimId);
      if (existing.length >= 2) {
        setSnackbar({ open: true, message: "Claim đã có PRE & POST", severity: "warning" });
        return;
      }

      const desiredPhase =
        existing.length === 0
          ? DIAGNOSTIC_PHASE.PRE_REPAIR
          : DIAGNOSTIC_PHASE.POST_REPAIR;

      const payload = {
        claimId: formValues.claimId,
        sohPct: Number(formValues.sohPct) || 0,
        socPct: Number(formValues.socPct) || 0,
        packVoltage: Number(formValues.packVoltage) || 0,
        cellDeltaMv: Number(formValues.cellDeltaMv) || 0,
        cycles: Number(formValues.cycles) || 0,
        notes: (formValues.notes || "").trim(),
      };

      console.log("🚀 [Diagnostics] Sending create payload:", payload);

      const result = await diagnosticsService.create(payload);

      console.log("✅ [Diagnostics] Created result:", result);
      setSnackbar({
        open: true,
        message: `Đã tạo bản ${desiredPhase} thành công`,
        severity: "success",
      });
      setFormOpen(false);
      loadPage();
    } catch (err) {
      console.error("❌ [Diagnostics] create error", err);
      console.log("📩 Server response:", err.response?.data);
      setSnackbar({
        open: true,
        message:
          err.response?.data?.message ||
          "Tạo thất bại — kiểm tra lại claimId hoặc dữ liệu nhập",
        severity: "error",
      });
    }
  }

  async function handleOpenEdit(id) {
    try {
      const d = await diagnosticsService.getById(id);
      setFormMode("edit");
      setFormValues({
        id: d.id,
        claimId: d.claimId,
        sohPct: d.sohPct ?? "",
        socPct: d.socPct ?? "",
        packVoltage: d.packVoltage ?? "",
        cellDeltaMv: d.cellDeltaMv ?? "",
        cycles: d.cycles ?? "",
        notes: d.notes ?? "",
      });
      setFormOpen(true);
    } catch (err) {
      setSnackbar({ open: true, message: "Không thể mở form sửa", severity: "error" });
    }
  }

  async function handleSubmitUpdate() {
    try {
      const current = await diagnosticsService.getById(formValues.id);
      const clean = {
        claimId: current.claimId,
        sohPct: Number(formValues.sohPct) || 0,
        socPct: Number(formValues.socPct) || 0,
        packVoltage: Number(formValues.packVoltage) || 0,
        cellDeltaMv: Number(formValues.cellDeltaMv) || 0,
        cycles: Number(formValues.cycles) || 0,
        notes: (formValues.notes || "").trim(),
      };
      await diagnosticsService.update(formValues.id, clean);
      setSnackbar({ open: true, message: "Cập nhật thành công", severity: "success" });
      setFormOpen(false);
      loadPage();
    } catch (err) {
      console.error("❌ Update failed:", err);
      if (err.response?.data?.error === "AUTH_ERROR") {
        setSnackbar({ open: true, message: err.response.data.message || "Bạn không có quyền chỉnh sửa bản này", severity: "warning" });
      } else {
        setSnackbar({ open: true, message: "Cập nhật thất bại", severity: "error" });
      }
    }
  }

  // ================== MARK COMPLETE ==================
  function openConfirmMarkComplete(claimId, diagId) {
    setConfirmTarget({ claimId, diagId });
    setConfirmOpen(true);
  }

  async function handleConfirmMarkComplete() {
    setConfirmOpen(false);
    const { claimId, diagId } = confirmTarget;
    if (!claimId) return;
    try {
      const current = await diagnosticsService.getById(diagId);
      const clean = {
        claimId: current.claimId,
        sohPct: Number(current.sohPct) || 0,
        socPct: Number(current.socPct) || 0,
        packVoltage: Number(current.packVoltage) || 0,
        cellDeltaMv: Number(current.cellDeltaMv) || 0,
        cycles: Number(current.cycles) || 0,
        notes: current.notes || "",
      };
      await diagnosticsService.update(diagId, clean);
      setSnackbar({ open: true, message: "Đã đánh dấu hoàn tất", severity: "success" });
      loadPage();
    } catch (err) {
      console.error("❌ Mark complete failed:", err);
      if (err.response?.data?.error === "AUTH_ERROR") {
        setSnackbar({ open: true, message: err.response.data.message || "Bạn không có quyền hoàn tất bản này", severity: "warning" });
      } else {
        setSnackbar({ open: true, message: "Không thể hoàn tất", severity: "error" });
      }
    }
  }

  // ================== UI HELPERS ==================
  function phaseColor(phase) {
    if (phase === DIAGNOSTIC_PHASE.PRE_REPAIR) return "success";
    if (phase === DIAGNOSTIC_PHASE.POST_REPAIR) return "warning";
    return "default";
  }

  function closeSnackbar() {
    setSnackbar((s) => ({ ...s, open: false }));
  }

  // ================== RENDER ==================
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Diagnostics</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Tìm theo VIN / Tên khách / SĐT"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Tooltip title="Làm mới">
            <IconButton onClick={() => loadPage()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            New
          </Button>
          <Button variant="outlined" onClick={() => loadPage(1, true)}>
            Của tôi
          </Button>
          <Button variant="outlined" onClick={() => loadPage(1, false)}>
            Tất cả
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Claim VIN</TableCell>
                  <TableCell>Kỹ thuật viên</TableCell>
                  <TableCell>SOH / SOC</TableCell>
                  <TableCell>Pack Voltage</TableCell>
                  <TableCell>Cell Delta (mV)</TableCell>
                  <TableCell>Cycles</TableCell>
                  <TableCell>Recorded At</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Không có bản ghi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.slice((page - 1) * pageSize, page * pageSize).map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell>{r.claimVin || "-"}</TableCell>
                      <TableCell>{r.performedByName || "-"}</TableCell>
                      <TableCell>
                        {r.sohPct} / {r.socPct}
                      </TableCell>
                      <TableCell>{r.packVoltage}</TableCell>
                      <TableCell>{r.cellDeltaMv}</TableCell>
                      <TableCell>{r.cycles}</TableCell>
                      <TableCell>{r.recordedAt ? new Date(r.recordedAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        <Chip label={r.phase} color={phaseColor(r.phase)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => handleView(r.id)}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>

                          {/* ✅ Chỉ hiện nếu là người tạo */}
                          {r.performedById === currentUserId && (
                            <>
                              <Tooltip title="Sửa">
                                <IconButton size="small" onClick={() => handleOpenEdit(r.id)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Hoàn tất">
                                <IconButton size="small" onClick={() => openConfirmMarkComplete(r.claimId, r.id)}>
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box display="flex" justifyContent="center" p={2}>
            <Pagination count={Math.max(1, totalPages)} page={page} onChange={(_, v) => setPage(v)} color="primary" />
          </Box>
        </Paper>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Diagnostic Details</DialogTitle>
        <DialogContent dividers>
          {!detailData ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>VIN</Typography>
                <Typography>{detailData.claimVin}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>SOH / SOC</Typography>
                <Typography>
                  {detailData.sohPct} / {detailData.socPct}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>Pack Voltage</Typography>
                <Typography>{detailData.packVoltage}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>Cell Delta (mV)</Typography>
                <Typography>{detailData.cellDeltaMv}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>Performed By</Typography>
                <Typography>{detailData.performedByName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>Cycles</Typography>
                <Typography>{detailData.cycles}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>Notes</Typography>
                <Typography>{detailData.notes}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Form Create/Edit */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{formMode === "create" ? "Create Diagnostic" : "Edit Diagnostic"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={claimsOptions}
                loading={loadingClaims}
                getOptionLabel={(opt) => `${opt.vin} — ${opt.intakeContactName} (${opt.intakeContactPhone})`}
                value={claimsOptions.find((c) => c.id === formValues.claimId) || null}
                onChange={(_, selected) => onSelectClaimForForm(selected)}
                renderInput={(params) => <TextField {...params} label="Chọn Claim (VIN / Khách hàng)" />}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField label="SOH %" fullWidth value={formValues.sohPct} onChange={(e) => setFormValues({ ...formValues, sohPct: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="SOC %" fullWidth value={formValues.socPct} onChange={(e) => setFormValues({ ...formValues, socPct: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Pack Voltage" fullWidth value={formValues.packVoltage} onChange={(e) => setFormValues({ ...formValues, packVoltage: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Cell Delta (mV)" fullWidth value={formValues.cellDeltaMv} onChange={(e) => setFormValues({ ...formValues, cellDeltaMv: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Cycles" fullWidth value={formValues.cycles} onChange={(e) => setFormValues({ ...formValues, cycles: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes" multiline fullWidth rows={3} value={formValues.notes} onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={formMode === "create" ? handleSubmitCreate : handleSubmitUpdate}>
            {formMode === "create" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Complete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Xác nhận hoàn tất</DialogTitle>
        <DialogContent>Bạn có chắc muốn hoàn tất diagnostic này?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleConfirmMarkComplete}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={closeSnackbar}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
