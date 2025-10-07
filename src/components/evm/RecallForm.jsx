"use client";

import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    Grid,
    MenuItem,
    TextField,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Avatar,
    Autocomplete,
    Snackbar,
    Alert,
    LinearProgress,
    Fade,
    Container,
    useMediaQuery,
} from "@mui/material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import CampaignIcon from "@mui/icons-material/Campaign";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import SendIcon from "@mui/icons-material/Send";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SummarizeIcon from "@mui/icons-material/Summarize";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

/* ---------- GLOBAL CORNERS ---------- */
const RADIUS = 0;

/* ---------- Styled ---------- */
const GradientShell = styled(Box)(({ theme }) => ({
    minHeight: "100vh",
    padding: theme.spacing(4, 0),
    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.06)} 0%, ${theme.palette.background.default} 40%)`,
}));

const GlassCard = styled(Card)(({ theme }) => ({
    borderRadius: RADIUS,
    overflow: "hidden",
    border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
    background: theme.palette.background.paper,
    boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.10)}`,
    height: "100%",
    display: "flex",
    flexDirection: "column",
}));

const HeaderBar = styled(Box)(({ theme }) => ({
    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.95)}, ${alpha(
        theme.palette.primary.light,
        0.9
    )})`,
    color: "#fff",
    padding: theme.spacing(2, 3),
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: `1px solid ${alpha("#fff", 0.15)}`,
}));

const GButton = styled(Button)({
    borderRadius: RADIUS,
    textTransform: "none",
    fontWeight: 700,
    paddingInline: 16,
    paddingBlock: 10,
});
const GPrimary = styled(GButton)(({ theme }) => ({
    background: theme.palette.primary.main,
    color: "#fff",
    boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.25)}`,
    "&:hover": {
        background: theme.palette.primary.dark,
        boxShadow: `0 8px 22px ${alpha(theme.palette.primary.main, 0.35)}`,
    },
}));

/* ---------- Stepper ---------- */
const steps = [
    { label: "Thông tin chung", icon: <InfoOutlinedIcon /> },
    { label: "Thời gian & Model", icon: <CalendarMonthIcon /> },
    { label: "VIN & Kế hoạch", icon: <SummarizeIcon /> },
];

function StepIcon(props) {
    const { active, completed, icon } = props;
    const theme = useTheme();
    return (
        <Avatar
            variant="square"
            sx={{
                width: 30,
                height: 30,
                borderRadius: RADIUS,
                bgcolor: active || completed ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.08),
                color: active || completed ? "#fff" : theme.palette.text.secondary,
                boxShadow: active ? `0 0 0 6px ${alpha(theme.palette.primary.main, 0.15)}` : "none",
                transition: "all .2s",
            }}
        >
            {steps[Number(icon) - 1]?.icon ?? icon}
        </Avatar>
    );
}

/* ---------- Options ---------- */
const severityOptions = [
    { label: "Cao", value: "high", color: "error" },
    { label: "Trung bình", value: "medium", color: "warning" },
    { label: "Thấp", value: "low", color: "success" },
];
const categoryOptions = [
    { label: "An toàn", value: "safety" },
    { label: "Pin", value: "battery" },
    { label: "Động cơ", value: "engine" },
    { label: "Điện/Điều khiển", value: "electronics" },
];
const modelOptions = ["Model A", "Model B", "Model C", "SUV X", "City EV"].map((m) => ({ label: m }));

