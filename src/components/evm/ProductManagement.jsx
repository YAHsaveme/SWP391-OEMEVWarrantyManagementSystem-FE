import React from "react";
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Chip,
    Container,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Add,
    BatteryFull,
    Bolt,
    FilterList,
    Inventory,
    MoreVert,
    Search,
} from "@mui/icons-material";

// ------------------------------------------------------
// Helper: status color mapping
// ------------------------------------------------------
const statusToColor = (status) => {
    switch (status) {
        case "Hoạt động":
            return "success";
        case "Đang xử lý":
            return "warning";
        case "Ngừng sản xuất":
            return "default";
        default:
            return "info";
    }
};

export default function ProductManagement() {
    const products = [
        {
            id: "P001",
            name: "Pin Lithium 75kWh",
            category: "Pin",
            serialNumbers: ["BT001234", "BT001235", "BT001236"],
            warranty: "8 năm / 160,000 km",
            status: "Hoạt động",
            icon: <BatteryFull fontSize="small" />,
        },
        {
            id: "P002",
            name: "Động cơ điện 350kW",
            category: "Động cơ",
            serialNumbers: ["MT002134", "MT002135"],
            warranty: "5 năm / 100,000 km",
            status: "Hoạt động",
            icon: <Bolt fontSize="small" />,
        },
        {
            id: "P003",
            name: "BMS Gen 3",
            category: "BMS",
            serialNumbers: ["BMS003234", "BMS003235", "BMS003236", "BMS003237"],
            warranty: "3 năm / 60,000 km",
            status: "Ngừng sản xuất",
            icon: <Inventory fontSize="small" />,
        },
    ];

    // Quick stats computed from products
    const stats = {
        total: products.length,
        active: products.filter((p) => p.status === "Hoạt động").length,
        categories: new Set(products.map((p) => p.category)).size,
        serials: products.reduce((acc, p) => acc + p.serialNumbers.length, 0),
    };

    return (
        <Container sx={{ py: 4 }}>
            {/* Top Toolbar */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    bgcolor: (t) =>
                        t.palette.mode === "light"
                            ? "rgba(25, 118, 210, 0.06)"
                            : "rgba(144, 202, 249, 0.08)",
                    border: (t) => `1px solid ${t.palette.divider}`,
                    backgroundImage:
                        "linear-gradient(135deg, rgba(25,118,210,0.10) 0%, rgba(25,118,210,0.00) 40%)",
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Quản lý sản phẩm
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Theo dõi linh kiện, bảo hành và ánh xạ serial ↔ VIN
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent={{ md: "flex-end" }}>
                            <TextField
                                placeholder="Tìm kiếm sản phẩm, serial, danh mục..."
                                size="small"
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button variant="outlined" startIcon={<FilterList />} sx={{ borderRadius: 2 }}>
                                Lọc
                            </Button>
                            <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2 }}>
                                Thêm sản phẩm
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>

                {/* Quick Stats */}
                <Stack direction={{ xs: "column", sm: "row" }} gap={1} mt={2}>
                    <Chip label={`Tổng: ${stats.total}`} color="primary" variant="outlined" />
                    <Chip label={`Hoạt động: ${stats.active}`} color="success" variant="outlined" />
                    <Chip label={`Danh mục: ${stats.categories}`} variant="outlined" />
                    <Chip label={`Serial: ${stats.serials}`} variant="outlined" />
                </Stack>
            </Paper>

            {/* Product Cards */}
            <Grid container spacing={2.5}>
                {products.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Card
                            variant="outlined"
                            sx={{
                                height: "100%",
                                borderRadius: 3,
                                transition: "transform .15s ease, box-shadow .15s ease",
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 6,
                                },
                            }}
                        >
                            <CardHeader
                                title={
                                    <Stack direction="row" alignItems="center" gap={1}>
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: (t) =>
                                                    t.palette.mode === 'light' ? t.palette.grey[100] : t.palette.grey[900],
                                                border: (t) => `1px solid ${t.palette.divider}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {product.icon}
                                        </Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {product.name}
                                        </Typography>
                                    </Stack>
                                }
                                subheader={
                                    <Typography variant="caption" color="text.secondary">
                                        {product.id}
                                    </Typography>
                                }
                                action={
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Chip size="small" label={product.status} color={statusToColor(product.status)} variant="outlined" />
                                        <IconButton size="small" aria-label="more">
                                            <MoreVert fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                }
                                sx={{ pb: 0.5 }}
                            />

                            <CardContent sx={{ pt: 1.5 }}>
                                <Stack spacing={1.75}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Danh mục
                                        </Typography>
                                        <Box mt={0.5}>
                                            <Chip size="small" label={product.category} />
                                        </Box>
                                    </Box>

                                    <Divider flexItem sx={{ opacity: 0.6 }} />

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Bảo hành
                                        </Typography>
                                        <Typography variant="body2">{product.warranty}</Typography>
                                    </Box>

                                    <Divider flexItem sx={{ opacity: 0.6 }} />

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Số serial ({product.serialNumbers.length})
                                        </Typography>
                                        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} mt={1}>
                                            {product.serialNumbers.slice(0, 3).map((serial) => (
                                                <Tooltip title="Nhấp để sao chép" key={serial}>
                                                    <Chip
                                                        size="small"
                                                        label={serial}
                                                        onClick={() => navigator.clipboard?.writeText(serial)}
                                                        sx={{ cursor: 'pointer' }}
                                                    />
                                                </Tooltip>
                                            ))}
                                            {product.serialNumbers.length > 3 && (
                                                <Chip size="small" color="info" label={`+${product.serialNumbers.length - 3}`} />
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </CardContent>

                            <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                                <Button fullWidth variant="outlined">Xem chi tiết</Button>
                                <Button fullWidth variant="contained">Chỉnh sửa</Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* VIN Mapping */}
            <Paper
                elevation={0}
                sx={{
                    mt: 4,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: (t) => `1px solid ${t.palette.divider}`,
                }}
            >
                <Box
                    sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: (t) => (t.palette.mode === "light" ? t.palette.grey[50] : t.palette.grey[900]),
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Gắn số serial với VIN
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Quản lý việc gắn kết các phụ tùng với từng xe cụ thể
                        </Typography>
                    </Box>
                    <Stack direction="row" gap={1}>
                        <Button size="small" variant="outlined">Xuất CSV</Button>
                        <Button size="small" variant="contained">Gắn mới</Button>
                    </Stack>
                </Box>
                <Divider />
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>VIN</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Model</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Pin</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Động cơ</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>BMS</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow hover>
                                <TableCell sx={{ fontFamily: "monospace" }}>VIN001234567890</TableCell>
                                <TableCell>Model X</TableCell>
                                <TableCell>BT001234</TableCell>
                                <TableCell>MT002134</TableCell>
                                <TableCell>BMS003234</TableCell>
                                <TableCell>
                                    <Chip label="Hoàn thành" color="success" size="small" />
                                </TableCell>
                            </TableRow>
                            <TableRow hover>
                                <TableCell sx={{ fontFamily: "monospace" }}>VIN001234567891</TableCell>
                                <TableCell>Model Y</TableCell>
                                <TableCell>BT001235</TableCell>
                                <TableCell>MT002135</TableCell>
                                <TableCell>BMS003235</TableCell>
                                <TableCell>
                                    <Chip label="Đang xử lý" color="warning" size="small" />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Box>
            </Paper>
        </Container>
    );
}
