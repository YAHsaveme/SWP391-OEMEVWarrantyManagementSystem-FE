import React, { useMemo, useState } from "react";
import {
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Stack,
    TextField,
    InputAdornment,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionIcon from "@mui/icons-material/Description";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";

const statusColor = {
    SUBMITTED: "info",
    PENDING: "warning",
    APPROVED: "success",
    COMPLETED: "default",
    REJECTED: "error",
};

/** ---- Mock data ---- */
const mockClaims = [
    {
        id: "WC-001",
        vin: "1HGBH41JXMN109186",
        vehicleModel: "Tesla Model 3",
        issueDescription: "Battery degradation beyond warranty threshold",
        status: "APPROVED",
        createdAt: "2025-01-05",
        assignedTo: "John Doe",
        parts: ["Battery Pack"],
    },
    {
        id: "WC-002",
        vin: "5YJ3E1EA1KF123456",
        vehicleModel: "BYD Atto 3",
        issueDescription: "Motor controller malfunction",
        status: "PENDING",
        createdAt: "2025-01-07",
    },
    {
        id: "WC-003",
        vin: "LSJW54EV8HS123456",
        vehicleModel: "VinFast VF8",
        issueDescription: "Charging port not working",
        status: "SUBMITTED",
        createdAt: "2025-01-08",
    },
];

/** ---- Stat Card ---- */
function StatCard({ icon, label, value }) {
    return (
        <Card elevation={3}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            p: 1.25,
                            borderRadius: 2,
                            bgcolor: (t) => t.palette.action.hover,
                            display: "inline-flex",
                        }}
                    >
                        {icon}
                    </Box>
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
}

