// src/services/partLotService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "/part-lots";

/**
 * Service để quản lý PartLots
 */
const partLotService = {
    /**
     * GET /api/part-lots/by-part/{partId}/get
     * Lấy danh sách PartLots theo partId (tất cả centers)
     */
    getByPart: async (partId) => {
        try {
            const response = await axiosInstance.get(`${API_BASE}/by-part/${encodeURIComponent(partId)}/get`);
            return response?.data || response;
        } catch (e) {
            console.error("Failed to load part lots by part:", e);
            throw e;
        }
    },

    /**
     * GET /api/part-lots/by-part/{partId}/by-center/{centerId}/get
     * Lấy danh sách PartLots theo partId và centerId
     */
    getByPartByCenter: async (partId, centerId) => {
        try {
            const response = await axiosInstance.get(
                `${API_BASE}/by-part/${encodeURIComponent(partId)}/by-center/${encodeURIComponent(centerId)}/get`
            );
            return response?.data || response;
        } catch (e) {
            console.error("Failed to load part lots by part and center:", e);
            throw e;
        }
    },

    /**
     * GET /api/part-lots/get-all
     * Lấy tất cả PartLots
     */
    getAll: async () => {
        try {
            const response = await axiosInstance.get(`${API_BASE}/get-all`);
            return response?.data || response;
        } catch (e) {
            console.error("Failed to load all part lots:", e);
            throw e;
        }
    },
};

export default partLotService;

