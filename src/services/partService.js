// src/services/partService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "parts"; // bỏ "/" đầu để ghép với baseURL=/api/ gọn gàng

const partService = {
    create: async (data) => {
        const { data: res } = await axiosInstance.post(`${API_BASE}/create`, data);
        return res;
    },

    update: async (partId, data) => {
        const { data: res } = await axiosInstance.put(`${API_BASE}/${partId}/update`, data);
        return res;
    },

    delete: async (partId) => {
        const { data: res } = await axiosInstance.delete(`${API_BASE}/${partId}/delete`);
        return res;
    },

    recover: async (partId) => {
        const { data: res } = await axiosInstance.post(`${API_BASE}/${partId}/recover`);
        return res;
    },

    getAll: async () => {
        const { data } = await axiosInstance.get(`${API_BASE}/get-all`);
        return Array.isArray(data) ? data : [];
    },

    getActive: async () => {
        const { data } = await axiosInstance.get(`${API_BASE}/get-active`);
        return Array.isArray(data) ? data : [];
    },

    // Thử endpoint cơ bản không có suffix
    list: async () => {
        try {
            const { data } = await axiosInstance.get(`${API_BASE}`);
            return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            console.warn("[partService] list() failed:", err);
            return [];
        }
    },

    search: async (keyword) => {
        const { data } = await axiosInstance.get(`${API_BASE}/search`, { params: { keyword } });
        return Array.isArray(data) ? data : [];
    },

    /** tiện ích: lấy map {partId: {isSerialized, partNo, partName}} để FE quyết định form */
    getIsSerializedMap: async () => {
        const list = await partService.getAll(); // hoặc getActive()
        const normBool = (raw) =>
            typeof raw === "boolean" ? raw :
                typeof raw === "number" ? raw === 1 :
                    typeof raw === "string" ? ["1", "true"].includes(raw.toLowerCase()) :
                        false;

        const map = {};
        list.forEach(p => {
            if (p?.id) {
                map[p.id] = {
                    isSerialized: normBool(p.isSerialized),
                    partNo: p.partNo || "",
                    partName: p.partName || "",
                };
            }
        });
        return map;
    },
};

export default partService;
