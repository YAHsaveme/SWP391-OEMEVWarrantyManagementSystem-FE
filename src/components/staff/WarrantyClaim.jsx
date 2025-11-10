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
  Checkbox,
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
import diagnosticsService from "../../services/diagnosticsService";
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

const EXCLUSIONS = [
  "ACCIDENT_DAMAGE",
  "WATER_INGRESSION",
  "UNAUTHORIZED_MOD",
  "LACK_OF_MAINTENANCE",
  "WEAR_AND_TEAR",
];

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
  const [viewOpen, setViewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false); // new for update dialog
  const [activeClaim, setActiveClaim] = useState(null);

  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

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
                  {/* View button: open view-only dialog */}
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
                    Xem chi tiết
                  </Button>

                  {/* Update button: open update dialog */}
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
                    Cập nhật
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
  const [exclusions, setExclusions] = useState([]);
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

      // Gửi payload JSON lên backend - theo claimService.js
      const payload = {
        vin: vin.trim(),
        errorDate: errorDate ? new Date(errorDate).toISOString() : new Date().toISOString(),
        odometerKm: Number(odometerKm) || 0,
        summary: summary.trim(),
        attachmentUrls: uploadedUrls,
        exclusion: exclusions && exclusions.length > 0 ? exclusions.join(", ") : undefined, // Optional field - join array thành string
      };

      await onCreate?.(payload);
      onClose?.();

      // Reset form
      setVin("");
      setSummary("");
      setOdometerKm("");
      setErrorDate("");
      setExclusions([]);
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

            {/* Manual Recall Check Button */}
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={async () => {
                  if (!vin?.trim() || vin.trim().length < 17) {
                    setSnack?.({ open: true, message: "Vui lòng nhập VIN hợp lệ (17 ký tự) trước khi kiểm tra recall", severity: "warning" });
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
                    if (result.hasRecall && result.events.length > 0) {
                      setSnack?.({ open: true, message: `Tìm thấy ${result.events.length} sự kiện recall cho VIN này`, severity: "warning" });
                    } else {
                      setSnack?.({ open: true, message: "VIN này không thuộc recall nào", severity: "success" });
                    }
                  } catch (err) {
                    console.error("Check recall failed:", err);
                    setRecallCheck({ checking: false, hasRecall: false, events: [] });
                    setSnack?.({ open: true, message: "Không thể kiểm tra recall", severity: "error" });
                  }
                }}
                disabled={!vin?.trim() || vin.trim().length < 17 || recallCheck.checking}
              >
                {recallCheck.checking ? <CircularProgress size={20} /> : "Kiểm tra VIN có thuộc Recall"}
              </Button>
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
                      <Typography key={event.id || idx} variant="body2">
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
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Odometer (km)"
                type="number"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Exclusions (Optional)</InputLabel>
                <Select
                  multiple
                  value={exclusions}
                  label="Exclusions (Optional)"
                  onChange={(e) => setExclusions(e.target.value)}
                  renderValue={(selected) => selected.length > 0 ? selected.join(", ") : "Chọn exclusions (tùy chọn)"}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {EXCLUSIONS.map((exclusion) => (
                    <MenuItem key={exclusion} value={exclusion}>
                      <Checkbox checked={exclusions.indexOf(exclusion) > -1} />
                      <Typography variant="body2">{exclusion}</Typography>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary" }}>
                  Chọn các exclusions áp dụng cho claim này (có thể để trống)
                </Typography>
              </FormControl>
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

/* ---------- View Only Dialog - List format with Diagnostics, Estimates, Events ---------- */
function ViewOnlyDialog({ open, onClose, claim }) {
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [centerName, setCenterName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [recallEvents, setRecallEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

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

  // Load Diagnostics, Estimates, and Events
  useEffect(() => {
    if (!open || !claim?.id) return;

    const loadAllData = async () => {
      setLoadingData(true);
      try {
        // Load Diagnostics
        try {
          const diagData = await diagnosticsService.getByClaim(claim.id);
          setDiagnostics(Array.isArray(diagData) ? diagData : []);
        } catch (err) {
          console.error("Load diagnostics failed:", err);
          setDiagnostics([]);
        }

        // Load Estimates
        try {
          const estData = await estimatesService.getByClaim(claim.id);
          setEstimates(Array.isArray(estData) ? estData : []);
        } catch (err) {
          console.error("Load estimates failed:", err);
          setEstimates([]);
        }

        // Load Recall Events
        if (claim.vin) {
          try {
            const recallData = await eventService.checkRecallByVin(claim.vin);
            setRecallEvents(recallData.events || []);
          } catch (err) {
            console.error("Load recall events failed:", err);
            setRecallEvents([]);
          }
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadAllData();
  }, [open, claim?.id, claim?.vin]);

  // Helper function to render list items
  const renderListItem = (label, value) => (
    <Box sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" spacing={2}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontWeight: 600 }}>
          {label}:
        </Typography>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {value || "—"}
        </Typography>
      </Stack>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Xem chi tiết Claim</DialogTitle>
      <DialogContent dividers>
        {!claim ? (
          <Typography color="text.secondary">No claim selected.</Typography>
        ) : (
          <Box>
            {loadingData && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Claim Information - List Format */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                  Thông tin Claim
                </Typography>
                <Box>
                  {renderListItem("VIN", <Mono>{claim.vin || "—"}</Mono>)}
                  {renderListItem("Intake Contact Name", vehicleInfo?.intakeContactName || claim.intakeContactName || "—")}
                  {renderListItem("Intake Contact Phone", vehicleInfo?.intakeContactPhone || "—")}
                  {renderListItem("Service Center", centerName)}
                  {renderListItem("Opened By", currentUser && claim.openedBy === currentUser.id ? currentUser.fullName : claim.openedBy || "—")}
                  {renderListItem("Claim Type", claim.claimType || "—")}
                  {renderListItem("Status", claim.status || "—")}
                  {renderListItem("Opened At", claim.openedAt ? new Date(claim.openedAt).toLocaleString("vi-VN") : "—")}
                  {renderListItem("Error Date", claim.errorDate ? new Date(claim.errorDate).toLocaleString("vi-VN") : "—")}
                  {renderListItem("Coverage Type", claim.coverageType || "—")}
                  {renderListItem("Odometer (km)", claim.odometerKm || "—")}
                  {renderListItem("Summary", claim.summary || "—")}
                  {renderListItem("Exclusion", claim.exclusion || "—")}
                </Box>

                {/* Attachments */}
                {Array.isArray(claim.attachmentUrls) && claim.attachmentUrls.filter((url) => url && url !== "string").length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Attachments:
                    </Typography>
                    <Stack spacing={1} direction="row" flexWrap="wrap">
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
              </CardContent>
            </Card>

            {/* Diagnostics Section */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                  Diagnostics ({diagnostics.length})
                </Typography>
                {diagnostics.length === 0 ? (
                  <Typography color="text.secondary">Chưa có diagnostics</Typography>
                ) : (
                  <Stack spacing={2}>
                    {diagnostics.map((diag) => (
                      <Card key={diag.id} variant="outlined" sx={{ bgcolor: "action.hover" }}>
                        <CardContent>
                          <Stack spacing={1}>
                            {renderListItem("Phase", diag.phase || "—")}
                            {renderListItem("Outcome", diag.outcome || "—")}
                            {renderListItem("SOH (%)", diag.sohPct ?? "—")}
                            {renderListItem("SOC (%)", diag.socPct ?? "—")}
                            {renderListItem("Pack Voltage", diag.packVoltage ?? "—")}
                            {renderListItem("Cell Delta (mV)", diag.cellDeltaMv ?? "—")}
                            {renderListItem("Cycles", diag.cycles ?? "—")}
                            {renderListItem("Performed By", diag.performedByName || "—")}
                            {renderListItem("Recorded At", diag.recordedAt ? new Date(diag.recordedAt).toLocaleString("vi-VN") : "—")}
                            {renderListItem("Notes", diag.notes || "—")}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Estimates Section */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                  Estimates ({estimates.length})
                </Typography>
                {estimates.length === 0 ? (
                  <Typography color="text.secondary">Chưa có estimates</Typography>
                ) : (
                  <Stack spacing={2}>
                    {estimates.map((est) => {
                      const items = est.itemsJson ? (typeof est.itemsJson === "string" ? JSON.parse(est.itemsJson) : est.itemsJson) : est.items || [];
                      return (
                        <Card key={est.id} variant="outlined" sx={{ bgcolor: "action.hover" }}>
                          <CardContent>
                            <Stack spacing={1}>
                              {renderListItem("Version", est.versionNo ?? est.version ?? "—")}
                              {renderListItem("Created At", est.createdAt ? new Date(est.createdAt).toLocaleString("vi-VN") : "—")}
                              {renderListItem("Note", est.note || "—")}
                              {renderListItem("Labor Slots", est.laborSlots ?? "—")}
                              {renderListItem("Labor Rate (VND)", est.laborRateVND ? est.laborRateVND.toLocaleString("vi-VN") : "—")}
                              {renderListItem("Parts Subtotal (VND)", est.partsSubtotalVND ? est.partsSubtotalVND.toLocaleString("vi-VN") : "—")}
                              {renderListItem("Labor Subtotal (VND)", est.laborSubtotalVND ? est.laborSubtotalVND.toLocaleString("vi-VN") : "—")}
                              {renderListItem("Grand Total (VND)", est.grandTotalVND ? est.grandTotalVND.toLocaleString("vi-VN") : "—")}
                              {items.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Items:
                                  </Typography>
                                  <Stack spacing={0.5}>
                                    {items.map((item, idx) => (
                                      <Box key={idx} sx={{ pl: 2, py: 0.5, borderLeft: "2px solid", borderColor: "primary.main" }}>
                                        <Typography variant="body2">
                                          {item.partName || item.part_name || "—"} × {item.quantity ?? 0} = {(item.unitPriceVND ?? item.unit_price_vnd ?? 0) * (item.quantity ?? 0)} VND
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Recall Events Section */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
                  Recall Events ({recallEvents.length})
                </Typography>
                {recallEvents.length === 0 ? (
                  <Typography color="text.secondary">Không có recall events cho VIN này</Typography>
                ) : (
                  <Stack spacing={2}>
                    {recallEvents.map((event) => (
                      <Card key={event.id} variant="outlined" sx={{ bgcolor: "warning.light", opacity: 0.9 }}>
                        <CardContent>
                          <Stack spacing={1}>
                            {renderListItem("Event Name", event.name || "—")}
                            {renderListItem("Type", event.type || "—")}
                            {renderListItem("Reason", event.reason || "—")}
                            {renderListItem("Start Date", event.startDate ? new Date(event.startDate).toLocaleString("vi-VN") : "—")}
                            {renderListItem("End Date", event.endDate ? new Date(event.endDate).toLocaleString("vi-VN") : "—")}
                            {event.affectedParts && event.affectedParts.length > 0 && (
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  Affected Parts:
                                </Typography>
                                <Stack spacing={0.5}>
                                  {event.affectedParts.map((part, idx) => (
                                    <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                      • {part}
                                    </Typography>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                            {event.exclusions && event.exclusions.length > 0 && (
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  Exclusions:
                                </Typography>
                                <Stack spacing={0.5}>
                                  {event.exclusions.map((excl, idx) => (
                                    <Typography key={idx} variant="body2" sx={{ pl: 2 }}>
                                      • {excl}
                                    </Typography>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Đóng</Button>
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
  const [status, setStatus] = useState(claim?.status || "");
  const [files, setFiles] = useState([]); // new files to upload
  const [savingAll, setSavingAll] = useState(false);

  // Sync when claim changes
  useEffect(() => {
    if (claim) {
      setEditSummary(claim.summary || "");
      setEditOdometer(claim.odometerKm || "");
      setEditErrorDate(claim.errorDate ? new Date(claim.errorDate).toISOString().slice(0, 16) : "");
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

      // 2️⃣ Chuẩn bị payload đúng 100% với yêu cầu backend - theo claimService.js
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
        exclusion: claim.exclusion || undefined, // Optional field theo claimService.js
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

            <Grid item xs={12}>
              <TextField
                label="Exclusion (Optional)"
                multiline
                minRows={2}
                value={claim.exclusion || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                helperText="Read-only field"
              />
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