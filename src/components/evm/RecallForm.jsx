import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    Grid,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";

export default function RecallForm() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#f9fafb",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                py: 6,
            }}
        >
            <Card
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 900,
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    bgcolor: "white",
                }}
            >
                <CardContent sx={{ p: 5 }}>
                    {/* Header */}
                    <Box mb={4}>
                        <Typography
                            variant="h5"
                            sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
                        >
                            🚗 Tạo Chiến dịch Recall Mới
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Tạo và quản lý chiến dịch recall cho các sản phẩm có vấn đề
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    {/* Form */}
                    <Grid container spacing={3}>
                        {/* Tiêu đề + Mã recall */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Tiêu đề Recall"
                                placeholder="VD: Lỗi hệ thống phanh Model X 2024"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Mã Recall"
                                placeholder="VD: RC-2024-001"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>

                        {/* Dropdowns */}
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Mức độ nghiêm trọng"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            >
                                <MenuItem value="low">Thấp</MenuItem>
                                <MenuItem value="medium">Trung bình</MenuItem>
                                <MenuItem value="high">Cao</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Danh mục"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            >
                                <MenuItem value="engine">Động cơ</MenuItem>
                                <MenuItem value="battery">Pin</MenuItem>
                                <MenuItem value="safety">An toàn</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                label="Model xe"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            >
                                <MenuItem value="modelA">Model A</MenuItem>
                                <MenuItem value="modelB">Model B</MenuItem>
                            </TextField>
                        </Grid>

                        {/* Dates */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Ngày bắt đầu"
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                type="date"
                                fullWidth
                                label="Ngày kết thúc dự kiến"
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>

                        {/* Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Mô tả vấn đề"
                                placeholder="Mô tả chi tiết vấn đề và nguyên nhân cần recall..."
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>

                        {/* VIN */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="VIN bị ảnh hưởng"
                                placeholder="Nhập VIN..."
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>

                        {/* Fix plan */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Kế hoạch khắc phục"
                                placeholder="Mô tả kế hoạch khắc phục và timeline..."
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>

                        {/* Actions */}
                        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
                            <Button
                                variant="outlined"
                                sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    fontWeight: 600,
                                    borderColor: "#d1d5db",
                                    color: "#374151",
                                    textTransform: "none",
                                }}
                            >
                                Lưu nháp
                            </Button>
                            <Button
                                variant="contained"
                                sx={{
                                    borderRadius: 3,
                                    px: 4,
                                    fontWeight: 600,
                                    bgcolor: "black",
                                    textTransform: "none",
                                    "&:hover": { bgcolor: "#333" },
                                }}
                            >
                                Tạo Recall
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}
