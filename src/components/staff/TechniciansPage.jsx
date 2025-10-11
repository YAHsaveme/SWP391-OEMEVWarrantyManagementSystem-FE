import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import StarIcon from "@mui/icons-material/Star";

const mockTechnicians = [
    {
        id: "TECH-001",
        name: "John Doe",
        email: "john.doe@service.com",
        phone: "+1 234 567 8900",
        specialization: ["Battery Systems", "Motor Controllers"],
        activeCases: 5,
        completedCases: 142,
        avgCompletionTime: "2.3 days",
        rating: 4.8,
    },
    {
        id: "TECH-002",
        name: "Jane Smith",
        email: "jane.smith@service.com",
        phone: "+1 234 567 8901",
        specialization: ["Charging Systems", "Electronics"],
        activeCases: 3,
        completedCases: 98,
        avgCompletionTime: "1.9 days",
        rating: 4.9,
    },
    {
        id: "TECH-003",
        name: "Mike Johnson",
        email: "mike.johnson@service.com",
        phone: "+1 234 567 8902",
        specialization: ["Diagnostics", "Software Updates"],
        activeCases: 7,
        completedCases: 215,
        avgCompletionTime: "1.5 days",
        rating: 4.7,
    },
];

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
    const technicians = mockTechnicians;

    const totals = useMemo(() => {
        const sum = (k) => technicians.reduce((acc, t) => acc + (t[k] || 0), 0);
        const avgRating =
            technicians.length > 0
                ? (technicians.reduce((acc, t) => acc + (t.rating || 0), 0) / technicians.length).toFixed(1)
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
                t.name.toLowerCase().includes(q) ||
                t.specialization.some((s) => s.toLowerCase().includes(q))
        );
    }, [searchQuery, technicians]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight={800}>
                    Technician Management
                </Typography>
                <Typography color="text.secondary">Manage technicians and track performance</Typography>
            </Box>

            {/* Stats */}
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

            {/* Technicians Grid */}
            <Grid container spacing={3}>
                {filtered.map((tech) => (
                    <Grid item key={tech.id} xs={12} sm={6} md={4}>
                        <Card elevation={3} sx={{ height: "100%", transition: "box-shadow .2s", "&:hover": { boxShadow: 8 } }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    {/* Header */}
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Avatar sx={{ width: 56, height: 56, fontWeight: 700, bgcolor: "primary.main" }}>
                                            {initials(tech.name)}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="subtitle1" fontWeight={700} noWrap>
                                                {tech.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {tech.id}
                                            </Typography>

                                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                                <Rating
                                                    name="read-only"
                                                    size="small"
                                                    precision={0.1}
                                                    value={tech.rating}
                                                    readOnly
                                                    emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
                                                />
                                                <Typography variant="body2" fontWeight={600}>{tech.rating}</Typography>
                                            </Stack>
                                        </Box>
                                    </Stack>

                                    {/* Contact */}
                                    <Box>
                                        <ContactRow icon="mail" value={tech.email} />
                                        <ContactRow icon="phone" value={tech.phone} />
                                    </Box>

                                    {/* Specialization */}
                                    <Box>
                                        <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                                            Specialization
                                        </Typography>
                                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                            {tech.specialization.map((s) => (
                                                <Chip key={s} label={s} size="small" variant="outlined" />
                                            ))}
                                        </Stack>
                                    </Box>

                                    <Divider />

                                    {/* Stats */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                Active
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: "#b45309" }}>
                                                {tech.activeCases}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                Completed
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} sx={{ color: "#15803d" }}>
                                                {tech.completedCases}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                Avg Time
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800}>{tech.avgCompletionTime}</Typography>
                                        </Grid>
                                    </Grid>

                                    {/* Actions */}
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" fullWidth>
                                            View Details
                                        </Button>
                                        <Button variant="contained" fullWidth>
                                            Assign Case
                                        </Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

/* ------- helpers ------- */
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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
            {/* simple inline icons */}
            {icon === "mail" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                </svg>
            )}
            <Typography variant="body2">{value}</Typography>
        </Stack>
    );
}