/* ---------- Component ---------- */
export default function RecallForm() {
    const theme = useTheme();
    const upMd = useMediaQuery(theme.breakpoints.up("md"));

    const [step, setStep] = React.useState(0);
    const [snack, setSnack] = React.useState({ open: false, type: "success", msg: "" });

    // form state
    const [title, setTitle] = React.useState("");
    const [code, setCode] = React.useState("");
    const [severity, setSeverity] = React.useState(severityOptions[0]);
    const [category, setCategory] = React.useState(categoryOptions[0]);
    const [models, setModels] = React.useState([]);
    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [desc, setDesc] = React.useState("");
    const [vinList, setVinList] = React.useState([]);
    const [plan, setPlan] = React.useState("");

    // touched
    const [touched, setTouched] = React.useState({
        title: false,
        code: false,
        startDate: false,
        models: false,
        plan: false,
    });
    const setTouch = (k) => setTouched((t) => ({ ...t, [k]: true }));
    const isErr = (cond, k) => touched[k] && cond;
    const help = (cond, k, msg = "Bắt buộc") => (touched[k] && cond ? msg : " ");

    const progress = Math.round(((step + 1) / 3) * 100);

    const handleUploadCSV = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || "");
            const rows = text
                .split(/\r?\n/)
                .map((x) => x.trim())
                .filter(Boolean);
            const merged = Array.from(new Set([...(vinList || []), ...rows]));
            setVinList(merged);
            setSnack({ open: true, type: "success", msg: `Đã import ${rows.length} VIN` });
        };
        reader.readAsText(file);
    };

    const canNext0 = title.trim() && code.trim();
    const canNext1 = models.length > 0 && startDate;
    const canSubmit = vinList.length > 0 && plan.trim().length >= 10;

    const handleSaveDraft = () => setSnack({ open: true, type: "info", msg: "Đã lưu nháp chiến dịch recall." });
    const handleSubmit = () => {
        if (!canSubmit)
            return setSnack({
                open: true,
                type: "warning",
                msg: "Vui lòng nhập đủ VIN và kế hoạch khắc phục.",
            });
        setSnack({ open: true, type: "success", msg: "Tạo Recall thành công!" });
    };

    return (
        <GradientShell>
            <Container maxWidth="lg">
                <Grid container spacing={3} alignItems="stretch">
                    {/* LEFT */}
                    <Grid item xs={12} md={7}>
                        <GlassCard>
                            <HeaderBar>
                                <Avatar
                                    variant="square"
                                    sx={{ bgcolor: alpha("#fff", 0.22), color: "#fff", width: 44, height: 44, borderRadius: RADIUS }}
                                >
                                    <CampaignIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" fontWeight={900} letterSpacing={0.2}>
                                        Tạo Chiến dịch Recall
                                    </Typography>
                                    <Typography sx={{ opacity: 0.9 }}>Điền thông tin theo từng bước bên dưới</Typography>
                                </Box>
                                <Chip
                                    size="small"
                                    label="Workflow 3 bước"
                                    sx={{ bgcolor: alpha("#fff", 0.22), color: "#fff", borderRadius: RADIUS }}
                                />
                            </HeaderBar>

                            <Box sx={{ px: { xs: 2, md: 4 }, pb: 2, pt: 2 }}>
                                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: RADIUS, mb: 1 }} />
                                <Stepper activeStep={step} alternativeLabel sx={{ mb: 1.5 }}>
                                    {steps.map((s) => (
                                        <Step key={s.label}>
                                            <StepLabel StepIconComponent={StepIcon}>{s.label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Box>

                            <CardContent sx={{ pt: 0, px: { xs: 2, md: 4 }, pb: 4, flex: 1 }}>
                                {/* STEP 0 */}
                                <Fade in={step === 0} mountOnEnter unmountOnExit>
                                    <Box>
                                        <SectionLabel icon={<InfoOutlinedIcon />} title="Thông tin chung" subtitle="Tiêu đề, mã recall, mức độ và danh mục" />
                                        <Grid container spacing={2.5}>
                                            <Grid item xs={12} md={8}>
                                                <TextField
                                                    fullWidth
                                                    label="Tiêu đề Recall"
                                                    placeholder="VD: Lỗi hệ thống phanh Model X 2024"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    onBlur={() => setTouch("title")}
                                                    error={isErr(!title, "title")}
                                                    helperText={help(!title, "title")}
                                                    InputProps={{
                                                        sx: {
                                                            borderRadius: RADIUS,
                                                            "& .MuiOutlinedInput-notchedOutline": { borderColor: (t) => alpha(t.palette.text.primary, 0.15) },
                                                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: (t) => t.palette.primary.main },
                                                        },
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    fullWidth
                                                    label="Mã Recall"
                                                    placeholder="VD: RC-2025-001"
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value)}
                                                    onBlur={() => setTouch("code")}
                                                    error={isErr(!code, "code")}
                                                    helperText={help(!code, "code")}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Mức độ nghiêm trọng"
                                                    value={severity.value}
                                                    onChange={(e) => setSeverity(severityOptions.find((x) => x.value === e.target.value) || severityOptions[0])}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                >
                                                    {severityOptions.map((s) => (
                                                        <MenuItem key={s.value} value={s.value}>
                                                            <Chip size="small" color={s.color} label={s.label} sx={{ mr: 1, borderRadius: RADIUS }} />
                                                            {s.label}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Danh mục"
                                                    value={category.value}
                                                    onChange={(e) => setCategory(categoryOptions.find((x) => x.value === e.target.value) || categoryOptions[0])}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                >
                                                    {categoryOptions.map((s) => (
                                                        <MenuItem key={s.value} value={s.value}>
                                                            {s.label}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    label="Mô tả vấn đề"
                                                    placeholder="Mô tả chi tiết vấn đề và nguyên nhân cần recall..."
                                                    value={desc}
                                                    onChange={(e) => setDesc(e.target.value)}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Fade>

                                {/* STEP 1 */}
                                <Fade in={step === 1} mountOnEnter unmountOnExit>
                                    <Box>
                                        <SectionLabel icon={<CalendarMonthIcon />} title="Thời gian & Model" subtitle="Thiết lập lịch trình và phạm vi áp dụng" />
                                        <Grid container spacing={2.5}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    type="date"
                                                    fullWidth
                                                    label="Ngày bắt đầu"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    onBlur={() => setTouch("startDate")}
                                                    InputLabelProps={{ shrink: true }}
                                                    error={isErr(!startDate, "startDate")}
                                                    helperText={help(!startDate, "startDate")}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    type="date"
                                                    fullWidth
                                                    label="Ngày kết thúc dự kiến"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    InputLabelProps={{ shrink: true }}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    multiple
                                                    options={modelOptions}
                                                    value={models}
                                                    onChange={(_, v) => setModels(v)}
                                                    onBlur={() => setTouch("models")}
                                                    getOptionLabel={(o) => o.label}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Model xe áp dụng"
                                                            placeholder="Chọn 1 hoặc nhiều model"
                                                            error={isErr(models.length === 0, "models")}
                                                            helperText={help(models.length === 0, "models", "Chọn ít nhất 1 model")}
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                sx: { ...params.InputProps?.sx, borderRadius: RADIUS },
                                                            }}
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Fade>

                                {/* STEP 2 */}
                                <Fade in={step === 2} mountOnEnter unmountOnExit>
                                    <Box>
                                        <SectionLabel icon={<SummarizeIcon />} title="VIN & Kế hoạch khắc phục" subtitle="Tải danh sách VIN và mô tả kế hoạch xử lý" />
                                        <Grid container spacing={2.5}>
                                            <Grid item xs={12}>
                                                <UploadBox onInput={handleUploadCSV} />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    multiple
                                                    freeSolo
                                                    options={[]}
                                                    value={vinList}
                                                    onChange={(_, v) => setVinList(v)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="VIN bị ảnh hưởng"
                                                            placeholder="Nhập VIN rồi Enter… hoặc import từ CSV"
                                                            helperText={vinList.length === 0 ? "Nhập ít nhất 1 VIN" : `${vinList.length} VIN đã thêm`}
                                                            error={vinList.length === 0}
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                sx: { ...params.InputProps?.sx, borderRadius: RADIUS },
                                                            }}
                                                        />
                                                    )}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    label="Kế hoạch khắc phục"
                                                    placeholder="Mô tả timeline & giải pháp (≥ 10 ký tự)…"
                                                    value={plan}
                                                    onChange={(e) => setPlan(e.target.value)}
                                                    onBlur={() => setTouch("plan")}
                                                    error={isErr(plan.trim().length < 10, "plan")}
                                                    helperText={help(plan.trim().length < 10, "plan", "Vui lòng mô tả chi tiết hơn.")}
                                                    InputProps={{ sx: { borderRadius: RADIUS } }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Fade>

                                {/* Footer */}
                                <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                                    <GButton variant="outlined" startIcon={<SaveAltIcon />} onClick={handleSaveDraft}>
                                        Lưu nháp
                                    </GButton>
                                    <Box sx={{ display: "flex", gap: 1.5 }}>
                                        <GButton disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                                            Quay lại
                                        </GButton>

                                        {step < 2 ? (
                                            <GPrimary
                                                onClick={() => {
                                                    if (step === 0 && !canNext0) return setSnack({ open: true, type: "warning", msg: "Điền tiêu đề và mã recall." });
                                                    if (step === 1 && !canNext1) return setSnack({ open: true, type: "warning", msg: "Chọn ít nhất 1 model và ngày bắt đầu." });
                                                    setStep((s) => Math.min(2, s + 1));
                                                }}
                                            >
                                                Tiếp tục
                                            </GPrimary>
                                        ) : (
                                            <GPrimary endIcon={<SendIcon />} onClick={handleSubmit} disabled={!canSubmit}>
                                                Tạo Recall
                                            </GPrimary>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </GlassCard>
                    </Grid>

                    {/* RIGHT: preview */}
                    <Grid item xs={12} md={5}>
                        <Card
                            elevation={0}
                            sx={(t) => ({
                                borderRadius: RADIUS,
                                border: `1px solid ${alpha(t.palette.divider, 0.5)}`,
                                background: t.palette.background.paper,
                                boxShadow: `0 10px 24px ${alpha(t.palette.common.black, 0.08)}`,
                                position: upMd ? "sticky" : "static",
                                top: upMd ? 24 : "auto",
                                height: upMd ? "calc(100vh - 48px)" : "auto",
                                display: "flex",
                                flexDirection: "column",
                            })}
                        >
                            <CardHeader
                                avatar={
                                    <Avatar variant="square" sx={{ bgcolor: "secondary.main", borderRadius: RADIUS }}>
                                        <DirectionsCarIcon />
                                    </Avatar>
                                }
                                title="Bản xem trước"
                                subheader="Tóm tắt chiến dịch"
                            />
                            <CardContent sx={{ pt: 0, flex: 1 }}>
                                <PreviewRow label="Tiêu đề" value={title || "—"} />
                                <PreviewRow label="Mã Recall" value={code || "—"} />
                                <PreviewRow
                                    label="Mức độ"
                                    value={<Chip size="small" color={severity.color} label={severity.label} sx={{ borderRadius: RADIUS }} />}
                                />
                                <PreviewRow label="Danh mục" value={category.label} />
                                <PreviewRow label="Model" value={models.length ? models.map((m) => m.label).join(", ") : "—"} />
                                <PreviewRow label="Bắt đầu" value={startDate || "—"} />
                                <PreviewRow label="Kết thúc" value={endDate || "—"} />
                                <PreviewRow label="VIN (số lượng)" value={vinList.length} />
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="body2" color="text.secondary">
                                    Gợi ý: Dán VIN theo dòng hoặc tải file CSV.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            <Snackbar
                open={snack.open}
                autoHideDuration={2200}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snack.type} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </GradientShell>
    );
}

/* ---------- Helpers ---------- */
function SectionLabel({ icon, title, subtitle }) {
    return (
        <Box sx={{ mb: 2, display: "flex", alignItems: "flex-start", gap: 1.25 }}>
            <Avatar
                variant="square"
                sx={(t) => ({
                    bgcolor: alpha(t.palette.primary.main, 0.08),
                    color: "primary.main",
                    width: 36,
                    height: 36,
                    borderRadius: RADIUS,
                    boxShadow: `0 6px 14px ${alpha(t.palette.primary.main, 0.12)}`,
                })}
            >
                {icon}
            </Avatar>
            <Box>
                <Typography fontWeight={900}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {subtitle}
                </Typography>
            </Box>
        </Box>
    );
}

function PreviewRow({ label, value }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "120px 1fr", sm: "160px 1fr" },
                gap: 1,
                py: 0.75,
                borderBottom: (t) => `1px dashed ${alpha(t.palette.divider, 0.6)}`,
                "&:last-of-type": { borderBottom: "none" },
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.2 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                {typeof value === "string" || typeof value === "number" ? value : value}
            </Typography>
        </Box>
    );
}

function UploadBox({ onInput }) {
    const inputRef = React.useRef(null);
    return (
        <Box
            sx={(t) => ({
                border: `2px dashed ${alpha(t.palette.primary.main, 0.35)}`,
                borderRadius: RADIUS,
                p: 2,
                textAlign: "center",
                bgcolor: alpha(t.palette.primary.main, 0.03),
            })}
        >
            <Typography fontWeight={800} sx={{ mb: 0.5 }}>
                Tải danh sách VIN (CSV / TXT)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                Kéo & thả tệp vào đây hoặc bấm nút tải lên
            </Typography>
            <input ref={inputRef} type="file" accept=".csv,.txt" hidden onChange={onInput} />
            <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => inputRef.current?.click()}
                sx={{ borderRadius: RADIUS, textTransform: "none", px: 2.5 }}
            >
                Chọn tệp
            </Button>
        </Box>
    );
}
