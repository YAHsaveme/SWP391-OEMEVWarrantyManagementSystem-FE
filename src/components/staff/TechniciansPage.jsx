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
  IconButton,
  Menu,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import StarIcon from "@mui/icons-material/Star";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import technicianService from "../../services/technicianService";

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
  const [selectedTech, setSelectedTech] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState({ centerId: "", workDate: "", startTime: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTech, setMenuTech] = useState(null);

  const [actionDialog, setActionDialog] = useState({ open: false, type: "", payload: {} });
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const handleCloseSnack = () => setSnack((s) => ({ ...s, open: false }));

  // ================= LOAD TECHNICIANS =================
  const fetchTechnicians = async (page = 0, size = 50) => {
    try {
      const raw = await technicianService.getAll(page, size);
      const normalized = raw.map((t) => ({
        id: t.id,
        fullName: t.fullName || t.name || "",
        email: t.email || "",
        phone: t.phone || "",
        rating: typeof t.rating === "number" ? t.rating : Number(t.rating) || 0,
        specialization: Array.isArray(t.specialization)
          ? t.specialization
          : t.specialization
          ? [t.specialization]
          : [],
        activeCases: t.activeCases ?? 0,
        completedCases: t.completedCases ?? 0,
        avgCompletionTime: t.avgCompletionTime || "-",
        __raw: t,
      }));
      setTechnicians(normalized);
    } catch (err) {
      console.error("Load technicians failed", err);
      setSnack({
        open: true,
        severity: "error",
        message: "Không thể tải danh sách kỹ thuật viên.",
      });
    }
  };
  useEffect(() => {
    fetchTechnicians();
  }, []);

  // ================= LOAD SLOTS =================
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedTech?.id || !booking.workDate) {
        setSlots([]);
        return;
      }
      try {
        setLoadingSlots(true);
        const data = await technicianService.getTechnicianSlots(
          selectedTech.id,
          booking.workDate,
          booking.workDate
        );

        let parsedSlots = [];
        if (!data) parsedSlots = [];
        else if (Array.isArray(data.slots)) parsedSlots = data.slots;
        else if (Array.isArray(data.days)) {
          const d = data.days.find((x) => x.workDate === booking.workDate) || data.days[0] || null;
          parsedSlots = d?.slots || [];
        } else if (Array.isArray(data)) parsedSlots = data;
        else parsedSlots = data.slots || [];

        parsedSlots = parsedSlots.map((s, idx) =>
          typeof s === "string"
            ? {
                id: `${booking.workDate}-${s}-${idx}`,
                startTime: s.includes("-") ? s.split("-")[0] : s,
                endTime: s.includes("-") ? s.split("-")[1] : "",
                status: "UNKNOWN",
              }
            : {
                id: s.id ?? `${booking.workDate}-${s.startTime ?? idx}`,
                startTime: s.startTime ?? s.start ?? "",
                endTime: s.endTime ?? s.end ?? "",
                status: s.status ?? "UNKNOWN",
              }
        );
        setSlots(parsedSlots);
      } catch (err) {
        console.error("Load slots failed", err);
        setSnack({ open: true, severity: "error", message: "Không thể tải slot cho ngày này." });
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedTech, booking.workDate]);

  // ================= ASSIGN CASE =================
