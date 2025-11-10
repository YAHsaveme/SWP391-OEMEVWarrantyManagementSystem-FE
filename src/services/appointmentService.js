// src/services/appointmentService.js
import axiosInstance from "./axiosInstance";

const isValidString = (val) => typeof val === "string" && val.trim().length > 0;

const appointmentService = {
    // ✅ GET /api/appointments/{appointmentId}/get
    async getById(appointmentId) {
        if (!isValidString(appointmentId)) return { success: false, message: "appointmentId không hợp lệ" };
        try {
            const res = await axiosInstance.get(`/appointments/${appointmentId}/get`);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] getById:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ PUT /api/appointments/{appointmentId}/update
    async update(appointmentId, payload = {}) {
        if (!isValidString(appointmentId)) return { success: false, message: "appointmentId không hợp lệ" };
        
        // Validation các field bắt buộc theo API
        if (!payload.claimId) return { success: false, message: "claimId là bắt buộc" };
        if (!payload.requiredSkill) return { success: false, message: "requiredSkill là bắt buộc" };
        if (!payload.technicianId) return { success: false, message: "technicianId là bắt buộc" };
        if (!Array.isArray(payload.slotIds) || payload.slotIds.length === 0)
            return { success: false, message: "slotIds là bắt buộc và phải có ít nhất 1 slot" };

        // Loại bỏ field rỗng (trừ các field bắt buộc đã validate ở trên)
        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, v]) => {
                // Giữ lại các field bắt buộc và các field có giá trị
                if (v === null || v === undefined) return false;
                // Giữ lại empty string cho note (có thể để trống)
                if (typeof v === "string" && v === "" && payload.note !== undefined) return true;
                // Giữ lại các giá trị khác
                return true;
            })
        );

        try {
            console.log("[AppointmentService] update payload:", cleanPayload);
            console.log("[AppointmentService] update appointmentId:", appointmentId);
            console.log("[AppointmentService] update claimId:", cleanPayload.claimId);
            console.log("[AppointmentService] update requiredSkill:", cleanPayload.requiredSkill);
            console.log("[AppointmentService] update technicianId:", cleanPayload.technicianId);
            console.log("[AppointmentService] update slotIds:", cleanPayload.slotIds);
            console.log("[AppointmentService] update workingStartTime:", cleanPayload.workingStartTime);
            console.log("[AppointmentService] update workingEndTime:", cleanPayload.workingEndTime);
            
            const res = await axiosInstance.put(`/appointments/${appointmentId}/update`, cleanPayload);
            console.log("[AppointmentService] update success:", res.data);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] update error response:", err.response);
            console.error("[AppointmentService] update error data:", err.response?.data);
            console.error("[AppointmentService] update error status:", err.response?.status);
            console.error("[AppointmentService] update error message:", err.message);
            
            const errorData = err.response?.data;
            const errorMessage = errorData?.message || errorData?.error || err.message || "Lỗi khi cập nhật appointment";
            return { success: false, error: errorData || err, message: errorMessage };
        }
    },

    // ✅ PUT /api/appointments/{appointmentId}/update-status
    async updateStatus(appointmentId, { status } = {}) {
        if (!isValidString(appointmentId)) return { success: false, message: "appointmentId không hợp lệ" };
        if (!isValidString(status)) return { success: false, message: "Trạng thái (status) là bắt buộc" };
        try {
            console.log("[AppointmentService] updateStatus:", appointmentId, status);
            const res = await axiosInstance.put(`/appointments/${appointmentId}/update-status`, { status });
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] updateStatus:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ GET /api/appointments/by-claim/{claimId}/get
    async getByClaim(claimId) {
        if (!isValidString(claimId)) return { success: false, message: "claimId không hợp lệ" };
        try {
            const res = await axiosInstance.get(`/appointments/by-claim/${claimId}/get`);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] getByClaim:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ GET /api/appointments/by-status/{status}/get
    async getByStatus(status) {
        if (!isValidString(status)) return { success: false, message: "status là bắt buộc" };
        try {
            const res = await axiosInstance.get(`/appointments/by-status/${encodeURIComponent(status)}/get`);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] getByStatus:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ GET /api/appointments/by-technician/{technicianId}/get
    async getByTechnician(technicianId) {
        if (!isValidString(technicianId)) return { success: false, message: "technicianId không hợp lệ" };
        try {
            const res = await axiosInstance.get(`/appointments/by-technician/${technicianId}/get`);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] getByTechnician:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ POST /api/appointments/create
    async create(payload = {}) {
        if (!isValidString(payload.claimId)) return { success: false, message: "claimId là bắt buộc" };
        if (!Array.isArray(payload.slotIds) || payload.slotIds.length === 0)
            return { success: false, message: "slotIds là bắt buộc và phải có ít nhất 1 slot" };
        if (!isValidString(payload.technicianId))
            return { success: false, message: "technicianId là bắt buộc" };

        // Loại bỏ field rỗng
        const cleanPayload = Object.fromEntries(
            Object.entries({
                ...payload,
                type: payload.type || "RECALL", // fallback theo Swagger mặc định
            }).filter(([_, v]) => v !== null && v !== undefined && v !== "")
        );

        try {
            console.log("[AppointmentService] create payload:", cleanPayload);
            console.log("[AppointmentService] claimId:", cleanPayload.claimId);
            console.log("[AppointmentService] technicianId:", cleanPayload.technicianId);
            console.log("[AppointmentService] slotIds:", cleanPayload.slotIds);
            console.log("[AppointmentService] slotIds type:", Array.isArray(cleanPayload.slotIds) ? "array" : typeof cleanPayload.slotIds);
            console.log("[AppointmentService] slotIds length:", cleanPayload.slotIds?.length);
            
            const res = await axiosInstance.post(`/appointments/create`, cleanPayload);
            console.log("[AppointmentService] create success:", res.data);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] create error response:", err.response);
            console.error("[AppointmentService] create error data:", err.response?.data);
            console.error("[AppointmentService] create error status:", err.response?.status);
            console.error("[AppointmentService] create error message:", err.message);
            
            const errorData = err.response?.data;
            const errorMessage = errorData?.message || errorData?.error || err.message || "Lỗi khi tạo lịch hẹn";
            return { success: false, error: errorData || err, message: errorMessage };
        }
    },

    // ✅ GET /api/appointments/get-all
    async getAll() {
        try {
            const res = await axiosInstance.get(`/appointments/get-all`);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] getAll:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },

    // ✅ POST /api/appointments/suggest-technicians
    async suggestTechnicians(payload = {}) {
        if (!isValidString(payload.requiredSkill))
            return { success: false, message: "requiredSkill là bắt buộc" };
        if (!isValidString(payload.workDate))
            return { success: false, message: "workDate là bắt buộc" };

        try {
            console.log("[AppointmentService] suggestTechnicians payload:", payload);
            const res = await axiosInstance.post(`/appointments/suggest-technicians`, payload);
            return { success: true, data: res.data };
        } catch (err) {
            console.error("[AppointmentService] suggestTechnicians:", err.response?.data || err.message);
            return { success: false, error: err.response?.data || err };
        }
    },
};

export default appointmentService;
