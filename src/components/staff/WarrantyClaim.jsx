// src/components/staff/WarrantyClaim.jsx
// Component cho SC-STAFF: Tạo và quản lý Warranty Claims
// Có tích hợp auto-check Recall khi nhập VIN
"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  IconButton,
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
import Collapse from "@mui/material/Collapse";
import { Add, DeleteOutline, ExpandMore } from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import axiosInstance from "../../services/axiosInstance";
import claimService, { CLAIM_STATUS } from "../../services/claimService";
import centerService from "../../services/centerService";
import estimatesService from "../../services/estimatesService";
import eventService from "../../services/eventService";
import vehicleService from "../../services/vehicleService";
import vehicleWarrantyService from "../../services/vehicleWarrantyService";
import { uploadToCloudinary } from "../../utils/cloudinary";

// Vehicle service — dùng để lấy thông tin khách hàng theo VIN
const vehiclesService = {
  getByVin: async (vin) => {
    const res = await axiosInstance.get(
      `/vehicles/detail/${encodeURIComponent(vin)}`
    );
    return res.data;
  },
};

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
              const vehicleData = await vehiclesService.getByVin(c.vin);
              console.log("✅ Vehicle:", vehicleData);
              names[c.vin] = vehicleData.intakeContactName || "Không có tên khách";
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
    const diagnosing = claims.filter((c) => c.status === CLAIM_STATUS.DIAGNOSING).length;
    const estimating = claims.filter((c) => c.status === CLAIM_STATUS.ESTIMATING).length;
    const underReview = claims.filter((c) => c.status === CLAIM_STATUS.UNDER_REVIEW).length;
    const approved = claims.filter((c) => c.status === CLAIM_STATUS.APPROVED).length;
    const completed = claims.filter((c) => c.status === CLAIM_STATUS.COMPLETED).length;
    const rejected = claims.filter((c) => c.status === CLAIM_STATUS.REJECTED).length;

    return { count, diagnosing, estimating, underReview, approved, completed, rejected };
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

      {/* Search + Filter + Create */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        {/* Search field nhỏ hơn */}
        <Grid item xs={12} md={7}>
          <form onSubmit={handleSearchSubmit}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by VIN, summary, or claim ID..."
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
                if (e.key === "Enter") handleSearchSubmit(e);
              }}
            />
          </form>
        </Grid>

        {/* Filter + Create Button cạnh nhau */}
        <Grid item xs={12} md={5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControl fullWidth size="small">
              <InputLabel id="status-label">Filter by status</InputLabel>
              <Select
                labelId="status-label"
                label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value={CLAIM_STATUS.DIAGNOSING}>Diagnosing</MenuItem>
                <MenuItem value={CLAIM_STATUS.ESTIMATING}>Estimating</MenuItem>
                <MenuItem value={CLAIM_STATUS.UNDER_REVIEW}>Under Review</MenuItem>
                <MenuItem value={CLAIM_STATUS.APPROVED}>Approved</MenuItem>
                <MenuItem value={CLAIM_STATUS.COMPLETED}>Completed</MenuItem>
                <MenuItem value={CLAIM_STATUS.REJECTED}>Rejected</MenuItem>
              </Select>
            </FormControl>

            {/* Nút Create kế bên filter */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCreateOpen(true)}
              sx={{ whiteSpace: "nowrap", minWidth: 130 }}
            >
              Create Claim
            </Button>
          </Stack>
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
            window.dispatchEvent(new CustomEvent("claims-changed"));
            setSnack({ open: true, message: "Claim created successfully", severity: "success" });
          } catch (err) {
            console.error("Create claim failed:", err);
            const errorData = err.response?.data;
            let message = "Tạo claim thất bại, vui lòng thử lại sau!";
            if (errorData) {
              if (typeof errorData === "string") {
                message = errorData;
              } else if (errorData.message) {
                message = errorData.message;
              } else if (errorData.error) {
                message = errorData.error;
              } else {
                message = JSON.stringify(errorData);
              }
            } else if (err.message) {
              message = err.message;
            }
            setSnack({ open: true, message, severity: "error" });
          } finally {
            setLoading(false);
          }
        }}
        setSnack={setSnack}
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
            window.dispatchEvent(new CustomEvent("claim-sync"));
            setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
            setSnack({ open: true, message: "Claim status updated", severity: "success" });
          } catch (err) {
            console.error("Update status failed:", err);
            const errorData = err.response?.data;
            let message = "Cập nhật trạng thái claim thất bại!";
            if (errorData) {
              if (typeof errorData === "string") {
                message = errorData;
              } else if (errorData.message) {
                message = errorData.message;
              } else if (errorData.error) {
                message = errorData.error;
              }
            } else if (err.message) {
              message = err.message;
            }
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
function CreateClaimDialog({ open, onClose, onCreate, setSnack }) {
  const [vin, setVin] = useState("");
  const [summary, setSummary] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [errorDate, setErrorDate] = useState("");
  const [claimType, setClaimType] = useState("NORMAL");
  const [coverageType, setCoverageType] = useState("IN_WARRANTY");
  const [intakeContactName, setIntakeContactName] = useState("");

  // File upload state
  const [files, setFiles] = useState([]);
  // Recall check state
  const [recallCheck, setRecallCheck] = useState({ checking: false, hasRecall: false, events: [] });
  
  // Warranty check state
  const [warrantyCheck, setWarrantyCheck] = useState({ checking: false, isActivated: null });
  
  // Danh sách vehicles đã kích hoạt bảo hành
  const [vehiclesWithWarranty, setVehiclesWithWarranty] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Load danh sách vehicles đã kích hoạt bảo hành
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      // Thử lấy vehicles đã có warranty
      const data = await vehicleService.getWithWarranty();
      const vehicles = Array.isArray(data) ? data : (data?.data || data?.vehicles || []);
      setVehiclesWithWarranty(vehicles);
    } catch (err) {
      console.error("Load vehicles with warranty failed:", err);
      // Fallback: lấy tất cả vehicles
      try {
        const allData = await vehicleService.getAll();
        const allVehicles = Array.isArray(allData) ? allData : (allData?.data || []);
        setVehiclesWithWarranty(allVehicles);
      } catch (err2) {
        console.error("Load all vehicles failed:", err2);
        setVehiclesWithWarranty([]);
      }
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  // Load danh sách vehicles khi dialog mở
  useEffect(() => {
    if (!open) return;
    loadVehicles();
  }, [open, loadVehicles]);

  // Listen event "warranty-activated" để reload vehicles list khi có warranty mới được kích hoạt
  useEffect(() => {
    const handleWarrantyActivated = () => {
      // Reload vehicles list khi có warranty được kích hoạt
      if (open) {
        console.log("Warranty activated, reloading vehicles list...");
        loadVehicles();
      }
    };

    window.addEventListener("warranty-activated", handleWarrantyActivated);
    return () => {
      window.removeEventListener("warranty-activated", handleWarrantyActivated);
    };
  }, [open, loadVehicles]);

  // Kiểm tra warranty khi VIN thay đổi
  useEffect(() => {
    const checkWarranty = async () => {
      if (!vin?.trim() || vin.trim().length < 17) {
        setWarrantyCheck({ checking: false, isActivated: null });
        return;
      }

      try {
        setWarrantyCheck({ checking: true, isActivated: null });
        const isActivated = await vehicleWarrantyService.checkActivated(vin.trim());
        setWarrantyCheck({ checking: false, isActivated });
      } catch (err) {
        console.error("Check warranty failed:", err);
        setWarrantyCheck({ checking: false, isActivated: null });
      }
    };

    checkWarranty();
  }, [vin]);

  // Auto-check recall khi VIN thay đổi
  useEffect(() => {
    const checkRecall = async () => {
      if (!vin?.trim() || vin.trim().length < 17) {
        setRecallCheck({ checking: false, hasRecall: false, events: [] });
        return;
      }

      try {
        setRecallCheck(prev => ({ ...prev, checking: true }));
        const result = await eventService.checkRecallByVin(vin.trim());
        setRecallCheck({
          checking: false,
          hasRecall: result.hasRecall || false,
          events: result.events || []
        });
        
        // Auto-suggest set claimType = RECALL nếu có recall
        if (result.hasRecall && claimType !== "RECALL") {
          // Chỉ suggest, không auto-set để user có thể quyết định
        }
      } catch (err) {
        console.error("Check recall failed:", err);
        setRecallCheck({ checking: false, hasRecall: false, events: [] });
      }
    };

    // Debounce để tránh gọi API quá nhiều
    const timer = setTimeout(() => {
      checkRecall();
    }, 500);

    return () => clearTimeout(timer);
  }, [vin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // UI validation — show snackbar if invalid
    if (!vin?.trim()) {
      setSnack?.({ open: true, message: "VIN là bắt buộc.", severity: "error" });
      return;
    }
    if (!summary?.trim()) {
      setSnack?.({ open: true, message: "Summary là bắt buộc.", severity: "error" });
      return;
    }

    try {
      // Upload file lên Cloudinary trước
      const uploadedUrls = files.length > 0
        ? await uploadToCloudinary(files.map(f => f.file))
        : [];

      // Gửi payload JSON lên backend
      const payload = {
        vin: vin.trim(),
        claimType,
        coverageType,
        errorDate: errorDate ? new Date(errorDate).toISOString() : new Date().toISOString(),
        odometerKm: Number(odometerKm) || 0,
        summary: summary.trim(),
        intakeContactName: intakeContactName?.trim() || undefined,
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
      setSnack?.({ open: true, message: "Tạo claim thất bại", severity: "error" });
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
              <Autocomplete
                options={vehiclesWithWarranty}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  const vinStr = option.vin || option.id || "";
                  const modelCode = option.modelCode ? ` (${option.modelCode})` : "";
                  return vinStr + modelCode;
                }}
                value={vehiclesWithWarranty.find(v => (v.vin || v.id) === vin) || null}
                onChange={(_, newValue) => {
                  const selectedVin = newValue ? (typeof newValue === "string" ? newValue : (newValue.vin || newValue.id)) : "";
                  setVin(selectedVin);
                  // Auto-fill intakeContactName nếu có
                  if (newValue && typeof newValue === "object" && newValue.intakeContactName) {
                    setIntakeContactName(newValue.intakeContactName);
                  }
                }}
                loading={loadingVehicles}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="VIN"
                    required
                    helperText="Chọn VIN từ xe đã kích hoạt bảo hành (chỉ được tạo claim cho xe đã kích hoạt)"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {warrantyCheck.checking && <CircularProgress size={20} sx={{ mr: 1 }} />}
                          {recallCheck.checking && <CircularProgress size={20} sx={{ mr: 1 }} />}
                          {loadingVehicles ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    error={!!(vin && warrantyCheck.isActivated === false)}
                  />
                )}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options;
                  const searchLower = inputValue.toLowerCase();
                  return options.filter(option => {
                    const vinStr = typeof option === "string" ? option : (option.vin || option.id || "");
                    const modelCode = typeof option === "object" ? (option.modelCode || "").toLowerCase() : "";
                    return vinStr.toLowerCase().includes(searchLower) || modelCode.includes(searchLower);
                  });
                }}
                renderOption={(props, option) => {
                  const vinStr = typeof option === "string" ? option : (option.vin || option.id || "");
                  const modelCode = typeof option === "object" ? option.modelCode : "";
                  return (
                    <Box component="li" {...props} key={vinStr}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {vinStr}
                        </Typography>
                        {modelCode && (
                          <Typography variant="caption" color="text.secondary">
                            Model: {modelCode}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
              />
              {vehiclesWithWarranty.length === 0 && !loadingVehicles && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  Đang tải danh sách vehicles...
                </Typography>
              )}
              {vin && warrantyCheck.isActivated === false && (
                <Alert severity="warning" sx={{ mt: 1, width: "100%" }}>
                  VIN này chưa kích hoạt bảo hành. Vui lòng kích hoạt bảo hành trước khi tạo claim.
                </Alert>
              )}
              {vin && warrantyCheck.isActivated === true && (
                <Alert severity="success" sx={{ mt: 1, width: "100%" }}>
                  VIN đã kích hoạt bảo hành. Có thể tạo claim.
                </Alert>
              )}
            </Grid>
            
            {/* Recall Check Result */}
            {recallCheck.hasRecall && recallCheck.events.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    ⚠️ Xe này bị ảnh hưởng bởi {recallCheck.events.length} sự kiện Recall:
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {recallCheck.events.map((event, idx) => (
                      <Typography key={event.id} variant="body2">
                        • {event.name} {event.reason ? `- ${event.reason}` : ""}
                      </Typography>
                    ))}
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                    Vui lòng chọn Claim Type = "RECALL" để xử lý đúng loại claim này.
                  </Typography>
                </Alert>
              </Grid>
            )}

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

    vehiclesService.getByVin(claim.vin)
      .then((data) => {
        setVehicleInfo(data);
      })
      .catch((err) => {
        console.error("❌ Vehicle fetch error:", err);
        setVehicleInfo(null);
      });
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
                <MenuItem value={CLAIM_STATUS.DIAGNOSING}>Diagnosing</MenuItem>
                <MenuItem value={CLAIM_STATUS.ESTIMATING}>Estimating</MenuItem>
                <MenuItem value={CLAIM_STATUS.UNDER_REVIEW}>Under Review</MenuItem>
                <MenuItem value={CLAIM_STATUS.APPROVED}>Approved</MenuItem>
                <MenuItem value={CLAIM_STATUS.COMPLETED}>Completed</MenuItem>
                <MenuItem value={CLAIM_STATUS.REJECTED}>Rejected</MenuItem>
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
  const [list, setList] = React.useState([]); // existing estimates for claim
  const [loadingLocal, setLoadingLocal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  // parts list (active) for autocomplete: [{ id, partNo, partName, unitPrice }]
  const [parts, setParts] = React.useState([]);
  const [partsLoading, setPartsLoading] = React.useState(false);

  const emptyForm = {
    items: [], // each: { partId, partName, unitPriceVND, quantity }
    laborSlots: 0,
    laborRateVND: 100000,
    note: "",
  };
  const [form, setForm] = React.useState(emptyForm);
  const [expandedMap, setExpandedMap] = React.useState({});

  // load estimates for claim
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
  }, [open, claim?.id, setSnack]);

  // load active parts for autocomplete (no IDs shown in UI)
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        setPartsLoading(true);
        // axiosInstance is configured for API base; call "parts/get-active"
        const res = await axiosInstance.get(`parts/get-active`);
        const raw = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
        if (!mounted) return;
        // normalize minimal fields
        const normalized = raw.map((p) => ({
          id: p.id,
          partNo: p.partNo || "",
          partName: p.partName || p.name || "(no name)",
          unitPriceVND: p.unitPrice ?? p.unitPriceVND ?? 0,
        }));
        setParts(normalized);
      } catch (err) {
        console.error("Load parts failed:", err);
        setParts([]);
        setSnack?.({ open: true, message: "Không tải được danh sách phụ tùng", severity: "warning" });
      } finally {
        if (mounted) setPartsLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [open, setSnack]);

  // sync editing -> form
  React.useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }
    // editing may contain items / itemsJson; map into form.items with partName
    let items = [];
    try {
      const rawItems = editing.itemsJson ? (typeof editing.itemsJson === "string" ? JSON.parse(editing.itemsJson) : editing.itemsJson) : editing.items || [];
      items = (rawItems || []).map((it) => ({
        partId: it.partId || it.part_id || "",
        partName: it.partName || it.part_name || it.name || "",
        unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
        quantity: it.quantity ?? it.qty ?? 1,
      }));
    } catch (e) {
      items = [];
    }
    setForm({
      items,
      laborSlots: editing.laborSlots ?? 0,
      laborRateVND: 100000,
      note: editing.note ?? "",
    });
  }, [editing]);

  // helper - totals
  const partsSubtotal = React.useMemo(() => form.items.reduce((s, it) => s + (Number(it.unitPriceVND || 0) * Number(it.quantity || 0)), 0), [form.items]);
  const laborSubtotal = Number(form.laborSlots || 0) * Number(form.laborRateVND || 0);
  const grandTotal = partsSubtotal + laborSubtotal;

  // item operations
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { partId: "", partName: "", unitPriceVND: 0, quantity: 1 }] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, patch) => setForm((f) => {
    const items = [...f.items];
    items[idx] = { ...items[idx], ...patch };
    return { ...f, items };
  });

  // Build payload for create/update: backend expects itemsJson: [{partId, quantity}]
  const buildPayloadForApi = (overrideForm = null) => {
    const use = overrideForm || form;
    const itemsJson = (use.items || []).map((it) => ({ 
      partId: it.partId || null, 
      quantity: Number(it.quantity || 0) 
    })).filter(it => it.partId != null); // Remove items without partId
    
    const claimId = claim?.id || claim?.claimId;
    if (!claimId) {
      console.warn("[BuildPayload] No claim ID found!", { claim });
    }
    
    // Backend expect snake_case: claim_id, itemsJson (chỉ cần partId và quantity)
    // Backend sẽ tự động hydrate với unitPrice từ Part repository
    // Backend sẽ tự động:
    // - Lấy unitPrice từ Part repository
    // - Tính totals (partsSubtotal, laborSubtotal, grandTotal)
    // - Set versionNo (auto increment)
    // - Update claim status (RECALL → APPROVED, NORMAL → UNDER_REVIEW)
    const payload = {
      claim_id: claimId, // Backend expect snake_case (UUID)
      itemsJson: itemsJson.length > 0 ? itemsJson : [], // [{partId: UUID, quantity: number}] - backend tự lấy unitPrice
      laborSlots: Number(use.laborSlots || 0) >= 0 ? Number(use.laborSlots || 0) : 0,
      laborRateVND: Number(use.laborRateVND || 0) >= 0 ? Number(use.laborRateVND || 0) : 0,
      note: (use.note || "").trim() || null,
      // createdAt: optional, backend sẽ dùng new Date() nếu không có
    };
    
    // Backend có thể expect tất cả fields, không bỏ undefined
    
    // Backend expect tất cả fields theo EstimateRequests.CreateEstimateRequest
    // Backend sẽ validate:
    // - itemsJson: mỗi item phải có quantity > 0
    // - laborSlots >= 0
    // - laborRateVND >= 0
    // - claim_id: UUID hợp lệ
    const cleanPayload = {
      claim_id: payload.claim_id, // UUID - required
      itemsJson: payload.itemsJson, // List<ItemRequest> - required, ít nhất 1 item
      laborSlots: payload.laborSlots, // int >= 0 - required
      laborRateVND: payload.laborRateVND, // long >= 0 - required
      note: payload.note || null, // String - optional
      // createdAt: optional, nếu không có backend sẽ dùng new Date()
    };
    
    // Backend không cần createdAt, sẽ tự set
    // Backend sẽ tự hydrate unitPrice cho items
    // Backend sẽ tự tính totals và payment split
    
    return cleanPayload;
  };

  // Validation theo backend logic (EstimateService.validateBusiness + validateClaimForEstimate)
  const validateFormBeforeSend = () => {
    // [Backend Check 1] Claim status phải = ESTIMATING
    if (claim?.status !== "ESTIMATING") {
      setSnack?.({ 
        open: true, 
        message: `⚠️ Claim phải ở trạng thái ESTIMATING để tạo estimate.\nTrạng thái hiện tại: ${claim?.status || "N/A"}.\nVui lòng chuyển claim sang ESTIMATING trước.`, 
        severity: "error" 
      });
      return false;
    }
    
    // [Backend Check 2] Claim phải có diagnostics (backend sẽ check, nhưng ta warning trước)
    // Note: Frontend không có API để check diagnostics trước, backend sẽ validate
    
    // [Backend Check 3] Items validation (validateBusiness)
    if (!form.items.length) {
      setSnack?.({ open: true, message: "Cần ít nhất 1 phụ tùng (item) trong estimate", severity: "warning" });
      return false;
    }
    
    for (const it of form.items) {
      // Backend: Mỗi item phải có partId hợp lệ
      if (!it.partId) {
        setSnack?.({ open: true, message: `Một item chưa chọn phụ tùng hợp lệ: "${it.partName || ''}"`, severity: "warning" });
        return false;
      }
      // Backend: quantity > 0 (không phải >= 0)
      if (!it.quantity || Number(it.quantity) <= 0) {
        setSnack?.({ open: true, message: `Số lượng phải lớn hơn 0 cho "${it.partName}". Backend yêu cầu quantity > 0.`, severity: "warning" });
        return false;
      }
    }
    
    // [Backend Check 4] Labor validation (validateBusiness)
    // laborSlots >= 0 (đã check trong payload, nhưng đảm bảo)
    if (Number(form.laborSlots || 0) < 0) {
      setSnack?.({ open: true, message: "Labor slots phải >= 0", severity: "warning" });
      return false;
    }
    
    // laborRateVND >= 0
    if (Number(form.laborRateVND || 0) < 0) {
      setSnack?.({ open: true, message: "Labor rate (VND) phải >= 0", severity: "warning" });
      return false;
    }
    
    return true;
  };

  const handleCreate = async () => {
    if (!validateFormBeforeSend()) return;
    try {
      setLoadingLocal(true);
      const payload = buildPayloadForApi();
      console.log("[CreateEstimate] Payload:", JSON.stringify(payload, null, 2));
      console.log("[CreateEstimate] Claim object:", claim);
      console.log("[CreateEstimate] Claim ID:", claim?.id || claim?.claimId);
      console.log("[CreateEstimate] Claim status:", claim?.status, "(Required: ESTIMATING)");
      console.log("[CreateEstimate] Claim centerId:", claim?.centerId);
      console.log("[CreateEstimate] Claim openedBy:", claim?.openedBy);
      console.log("[CreateEstimate] Current user role:", localStorage.getItem("role"));
      console.log("[CreateEstimate] Current user ID:", localStorage.getItem("userId") || localStorage.getItem("id"));
      console.log("[CreateEstimate] Token exists:", !!localStorage.getItem("token"));
      console.log("[CreateEstimate] Form data:", form);
      const created = await estimatesService.create(payload);
      setList((prev) => [created, ...prev]);
      setSnack?.({ open: true, message: "Tạo estimate thành công", severity: "success" });
      setCreating(false);
      // notify other parts of app if needed
      window.dispatchEvent(new CustomEvent("claim-updated", { detail: { ...claim, lastEstimate: created } }));
    } catch (err) {
      console.error("Create estimate error:", err);
      console.error("Create estimate error response:", err.response);
      console.error("Create estimate error data:", err.response?.data);
      console.error("Create estimate error details:", err.response?.data?.details);
      console.error("Create estimate error status:", err.response?.status);
      
      const errorData = err?.response?.data;
      
      // Extract detailed validation errors from details array
      let validationErrors = [];
      if (errorData?.details && Array.isArray(errorData.details)) {
        validationErrors = errorData.details.map((detail) => {
          if (typeof detail === "string") return detail;
          return detail.message || detail.field || JSON.stringify(detail);
        });
        console.error("Validation errors:", validationErrors);
      }
      
      // Convert error data to string for comparison
      const msg = typeof errorData === "string" 
        ? errorData 
        : (errorData?.message || errorData?.error || JSON.stringify(errorData) || "");
      
      let friendlyMessage = "Tạo estimate thất bại";

      if (validationErrors.length > 0) {
        // Nếu có validation errors chi tiết, hiển thị chúng
        friendlyMessage = `⚠️ Dữ liệu không hợp lệ:\n${validationErrors.join("\n")}`;
      } else if (errorData?.error === "UNEXPECTED_ERROR" && errorData?.message === "Access Denied") {
        const currentRole = localStorage.getItem("role");
        friendlyMessage = `⚠️ Không có quyền tạo estimate!\n\n` +
          `Role hiện tại của bạn: ${currentRole || "N/A"}\n\n`;                          
      } else if (msg && msg.includes("phải có trạng thái ESTIMATING")) {
        friendlyMessage = "⚠️ Claim phải ở trạng thái ESTIMATING để tạo estimate. Vui lòng chuyển claim sang ESTIMATING trước.";
      } else if (msg && msg.includes("phải có diagnostics")) {
        friendlyMessage = "⚠️ Claim phải có diagnostics trước khi tạo estimate. Vui lòng tạo diagnostics trước.";
      } else if (msg && msg.includes("Không tìm thấy claim")) {
        friendlyMessage = "Claim không tồn tại hoặc đã bị xoá.";
      } else if (msg && msg.includes("qty phải > 0")) {
        friendlyMessage = "⚠️ Số lượng (quantity) phải lớn hơn 0 cho tất cả items.";
      } else if (msg && msg.includes("laborSlots phải >= 0") || msg.includes("laborRateVND phải >= 0")) {
        friendlyMessage = "⚠️ Labor slots và labor rate phải >= 0.";
      } else if (msg && msg.trim() !== "") {
        // Nếu có message từ backend, dùng nó
        friendlyMessage = msg;
      } else {
        // Nếu không có message, hiển thị error data
        friendlyMessage = errorData ? JSON.stringify(errorData) : "Tạo estimate thất bại. Vui lòng kiểm tra lại dữ liệu.";
      }

      setSnack?.({
        open: true,
        message: friendlyMessage,
        severity: "warning",
      });
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing?.id) return;
    if (!validateFormBeforeSend()) return;
    try {
      setLoadingLocal(true);
      const payload = buildPayloadForApi();
      // For update API the spec expects itemsJson, laborSlots, laborRateVND, note
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

  const toggleExpand = (id) => setExpandedMap((m) => ({ ...m, [id]: !m[id] }));

  // render
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Estimates for claim</DialogTitle>
      <DialogContent dividers>
        {/* existing estimates list */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Existing Estimates</Typography>
        {loadingLocal ? <CircularProgress /> : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {list.length === 0 && <Typography color="text.secondary">No estimates yet</Typography>}
            {list.map((e) => {
              // itemsPreview: show partName, quantity, unitPrice
              const itemsPreview = (e.items || e.itemsJson || []).map((it) => {
                // items returned from API might have partName or partNo; normalize
                return {
                  partName: it.partName || it.part_name || it.name || (parts.find(p => p.id === it.partId)?.partName) || "—",
                  quantity: it.quantity ?? 0,
                  unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
                };
              });
              return (
                <Card key={e.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={700}>Estimate — v{ /* compute version if needed */ ""}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openForEdit(e)}>Edit</Button>
                        <Button size="small" onClick={() => toggleExpand(e.id)}>Details</Button>
                      </Stack>
                    </Stack>

                    <Collapse in={Boolean(expandedMap[e.id])} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Items</Typography>
                        {itemsPreview.length === 0 ? <Typography color="text.secondary">No items</Typography> : (
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            {itemsPreview.map((it, idx) => (
                              <Stack key={idx} direction="row" justifyContent="space-between">
                                <Typography variant="body2" sx={{ flex: 1 }}>{it.partName}</Typography>
                                <Typography variant="body2">{(it.quantity ?? 0)} × {(it.unitPriceVND ?? 0).toLocaleString("vi-VN")} VND</Typography>
                              </Stack>
                            ))}
                          </Stack>
                        )}

                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">Note: {e.note || "—"}</Typography>
                          <Typography variant="body2">Parts subtotal: {(e.partsSubtotalVND ?? 0).toLocaleString("vi-VN")} VND</Typography>
                          <Typography variant="body2">Labor subtotal: {(e.laborSubtotalVND ?? 0).toLocaleString("vi-VN")} VND</Typography>
                          <Typography variant="body2"><strong>Total:</strong> {(e.grandTotalVND ?? 0).toLocaleString("vi-VN")} VND</Typography>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Create/Edit form */}
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm); }}>New Estimate</Button>
            <Button variant="outlined" onClick={() => handleNewFromLatest(list, setForm, setSnack)}>Copy Latest</Button>
            <Typography color="text.secondary">Tip: Chọn Part</Typography>
          </Stack>

          {/* items table */}
          <Stack spacing={1}>
            {form.items.map((it, idx) => (
              <Grid container spacing={1} key={idx} alignItems="center">
                <Grid item xs={6} md={5}>
                  <Autocomplete
                    size="small"
                    options={parts}
                    getOptionLabel={(option) => option.partName || ""}
                    loading={partsLoading}
                    value={parts.find(p => p.id === it.partId) || (it.partName ? { id: it.partId, partName: it.partName, unitPriceVND: it.unitPriceVND } : null)}
                    onChange={(_, selected) => {
                      if (!selected) {
                        updateItem(idx, { partId: "", partName: "", unitPriceVND: 0 });
                        return;
                      }
                      updateItem(idx, { partId: selected.id, partName: selected.partName, unitPriceVND: selected.unitPriceVND ?? 0 });
                    }}
                    renderInput={(params) => <TextField {...params} label="Part (by name)" />}
                    noOptionsText="No parts"
                    freeSolo={false} // force selecting from list
                  />
                </Grid>

                <Grid item xs={3} md={2}>
                  <TextField
                    size="small"
                    label="Quantity"
                    type="number"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })}
                  />
                </Grid>

                <Grid item xs={3} md={3}>
                  <TextField
                    size="small"
                    label="Unit Price (VND)"
                    value={it.unitPriceVND ?? 0}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" onClick={() => removeItem(idx)}><DeleteOutline /></IconButton>
                  </Stack>
                </Grid>
              </Grid>
            ))}

            <Button size="small" variant="outlined" startIcon={<Add />} onClick={addItem}>Add item</Button>
          </Stack>

          {/* labor & note */}
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <TextField label="Labor slots" size="small" type="number" value={form.laborSlots} onChange={(e) => setForm((f) => ({ ...f, laborSlots: Number(e.target.value || 0) }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Labor rate (VND)" size="small" type="number" value={form.laborRateVND}
                InputProps={{ readOnly: true }} onChange={(e) => setForm((f) => ({ ...f, laborRateVND: Number(e.target.value || 0) }))} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Note" fullWidth multiline minRows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </Grid>
          </Grid>

          {/* totals + actions */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>
              Parts subtotal: {partsSubtotal.toLocaleString("vi-VN")} VND — Labor: {laborSubtotal.toLocaleString("vi-VN")} VND — <strong>Total: {grandTotal.toLocaleString("vi-VN")} VND</strong>
            </Typography>

            <Stack direction="row" spacing={1}>
              {editing ? (
                <Button variant="contained" onClick={handleUpdate}>Update Estimate</Button>
              ) : (
                <Button variant="contained" onClick={handleCreate}>Create Estimate</Button>
              )}
              <Button variant="outlined" onClick={() => { setCreating(false); setEditing(null); setForm(emptyForm); }}>Reset</Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper to prefill from latest estimate (keeps behavior)
async function handleNewFromLatest(list, setForm, setSnack) {
  if (!list || list.length === 0) {
    setForm((f) => ({ ...f, items: [], laborSlots: 0, laborRateVND: 0, note: "" }));
    return;
  }
  try {
    const latest = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (!latest?.id) { setForm((f) => ({ ...f })); return; }
    const full = await estimatesService.getById(latest.id);
    let items = [];
    try {
      const rawItems = typeof full.itemsJson === "string" ? JSON.parse(full.itemsJson) : full.itemsJson || full.items || [];
      items = (rawItems || []).map(it => ({
        partId: it.partId || it.part_id || "",
        partName: it.partName || it.part_name || it.name || "",
        unitPriceVND: it.unitPriceVND ?? it.unit_price_vnd ?? 0,
        quantity: it.quantity ?? 1
      }));
    } catch (e) {
      items = [];
    }
    setForm({ items, laborSlots: full.laborSlots ?? 0, laborRateVND: 100000, note: full.note ?? "" });
  } catch (err) {
    console.warn("Không thể tải latest estimate:", err);
    setSnack?.({ open: true, message: "Không tải được estimate mẫu", severity: "warning" });
  }
}
// ------------------ end EstimatesDialog ------------------
// ------------------ end EstimatesDialog ------------------