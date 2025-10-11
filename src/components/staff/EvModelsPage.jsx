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
    Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import SpeedIcon from "@mui/icons-material/Speed";
import BoltIcon from "@mui/icons-material/Bolt";

const mockModels = [
    {
        modelCode: "MODEL-S-2024",
        modelName: "Model S",
        manufacturer: "Tesla",
        year: 2024,
        batteryCapacity: "100 kWh",
        range: "405 miles",
        chargingSpeed: "250 kW",
    },
    {
        modelCode: "MODEL-3-2024",
        modelName: "Model 3",
        manufacturer: "Tesla",
        year: 2024,
        batteryCapacity: "82 kWh",
        range: "358 miles",
        chargingSpeed: "250 kW",
    },
    {
        modelCode: "IONIQ-5-2024",
        modelName: "IONIQ 5",
        manufacturer: "Hyundai",
        year: 2024,
        batteryCapacity: "77.4 kWh",
        range: "303 miles",
        chargingSpeed: "350 kW",
    },
];

export default function EvModelsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return mockModels;
        return mockModels.filter(
            (m) =>
                m.modelName.toLowerCase().includes(q) ||
                m.manufacturer.toLowerCase().includes(q) ||
                m.modelCode.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight={800}>
                    EV Models
                </Typography>
                <Typography color="text.secondary">Browse available electric vehicle models</Typography>
            </Box>

            {/* Search */}
            <Card elevation={3} sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search by model name, manufacturer, or code..."
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

            {/* Models Grid */}
            <Grid container spacing={3}>
                {filtered.map((model) => (
                    <Grid key={model.modelCode} item xs={12} sm={6} md={4}>
                        <Card elevation={3} sx={{ height: "100%", transition: "box-shadow .2s", "&:hover": { boxShadow: 8 } }}>
                            <CardContent>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            {model.modelName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {model.manufacturer} • {model.year}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block", mt: 0.5 }}>
                                            {model.modelCode}
                                        </Typography>
                                    </Box>

                                    <Stack spacing={1.5} sx={{ pt: 1.5 }}>
                                        <SpecRow
                                            icon={<BatteryChargingFullIcon />}
                                            label="Battery"
                                            value={model.batteryCapacity}
                                        />
                                        <SpecRow
                                            icon={<SpeedIcon />}
                                            label="Range"
                                            value={model.range}
                                        />
                                        <SpecRow
                                            icon={<BoltIcon />}
                                            label="Charging"
                                            value={model.chargingSpeed}
                                        />
                                    </Stack>

                                    <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
                                        View Details
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}

/** Small spec row with soft icon background */
function SpecRow({ icon, label, value }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="center">
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: (t) => t.palette.action.hover,
                    display: "inline-flex",
                }}
            >
                {icon}
            </Paper>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="body2" fontWeight={600} noWrap>
                    {value}
                </Typography>
            </Box>
        </Stack>
    );
}
