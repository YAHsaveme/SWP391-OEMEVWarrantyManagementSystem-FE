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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableSortLabel,
  Card,
  CardContent,
  Divider,
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
import eventService from "../../services/eventService";
import axiosInstance from "../../services/axiosInstance";

export default function Diagnostics() {
  // ✅ Đúng với Backend Enum
  const DIAGNOSTIC_PHASE = {
    PRE_REPAIR: "PRE_REPAIR",
    POST_REPAIR: "POST_REPAIR",
  };

  const DIAGNOSTIC_OUTCOME = {
    NO_FAULT_FOUND: "NO_FAULT_FOUND",
    FAULT_CONFIRMED: "FAULT_CONFIRMED",
  };

  // ✅ Mapping hiển thị tiếng Việt
  const PHASE_LABELS = {
    PRE_REPAIR: "Trước sửa chữa",
    POST_REPAIR: "Sau sửa chữa",
  };

  const OUTCOME_LABELS = {
    NO_FAULT_FOUND: "Không tìm thấy lỗi",
    FAULT_CONFIRMED: "Lỗi đã được xác nhận",
  };

  // ✅ Lấy userId hiện tại từ localStorage
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
  const [viewMode, setViewMode] = useState("my"); // "my" hoặc "all"

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [recallEvents, setRecallEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
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
    outcome: "",
  });

  // Phase logic
  const [createPhaseHint, setCreatePhaseHint] = useState(null);
  const [createPhaseCount, setCreatePhaseCount] = useState(0);

  // Snackbar + confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState({ claimId: null, diagId: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPhase, setFilterPhase] = useState("ALL");
  const [filterOutcome, setFilterOutcome] = useState("ALL");

  // Sort
  const [sortColumn, setSortColumn] = useState("recordedAt");
  const [sortDirection, setSortDirection] = useState("desc");

  const log = {
    info: (...args) => console.info("🔵 [Diagnostics]", ...args),
    ok: (...args) => console.log("✅ [Diagnostics]", ...args),
    err: (...args) => console.error("❌ [Diagnostics]", ...args),
  };

  // ================== LOAD DATA ==================
  async function loadClaims() {
    try {
      setLoadingClaims(true);
      // Load cả DIAGNOSING và APPROVED, sẽ filter theo phase hint sau
      const [claimsRes, vehiclesRes] = await Promise.all([
        axiosInstance.get("claims/get-all"),
        axiosInstance.get("vehicles/get-all"),
      ]);

      const allClaims = Array.isArray(claimsRes.data) ? claimsRes.data : [];
      console.log("Total claims loaded:", allClaims.length);
      // Filter: chỉ lấy DIAGNOSING (cho pre_repair) hoặc APPROVED (cho post_repair)
      const claims = allClaims.filter(c => c.status === "DIAGNOSING" || c.status === "APPROVED");
      console.log("Filtered claims (DIAGNOSING or APPROVED):", claims.length);
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

      console.log("Merged claims count:", merged.length);
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
  async function loadPage(pageNumber = 1, mode = viewMode) {
    setLoading(true);
    setError(null);
    try {
      let items = [];
      if (mode === "my") {
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
      applyFiltersAndSort(items);
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

  // ================== FILTER & SORT ==================
  function applyFiltersAndSort(data = rows) {
    let result = [...data];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.claimVin?.toLowerCase().includes(query) ||
          r.performedByName?.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query)
      );
    }

    // Filter by Phase
    if (filterPhase !== "ALL") {
      result = result.filter((r) => r.phase === filterPhase);
    }

    // Filter by Outcome
    if (filterOutcome !== "ALL") {
      result = result.filter((r) => r.outcome === filterOutcome);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      if (sortColumn === "recordedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const compare = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? compare : -compare;
    });

    setFilteredRows(result);
  }

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, filterPhase, filterOutcome, sortColumn, sortDirection, rows]);

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  // ================== VIEW DETAIL ==================
  async function handleView(id) {
    setDetailData(null);
    setDetailOpen(true);
    try {
      const resp = await diagnosticsService.getById(id);
      setDetailData(resp);

      // Load recall events for this diagnostic's claim VIN
      if (resp?.claimVin) {
        setLoadingEvents(true);
        try {
          const recallResult = await eventService.checkRecallByVin(resp.claimVin);
          setRecallEvents(recallResult.events || []);
        } catch (err) {
          log.err("Load recall events error", err);
          setRecallEvents([]);
        } finally {
          setLoadingEvents(false);
        }
      } else {
        setRecallEvents([]);
      }
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
      outcome: "",
    });
    // Mặc định là PRE_REPAIR (trước sửa chữa) - chỉ hiện DIAGNOSING
    setCreatePhaseHint(DIAGNOSTIC_PHASE.PRE_REPAIR);
    setCreatePhaseCount(0);
    setFormOpen(true);
  }

  async function onSelectClaimForForm(selected) {
    if (!selected) {
      setFormValues((f) => ({
        ...f,
        claimId: "",
        customerName: "",
        customerPhone: "",
      }));
      setCreatePhaseCount(0);
      // Reset về PRE_REPAIR khi bỏ chọn
      setCreatePhaseHint(DIAGNOSTIC_PHASE.PRE_REPAIR);
      return;
    }

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

      if (arr.length === 0) {
        // Chưa có diagnostic nào → sẽ tạo PRE_REPAIR → chỉ hiện DIAGNOSING
        setCreatePhaseHint(DIAGNOSTIC_PHASE.PRE_REPAIR);
      } else if (arr.length === 1) {
        // Đã có 1 diagnostic (PRE_REPAIR) → sẽ tạo POST_REPAIR → chỉ hiện APPROVED
        setCreatePhaseHint(DIAGNOSTIC_PHASE.POST_REPAIR);
      } else {
        // Đã có đủ 2 diagnostics → không cho tạo thêm
        setCreatePhaseHint(null);
      }
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

      const payload = {
        claimId: formValues.claimId,
        sohPct: formValues.sohPct !== "" ? Number(formValues.sohPct) : null,
        socPct: formValues.socPct !== "" ? Number(formValues.socPct) : null,
        packVoltage: formValues.packVoltage !== "" ? Number(formValues.packVoltage) : null,
        cellDeltaMv: formValues.cellDeltaMv !== "" ? Number(formValues.cellDeltaMv) : null,
        cycles: formValues.cycles !== "" ? Number(formValues.cycles) : null,
        notes: (formValues.notes || "").trim(),
        outcome: formValues.outcome || null,
      };

      log.info("Creating diagnostic with payload:", payload);

      const result = await diagnosticsService.create(payload);

      log.ok("Created result:", result);
      setSnackbar({
        open: true,
        message: `Đã tạo bản ${existing.length === 0 ? "PRE_REPAIR" : "POST_REPAIR"} thành công`,
        severity: "success",
      });
      setFormOpen(false);
      loadPage();
    } catch (err) {
      log.err("create error", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Tạo thất bại — kiểm tra lại dữ liệu",
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
        outcome: d.outcome ?? "",
      });
      setFormOpen(true);
    } catch (err) {
      log.err("Open edit error", err);
      setSnackbar({ open: true, message: "Không thể mở form sửa", severity: "error" });
    }
  }

  async function handleSubmitUpdate() {
    try {
      const current = await diagnosticsService.getById(formValues.id);
      const clean = {
        claimId: current.claimId,
        sohPct: formValues.sohPct !== "" ? Number(formValues.sohPct) : null,
        socPct: formValues.socPct !== "" ? Number(formValues.socPct) : null,
        packVoltage: formValues.packVoltage !== "" ? Number(formValues.packVoltage) : null,
        cellDeltaMv: formValues.cellDeltaMv !== "" ? Number(formValues.cellDeltaMv) : null,
        cycles: formValues.cycles !== "" ? Number(formValues.cycles) : null,
        notes: (formValues.notes || "").trim(),
        outcome: formValues.outcome || null,
      };
      await diagnosticsService.update(formValues.id, clean);
      setSnackbar({ open: true, message: "Cập nhật thành công", severity: "success" });
      setFormOpen(false);
      loadPage();
    } catch (err) {
      log.err("Update failed:", err);
      if (err.response?.data?.error === "AUTH_ERROR") {
        setSnackbar({
          open: true,
          message: err.response.data.message || "Bạn không có quyền chỉnh sửa bản này",
          severity: "warning"
        });
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
    if (!claimId || !diagId) return;

    try {
      const current = await diagnosticsService.getById(diagId);
      const clean = {
        claimId: current.claimId,
        sohPct: current.sohPct,
        socPct: current.socPct,
        packVoltage: current.packVoltage,
        cellDeltaMv: current.cellDeltaMv,
        cycles: current.cycles,
        notes: current.notes || "",
        outcome: current.outcome || null,
      };
      await diagnosticsService.update(diagId, clean);
      setSnackbar({ open: true, message: "Đã xác nhận diagnostic", severity: "success" });
      loadPage();
    } catch (err) {
      log.err("Mark complete failed:", err);
      if (err.response?.data?.error === "AUTH_ERROR") {
        setSnackbar({
          open: true,
          message: err.response.data.message || "Bạn không có quyền xác nhận bản này",
          severity: "warning"
        });
      } else {
        setSnackbar({ open: true, message: "Không thể xác nhận", severity: "error" });
      }
    }
  }

  // ================== UI HELPERS ==================
  function phaseColor(phase) {
    if (phase === DIAGNOSTIC_PHASE.PRE_REPAIR) return "info";
    if (phase === DIAGNOSTIC_PHASE.POST_REPAIR) return "warning";
    return "default";
  }

  function outcomeColor(outcome) {
    if (outcome === DIAGNOSTIC_OUTCOME.NO_FAULT_FOUND) return "success";
    if (outcome === DIAGNOSTIC_OUTCOME.FAULT_CONFIRMED) return "error";
    return "default";
  }

  function closeSnackbar() {
    setSnackbar((s) => ({ ...s, open: false }));
  }

  function handleChangeViewMode(mode) {
    setViewMode(mode);
    setPage(1);
    loadPage(1, mode);
  }

  // ================== RENDER ==================
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Đánh giá sau sửa chữa</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Tìm theo VIN / Tên kỹ thuật / Ghi chú"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Giai đoạn</InputLabel>
            <Select value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)} label="Phase">
              <MenuItem value="ALL">Tất cả</MenuItem>
              <MenuItem value="PRE_REPAIR">Trước sửa chữa</MenuItem>
              <MenuItem value="POST_REPAIR">Sau sửa chữa</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Kết quả</InputLabel>
            <Select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)} label="Outcome">
              <MenuItem value="ALL">Tất cả</MenuItem>
              <MenuItem value="NO_FAULT_FOUND">Không tìm thấy lỗi</MenuItem>
              <MenuItem value="FAULT_CONFIRMED">Lỗi đã được xác nhận</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Làm mới">
            <IconButton onClick={() => loadPage()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Tạo mới
          </Button>

          <Button
            variant={viewMode === "my" ? "contained" : "outlined"}
            onClick={() => handleChangeViewMode("my")}
          >
            Của tôi
          </Button>

          <Button
            variant={viewMode === "all" ? "contained" : "outlined"}
            onClick={() => handleChangeViewMode("all")}
          >
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
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === "claimVin"}
                      direction={sortColumn === "claimVin" ? sortDirection : "asc"}
                      onClick={() => handleSort("claimVin")}
                    >
                      VIN
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === "performedByName"}
                      direction={sortColumn === "performedByName" ? sortDirection : "asc"}
                      onClick={() => handleSort("performedByName")}
                    >
                      Kỹ thuật viên
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === "sohPct"}
                      direction={sortColumn === "sohPct" ? sortDirection : "asc"}
                      onClick={() => handleSort("sohPct")}
                    >
                      SOH / SOC
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Điện áp của bộ pin</TableCell>
                  <TableCell>Độ chênh lệch điện áp giữa các cell (mV)</TableCell>
                  <TableCell>Số chu kỳ sạc–xả của pin</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortColumn === "recordedAt"}
                      direction={sortColumn === "recordedAt" ? sortDirection : "asc"}
                      onClick={() => handleSort("recordedAt")}
                    >
                      Được ghi nhận vào lúc
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Giai đoạn</TableCell>
                  <TableCell>Kết quả</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      Không có bản ghi
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.slice((page - 1) * pageSize, page * pageSize).map((r, i) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell>{r.claimVin || "-"}</TableCell>
                      <TableCell>{r.performedByName || "-"}</TableCell>
                      <TableCell>
                        {r.sohPct ?? "-"} / {r.socPct ?? "-"}
                      </TableCell>
                      <TableCell>{r.packVoltage ?? "-"}</TableCell>
                      <TableCell>{r.cellDeltaMv ?? "-"}</TableCell>
                      <TableCell>{r.cycles ?? "-"}</TableCell>
                      <TableCell>
                        {r.recordedAt ? new Date(r.recordedAt).toLocaleString("vi-VN") : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip label={PHASE_LABELS[r.phase] || r.phase || "-"} color={phaseColor(r.phase)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={OUTCOME_LABELS[r.outcome] || r.outcome || "-"}
                          color={outcomeColor(r.outcome)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => handleView(r.id)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* ✅ Chỉ hiện nếu là người tạo */}
                          {r.performedById === currentUserId && (
                            <>
                              <Tooltip title="Sửa">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEdit(r.id)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Xác nhận">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => openConfirmMarkComplete(r.claimId, r.id)}
                                >
                                  <CheckIcon fontSize="small" />
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

          <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="body2" color="text.secondary">
              Hiển thị {Math.min((page - 1) * pageSize + 1, filteredRows.length)} - {Math.min(page * pageSize, filteredRows.length)} của {filteredRows.length} bản ghi
            </Typography>
            <Pagination
              count={Math.max(1, Math.ceil(filteredRows.length / pageSize))}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Box>
        </Paper>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Chi tiết đánh giá </DialogTitle>
        <DialogContent dividers>
          {!detailData ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">VIN</Typography>
                  <Typography variant="body1">{detailData.claimVin || "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Kỹ thuật viên</Typography>
                  <Typography variant="body1">{detailData.performedByName || "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">SOH (%)</Typography>
                  <Typography variant="body1">{detailData.sohPct ?? "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">SOC (%)</Typography>
                  <Typography variant="body1">{detailData.socPct ?? "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Điện áp của bộ pin</Typography>
                  <Typography variant="body1">{detailData.packVoltage ?? "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Độ chênh lệch điện áp giữa các cell (mV)</Typography>
                  <Typography variant="body1">{detailData.cellDeltaMv ?? "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Số chu kỳ sạc–xả của pin</Typography>
                  <Typography variant="body1">{detailData.cycles ?? "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Được ghi nhận vào lúc</Typography>
                  <Typography variant="body1">
                    {detailData.recordedAt ? new Date(detailData.recordedAt).toLocaleString("vi-VN") : "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Giai đoạn</Typography>
                  <Box mt={0.5}>
                    <Chip label={PHASE_LABELS[detailData.phase] || detailData.phase || "-"} color={phaseColor(detailData.phase)} size="small" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Kết quả</Typography>
                  <Box mt={0.5}>
                    <Chip
                      label={OUTCOME_LABELS[detailData.outcome] || detailData.outcome || "-"}
                      color={outcomeColor(detailData.outcome)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                  <Typography variant="body1">{detailData.notes || "Không có ghi chú"}</Typography>
                </Grid>
              </Grid>

              {/* Recall Events Section */}
              {detailData?.claimVin && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                      Sự kiện thu hồi xe ({recallEvents.length})
                    </Typography>
                    {loadingEvents ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                        <CircularProgress />
                      </Box>
                    ) : recallEvents.length === 0 ? (
                      <Typography color="text.secondary">Không có sự kiện thu hồi cho VIN này</Typography>
                    ) : (
                      <Stack spacing={2}>
                        {recallEvents.map((event) => (
                          <Card key={event.id} variant="outlined" sx={{ bgcolor: "warning.light", opacity: 0.9 }}>
                            <CardContent>
                              <Stack spacing={1}>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Tên sự kiện</Typography>
                                    <Typography variant="body1">{event.name || "—"}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Loại</Typography>
                                    <Typography variant="body1">{event.type || "—"}</Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Lý do</Typography>
                                    <Typography variant="body1">{event.reason || "—"}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Ngày bắt đầu</Typography>
                                    <Typography variant="body1">{event.startDate ? new Date(event.startDate).toLocaleString("vi-VN") : "—"}</Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Ngày kết thúc</Typography>
                                    <Typography variant="body1">{event.endDate ? new Date(event.endDate).toLocaleString("vi-VN") : "—"}</Typography>
                                  </Grid>
                                  {event.affectedParts && event.affectedParts.length > 0 && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Những phụ tùng bị ảnh hưởng:</Typography>
                                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        {event.affectedParts.map((part, idx) => (
                                          <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                            • {part}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    </Grid>
                                  )}
                                  {event.exclusions && event.exclusions.length > 0 && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Không áp dụng:</Typography>
                                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        {event.exclusions.map((excl, idx) => (
                                          <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                            • {excl}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    </Grid>
                                  )}
                                </Grid>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Form Create/Edit */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {formMode === "create" ? "Tạo đánh giá mới" : "Chỉnh sửa đánh giá"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={claimsOptions.filter(c => {
                  // Trước sửa chữa (PRE_REPAIR): chỉ hiện DIAGNOSING
                  // Sau sửa chữa (POST_REPAIR): chỉ hiện APPROVED
                  if (createPhaseHint === DIAGNOSTIC_PHASE.PRE_REPAIR) {
                    return c.status === "DIAGNOSING";
                  } else if (createPhaseHint === DIAGNOSTIC_PHASE.POST_REPAIR) {
                    return c.status === "APPROVED";
                  }
                  // Nếu không có hint (đã có đủ 2 diagnostics), không hiện gì
                  return false;
                })}
                loading={loadingClaims}
                getOptionLabel={(opt) => `${opt.vin} — ${opt.intakeContactName} (${opt.intakeContactPhone})`}
                value={claimsOptions.find((c) => c.id === formValues.claimId) || null}
                onChange={(_, selected) => onSelectClaimForForm(selected)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Chọn yêu cầu (VIN / Khách hàng)" 
                    helperText={
                      createPhaseHint === DIAGNOSTIC_PHASE.PRE_REPAIR 
                        ? "Chỉ hiển thị yêu cầu có trạng thái chuẩn đoán(Trước sửa chữa)"
                        : createPhaseHint === DIAGNOSTIC_PHASE.POST_REPAIR
                        ? "Chỉ hiển thị yêu cầu có trạng thái xác nhận (Sau sửa chữa)"
                        : ""
                    }
                  />
                )}
                disabled={formMode === "edit"}
              />
              {createPhaseHint && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Claim này đã có {createPhaseCount} đánh giá. Sẽ tạo {createPhaseHint}.
                </Alert>
              )}
              {createPhaseCount >= 2 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Claim này đã có đủ 2 đánh giá (Trước & Sau).
                </Alert>
              )}
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Tình trạng pin (%)"
                fullWidth
                type="number"
                inputProps={{ step: "0.1", min: "0", max: "100" }}
                value={formValues.sohPct}
                onChange={(e) => setFormValues({ ...formValues, sohPct: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Mức sạc"
                fullWidth
                type="number"
                inputProps={{ step: "0.1", min: "0", max: "100" }}
                value={formValues.socPct}
                onChange={(e) => setFormValues({ ...formValues, socPct: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Điện áp của bộ pin"
                fullWidth
                type="number"
                inputProps={{ step: "0.1" }}
                value={formValues.packVoltage}
                onChange={(e) => setFormValues({ ...formValues, packVoltage: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Độ chênh lệch điện áp giữa các cell (mV)"
                fullWidth
                type="number"
                inputProps={{ step: "0.1" }}
                value={formValues.cellDeltaMv}
                onChange={(e) => setFormValues({ ...formValues, cellDeltaMv: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Số chu kỳ sạc–xả của pin"
                fullWidth
                type="number"
                inputProps={{ step: "1", min: "0" }}
                value={formValues.cycles}
                onChange={(e) => setFormValues({ ...formValues, cycles: e.target.value })}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Kết quả</InputLabel>
                <Select
                  value={formValues.outcome}
                  onChange={(e) => setFormValues({ ...formValues, outcome: e.target.value })}
                  label="Outcome"
                >
                  <MenuItem value="">-- Không chọn --</MenuItem>
                  <MenuItem value="NO_FAULT_FOUND">Không tìm thấy lỗi</MenuItem>
                  <MenuItem value="FAULT_CONFIRMED">Lỗi đã được xác nhận</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Ghi chú"
                multiline
                fullWidth
                rows={4}
                value={formValues.notes}
                onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                placeholder="Nhập ghi chú chi tiết về đánh giá..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={formMode === "create" ? handleSubmitCreate : handleSubmitUpdate}
            disabled={!formValues.claimId}
          >
            {formMode === "create" ? "Tạo mới" : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Complete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Xác nhận đánh giá</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xác nhận đánh giá này?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Sau khi xác nhận, bạn vẫn có thể chỉnh sửa các thông số kỹ thuật.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleConfirmMarkComplete}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}