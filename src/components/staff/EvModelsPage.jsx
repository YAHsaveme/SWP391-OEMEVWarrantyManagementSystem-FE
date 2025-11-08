import React, { useMemo, useState, useEffect } from "react";
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
    CircularProgress,
    Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import SpeedIcon from "@mui/icons-material/Speed";
import BoltIcon from "@mui/icons-material/Bolt";
import evModelService from "../../services/evModelService";

export default function EvModelsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Load data từ API
    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await evModelService.getAll();
                // Normalize data từ API
                const normalized = Array.isArray(data) ? data.map(m => ({
                    modelCode: m.modelCode || "",
                    modelName: m.model || "",
                    manufacturer: m.manufacturer || "—",
                    year: m.year || new Date().getFullYear(),
                    batteryCapacity: m.battery_kWh ? `${m.battery_kWh} kWh` : "—",
                    range: m.range_km ? `${m.range_km} km` : "—",
                    chargingSpeed: m.motor_kW ? `${m.motor_kW} kW` : "—",
                    topSpeed: m.top_speed_kmh ? `${m.top_speed_kmh} km/h` : "—",
                    abs: m.abs || false,
                    vds: m.vds || "",
                })) : [];
                setModels(normalized);
            } catch (err) {
                console.error("Failed to load EV models:", err);
                setError(err?.response?.data?.message || err?.message || "Lỗi tải danh sách EV Models");
            } finally {
                setLoading(false);
            }
        };
        fetchModels();
    }, []);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return models;
        return models.filter(
            (m) =>
                m.modelName.toLowerCase().includes(q) ||
                m.manufacturer.toLowerCase().includes(q) ||
                m.modelCode.toLowerCase().includes(q)
        );
    }, [searchQuery, models]);

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

            {/* Error Message */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            )}

            {/* Models Grid */}
            {!loading && (
                <Grid container spacing={3}>
                    {filtered.length === 0 ? (
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography align="center" color="text.secondary">
                                        {error ? "Không thể tải dữ liệu" : "Không tìm thấy EV Model nào"}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ) : (
                        filtered.map((model) => (
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
                        ))
                    )}
                </Grid>
            )}
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
