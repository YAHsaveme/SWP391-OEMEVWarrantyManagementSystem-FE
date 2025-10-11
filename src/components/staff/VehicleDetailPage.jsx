import React from "react";
import {
    Container,
    Box,
    Stack,
    Typography,
    Chip,
    Card,
    CardContent,
    Grid,
    Button,
    Divider,
    IconButton,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import TagIcon from "@mui/icons-material/Tag";
import NumbersIcon from "@mui/icons-material/Numbers";
import EvStationIcon from "@mui/icons-material/EvStation";
import SpeedIcon from "@mui/icons-material/Speed";

/** Mock data – thay bằng data thật từ API theo VIN */
const mockVehicle = {
    vin: "1HGBH41JXMN109186",
    modelCode: "MODEL-S-2024",
    modelName: "Model S",
    manufacturer: "Tesla",
    licensePlate: "ABC-1234",
    color: "Midnight Silver",
    year: 2024,
    status: "Active",
    registeredDate: "2024-01-15",
    lastService: "2024-09-20",
    batteryCapacity: "100 kWh",
    range: "405 miles",
};

export default function VehicleDetailPage({ vin }) {
    // trong thực tế: fetch by vin, ví dụ useEffect(() => get(`/api/vehicles/${vin}`), [vin])
    const vehicle = { ...mockVehicle, vin: vin || mockVehicle.vin };

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton component={RouterLink} to="/vehicles" color="inherit">
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h4" fontWeight={800}>
                            {vehicle.modelName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            {vehicle.vin}
                        </Typography>
                    </Box>
                </Stack>

                <Button variant="contained" startIcon={<EditIcon />}>
                    Edit Vehicle
                </Button>
            </Stack>

            {/* Status */}
            <Box sx={{ mb: 3 }}>
                <Chip
                    label={vehicle.status}
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 600, borderRadius: 999 }}
                />
            </Box>

            {/* Details Grid */}
            <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                Basic Information
                            </Typography>

                            <Stack spacing={2.25}>
                                <InfoRow icon={<NumbersIcon />} label="VIN" value={vehicle.vin} mono />
                                <InfoRow icon={<TagIcon />} label="License Plate" value={vehicle.licensePlate} />
                                <InfoRow icon={<ColorLensIcon />} label="Color" value={vehicle.color} />
                                <InfoRow icon={<CalendarMonthIcon />} label="Year" value={vehicle.year} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Model Information */}
                <Grid item xs={12} md={6}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                Model Information
                            </Typography>

                            <Stack spacing={2}>
                                <TextRow label="Model Name" value={vehicle.modelName} />
                                <TextRow label="Model Code" value={vehicle.modelCode} mono />
                                <TextRow label="Manufacturer" value={vehicle.manufacturer} />
                                <InfoRow icon={<EvStationIcon />} label="Battery Capacity" value={vehicle.batteryCapacity} />
                                <InfoRow icon={<SpeedIcon />} label="Range" value={vehicle.range} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Service History */}
                <Grid item xs={12}>
                    <Card elevation={3}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                Service History
                            </Typography>

                            <Stack divider={<Divider />} spacing={2}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Registered Date
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600}>
                                            {vehicle.registeredDate}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Last Service
                                        </Typography>
                                        <Typography variant="body1" fontWeight={600}>
                                            {vehicle.lastService}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

/* ---------- small presentational helpers ---------- */
function InfoRow({ icon, label, value, mono = false }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
                sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: (t) => t.palette.action.hover,
                    display: "inline-flex",
                }}
            >
                {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
                <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{ ...(mono ? { fontFamily: "monospace" } : {}), wordBreak: "break-word" }}
                >
                    {value}
                </Typography>
            </Box>
        </Stack>
    );
}

function TextRow({ label, value, mono = false }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography
                variant="body1"
                fontWeight={600}
                sx={{ ...(mono ? { fontFamily: "monospace" } : {}) }}
            >
                {value}
            </Typography>
        </Box>
    );
}
