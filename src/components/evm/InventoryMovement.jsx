import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    Stack,
    Divider,
    Chip,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    CircularProgress,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    TablePagination,
} from "@mui/material";
import {
    CompareArrows as CompareArrowsIcon,
    FilterAlt as FilterAltIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    LocalShipping as LocalShippingIcon,
    Replay as ReplayIcon,
    Inventory2 as InventoryIcon,
    ExitToApp as ExitToAppIcon,
    AssignmentReturn as AssignmentReturnIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import inventoryMovementService from "../../services/inventoryMovementService";
import centerService from "../../services/centerService";

const directionLabels = {
    IN: "Nhập kho",
    OUT: "Xuất kho",
};

const directionColors = {
    IN: "success",
    OUT: "error",
};

const reasonLabels = {
    SHIPMENT_IN: "Nhập từ nhà máy",
    SHIPMENT_OUT: "Xuất đi trung tâm",
    SERVICE_USE: "Xuất cho kỹ thuật viên",
    RETURN: "Trả linh kiện",
    ADJUSTMENT: "Điều chỉnh kho",
};

const reasonIcons = {
    SHIPMENT_IN: <LocalShippingIcon fontSize="small" />,
    SHIPMENT_OUT: <ExitToAppIcon fontSize="small" />,
    SERVICE_USE: <InventoryIcon fontSize="small" />,
    RETURN: <AssignmentReturnIcon fontSize="small" />,
    ADJUSTMENT: <ReplayIcon fontSize="small" />,
};

const directionOptions = [
    { value: "", label: "Tất cả" },
    { value: "IN", label: directionLabels.IN },
    { value: "OUT", label: directionLabels.OUT },
];

const reasonOptions = [
    { value: "", label: "Tất cả" },
    ...Object.entries(reasonLabels).map(([value, label]) => ({ value, label })),
];

const initialFilters = {
    centerId: "",
    direction: "",
    reason: "",
    startDate: "",
    endDate: "",
};

export default function InventoryMovement() {
    const [centers, setCenters] = useState([]);
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [movements, setMovements] = useState([]);
    const [meta, setMeta] = useState({ totalPages: 1, totalElements: 0, number: 0 });
    const [summary, setSummary] = useState({
        total: 0,
        pageTotal: 0,
        byDirection: {},
        byReason: {},
    });
    const [loading, setLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailMovement, setDetailMovement] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });

    useEffect(() => {
        loadCenters();
    }, []);

    useEffect(() => {
        loadMovements({ targetPage: page });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        size,
        appliedFilters.centerId,
        appliedFilters.direction,
        appliedFilters.reason,
        appliedFilters.startDate,
        appliedFilters.endDate,
    ]);

    const loadCenters = async () => {
        try {
            const res = await centerService.getAll();
            const raw = Array.isArray(res) ? res : res?.data || res?.content || [];
            const normalized = raw.map((c) => ({
                id: c.id || c.centerId || c.code,
                name: c.name || c.centerName || c.displayName || c.code || "—",
            }));
            setCenters(normalized);
        } catch (err) {
            console.error("[InventoryMovement] loadCenters error:", err);
            setSnack({
                open: true,
                message: err?.response?.data?.message || "Không thể tải danh sách trung tâm",
                severity: "error",
            });
        }
    };

    const loadMovements = async ({ targetPage = 0 } = {}) => {
        setLoading(true);
        try {
            const params = {
                centerId: appliedFilters.centerId || undefined,
                direction: appliedFilters.direction || undefined,
                reason: appliedFilters.reason || undefined,
                startDate: appliedFilters.startDate || undefined,
                endDate: appliedFilters.endDate || undefined,
                page: targetPage,
                size,
            };

            const res = await inventoryMovementService.search(params);

            let list = [];
            let totalPages = 1;
            let totalElements = 0;
            let currentPage = targetPage;

            if (Array.isArray(res.data)) {
                list = res.data;
                totalElements = list.length;
                currentPage = 0;
            } else if (res.data?.content) {
                list = res.data.content;
                totalPages = res.data.totalPages ?? 1;
                totalElements = res.data.totalElements ?? list.length;
                currentPage = res.data.number ?? targetPage;
            } else if (res.data) {
                list = [res.data];
                totalElements = 1;
                currentPage = 0;
            }

            setMovements(list);
            setMeta({ totalPages, totalElements, number: currentPage });

            const byDirection = list.reduce((acc, mov) => {
                const dir = (mov.direction || "").toUpperCase();
                if (!dir) return acc;
                acc[dir] = (acc[dir] || 0) + 1;
                return acc;
            }, {});

            const byReason = list.reduce((acc, mov) => {
                const reason = (mov.reason || "").toUpperCase();
                if (!reason) return acc;
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
            }, {});

            setSummary({
                total: totalElements,
                pageTotal: list.length,
                byDirection,
                byReason,
            });
        } catch (err) {
            console.error("[InventoryMovement] loadMovements error:", err);
            setSnack({
                open: true,
                message: err?.response?.data?.message || err.message || "Không thể tải dữ liệu luân chuyển kho",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        setAppliedFilters(filters);
        setPage(0);
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
        setPage(0);
    };

    const handleViewDetail = async (movement) => {
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const res = await inventoryMovementService.getById(movement.id);
            setDetailMovement(res.data || movement);
        } catch (err) {
            console.error("[InventoryMovement] getById error:", err);
            setDetailMovement(movement);
            setSnack({
                open: true,
                message: err?.response?.data?.message || "Không thể tải chi tiết movement",
                severity: "error",
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const aggregatedByCenter = useMemo(() => {
        const map = movements.reduce((acc, mov) => {
            const center = mov.centerName || mov.centerId || "Không rõ trung tâm";
            if (!acc[center]) {
                acc[center] = { total: 0, in: 0, out: 0 };
            }
            acc[center].total += 1;
            const dir = (mov.direction || "").toUpperCase();
            if (dir === "IN") acc[center].in += 1;
            if (dir === "OUT") acc[center].out += 1;
            return acc;
        }, {});

        return Object.entries(map)
            .map(([center, stats]) => ({ center, ...stats }))
            .sort((a, b) => b.total - a.total);
    }, [movements]);

    const aggregatedReasons = useMemo(() => {
        return Object.entries(summary.byReason || {})
            .map(([reason, count]) => ({
                reason,
                label: reasonLabels[reason] || reason,
                count,
            }))
            .sort((a, b) => b.count - a.count);
    }, [summary.byReason]);

    const detailLotsDisplay = useMemo(() => {
        if (!detailMovement) return [];

        const lotsSource =
            Array.isArray(detailMovement.partLots) && detailMovement.partLots.length > 0
                ? detailMovement.partLots
                : [
                      {
                          partNo: detailMovement.partNo,
                          partName: detailMovement.partName,
                          serialNo: detailMovement.serialNo,
                          batchNo: detailMovement.batchNo,
                          quantity:
                              detailMovement.totalQuantity ??
                              detailMovement.quantity ??
                              (Array.isArray(detailMovement.partLots)
                                  ? detailMovement.partLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0)
                                  : 0),
                      },
                  ].filter((lot) => lot.partNo || lot.partName || lot.serialNo || lot.batchNo);

        const fallbackPartNo =
            detailMovement.partNo ||
            detailMovement.partLotNo ||
            detailMovement.part?.partNo ||
            detailMovement.part?.code ||
            detailMovement.partId ||
            "";

        const fallbackPartName =
            detailMovement.partName ||
            detailMovement.part?.partName ||
            detailMovement.part?.name ||
            detailMovement.partId ||
            "";

        return lotsSource.map((lot, idx) => {
            const partNo =
                lot.partNo ||
                lot.partLotNo ||
                lot.partCode ||
                lot.part?.partNo ||
                lot.part?.code ||
                lot.partLot?.partNo ||
                fallbackPartNo ||
                "";

            const partName =
                lot.partName ||
                lot.part?.partName ||
                lot.part?.name ||
                lot.partLot?.partName ||
                fallbackPartName ||
                "";

            const serial =
                lot.partLotSerialNo ||
                lot.serialNo ||
                lot.serial_no ||
                lot.serialNumber ||
                lot.partLot?.serialNo ||
                lot.part?.serialNo ||
                "";

            const batch =
                lot.partLotBatchNo ||
                lot.batchNo ||
                lot.batch_no ||
                lot.batchNumber ||
                lot.partLot?.batchNo ||
                lot.part?.batchNo ||
                "";

            return {
                key: lot.partLotId || lot.id || `${idx}`,
                partNo: partNo || "—",
                partName: partName || "—",
                serial: serial || "—",
                batch: batch || "—",
                quantity: lot.quantity ?? 0,
            };
        });
    }, [detailMovement]);

    const formatDate = (value) => {
        if (!value) return "—";
        return dayjs(value).format("DD/MM/YYYY HH:mm");
    };

    const renderEmptyState = () => {
        if (loading) {
            return (
                <TableRow>
                    <TableCell colSpan={8}>
                        <Box display="flex" justifyContent="center" py={3}>
                            <CircularProgress size={28} />
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }
        return (
            <TableRow>
                <TableCell colSpan={8}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                    </Typography>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                </Grid>

                <Grid item xs={12} md={8}>
                    
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Lịch sử luân chuyển kho
                </Typography>
                

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Thời gian</TableCell>
                            <TableCell>Trung tâm</TableCell>
                            <TableCell>Hướng</TableCell>
                            <TableCell>Lý do</TableCell>
                            <TableCell>Phiếu/Lịch hẹn</TableCell>
                            <TableCell>Phụ tùng</TableCell>
                            <TableCell align="right">Số lượng</TableCell>
                            <TableCell align="center">Chi tiết</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {movements.length === 0
                            ? renderEmptyState()
                            : movements.map((mov) => {
                                  const direction = (mov.direction || "").toUpperCase();
                                  const reason = (mov.reason || "").toUpperCase();
                                  const totalQty =
                                      mov.totalQuantity ??
                                      (Array.isArray(mov.partLots)
                                          ? mov.partLots.reduce((sum, lot) => sum + (lot.quantity || 0), 0)
                                          : mov.quantity || 0);
                                  return (
                                      <TableRow key={mov.id || `${mov.centerId}_${mov.movedAt}`}>
                                          <TableCell>{formatDate(mov.movedAt)}</TableCell>
                                          <TableCell>{mov.centerName || mov.centerId || "—"}</TableCell>
                                          <TableCell>
                                              {direction ? (
                                                  <Chip
                                                      size="small"
                                                      label={directionLabels[direction] || direction}
                                                      color={directionColors[direction] || "default"}
                                                  />
                                              ) : (
                                                  "—"
                                              )}
                                          </TableCell>
                                          <TableCell>
                                              <Stack direction="row" spacing={1} alignItems="center">
                                                  {reasonIcons[reason] || <ReplayIcon fontSize="small" color="disabled" />}
                                                  <Typography variant="body2">
                                                      {reasonLabels[reason] || mov.reason || "—"}
                                                  </Typography>
                                              </Stack>
                                          </TableCell>
                                          <TableCell>
                                              <Typography variant="body2" fontWeight={600}>
                                                  {mov.appointmentNote || mov.appointmentId || mov.shipmentCode || "—"}
                                              </Typography>
                                              {mov.vin && (
                                                  <Typography variant="caption" color="text.secondary">
                                                      VIN: {mov.vin}
                                                  </Typography>
                                              )}
                                          </TableCell>
                                          <TableCell>{mov.partName || mov.partNo || "—"}</TableCell>
                                          <TableCell align="right">{totalQty}</TableCell>
                                          <TableCell align="center">
                                              <Tooltip title="Xem chi tiết">
                                                  <IconButton size="small" onClick={() => handleViewDetail(mov)}>
                                                      <VisibilityIcon fontSize="small" />
                                                  </IconButton>
                                              </Tooltip>
                                          </TableCell>
                                      </TableRow>
                                  );
                              })}
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    count={meta.totalElements ?? movements.length}
                    page={meta.number ?? page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={size}
                    onRowsPerPageChange={(event) => {
                        const newSize = parseInt(event.target.value, 10);
                        setSize(newSize);
                        setPage(0);
                    }}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    labelRowsPerPage="Số dòng mỗi trang"
                />
            </Paper>


            <Dialog
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setDetailMovement(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Chi tiết nghiệp vụ</DialogTitle>
                <DialogContent dividers>
                    {detailLoading || !detailMovement ? (
                        <Box display="flex" justifyContent="center" py={3}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Thời gian:
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                    {formatDate(detailMovement.movedAt)}
                                </Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Trung tâm
                                    </Typography>
                                    <Typography variant="body1">
                                        {detailMovement.centerName || detailMovement.centerId || "—"}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Hướng
                                    </Typography>
                                    <Chip
                                        size="small"
                                        color={directionColors[(detailMovement.direction || "").toUpperCase()] || "default"}
                                        label={directionLabels[(detailMovement.direction || "").toUpperCase()] || "—"}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Lý do
                                    </Typography>
                                    <Chip
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        icon={
                                            reasonIcons[(detailMovement.reason || "").toUpperCase()] || (
                                                <ReplayIcon fontSize="small" />
                                            )
                                        }
                                        label={
                                            reasonLabels[(detailMovement.reason || "").toUpperCase()] ||
                                            detailMovement.reason ||
                                            "—"
                                        }
                                    />
                                </Grid>
                            </Grid>
                            <Divider />
                            <Typography variant="subtitle2" color="text.secondary">
                                Phụ tùng liên quan
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Part No</TableCell>
                                        <TableCell>Tên phụ tùng</TableCell>
                                        <TableCell>Serial</TableCell>
                                        <TableCell>Batch</TableCell>
                                        <TableCell align="right">Số lượng</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailLotsDisplay.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                                                    Không có thông tin chi tiết lot.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        detailLotsDisplay.map((lot) => (
                                            <TableRow key={lot.key}>
                                                <TableCell>{lot.partNo}</TableCell>
                                                <TableCell>{lot.partName}</TableCell>
                                                <TableCell>{lot.serial}</TableCell>
                                                <TableCell>{lot.batch}</TableCell>
                                                <TableCell align="right">{lot.quantity}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {detailMovement.note && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Ghi chú
                                    </Typography>
                                    <Typography variant="body2">{detailMovement.note}</Typography>
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
            >
                <Alert
                    severity={snack.severity}
                    onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