const handleBook = async () => {
  if (!selectedTech)
    return setSnack({ open: true, severity: "warning", message: "Chưa chọn kỹ thuật viên." });

  if (!booking.centerId?.trim())
    return setSnack({
      open: true,
      severity: "warning",
      message: "Vui lòng nhập Center ID.",
    });

  if (!booking.workDate) {
    return setSnack({
      open: true,
      severity: "warning",
      message: "Vui lòng chọn ngày làm việc (Work Date).",
    });
  }

  // kiểm tra định dạng ngày
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(booking.workDate);
  if (!dateValid) {
    return setSnack({
      open: true,
      severity: "error",
      message: "Ngày làm việc không hợp lệ. Định dạng phải là YYYY-MM-DD.",
    });
  }

  // kiểm tra startTime khớp slot
  const validSlot = slots.find((s) => s.startTime === booking.startTime);
  if (!validSlot) {
    return setSnack({
      open: true,
      severity: "warning",
      message: "Vui lòng chọn Start Time hợp lệ.",
    });
  }

  try {
    setLoading(true);
    await technicianService.bookSchedule(selectedTech.id, {
      centerId: booking.centerId.trim(),
      workDate: booking.workDate,
      startTime: booking.startTime,
      note: booking.note?.trim() || "",
    });
    setSnack({ open: true, severity: "success", message: "Đặt lịch thành công." });
    setOpenAssignDialog(false);
    fetchTechnicians();
  } catch (err) {
    console.error("Booking failed", err);
    setSnack({
      open: true,
      severity: "error",
      message: err?.response?.data?.message || "Không thể đặt lịch.",
    });
  } finally {
    setLoading(false);
  }
};

  // ================= MENU + ACTION DIALOG =================
  const openMenu = (e, tech) => {
    setAnchorEl(e.currentTarget);
    setMenuTech(tech);
  };
  const closeMenu = () => {
    setAnchorEl(null);
    setMenuTech(null);
  };

  const openActionDialog = (type, tech) => {
    closeMenu();
    const today = new Date().toISOString().slice(0, 10);
    const defaultPayload = {
      cancel: { dateFrom: today, dateTo: today, slotTimes: [], note: "" },
      restore: { dateFrom: today, dateTo: today, slotTimes: [] },
      generateMonth: { centerId: "", targetMonth: new Date().toISOString().slice(0, 7) },
      createSunday: { centerId: "", date: today },
    }[type];
    setMenuTech(tech);
    setActionDialog({ open: true, type, payload: defaultPayload });
  };

  const closeActionDialog = () => setActionDialog({ open: false, type: "", payload: {} });

  const handleActionSubmit = async () => {
    if (!menuTech) return;
    const { type, payload } = actionDialog;
    const id = menuTech.id;

    try {
      setLoading(true);
      if (type === "cancel") await technicianService.cancelSchedule(id, payload);
      else if (type === "restore") await technicianService.restoreSchedule(id, payload);
      else if (type === "generateMonth") await technicianService.generateMonthSchedule(id, payload);
      else if (type === "createSunday") await technicianService.createSundaySchedule(id, payload);
      setSnack({ open: true, severity: "success", message: "Thao tác thành công." });
      closeActionDialog();
      fetchTechnicians();
    } catch (err) {
      console.error("Action failed", err);
      setSnack({
        open: true,
        severity: "error",
        message: err?.response?.data?.message || "Thao tác thất bại.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= STATS =================
  const totals = useMemo(() => {
    const sum = (key) => technicians.reduce((a, b) => a + (b[key] || 0), 0);
    const avgRating =
      technicians.length > 0
        ? (technicians.reduce((a, b) => a + (b.rating || 0), 0) / technicians.length).toFixed(1)
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
        t.fullName?.toLowerCase().includes(q) ||
        t.specialization?.some((s) => s.toLowerCase().includes(q))
    );
  }, [technicians, searchQuery]);

  // ================= RENDER =================
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box mb={2}>
        <Typography variant="h4" fontWeight={800}>
          Technician Management
        </Typography>
        <Typography color="text.secondary">Manage technicians and track performance</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<GroupsIcon />} label="Total Technicians" value={totals.count} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PendingActionsIcon />} label="Active Cases" value={totals.active} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AssignmentTurnedInIcon />} label="Completed Cases" value={totals.completed} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<StarIcon />} label="Avg Rating" value={totals.avgRating} />
        </Grid>
      </Grid>

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

      <Grid container spacing={3}>
        {filtered.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card elevation={3}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <Avatar sx={{ bgcolor: "primary.main" }}>{initials(t.fullName)}</Avatar>
                    <Box flex={1}>
                      <Typography fontWeight={700}>{t.fullName}</Typography>
                      <Typography variant="caption">{t.id}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Rating size="small" readOnly precision={0.1} value={t.rating} />
                        <Typography variant="body2">{t.rating}</Typography>
                      </Stack>
                    </Box>
                    <IconButton size="small" onClick={(e) => openMenu(e, t)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Stack>
                  <ContactRow icon="mail" value={t.email} />
                  <ContactRow icon="phone" value={t.phone} />
                  <Divider />
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {t.specialization.map((s) => (
                      <Chip key={s} label={s} size="small" />
                    ))}
                  </Stack>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption">Active</Typography>
                      <Typography fontWeight={800} color="#b45309">
                        {t.activeCases}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption">Completed</Typography>
                      <Typography fontWeight={800} color="#15803d">
                        {t.completedCases}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption">Avg Time</Typography>
                      <Typography fontWeight={800}>{t.avgCompletionTime}</Typography>
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
                        setSelectedTech(t);
                        setBooking({ centerId: "", workDate: "", startTime: "", note: "" });
                        setSlots([]);
                        setOpenAssignDialog(true);
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

      {/* MENU */}
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={closeMenu}>
        <MenuItem onClick={() => openActionDialog("cancel", menuTech)}>Cancel schedule</MenuItem>
        <MenuItem onClick={() => openActionDialog("restore", menuTech)}>Restore schedule</MenuItem>
        <MenuItem onClick={() => openActionDialog("generateMonth", menuTech)}>Generate month</MenuItem>
        <MenuItem onClick={() => openActionDialog("createSunday", menuTech)}>Create Sunday</MenuItem>
      </Menu>

      {/* DIALOGS */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} fullWidth>
        <DialogTitle>Assign Case to {selectedTech?.fullName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Center ID"
              fullWidth
              value={booking.centerId}
              onChange={(e) => setBooking({ ...booking, centerId: e.target.value })}
            />
            <TextField
              label="Work Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={booking.workDate}
              onChange={(e) => setBooking({ ...booking, workDate: e.target.value })}
            />
            <TextField
              select
              label="Start Time"
              fullWidth
              value={booking.startTime}
              onChange={(e) => setBooking({ ...booking, startTime: e.target.value })}
            >
              {slots.map((s) => (
                <MenuItem key={s.id} value={s.startTime}>
                  {s.startTime} {s.endTime && `- ${s.endTime}`} ({s.status})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              value={booking.note}
              onChange={(e) => setBooking({ ...booking, note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBook} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={actionDialog.open} onClose={closeActionDialog} fullWidth>
        <DialogTitle>
          {actionDialog.type === "cancel" && "Cancel schedule"}
          {actionDialog.type === "restore" && "Restore schedule"}
          {actionDialog.type === "generateMonth" && "Generate month schedule"}
          {actionDialog.type === "createSunday" && "Create Sunday schedule"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {["cancel", "restore"].includes(actionDialog.type) && (
              <>
                <TextField
                  label="Date From"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={actionDialog.payload.dateFrom || ""}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, dateFrom: e.target.value },
                    }))
                  }
                />
                <TextField
                  label="Date To"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={actionDialog.payload.dateTo || ""}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, dateTo: e.target.value },
                    }))
                  }
                />
                <TextField
                  label="Slot Times (comma separated)"
                  value={(actionDialog.payload.slotTimes || []).join(",")}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: {
                        ...s.payload,
                        slotTimes: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
                {actionDialog.type === "cancel" && (
                  <TextField
                    label="Note"
                    value={actionDialog.payload.note || ""}
                    onChange={(e) =>
                      setActionDialog((s) => ({
                        ...s,
                        payload: { ...s.payload, note: e.target.value },
                      }))
                    }
                  />
                )}
              </>
            )}
            {actionDialog.type === "generateMonth" && (
              <>
                <TextField
                  label="Center ID"
                  value={actionDialog.payload.centerId}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, centerId: e.target.value },
                    }))
                  }
                />
                <TextField
                  label="Target Month"
                  type="month"
                  InputLabelProps={{ shrink: true }}
                  value={actionDialog.payload.targetMonth || ""}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, targetMonth: e.target.value },
                    }))
                  }
                />
              </>
            )}
            {actionDialog.type === "createSunday" && (
              <>
                <TextField
                  label="Center ID"
                  value={actionDialog.payload.centerId}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, centerId: e.target.value },
                    }))
                  }
                />
                <TextField
                  label="Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={actionDialog.payload.date || ""}
                  onChange={(e) =>
                    setActionDialog((s) => ({
                      ...s,
                      payload: { ...s.payload, date: e.target.value },
                    }))
                  }
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleActionSubmit} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Container>
  );
}

const initials = (n) =>
  n
    ? n
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "?";

const ContactRow = ({ icon, value }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
      {icon === "mail" ? "📧" : "📞"}
    </Typography>
    <Typography variant="body2">{value || "-"}</Typography>
  </Stack>
);
