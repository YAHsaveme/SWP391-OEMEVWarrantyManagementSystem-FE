import React from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    IconButton,
    Divider,
} from "@mui/material";
import {
    Search,
    FilterList,
    Visibility,
    CheckCircle,
    Cancel,
    HourglassEmpty,
} from "@mui/icons-material";

export default function WarrantyRequests() {
    const requests = [
        {
            id: "WR-2024-001",
            vin: "VIN001234567890",
            model: "Model X",
            issue: "Pin sụt dung lượng",
            serviceCenter: "Trung tâm Hà Nội",
            status: "Đang xử lý",
            cost: "₫15,000,000",
            date: "15/03/2024",
            priority: "Cao",
        },
        {
            id: "WR-2024-002",
            vin: "VIN001234567891",
            model: "Model Y",
            issue: "Lỗi BMS",
            serviceCenter: "Trung tâm TP.HCM",
            status: "Chờ phê duyệt",
            cost: "₫8,500,000",
            date: "14/03/2024",
            priority: "Trung bình",
        },
        {
            id: "WR-2024-003",
            vin: "VIN001234567892",
            model: "Model X",
            issue: "Động cơ kêu bất thường",
            serviceCenter: "Trung tâm Đà Nẵng",
            status: "Hoàn thành",
            cost: "₫12,000,000",
            date: "12/03/2024",
            priority: "Thấp",
        },
    ];

    const getStatusChip = (status) => {
        switch (status) {
            case "Hoàn thành":
                return <Chip label="Hoàn thành" color="success" icon={<CheckCircle />} />;
            case "Đang xử lý":
                return <Chip label="Đang xử lý" color="info" icon={<HourglassEmpty />} />;
            case "Chờ phê duyệt":
                return <Chip label="Chờ phê duyệt" color="warning" icon={<HourglassEmpty />} />;
            default:
                return <Chip label={status} variant="outlined" />;
        }
    };

    const getPriorityChip = (priority) => {
        switch (priority) {
            case "Cao":
                return <Chip label="Cao" color="error" />;
            case "Trung bình":
                return <Chip label="Trung bình" color="warning" />;
            case "Thấp":
                return <Chip label="Thấp" color="default" />;
            default:
                return <Chip label={priority} variant="outlined" />;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header Actions */}
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                <Grid item xs={12} md={6} display="flex" gap={2}>
                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Tìm kiếm yêu cầu..."
                        InputProps={{
                            startAdornment: <Search fontSize="small" style={{ marginRight: 8 }} />,
                        }}
                        fullWidth
                    />
                    <Button variant="outlined" startIcon={<FilterList />}>
                        Lọc
                    </Button>
                </Grid>
            </Grid>

            {/* Status Overview */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
                {[
                    { label: "Chờ phê duyệt", value: 23, color: "warning", icon: <HourglassEmpty /> },
                    { label: "Đang xử lý", value: 45, color: "info", icon: <HourglassEmpty /> },
                    { label: "Hoàn thành", value: 128, color: "success", icon: <CheckCircle /> },
                    { label: "Từ chối", value: 12, color: "error", icon: <Cancel /> },
                ].map((item, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.label}
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {item.value}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ color: `${item.color}.main` }}>{item.icon}</Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Requests Table */}
            <Paper sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
                <Box p={2}>
                    <Typography variant="h6">Danh sách yêu cầu bảo hành</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý và theo dõi tất cả yêu cầu bảo hành từ các trung tâm dịch vụ
                    </Typography>
                </Box>
                <Divider />
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã yêu cầu</TableCell>
                            <TableCell>VIN</TableCell>
                            <TableCell>Model</TableCell>
                            <TableCell>Vấn đề</TableCell>
                            <TableCell>Trung tâm dịch vụ</TableCell>
                            <TableCell>Mức độ</TableCell>
                            <TableCell>Chi phí</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>{req.id}</TableCell>
                                <TableCell style={{ fontFamily: "monospace" }}>{req.vin}</TableCell>
                                <TableCell>{req.model}</TableCell>
                                <TableCell>{req.issue}</TableCell>
                                <TableCell>{req.serviceCenter}</TableCell>
                                <TableCell>{getPriorityChip(req.priority)}</TableCell>
                                <TableCell>{req.cost}</TableCell>
                                <TableCell>{getStatusChip(req.status)}</TableCell>
                                <TableCell>{req.date}</TableCell>
                                <TableCell>
                                    <IconButton>
                                        <Visibility />
                                    </IconButton>
                                    {req.status === "Chờ phê duyệt" && (
                                        <>
                                            <IconButton color="success">
                                                <CheckCircle />
                                            </IconButton>
                                            <IconButton color="error">
                                                <Cancel />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
