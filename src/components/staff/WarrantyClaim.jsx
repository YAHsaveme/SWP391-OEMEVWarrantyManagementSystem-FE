// src/components/evm/WarrantyClaim.jsx
"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import claimService from "../../services/claimService";
import { uploadToCloudinary } from "../../utils/cloudinary";

const statusColor = {
  SUBMITTED: "info",
  PENDING: "warning",
  APPROVED: "success",
  COMPLETED: "default",
  REJECTED: "error",
  DIAGNOSING: "warning",
};

/** ---- Stat Card ---- */
function StatCard({ icon, label, value }) {
  return (
    <Card elevation={3}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: (t) => t.palette.action.hover,
              display: "inline-flex",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function WarrantyClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);

  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  // Prepare upload placeholder
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        let data = [];
        if (statusFilter === "all") {
          data = await claimService.getAll();
        } else {
          data = await claimService.getByStatus(statusFilter);
        }
        if (mounted) setClaims(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Fetch claims failed:", err);
        setSnack({ open: true, message: "Failed to load claims", severity: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [statusFilter]);

  const totals = useMemo(() => {
    const count = claims.length;
    const pending = claims.filter((c) => c.status === "PENDING" || c.status === "DIAGNOSING").length;
    const approved = claims.filter((c) => c.status === "APPROVED").length;
    const completed = claims.filter((c) => c.status === "COMPLETED").length;
    return { count, pending, approved, completed };
  }, [claims]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return claims;
    return claims.filter((c) => {
      return (
        c.vin?.toLowerCase().includes(text) ||
        (c.summary || "").toLowerCase().includes(text) ||
        c.id?.toLowerCase().includes(text)
      );
    });
  }, [claims, q]);

  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    const text = q.trim();
    if (!text) {
      try {
        setLoading(true);
        const data = statusFilter === "all" ? await claimService.getAll() : await claimService.getByStatus(statusFilter);
        setClaims(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error(err);
        setSnack({ open: true, message: "Search failed", severity: "error" });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const data = await claimService.getByVin(text);
      if (Array.isArray(data)) setClaims(data);
      else if (data) setClaims([data]);
      else setClaims([]);
    } catch (err) {
      console.error("Search by VIN failed:", err);
      setSnack({ open: true, message: "Search by VIN failed", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Warranty Claims</Typography>
          <Typography color="text.secondary">Manage and track warranty claims</Typography>
        </Box>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Create Claim
        </Button>
      </Stack>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<DescriptionIcon />} label="Total Claims" value={totals.count} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PendingActionsIcon />} label="Pending" value={totals.pending} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircleIcon />} label="Approved" value={totals.approved} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<DoneAllIcon />} label="Completed" value={totals.completed} />
        </Grid>
      </Grid>

      {/* Search & Filter */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <form onSubmit={handleSearchSubmit}>
            <TextField
              fullWidth
              placeholder="Search by VIN, summary, or claim ID... (Enter to search by VIN)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit(e);
                }
              }}
            />
          </form>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Filter by status</InputLabel>
            <Select
              labelId="status-label"
              label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="DIAGNOSING">Diagnosing</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Claims List */}
      <Stack spacing={2}>
        {filtered.map((claim) => (
          <Card key={claim.id} elevation={3} sx={{ "&:hover": { boxShadow: 8 } }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                <Box flex={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="h6" fontWeight={700}>{claim.id}</Typography>
                    <Chip
                      size="small"
                      label={claim.status}
                      color={statusColor[claim.status] || "default"}
                      variant={claim.status === "APPROVED" ? "filled" : "outlined"}
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>

                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Row label="VIN" value={<Mono>{claim.vin}</Mono>} />
                    <Row label="Summary" value={claim.summary || "—"} />
                    <Row
                      label="Created"
                      value={new Date(claim.openedAt || claim.createdAt || claim.errorDate || Date.now()).toLocaleDateString()}
                    />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} alignSelf={{ xs: "flex-start", sm: "center" }}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const detail = await claimService.getById(claim.id);
                        setActiveClaim(detail || claim);
                        setViewOpen(true);
                      } catch (err) {
                        console.error("Get claim detail failed:", err);
                        setSnack({ open: true, message: "Failed to load claim detail", severity: "error" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    View Details
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center", color: "text.secondary" }}>
              No claims found.
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Create Claim Dialog */}
      <CreateClaimDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (newClaim) => {
          try {
            setLoading(true);
            const created = await claimService.create(newClaim);
            setClaims((prev) => [created, ...prev]);
            setSnack({ open: true, message: "Claim created successfully", severity: "success" });
            } catch (err) {
                console.error("Create claim failed:", err);
                const message =
                    err.response?.data || "Tạo claim thất bại, vui lòng thử lại sau!";
                setSnack({ open: true, message, severity: "error" });
            } finally {
                setLoading(false);
            }
        }}
      />

      {/* View/Update Claim Dialog */}
      <ViewClaimDialog
        open={viewOpen}
        claim={activeClaim}
        onClose={() => setViewOpen(false)}
        onUpdateStatus={async (id, updatedStatus) => {
          try {
            setLoading(true);
            const updated = await claimService.updateStatus(id, updatedStatus);
            setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
            setSnack({ open: true, message: "Claim status updated", severity: "success" });
          } catch (err) {
            console.error("Update status failed:", err);
            const message =
                err.response?.data || "Cập nhật trạng thái claim thất bại!";
            setSnack({ open: true, message, severity: "error" });
          } finally {
            setLoading(false);
          }
        }}
        onUpdateClaim={async (id, payload) => {
          try {
            setLoading(true);
            const updated = await claimService.update(id, payload);
            setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
            setSnack({ open: true, message: "Claim updated", severity: "success" });
          } catch (err) {
                console.error("Update claim failed:", err);
                const message =
                    err.response?.data || "Cập nhật claim thất bại, vui lòng thử lại!";
                setSnack({ open: true, message, severity: "error" });
          } finally {
                setLoading(false);
          }
        }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Container>
  );
}

/* ---------- helpers ---------- */
function Mono({ children }) {
  return <Box component="span" sx={{ fontFamily: "monospace" }}>{children}</Box>;
}

function Row({ label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Stack>
  );
}

/* ---------- Create Claim Dialog ---------- */
function CreateClaimDialog({ open, onClose, onCreate }) {
  const [vin, setVin] = useState("");
  const [summary, setSummary] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [errorDate, setErrorDate] = useState("");
  const [claimType, setClaimType] = useState("NORMAL");

  // File upload state
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!vin || !summary) return;

  try {
    // Upload file lên Cloudinary trước
    const uploadedUrls = files.length > 0 ? await uploadToCloudinary(files) : [];

    // Gửi payload JSON lên backend
    const payload = {
      vin,
      claimType,
      errorDate: errorDate ? new Date(errorDate).toISOString() : new Date().toISOString(),
      odometerKm: Number(odometerKm) || 0,
      summary,
      attachmentUrls: uploadedUrls,
    };

    await onCreate?.(payload);
    onClose?.();

    // Reset form
    setVin("");
    setSummary("");
    setOdometerKm("");
    setErrorDate("");
    setClaimType("NORMAL");
    setFiles([]);
  } catch (err) {
    console.error("Create claim failed:", err);
  }
};

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>Create Warranty Claim</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="VIN" value={vin} onChange={(e) => setVin(e.target.value)} fullWidth required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Error Date"
                type="datetime-local"
                value={errorDate}
                onChange={(e) => setErrorDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Odometer (km)" type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="claim-type-label">Claim Type</InputLabel>
                <Select
                  labelId="claim-type-label"
                  label="Claim Type"
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                >
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="EXPEDITED">Expedited</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} multiline minRows={3} fullWidth required />
            </Grid>

            {/* ⚙️ File Upload Input */}
            <Grid item xs={12}>
  <Button variant="outlined" component="label" fullWidth>
    Upload Attachments (images/pdf)
    <input
      type="file"
      multiple
      hidden
      onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
    />
  </Button>

  {files.length > 0 && (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2">Selected Files:</Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {files.map((file, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #ddd",
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                wordBreak: "break-all",
                maxWidth: "80%",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {file.name}
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={() => setFiles(files.filter((_, i) => i !== index))}
            >
              ❌
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  )}
</Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained">Submit Claim</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/* ---------- View/Update Claim Dialog ---------- */
function ViewClaimDialog({ open, onClose, claim, onUpdateStatus, onUpdateClaim }) {
  const [status, setStatus] = useState(claim?.status || "");
  const [editSummary, setEditSummary] = useState(claim?.summary || "");
  const [editOdometer, setEditOdometer] = useState(claim?.odometerKm || "");
  const [saving, setSaving] = useState(false);

  // File upload state (for edit)
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (claim) {
      setStatus(claim.status || "");
      setEditSummary(claim.summary || "");
      setEditOdometer(claim.odometerKm || "");
    }
  }, [claim]);

  const handleUpdate = async () => {
  if (!claim?.id) return;
  setSaving(true);
  try {
    const uploadedUrls = files.length > 0 ? await uploadToCloudinary(files) : [];

    const payload = {
      summary: editSummary,
      odometerKm: Number(editOdometer) || 0,
      attachmentUrls: [
        ...(claim.attachmentUrls || []),
        ...uploadedUrls,
      ], // merge file cũ và mới
    };

    await onUpdateClaim(claim.id, payload);
    onClose();
  } catch (err) {
    console.error("Update claim failed:", err);
  } finally {
    setSaving(false);
  }
};

  const handleStatusChange = async () => {
    if (!claim?.id || !status) return;
    setSaving(true);
    try {
      await onUpdateStatus(claim.id, status);
      onClose();
    } catch (err) {
      console.error("Update status failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>View / Update Claim</DialogTitle>
      <DialogContent dividers>
        {!claim ? (
          <Typography color="text.secondary">No claim selected.</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Claim ID" value={claim.id} fullWidth disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="VIN" value={claim.vin} fullWidth disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
                select
              >
                <MenuItem value="SUBMITTED">Submitted</MenuItem>
                <MenuItem value="DIAGNOSING">Diagnosing</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Odometer (km)"
                type="number"
                value={editOdometer}
                onChange={(e) => setEditOdometer(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Summary"
                multiline
                minRows={3}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                fullWidth
              />
            </Grid>

            {/* ⚙️ File Upload (future use) */}
            <Grid item xs={12}>
  <Button variant="outlined" component="label" fullWidth>
    Add Attachments
    <input
      type="file"
      multiple
      hidden
      onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
    />
  </Button>

  {files.length > 0 && (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2">New Files:</Typography>
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {files.map((file, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #ddd",
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                wordBreak: "break-all",
                maxWidth: "80%",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {file.name}
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={() => setFiles(files.filter((_, i) => i !== index))}
            >
              ❌
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  )}

  {claim.attachmentUrls?.length > 0 && (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Existing Attachments:
      </Typography>
      <Stack spacing={0.5}>
        {claim.attachmentUrls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.85rem",
              color: "#1976d2",
              textDecoration: "none",
            }}
          >
            {url.split("/").pop()}
          </a>
        ))}
      </Stack>
    </Box>
  )}
</Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button onClick={handleUpdate} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "Save Changes"}
        </Button>
        <Button onClick={handleStatusChange} variant="contained" color="success" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : "Update Status"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

