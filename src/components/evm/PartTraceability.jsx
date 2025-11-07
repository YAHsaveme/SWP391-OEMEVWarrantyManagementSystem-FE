// src/components/evm/PartTraceability.jsx
import React, { useState, useEffect } from "react";
import {
    Box, Container, Paper, Typography, TextField, Button, Stack,
    Table, TableHead, TableRow, TableCell, TableBody, Chip,
    CircularProgress, Snackbar, Alert, Card, CardContent, Grid,
    Divider, Accordion, AccordionSummary, AccordionDetails,
    Autocomplete
} from "@mui/material";
import {
    Search as SearchIcon,
    ExpandMore as ExpandMoreIcon,
    History as HistoryIcon,
    Build as BuildIcon,
    LocalShipping as ShippingIcon,
} from "@mui/icons-material";
import inventoryMovementService from "../../services/inventoryMovementService";
import axiosInstance from "../../services/axiosInstance";

/**
 * PartTraceability.jsx
 * 
 * Tính năng truy xuất nguồn gốc phụ tùng dựa trên VIN
 * Hiển thị:
 * - Ngày sản xuất
 * - Nhà cung cấp
 * - Lần thay thế trước
 * - Xe liên kết
 * - Lịch sử di chuyển
 */

const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
};

export default function PartTraceability() {
    const [vin, setVin] = useState("");
    const [vinOptions, setVinOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [traceabilityData, setTraceabilityData] = useState([]);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    // Load VIN options for autocomplete
    useEffect(() => {
        async function loadVins() {
            try {
                // Dùng endpoint /api/vehicles/get-all (giống VehiclesPage.jsx)
                const res = await axiosInstance.get("/vehicles/get-all", { validateStatus: () => true });
                
                if (res.status >= 400) {
                    console.warn("Failed to load VINs:", res.status, res.data);
                    setVinOptions([]);
                    return;
                }
                
                const vehicles = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
                const vins = vehicles
                    .filter(v => v?.vin)
                    .map(v => ({ label: v.vin, value: v.vin }));
                setVinOptions(vins);
            } catch (err) {
                console.warn("Failed to load VINs:", err);
                // Nếu lỗi, để autocomplete freeSolo (user có thể nhập tay)
                setVinOptions([]);
            }
        }
        loadVins();
    }, []);

    const handleSearch = async () => {
        if (!vin || vin.trim().length === 0) {
            setSnack({ open: true, message: "Vui lòng nhập VIN để tra cứu.", severity: "warning" });
            return;
        }

        setLoading(true);
        try {
            const res = await inventoryMovementService.traceabilityByVin(vin.trim().toUpperCase());
            const movements = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            
            // Group movements by partId để hiển thị theo từng part
            const partsMap = new Map();
            
            movements.forEach((movement) => {
                const partKey = movement.partId || movement.partNo;
                if (!partsMap.has(partKey)) {
                    partsMap.set(partKey, {
                        partId: movement.partId,
                        partNo: movement.partNo,
                        partName: movement.partName,
                        // Lấy thông tin từ partLots đầu tiên
                        productionDate: movement.partLots?.[0]?.mfgDate || null,
                        serialNo: movement.partLots?.[0]?.partLotSerialNo || null,
                        batchNo: movement.partLots?.[0]?.partLotBatchNo || null,
                        // Tất cả partLots
                        partLots: movement.partLots || [],
                        // Movements cho part này
                        movements: []
                    });
                }
                
                // Thêm movement vào danh sách
                partsMap.get(partKey).movements.push({
                    date: movement.movedAt,
                    direction: movement.direction,
                    reason: movement.reason,
                    centerName: movement.centerName || movement.centerId,
                    note: movement.note,
                    appointmentNote: movement.appointmentNote
                });
            });
            
            const groupedData = Array.from(partsMap.values());
            setTraceabilityData(groupedData);
            
            if (groupedData.length === 0) {
                setSnack({ open: true, message: `Không tìm thấy thông tin truy xuất cho VIN: ${vin}`, severity: "info" });
            } else {
                setSnack({ open: true, message: `Tìm thấy ${groupedData.length} phụ tùng cho VIN: ${vin}`, severity: "success" });
            }
        } catch (err) {
            console.error("Traceability search failed:", err);
            const msg = err?.response?.data?.message || err?.message || "Lỗi tra cứu nguồn gốc phụ tùng";
            setSnack({ open: true, message: msg, severity: "error" });
            setTraceabilityData([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl">
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <BuildIcon color="primary" sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            Truy xuất nguồn gốc phụ tùng
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Tra cứu lịch sử đầy đủ của phụ tùng theo VIN
                        </Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 3 }} />

                {/* Search Section */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Autocomplete
                                freeSolo
                                options={vinOptions}
                                getOptionLabel={(option) => typeof option === "string" ? option : option.label || option.value || ""}
                                value={vin}
                                onChange={(_, newValue) => {
                                    const val = typeof newValue === "string" ? newValue : (newValue?.value || newValue?.label || "");
                                    setVin(val);
                                }}
                                onInputChange={(_, newInputValue) => setVin(newInputValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="VIN (Vehicle Identification Number)"
                                        placeholder="Nhập VIN để tra cứu"
                                        fullWidth
                                        size="small"
                                        inputProps={{
                                            ...params.inputProps,
                                            style: { fontFamily: "monospace", textTransform: "uppercase" },
                                            maxLength: 17
                                        }}
                                    />
                                )}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                                onClick={handleSearch}
                                disabled={loading || !vin || vin.trim().length === 0}
                                sx={{ minWidth: 140, height: 40 }}
                            >
                                Tra cứu
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Results Section */}
                {traceabilityData.length > 0 && (
                    <Box>
                        <Typography variant="h6" fontWeight={600} mb={2}>
                            Kết quả tra cứu ({traceabilityData.length} phụ tùng)
                        </Typography>

                        <Stack spacing={2}>
                            {traceabilityData.map((part, idx) => (
                                <Accordion key={idx} defaultExpanded={idx === 0}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", pr: 2 }}>
                                            <BuildIcon color="primary" />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {part.partName || part.partNo || `Phụ tùng #${idx + 1}`}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {part.partNo && `Mã: ${part.partNo}`}
                                                    {part.serialNo && ` · Serial: ${part.serialNo}`}
                                                    {part.batchNo && ` · Batch: ${part.batchNo}`}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            {/* Thông tin cơ bản */}
                                            <Grid item xs={12} md={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" fontWeight={600} mb={2} color="primary">
                                                            Thông tin cơ bản
                                                        </Typography>
                                                        <Stack spacing={1.5}>
                                                            {part.productionDate && (
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Ngày sản xuất</Typography>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {new Date(part.productionDate).toLocaleDateString("vi-VN")}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {part.partLots && part.partLots.length > 0 && (
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Part Lots ({part.partLots.length})</Typography>
                                                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                                        {part.partLots.map((lot, lotIdx) => (
                                                                            <Box key={lotIdx} sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                                                                                {lot.partLotSerialNo && (
                                                                                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                                                                        <strong>Serial:</strong> {lot.partLotSerialNo}
                                                                                    </Typography>
                                                                                )}
                                                                                {lot.partLotBatchNo && (
                                                                                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                                                                        <strong>Batch:</strong> {lot.partLotBatchNo}
                                                                                    </Typography>
                                                                                )}
                                                                                {lot.mfgDate && (
                                                                                    <Typography variant="body2">
                                                                                        <strong>Mfg Date:</strong> {new Date(lot.mfgDate).toLocaleDateString("vi-VN")}
                                                                                    </Typography>
                                                                                )}
                                                                                {lot.quantity && (
                                                                                    <Typography variant="body2">
                                                                                        <strong>Số lượng:</strong> {lot.quantity}
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                        ))}
                                                                    </Stack>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Lần thay thế trước */}
                                            <Grid item xs={12} md={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" fontWeight={600} mb={2} color="primary">
                                                            Lần thay thế trước
                                                        </Typography>
                                                        {part.previousReplacement ? (
                                                            <Stack spacing={1.5}>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Ngày thay thế</Typography>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {fmtDate(part.previousReplacement.date)}
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">VIN xe trước</Typography>
                                                                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
                                                                        {part.previousReplacement.vin || "—"}
                                                                    </Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Lý do</Typography>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {part.previousReplacement.reason || "—"}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Không có thông tin
                                                            </Typography>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Xe liên kết */}
                                            <Grid item xs={12}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2" fontWeight={600} mb={2} color="primary">
                                                            Xe liên kết
                                                        </Typography>
                                                        {part.linkedVehicles && part.linkedVehicles.length > 0 ? (
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell><strong>VIN</strong></TableCell>
                                                                        <TableCell><strong>Ngày lắp đặt</strong></TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {part.linkedVehicles.map((vehicle, vIdx) => (
                                                                        <TableRow key={vIdx}>
                                                                            <TableCell sx={{ fontFamily: "monospace" }}>
                                                                                {vehicle.vin}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {fmtDate(vehicle.installedDate)}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Không có xe liên kết
                                                            </Typography>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Lịch sử di chuyển */}
                                            <Grid item xs={12}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                                            <HistoryIcon color="primary" fontSize="small" />
                                                            <Typography variant="subtitle2" fontWeight={600} color="primary">
                                                                Lịch sử di chuyển
                                                            </Typography>
                                                        </Stack>
                                                        {part.movements && part.movements.length > 0 ? (
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        <TableCell><strong>Ngày</strong></TableCell>
                                                                        <TableCell><strong>Hướng</strong></TableCell>
                                                                        <TableCell><strong>Lý do</strong></TableCell>
                                                                        <TableCell><strong>Trung tâm</strong></TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {part.movements.map((movement, mIdx) => (
                                                                        <TableRow key={mIdx}>
                                                                            <TableCell>{fmtDate(movement.date)}</TableCell>
                                                                            <TableCell>
                                                                                <Chip
                                                                                    label={movement.direction === "IN" ? "Nhập kho" : "Xuất kho"}
                                                                                    color={movement.direction === "IN" ? "success" : "warning"}
                                                                                    size="small"
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell>{movement.reason || "—"}</TableCell>
                                                                            <TableCell>{movement.centerName || movement.centerId || "—"}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Không có lịch sử di chuyển
                                                            </Typography>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}

                {/* Empty State */}
                {!loading && traceabilityData.length === 0 && vin && (
                    <Card variant="outlined">
                        <CardContent sx={{ textAlign: "center", py: 4 }}>
                            <HistoryIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" mb={1}>
                                Chưa có dữ liệu
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Nhập VIN và nhấn "Tra cứu" để xem thông tin truy xuất nguồn gốc phụ tùng
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Paper>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: "100%" }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

