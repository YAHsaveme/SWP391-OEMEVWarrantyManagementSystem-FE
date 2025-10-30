// src/services/appointmentService.js
import axiosInstance from "./axiosInstance";

const validateUuidLike = (val) => typeof val === "string" && val.trim().length > 0;

const appointmentService = {
    // GET /api/appointments/{appointmentId}/get
    async getById(appointmentId) {
        if (!validateUuidLike(appointmentId)) {
            return { success: false, message: "Invalid appointmentId" };
        }
        try {
            const res = await axiosInstance.get(`/appointments/${appointmentId}/get`);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] getById failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // PUT /api/appointments/{appointmentId}/update
    async update(appointmentId, payload = {}) {
        if (!validateUuidLike(appointmentId)) {
            return { success: false, message: "Invalid appointmentId" };
        }
        if (payload.slotIds && !Array.isArray(payload.slotIds)) {
            return { success: false, message: "slotIds must be an array" };
        }
        try {
            console.log("[AppointmentService] update payload:", payload);
            const res = await axiosInstance.put(`/appointments/${appointmentId}/update`, payload);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] update failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // PUT /api/appointments/{appointmentId}/update-status
    async updateStatus(appointmentId, { status } = {}) {
        if (!validateUuidLike(appointmentId)) {
            return { success: false, message: "Invalid appointmentId" };
        }
        if (typeof status !== "string" || status.trim() === "") {
            return { success: false, message: "status is required" };
        }
        try {
            console.log("[AppointmentService] updateStatus:", appointmentId, status);
            const res = await axiosInstance.put(`/appointments/${appointmentId}/update-status`, { status });
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] updateStatus failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // GET /api/appointments/by-claim/{claimId}/get
    async getByClaim(claimId) {
        if (!validateUuidLike(claimId)) {
            return { success: false, message: "Invalid claimId" };
        }
        try {
            const res = await axiosInstance.get(`/appointments/by-claim/${claimId}/get`);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] getByClaim failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // GET /api/appointments/by-status/{status}/get
    async getByStatus(status) {
        if (typeof status !== "string" || status.trim() === "") {
            return { success: false, message: "status is required" };
        }
        try {
            const res = await axiosInstance.get(`/appointments/by-status/${encodeURIComponent(status)}/get`);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] getByStatus failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // GET /api/appointments/by-technician/{technicianId}/get
    async getByTechnician(technicianId) {
        if (!validateUuidLike(technicianId)) {
            return { success: false, message: "Invalid technicianId" };
        }
        try {
            const res = await axiosInstance.get(`/appointments/by-technician/${technicianId}/get`);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] getByTechnician failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // POST /api/appointments/create
    async create(payload = {}) {
        // ✅ Validation cơ bản
        if (!payload.claimId || !payload.centerId) {
            console.warn("[AppointmentService] Missing claimId or centerId", payload);
            return { success: false, message: "claimId and centerId are required" };
        }
        if (!Array.isArray(payload.slotIds) || payload.slotIds.length === 0) {
            console.warn("[AppointmentService] Missing slotIds", payload);
            return { success: false, message: "At least one slotId is required" };
        }

        // ✅ Bổ sung fallback type (đề phòng backend null)
        if (!payload.type) {
            payload.type = "INSPECTION_ONLY";
        }

        // ✅ Xóa field null hoặc undefined để tránh backend reject
        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, v]) => v !== null && v !== undefined && v !== "")
        );

        try {
            console.log("[AppointmentService] create payload:", cleanPayload);
            const res = await axiosInstance.post(`/appointments/create`, cleanPayload);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] create failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // GET /api/appointments/get-all
    async getAll() {
        try {
            const res = await axiosInstance.get(`/appointments/get-all`);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] getAll failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },

    // POST /api/appointments/suggest-technicians
    async suggestTechnicians(payload = {}) {
        if (!payload.requiredSkill || !payload.workDate) {
            return { success: false, message: "requiredSkill and workDate are required" };
        }
        try {
            console.log("[AppointmentService] suggestTechnicians payload:", payload);
            const res = await axiosInstance.post(`/appointments/suggest-technicians`, payload);
            return { success: true, data: res.data };
        } catch (error) {
            console.error("[AppointmentService] suggestTechnicians failed:", error.response?.data || error);
            return { success: false, error: error.response?.data || error };
        }
    },
};

export default appointmentService;
