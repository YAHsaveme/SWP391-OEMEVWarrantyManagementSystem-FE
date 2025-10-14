import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Stack,
  Paper,
  Avatar,
  Chip,
  Button,
  Divider,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import StarIcon from "@mui/icons-material/Star";
import technicianService from "../../services/technicianService"; // 🧩 API thật

const StatCard = ({ icon, label, value }) => (
  <Card elevation={3}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: (t) => t.palette.action.hover,
            display: "inline-flex",
          }}
        >
          {icon}
        </Paper>
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

export default function TechniciansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [slots, setSlots] = useState([]); // 🧩 danh sách slot trống
  const [booking, setBooking] = useState({
    centerId: "",
    workDate: "",
    startTime: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [snack, setSnack] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const handleCloseSnack = () =>
    setSnack((prev) => ({ ...prev, open: false }));

  // Lấy danh sách kỹ thuật viên
  useEffect(() => {
  const fetchTechs = async () => {
  try {
    const techs = await technicianService.getAll(0, 50);
    // map để đảm bảo có các trường dùng trong totals
    const mapped = techs.map((t) => ({
      id: t.id,
      name: t.fullName,
      email: t.email,
      phone: t.phone,
      rating: t.rating || 0, // nếu API chưa có rating thì mặc định 0
      specialization: t.specialization || [],
      activeCases: t.activeCases || 0,
      completedCases: t.completedCases || 0,
      avgCompletionTime: t.avgCompletionTime || "-",
    }));
    setTechnicians(mapped);
  } catch (error) {
    console.error("❌ Load technicians failed:", error);
    setSnack({
      open: true,
      severity: "error",
      message: "Không thể tải danh sách kỹ thuật viên.",
    });
  }
};
  fetchTechs();
}, []);

  // 🧠 Khi chọn Work Date → load slot trống từ API
  useEffect(() => {
    const fetchSlots = async () => {
  if (!selectedTech?.id || !booking.workDate) return;
  try {
    setLoadingSlots(true);
    const data = await technicianService.getTechnicianSlots(
      selectedTech.id,
      booking.workDate,
      booking.workDate
    );
    // API trả về .slots trực tiếp hoặc .days[0].slots
    const freeSlots = data.slots?.filter((s) => s.status === "FREE") || [];
    setSlots(freeSlots);
  } catch (err) {
    console.error("❌ Load slots failed:", err);
    setSlots([]);
  } finally {
    setLoadingSlots(false);
  }
};
    fetchSlots();
  }, [selectedTech, booking.workDate]);

  // 🧠 Đặt lịch
  const handleBook = async () => {
  if (!selectedTech) return;
  try {
    setLoading(true);

    const payload = {
      centerId: booking.centerId,
      workDate: booking.workDate,
      startTime: booking.startTime,
      note: booking.note,
    };

    await technicianService.bookSchedule(selectedTech.id, payload);

    setSnack({
      open: true,
      severity: "success",
      message: `Đặt lịch thành công cho ${booking.workDate}!`,
    });
    setOpenDialog(false);
  } catch (err) {
    console.error("❌ Booking failed:", err);
    setSnack({
      open: true,
      severity: "error",
      message:
        err.message || err.response?.data?.message || "Không thể đặt lịch làm việc.",
    });
  } finally {
    setLoading(false);
  }
};

  const totals = useMemo(() => {
  const sum = (k) => technicians.reduce((acc, t) => acc + (t[k] || 0), 0);
  const avgRating =
    technicians.length > 0
      ? (
          technicians.reduce((acc, t) => acc + (t.rating || 0), 0) /
          technicians.length
        ).toFixed(1)
      : "0.0";
  return {
    count: technicians.length,
    active: sum("activeCases"),
    completed: sum("completedCases"),
    avgRating,
  };
}, [technicians]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.specialization?.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery, technicians]);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header */}
      <Box mb={2}>
        <Typography variant="h4" fontWeight={800}>
          Technician Management
        </Typography>
        <Typography color="text.secondary">
          Manage technicians and track performance
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<GroupsIcon />}
            label="Total Technicians"
            value={totals.count}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PendingActionsIcon />}
            label="Active Cases"
            value={totals.active}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AssignmentTurnedInIcon />}
            label="Completed Cases"
            value={totals.completed}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<StarIcon />}
            label="Avg Rating"
            value={totals.avgRating}
          />
        </Grid>
      </Grid>

      {/* Search */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            placeholder="Search technicians by name or specialization..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Grid */}
      <Grid container spacing={3}>
        {filtered.map((tech) => (
          <Grid item key={tech.id} xs={12} sm={6} md={4}>
            <Card
              elevation={3}
              sx={{
                height: "100%",
                transition: "box-shadow .2s",
                "&:hover": { boxShadow: 8 },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        fontWeight: 700,
                        bgcolor: "primary.main",
                      }}
                    >
                      {initials(tech.fullName)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {tech.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tech.id}
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ mt: 0.5 }}
                      >
                        <Rating
                          name="read-only"
                          size="small"
                          precision={0.1}
                          value={tech.rating}
                          readOnly
                          emptyIcon={
                            <StarIcon
                              style={{ opacity: 0.3 }}
                              fontSize="inherit"
                            />
                          }
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {tech.rating}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Box>
                    <ContactRow icon="mail" value={tech.email} />
                    <ContactRow icon="phone" value={tech.phone} />
                  </Box>

                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                      Specialization
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {tech.specialization?.map((s) => (
                        <Chip key={s} label={s} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Active
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ color: "#b45309" }}
                      >
                        {tech.activeCases || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ color: "#15803d" }}
                      >
                        {tech.completedCases || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Time
                      </Typography>
                      <Typography variant="h6" fontWeight={800}>
                        {tech.avgCompletionTime || "-"}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" fullWidth>
                      View Details
                    </Button>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => {
                        setSelectedTech(tech);
                        setOpenDialog(true);
                        setBooking({
                          centerId: "",
                          workDate: "",
                          startTime: "",
                          note: "",
                        });
                        setSlots([]);
                      }}
                    >
                      Assign Case
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Assign Case to {selectedTech?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Center ID"
              value={booking.centerId}
              onChange={(e) =>
                setBooking({ ...booking, centerId: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Work Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={booking.workDate}
              onChange={(e) =>
                setBooking({ ...booking, workDate: e.target.value })
              }
              fullWidth
            />

            {/* Dropdown chọn slot để book */}
            <TextField
              select
              label="Start Time"
              fullWidth
              value={booking.startTime}
              onChange={(e) => setBooking({ ...booking, startTime: e.target.value })}
            >
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = i.toString().padStart(2, "0");
                return <MenuItem key={hour} value={`${hour}:00`}>{hour}:00</MenuItem>;
              })}
            </TextField>
            
            {/* Note */}
            <TextField
              label="Note"
              multiline
              minRows={2}
              value={booking.note}
              onChange={(e) => setBooking({ ...booking, note: e.target.value })}
              fullWidth
            />

            {/* Hiển thị tất cả slot để SC_STAFF xem trạng thái */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Slots status
        </Typography>
        {loadingSlots ? (
          <Typography variant="body2">Loading slots...</Typography>
        ) : slots.length === 0 ? (
          <Typography variant="body2">No slots available for this date.</Typography>
        ) : (
          slots.map((slot) => (
            <Box
              key={slot.id}
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography variant="body2">
                {slot.startTime} - {slot.endTime}
              </Typography>
              <Chip
                label={slot.status}
                size="small"
                color={slot.status === "FREE" ? "success" : "default"}
              />
            </Box>
          ))
        )}
      </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBook}
            disabled={loading}
            startIcon={loading && <CircularProgress size={18} />}
          >
            {loading ? "Assigning..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

/* Helpers */
function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function ContactRow({ icon, value }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ color: "text.secondary" }}
    >
      {icon === "mail" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"
          />
        </svg>
      )}
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
