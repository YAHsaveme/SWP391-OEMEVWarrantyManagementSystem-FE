import React, { useMemo, useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Container, Box, TextField, InputAdornment, Button, IconButton, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, Stack, Divider, Dialog,
    DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress, Typography, Card
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import CreateVehicleDialog from "./CreateVehicleDialog.jsx";
import UpdateVehicleDialog from "./UpdateVehicleDialog.jsx";

/* ================== API BASE ================== */
const API_BASE = "http://localhost:8080";
const ACTIVATE_ENDPOINT = (vin) =>
    `/api/vehicle-warranties/${encodeURIComponent(vin)}/activate`;

/* ================== TOKEN & REDIRECT HELPERS ================== */
function readRawToken() {
    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        ""
    );
}

// loại bỏ ngoặc kép / "Bearer " thừa
function sanitizeToken(t) {
    if (!t) return "";
    t = String(t).trim();
    if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
    if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim();
    return t;
}
function getToken() {
    return sanitizeToken(readRawToken());
}

function clearTokensAndGotoLogin(msg) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    alert(msg || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    window.location.href = "/login";
}

/* ================== AXIOS INSTANCE + INTERCEPTORS ================== */
const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    const t = getToken();
    config.headers = { ...(config.headers || {}), Accept: "application/json" };
    if (t) config.headers.Authorization = `Bearer ${t}`;
    config.withCredentials = false;
    return config;
});

