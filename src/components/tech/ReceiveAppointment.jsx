import React, { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Box,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Tooltip,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarTodayIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import appointmentService from "../../services/appointmentService";
import technicianService from "../../services/technicianService";
import claimService from "../../services/claimService";
import vehicleService from "../../services/vehicleService";

const STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "Đang tiến hành", color: "warning" },
  { value: "DONE", label: "Hoàn thành", color: "success" },
];

export default function ReceiveAppointment() {
  // ✅ Lấy userId hiện tại từ localStorage hoặc từ user object
  const getCurrentUserId = () => {
    // Thử lấy trực tiếp từ localStorage
    let userId = localStorage.getItem("userId") || localStorage.getItem("technicianId");
    
    // Nếu không có, thử lấy từ user object
    if (!userId) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user?.id || user?.userId || user?.technicianId;
        }
      } catch (err) {
        console.warn("Failed to parse user from localStorage:", err);
      }
    }
    
    return userId;
  };
  
  const currentUserId = getCurrentUserId();
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [technicianId, setTechnicianId] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  // Dialog states
  const [detailDialog, setDetailDialog] = useState({ open: false, appointment: null });
  const [statusDialog, setStatusDialog] = useState({ open: false, appointment: null, newStatus: "" });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Load appointments for current technician only
  const loadAppointments = async (techId, fallbackUserId = null) => {
    if (!techId && !fallbackUserId) {
      console.warn("[ReceiveAppointment] loadAppointments: No technicianId or userId provided");
      showSnackbar("Không tìm thấy thông tin kỹ thuật viên", "error");
      setLoading(false);
      return;
    }
    
    const idToUse = techId || fallbackUserId;
    console.log("[ReceiveAppointment] loadAppointments: Loading appointments for ID:", idToUse, "(techId:", techId, ", fallbackUserId:", fallbackUserId, ")");
    setLoading(true);
    try {
      const res = await appointmentService.getByTechnician(idToUse);
      console.log("[ReceiveAppointment] loadAppointments: API response:", res);
      
      // Check for 404 or not found errors
      if (res.error) {
        const errorStatus = res.error?.status || res.error?.response?.status;
        const errorData = res.error?.response?.data || res.error;
        
        // If 404 and we have a fallback, try with fallback
        if (errorStatus === 404 && techId && fallbackUserId && techId !== fallbackUserId) {
          console.log("[ReceiveAppointment] loadAppointments: 404 error, retrying with fallback userId:", fallbackUserId);
          return loadAppointments(null, fallbackUserId);
        }
        
        // If still 404 or no fallback, show appropriate message
        if (errorStatus === 404) {
          const errorMsg = errorData?.message || "Không tìm thấy lịch hẹn cho kỹ thuật viên này";
          console.warn("[ReceiveAppointment] loadAppointments: 404 -", errorMsg);
          // Don't show error if no appointments found - just set empty array
          setAppointments([]);
          setFilteredAppointments([]);
          return;
        }
        
        // Other errors
        const errorMsg = res.message || errorData?.message || errorData?.error || "Không thể tải danh sách lịch hẹn";
        showSnackbar(errorMsg, "error");
        setAppointments([]);
        setFilteredAppointments([]);
        return;
      }
      
      if (res.success) {
        const techAppointments = res.data || [];
        console.log("[ReceiveAppointment] loadAppointments: Loaded", techAppointments.length, "appointments");
        
        // If no appointments, just set empty arrays
        if (techAppointments.length === 0) {
          setAppointments([]);
          setFilteredAppointments([]);
          return;
        }
        
        // Fetch claim details for each appointment to get VIN + customerName
        const enrichedAppointments = await Promise.all(
          techAppointments.map(async (apt) => {
            const claimId = apt.claimId || apt.claim?.id;
            let vin = "";
            let customerName = "";
            
            if (claimId) {
              try {
                console.log("[ReceiveAppointment] Fetching claim details for claimId:", claimId);
                const claimData = await claimService.getById(claimId);
                console.log("[ReceiveAppointment] Claim data:", claimData);
                
                // Extract VIN from claim
                vin = claimData?.vin || 
                  claimData?.vehicleVin || 
                  claimData?.vehicle?.vin ||
                  claimData?.vehicle?.vehicleVin ||
                  claimData?.vehicleVinCode ||
                  "";
                
                // Extract customerName (intakeContactName) from claim
                customerName = claimData?.intakeContactName || 
                  claimData?.contactName ||
                  claimData?.customerName ||
                  claimData?.customer?.name ||
                  claimData?.ownerName ||
                  "";
                
                // If customerName is not in claim, try to get from vehicle
                if (!customerName || customerName.trim().length === 0) {
                  if (vin && vin.trim().length > 0) {
                    try {
                      console.log("[ReceiveAppointment] Fetching vehicle details for VIN:", vin);
                      const vehicleData = await vehicleService.getByVin(vin);
                      console.log("[ReceiveAppointment] Vehicle data:", vehicleData);
                      
                      customerName = vehicleData?.intakeContactName ||
                        vehicleData?.contactName ||
                        vehicleData?.ownerName ||
                        vehicleData?.customerName ||
                        "";
                    } catch (err) {
                      console.warn("[ReceiveAppointment] Failed to fetch vehicle details for VIN:", vin, err);
                    }
                  }
                }
                
                console.log("[ReceiveAppointment] Extracted - VIN:", vin, "CustomerName:", customerName);
              } catch (err) {
                console.warn("[ReceiveAppointment] Failed to fetch claim details for claimId:", claimId, err);
                // Fallback: try to get from appointment data
                vin = apt.vin || apt.vehicleVin || apt.claim?.vin || apt.vehicle?.vin || "";
                customerName = apt.customerName || apt.intakeContactName || apt.claim?.intakeContactName || "";
              }
      } else {
              // No claimId, try to get from appointment data
              vin = apt.vin || apt.vehicleVin || apt.vehicle?.vin || apt.claim?.vin || "";
              customerName = apt.customerName || apt.intakeContactName || apt.claim?.intakeContactName || "";
            }
            
            // Normalize
            vin = vin && vin !== "—" ? String(vin).trim() : "";
            customerName = customerName && customerName !== "—" ? String(customerName).trim() : "";
            
            return {
              ...apt,
              vin: vin || "—",
              customerName: customerName || "—",
            };
          })
        );
        
        setAppointments(enrichedAppointments);
        setFilteredAppointments(enrichedAppointments);
        // Clear any error snackbar when appointments load successfully
        if (snackbar.open && snackbar.severity === "error") {
          setSnackbar({ open: false, message: "", severity: "info" });
        }
      } else {
        console.error("[ReceiveAppointment] loadAppointments: API returned success=false", res);
        
        // Nếu fail với techId và có fallbackUserId, thử lại với userId
        if (techId && fallbackUserId && techId !== fallbackUserId) {
          console.log("[ReceiveAppointment] loadAppointments: Retrying with fallback userId:", fallbackUserId);
          return loadAppointments(null, fallbackUserId);
        }
        
        const errorMsg = res.message || res.error?.message || "Không thể tải danh sách lịch hẹn";
        showSnackbar(errorMsg, "error");
        setAppointments([]);
        setFilteredAppointments([]);
      }
    } catch (err) {
      console.error("[ReceiveAppointment] loadAppointments: Error:", err);
      console.error("[ReceiveAppointment] loadAppointments: Error response:", err?.response?.data);
      
      // Check for 404
      if (err?.response?.status === 404) {
        // If 404 and we have a fallback, try with fallback
        if (techId && fallbackUserId && techId !== fallbackUserId) {
          console.log("[ReceiveAppointment] loadAppointments: 404 error, retrying with fallback userId:", fallbackUserId);
          return loadAppointments(null, fallbackUserId);
        }
        // If still 404, just set empty arrays (no error message needed)
        console.warn("[ReceiveAppointment] loadAppointments: 404 - No appointments found");
        setAppointments([]);
        setFilteredAppointments([]);
        return;
      }
      
      // Nếu fail với techId và có fallbackUserId, thử lại với userId
      if (techId && fallbackUserId && techId !== fallbackUserId) {
        console.log("[ReceiveAppointment] loadAppointments: Retrying with fallback userId after error:", fallbackUserId);
        return loadAppointments(null, fallbackUserId);
      }
      
      const errorMsg = err?.response?.data?.message || err.message || "Lỗi khi tải dữ liệu";
      showSnackbar(errorMsg, "error");
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTechnician = async () => {
      if (!currentUserId) {
        showSnackbar("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", "error");
        setLoading(false);
        return;
      }

      try {
        console.log("[ReceiveAppointment] Fetching technician for userId:", currentUserId);
        const res = await technicianService.getById(currentUserId);
        console.log("[ReceiveAppointment] Technician API response (full):", JSON.stringify(res, null, 2));
        
        // Chỉ lấy technicianId từ response (không dùng id hoặc userId vì API appointments cần technicianId)
        const techId =
          res?.technicianId ||         // Ưu tiên technicianId (API appointments cần field này)
          res?.data?.technicianId ||
          res?.scheduleId ||           // Fallback: scheduleId (có thể BE dùng scheduleId)
          res?.techScheduleId ||      // Hoặc techScheduleId
          res?.techSchedule?.id ||    // Hoặc nested trong techSchedule object
          res?.data?.scheduleId ||
          res?.data?.techScheduleId ||
          null; // Không fallback sang id hoặc userId vì API appointments không chấp nhận
        
        console.log("[ReceiveAppointment] Extracted technicianId/scheduleId:", techId);
        console.log("[ReceiveAppointment] All available fields in response:", Object.keys(res || {}));
        console.log("[ReceiveAppointment] res.technicianId:", res?.technicianId);
        console.log("[ReceiveAppointment] res.id:", res?.id);
        console.log("[ReceiveAppointment] res.scheduleId:", res?.scheduleId);
        
        if (techId && techId !== currentUserId) {
          // Chỉ set technicianId nếu tìm thấy và khác userId
          console.log("[ReceiveAppointment] Using technicianId:", techId);
          setTechnicianId(String(techId));
        } else {
          // Nếu không tìm thấy technicianId hợp lệ, để trống và dùng userId trực tiếp
          console.warn("[ReceiveAppointment] No valid technicianId found, will use userId directly in API call");
          setTechnicianId("");
          // Không show error ở đây, để loadAppointments tự xử lý với userId
        }
      } catch (err) {
        console.error("[ReceiveAppointment] Fetch technician failed:", err);
        console.error("[ReceiveAppointment] Error response:", err?.response?.data);
        const status = err?.response?.status;
        if (status === 404) {
          // 404 khi fetch technician - không show error, để loadAppointments tự xử lý với userId
          console.warn("[ReceiveAppointment] Technician not found (404), will try with userId directly");
        } else {
          showSnackbar("Lỗi khi tải thông tin kỹ thuật viên: " + (err?.response?.data?.message || err.message), "error");
        }
        setTechnicianId("");
        // Không set loading = false ở đây, để loadAppointments tự xử lý
      }
    };

    fetchTechnician();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (technicianId) {
      loadAppointments(technicianId, currentUserId);
    } else if (currentUserId) {
      // Nếu không có technicianId, thử dùng userId trực tiếp
      console.log("[ReceiveAppointment] No technicianId, trying with userId:", currentUserId);
      loadAppointments(null, currentUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianId, currentUserId]);

  // Apply filters - appointments đã được load theo technician rồi, chỉ cần filter search/status/date
  useEffect(() => {
    let filtered = [...appointments];

    // Search filter (by names only, no IDs)
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.technicianName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.centerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.requiredSkill?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    // Date filter
    if (filterDate) {
      filtered = filtered.filter(apt =>
        apt.slots?.some(slot => slot.slotDate === filterDate)
      );
    }

    setFilteredAppointments(filtered);
  }, [searchTerm, filterStatus, filterDate, appointments]);

  // Auto-hide error snackbar after 5 seconds
  useEffect(() => {
    if (snackbar.open && snackbar.severity === "error") {
      const timer = setTimeout(() => {
        setSnackbar({ ...snackbar, open: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open, snackbar.severity]);

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle start appointment - update status to IN_PROGRESS
  const handleStartAppointment = async (appointment) => {
    if (!appointment?.id) {
      showSnackbar("Không tìm thấy appointment", "error");
      return;
    }

    // Check if appointment belongs to current technician
    if (appointment.technicianId !== technicianId && appointment.technicianId !== currentUserId) {
      showSnackbar("Bạn không có quyền cập nhật lịch hẹn này", "error");
      return;
    }

    try {
      const res = await appointmentService.updateStatus(appointment.id, { status: "IN_PROGRESS" });
      if (res.success) {
        showSnackbar("Đã bắt đầu ca làm việc", "success");
        loadAppointments(technicianId, currentUserId);
      } else {
        const errorMsg = res.message || res.error?.message || "Cập nhật thất bại";
        showSnackbar(errorMsg, "error");
      }
    } catch (err) {
      console.error("Start appointment error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Lỗi khi bắt đầu ca làm việc";
      showSnackbar(errorMsg, "error");
    }
  };

  // Update status - only if appointment belongs to current technician
  const handleUpdateStatus = async () => {
    if (!statusDialog.appointment || !statusDialog.newStatus) {
      showSnackbar("Vui lòng chọn trạng thái mới", "warning");
      return;
    }

    // Check if appointment belongs to current technician
    if (statusDialog.appointment.technicianId !== technicianId && statusDialog.appointment.technicianId !== currentUserId) {
      showSnackbar("Bạn không có quyền cập nhật lịch hẹn này", "error");
      return;
    }

    try {
      const res = await appointmentService.updateStatus(
        statusDialog.appointment.id,
        { status: statusDialog.newStatus }
      );

      if (res.success) {
        showSnackbar("Cập nhật trạng thái thành công", "success");
        setStatusDialog({ open: false, appointment: null, newStatus: "" });
        loadAppointments(technicianId, currentUserId);
      } else {
        const errorMsg = res.message || res.error?.message || "Cập nhật thất bại";
        showSnackbar(errorMsg, "error");
      }
    } catch (err) {
      console.error("Update status error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Lỗi khi cập nhật trạng thái";
      showSnackbar(errorMsg, "error");
    }
  };

  // Statistics - appointments đã được load theo technician rồi
  const stats = useMemo(() => {
    const total = appointments.length;
    const inProgress = appointments.filter(a => a.status === "IN_PROGRESS").length;
    const done = appointments.filter(a => a.status === "DONE").length;
    const booked = appointments.filter(a => a.status === "BOOKED").length;
    const today = appointments.filter(a =>
      a.slots?.some(s => s.slotDate === dayjs().format("YYYY-MM-DD"))
    ).length;

    return { total, booked, inProgress, done, today };
  }, [appointments]);

  const getStatusColor = (status) => {
    const statusMap = {
      "BOOKED": "info",
      "IN_PROGRESS": "warning",
      "DONE": "success",
      "CANCELLED": "error",
      "COMPLETED": "success",
      "CONFIRMED": "primary",
      "NO_SHOW": "default"
    };
    return statusMap[status] || "default";
  };

  const formatDateTime = (dateStr) => {
    return dayjs(dateStr).format("DD/MM/YYYY HH:mm");
  };

  const renderAppointmentCard = (apt) => {
    // Check if appointment belongs to current technician
    const canUpdate = apt.technicianId === technicianId || apt.technicianId === currentUserId;
    
    return (
      <Card key={apt.id} sx={{ mb: 2, boxShadow: 2, '&:hover': { boxShadow: 4 }, bgcolor: 'transparent' }}>
        <CardContent sx={{ bgcolor: 'transparent' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {apt.technicianName || "Lịch hẹn"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={apt.status}
                  color={getStatusColor(apt.status)}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={apt.requiredSkill || "N/A"}
                  variant="outlined"
                  size="small"
                  icon={<AssignmentIcon />}
                />
                <Chip
                  label={apt.type || "RECALL"}
                  variant="outlined"
                  size="small"
                />
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Xem chi tiết">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setDetailDialog({ open: true, appointment: apt })}
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>
              {canUpdate && (
                <Stack direction="row" spacing={1}>
                  {apt.status === "BOOKED" && (
                    <Tooltip title="Bắt đầu ca làm việc">
                  <Button
                    variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleStartAppointment(apt)}
                        sx={{ textTransform: 'none' }}
                      >
                        Bắt đầu
                      </Button>
                    </Tooltip>
                  )}
                  {(apt.status !== "BOOKED" && apt.status !== "IN_PROGRESS") && (
                    <Tooltip title="Cập nhật trạng thái">
                      <Button
                        variant="outlined"
                    size="small"
                    startIcon={<UpdateIcon />}
                    onClick={() => {
                      const initialStatus = (apt.status === "IN_PROGRESS" || apt.status === "DONE") 
                        ? apt.status 
                        : "IN_PROGRESS";
                      setStatusDialog({ open: true, appointment: apt, newStatus: initialStatus });
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                        Cập nhật
                  </Button>
                </Tooltip>
                  )}
                </Stack>
              )}
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2">
                  <strong>Kỹ thuật viên:</strong> {apt.technicianName || "Chưa có"}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  <strong>VIN:</strong> {apt.vin && apt.vin !== "—" ? apt.vin : "N/A"}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  <strong>Khách hàng:</strong> {apt.customerName && apt.customerName !== "—" ? apt.customerName : "N/A"}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EventIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2">
                  <strong>Trung tâm:</strong> {apt.centerName || "N/A"}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Thời gian:
              </Typography>
              {apt.slots?.map((slot, idx) => (
                <Box key={idx} sx={{ ml: 2, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 0.5, fontSize: 16 }} />
                    {slot.slotDate} • {slot.startTime} - {slot.endTime}
                    <Chip
                      label={slot.status}
                      size="small"
                      sx={{ ml: 1, height: 20, fontSize: 10 }}
                    />
                  </Typography>
                </Box>
              ))}
            </Grid>
          </Grid>

          {apt.note && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'transparent', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Ghi chú:</strong> {apt.note}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Tạo lúc: {formatDateTime(apt.createdAt)}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderStatCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
            <Typography variant="body2">Tổng lịch hẹn</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.booked}</Typography>
            <Typography variant="body2">Đã đặt</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.inProgress}</Typography>
            <Typography variant="body2">Đang tiến hành</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.done}</Typography>
            <Typography variant="body2">Hoàn thành</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.today}</Typography>
            <Typography variant="body2">Hôm nay</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          <CalendarTodayIcon sx={{ mr: 1 }} />
          Quản lý Lịch Hẹn
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => loadAppointments(technicianId, currentUserId)}
        >
          Làm mới
        </Button>
      </Box>

      {/* Statistics */}
      {renderStatCards()}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'transparent' }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <FilterListIcon sx={{ mr: 1 }} />
          Bộ lọc
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm theo tên, trung tâm, kỹ năng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={filterStatus}
                label="Trạng thái"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="ALL">Tất cả</MenuItem>
                <MenuItem value="BOOKED">Đã đặt</MenuItem>
                <MenuItem value="IN_PROGRESS">Đang tiến hành</MenuItem>
                <MenuItem value="DONE">Hoàn thành</MenuItem>
                <MenuItem value="CANCELLED">Đã hủy</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Ngày"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label={`Tất cả (${filteredAppointments.length})`} />
        <Tab label="Dạng lưới" />
      </Tabs>

      {/* Content */}
      {tabValue === 0 && (
        <Box>
          {filteredAppointments.length === 0 ? (
            <Alert severity="info">Không có lịch hẹn nào</Alert>
          ) : (
            filteredAppointments.map(apt => renderAppointmentCard(apt))
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ bgcolor: 'transparent' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Kỹ thuật viên</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell><strong>Kỹ năng</strong></TableCell>
                <TableCell><strong>Ngày</strong></TableCell>
                <TableCell><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAppointments.map(apt => {
                // Appointments đã được load theo technician rồi, nên tất cả đều thuộc về technician hiện tại
                const canUpdate = true;
                return (
                  <TableRow key={apt.id} hover>
                    <TableCell>{apt.technicianName || "N/A"}</TableCell>
                    <TableCell>
                      <Chip label={apt.status} color={getStatusColor(apt.status)} size="small" />
                    </TableCell>
                    <TableCell>{apt.requiredSkill || "N/A"}</TableCell>
                    <TableCell>
                      {apt.slots?.[0]?.slotDate || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => setDetailDialog({ open: true, appointment: apt })}
                      >
                        <InfoIcon />
                      </IconButton>
                      {canUpdate && (
                          <>
                            {apt.status === "BOOKED" && (
                              <Tooltip title="Bắt đầu ca làm việc">
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  onClick={() => handleStartAppointment(apt)}
                                  sx={{ textTransform: 'none', minWidth: 100 }}
                                >
                                  Bắt đầu
                                </Button>
                              </Tooltip>
                            )}
                          {(apt.status !== "BOOKED" && apt.status !== "IN_PROGRESS") && (
                            <Tooltip title="Cập nhật">
                        <IconButton
                          size="small"
                          onClick={() => {
                            const initialStatus = (apt.status === "IN_PROGRESS" || apt.status === "DONE") 
                              ? apt.status 
                              : "IN_PROGRESS";
                            setStatusDialog({ open: true, appointment: apt, newStatus: initialStatus });
                          }}
                        >
                          <UpdateIcon />
                        </IconButton>
                            </Tooltip>
                      )}
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, appointment: null })}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          sx: { 
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            zIndex: 1300
          } 
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Chi tiết lịch hẹn
          </Typography>
          <IconButton 
            onClick={() => setDetailDialog({ open: false, appointment: null })}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {detailDialog.appointment && (
            <Box>
              {/* Thông tin cơ bản */}
              <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        VIN
                </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {detailDialog.appointment.vin && detailDialog.appointment.vin !== "—" ? detailDialog.appointment.vin : "N/A"}
                </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Khách hàng
                </Typography>
                      <Typography variant="body1">
                        {detailDialog.appointment.customerName && detailDialog.appointment.customerName !== "—" ? detailDialog.appointment.customerName : "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Trung tâm
                      </Typography>
                      <Typography variant="body1">
                        {detailDialog.appointment.centerName || "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Kỹ thuật viên
                      </Typography>
                      <Typography variant="body1">
                        {detailDialog.appointment.technicianName || "N/A"}
                      </Typography>
                    </Box>
                  </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Trạng thái
                      </Typography>
                  <Chip
                    label={detailDialog.appointment.status}
                    color={getStatusColor(detailDialog.appointment.status)}
                    size="small"
                        sx={{ fontWeight: 600 }}
                  />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Kỹ năng
                </Typography>
                      <Typography variant="body1">
                        {detailDialog.appointment.requiredSkill || "N/A"}
                </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Loại
                </Typography>
                      <Typography variant="body1">
                        {detailDialog.appointment.type || "N/A"}
                </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Tạo lúc
                      </Typography>
                      <Typography variant="body1">
                        {formatDateTime(detailDialog.appointment.createdAt)}
                      </Typography>
                    </Box>
                  </Stack>
              </Grid>
              </Grid>

              {/* Thời gian làm việc */}
              {detailDialog.appointment.slots && detailDialog.appointment.slots.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Thời gian làm việc
                    </Typography>
                  <Stack spacing={2}>
                    {detailDialog.appointment.slots.map((slot, idx) => (
                      <Paper 
                        key={idx} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Ngày
                    </Typography>
                            <Typography variant="body1">
                              {slot.slotDate || "N/A"}
                    </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Giờ
                      </Typography>
                            <Typography variant="body1">
                              {slot.startTime} - {slot.endTime}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Trạng thái
                            </Typography>
                            <Chip 
                              label={slot.status} 
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </Grid>
                        </Grid>
                  </Paper>
                ))}
                  </Stack>
                </>
              )}

              {/* Ghi chú chung */}
              {detailDialog.appointment.note && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                      Ghi chú chung
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {detailDialog.appointment.note}
                    </Typography>
                  </Paper>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            variant="contained"
            onClick={() => setDetailDialog({ open: false, appointment: null })}
            sx={{ minWidth: 100 }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, appointment: null, newStatus: "" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'transparent' } }}
      >
        <DialogTitle sx={{ bgcolor: 'transparent' }}>Cập nhật trạng thái</DialogTitle>
        <DialogContent sx={{ bgcolor: 'transparent' }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Trạng thái mới</InputLabel>
            <Select
              value={statusDialog.newStatus}
              label="Trạng thái mới"
              onChange={(e) => setStatusDialog(prev => ({ ...prev, newStatus: e.target.value }))}
            >
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {statusDialog.appointment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'transparent', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2">
                <strong>Kỹ thuật viên:</strong> {statusDialog.appointment.technicianName || "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Trạng thái hiện tại:</strong>{" "}
                <Chip
                  label={statusDialog.appointment.status}
                  color={getStatusColor(statusDialog.appointment.status)}
                  size="small"
                />
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'transparent' }}>
          <Button onClick={() => setStatusDialog({ open: false, appointment: null, newStatus: "" })}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={!statusDialog.newStatus}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>


      {/* Snackbar */}
      {snackbar.open && (
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            minWidth: 300,
            boxShadow: 3,
            zIndex: 9999
          }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
}