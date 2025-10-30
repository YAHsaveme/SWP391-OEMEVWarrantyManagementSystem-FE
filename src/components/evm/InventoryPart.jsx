"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Grid, TextField, MenuItem, Button, Paper, Typography,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    IconButton, CircularProgress, Snackbar, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Tooltip
} from "@mui/material";
import {
    Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon,
    Edit as EditIcon, InfoOutlined, MoveUp as MoveUpIcon, MoveDown as MoveDownIcon
} from "@mui/icons-material";
import centerService from "../../services/centerService";
import inventoryPartService from "../../services/inventoryPartService";

export default function InventoryPartsPage() {
    /* ========= State ========= */
    const [centers, setCenters] = useState([]);
    const [centerId, setCenterId] = useState("");

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // search (optional)
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // dialogs
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openAdjust, setOpenAdjust] = useState(false);

    const [editing, setEditing] = useState(null);
    const [createForm, setCreateForm] = useState({
        centerId: "",
        partId: "",
        quantity: 0,
        minQty: 0,
        maxQty: 0,
        status: "ACTIVE",
    });
    const [editForm, setEditForm] = useState({});
    const [adjustForm, setAdjustForm] = useState({ inventoryPartId: "", delta: 0, reason: "" });

    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    /* ========= Helpers ========= */
    const notify = (message, severity = "info") => setSnack({ open: true, message, severity });

    // Lấy schema động cho bảng (ẩn các cột yêu cầu)
    const columns = useMemo(() => {
        if (!items?.length) return [];
        const keys = Object.keys(items[0]);

        const hidden = new Set([
            "id",
            "centerId",
            "partId",
            "createAt",
            "belowMin",
            "__v",
        ]);

        return keys.filter((k) => !hidden.has(k));
    }, [items]);

    /* ========= Load centers (lấy centerId) ========= */
    useEffect(() => {
        (async () => {
            try {
                const res = await centerService.getAll(); // [] hoặc {content:[]}
                setCenters(Array.isArray(res) ? res : (res?.content || []));
            } catch (e) {
                console.error(e);
                notify("Không tải được danh sách trung tâm", "error");
            }
        })();
    }, []);

    /* ========= Fetch inventory by center ========= */
    const loadByCenter = async () => {
        if (!centerId) return notify("Hãy chọn trung tâm", "warning");
        try {
            setLoading(true);
            const data = await inventoryPartService.listByCenter(centerId);
            setItems(Array.isArray(data) ? data : (data?.content || []));
            setTotalPages(1);
            setPage(0);
            notify("Đã tải inventory theo center", "success");
        } catch (e) {
            console.error(e);
            notify("Lỗi tải inventory theo center", "error");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    /* ========= Search (server-side) ========= */
    const handleSearch = async () => {
        try {
            setLoading(true);
            const res = await inventoryPartService.search({ q, page, size });
            if (Array.isArray(res)) {
                setItems(res);
                setTotalPages(1);
            } else {
                setItems(res?.content || []);
                setTotalPages(res?.totalPages || 1);
            }
        } catch (e) {
            console.error(e);
            notify("Lỗi search inventory parts", "error");
        } finally {
            setLoading(false);
        }
    };

    /* ========= Create ========= */
    const openCreateDialog = () => {
        setCreateForm((f) => ({ ...f, centerId: centerId || "" }));
        setOpenCreate(true);
    };
    const handleCreate = async () => {
        try {
            setLoading(true);
            await inventoryPartService.create(createForm);
            notify("Tạo inventory part thành công", "success");
            setOpenCreate(false);
            await loadByCenter();
        } catch (e) {
            console.error(e);
            notify("Không thể tạo inventory part", "error");
        } finally {
            setLoading(false);
        }
    };

    /* ========= Edit ========= */
    const openEditDialog = async (row) => {
        try {
            setLoading(true);
            const full = await inventoryPartService.get(row.id);
            setEditForm(full || row);
            setEditing(row);
            setOpenEdit(true);
        } catch (e) {
            console.error(e);
            notify("Không tải được chi tiết", "error");
        } finally {
            setLoading(false);
        }
    };

    // GỬI ĐÚNG PAYLOAD CHO API /inventory-parts/{id}/update: chỉ minQty, maxQty, quantity
    const handleEdit = async () => {
        try {
            setLoading(true);
            const body = {
                minQty: Number(editForm.minQty ?? 0),
                maxQty: Number(editForm.maxQty ?? 0),
                quantity: Number(editForm.quantity ?? 0),
            };
            await inventoryPartService.update(editing.id, body);
            notify("Cập nhật thành công", "success");
            setOpenEdit(false);
            await loadByCenter();
        } catch (e) {
            console.error(e);
            notify("Không thể cập nhật", "error");
        } finally {
            setLoading(false);
        }
    };

    /* ========= Adjust Quantity ========= */
    const openAdjustDialog = (row) => {
        setAdjustForm({ inventoryPartId: row.id, delta: 0, reason: "" });
        setOpenAdjust(true);
    };
    const handleAdjust = async () => {
        try {
            setLoading(true);
            await inventoryPartService.adjustQuantity(adjustForm);
            notify("Điều chỉnh tồn kho thành công", "success");
            setOpenAdjust(false);
            await loadByCenter();
        } catch (e) {
            console.error(e);
            notify("Điều chỉnh thất bại", "error");
        } finally {
            setLoading(false);
        }
    };

    /* ========= UI ========= */
    return (
        <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Inventory Parts</Typography>

            {/* Toolbar */}
            <Grid container spacing={2} alignItems="center" mb={2}>
                {/* Chọn Center -> lấy centerId */}
                <Grid item xs={12} md={4}>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Chọn Trung tâm"
                        value={centerId}
                        onChange={(e) => setCenterId(e.target.value)}
                    >
                        <MenuItem value="">-- Chọn --</MenuItem>
                        {centers.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs="auto">
                    <Button variant="contained" onClick={loadByCenter} disabled={!centerId || loading}>
                        {loading ? <CircularProgress size={20} /> : "Tải theo Center"}
                    </Button>
                </Grid>

                <Grid item xs={12} md={3}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm theo tên/part/..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: .6 }} /> }}
                    />
                </Grid>
                <Grid item xs="auto">
                    <Button variant="outlined" onClick={() => { setPage(0); handleSearch(); }}>
                        Search
                    </Button>
                </Grid>
                <Grid item xs="auto">
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { setQ(""); setItems([]); }}>
                        Clear
                    </Button>
                </Grid>
                <Grid item xs="auto">
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        disabled={!centerId}
                    >
                        Tạo mới
                    </Button>
                </Grid>
            </Grid>

            {/* Table */}
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer sx={{ maxHeight: 540 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {columns.map((c) => <TableCell key={c}>{c}</TableCell>)}
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((row) => (
                                <TableRow key={row.id} hover>
                                    {columns.map((c) => (
                                        <TableCell key={c}>
                                            {typeof row[c] === "object" ? JSON.stringify(row[c]) : String(row[c] ?? "")}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                        <Tooltip title="Chi tiết / Sửa">
                                            <IconButton onClick={() => openEditDialog(row)}><EditIcon /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Điều chỉnh +">
                                            <IconButton onClick={() => openAdjustDialog(row)}><MoveUpIcon /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Điều chỉnh -">
                                            <IconButton onClick={() => { openAdjustDialog(row); setAdjustForm(f => ({ ...f, delta: -Math.abs(f.delta || 1) })); }}>
                                                <MoveDownIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && items.length === 0 && (
                                <TableRow><TableCell colSpan={columns.length + 1} align="center">Chưa có dữ liệu</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination cơ bản cho search */}
                {!loading && totalPages > 1 && (
                    <Box display="flex" justifyContent="center" alignItems="center" gap={2} p={2}>
                        <Button variant="outlined" disabled={page === 0} onClick={() => { setPage(p => p - 1); handleSearch(); }}>
                            Trang trước
                        </Button>
                        <Typography>Trang {page + 1} / {totalPages}</Typography>
                        <Button variant="outlined" disabled={page + 1 >= totalPages} onClick={() => { setPage(p => p + 1); handleSearch(); }}>
                            Trang sau
                        </Button>
                        <TextField
                            select size="small" value={size}
                            onChange={(e) => { setSize(Number(e.target.value)); setPage(0); handleSearch(); }}
                            sx={{ width: 100 }}
                            label="Size"
                        >
                            {[10, 20, 50].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                    </Box>
                )}

                {loading && <Box p={2} textAlign="center"><CircularProgress size={26} /></Box>}
            </Paper>

            {/* Dialog: Create */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
                <DialogTitle>Tạo Inventory Part</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} mt={1}>
                        {/* centerId: dropdown chỉ hiện tên, value là id */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Trung tâm"
                                value={createForm.centerId || centerId}
                                onChange={(e) => setCreateForm({ ...createForm, centerId: e.target.value })}
                            >
                                <MenuItem value="">-- Chọn trung tâm --</MenuItem>
                                {centers.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="PartId"
                                value={createForm.partId}
                                onChange={(e) => setCreateForm({ ...createForm, partId: e.target.value })}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Quantity"
                                value={createForm.quantity}
                                onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Min Qty"
                                value={createForm.minQty}
                                onChange={(e) => setCreateForm({ ...createForm, minQty: Number(e.target.value) })}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Qty"
                                value={createForm.maxQty}
                                onChange={(e) => setCreateForm({ ...createForm, maxQty: Number(e.target.value) })}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Status (ACTIVE/INACTIVE)"
                                value={createForm.status}
                                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Edit */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Cập nhật Inventory Part</DialogTitle>
                <DialogContent>
                    {editing ? (
                        <Grid container spacing={2} mt={1}>
                            {Object.keys(editForm || {})
                                .filter((k) => !["id", "centerId", "partId", "createAt", "belowMin", "__v"].includes(k))
                                .map((k) => (
                                    <Grid key={k} item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label={k}
                                            value={typeof editForm[k] === "object" ? JSON.stringify(editForm[k]) : (editForm[k] ?? "")}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (["quantity", "minQty", "maxQty"].includes(k)) val = Number(val);
                                                setEditForm({ ...editForm, [k]: val });
                                            }}
                                        />
                                    </Grid>
                                ))}
                            {!Object.keys(editForm || {}).length && <Typography>Không có trường nào</Typography>}
                        </Grid>
                    ) : (
                        <Box p={2} textAlign="center"><InfoOutlined /> Chọn 1 dòng để sửa</Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>Đóng</Button>
                    <Button variant="contained" onClick={handleEdit} disabled={loading || !editing}>
                        {loading ? <CircularProgress size={20} /> : "Lưu"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Adjust Quantity */}
            <Dialog open={openAdjust} onClose={() => setOpenAdjust(false)} fullWidth maxWidth="sm">
                <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} mt={1}>
                        <Grid item xs={12} sm={6}>
                            <TextField label="inventoryPartId" fullWidth value={adjustForm.inventoryPartId} disabled />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Delta (+/-)" fullWidth
                                value={adjustForm.delta}
                                onChange={(e) => setAdjustForm({ ...adjustForm, delta: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Reason" fullWidth
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdjust(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleAdjust} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : "Xác nhận"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
