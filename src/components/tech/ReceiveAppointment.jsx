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
} from "@mui/icons-material";
import dayjs from "dayjs";
import appointmentService from "../../services/appointmentService";

const STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "Đang tiến hành", color: "warning" },
  { value: "DONE", label: "Hoàn thành", color: "success" },
];

export default function ReceiveAppointment() {
  // ✅ Lấy userId hiện tại từ localStorage
  const currentUserId = localStorage.getItem("userId");
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

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
  const loadAppointments = async () => {
    if (!currentUserId) {
      showSnackbar("Không tìm thấy thông tin kỹ thuật viên", "error");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await appointmentService.getByTechnician(currentUserId);
      if (res.success) {
        const techAppointments = res.data || [];
        setAppointments(techAppointments);
        setFilteredAppointments(techAppointments);
      } else {
        showSnackbar("Không thể tải danh sách lịch hẹn", "error");
      }
    } catch (err) {
      console.error("Load appointments error:", err);
      showSnackbar("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Apply filters - only show appointments for current technician
  useEffect(() => {
    let filtered = [...appointments];

    // Filter by current technician
    if (currentUserId) {
      filtered = filtered.filter(apt => 
        apt.technicianId === currentUserId || apt.id === currentUserId
      );
    }

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
  }, [searchTerm, filterStatus, filterDate, appointments, currentUserId]);

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Update status - only if appointment belongs to current technician
  const handleUpdateStatus = async () => {
    if (!statusDialog.appointment || !statusDialog.newStatus) {
      showSnackbar("Vui lòng chọn trạng thái mới", "warning");
      return;
    }

    // Check if appointment belongs to current technician
    if (statusDialog.appointment.technicianId !== currentUserId && statusDialog.appointment.id !== currentUserId) {
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
        loadAppointments();
      } else {
        showSnackbar("Cập nhật thất bại", "error");
      }
    } catch (err) {
      showSnackbar("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const techAppointments = appointments.filter(apt => 
      apt.technicianId === currentUserId || apt.id === currentUserId
    );
    const total = techAppointments.length;
    const inProgress = techAppointments.filter(a => a.status === "IN_PROGRESS").length;
    const done = techAppointments.filter(a => a.status === "DONE").length;
    const booked = techAppointments.filter(a => a.status === "BOOKED").length;
    const today = techAppointments.filter(a =>
      a.slots?.some(s => s.slotDate === dayjs().format("YYYY-MM-DD"))
    ).length;

    return { total, booked, inProgress, done, today };
  }, [appointments, currentUserId]);

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
    const canUpdate = apt.technicianId === currentUserId || apt.id === currentUserId;
    
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
                <Tooltip title="Cập nhật trạng thái">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<UpdateIcon />}
                    onClick={() => {
                      // Set initial status to current status if it's IN_PROGRESS or DONE, otherwise default to IN_PROGRESS
                      const initialStatus = (apt.status === "IN_PROGRESS" || apt.status === "DONE") 
                        ? apt.status 
                        : "IN_PROGRESS";
                      setStatusDialog({ open: true, appointment: apt, newStatus: initialStatus });
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Cập nhật trạng thái
                  </Button>
                </Tooltip>
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
                <AssignmentIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2">
                  <strong>Yêu cầu bảo hành:</strong> {apt.claimName || apt.claimDescription || "N/A"}
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
          onClick={loadAppointments}
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
                <TableCell><strong>Yêu cầu bảo hành</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell><strong>Kỹ năng</strong></TableCell>
                <TableCell><strong>Ngày</strong></TableCell>
                <TableCell><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAppointments.map(apt => {
                const canUpdate = apt.technicianId === currentUserId || apt.id === currentUserId;
                return (
                  <TableRow key={apt.id} hover>
                    <TableCell>{apt.technicianName || "N/A"}</TableCell>
                    <TableCell>{apt.claimName || apt.claimDescription || "N/A"}</TableCell>
                    <TableCell>
                      <Chip label={apt.status} color={getStatusColor(apt.status)} size="small" />
                    </TableCell>
                    <TableCell>{apt.requiredSkill || "N/A"}</TableCell>
                    <TableCell>
                      {apt.slots?.[0]?.slotDate || "N/A"}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setDetailDialog({ open: true, appointment: apt })}
                      >
                        <InfoIcon />
                      </IconButton>
                      {canUpdate && (
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
                      )}
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
        PaperProps={{ sx: { bgcolor: 'transparent' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'transparent' }}>
          Chi tiết lịch hẹn
          <IconButton onClick={() => setDetailDialog({ open: false, appointment: null })}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'transparent' }}>
          {detailDialog.appointment && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Yêu cầu bảo hành:</strong> {detailDialog.appointment.claimName || detailDialog.appointment.claimDescription || "N/A"}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Trung tâm:</strong> {detailDialog.appointment.centerName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Kỹ thuật viên:</strong> {detailDialog.appointment.technicianName}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Trạng thái:</strong>{" "}
                  <Chip
                    label={detailDialog.appointment.status}
                    color={getStatusColor(detailDialog.appointment.status)}
                    size="small"
                  />
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Kỹ năng:</strong> {detailDialog.appointment.requiredSkill}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Loại:</strong> {detailDialog.appointment.type}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Tạo lúc:</strong> {formatDateTime(detailDialog.appointment.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>Thời gian làm việc</Typography>
                {detailDialog.appointment.slots?.map((slot, idx) => (
                  <Paper key={idx} sx={{ p: 2, mb: 1, bgcolor: 'transparent', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">
                      <strong>Ngày:</strong> {slot.slotDate}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Giờ:</strong> {slot.startTime} - {slot.endTime}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Trạng thái:</strong>{" "}
                      <Chip label={slot.status} size="small" />
                    </Typography>
                    {slot.note && (
                      <Typography variant="body2">
                        <strong>Ghi chú:</strong> {slot.note}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Grid>
              {detailDialog.appointment.note && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'transparent', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">
                      <strong>Ghi chú chung:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {detailDialog.appointment.note}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'transparent' }}>
          <Button onClick={() => setDetailDialog({ open: false, appointment: null })}>
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