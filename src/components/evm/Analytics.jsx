import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Grid,
    MenuItem,
    TextField,
    Typography,
    Paper,
} from "@mui/material";

export default function RecallForm() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "linear-gradient(to right, #E3F2FD, #E0F7FA)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
            }}
        >
            <Paper elevation={6} sx={{ borderRadius: 3, width: "100%", maxWidth: 900 }}>
                <Card>
                    <CardHeader
                        title={
                            <Typography variant="h5" fontWeight="bold" color="primary">
                                🚗 Tạo Chiến dịch Recall Mới
                            </Typography>
                        }
                        subheader="Tạo và quản lý chiến dịch recall cho các sản phẩm có vấn đề"
                    />
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Tiêu đề Recall"
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Mã Recall" variant="outlined" />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField select fullWidth label="Mức độ nghiêm trọng">
                                    <MenuItem value="low">Thấp</MenuItem>
                                    <MenuItem value="medium">Trung bình</MenuItem>
                                    <MenuItem value="high">Cao</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField select fullWidth label="Danh mục">
                                    <MenuItem value="engine">Động cơ</MenuItem>
                                    <MenuItem value="battery">Pin</MenuItem>
                                    <MenuItem value="safety">An toàn</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField select fullWidth label="Model xe">
                                    <MenuItem value="modelA">Model A</MenuItem>
                                    <MenuItem value="modelB">Model B</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Ngày bắt đầu"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Ngày kết thúc dự kiến"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Mô tả vấn đề"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField fullWidth label="VIN bị ảnh hưởng" />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Kế hoạch khắc phục"
                                />
                            </Grid>

                            <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
                                <Button
                                    variant="outlined"
                                    sx={{ borderRadius: 2, px: 3 }}
                                >
                                    💾 Lưu nháp
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        background: "linear-gradient(to right, #1976D2, #42A5F5)",
                                    }}
                                >
                                    🚀 Tạo Recall
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Paper>
        </Box>
    );
}
