import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
    Container,
    Box,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    Button,
    IconButton,
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

import CreateVehicleDialog from "./CreateVehicleDialog.jsx";
import UpdateVehicleDialog from "./UpdateVehicleDialog.jsx";

export default function VehiclesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const [page, setPage] = useState(1);
    const [vehicals, setVehicals] = useState([]);
    const [error, setError] = useState(null);
    const pageSize = 10;

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setError("❌ Chưa có token, vui lòng đăng nhập lại.");
            return;
        }

        axios
            .get("http://localhost:8080/api/vehicles/get-all", {
                headers: {
                    Authorization: `Bearer ${token}`,   // chỉ cần Authorization
                    Accept: "application/json",         // thêm Accept
                },
                validateStatus: () => true,           // để tự xử lý lỗi
            })
            .then((res) => {
                console.log("📦 Status:", res.status);
                console.log("📦 Data:", res.data);

                if (res.status >= 400) {
                    setError(`Server trả lỗi ${res.status}: ${res.data?.message || "Bad Request"}`);
                    return;
                }

                // API trả mảng trực tiếp hoặc bọc { data: [...] }
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setVehicals(list);
            })
            .catch((err) => {
                console.error("❌ Axios Error:", err);
                setError(err.message);
            });
    }, []);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return vehicals;

        const safe = (v) => (typeof v === "string" ? v.toLowerCase() : "");
        return vehicals.filter((v) => {
            return (
                safe(v?.vin).includes(q) ||
                safe(v?.model).includes(q) ||
                safe(v?.modelCode).includes(q) ||
                safe(v?.intakeContactName).includes(q) ||
                safe(v?.intakeContactPhone).includes(q)
            );
        });
    }, [searchQuery, vehicals]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    React.useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    const fmtDateTime = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

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

            {/* Search */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            fullWidth
                            placeholder="Search by VIN, model, model code, contact name or phone..."
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

            {/* Table */}
            <Card variant="outlined">
                <Box sx={{ overflowX: "auto" }}>
                    <Table size="medium" sx={{ minWidth: 1100 }}>
                        <TableHead>
                            <TableRow>
                                <HeadCell>VIN</HeadCell>
                                <HeadCell>Model</HeadCell>
                                <HeadCell>Model Code</HeadCell>
                                <HeadCell>In Service Date</HeadCell>
                                <HeadCell>Production Date</HeadCell>
                                <HeadCell>Intake Contact</HeadCell>
                                <HeadCell>Phone</HeadCell>
                                <HeadCell>Created At</HeadCell>
                                <HeadCell align="right">Actions</HeadCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pageItems.map((v) => (
                                <TableRow key={v.vin || `${v.model}-${v.modelCode}`} hover>
                                    <TableCell>
                                        <Mono>{v.vin || "—"}</Mono>
                                    </TableCell>

                                    <TableCell>{v.model || "—"}</TableCell>
                                    <TableCell>{v.modelCode || "—"}</TableCell>
                                    <TableCell>{fmtDateTime(v.inServiceDate)}</TableCell>
                                    <TableCell>{fmtDateTime(v.productionDate)}</TableCell>
                                    <TableCell>{v.intakeContactName || "—"}</TableCell>
                                    <TableCell>{v.intakeContactPhone || "—"}</TableCell>
                                    <TableCell>{fmtDateTime(v.createAt)}</TableCell>

                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton
                                                component={RouterLink}
                                                to={`/vehicles/${encodeURIComponent(v.vin || "")}`}
                                                size="small"
                                                color="inherit"
                                                disabled={!v.vin}
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
                                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                        {error ? `Lỗi tải dữ liệu: ${error}` : "No vehicles found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>

                {/* Pagination */}
                <Divider sx={{ mt: 0 }} />
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
                    <Box sx={{ color: "text.secondary", fontSize: 14 }}>
                        Showing <b>{filtered.length ? (page - 1) * pageSize + 1 : 0}</b> to{" "}
                        <b>{Math.min(page * pageSize, filtered.length) || 0}</b> of <b>{filtered.length}</b> results
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton size="small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
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

            <UpdateVehicleDialog open={updateOpen} onClose={() => setUpdateOpen(false)} vehicle={selectedVehicle} />
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
