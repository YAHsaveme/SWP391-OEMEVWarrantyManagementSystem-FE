import React, { useMemo, useState } from "react";
import {
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Divider,
    Paper,
    List,
    ListItem,
    ListItemText,
    InputAdornment,
    LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CampaignIcon from "@mui/icons-material/Campaign";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const mockCampaigns = [
    {
        id: "RC-2025-001",
        title: "Battery Management System Update",
        type: "RECALL",
        description:
            "Software update required for battery management system to prevent overheating",
        affectedVehicles: 45,
        notified: 45,
        scheduled: 32,
        completed: 18,
        startDate: "2025-01-01",
    },
    {
        id: "SC-2025-002",
        title: "Annual Brake Inspection Campaign",
        type: "SERVICE",
        description:
            "Complimentary brake system inspection for all vehicles over 2 years old",
        affectedVehicles: 120,
        notified: 120,
        scheduled: 85,
        completed: 62,
        startDate: "2024-12-15",
        endDate: "2025-02-28",
    },
];

const StatCard = ({ icon, label, value }) => (
    <Card elevation={3}>
        <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
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

export default function CampaignsPage() {
    const [campaigns] = useState(mockCampaigns);
    const [searchQuery, setSearchQuery] = useState("");
    const [openId, setOpenId] = useState(null);

    const totals = useMemo(() => {
        const sum = (k) => campaigns.reduce((acc, c) => acc + (c[k] || 0), 0);
        return {
            count: campaigns.length,
            affected: sum("affectedVehicles"),
            scheduled: sum("scheduled"),
            completed: sum("completed"),
        };
    }, [campaigns]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return campaigns;
        return campaigns.filter(
            (c) =>
                c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
        );
    }, [campaigns, searchQuery]);

    const activeCampaign = useMemo(
        () => campaigns.find((c) => c.id === openId),
        [campaigns, openId]
    );

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight={800}>
                    Service Campaigns & Recalls
                </Typography>
                <Typography color="text.secondary">
                    Manage manufacturer campaigns and recalls
                </Typography>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<CampaignIcon />}
                        label="Active Campaigns"
                        value={totals.count}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<DirectionsCarIcon />}
                        label="Affected Vehicles"
                        value={totals.affected}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<ScheduleIcon />}
                        label="Scheduled"
                        value={totals.scheduled}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<CheckCircleIcon />}
                        label="Completed"
                        value={totals.completed}
                    />
                </Grid>
            </Grid>

            {/* Search */}
            <TextField
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ),
                }}
                sx={{ maxWidth: 420, mb: 2 }}
                fullWidth
            />

            {/* Campaigns List */}
            <Stack spacing={2}>
                {filtered.map((c) => {
                    const progress =
                        c.affectedVehicles > 0
                            ? Math.round((c.completed / c.affectedVehicles) * 100)
                            : 0;
                    const typeColor =
                        c.type === "RECALL" ? "error" : "default"; // destructive ↔ error

                    return (
                        <Card key={c.id} elevation={3}>
                            <CardContent>
                                <Stack spacing={2}>
                                    {/* Header row */}
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        alignItems={{ xs: "flex-start", sm: "flex-start" }}
                                        justifyContent="space-between"
                                        spacing={2}
                                    >
                                        <Box>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Typography variant="h6" fontWeight={700}>
                                                    {c.title}
                                                </Typography>
                                                <Chip
                                                    label={c.type}
                                                    color={typeColor}
                                                    variant={c.type === "RECALL" ? "filled" : "outlined"}
                                                    size="small"
                                                />
                                            </Stack>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mt: 0.5 }}
                                            >
                                                {c.id}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {c.description}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Button
                                                variant="contained"
                                                onClick={() => setOpenId(c.id)}
                                            >
                                                Manage Campaign
                                            </Button>
                                        </Box>
                                    </Stack>

                                    <Divider />

                                    {/* Numbers */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} sm={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Affected
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800}>
                                                {c.affectedVehicles}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Notified
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="primary">
                                                {c.notified}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Scheduled
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: "#b45309" }}>
                                                {c.scheduled}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Completed
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: "#15803d" }}>
                                                {c.completed}
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    {/* Progress */}
                                    <Box>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{ mb: 0.5 }}
                                        >
                                            <Typography variant="caption" color="text.secondary">
                                                Progress
                                            </Typography>
                                            <Typography variant="caption" fontWeight={700}>
                                                {progress}%
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={progress}
                                            sx={{
                                                height: 8,
                                                borderRadius: 999,
                                                "& .MuiLinearProgress-bar": { borderRadius: 999 },
                                            }}
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    );
                })}
            </Stack>

            {/* Manage Campaign Dialog */}
            <Dialog open={Boolean(openId)} onClose={() => setOpenId(null)} fullWidth maxWidth="md">
                {activeCampaign && (
                    <>
                        <DialogTitle>{activeCampaign.title}</DialogTitle>
                        <DialogContent dividers sx={{ pt: 2 }}>
                            <Stack spacing={3}>
                                {/* Meta */}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Campaign ID
                                        </Typography>
                                        <Typography fontFamily="monospace">
                                            {activeCampaign.id}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Type
                                        </Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={activeCampaign.type}
                                                color={activeCampaign.type === "RECALL" ? "error" : "default"}
                                                variant={activeCampaign.type === "RECALL" ? "filled" : "outlined"}
                                                size="small"
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>

                                {/* Affected vehicles list (mock) */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Affected Vehicles
                                    </Typography>
                                    <TextField
                                        placeholder="Search VIN..."
                                        fullWidth
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{ mb: 1.5 }}
                                    />
                                    <Paper variant="outlined" sx={{ maxHeight: 220, overflow: "auto" }}>
                                        <List dense disablePadding>
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <ListItem
                                                    key={i}
                                                    sx={{
                                                        px: 1.5,
                                                        py: 1,
                                                        "&:hover": { bgcolor: (t) => t.palette.action.hover },
                                                    }}
                                                    secondaryAction={<Chip label="Notified" size="small" variant="outlined" />}
                                                >
                                                    <ListItemText
                                                        primaryTypographyProps={{ fontFamily: "monospace", fontSize: 13 }}
                                                        primary={`1HGBH41JXMN10918${i}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Box>

                                {/* Send Notification */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Send Notification
                                    </Typography>
                                    <TextField
                                        placeholder="Notification message to customers..."
                                        fullWidth
                                        multiline
                                        minRows={4}
                                    />
                                    <Button variant="contained" sx={{ mt: 1.5 }}>
                                        Send to All Affected Customers
                                    </Button>
                                </Box>

                                {/* Schedule */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Schedule Appointments
                                    </Typography>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                        <TextField type="date" size="small" sx={{ maxWidth: 200 }} />
                                        <TextField type="time" size="small" sx={{ maxWidth: 160 }} />
                                        <Button variant="outlined">Schedule Next Available</Button>
                                    </Stack>
                                </Box>

                                {/* Progress report */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Report Progress
                                    </Typography>
                                    <TextField placeholder="Progress notes..." fullWidth multiline minRows={3} />
                                    <Button variant="contained" sx={{ mt: 1.5 }}>
                                        Submit Report to Manufacturer
                                    </Button>
                                </Box>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenId(null)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
}
