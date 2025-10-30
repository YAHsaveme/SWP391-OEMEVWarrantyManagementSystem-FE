import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Link,
    Stack,
    Divider,
    Container,
} from "@mui/material";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CampaignIcon from "@mui/icons-material/Campaign";
import GroupIcon from "@mui/icons-material/Group";

/** Helper to build nice gradients */
const grad = (from, to) => `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;

const stats = [
    {
        name: "Total Vehicles",
        value: "248",
        change: "+12 this month",
        gradient: grad("#3B82F6", "#2563EB"), // blue-500 -> blue-600
        Icon: DirectionsCarIcon,
    },
    {
        name: "Warranty Claims",
        value: "32",
        change: "8 pending approval",
        gradient: grad("#EAB308", "#CA8A04"), // yellow-500 -> yellow-600
        Icon: AssignmentIcon,
    },
    {
        name: "Active Campaigns",
        value: "2",
        change: "165 vehicles affected",
        gradient: grad("#A855F7", "#7C3AED"), // purple-500 -> purple-600
        Icon: CampaignIcon,
    },
    {
        name: "Technicians",
        value: "8",
        change: "15 active cases",
        gradient: grad("#10B981", "#059669"), // emerald-500 -> emerald-600
        Icon: GroupIcon,
    },
];

const quickActions = [
    {
        title: "Register Vehicle",
        description: "Add a new vehicle to the system",
        href: "/vehicles",
        gradient: grad("#3B82F6", "#2563EB"),
        Icon: DirectionsCarIcon,
    },
    {
        title: "Create Warranty Claim",
        description: "Submit a new warranty claim",
        href: "/warranty-claims",
        gradient: grad("#EAB308", "#CA8A04"),
        Icon: AssignmentIcon,
    },
    {
        title: "Manage Campaigns",
        description: "View and manage service campaigns",
        href: "/campaigns",
        gradient: grad("#A855F7", "#7C3AED"),
        Icon: CampaignIcon,
    },
    {
        title: "Assign Technician",
        description: "Manage technician assignments",
        href: "/technicians",
        gradient: grad("#10B981", "#059669"),
        Icon: GroupIcon,
    },
    {
        title: "Browse EV Models",
        description: "View available electric vehicle models",
        href: "/ev-models",
        gradient: grad("#6366F1", "#4F46E5"), // indigo-500 -> indigo-600
        Icon: DirectionsCarIcon,
    },
];

export default function StaffOverview() {
    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            {/* Header */}
            <Box mb={4}>
                <Typography variant="h3" fontWeight={800} letterSpacing={0.2}>
                    Dashboard
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" mt={1}>
                    Welcome to the Service Center Staff portal
                </Typography>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} mb={5}>
                {stats.map(({ name, value, change, gradient, Icon }) => (
                    <Grid item key={name} xs={12} sm={6} md={3}>
                        <Card
                            elevation={3}
                            sx={{
                                p: 2.5,
                                transition: "box-shadow .2s ease",
                                "&:hover": { boxShadow: 6 },
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                                <Box flex={1}>
                                    <Typography variant="caption" color="text.secondary">
                                        {name}
                                    </Typography>
                                    <Typography variant="h4" fontWeight={800} mt={1}>
                                        {value}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                                        {change}
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        color: "#fff",
                                        backgroundImage: gradient,
                                        boxShadow: 1,
                                        display: "inline-flex",
                                    }}
                                >
                                    <Icon fontSize="medium" />
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions */}
            <Box mb={5}>
                <Typography variant="h5" fontWeight={700} mb={2}>
                    Quick Actions
                </Typography>
                <Grid container spacing={3}>
                    {quickActions.map(({ title, description, href, gradient, Icon }) => (
                        <Grid item key={title} xs={12} sm={6} md={4}>
                            <Link
                                component={RouterLink}
                                to={href}
                                underline="none"
                                sx={{ display: "block", height: "100%" }}
                            >
                                <Card
                                    elevation={3}
                                    sx={{
                                        p: 2.5,
                                        height: "100%",
                                        transition: "all .2s ease",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        "&:hover": {
                                            boxShadow: 6,
                                            borderColor: "primary.main",
                                        },
                                    }}
                                >
                                    <Stack direction="row" spacing={2}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                color: "#fff",
                                                backgroundImage: gradient,
                                                boxShadow: 1,
                                                display: "inline-flex",
                                                transform: "translateZ(0)",
                                                transition: "transform .15s ease",
                                                "&:hover": { transform: "scale(1.06)" },
                                            }}
                                        >
                                            <Icon fontSize="medium" />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                {title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                                                {description}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Card>
                            </Link>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Recent Activity */}
            <Box>
                <Typography variant="h5" fontWeight={700} mb={2}>
                    Recent Activity
                </Typography>
                <Card elevation={3}>
                    <CardContent>
                        <Stack divider={<Divider />} spacing={2}>
                            {[
                                { action: "Warranty claim created", detail: "WC-001 - Battery degradation", time: "1 hour ago" },
                                { action: "Campaign notification sent", detail: "45 customers notified for RC-2025-001", time: "3 hours ago" },
                                { action: "Vehicle registered", detail: "VIN: 1HGBH41JXMN109186", time: "5 hours ago" },
                                { action: "Technician assigned", detail: "John Doe assigned to WC-002", time: "1 day ago" },
                            ].map((item, i) => (
                                <Stack key={i} direction="row" spacing={2} alignItems="center">
                                    <Box
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            bgcolor: "primary.main",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Box flex={1}>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {item.action}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.detail}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                        {item.time}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}
