// src/components/evm/WarrantyClaim.jsx
"use client";
import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
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
  Tooltip,
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
import axiosInstance from "../../services/axiosInstance";
import claimService from "../../services/claimService";
import centerService from "../../services/centerService";
import estimatesService from "../../services/estimatesService";
import { uploadToCloudinary } from "../../utils/cloudinary";

const statusColor = {
  DIAGNOSING: "warning",
  ESTIMATING: "info",
  UNDER_REVIEW: "secondary",
  APPROVED: "success",
  COMPLETED: "default",
  REJECTED: "error",
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

  const [vehicleNames, setVehicleNames] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [estimatesOpen, setEstimatesOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false); // new for update dialog
  const [activeClaim, setActiveClaim] = useState(null);

  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

  const [coverageType, setCoverageType] = useState("IN_WARRANTY");

  // Prepare upload placeholder
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
  const handleClaimUpdated = (e) => {
    const updated = e.detail;
    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };
  window.addEventListener("claim-updated", handleClaimUpdated);
  return () => window.removeEventListener("claim-updated", handleClaimUpdated);
}, []);

  // Tải danh sách VIN (giữ nguyên)
  useEffect(() => {
    const fetchVehicleNames = async () => {
      try {
        const token = localStorage.getItem("token");
        const names = {};

        // Lặp qua từng claim để lấy thông tin xe tương ứng
        for (const c of claims) {
          if (c.vin) {
            try {
              console.log("🔎 Fetching VIN:", c.vin);
              const res = await axios.get(`/api/vehicles/detail/${encodeURIComponent(c.vin)}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              console.log("✅ Vehicle:", res.data);
              names[c.vin] = res.data.intakeContactName || "Không có tên khách";
            } catch (err) {
              console.error(`❌ Lỗi lấy thông tin xe cho VIN: ${c.vin}`, err.response?.data || err.message);
            }
          }
        }

        setVehicleNames(names);
      } catch (error) {
        console.error("❌ Lỗi fetchVehicleNames:", error);
      }
    };

    if (claims.length > 0) {
      fetchVehicleNames();
    }
  }, [claims]);

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
              <MenuItem value="DIAGNOSING">Diagnosing</MenuItem>
              <MenuItem value="ESTIMATING">Estimating</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
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
                    <Typography variant="h6" fontWeight={700}>
                      {vehicleNames[claim.vin] || claim.intakeContactName || "—"}
                    </Typography>
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
                  {/* Eye button: open view-only dialog */}
                  <Tooltip title="View Claim">
                    <Button
                      variant="outlined"
                      color="info"
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
                      👁️
                    </Button>
                  </Tooltip>

                  {/* Edit button: open update dialog (limited fields) */}
                  <Tooltip title="Edit Claim">
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const detail = await claimService.getById(claim.id);
                          setActiveClaim(detail || claim);
                          setUpdateOpen(true);
                        } catch (err) {
                          console.error("Get claim detail failed:", err);
                          setSnack({ open: true, message: "Failed to load claim detail", severity: "error" });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      ✏️
                    </Button>
                  </Tooltip>

                  {/* Estimates button */}
                  <Tooltip title="Estimates">
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          // đảm bảo load claim detail (để có claim.id, vin,...)
                          const detail = await claimService.getById(claim.id);
                          setActiveClaim(detail || claim);
                          setEstimatesOpen(true);
                        } catch (err) {
                          console.error("Load claim for estimates failed:", err);
                          setSnack({ open: true, message: "Không thể tải claim cho estimates", severity: "error" });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      🧾
                    </Button>
                  </Tooltip>
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

      {/* --- VIEW-ONLY DIALOG --- */}
      <ViewOnlyDialog
        open={viewOpen}
        claim={activeClaim}
        onClose={() => setViewOpen(false)}
      />

      {/* --- UPDATE DIALOG (limited fields) --- */}
      <UpdateClaimDialog
        open={updateOpen}
        claim={activeClaim}
        onClose={() => setUpdateOpen(false)}
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

            // ⚙️ Làm sạch payload hoàn toàn, loại bỏ field thừa
          const cleanPayload = {
            summary: (payload.summary || "").substring(0, 255),
            attachmentUrls: Array.isArray(payload.attachmentUrls)
              ? payload.attachmentUrls.filter((u) => typeof u === "string" && u.trim() && u !== "string")
              : [],
            odometerKm: Number(payload.odometerKm) || 0,
            errorDate: payload.errorDate ? new Date(payload.errorDate).toISOString() : new Date().toISOString(),
            coverageType: payload.coverageType || "IN_WARRANTY",
          };

          console.log("🟢 Sending to update API:", cleanPayload);

          const updated = await claimService.update(id, cleanPayload);
          setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));

          setSnack({
            open: true,
            message: "Claim updated successfully!",
            severity: "success",
          });

          return updated;
          } catch (err) {
          console.error("Update claim failed:", err);
          const raw = err?.response?.data?.toString() || err?.message || "";
          let message = "Update failed. Please check your data.";

          if (raw.includes("Data truncation")) {
            message = "⚠️ One of your fields (summary/coverageType) has invalid length.";
          } else if (raw.includes("Bad Request")) {
            message = "⚠️ Invalid request format. Please check your input.";
          }

          setSnack({ open: true, message, severity: "error" });
          throw err;
        } finally {
          setLoading(false);
        }
      }}
        setSnack={setSnack}
      />

      <EstimatesDialog
        open={estimatesOpen}
        onClose={() => setEstimatesOpen(false)}
        claim={activeClaim}
        setSnack={setSnack}
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

/* ---------- Create Claim Dialog (unchanged) ---------- */
function CreateClaimDialog({ open, onClose, onCreate }) {
  const [vin, setVin] = useState("");
  const [summary, setSummary] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [errorDate, setErrorDate] = useState("");
  const [claimType, setClaimType] = useState("NORMAL");
  const [coverageType, setCoverageType] = useState("IN_WARRANTY");
  const [intakeContactName, setIntakeContactName] = useState("");

  // File upload state
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!vin || !summary) return;

  try {
    // Upload file lên Cloudinary trước
    const uploadedUrls = files.length > 0
  ? await uploadToCloudinary(files.map(f => f.file))
  : [];

    // Gửi payload JSON lên backend
    const payload = {
      vin,
      claimType,
      coverageType,
      errorDate: errorDate ? new Date(errorDate).toISOString() : new Date().toISOString(),
      odometerKm: Number(odometerKm) || 0,
      summary,
      intakeContactName,
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

  // Cleanup preview URLs để tránh memory leak
  useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
  }, [files]);

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
                  <MenuItem value="RECALL">Recall</MenuItem>
                  <MenuItem value="CAMPAIGN">Campaign</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="coverage-type-label">Coverage Type</InputLabel>
                <Select
                  labelId="coverage-type-label"
                  label="Coverage Type"
                  value={coverageType}
                  onChange={(e) => setCoverageType(e.target.value)}
                >
                  <MenuItem value="IN_WARRANTY">In Warranty</MenuItem>
                  <MenuItem value="GOODWILL">Goodwill</MenuItem>
                  <MenuItem value="OUT_OF_WARRANTY">Out of Warranty</MenuItem>
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
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      hidden
      onChange={(e) => {
        const newFiles = Array.from(e.target.files || []);
        const withPreview = newFiles.map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        }));
        setFiles((prev) => [...prev, ...withPreview]);

        // Reset input để chọn lại file cũ hoặc upload mới sau khi xóa
        e.target.value = null;
      }}
    />
  </Button>

  {files.length > 0 && (
  <Box sx={{ mt: 1 }}>
    <Typography variant="subtitle2">Selected Files:</Typography>
    <Stack spacing={1} sx={{ mt: 0.5 }}>
      {files.map((f, index) => {
        const fileName = f.file.name;
        const isImage = f.file.type.startsWith("image/");
        const isPdf = f.file.type === "application/pdf";

        return (
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
            <Stack direction="row" spacing={1} alignItems="center">
              {isImage ? (
                <Tooltip title="Click to view" arrow>
                  <img
                    src={f.preview}
                    alt={fileName}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(f.preview, "_blank")}
                  />
                </Tooltip>
              ) : isPdf ? (
                <Tooltip title="Click to view PDF" arrow>
                  <DescriptionIcon
                    color="action"
                    sx={{ fontSize: 40, cursor: "pointer" }}
                    onClick={() => window.open(URL.createObjectURL(f.file), "_blank")}
                  />
                </Tooltip>
              ) : (
                <DescriptionIcon color="action" />
              )}

              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-all",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fileName}
              </Typography>
            </Stack>

            <Button
              size="small"
              color="error"
              onClick={() => {
                if (f.preview) URL.revokeObjectURL(f.preview);
                setFiles((prev) => prev.filter((_, i) => i !== index));
              }}
            >
              ❌
            </Button>
          </Box>
        );
      })}
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

/* ---------- View Only Dialog (NEW) - show ALL fields read-only ---------- */
function ViewOnlyDialog({ open, onClose, claim }) {
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [centerName, setCenterName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/users/me");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("❌ Lỗi khi lấy thông tin user:", err);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchCenterName = async () => {
      try {
        const userRes = await axiosInstance.get("/auth/users/me");
        const user = userRes.data;
        if (!user.centerId) {
          setCenterName("—");
          return;
        }
        const centerRes = await axiosInstance.get(`/centers/detail/${user.centerId}`);
        const center = centerRes.data;
        setCenterName(center?.name || "Không rõ tên trung tâm");
      } catch (err) {
        console.error("❌ Lỗi khi tải tên trung tâm:", err);
        setCenterName("Không xác định");
      }
    };
    fetchCenterName();
  }, [open]);

  useEffect(() => {
    if (!open || !claim?.vin) return;
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`http://localhost:8080/api/vehicles/detail/${encodeURIComponent(claim.vin)}`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true,
      })
      .then((res) => {
        if (res.status < 400 && res.data) {
          setVehicleInfo(res.data);
        } else {
          console.warn("❌ Lỗi lấy vehicle info:", res.data);
        }
      })
      .catch((err) => console.error("❌ Vehicle fetch error:", err));
  }, [open, claim?.vin]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>View Claim</DialogTitle>
      <DialogContent dividers>
        {!claim ? (
          <Typography color="text.secondary">No claim selected.</Typography>
        ) : (
          <Grid container spacing={2}>
            {/* All fields shown, read-only */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="VIN"
                value={claim.vin || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Intake Contact Name"
                value={vehicleInfo?.intakeContactName || claim.intakeContactName || "—"}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Intake Contact Phone"
                value={vehicleInfo?.intakeContactPhone || "—"}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Service Center"
                value={centerName}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Opened By"
                value={
                  currentUser && claim.openedBy === currentUser.id
                    ? currentUser.fullName
                    : claim.openedBy || ""
                }
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Claim Type"
                value={claim.claimType || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Opened At"
                value={claim.openedAt ? new Date(claim.openedAt).toLocaleString() : ""}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Error Date"
                type="datetime-local"
                value={claim.errorDate ? new Date(claim.errorDate).toISOString().slice(0, 16) : ""}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Coverage Type"
                value={claim.coverageType || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Odometer (km)"
                type="number"
                value={claim.odometerKm || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Summary"
                multiline
                minRows={3}
                value={claim.summary || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                value={claim.status || ""}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>

            {/* Existing attachments (read-only, viewable) */}
            {Array.isArray(claim.attachmentUrls) && claim.attachmentUrls.filter((url) => url && url !== "string").length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Attachments:
                </Typography>
                <Stack spacing={0.5}>
                  {claim.attachmentUrls
                    ?.filter((url) => typeof url === "string" && url.trim() && url !== "string")
                    .map((url, i) => {
                      const fileName = decodeURIComponent(url.split("/").pop());
                      const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
                      const isPdf = /\.pdf$/i.test(fileName);
                      return (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {isImage ? (
                            <Tooltip title="Click to view" arrow>
                              <img
                                src={url}
                                alt={fileName}
                                style={{
                                  maxWidth: "120px",
                                  maxHeight: "120px",
                                  borderRadius: "8px",
                                  border: "1px solid #ddd",
                                  cursor: "pointer",
                                }}
                                onClick={() => window.open(url, "_blank")}
                              />
                            </Tooltip>
                          ) : isPdf ? (
                            <Tooltip title="Click to view PDF" arrow>
                              <DescriptionIcon
                                color="action"
                                sx={{ fontSize: 40, cursor: "pointer" }}
                                onClick={() => window.open(url, "_blank")}
                              />
                            </Tooltip>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "0.85rem",
                                color: "#1976d2",
                                textDecoration: "none",
                              }}
                            >
                              📎 {fileName}
                            </a>
                          )}
                        </Box>
                      );
                    })}
                </Stack>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Update Claim Dialog (NEW) - only editable fields as requested ---------- */
/*
 - Editable fields here are the ones you required:
   {
     "summary": "string",
     "attachmentUrls": ["string"],
     "odometerKm": 0,
     "errorDate": "2025-10-21T16:09:47.353Z",
     "coverageType": "string"
   }
   and
   { "status": "string" }
 - When clicking "Save & Update Status", we:
    1) upload new files to Cloudinary (if any),
    2) merge with existing attachmentUrls,
    3) call onUpdateClaim(id, payload) (from props),
    4) then call onUpdateStatus(id, status) (from props).
 - All APIs & services used are the same as original code.
*/
function UpdateClaimDialog({ open, onClose, claim, onUpdateStatus, onUpdateClaim, setSnack }) {
  const [editSummary, setEditSummary] = useState(claim?.summary || "");
  const [editOdometer, setEditOdometer] = useState(claim?.odometerKm || "");
  const [editErrorDate, setEditErrorDate] = useState(claim?.errorDate || "");
  const [editCoverageType, setEditCoverageType] = useState(claim?.coverageType || "IN_WARRANTY");
  const [status, setStatus] = useState(claim?.status || "");
  const [files, setFiles] = useState([]); // new files to upload
  const [savingAll, setSavingAll] = useState(false);

  // Sync when claim changes
  useEffect(() => {
    if (claim) {
      setEditSummary(claim.summary || "");
      setEditOdometer(claim.odometerKm || "");
      setEditErrorDate(claim.errorDate ? new Date(claim.errorDate).toISOString().slice(0, 16) : "");
      setEditCoverageType(claim.coverageType || "IN_WARRANTY");
      setStatus(claim.status || "");
      setFiles([]);
    }
  }, [claim, open]);

  // Cleanup preview URLs để tránh memory leak
  useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const handleSaveAndUpdateBoth = async () => {
  if (!claim?.id) return;
  setSavingAll(true);

  try {
    // 1️⃣ Upload file mới (nếu có)
    const uploadedUrls =
      files.length > 0 ? await uploadToCloudinary(files.map((f) => f.file)) : [];

    // 2️⃣ Chuẩn bị payload đúng 100% với yêu cầu backend
    const updatePayload = {
      summary: (editSummary || claim.summary || "").substring(0, 255),
      attachmentUrls: [
        ...(claim.attachmentUrls || []).filter(
          (url) => typeof url === "string" && url.trim() && url !== "string"
        ),
        ...uploadedUrls,
      ],
      odometerKm: Number(editOdometer || claim.odometerKm || 0),
      errorDate: editErrorDate
        ? new Date(editErrorDate).toISOString()
        : claim.errorDate || new Date().toISOString(),
      coverageType: editCoverageType || claim.coverageType || "IN_WARRANTY",
    };

    // ⚠️ Không được gửi object status, chỉ gửi string
    const statusPayload = {
      status: status || claim.status || "DIAGNOSING",
    };

    console.log("🟢 Sending updatePayload:", updatePayload);
    console.log("🟣 Sending statusPayload:", statusPayload);

    // 3️⃣ Gọi update API
    const updatedClaim = await onUpdateClaim(claim.id, updatePayload);

    // 4️⃣ Gọi update-status API
    const updatedStatus = await onUpdateStatus(claim.id, statusPayload.status);

    // 5️⃣ Gộp dữ liệu để cập nhật lại UI
    const merged = {
      ...updatedClaim,
      status: updatedStatus?.status || statusPayload.status || claim.status,
    };

    // 6️⃣ Phát sự kiện cập nhật claim toàn app
    window.dispatchEvent(new CustomEvent("claim-updated", { detail: merged }));

    // 7️⃣ Hiển thị snackbar
    setSnack({
      open: true,
      message: "✅ Claim updated successfully!",
      severity: "success",
    });

    onClose?.();
  } catch (err) {
    console.error("❌ Save & update both failed:", err);
    const raw = err?.response?.data?.toString() || err?.message || "";
    let message = "Save failed. Please check your data.";

    if (raw.includes("Data truncation")) {
      message = "⚠️ Some fields exceed allowed length or are invalid.";
    } else if (raw.includes("deserialize value of type")) {
      message = "⚠️ Status must be a plain string, not an object.";
    } else if (raw.includes("Bad Request")) {
      message = "⚠️ Invalid request format. Please check input.";
    }

    setSnack({ open: true, message, severity: "error" });
  } finally {
    setSavingAll(false);
  }
};

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Update Claim</DialogTitle>
      <DialogContent dividers>
        {!claim ? (
          <Typography color="text.secondary">No claim selected.</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="VIN"
                value={claim.vin || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
                select
              >
                <MenuItem value="DIAGNOSING">Diagnosing</MenuItem>
                <MenuItem value="ESTIMATING">Estimating</MenuItem>
                <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Error Date"
                type="datetime-local"
                value={editErrorDate}
                onChange={(e) => setEditErrorDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="coverage-type-label-update">Coverage Type</InputLabel>
                <Select
                  labelId="coverage-type-label-update"
                  label="Coverage Type"
                  value={editCoverageType}
                  onChange={(e) => setEditCoverageType(e.target.value)}
                >
                  <MenuItem value="IN_WARRANTY">In Warranty</MenuItem>
                  <MenuItem value="GOODWILL">Goodwill</MenuItem>
                  <MenuItem value="OUT_OF_WARRANTY">Out of Warranty</MenuItem>
                </Select>
              </FormControl>
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

            {/* File upload for new attachments */}
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth>
                Add Attachments (images/pdf)
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  hidden
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []);
                    const withPreview = newFiles.map((file) => ({
                      file,
                      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
                    }));
                    setFiles((prev) => [...prev, ...withPreview]);
                    e.target.value = null; // reset input
                  }}
                />
              </Button>

              {files.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">New Files:</Typography>
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {files.map((f, index) => {
                      const fileName = f.file.name;
                      const isImage = f.file.type.startsWith("image/");
                      const isPdf = f.file.type === "application/pdf";

                      return (
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
                          <Stack direction="row" spacing={1} alignItems="center">
                            {isImage ? (
                              <Tooltip title="Click to view" arrow>
                                <img
                                  src={f.preview}
                                  alt={fileName}
                                  style={{
                                    width: 60,
                                    height: 60,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                    border: "1px solid #ccc",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => window.open(f.preview, "_blank")}
                                />
                              </Tooltip>
                            ) : isPdf ? (
                              <Tooltip title="Click to view PDF" arrow>
                                <DescriptionIcon
                                  color="action"
                                  sx={{ fontSize: 40, cursor: "pointer" }}
                                  onClick={() => window.open(URL.createObjectURL(f.file), "_blank")}
                                />
                              </Tooltip>
                            ) : (
                              <DescriptionIcon color="action" />
                            )}

                            <Typography
                              variant="body2"
                              sx={{
                                wordBreak: "break-all",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {fileName}
                            </Typography>
                          </Stack>

                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              if (f.preview) URL.revokeObjectURL(f.preview);
                              setFiles((prev) => prev.filter((_, i) => i !== index));
                            }}
                          >
                            ❌
                          </Button>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {/* show existing attachments */}
              {Array.isArray(claim.attachmentUrls) && claim.attachmentUrls.filter((url) => url && url !== "string").length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Existing Attachments:
                  </Typography>
                  <Stack spacing={0.5}>
                    {claim.attachmentUrls
                      ?.filter((url) => typeof url === "string" && url.trim() && url !== "string")
                      .map((url, i) => {
                        const fileName = decodeURIComponent(url.split("/").pop());
                        const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
                        const isPdf = /\.pdf$/i.test(fileName);
                        return (
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {isImage ? (
                              <Tooltip title="Click to view" arrow>
                                <img
                                  src={url}
                                  alt={fileName}
                                  style={{
                                    maxWidth: "120px",
                                    maxHeight: "120px",
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => window.open(url, "_blank")}
                                />
                              </Tooltip>
                            ) : isPdf ? (
                              <Tooltip title="Click to view PDF" arrow>
                                <DescriptionIcon
                                  color="action"
                                  sx={{ fontSize: 40, cursor: "pointer" }}
                                  onClick={() => window.open(url, "_blank")}
                                />
                              </Tooltip>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#1976d2",
                                  textDecoration: "none",
                                }}
                              >
                                📎 {fileName}
                              </a>
                            )}
                          </Box>
                        );
                      })}
                  </Stack>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>

        <Button
          onClick={handleSaveAndUpdateBoth}
          variant="contained"
          disabled={savingAll}
        >
          {savingAll ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ------------------ EstimatesDialog component ------------------
function EstimatesDialog({ open, onClose, claim, setSnack }) {
  const [list, setList] = React.useState([]);
  const [loadingLocal, setLoadingLocal] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // object when editing an estimate
  const [creating, setCreating] = React.useState(false);

  // local form: items as { partId, partName, unitPriceVND, quantity }
  const emptyForm = {
    items: [],
    laborSlots: 0,
    laborRateVND: 0,
    note: "",
  };
  const [form, setForm] = React.useState(emptyForm);

  React.useEffect(() => {
    if (!open || !claim?.id) return;
    let mounted = true;
    (async () => {
      setLoadingLocal(true);
      try {
        const data = await estimatesService.getByClaim(claim.id);
        if (mounted) setList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch estimates failed:", err);
        setSnack?.({ open: true, message: "Không tải được estimates", severity: "error" });
      } finally {
        if (mounted) setLoadingLocal(false);
      }
    })();
    return () => (mounted = false);
  }, [open, claim?.id]);

  React.useEffect(() => {
    // reset form when opening form
    if (!open) {
      setCreating(false);
      setEditing(null);
      setForm(emptyForm);
    }
  }, [open]);

  React.useEffect(() => {
    if (editing) {
      // try parse itemsJson: API returns itemsJson as string or array depending backend
      let items = [];
      try {
        items = typeof editing.itemsJson === "string" ? JSON.parse(editing.itemsJson) : editing.itemsJson;
      } catch (e) {
        items = editing.itemsJson || [];
      }
      // map to form structure; we allow user to enter unitPrice manually (UI local)
      const mapped = (items || []).map((it) => ({
        partId: it.partId || it.part_id || "",
        partName: it.partName || it.part_name || it.name || "",
        unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
        quantity: it.quantity ?? 1,
      }));
      setForm({
        items: mapped,
        laborSlots: editing.laborSlots ?? 0,
        laborRateVND: editing.laborRateVND ?? 0,
        note: editing.note ?? "",
      });
    }
  }, [editing]);

  // helpers: compute totals (based on local unitPrice fields)
  const partsSubtotal = React.useMemo(() => {
    return form.items.reduce((s, it) => s + (Number(it.unitPriceVND || 0) * Number(it.quantity || 0)), 0);
  }, [form.items]);

  const laborSubtotal = (Number(form.laborSlots || 0) * Number(form.laborRateVND || 0));
  const grandTotal = partsSubtotal + laborSubtotal;

  // item management
  const addEmptyItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, { partId: "", partName: "", unitPriceVND: 0, quantity: 1 }] }));
  };
  const updateItem = (idx, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...f, items };
    });
  };
  const removeItem = (idx) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  // create payload builder: backend expects itemsJson array of { partId, quantity }
  const buildPayload = () => {
    const itemsJson = (form.items || []).map((it) => ({
      partId: it.partId || null,
      quantity: Number(it.quantity || 0),
    }));
    return {
      claim_id: claim?.id || claim?.claimId || null, // API uses claim_id at create per docs
      itemsJson,
      laborSlots: Number(form.laborSlots || 0),
      laborRateVND: Number(form.laborRateVND || 0),
      note: form.note || "",
    };
  };

  const handleCreate = async () => {
    if (!form.items.length) {
      setSnack?.({ open: true, message: "Cần ít nhất 1 phụ tùng (item) trong estimate", severity: "warning" });
      return;
    }
    
    try {
      setLoadingLocal(true);
      const payload = buildPayload();
      const created = await estimatesService.create(payload);
      setList((prev) => [created, ...prev]);
      setSnack?.({ open: true, message: "Tạo estimate thành công", severity: "success" });
      setCreating(false);
      // emit event if needed
      window.dispatchEvent(new CustomEvent("claim-updated", { detail: { ...claim, lastEstimate: created } }));
    } catch (err) {
      console.error("Create estimate error:", err);
      setSnack?.({ open: true, message: "Tạo estimate thất bại", severity: "error" });
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing?.id) return;
    try {
      setLoadingLocal(true);
      const payload = {
        itemsJson: (form.items || []).map((it) => ({ partId: it.partId || null, quantity: Number(it.quantity || 0) })),
        laborSlots: Number(form.laborSlots || 0),
        laborRateVND: Number(form.laborRateVND || 0),
        note: form.note || "",
      };
      const updated = await estimatesService.update(editing.id, payload);
      setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSnack?.({ open: true, message: "Cập nhật estimate thành công", severity: "success" });
      setEditing(null);
      window.dispatchEvent(new CustomEvent("claim-updated", { detail: { ...claim, lastEstimate: updated } }));
    } catch (err) {
      console.error("Update estimate error:", err);
      setSnack?.({ open: true, message: "Cập nhật estimate thất bại", severity: "error" });
    } finally {
      setLoadingLocal(false);
    }
  };

  const openForEdit = async (est) => {
    try {
      setLoadingLocal(true);
      // fetch full data if needed
      const full = await estimatesService.getById(est.id);
      setEditing(full || est);
      setCreating(false);
    } catch (err) {
      console.error("Load estimate failed:", err);
      setSnack?.({ open: true, message: "Không tải được estimate", severity: "error" });
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Estimates — {claim?.vin || (claim?.vehicle?.vin ?? "Claim")}
        <Box sx={{ float: "right", display: "flex", gap: 1 }}>
          <Button size="small" onClick={() => { setCreating(true); setEditing(null); }}>New Estimate</Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Create / Edit Form */}
        {(creating || editing) && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>{editing ? `Editing estimate #${editing.id}` : "New estimate"}</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2">Parts</Typography>
                </Grid>

                {(form.items || []).map((it, idx) => (
                  <React.Fragment key={idx}>
                    <Grid item xs={5}>
                      <TextField
                        label="Part ID / SKU"
                        value={it.partId}
                        onChange={(e) => updateItem(idx, "partId", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Name"
                        value={it.partName}
                        onChange={(e) => updateItem(idx, "partName", e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <TextField
                        label="Unit price (VND)"
                        value={it.unitPriceVND}
                        onChange={(e) => updateItem(idx, "unitPriceVND", e.target.value)}
                        fullWidth
                        size="small"
                        type="number"
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <TextField
                        label="Qty"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        fullWidth
                        size="small"
                        type="number"
                      />
                    </Grid>
                    <Grid item xs={1} sx={{ display: "flex", alignItems: "center" }}>
                      <Button onClick={() => removeItem(idx)} size="small">Remove</Button>
                    </Grid>
                  </React.Fragment>
                ))}

                <Grid item xs={12}>
                  <Button onClick={addEmptyItem} size="small">+ Add part</Button>
                </Grid>

                <Grid item xs={6} md={3}>
                  <TextField
                    label="Labor slots"
                    value={form.laborSlots}
                    onChange={(e) => setForm((f) => ({ ...f, laborSlots: e.target.value }))}
                    fullWidth
                    type="number"
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Labor rate (VND)"
                    value={form.laborRateVND}
                    onChange={(e) => setForm((f) => ({ ...f, laborRateVND: e.target.value }))}
                    fullWidth
                    type="number"
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Note"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2">Parts subtotal: {partsSubtotal.toLocaleString("vi-VN")} VND</Typography>
                  <Typography variant="body2">Labor subtotal: {laborSubtotal.toLocaleString("vi-VN")} VND</Typography>
                  <Typography variant="h6">Grand total: {grandTotal.toLocaleString("vi-VN")} VND</Typography>
                </Grid>

                <Grid item xs={12} sx={{ display: "flex", gap: 1 }}>
                  <Button variant="outlined" onClick={() => { setCreating(false); setEditing(null); setForm(emptyForm); }}>Cancel</Button>
                  {editing ? (
                    <Button variant="contained" onClick={handleUpdate} disabled={loadingLocal}>{loadingLocal ? <CircularProgress size={18} /> : "Save"}</Button>
                  ) : (
                    <Button variant="contained" onClick={handleCreate} disabled={loadingLocal}>{loadingLocal ? <CircularProgress size={18} /> : "Create"}</Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* List of estimates */}
        {loadingLocal ? (
          <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <>
            {list.length === 0 ? (
              <Typography color="text.secondary">Chưa có estimate cho claim này.</Typography>
            ) : (
              <Stack spacing={1}>
                {list.map((e) => (
                  <Card key={e.id} variant="outlined">
                    <CardContent>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Estimate #{e.id}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(e.createdAt).toLocaleString()}</Typography>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2">Parts: { (e.partsSubtotalVND ?? 0).toLocaleString("vi-VN") } VND</Typography>
                          <Typography variant="body2">Labor: { (e.laborSubtotalVND ?? 0).toLocaleString("vi-VN") } VND</Typography>
                          <Typography variant="body2">Total: { (e.grandTotalVND ?? 0).toLocaleString("vi-VN") } VND</Typography>
                        </Grid>

                        <Grid item xs={12} sm={2} sx={{ textAlign: "right" }}>
                          <Button size="small" onClick={() => openForEdit(e)}>Edit</Button>
                          <Button size="small" onClick={() => {
                            // quick preview note
                            setSnack?.({ open: true, message: e.note || "No note", severity: "info" });
                          }}>Note</Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
// ------------------ end EstimatesDialog ------------------

