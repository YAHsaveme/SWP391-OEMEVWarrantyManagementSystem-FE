import React, { useMemo, useState } from "react";
import {
    Container,
    Box,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    Button,
    IconButton,
    Chip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Stack,
    Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// NOTE: thay các import dưới đây theo đường dẫn bạn lưu 2 dialog MUI đã chuyển
import CreateVehicleDialog from "./CreateVehicleDialog.jsx";
import UpdateVehicleDialog from "./UpdateVehicleDialog.jsx";

// Mock data
const mockVehicles = [
    {
        vin: "1HGBH41JXMN109186",
        modelCode: "MODEL-S-2024",
        modelName: "Model S",
        licensePlate: "ABC-1234",
        color: "Midnight Silver",
        year: 2024,
        status: "Active",
    },
    {
        vin: "5YJSA1E26HF123456",
        modelCode: "MODEL-3-2024",
        modelName: "Model 3",
        licensePlate: "XYZ-5678",
        color: "Pearl White",
        year: 2024,
        status: "Active",
    },
    {
        vin: "7SAYGDEE9NF123789",
        modelCode: "IONIQ-5-2024",
        modelName: "IONIQ 5",
        licensePlate: "DEF-9012",
        color: "Cyber Gray",
        year: 2024,
        status: "In Service",
    },
];

export default function VehiclesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const [page, setPage] = useState(1);
    const pageSize = 10;

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return mockVehicles;
        return mockVehicles.filter(
            (v) =>
                v.vin.toLowerCase().includes(q) ||
                v.licensePlate.toLowerCase().includes(q) ||
                v.modelName.toLowerCase().includes(q) ||
                v.modelCode.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    // Ensure current page in range if filter changes
    React.useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Box>
                    <Box component="h1" sx={{ m: 0, fontSize: 28, fontWeight: 800 }}>
                        Vehicles
                    </Box>
                    <Box sx={{ color: "text.secondary", mt: 0.5 }}>Manage vehicle registrations</Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                    Register Vehicle
                </Button>
            </Stack>

            {/* Search & Filters */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by VIN, license plate, or model..."
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
                        <Button variant="outlined">Filter</Button>
                    </Stack>
                </CardContent>
            </Card>

            {/* Vehicles Table */}
            <Card variant="outlined">
                <Box sx={{ overflowX: "auto" }}>
                    <Table size="medium" sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <HeadCell>VIN</HeadCell>
                                <HeadCell>Model</HeadCell>
                                <HeadCell>License Plate</HeadCell>
                                <HeadCell>Color</HeadCell>
                                <HeadCell>Year</HeadCell>
                                <HeadCell>Status</HeadCell>
                                <HeadCell align="right">Actions</HeadCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pageItems.map((v) => (
                                <TableRow key={v.vin} hover>
                                    <TableCell>
                                        <Mono>{v.vin}</Mono>
                                    </TableCell>

                                    <TableCell>
                                        <Stack spacing={0}>
                                            <Box sx={{ fontWeight: 600 }}>{v.modelName}</Box>
                                            <Box sx={{ color: "text.secondary", fontSize: 12 }}>{v.modelCode}</Box>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>{v.licensePlate}</TableCell>
                                    <TableCell>{v.color}</TableCell>
                                    <TableCell>{v.year}</TableCell>

                                    <TableCell>
                                        <Chip
                                            label={v.status}
                                            color={v.status === "Active" ? "success" : "warning"}
                                            variant="outlined"
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton
                                                component={RouterLink}
                                                to={`/vehicles/${v.vin}`}
                                                size="small"
                                                color="inherit"
                                            >
                                                <VisibilityOutlinedIcon fontSize="small" />
                                            </IconButton>

                                            <IconButton
                                                size="small"
                                                color="inherit"
                                                onClick={() => {
                                                    setSelectedVehicle(v);
                                                    setUpdateOpen(true);
                                                }}
                                            >
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {pageItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                        No vehicles found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>

                {/* Pagination */}
                <Divider sx={{ mt: 0 }} />
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2, py: 1.5 }}
                >
                    <Box sx={{ color: "text.secondary", fontSize: 14 }}>
                        Showing{" "}
                        <b>
                            {filtered.length ? (page - 1) * pageSize + 1 : 0}
                        </b>{" "}
                        to <b>{Math.min(page * pageSize, filtered.length) || 0}</b> of{" "}
                        <b>{filtered.length}</b> results
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton
                            size="small"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                        <Box sx={{ fontSize: 14 }}>Page {page}</Box>
                        <IconButton
                            size="small"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Card>

            {/* Dialogs */}
            <CreateVehicleDialog open={createOpen} onClose={() => setCreateOpen(false)} />

            <UpdateVehicleDialog
                open={updateOpen}
                onClose={() => setUpdateOpen(false)}
                vehicle={selectedVehicle}
            />
        </Container>
    );
}

/* ---------- small helpers ---------- */
function HeadCell({ children, align = "left" }) {
    return (
        <TableCell
            align={align}
            sx={{ textTransform: "uppercase", fontSize: 12, color: "text.secondary", fontWeight: 700 }}
        >
            {children}
        </TableCell>
    );
}

function Mono({ children }) {
    return <Box sx={{ fontFamily: "monospace", fontSize: 14 }}>{children}</Box>;
}