api.interceptors.response.use(
    (res) => {
        const rawMsg =
            typeof res.data === "string"
                ? res.data
                : String(res.data?.message || "");
        const msg = rawMsg.toLowerCase();
        if (
            res.status === 400 ||
            res.status === 401 ||
            res.status === 403 ||
            msg.includes("invalid token") ||
            msg.includes("expired token")
        ) {
            if (msg.includes("invalid") || msg.includes("expired")) {
                clearTokensAndGotoLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            }
        }
        return res;
    },
    (err) => {
        const res = err?.response;
        const rawMsg =
            typeof res?.data === "string"
                ? res.data
                : String(res?.data?.message || err.message || "");
        const msg = rawMsg.toLowerCase();
        if (
            res &&
            (res.status === 400 || res.status === 401 || res.status === 403) &&
            (msg.includes("invalid") || msg.includes("expired"))
        ) {
            clearTokensAndGotoLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        return Promise.reject(err);
    }
);

/* ================== COMPONENT ================== */
export default function VehiclesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("newest"); // 👈 dropdown sort
    const [createOpen, setCreateOpen] = useState(false);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const [page, setPage] = useState(1);
    const [vehicals, setVehicals] = useState([]); // giữ nguyên tên biến của bạn
    const [error, setError] = useState(null);
    const pageSize = 10;

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [activating, setActivating] = useState(false);
    const [targetVehicle, setTargetVehicle] = useState(null);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    /* ===== Fetch ===== */
    const fetchVehicles = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setError("❌ Chưa có token. Vui lòng đăng nhập lại.");
            clearTokensAndGotoLogin("Chưa có token. Vui lòng đăng nhập lại.");
            return;
        }
        try {
            const res = await api.get("/api/vehicles/get-all", { validateStatus: () => true });

            if (res.status >= 400) {
                const rawMsg =
                    typeof res.data === "string" ? res.data : String(res.data?.message || "");
                const msg = rawMsg.toLowerCase();
                if (msg.includes("invalid") || msg.includes("expired")) {
                    clearTokensAndGotoLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    return;
                }
                setError(`Server trả lỗi ${res.status}: ${res.data?.message || "Bad Request"}`);
                return;
            }

            const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setVehicals(list);
            setError(null);
        } catch (err) {
            console.error("❌ Axios Error:", err);
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleCreated = () => {
        setCreateOpen(false);
        setPage(1);
        fetchVehicles();
        setSnack({ open: true, message: "✅ Đã tạo xe mới", severity: "success" });
    };
    const handleUpdated = () => {
        setUpdateOpen(false);
        fetchVehicles();
        setSnack({ open: true, message: "✅ Đã cập nhật xe", severity: "success" });
    };

    /* ===== Filter + Sort + Pagination ===== */
    const getCreatedAtMs = useCallback((v) => {
        const iso = v?.createdAt ?? v?.createAt ?? v?.create_at ?? v?.created_at;
        const d = iso ? new Date(iso) : null;
        return d && !isNaN(d.getTime()) ? d.getTime() : -Infinity;
    }, []);

    const filteredSorted = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const safe = (v) => (typeof v === "string" ? v.toLowerCase() : "");

        let arr = vehicals;
        if (q) {
            arr = vehicals.filter((v) =>
                safe(v?.vin).includes(q) ||
                safe(v?.model).includes(q) ||
                safe(v?.modelCode).includes(q) ||
                safe(v?.intakeContactName).includes(q) ||
                safe(v?.intakeContactPhone).includes(q)
            );
        }

        // sort theo dropdown
        return [...arr].sort((a, b) =>
            sortOrder === "newest"
                ? getCreatedAtMs(b) - getCreatedAtMs(a)
                : getCreatedAtMs(a) - getCreatedAtMs(b)
        );
    }, [searchQuery, vehicals, getCreatedAtMs, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
    const pageItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredSorted.slice(start, start + pageSize);
    }, [filteredSorted, page]);

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    const fmtDateTime = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    /* ===== Activate warranty ===== */
    function onClickActivate(vehicle) {
        if (!vehicle?.vin) {
            setSnack({ open: true, message: "Không có VIN để kích hoạt.", severity: "warning" });
            return;
        }
        setTargetVehicle(vehicle);
        setConfirmOpen(true);
    }

    async function doActivate() {
        if (!targetVehicle?.vin) return;
        const token = getToken();
        if (!token) {
            setSnack({ open: true, message: "Chưa có token. Vui lòng đăng nhập lại.", severity: "error" });
            clearTokensAndGotoLogin();
            return;
        }

        setActivating(true);
        try {
            const res = await api.post(ACTIVATE_ENDPOINT(targetVehicle.vin), null, {
                validateStatus: () => true,
            });

            if (res.status >= 400) {
                const rawMsg =
                    typeof res.data === "string"
                        ? res.data
                        : String(res.data?.message || "");
                const msg = rawMsg.toLowerCase();
                if (msg.includes("invalid") || msg.includes("expired")) {
                    clearTokensAndGotoLogin("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    return;
                }
                setSnack({
                    open: true,
                    message: `Kích hoạt thất bại (${res.status})${res.data?.message ? `: ${res.data.message}` : ""}`,
                    severity: "error",
                });
            } else {
                setSnack({
                    open: true,
                    message: `✅ Đã kích hoạt bảo hành cho VIN ${targetVehicle.vin}`,
                    severity: "success",
                });
                await fetchVehicles();
            }
        } catch (e) {
            console.error(e);
            setSnack({ open: true, message: "Lỗi mạng khi kích hoạt bảo hành.", severity: "error" });
        } finally {
            setActivating(false);
            setConfirmOpen(false);
            setTargetVehicle(null);
        }
    }

    return (
        <Container maxWidth="lg" sx={{ pt: 1, pb: 3 }}>
            {/* --- Hàng duy nhất: Search + Sort + Register (không dùng Card) --- */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
                sx={{ mb: 2 }}
            >
                {/* 🔍 Search */}
                <TextField
                    placeholder="Search by VIN, model, model code, contact name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{
                        flexGrow: 1,
                        maxWidth: { xs: "100%", sm: 420 },
                        "& .MuiInputBase-root": { borderRadius: 2 },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Nhóm Sort + Register */}
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <TextField
                        select
                        size="small"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        sx={{ minWidth: 150, "& .MuiInputBase-root": { borderRadius: 2 } }}
                    >
                        <MenuItem value="newest">Newest first</MenuItem>
                        <MenuItem value="oldest">Oldest first</MenuItem>
                    </TextField>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                        sx={{ borderRadius: 2, px: 2.5, whiteSpace: "nowrap", fontWeight: 600 }}
                    >
                        Register Vehicle
                    </Button>
                </Stack>
            </Stack>

            {/* Table */}
            <Card variant="outlined">
                <Box>
                    <Table
                        size="small"
                        sx={{
                            width: "100%",
                            tableLayout: "fixed",
                            "& th, & td": {
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                py: 1,
                            },
                        }}
                    >
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
                                <TableRow key={v.vin || `${v.model}-${v.modelCode}-${v.createdAt || v.createAt || Math.random()}`} hover>
                                    <TableCell>
                                        <Mono>{v.vin || "—"}</Mono>
                                    </TableCell>
                                    <TableCell>{v.model || "—"}</TableCell>
                                    <TableCell>{v.modelCode || "—"}</TableCell>
                                    <TableCell>{fmtDateTime(v.inServiceDate)}</TableCell>
                                    <TableCell>{fmtDateTime(v.productionDate)}</TableCell>
                                    <TableCell>{v.intakeContactName || "—"}</TableCell>
                                    <TableCell>{v.intakeContactPhone || "—"}</TableCell>
                                    <TableCell>{fmtDateTime(v.createdAt ?? v.createAt ?? v.create_at ?? v.created_at)}</TableCell>

                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <IconButton
                                                size="small"
                                                color="success"
                                                onClick={() => onClickActivate(v)}
                                                disabled={!v.vin}
                                                title="Kích hoạt bảo hành"
                                            >
                                                <VerifiedUserIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="inherit"
                                                onClick={() => { setSelectedVehicle(v); setUpdateOpen(true); }}
                                                title="Chỉnh sửa"
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

                <Divider sx={{ mt: 0 }} />
                <PaginationFooter
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    total={filteredSorted.length}
                    totalPages={Math.max(1, Math.ceil(filteredSorted.length / pageSize))}
                />
            </Card>

            {/* Dialogs */}
            <CreateVehicleDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />
            <UpdateVehicleDialog
                open={updateOpen}
                onClose={() => setUpdateOpen(false)}
                vehicle={selectedVehicle}
                onUpdated={handleUpdated}
            />

            {/* Confirm activate */}
            <Dialog open={confirmOpen} onClose={() => !activating && setConfirmOpen(false)}>
                <DialogTitle>Kích hoạt bảo hành</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2">
                        Bạn có chắc muốn kích hoạt bảo hành cho VIN <b>{targetVehicle?.vin}</b>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} disabled={activating}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={doActivate}
                        disabled={activating}
                        startIcon={activating ? <CircularProgress size={16} /> : null}
                    >
                        {activating ? "Đang kích hoạt..." : "Kích hoạt"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
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
    return (
        <Box sx={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all" }}>
            {children}
        </Box>
    );
}
function PaginationFooter({ page, setPage, pageSize, total, totalPages }) {
    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ color: "text.secondary", fontSize: 14 }}>
                Showing <b>{total ? (page - 1) * pageSize + 1 : 0}</b> to <b>{Math.min(page * pageSize, total) || 0}</b> of <b>{total}</b> results
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeftIcon />
                </IconButton>
                <Box sx={{ fontSize: 14 }}>Page {page}</Box>
                <IconButton size="small" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    <ChevronRightIcon />
                </IconButton>
            </Stack>
        </Stack>
    );
}