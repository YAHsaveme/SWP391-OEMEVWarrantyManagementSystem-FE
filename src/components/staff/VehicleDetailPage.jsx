import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
    Container, Box, Grid, Card, CardContent, Typography, Stack, TextField,
    InputAdornment, Button, Divider, Alert, Table, TableHead, TableRow,
    TableCell, TableBody,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";

/* ================== API BASE ================== */
const API_BASE = "http://localhost:8080";

/* ================== AXIOS INSTANCE ================== */
const api = axios.create({ baseURL: API_BASE, withCredentials: true });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers.Accept = "application/json";
    return config;
});

/* ================== HELPERS ================== */
const Mono = ({ children }) => <Box component="span" sx={{ fontFamily: "monospace" }}>{children}</Box>;

function toDateSafe(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}
function fmtDate(v) {
    const d = toDateSafe(v);
    return d ? d.toLocaleString("vi-VN") : "—";
}
function fmtPct(v) { return v != null ? `${v}%` : "—"; }
function fmtMoney(v) {
    return v != null
        ? Number(v).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })
        : "—";
}
function Row({ label, value }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="baseline">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 180 }}>{label}</Typography>
            <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Stack>
    );
}
function StatCard({ icon, label, value }) {
    return (
        <Card elevation={3}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: (t) => t.palette.action.hover, display: "inline-flex" }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="h5" fontWeight={800}>{value}</Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

/* ================== MAIN ================== */
export default function WarrantyVehiclesPage() {
    const [vehicles, setVehicles] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [query, setQuery] = useState("");
    const [warranty, setWarranty] = useState(null); // object đã chọn (mới nhất)
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch all vehicles
    useEffect(() => {
        api.get("/api/vehicles/get-all")
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setVehicles(list);
                setFiltered(list);
            })
            .catch((err) => setError(err?.response?.data?.message || err.message));
    }, []);

    // Filter by VIN, model, modelCode
    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (!q) return setFiltered(vehicles);
        setFiltered(
            vehicles.filter(
                (v) =>
                    v.vin?.toLowerCase().includes(q) ||
                    v.model?.toLowerCase().includes(q) ||
                    v.modelCode?.toLowerCase().includes(q)
            )
        );
    }, [query, vehicles]);

    // Pick newest warranty from an array
    function pickNewest(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => {
            const ad = toDateSafe(a.createAt) || toDateSafe(a.startDate) || new Date(0);
            const bd = toDateSafe(b.createAt) || toDateSafe(b.startDate) || new Date(0);
            return bd - ad; // desc
        });
        return sorted[0];
    }

    // Fetch warranty by VIN (supports array or object or wrapper)
    async function fetchWarranty(vin) {
        setWarranty(null);
        setError("");
        setLoading(true);
        try {
            const res = await api.get(`/api/vehicle-warranties/${encodeURIComponent(vin)}/get`, {
                headers: { Accept: "application/json" },
                validateStatus: () => true,
            });

            if (res.status >= 400) {
                throw new Error(res.data?.message || `HTTP ${res.status}`);
            }

            const raw = res.data;
            // unwrap wrapper: {warranty} | {data} | object | array
            let payload = raw?.warranty ?? raw?.data ?? raw;

            // nếu backend trả cả list các phiên bản -> chọn bản mới nhất
            if (Array.isArray(payload)) {
                payload = pickNewest(payload);
            }

            if (!payload || typeof payload !== "object") {
                throw new Error("Không nhận được dữ liệu bảo hành hợp lệ.");
            }

            // normalize tên field
            const normalized = {
                ...payload,
                expiresDate: payload.expiresDate ?? payload.expireDate ?? null,
                exclusions: Array.isArray(payload.exclusions) ? payload.exclusions : [],
                goodwill: payload.goodwill && typeof payload.goodwill === "object" ? payload.goodwill : null,
            };

            setWarranty(normalized);
        } catch (err) {
            console.error("fetchWarranty error:", err);
            setError(err?.message || "Lỗi không xác định khi tải bảo hành.");
        } finally {
            setLoading(false);
        }
    }

    const totals = useMemo(() => ({ count: vehicles.length }), [vehicles]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Warranty Vehicles</Typography>
                    <Typography color="text.secondary">Danh sách xe & tra cứu bảo hành</Typography>
                </Box>
            </Stack>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<DescriptionIcon />} label="Total Vehicles" value={totals.count} />
                </Grid>
            </Grid>

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by VIN or model..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Table Vehicles */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>VIN</TableCell>
                                <TableCell>Model</TableCell>
                                <TableCell>Model Code</TableCell>
                                <TableCell>Production Date</TableCell>
                                <TableCell>In Service Date</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((v) => (
                                <TableRow key={v.vin} hover>
                                    <TableCell><Mono>{v.vin}</Mono></TableCell>
                                    <TableCell>{v.model}</TableCell>
                                    <TableCell>{v.modelCode}</TableCell>
                                    <TableCell>{fmtDate(v.productionDate)}</TableCell>
                                    <TableCell>{fmtDate(v.inServiceDate)}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined" onClick={() => fetchWarranty((v.vin || "").trim().toUpperCase())}>
                                            View Warranty
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Alert severity="info" sx={{ mb: 2 }}>Đang tải thông tin bảo hành…</Alert>}

            {/* Warranty Detail */}
            {warranty && typeof warranty === "object" && (
                <Card elevation={3}>
                    <CardContent>
                        <Typography variant="h6" fontWeight={700}>
                            Warranty Info for VIN: <Mono>{warranty.vin || "—"}</Mono>
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={1}>
                            <Row label="Warranty ID" value={<Mono>{warranty.id || "—"}</Mono>} />
                            <Row label="Policy ID" value={<Mono>{warranty.policyId || "—"}</Mono>} />
                            <Row label="Policy Version No" value={warranty.policyVersionNo ?? "—"} />
                            <Row label="Start Date" value={fmtDate(warranty.startDate)} />
                            <Row label="Expire Date" value={fmtDate(warranty.expiresDate)} />
                            <Row label="Expire Odometer" value={warranty.expiresOdometer != null ? `${Number(warranty.expiresOdometer).toLocaleString("vi-VN")} km` : "—"} />
                            <Row label="Battery SOH Threshold" value={fmtPct(warranty.batterySohThreshold)} />
                            <Row label="Labor Coverage" value={fmtPct(warranty.laborCoveragePct)} />
                            <Row label="Parts Coverage" value={fmtPct(warranty.partsCoveragePct)} />
                            <Row label="Per Claim Cap (VND)" value={fmtMoney(warranty.perClaimCapVND)} />
                            {warranty.goodwill && (
                                <>
                                    <Row label="Grace Months" value={warranty.goodwill.graceMonths ?? "—"} />
                                    <Row label="Grace Km" value={warranty.goodwill.graceKm != null ? Number(warranty.goodwill.graceKm).toLocaleString("vi-VN") : "—"} />
                                    <Row label="Tiers %" value={fmtPct(warranty.goodwill.tiersPct)} />
                                </>
                            )}
                            <Row label="Exclusions" value={Array.isArray(warranty.exclusions) && warranty.exclusions.length ? warranty.exclusions.join(", ") : "—"} />
                            <Row label="Created At" value={fmtDate(warranty.createAt)} />
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
}
