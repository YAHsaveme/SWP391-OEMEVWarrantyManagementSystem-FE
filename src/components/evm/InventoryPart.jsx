"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Box, Grid, TextField, MenuItem, Button, Paper, Typography,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    IconButton, CircularProgress, Snackbar, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, Tooltip, Autocomplete
} from "@mui/material";
import {
    Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon,
    Edit as EditIcon, InfoOutlined, MoveUp as MoveUpIcon, MoveDown as MoveDownIcon,
    Inventory2 as LotIcon, Build as PartIcon
} from "@mui/icons-material";
import centerService from "../../services/centerService";
import inventoryPartService from "../../services/inventoryPartService";
import inventoryLotService from "../../services/inventoryLotService";
import partService from "../../services/partService";
import { FormControl, InputLabel, Select } from "@mui/material";
import axiosInstance from "../../services/axiosInstance";

/* ================= InventoryPartView ================= */
function InventoryPartView({ onSwitch }) {
    const [centers, setCenters] = useState([]);
    const [centerId, setCenterId] = useState("");

    const [allItems, setAllItems] = useState([]); // dữ liệu tổng ban đầu (EVM + tất cả center)
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // search (optional)
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Filter by Part
    const [selectedPartId, setSelectedPartId] = useState(null);
    const [parts, setParts] = useState([]);
    const [partsLoading, setPartsLoading] = useState(false);

    // dialogs
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);

    const [editing, setEditing] = useState(null);
    const [createForm, setCreateForm] = useState({
        centerId: "",
        partId: "",
        quantity: "",
        minQty: "",
        maxQty: "",
    });
    const [partOptions, setPartOptions] = useState([]);
    const [partLoading, setPartLoading] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [adjustForm, setAdjustForm] = useState({ inventoryPartId: "", delta: 0, reason: "" });

    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    const notify = (message, severity = "info") => setSnack({ open: true, message, severity });

    const columns = useMemo(() => {
        if (!items?.length) return [];
        const keys = Object.keys(items[0]);

        const hidden = new Set([
            "id",
            "centerId",
            "partId",
            "partLotId",
            "createAt",
            "belowMin",
            "__v",
        ]);

        return keys.filter((k) => !hidden.has(k));
    }, [items]);

    useEffect(() => {
        (async () => {
            try {
                const res = await centerService.getAll();
                setCenters(Array.isArray(res) ? res : (res?.content || []));
            } catch (e) {
                console.error(e);
                notify("Không tải được danh sách trung tâm", "error");
            }
        })();
    }, []);

    // Load danh sách parts cho dropdown
    const loadParts = async () => {
        try {
            setPartsLoading(true);
            const data = await partService.getActive();
            setParts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            notify("Không tải được danh sách phụ tùng", "error");
        } finally {
            setPartsLoading(false);
        }
    };

    useEffect(() => {
        loadParts();
    }, []);

    // Function để load inventory parts theo partId
    const loadPartsByPart = async (partId) => {
        try {
            setLoading(true);
            const data = await inventoryPartService.listByPart(partId);
            const parts = Array.isArray(data) ? data : (data?.inventoryParts || data?.content || []);
            setAllItems(parts);
            setTotalPages(1);
            setPage(0);
        } catch (e) {
            console.error(e);
            notify("Lỗi tải tồn kho theo phụ tùng", "error");
        } finally {
            setLoading(false);
        }
    };

    // Function để reload dữ liệu: ưu tiên listByPart > listByCenter > getAll
    const reloadAll = async () => {
        try {
            setLoading(true);
            let data;
            if (selectedPartId) {
                // Ưu tiên: filter theo part (xem part đó ở các center nào)
                data = await inventoryPartService.listByPart(selectedPartId);
            } else if (centerId) {
                // Dùng API filter theo center (server-side)
                data = await inventoryPartService.listByCenter(centerId);
            } else {
                // Load tất cả nếu không chọn center và part
                data = await inventoryPartService.getAll();
            }
            let parts = Array.isArray(data) ? data : (data?.inventoryParts || data?.content || []);

            // Đồng bộ số lượng với tồn kho thực tế từ các Part Lot nếu đang filter theo Center
            if (centerId) {
                try {
                    const lotsRes = await inventoryLotService.listByCenterWithId(centerId);
                    const lotsData = Array.isArray(lotsRes?.inventoryLots)
                        ? lotsRes.inventoryLots
                        : Array.isArray(lotsRes)
                            ? lotsRes
                            : [];
                    const totalByPart = {};
                    lotsData.forEach(lot => {
                        const partId = lot.partId || lot.partLotPartId || lot.part?.id;
                        if (!partId) return;
                        const isSerialized =
                            lot.isSerialized ??
                            lot.part?.isSerialized ??
                            Boolean(lot.serialNo || lot.partLotSerialNo || lot.partLot?.serialNo);
                        const rawQty = lot.quantity;
                        let qty = Number(rawQty);
                        if (Number.isNaN(qty)) {
                            qty = isSerialized ? 1 : 0;
                        }
                        if (isSerialized) {
                            // Serialized: mỗi lot đại diện cho 1 đơn vị nếu quantity không chỉ định
                            if (Number.isNaN(Number(rawQty)) || rawQty === null || rawQty === undefined) {
                                qty = 1;
                            }
                        }
                        totalByPart[partId] = (totalByPart[partId] || 0) + (Number.isNaN(qty) ? 0 : qty);
                    });

                    parts = parts.map(item => {
                        const partId = item.partId || item.part?.id;
                        if (partId && totalByPart[partId] !== undefined) {
                            return { ...item, quantity: totalByPart[partId] };
                        }
                        return item;
                    });
                } catch (err) {
                    console.warn("[InventoryPart] sync quantity with lots failed:", err);
                }
            }

            setAllItems(parts);
            setTotalPages(1);
            setPage(0);
        } catch (e) {
            console.error(e);
            notify("Lỗi tải tồn kho", "error");
        } finally {
            setLoading(false);
        }
    };

    // Tải tồn kho ban đầu khi vào trang
    useEffect(() => {
        reloadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload khi centerId hoặc selectedPartId thay đổi
    useEffect(() => {
        reloadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centerId, selectedPartId]);

    // Event listeners cho shipment-received, shipment-dispatch và inventory-center-reload
    // Tự động reload khi SC-Staff receive hoặc EVM dispatch
    useEffect(() => {
        const onReload = (ev) => {
            const cid = ev?.detail?.centerId;
            // Nếu có centerId trong event và đang filter theo center đó, hoặc không filter theo center
            if (!cid || !centerId || String(cid) === String(centerId)) {
                notify("Đã nhận sự kiện cập nhật tồn kho. Đang làm mới dữ liệu...", "info");
                reloadAll();
            } else {
                notify(`Có cập nhật tồn kho từ center ${cid}. Bạn đang xem center khác.`, "info");
            }
        };
        window.addEventListener("shipment-received", onReload);
        window.addEventListener("shipment-dispatch", onReload);
        window.addEventListener("inventory-center-reload", onReload);
        return () => {
            window.removeEventListener("shipment-received", onReload);
            window.removeEventListener("shipment-dispatch", onReload);
            window.removeEventListener("inventory-center-reload", onReload);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centerId, notify]);

    // Filter theo search text (client-side, vì search API có thể không hỗ trợ centerId)
    useEffect(() => {
        let list = [...allItems];
        // Search text (nếu có)
        const kw = q.trim().toLowerCase();
        if (kw) {
            list = list.filter(it =>
                String(it.partName || it.partNo || it.partId || "").toLowerCase().includes(kw) ||
                String(it.centerName || it.centerId || "").toLowerCase().includes(kw)
            );
        }
        setItems(list);
        setTotalPages(1);
        setPage(0);
    }, [allItems, q]);

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

    const openCreateDialog = async () => {
        setCreateForm(f => ({
            ...f,
            centerId: centerId || "",
            partId: f.partId || "",
            quantity: f.quantity ?? "",
            minQty: f.minQty ?? "",
            maxQty: f.maxQty ?? "",
        }));
        try {
            setPartLoading(true);
            const res = await axiosInstance.get("/parts/get-active");
            const list = Array.isArray(res?.data) ? res.data : (res?.data?.content || []);
            const opts = list.map(p => ({ id: p.id, partNo: p.partNo, partName: p.partName }));
            setPartOptions(opts);
        } catch (e) {
            console.error(e);
        } finally {
            setPartLoading(false);
        }
        setOpenCreate(true);
    };

    const sanitizeIntInput = (raw) => {
        let s = String(raw ?? "");
        s = s.replace(/[^0-9]/g, "");
        if (s === "") return "";
        return s.replace(/^0+(?=\d)/, "");
    };

    // (No search) — parts loaded once when opening the dialog

    const handleCreate = async () => {
        try {
            // chặn thiếu dữ liệu ngay trên FE
            const qty = Number(String(createForm.quantity || 0).toString().replace(/,/g, '.'));
            const minQ = Number(String(createForm.minQty || 0).toString().replace(/,/g, '.'));
            const maxQ = Number(String(createForm.maxQty || 0).toString().replace(/,/g, '.'));
            if (!createForm.centerId || !createForm.partId) {
                return notify("Vui lòng chọn Trung tâm và nhập Part ID", "warning");
            }
            if (Number.isNaN(qty) || Number.isNaN(minQ) || Number.isNaN(maxQ)) {
                return notify("Giá trị số không hợp lệ", "warning");
            }
            if (minQ < 0 || maxQ < 0 || qty < 0) {
                return notify("minQty/maxQty/quantity phải ≥ 0", "warning");
            }
            if (maxQ && maxQ < minQ) {
                return notify("maxQty phải ≥ minQty", "warning");
            }
            if (maxQ && qty > maxQ) {
                return notify("quantity không được vượt quá maxQty", "warning");
            }
            // Kiểm tra trùng trước khi gọi API
            const existed = (items || []).find(r => String(r.partId) === String(createForm.partId));
            if (existed) {
                notify(`Đã tồn tại tồn kho cho cặp ${existed.centerName || 'center'}/${existed.partName || 'part'} này`, "warning");
                return; // giữ nguyên form create để người dùng chỉnh lại
            }
            setLoading(true);
            const body = {
                centerId: createForm.centerId,
                partId: createForm.partId,
                quantity: qty,
                minQty: minQ,
                maxQty: maxQ,
            };
            await inventoryPartService.create(body);
            notify("Tạo inventory part thành công", "success");
            setOpenCreate(false);
            await reloadAll();
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message || e?.message || "";
            if (/đã tồn tại tồn kho|exists/i.test(msg)) {
                const existed = (items || []).find(r => String(r.partId) === String(createForm.partId));
                if (existed) {
                    notify(`Đã tồn tại tồn kho cho cặp ${existed.centerName || 'center'}/${existed.partName || 'part'} này`, "warning");
                    return; // giữ nguyên form create
                }
            }
            notify("Không thể tạo inventory part", "error");
        } finally {
            setLoading(false);
        }
    };

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

    const handleEdit = async () => {
        try {
            setLoading(true);
            const currentMin = Number(editing.minQty || 0);
            const currentMax = Number(editing.maxQty || 0);
            const currentQty = Number(editing.quantity || 0);

            const nextMin = editForm.minQty === "" || editForm.minQty === undefined ? currentMin : Number(editForm.minQty);
            const nextMax = editForm.maxQty === "" || editForm.maxQty === undefined ? currentMax : Number(editForm.maxQty);
            const nextQty = editForm.quantity === "" || editForm.quantity === undefined ? currentQty : Number(editForm.quantity);

            if ([nextMin, nextMax, nextQty].some(v => Number.isNaN(v))) {
                setLoading(false);
                return notify("Giá trị số không hợp lệ", "warning");
            }
            if (nextMin < 0 || nextMax < 0 || nextQty < 0) {
                setLoading(false);
                return notify("minQty/maxQty/quantity phải ≥ 0", "warning");
            }
            if (nextMax && nextMax < nextMin) {
                setLoading(false);
                return notify("maxQty phải ≥ minQty", "warning");
            }
            if (nextMax && nextQty > nextMax) {
                setLoading(false);
                return notify("quantity không được vượt quá maxQty", "warning");
            }

            const body = { minQty: nextMin, maxQty: nextMax, quantity: nextQty };
            await inventoryPartService.update(editing.id, body);
            notify("Cập nhật thành công", "success");
            setOpenEdit(false);
            await reloadAll();
        } catch (e) {
            console.error(e);
            notify("Không thể cập nhật", "error");
        } finally {
            setLoading(false);
        }
    };

    // removed adjust for Inventory Part view

    // removed adjust for Inventory Part view

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Quản lý tồn kho phụ tùng</Typography>

            {/* Toolbar */}
            <Grid container spacing={2} alignItems="center" mb={2}>
                <Grid item xs={12} md={3}>
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

                <Grid item xs={12} md={3}>
                    <Autocomplete
                        size="small"
                        options={parts}
                        getOptionLabel={(option) => option.partName || ""}
                        loading={partsLoading}
                        value={parts.find(p => p.id === selectedPartId) || null}
                        onChange={(event, newValue) => {
                            setSelectedPartId(newValue?.id || null);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Chọn Phụ tùng"
                                placeholder="Xem phụ tùng ở các trung tâm nào"
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                                {option.partName}
                            </li>
                        )}
                    />
                </Grid>

                <Grid item xs="auto">
                    <Tooltip title="Làm mới và xóa bộ lọc">
                        <IconButton
                            onClick={() => {
                                setSelectedPartId(null);
                                setCenterId("");
                                setQ("");
                                reloadAll();
                            }}
                            disabled={loading}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Grid>

                <Grid item xs={12} md={3}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm theo Center/partName"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: .6 }} /> }}
                    />
                </Grid>
                
                <Grid item xs="auto">
                    <Button
                        variant="outlined"
                        startIcon={<LotIcon />}
                        onClick={onSwitch}
                    >
                        Quản lý lô
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
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && items.length === 0 && (
                                <TableRow><TableCell colSpan={columns.length + 1} align="center">Chưa có dữ liệu</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

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

            {/* Dialog: Create Inventory Part */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
                <DialogTitle>Tạo Inventory Part</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} mt={1}>
                        {/* Trung tâm */}
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

                        {/* Part (Dropdown) */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Chọn phụ tùng"
                                value={createForm.partId || ""}
                                onChange={(e) => setCreateForm({ ...createForm, partId: e.target.value })}
                                disabled={partLoading}
                            >
                                <MenuItem value="">-- Chọn --</MenuItem>
                                {partOptions.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{`${p.partNo || ""} — ${p.partName || ""}`}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Quantity */}
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="text"
                                label="Quantity"
                                value={createForm.quantity}
                                onChange={(e) => setCreateForm({ ...createForm, quantity: sanitizeIntInput(e.target.value) })}
                            />
                        </Grid>

                        {/* Min/Max */}
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="text"
                                label="Min Qty"
                                value={createForm.minQty}
                                onChange={(e) => setCreateForm({ ...createForm, minQty: sanitizeIntInput(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="text"
                                label="Max Qty"
                                value={createForm.maxQty}
                                onChange={(e) => setCreateForm({ ...createForm, maxQty: sanitizeIntInput(e.target.value) })}
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
                                .map((k) => {
                                    const isNumeric = ["quantity", "minQty", "maxQty"].includes(k);
                                    const rawVal = typeof editForm[k] === "object" ? JSON.stringify(editForm[k]) : (editForm[k] ?? "");
                                    const value = (typeof rawVal === "number" && Number.isNaN(rawVal)) ? "" : rawVal;
                                    const disabled = !isNumeric; // chỉ cho phép sửa 3 trường số
                                    return (
                                        <Grid key={k} item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                type={isNumeric ? "number" : "text"}
                                                label={k}
                                                value={value}
                                                onChange={(e) => {
                                                    if (!isNumeric) return; // khoá các trường không phải nhập
                                                    let val = e.target.value;
                                                    setEditForm({ ...editForm, [k]: val === "" ? "" : Number(val) });
                                                }}
                                                disabled={disabled}
                                            />
                                        </Grid>
                                    );
                                })}
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

            {/* Dialog: Adjust Quantity removed for Inventory Part view */}

            {/* Snackbar */}
            <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}

/* ================= InventoryLotView ================= */
function InventoryLotView({ onSwitch }) {
    const [centers, setCenters] = useState([]);
    const [centerId, setCenterId] = useState("");
    const [manufacturerCenterId, setManufacturerCenterId] = useState("");

    const [allItems, setAllItems] = useState([]); // dữ liệu tổng ban đầu (tất cả inventory lots)
    const [items, setItems] = useState([]);
    const [summaryMode, setSummaryMode] = useState(false);
    const [summaryItems, setSummaryItems] = useState([]);
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
        partLotId: "",
        quantity: "",
    });
    const [selectedPartLot, setSelectedPartLot] = useState(null); // Lưu thông tin PartLot đã chọn để check serialized
    const [partLotOptions, setPartLotOptions] = useState([]);
    const [partLotLoading, setPartLotLoading] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [adjustForm, setAdjustForm] = useState({ inventoryLotId: "", delta: "", reason: "" });

    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    const notify = useCallback((message, severity = "info") => {
        setSnack({ open: true, message, severity });
    }, []);

    const columns = useMemo(() => {
        if (!items?.length) return [];
        const keys = Object.keys(items[0]);

        const hidden = new Set([
            "id",
            "centerId",
            "partId",
            "partLotId",
            "createAt",
            "belowMin",
            "__v",
        ]);

        return keys.filter((k) => !hidden.has(k));
    }, [items]);

    // Function để reload dữ liệu: dùng API listByCenterWithId nếu có centerId, getAll nếu không
    const reloadAll = useCallback(async () => {
        try {
            setLoading(true);
            let data;
            if (centerId) {
                // Dùng API filter theo center (server-side)
                data = await inventoryLotService.listByCenterWithId(centerId);
            } else {
                // Load tất cả nếu không chọn center
                data = await inventoryLotService.getAll();
            }
            const lots = Array.isArray(data) ? data : (data?.inventoryLots || data?.content || []);
            setAllItems(lots);
            setSummaryMode(false);
            setTotalPages(1);
            setPage(0);
        } catch (e) {
            console.error(e);
            notify("Lỗi tải inventory lots", "error");
        } finally {
            setLoading(false);
        }
    }, [notify, centerId]);

    // Load centers khi vào trang
    useEffect(() => {
        (async () => {
            try {
                const res = await centerService.getAll();
                const list = Array.isArray(res) ? res : (res?.content || []);
                setCenters(list);
                const m = list.find(c =>
                    String(c.type || "").toUpperCase() === "MANUFACTURER" ||
                    /manufacturer|evm|kho evm/i.test(String(c.name || ""))
                );
                if (m?.id) setManufacturerCenterId(m.id);
            } catch (e) {
                console.error(e);
                notify("Không tải được danh sách trung tâm", "error");
            }
        })();
    }, [notify]);

    // Event listeners cho shipment-received và inventory-center-reload
    useEffect(() => {
        const onReload = (ev) => {
            const cid = ev?.detail?.centerId;
            if (!cid) return;
            if (String(cid) === String(centerId)) {
                notify("Đã nhận sự kiện Receive. Đang cập nhật tồn kho...", "info");
                reloadAll();
            } else {
                notify(`Có cập nhật tồn kho từ center ${cid}. Bạn đang xem center khác.`, "info");
            }
        };
        window.addEventListener("shipment-received", onReload);
        window.addEventListener("inventory-center-reload", onReload);
        return () => {
            window.removeEventListener("shipment-received", onReload);
            window.removeEventListener("inventory-center-reload", onReload);
        };
    }, [centerId, reloadAll, notify]);

    // Tải inventory lots ban đầu khi vào trang
    useEffect(() => {
        reloadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần khi mount

    // Reload khi centerId thay đổi (dùng API listByCenterWithId)
    useEffect(() => {
        if (!summaryMode) {
            reloadAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centerId]);

    // Filter theo search text (client-side, vì search API có thể không hỗ trợ centerId)
    useEffect(() => {
        if (summaryMode) return; // Không filter khi đang ở summary mode
        
        let list = [...allItems];
        // Search text (nếu có)
        const kw = q.trim().toLowerCase();
        if (kw) {
            list = list.filter(it =>
                String(it.partName || it.part?.name || "").toLowerCase().includes(kw) ||
                String(it.centerName || it.centerId || "").toLowerCase().includes(kw) ||
                String(it.partNo || it.part?.partNo || "").toLowerCase().includes(kw)
            );
        }
        setItems(list);
        setTotalPages(1);
        setPage(0);
    }, [allItems, q, summaryMode]);

    // search API không sử dụng cho Lots (theo BE hiện tại)

    const openCreateDialog = async () => {
        setCreateForm((f) => ({ ...f, centerId: centerId || "", partLotId: "", quantity: "" }));
        setSelectedPartLot(null);
        try {
            setPartLotLoading(true);
            const res = await axiosInstance.get("/part-lots/get-active");
            const list = Array.isArray(res?.data) ? res.data : (res?.data?.content || []);
            const opts = list.map(l => ({ 
                id: l.id, 
                serialNo: l.serialNo, 
                batchNo: l.batchNo, 
                partName: l.partName,
                partId: l.partId,
                isSerialized: !!l.serialNo // PartLot có serialNo = serialized
            }));
            setPartLotOptions(opts);
        } catch (e) {
            console.error(e);
        } finally {
            setPartLotLoading(false);
        }
        setOpenCreate(true);
    };

    const handleCreate = async () => {
        try {
            const finalCenterId = createForm.centerId || centerId;
            const finalPartLotId = createForm.partLotId;
            const finalQuantity = Number(String(createForm.quantity).trim() || 0);
            
            if (!finalCenterId) {
                return notify("Hãy chọn trung tâm", "warning");
            }
            if (!finalPartLotId) {
                return notify("Hãy chọn Part Lot", "warning");
            }
            
            // Kiểm tra serialized/non-serialized
            const partLot = selectedPartLot || partLotOptions.find(p => p.id === finalPartLotId);
            const isSerialized = partLot?.isSerialized ?? !!partLot?.serialNo;
            const serialNo = partLot?.serialNo;
            
            if (isSerialized) {
                // Serialized: quantity phải = 1
                if (finalQuantity !== 1) {
                    return notify("Phụ tùng serialized chỉ có thể tạo với quantity = 1. Mỗi serial number là 1 đơn vị.", "warning");
                }
                
                // Kiểm tra SerialNo đã tồn tại trong toàn hệ thống chưa (không cho trùng ở 2 center)
                if (serialNo) {
                    try {
                        const allInventoryLots = await inventoryLotService.getAll();
                        const inventoryLotsArray = Array.isArray(allInventoryLots) 
                            ? allInventoryLots 
                            : (Array.isArray(allInventoryLots?.inventoryLots) ? allInventoryLots.inventoryLots : []);
                        
                        // Tìm Inventory Lot có cùng SerialNo (kiểm tra toàn hệ thống)
                        const existingInventoryLot = inventoryLotsArray.find(invLot => {
                            const invSerialNo = invLot.serialNo || invLot.partLotSerialNo || invLot.partLot?.serialNo;
                            return invSerialNo && String(invSerialNo).trim().toLowerCase() === String(serialNo).trim().toLowerCase();
                        });
                        
                        if (existingInventoryLot) {
                            const existingCenterName = existingInventoryLot.centerName || existingInventoryLot.center?.name || "center khác";
                            return notify(
                                `Serial No "${serialNo}" đã tồn tại ở "${existingCenterName}". Serial number phải unique toàn hệ thống.`,
                                "error"
                            );
                        }
                    } catch (e) {
                        console.warn("Không thể kiểm tra serialized unique:", e);
                        // Vẫn tiếp tục, để backend validate
                    }
                }
            } else {
                // Non-serialized: quantity phải > 0
                if (finalQuantity <= 0) {
                    return notify("Quantity phải lớn hơn 0", "warning");
                }
            }
            
            const body = {
                centerId: finalCenterId,
                partLotId: finalPartLotId,
                quantity: finalQuantity,
            };
            
            console.log("📦 Creating Inventory Lot:");
            console.log("  - Form State:", createForm);
            console.log("  - CenterId State:", centerId);
            console.log("  - Final Payload:", body);
            
            const result = await inventoryLotService.create(body);
            console.log("✅ Create success:", result);
            notify("Tạo lô tồn kho thành công", "success");
            setOpenCreate(false);
            setCreateForm({ centerId: "", partLotId: "", quantity: "" });
            setSelectedPartLot(null);
            await reloadAll();
        } catch (e) {
            console.error("❌ Create Inventory Lot Error:", e);
            console.error("❌ Error Response:", e?.response?.data);
            console.error("❌ Error Status:", e?.response?.status);
            console.error("❌ Error Details:", e?.response?.data?.details);
            
            let errorMsg = "Lỗi khi tạo lô tồn kho";
            if (e?.response?.data) {
                const errorData = e.response.data;
                let rawMessage = "";
                if (errorData.message) {
                    rawMessage = errorData.message;
                } else if (errorData.error) {
                    rawMessage = errorData.error;
                } else if (Array.isArray(errorData.details) && errorData.details.length > 0) {
                    rawMessage = errorData.details.map(d => d.message || d).join(", ");
                }
                
                // Format lại thông báo lỗi dài từ backend
                if (rawMessage.includes("Đã tồn tại InventoryLot") && rawMessage.includes("serialized")) {
                    errorMsg = "Part Lot serialized này đã có Inventory Lot ở center này. Mỗi Part Lot serial chỉ được có 1 Inventory Lot tại mỗi center.";
                } else if (rawMessage.includes("Serial No") && rawMessage.includes("đã tồn tại") && rawMessage.includes("unique toàn hệ thống")) {
                    // Format lại thông báo SerialNo duplicate từ BE (đã ngắn gọn hơn sau khi BE được cập nhật)
                    // Nếu BE trả về message đầy đủ, giữ nguyên; nếu dài quá thì format lại
                    if (rawMessage.length > 150) {
                        // Tìm SerialNo và Center name trong message
                        const serialMatch = rawMessage.match(/Serial No "([^"]+)"/);
                        const centerMatch = rawMessage.match(/ở "([^"]+)"/);
                        if (serialMatch && centerMatch) {
                            errorMsg = `Serial No "${serialMatch[1]}" đã tồn tại ở "${centerMatch[1]}". Serial number phải unique toàn hệ thống.`;
                        } else {
                            errorMsg = rawMessage;
                        }
                    } else {
                        errorMsg = rawMessage;
                    }
                } else if (rawMessage.includes("Serial No") || rawMessage.includes("Serial number")) {
                    // Giữ nguyên thông báo về Serial No
                    errorMsg = rawMessage;
                } else {
                    errorMsg = rawMessage;
                }
            } else if (e?.message) {
                errorMsg = e.message;
            }
            
            notify(errorMsg, "error");
        }
    };

    const openEditDialog = async (row) => {
        try {
            setLoading(true);
            const full = await inventoryLotService.get(row.id);
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

    const handleEdit = async () => {
        try {
            setLoading(true);
            const body = {
                quantity: Number(editForm.quantity ?? 0),
            };
            await inventoryLotService.update(editing.id, body);
            notify("Cập nhật thành công", "success");
            setOpenEdit(false);
            await reloadAll();
        } catch (e) {
            console.error(e);
            notify("Không thể cập nhật", "error");
        } finally {
            setLoading(false);
        }
    };

    const openAdjustDialog = (row) => {
        setAdjustForm({ inventoryLotId: row.id, delta: "", reason: "" });
        setOpenAdjust(true);
    };

    const handleAdjust = async () => {
        try {
            setLoading(true);
            await inventoryLotService.adjustQuantity(adjustForm);
            notify("Điều chỉnh tồn kho thành công", "success");
            setOpenAdjust(false);
            await reloadAll();
        } catch (e) {
            console.error(e);
            notify("Điều chỉnh thất bại", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>Quản lý tồn kho lô</Typography>

            {/* Toolbar */}
            <Grid container spacing={2} alignItems="center" mb={2}>
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
                    <Button variant="outlined" onClick={async () => {
                        if (!centerId) return notify("Hãy chọn trung tâm", "warning");
                        try { 
                            setLoading(true); 
                            const data = await inventoryLotService.summaryByCenter(centerId);
                            console.log("📊 Summary Data:", data);
                            const raw = Array.isArray(data) ? data : (data?.data || data?.content || []);
                            console.log("📊 Summary Items Raw:", raw);
                            
                            // Normalize data: handle both camelCase and snake_case
                            const list = raw.map(item => ({
                                partName: item.partName || item.part_name || item.part?.name || "—",
                                partNumber: item.partNumber || item.part_number || item.partNo || item.part?.partNo || "—",
                                partCategory: item.partCategory || item.part_category || item.part?.category || item.category || "—",
                                totalQuantity: item.totalQuantity ?? item.total_quantity ?? 0,
                                availableLots: item.availableLots ?? item.available_lots ?? 0,
                            }));
                            
                            console.log("📊 Summary Items Normalized:", list);
                            setSummaryItems(list); 
                            setSummaryMode(true);
                            notify(`Đã tải tổng hợp: ${list.length} items`, "success");
                        } catch (e) { 
                            console.error("Error loading summary:", e); 
                            notify("Lỗi tải tổng hợp tồn kho", "error"); 
                        } finally { 
                            setLoading(false); 
                        }
                    }}>Tổng hợp theo Center</Button>
                </Grid>
                <Grid item xs="auto">
                    <Button
                        variant="outlined"
                        startIcon={<PartIcon />}
                        onClick={onSwitch}
                    >
                        Quản lý phụ tùng
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
                                {summaryMode ? (
                                    <>
                                        <TableCell>partName</TableCell>
                                        <TableCell>partNumber</TableCell>
                                        <TableCell>partCategory</TableCell>
                                        <TableCell align="right">totalQuantity</TableCell>
                                        <TableCell align="right">availableLots</TableCell>
                                    </>
                                ) : (
                                    <>
                                        {columns.map((c) => <TableCell key={c}>{c}</TableCell>)}
                                        <TableCell align="center">Actions</TableCell>
                                    </>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {summaryMode ? (
                                summaryItems.length > 0 ? (
                                    summaryItems.map((s, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{s.partName || s.part_name || "—"}</TableCell>
                                            <TableCell>{s.partNumber || s.part_number || s.partNo || "—"}</TableCell>
                                            <TableCell>{s.partCategory || s.part_category || s.category || "—"}</TableCell>
                                            <TableCell align="right">{s.totalQuantity ?? s.total_quantity ?? 0}</TableCell>
                                            <TableCell align="right">{s.availableLots ?? s.available_lots ?? 0}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">Chưa có dữ liệu</TableCell>
                                    </TableRow>
                                )
                            ) : (
                                items.map((row) => {
                                    // Xác định serialized vs non-serialized
                                    const hasSerialNo = row.serialNo || row.partLotSerialNo || row.partLot?.serialNo;
                                    const hasBatchNo = row.batchNo || row.partLotBatchNo || row.partLot?.batchNo;
                                    const isSerialized = !!hasSerialNo;
                                    
                                    return (
                                        <TableRow key={row.id} hover>
                                            {columns.map((c) => {
                                                let displayValue = "";
                                                if (typeof row[c] === "object") {
                                                    displayValue = JSON.stringify(row[c]);
                                                } else {
                                                    const rawValue = row[c];
                                                    // Xử lý đặc biệt cho serialNo
                                                    if ((c === "serialNo" || c === "partLotSerialNo") && (!rawValue || rawValue === "null" || rawValue === null)) {
                                                        displayValue = isSerialized ? "—" : "N/A (Non-serialized)";
                                                    }
                                                    // Xử lý đặc biệt cho batchNo
                                                    else if ((c === "batchNo" || c === "partLotBatchNo") && (!rawValue || rawValue === "null" || rawValue === null)) {
                                                        displayValue = "—";
                                                    }
                                                    else {
                                                        displayValue = String(rawValue ?? "");
                                                    }
                                                }
                                                return (
                                                    <TableCell key={c}>
                                                        {displayValue}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                                <Tooltip title="Chi tiết / Sửa">
                                                    <IconButton onClick={() => openEditDialog(row)}><EditIcon /></IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                            {!loading && items.length === 0 && (
                                <TableRow><TableCell colSpan={columns.length + 1} align="center">Chưa có dữ liệu</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {!loading && totalPages > 1 && (
                    <Box display="flex" justifyContent="center" alignItems="center" gap={2} p={2}>
                        <Button variant="outlined" disabled={page === 0} onClick={() => { setPage(p => p - 1); handleSearch(); }}>
                            Trang trước
                        </Button>
                        <Typography> Trang {page + 1} / {totalPages}</Typography>
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
                <DialogTitle>Tạo Inventory Lot</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} mt={1}>
                        {/* Trung tâm */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Trung tâm"
                                value={createForm.centerId || centerId || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCreateForm({ ...createForm, centerId: val || "" });
                                }}
                            >
                                <MenuItem value="">-- Chọn trung tâm --</MenuItem>
                                {centers.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Part Lot (Dropdown by Name) */}
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={partLotOptions}
                                loading={partLotLoading}
                                getOptionLabel={(o) => {
                                    if (!o || !o.id) return "";
                                    const typeLabel = o.serialNo ? "Serialized" : (o.batchNo ? "Non-serialized" : "Lot");
                                    return `${o.serialNo ? `SN:${o.serialNo}` : (o.batchNo ? `BN:${o.batchNo}` : "Lot")} — ${o.partName || ""} (${typeLabel})`;
                                }}
                                value={partLotOptions.find(o => o.id === createForm.partLotId) || null}
                                onChange={(e, v) => {
                                    console.log("🔍 Part Lot Selected:", v);
                                    const isSerialized = v?.isSerialized ?? !!v?.serialNo;
                                    setSelectedPartLot(v);
                                    setCreateForm({ 
                                        ...createForm, 
                                        partLotId: v?.id || "",
                                        // Auto-set quantity = 1 nếu là serialized
                                        quantity: isSerialized ? "1" : createForm.quantity
                                    });
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Chọn Part Lot" placeholder="SN/Batch — PartName" />
                                )}
                            />
                        </Grid>

                        {/* quantity */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="text"
                                label="Quantity"
                                value={createForm.quantity}
                                onChange={(e) => {
                                    const val = String(e.target.value).replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
                                    const isSerialized = selectedPartLot?.isSerialized ?? !!selectedPartLot?.serialNo;
                                    // Nếu serialized, chỉ cho phép nhập 1
                                    if (isSerialized && val !== "" && val !== "1") {
                                        return; // Không cho phép nhập giá trị khác 1
                                    }
                                    setCreateForm({ ...createForm, quantity: val });
                                }}
                                disabled={selectedPartLot?.isSerialized ?? !!selectedPartLot?.serialNo}
                                helperText={
                                    selectedPartLot 
                                        ? (selectedPartLot.isSerialized ?? !!selectedPartLot.serialNo 
                                            ? "⚠️ Serialized: quantity phải = 1 (mỗi serial number là 1 đơn vị)" 
                                            : "Non-serialized: có thể nhập quantity > 1")
                                        : "Chọn Part Lot trước"
                                }
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

            {/* Dialog: Edit Inventory Lot */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
                <DialogTitle>Cập nhật Inventory Lot</DialogTitle>
                <DialogContent>
                    {editing ? (
                        <Grid container spacing={2} mt={1}>
                            {[
                                "centerName",
                                "partLotBatchNo",
                                "partLotSerialNo",
                                "partName",
                                "partNumber",
                                "partCategory",
                                "quantity",
                            ].map((k) => (
                                <Grid key={k} item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label={k}
                                        value={
                                            typeof editForm[k] === "object"
                                                ? JSON.stringify(editForm[k])
                                                : editForm[k] ?? ""
                                        }
                                        onChange={(e) => {
                                            if (k === "quantity") {
                                                setEditForm({ ...editForm, quantity: Number(e.target.value) });
                                            }
                                        }}
                                        disabled={k !== "quantity"} // 🔒 chỉ cho sửa quantity
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box p={2} textAlign="center">
                            <InfoOutlined /> Chọn 1 dòng để sửa
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>Đóng</Button>
                    <Button
                        variant="contained"
                        onClick={handleEdit}
                        disabled={loading || !editing}
                    >
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
                            <TextField label="inventoryLotId" fullWidth value={adjustForm.inventoryLotId} disabled />
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

/* ================= Component chính ================= */
export default function InventoryPartsPage() {
    
    const [view, setView] = useState("part"); // "part" | "lot"

    return (
        <Box sx={{ py: 2 }}>
            {view === "part"
                ? <InventoryPartView onSwitch={() => setView("lot")} />
                : <InventoryLotView onSwitch={() => setView("part")} />
            }
        </Box>
    );
}