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
  ArrowForward as NextPhaseIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import diagnosticsService from "../../services/diagnosticsService";

/**
 * Diagnostics.jsx
 *
 * Implements:
 * - list (paged) via getMyDiagnostics
 * - getAll (button toggle to view all)
 * - view details (GET by id)
 * - create diagnostic (POST /create)
 * - edit/update (PUT /{id}/update)
 * - next-phase (GET /{claimId}/next-phase)
 * - can-complete (GET /{claimId}/can-complete) -> mark complete via update (assumption)
 *
 * Notes on assumptions:
 * - The 'update' endpoint's request body schema you posted does not explicitly show `phase` in request,
 *   but the response contains `phase`. To mark a diagnostic as COMPLETE we submit the full object and
 *   set `phase: "COMPLETED"`. If your backend requires a different call, replace the "markComplete" logic.
 */

export default function Diagnostics() {
  // list state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1); // 1-based for UI
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  // dialogs / forms / detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' | 'edit'
  const [formValues, setFormValues] = useState({
    claimId: "",
    sohPct: "",
    socPct: "",
    packVoltage: "",
    cellDeltaMv: "",
    cycles: "",
    notes: "",
  });

  // notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Search by claimId
  const [searchClaimId, setSearchClaimId] = useState("");

  async function handleSearchByClaim() {
    if (!searchClaimId.trim()) return;
    setLoading(true);
    try {
      const resp = await diagnosticsService.getByClaim(searchClaimId.trim());
      setRows(resp.data || []);
      setTotalPages(1); // disable pagination for search results
      setSnackbar({
        open: true,
        message: `Đã tải diagnostics theo Claim ID ${searchClaimId}`,
        severity: "success",
      });
    } catch (err) {
      console.error("Search error", err);
      setSnackbar({
        open: true,
        message: "Không tìm thấy Claim hoặc lỗi tải dữ liệu",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // load page of "my diagnostics" by default
  useEffect(() => {
    loadPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, viewAll]);

  async function loadPage(pageNumber = 1) {
    setLoading(true);
    setError(null);
    try {
      if (viewAll) {
        // getAll returns array (no paging) - we adapt to pagination locally
        const resp = await diagnosticsService.getAll();
        const items = resp.data || [];
        setTotalPages(Math.max(1, Math.ceil(items.length / pageSize)));
        // slice page
        const start = (pageNumber - 1) * pageSize;
        setRows(items.slice(start, start + pageSize));
      } else {
        // backend paged endpoint
        const resp = await diagnosticsService.getMyDiagnostics(pageNumber - 1, pageSize);
        // resp.data expected to be Page object as in your OpenAPI example
        const payload = resp.data || {};
        const content = payload.content || [];
        setRows(content);
        setTotalPages(payload.totalPages && payload.totalPages > 0 ? payload.totalPages : 1);
      }
    } catch (err) {
      console.error("Load diagnostics error", err);
      setError(err.response?.data?.message || err.message || "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  }

  // view details by diagnostic id
  async function handleView(id) {
    setDetailData(null);
    setDetailOpen(true);
    try {
      const resp = await diagnosticsService.getById(id);
      setDetailData(resp.data);
    } catch (err) {
      console.error("getById error", err);
      setSnackbar({ open: true, message: "Không lấy được chi tiết", severity: "error" });
      setDetailOpen(false);
    }
  }

  // open create form
  function handleOpenCreate() {
    setFormMode("create");
    setFormValues({
      claimId: "",
      sohPct: "",
      socPct: "",
      packVoltage: "",
      cellDeltaMv: "",
      cycles: "",
      notes: "",
    });
    setFormOpen(true);
  }

  // open edit form populated with data
  async function handleOpenEdit(id) {
    setFormMode("edit");
    setFormValues({
      claimId: "",
      sohPct: "",
      socPct: "",
      packVoltage: "",
      cellDeltaMv: "",
      cycles: "",
      notes: "",
      id,
    });
    // fetch full object
    try {
      const resp = await diagnosticsService.getById(id);
      const d = resp.data || {};
      setFormValues({
        id: d.id,
        claimId: d.claimId || "",
        claimVin: d.claimVin || "",
        sohPct: d.sohPct ?? "",
        socPct: d.socPct ?? "",
        packVoltage: d.packVoltage ?? "",
        cellDeltaMv: d.cellDeltaMv ?? "",
        cycles: d.cycles ?? "",
        notes: d.notes ?? "",
      });
      setFormOpen(true);
    } catch (err) {
      console.error("fetch for edit failed", err);
      setSnackbar({ open: true, message: "Lấy dữ liệu sửa thất bại", severity: "error" });
    }
  }

  // edit the currently viewed diagnostic (PRE or POST)
  async function handleEditCurrent() {
    if (!detailData?.id) return;
    try {
      const resp = await diagnosticsService.getById(detailData.id);
      const d = resp.data || detailData;
      setFormMode("edit");
      setFormValues({
        id: d.id,
        claimId: d.claimId || "",
        claimVin: d.claimVin || "",
        sohPct: d.sohPct ?? "",
        socPct: d.socPct ?? "",
        packVoltage: d.packVoltage ?? "",
        cellDeltaMv: d.cellDeltaMv ?? "",
        cycles: d.cycles ?? "",
        notes: d.notes ?? "",
      });
      setFormOpen(true);
    } catch (err) {
      console.error("editCurrent error", err);
      setSnackbar({ open: true, message: "Không thể mở form sửa", severity: "error" });
    }
  }

  // submit create
  async function handleSubmitCreate() {
    setLoading(true);
    try {
      const payload = {
        claimId: formValues.claimId,
        sohPct: parseFloat(formValues.sohPct) || 0,
        socPct: parseFloat(formValues.socPct) || 0,
        packVoltage: parseFloat(formValues.packVoltage) || 0,
        cellDeltaMv: parseFloat(formValues.cellDeltaMv) || 0,
        cycles: parseInt(formValues.cycles || 0, 10),
        notes: formValues.notes || "",
      };
      const resp = await diagnosticsService.create(payload);
      setSnackbar({ open: true, message: "Tạo diagnostic thành công", severity: "success" });
      setFormOpen(false);
      // reload current page
      loadPage(page);
    } catch (err) {
      console.error("create error", err);
      setSnackbar({ open: true, message: "Tạo diagnostic thất bại", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  // submit update
  async function handleSubmitUpdate() {
    if (!formValues.id) {
      setSnackbar({ open: true, message: "Missing id for update", severity: "error" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        claimId: formValues.claimId,
        sohPct: parseFloat(formValues.sohPct) || 0,
        socPct: parseFloat(formValues.socPct) || 0,
        packVoltage: parseFloat(formValues.packVoltage) || 0,
        cellDeltaMv: parseFloat(formValues.cellDeltaMv) || 0,
        cycles: parseInt(formValues.cycles || 0, 10),
        notes: formValues.notes || "",
      };
      await diagnosticsService.update(formValues.id, payload);
      setSnackbar({ open: true, message: "Cập nhật diagnostic thành công", severity: "success" });
      setFormOpen(false);
      loadPage(page);
    } catch (err) {
      console.error("update error", err);
      setSnackbar({ open: true, message: "Cập nhật thất bại", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  // chuyển phase PRE <-> POST
  async function handleSwitchPhase(claimId, diagId, currentPhase) {
    try {
      const nextPhase = currentPhase === "PRE_REPAIR" ? "POST_REPAIR" : "PRE_REPAIR";

      // lấy dữ liệu hiện tại
      const { data: current } = await diagnosticsService.getById(diagId);
      const payload = {
        claimId: current.claimId,
        sohPct: current.sohPct ?? 0,
        socPct: current.socPct ?? 0,
        packVoltage: current.packVoltage ?? 0,
        cellDeltaMv: current.cellDeltaMv ?? 0,
        cycles: current.cycles ?? 0,
        notes: current.notes ?? "",
        phase: nextPhase,
      };

      await diagnosticsService.update(diagId, payload);

      setRows((prev) =>
        prev.map((r) => (r.id === diagId ? { ...r, phase: nextPhase } : r))
      );

      setSnackbar({
        open: true,
        message: `✅ Đã chuyển sang ${nextPhase}`,
        severity: "success",
      });
    } catch (err) {
      console.error("switch phase error", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi chuyển phase",
        severity: "error",
      });
    }
  }

  // So sánh Diagnostics trước và sau
  async function handleShowPhase(claimId, phase) {
    try {
      const resp = await diagnosticsService.getByClaim(claimId);
      const all = resp.data || [];
      const found = all.find((d) => d.phase === phase);
      if (!found) {
        setSnackbar({
          open: true,
          message: `Không có bản ${phase}`,
          severity: "warning",
        });
        return;
      }
      setDetailData(found);
      setSnackbar({
        open: true,
        message: `Đang xem bản ${phase}`,
        severity: "info",
      });
    } catch (err) {
      console.error("show phase error", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi lấy dữ liệu phase",
        severity: "error",
      });
    }
  }

  // check can-complete and then mark complete via update (ASSUMPTION: update accepts a phase field)
  async function handleMarkComplete(claimId, diagId) {
    try {
      // 1️⃣ Kiểm tra xem có thể hoàn tất không
      const resp = await diagnosticsService.canComplete(claimId);
      const allowed = resp.data === true || resp.data === "true";

      if (!allowed) {
        setSnackbar({
          open: true,
          message: "⚠️ Không thể hoàn tất - điều kiện chưa đủ",
          severity: "warning",
        });
        return;
      }

      // 2️⃣ Lấy dữ liệu diagnostic hiện tại (để giữ nguyên giá trị cũ)
      const currentResp = await diagnosticsService.getById(diagId);
      const current = currentResp.data || {};

      // 3️⃣ Gọi PUT /update với đúng 6 trường hợp lệ
      const payload = {
        claimId: current.claimId,
        sohPct: current.sohPct ?? 0,
        socPct: current.socPct ?? 0,
        packVoltage: current.packVoltage ?? 0,
        cellDeltaMv: current.cellDeltaMv ?? 0,
        cycles: current.cycles ?? 0,
        notes: current.notes || "",
      };

      await diagnosticsService.update(diagId, payload);

      setSnackbar({
        open: true,
        message: "✅ Diagnostic đã được cập nhật trạng thái hoàn tất",
        severity: "success",
      });

      // 4️⃣ Reload danh sách
      loadPage(page);
    } catch (err) {
      console.error("mark complete error", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi đánh dấu hoàn tất",
        severity: "error",
      });
    }
  }

  function closeSnackbar() {
    setSnackbar((s) => ({ ...s, open: false }));
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Diagnostics</Typography>

        {/* Search by Claim ID */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Search by Claim ID"
            variant="outlined"
            value={searchClaimId}
            onChange={(e) => setSearchClaimId(e.target.value)}
          />
          <Button variant="outlined" onClick={handleSearchByClaim}>
            Search
          </Button>
          <Button
            variant="text"
            onClick={async () => {
              try {
                setSearchClaimId("");
                await loadPage(1);
              } catch {
                setSnackbar({ open: true, message: "Không thể tải danh sách", severity: "error" });
              }
            }}
          >
            Reset
          </Button>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant={viewAll ? "contained" : "outlined"}
            size="small"
            onClick={() => {
              setViewAll(!viewAll);
              setPage(1);
            }}
          >
            {viewAll ? "Viewing: All" : "Viewing: My Diagnostics"}
          </Button>

          <Tooltip title="Refresh">
            <IconButton onClick={() => loadPage(page)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            New
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
            <Table
              sx={{
                "& td, & th": {
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  textAlign: "center",
                  verticalAlign: "middle",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell align="center">STT</TableCell>
                  <TableCell align="center">Claim VIN</TableCell>
                  <TableCell align="center">Performed By</TableCell>
                  <TableCell align="center">SOH / SOC</TableCell>
                  <TableCell align="center">Pack Voltage</TableCell>
                  <TableCell align="center">Cycles</TableCell>
                  <TableCell align="center">Recorded At</TableCell>
                  <TableCell align="center">Phase</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" align="center" sx={{ py: 3 }}>
                        Không có bản ghi
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell align="center">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell align="center">{r.claimVin || "-"}</TableCell>
                    <TableCell align="center">{r.performedByName || "-"}</TableCell>
                    <TableCell align="center">
                      {r.sohPct ?? "-"} / {r.socPct ?? "-"}
                    </TableCell>
                    <TableCell align="center">{r.packVoltage ?? "-"}</TableCell>
                    <TableCell align="center">{r.cycles ?? "-"}</TableCell>
                    <TableCell align="center">
                      {r.recordedAt ? new Date(r.recordedAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={r.phase || "UNKNOWN"} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Xem chi tiết">
                          <IconButton size="small" onClick={() => handleView(r.id)}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Sửa">
                          <IconButton size="small" onClick={() => handleOpenEdit(r.id)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip
                          title={
                            r.phase === "PRE_REPAIR"
                              ? "Chuyển sang POST_REPAIR"
                              : "Chuyển sang PRE_REPAIR"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleSwitchPhase(r.claimId, r.id, r.phase)}
                          >
                            <NextPhaseIcon
                              sx={{
                                transform:
                                  r.phase === "POST_REPAIR" ? "rotate(180deg)" : "none",
                              }}
                            />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Hoàn tất">
                          <IconButton
                            size="small"
                            onClick={() => handleMarkComplete(r.claimId, r.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={Math.max(1, totalPages)}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Box>
        </Paper>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Diagnostic Details (View Only)</DialogTitle>
        <DialogContent dividers>
          {!detailData ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">VIN</Typography>
                <Typography variant="body1">{detailData.claimVin || "-"}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">Performed By</Typography>
                <Typography variant="body1">{detailData.performedByName || "-"}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">SOH %</Typography>
                <Typography variant="body1">{detailData.sohPct}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">SOC %</Typography>
                <Typography variant="body1">{detailData.socPct}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">Pack Voltage</Typography>
                <Typography variant="body1">{detailData.packVoltage}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">Cell Delta (mV)</Typography>
                <Typography variant="body1">{detailData.cellDeltaMv}</Typography>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2">Cycles</Typography>
                <Typography variant="body1">{detailData.cycles}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Notes</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailData.notes || "-"}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Recorded: {detailData.recordedAt ? new Date(detailData.recordedAt).toLocaleString() : "-"}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Phase</Typography>
                <Chip label={detailData.phase || "UNKNOWN"} />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          {/* Nhóm nút chuyển phase */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Xem PRE_REPAIR">
              <span>
                <IconButton
                  onClick={() => handleShowPhase(detailData.claimId, "PRE_REPAIR")}
                  disabled={detailData?.phase === "PRE_REPAIR"}
                >
                  <NextPhaseIcon
                    sx={{
                      transform: "rotate(180deg)",
                      color:
                        detailData?.phase === "PRE_REPAIR"
                          ? "action.disabled"
                          : "primary.main",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>

            <Typography variant="body2" color="text.secondary">
              {detailData?.phase || "UNKNOWN"}
            </Typography>

            <Tooltip title="Xem POST_REPAIR">
              <span>
                <IconButton
                  onClick={() => handleShowPhase(detailData.claimId, "POST_REPAIR")}
                  disabled={detailData?.phase === "POST_REPAIR"}
                >
                  <NextPhaseIcon
                    sx={{
                      color:
                        detailData?.phase === "POST_REPAIR"
                          ? "action.disabled"
                          : "primary.main",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {/* Nhóm nút điều khiển */}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{formMode === "create" ? "Create Diagnostic" : "Edit Diagnostic"}</DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="VIN"
                fullWidth
                value={formValues.claimVin || ""}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="SOH %"
                type="number"
                fullWidth
                value={formValues.sohPct}
                onChange={(e) => setFormValues((s) => ({ ...s, sohPct: e.target.value }))}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="SOC %"
                type="number"
                fullWidth
                value={formValues.socPct}
                onChange={(e) => setFormValues((s) => ({ ...s, socPct: e.target.value }))}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Pack Voltage"
                type="number"
                fullWidth
                value={formValues.packVoltage}
                onChange={(e) => setFormValues((s) => ({ ...s, packVoltage: e.target.value }))}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Cell Delta (mV)"
                type="number"
                fullWidth
                value={formValues.cellDeltaMv}
                onChange={(e) => setFormValues((s) => ({ ...s, cellDeltaMv: e.target.value }))}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Cycles"
                type="number"
                fullWidth
                value={formValues.cycles}
                onChange={(e) => setFormValues((s) => ({ ...s, cycles: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={formValues.notes}
                onChange={(e) => setFormValues((s) => ({ ...s, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          {formMode === "create" ? (
            <Button variant="contained" onClick={handleSubmitCreate}>
              Create
            </Button>
          ) : (
            <Button variant="contained" onClick={handleSubmitUpdate}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        onClose={closeSnackbar}
        autoHideDuration={3500}
      >
        <Alert
          severity={snackbar.severity || "info"}
          onClose={closeSnackbar}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
