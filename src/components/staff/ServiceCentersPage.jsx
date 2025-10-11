import React, { useMemo, useState } from "react";
import {
    Container,
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    InputAdornment,
    Chip,
    Stack,
    Button,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneIcon from "@mui/icons-material/Phone";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

const mockCenters = [
    {
        id: 1,
        name: "Downtown Service Center",
        address: "123 Main Street, City Center, CA 90001",
        phone: "+1 (555) 123-4567",
        email: "downtown@evservice.com",
        hours: "Mon-Fri: 8AM-6PM, Sat: 9AM-4PM",
        status: "Active",
    },
    {
        id: 2,
        name: "Westside EV Hub",
        address: "456 West Avenue, Westside, CA 90002",
        phone: "+1 (555) 234-5678",
        email: "westside@evservice.com",
        hours: "Mon-Fri: 7AM-7PM, Sat-Sun: 9AM-5PM",
        status: "Active",
    },
    {
        id: 3,
        name: "North Valley Center",
        address: "789 North Road, Valley, CA 90003",
        phone: "+1 (555) 345-6789",
        email: "northvalley@evservice.com",
        hours: "Mon-Sat: 8AM-6PM",
        status: "Active",
    },
];

export default function ServiceCentersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [openId, setOpenId] = useState(null);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return mockCenters;
        return mockCenters.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.address.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const active = useMemo(
        () => mockCenters.find((c) => c.id === openId),
        [openId]
    );

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box mb={2}>
                <Typography variant="h4" fontWeight={800}>
                    Service Centers
                </Typography>
                <Typography color="text.secondary">
                    View service center locations and information
                </Typography>
            </Box>

            {/* Search */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search by name or location..."
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

            {/* Centers List */}
            <Stack spacing={2}>
                {filtered.map((center) => (
                    <Card
                        key={center.id}
                        elevation={3}
                        sx={{
                            transition: "box-shadow .2s, border-color .2s",
                            "&:hover": { boxShadow: 8 },
                        }}
                    >
                        <CardContent>
                            <Grid container spacing={2} alignItems="flex-start">
                                <Grid item xs={12} md={9}>
                                    <Stack spacing={2}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Typography variant="h6" fontWeight={700}>
                                                {center.name}
                                            </Typography>
                                            <Chip
                                                label={center.status}
                                                color="success"
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Stack>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <InfoRow
                                                    icon={<PlaceIcon />}
                                                    label="Address"
                                                    value={center.address}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <InfoRow
                                                    icon={<AccessTimeIcon />}
                                                    label="Hours"
                                                    value={center.hours}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <InfoRow
                                                    icon={<PhoneIcon />}
                                                    label="Phone"
                                                    value={center.phone}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <InfoRow
                                                    icon={<MailOutlineIcon />}
                                                    label="Email"
                                                    value={center.email}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} md={3}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: { xs: "flex-start", md: "flex-end" },
                                            mt: { xs: 1, md: 0 },
                                        }}
                                    >
                                        <Button variant="outlined" onClick={() => setOpenId(center.id)}>
                                            View Details
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                ))}
            </Stack>

            {/* Details Dialog */}
            <Dialog open={Boolean(openId)} onClose={() => setOpenId(null)} maxWidth="sm" fullWidth>
                {active && (
                    <>
                        <DialogTitle>{active.name}</DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={1.5}>
                                <InfoRow icon={<PlaceIcon />} label="Address" value={active.address} divider />
                                <InfoRow icon={<AccessTimeIcon />} label="Hours" value={active.hours} divider />
                                <InfoRow icon={<PhoneIcon />} label="Phone" value={active.phone} divider />
                                <InfoRow icon={<MailOutlineIcon />} label="Email" value={active.email} />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenId(null)}>Close</Button>
                            {/* Bạn có thể thêm nút “Open in Maps”, “Call”, “Send Email” ở đây */}
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
}

function InfoRow({ icon, label, value, divider = false }) {
    return (
        <>
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
                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                        {value}
                    </Typography>
                </Box>
            </Stack>
            {divider && <Divider sx={{ my: 1.25 }} />}
        </>
    );
}
