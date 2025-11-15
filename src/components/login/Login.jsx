"use client"

import React, { useState, useEffect, useRef } from "react"
import HomeIcon from "@mui/icons-material/Home"
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Button,
    Checkbox,
    FormControlLabel,
    Link,
    Fade,
    Alert,
} from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt"
import ShieldIcon from "@mui/icons-material/Security"
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import authService from "../../services/authService"
import { useNavigate } from "react-router-dom"

function Login() {
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const inputRef = useRef(null)
    const navigate = useNavigate()

    const goHome = () => {
        navigate("/")
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const data = await authService.login(email, password)

            if (data?.token) {
                localStorage.setItem("token", data.token)
                localStorage.setItem("fullName", data.user.fullName)
                localStorage.setItem("role", data.user.role)

                // Điều hướng theo role backend trả về
                switch (data.user.role) {
                    case "ADMIN":
                        navigate("/dashboard")
                        break
                    case "EVM_STAFF":
                        navigate("/overview")
                        break
                    case "SC_STAFF":
                        navigate("/staff/vehicles")
                        break
                    case "SC_TECHNICIAN":
                        navigate("/tech")
                        break
                    case "SC_MANAGER":
                        navigate("/manager")
                        break
                    default:
                        navigate("/")
                }
            } else {
                setError("Phản hồi không hợp lệ từ server")
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Sai email hoặc mật khẩu"
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #e3f2fd, #e8f5e9)",
                overflow: "hidden",
                p: 2,
                position: "relative",
            }}
        >
            {/* Nút Home */}
            <Button
                onClick={goHome}
                startIcon={<HomeIcon />}
                sx={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    py: 1,
                    px: 2,
                    borderRadius: 3,
                    fontWeight: "bold",
                    textTransform: "none",
                    background: "linear-gradient(90deg, #1565c0, #2e7d32)",
                    color: "white",
                    boxShadow: 3,
                    "&:hover": {
                        background: "linear-gradient(90deg, #0d47a1, #1b5e20)",
                    },
                }}
            >
                Trang chủ
            </Button>

            <Card
                sx={{
                    width: "100%",
                    maxWidth: 1200,
                    borderRadius: 4,
                    boxShadow: 10,
                    display: "flex",
                    overflow: "hidden",
                }}
            >
                <Grid container>
                    {/* Left side */}
                    <Grid
                        item
                        md={6}
                        sx={{
                            display: { xs: "none", md: "flex" },
                            flexDirection: "column",
                            justifyContent: "center",
                            p: 6,
                            background: "linear-gradient(135deg, #1565c0, #2e7d32)",
                            color: "white",
                            position: "relative",
                        }}
                    >
                        <Box mb={6} display="flex" alignItems="center" gap={1}>
                            <ElectricBoltIcon sx={{ fontSize: 36 }} />
                            <Typography variant="h5" fontWeight="bold">
                                EVM Warranty Management System
                            </Typography>
                        </Box>

                        <Fade in timeout={800}>
                            <Card
                                sx={{
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    backdropFilter: "blur(6px)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    mb: 3,
                                    transform: "rotate(-1deg)",
                                    transition: "0.3s",
                                    "&:hover": { transform: "rotate(0deg)" },
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <ShieldIcon sx={{ color: "#81c784" }} />
                                        <Typography fontWeight="600">Complete Protection</Typography>
                                    </Box>
                                    <Typography variant="body2" color="white">
                                        Your EV investment is protected with comprehensive warranty coverage
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Fade>

                        <Fade in timeout={1000}>
                            <Card
                                sx={{
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    backdropFilter: "blur(6px)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    mb: 3,
                                    transform: "rotate(1deg)",
                                    transition: "0.3s",
                                    "&:hover": { transform: "rotate(0deg)" },
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <BatteryChargingFullIcon sx={{ color: "#ffeb3b" }} />
                                        <Typography fontWeight="600">Battery Assurance</Typography>
                                    </Box>
                                    <Typography variant="body2" color="white">
                                        Advanced battery warranty ensures your EV runs efficiently for years
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Fade>

                        <Fade in timeout={1200}>
                            <Card
                                sx={{
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    backdropFilter: "blur(6px)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    transform: "rotate(-1deg)",
                                    transition: "0.3s",
                                    "&:hover": { transform: "rotate(0deg)" },
                                }}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <DirectionsCarIcon sx={{ color: "#64b5f6" }} />
                                        <Typography fontWeight="600">Peace of Mind</Typography>
                                    </Box>
                                    <Typography variant="body2" color="white">
                                        Drive confidently knowing your electric vehicle is fully covered
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Fade>
                    </Grid>

                    {/* Right side - Login form */}
                    <Grid item xs={12} md={6} display="flex" flexDirection="column" justifyContent="center" p={6}>
                        <Box
                            display={{ xs: "flex", md: "none" }}
                            justifyContent="center"
                            alignItems="center"
                            gap={1}
                            mb={4}
                            color="primary.main"
                        >
                            <ElectricBoltIcon sx={{ fontSize: 36 }} />
                            <Typography variant="h5" fontWeight="bold">
                                EV Warranty Pro
                            </Typography>
                        </Box>

                        <Box maxWidth={400} mx="auto" width="100%">
                            <Typography variant="h4" fontWeight="bold" mb={1}>
                                Welcome Back
                            </Typography>
                            <Typography variant="body1" color="text.secondary" mb={4}>
                                Access your EV warranty dashboard and manage your electric vehicle protection coverage.
                            </Typography>

                            <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={3}>
                                <TextField
                                    label="Email"
                                    inputRef={inputRef}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />

                                <TextField
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    fullWidth
                                    variant="outlined"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={handleTogglePassword} edge="end">
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                {error && <Alert severity="error">{error}</Alert>}

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <FormControlLabel
                                        control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
                                        label="Remember me"
                                    />
                                    <Link href="#" underline="hover" variant="body2">
                                        Forgot password?
                                    </Link>
                                </Box>

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        background: "linear-gradient(90deg, #1565c0, #2e7d32)",
                                        "&:hover": {
                                            background: "linear-gradient(90deg, #0d47a1, #1b5e20)",
                                        },
                                    }}
                                >
                                    {loading ? "Signing In..." : "Sign In"}
                                </Button>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Card>
        </Box>
    )
}

export default Login
