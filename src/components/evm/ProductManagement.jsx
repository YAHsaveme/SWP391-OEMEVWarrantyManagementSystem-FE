import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardActions,
    Typography,
    Grid,
    TextField,
    Button,
    IconButton,
    Chip,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Box,
    Divider,
} from "@mui/material";
import { Search, FilterList, Add, BatteryFull, Bolt, Inventory } from "@mui/icons-material";

export default function ProductManagement() {
    const products = [
        {
            id: "P001",
            name: "Pin Lithium 75kWh",
            category: "Pin",
            serialNumbers: ["BT001234", "BT001235", "BT001236"],
            warranty: "8 năm / 160,000 km",
            status: "Hoạt động",
            icon: <BatteryFull color="primary" />,
        },
        {
            id: "P002",
            name: "Động cơ điện 350kW",
            category: "Động cơ",
            serialNumbers: ["MT002134", "MT002135"],
            warranty: "5 năm / 100,000 km",
            status: "Hoạt động",
            icon: <Bolt color="secondary" />,
        },
        {
            id: "P003",
            name: "BMS Gen 3",
            category: "BMS",
            serialNumbers: ["BMS003234", "BMS003235", "BMS003236", "BMS003237"],
            warranty: "3 năm / 60,000 km",
            status: "Ngừng sản xuất",
            icon: <Inventory color="action" />,
        },
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header Actions */}
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
                <Grid item xs={12} md={6} display="flex" gap={2}>
                    <TextField
                        variant="outlined"
                        size="small"
                        placeholder="Tìm kiếm sản phẩm..."
                        InputProps={{
                            startAdornment: <Search fontSize="small" style={{ marginRight: 8 }} />,
                        }}
                        fullWidth
                    />
                    <Button variant="outlined" startIcon={<FilterList />}>
                        Lọc
                    </Button>
                </Grid>
                <Grid item>
                    <Button variant="contained" startIcon={<Add />}>
                        Thêm sản phẩm
                    </Button>
                </Grid>
            </Grid>

            {/* Product Cards */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
                {products.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Card sx={{ borderRadius: 3, boxShadow: 3, height: "100%" }}>
                            <CardHeader
                                title={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {product.icon}
                                        <Typography variant="h6">{product.name}</Typography>
                                    </Box>
                                }
                                subheader={product.id}
                                action={
                                    <Chip
                                        label={product.status}
                                        color={product.status === "Hoạt động" ? "success" : "default"}
                                        variant="outlined"
                                    />
                                }
                            />
                            <Divider />
                            <CardContent>
                                <Typography variant="subtitle2">Danh mục</Typography>
                                <Chip label={product.category} variant="outlined" sx={{ mb: 2 }} />

                                <Typography variant="subtitle2">Chính sách bảo hành</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {product.warranty}
                                </Typography>

                                <Typography variant="subtitle2">
                                    Số serial ({product.serialNumbers.length})
                                </Typography>
                                <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {product.serialNumbers.slice(0, 2).map((serial) => (
                                        <Chip key={serial} label={serial} size="small" />
                                    ))}
                                    {product.serialNumbers.length > 2 && (
                                        <Chip
                                            label={`+${product.serialNumbers.length - 2}`}
                                            size="small"
                                            color="info"
                                        />
                                    )}
                                </Box>
                            </CardContent>
                            <CardActions>
                                <Button size="small" variant="outlined" fullWidth>
                                    Xem chi tiết
                                </Button>
                                <Button size="small" variant="outlined" fullWidth>
                                    Chỉnh sửa
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* VIN Mapping */}
            <Paper sx={{ mt: 4, borderRadius: 3, boxShadow: 3 }}>
                <Box p={2}>
                    <Typography variant="h6">Gắn số serial với VIN</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý việc gắn kết các phụ tùng với từng xe cụ thể
                    </Typography>
                </Box>
                <Divider />
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>VIN</TableCell>
                            <TableCell>Model</TableCell>
                            <TableCell>Pin</TableCell>
                            <TableCell>Động cơ</TableCell>
                            <TableCell>BMS</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell style={{ fontFamily: "monospace" }}>VIN001234567890</TableCell>
                            <TableCell>Model X</TableCell>
                            <TableCell>BT001234</TableCell>
                            <TableCell>MT002134</TableCell>
                            <TableCell>BMS003234</TableCell>
                            <TableCell>
                                <Chip label="Hoàn thành" color="success" />
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell style={{ fontFamily: "monospace" }}>VIN001234567891</TableCell>
                            <TableCell>Model Y</TableCell>
                            <TableCell>BT001235</TableCell>
                            <TableCell>MT002135</TableCell>
                            <TableCell>BMS003235</TableCell>
                            <TableCell>
                                <Chip label="Đang xử lý" color="warning" />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