export default function WarrantyClaimsPage() {
    const [claims, setClaims] = useState(mockClaims);
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [createOpen, setCreateOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [activeClaim, setActiveClaim] = useState(null);

    const totals = useMemo(() => {
        const count = claims.length;
        const pending = claims.filter((c) => c.status === "PENDING").length;
        const approved = claims.filter((c) => c.status === "APPROVED").length;
        const completed = claims.filter((c) => c.status === "COMPLETED").length;
        return { count, pending, approved, completed };
    }, [claims]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();
        return claims.filter((c) => {
            const matchedText =
                !text ||
                c.vin.toLowerCase().includes(text) ||
                c.vehicleModel.toLowerCase().includes(text) ||
                c.id.toLowerCase().includes(text);

            const matchedStatus = statusFilter === "all" || c.status === statusFilter;
            return matchedText && matchedStatus;
        });
    }, [claims, q, statusFilter]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Warranty Claims</Typography>
                    <Typography color="text.secondary">Manage and track warranty claims</Typography>
                </Box>
                <Button variant="contained" onClick={() => setCreateOpen(true)}>
                    Create Claim
                </Button>
            </Stack>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<DescriptionIcon />} label="Total Claims" value={totals.count} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<PendingActionsIcon />} label="Pending" value={totals.pending} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<CheckCircleIcon />} label="Approved" value={totals.approved} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<DoneAllIcon />} label="Completed" value={totals.completed} />
                </Grid>
            </Grid>

            {/* Search & Filter */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={8}>
                    <TextField
                        fullWidth
                        placeholder="Search by VIN, model, or claim ID..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                        <InputLabel id="status-label">Filter by status</InputLabel>
                        <Select
                            labelId="status-label"
                            label="Filter by status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="SUBMITTED">Submitted</MenuItem>
                            <MenuItem value="PENDING">Pending</MenuItem>
                            <MenuItem value="APPROVED">Approved</MenuItem>
                            <MenuItem value="COMPLETED">Completed</MenuItem>
                            <MenuItem value="REJECTED">Rejected</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {/* Claims List */}
            <Stack spacing={2}>
                {filtered.map((claim) => (
                    <Card key={claim.id} elevation={3} sx={{ "&:hover": { boxShadow: 8 } }}>
                        <CardContent>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                                <Box flex={1}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Typography variant="h6" fontWeight={700}>{claim.id}</Typography>
                                        <Chip
                                            size="small"
                                            label={claim.status}
                                            color={statusColor[claim.status]}
                                            variant={claim.status === "APPROVED" ? "filled" : "outlined"}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Stack>

                                    <Stack spacing={1} sx={{ mt: 1 }}>
                                        <Row label="VIN" value={<Mono>{claim.vin}</Mono>} />
                                        <Row label="Model" value={claim.vehicleModel} />
                                        <Row label="Issue" value={claim.issueDescription} />
                                        {claim.assignedTo && <Row label="Assigned to" value={claim.assignedTo} />}
                                        {Array.isArray(claim.parts) && claim.parts.length > 0 && (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                                                    Parts
                                                </Typography>
                                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                    {claim.parts.map((p) => (
                                                        <Chip key={p} label={p} size="small" variant="outlined" />
                                                    ))}
                                                </Stack>
                                            </Stack>
                                        )}
                                        <Row
                                            label="Created"
                                            value={new Date(claim.createdAt).toLocaleDateString()}
                                        />
                                    </Stack>
                                </Box>

                                <Stack direction="row" spacing={1} alignSelf={{ xs: "flex-start", sm: "center" }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setActiveClaim(claim);
                                            setViewOpen(true);
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}

                {filtered.length === 0 && (
                    <Card variant="outlined">
                        <CardContent sx={{ textAlign: "center", color: "text.secondary" }}>
                            No claims found.
                        </CardContent>
                    </Card>
                )}
            </Stack>

            {/* Create Claim Dialog */}
            <CreateClaimDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={(newClaim) => setClaims((prev) => [newClaim, ...prev])}
            />

            {/* View/Update Claim Dialog */}
            <ViewClaimDialog
                open={viewOpen}
                claim={activeClaim}
                onClose={() => setViewOpen(false)}
                onUpdate={(updated) =>
                    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                }
            />
        </Container>
    );
}

/* ---------- small helpers ---------- */
function Mono({ children }) {
    return <Box component="span" sx={{ fontFamily: "monospace" }}>{children}</Box>;
}

function Row({ label, value }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                {value}
            </Typography>
        </Stack>
    );
}

/* ---------- Create Claim Dialog ---------- */
function CreateClaimDialog({ open, onClose, onCreate }) {
    const [vin, setVin] = useState("");
    const [issue, setIssue] = useState("");
    const [diagnostic, setDiagnostic] = useState("");
    const [status, setStatus] = useState("SUBMITTED");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!vin || !issue) return;
        const newClaim = {
            id: `WC-${String(Math.floor(Math.random() * 900) + 100)}`, // mock id
            vin,
            vehicleModel: "Unknown Model",
            issueDescription: issue + (diagnostic ? ` — ${diagnostic}` : ""),
            status,
            createdAt: new Date().toISOString().slice(0, 10),
        };
        // TODO: call API create
        onCreate?.(newClaim);
        onClose?.();
        setVin(""); setIssue(""); setDiagnostic(""); setStatus("SUBMITTED");
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <form onSubmit={handleSubmit} noValidate>
                <DialogTitle>Create Warranty Claim</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Vehicle VIN"
                                placeholder="Enter VIN"
                                value={vin}
                                onChange={(e) => setVin(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel id="status-create-label">Status</InputLabel>
                                <Select
                                    labelId="status-create-label"
                                    label="Status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <MenuItem value="SUBMITTED">Submitted</MenuItem>
                                    <MenuItem value="PENDING">Pending</MenuItem>
                                    <MenuItem value="APPROVED">Approved</MenuItem>
                                    <MenuItem value="COMPLETED">Completed</MenuItem>
                                    <MenuItem value="REJECTED">Rejected</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Issue Description"
                                placeholder="Describe the warranty issue"
                                value={issue}
                                onChange={(e) => setIssue(e.target.value)}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Diagnostic Information"
                                placeholder="Enter diagnostic details"
                                value={diagnostic}
                                onChange={(e) => setDiagnostic(e.target.value)}
                                multiline
                                minRows={2}
                                fullWidth
                            />
                        </Grid>

                        {/* File inputs: bạn có thể gắn input type="file" với Upload service riêng */}
                        {/* <Grid item xs={12} md={6}><Button variant="outlined" component="label">Attach Images<input hidden multiple type="file" accept="image/*" /></Button></Grid> */}
                        {/* <Grid item xs={12} md={6}><Button variant="outlined" component="label">Attach Reports<input hidden multiple type="file" accept=".pdf,.doc,.docx" /></Button></Grid> */}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="outlined">Cancel</Button>
                    <Button type="submit" variant="contained">Submit Claim</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

/* ---------- View/Update Claim Dialog ---------- */
function ViewClaimDialog({ open, onClose, claim, onUpdate }) {
    const [status, setStatus] = useState(claim?.status ?? "SUBMITTED");
    const [assigned, setAssigned] = useState(claim?.assignedTo ?? "");
    const [notes, setNotes] = useState("");

    React.useEffect(() => {
        setStatus(claim?.status ?? "SUBMITTED");
        setAssigned(claim?.assignedTo ?? "");
    }, [claim]);

    const handleUpdate = () => {
        if (!claim) return;
        const updated = { ...claim, status, assignedTo: assigned };
        // TODO: call API update
        onUpdate?.(updated);
        onClose?.();
        setNotes("");
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            {claim && (
                <>
                    <DialogTitle>Claim Details — {claim.id}</DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="status-view-label">Status</InputLabel>
                                    <Select
                                        labelId="status-view-label"
                                        label="Status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <MenuItem value="SUBMITTED">Submitted</MenuItem>
                                        <MenuItem value="PENDING">Pending</MenuItem>
                                        <MenuItem value="APPROVED">Approved</MenuItem>
                                        <MenuItem value="COMPLETED">Completed</MenuItem>
                                        <MenuItem value="REJECTED">Rejected</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="tech-label">Assign Technician</InputLabel>
                                    <Select
                                        labelId="tech-label"
                                        label="Assign Technician"
                                        value={assigned}
                                        onChange={(e) => setAssigned(e.target.value)}
                                    >
                                        <MenuItem value="John Doe">John Doe</MenuItem>
                                        <MenuItem value="Jane Smith">Jane Smith</MenuItem>
                                        <MenuItem value="Mike Johnson">Mike Johnson</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Progress Notes"
                                    placeholder="Add progress notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    multiline
                                    minRows={4}
                                    fullWidth
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Divider />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Row label="VIN" value={<Mono>{claim.vin}</Mono>} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Row label="Model" value={claim.vehicleModel} />
                            </Grid>
                            <Grid item xs={12}>
                                <Row label="Issue" value={claim.issueDescription} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Row label="Created" value={new Date(claim.createdAt).toLocaleDateString()} />
                            </Grid>
                            {Array.isArray(claim.parts) && claim.parts.length > 0 && (
                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                                            Parts
                                        </Typography>
                                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                            {claim.parts.map((p) => (
                                                <Chip key={p} label={p} size="small" variant="outlined" />
                                            ))}
                                        </Stack>
                                    </Stack>
                                </Grid>
                            )}
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} variant="outlined">Close</Button>
                        <Button onClick={handleUpdate} variant="contained">Update Claim</Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
