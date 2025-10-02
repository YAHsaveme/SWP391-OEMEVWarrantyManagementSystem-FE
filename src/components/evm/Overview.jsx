import React from "react"
import Analytics from "./Analytics"
import RecallForm from "./RecallForm"
import ProductManagement from "./ProductManagement"
import WarrantyRequests from "./WarrantyRequests"
//import SupplyChain from "./SupplyChain"

import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Avatar,
    Tabs,
    Tab,
    Button,
    Paper,
} from "@mui/material"
import {
    DirectionsCar as CarIcon,
    WarningAmber as AlertTriangle,
    Inventory2 as PackageIcon,
    Description as FileText,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
} from "@mui/icons-material"

export default function Overview() {
    const [tab, setTab] = React.useState(0)

    const handleChange = (event, newValue) => {
        setTab(newValue)
    }

    const stats = [
        {
            title: "Tổng sản phẩm",
            value: "2,847",
            desc: "+12% so với tháng trước",
            icon: <PackageIcon />,
            color: "#1976d2",
        },
        {
            title: "Yêu cầu bảo hành",
            value: "156",
            desc: "23 đang chờ xử lý",
            icon: <FileText />,
            color: "#2e7d32",
        },
        {
            title: "Chiến dịch Recall",
            value: "8",
            desc: "3 đang hoạt động",
            icon: <AlertTriangle />,
            color: "#ed6c02",
        },
        {
            title: "Chi phí bảo hành",
            value: "₫2.4B",
            desc: "Tháng này",
            icon: <BarChartIcon />,
            color: "#9c27b0",
        },
    ]

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
            {/* Header */}
            <AppBar position="static" sx={{ bgcolor: "white", color: "black", boxShadow: 1 }}>
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                            <CarIcon sx={{ color: "white" }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight="600">
                                EV Warranty Management
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Hệ thống quản lý bảo hành xe điện
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<SettingsIcon />}
                            size="small"
                            sx={{ borderRadius: 3, textTransform: "none" }}
                        >
                            Cài đặt
                        </Button>
                        <Avatar sx={{ bgcolor: "primary.main", fontWeight: "bold" }}>A</Avatar>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Stats Overview */}
                <Grid container spacing={3} mb={4}>
                    {stats.map((stat, index) => (
                        <Grid item xs={12} md={6} lg={3} key={index}>
                            <Card
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    boxShadow: 3,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography variant="body2" fontWeight="600" color="text.secondary">
                                        {stat.title}
                                    </Typography>
                                    <Avatar
                                        sx={{
                                            bgcolor: stat.color,
                                            width: 32,
                                            height: 32,
                                        }}
                                    >
                                        {stat.icon}
                                    </Avatar>
                                </Box>
                                <CardContent sx={{ p: 0 }}>
                                    <Typography variant="h5" fontWeight="bold">
                                        {stat.value}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stat.desc}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Tabs */}
                <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
                    <Tabs
                        value={tab}
                        onChange={handleChange}
                        textColor="primary"
                        indicatorColor="primary"
                        variant="fullWidth"
                        sx={{
                            borderBottom: 1,
                            borderColor: "divider",
                            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
                        }}
                    >
                        <Tab label="Tạo Recall" />
                        <Tab label="Quản lý Sản phẩm" />
                        <Tab label="Yêu cầu Bảo hành" />
                        <Tab label="Chuỗi Cung ứng" />
                        <Tab label="Báo cáo & Phân tích" />
                    </Tabs>

                    <Box sx={{ p: 3 }}>
                        {tab === 0 && <RecallForm />}
                        {tab === 1 && <ProductManagement />}
                        {tab === 2 && <WarrantyRequests />}
                        {tab === 3 && <SupplyChain />}
                        {tab === 4 && <Analytics />}
                    </Box>
                </Paper>
            </Container>
        </Box>
    )
}
