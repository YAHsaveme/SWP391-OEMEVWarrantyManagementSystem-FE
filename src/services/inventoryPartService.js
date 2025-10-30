// src/services/inventoryPartService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "inventory-parts";

// lấy token từ localStorage (ưu tiên "token", fallback "accessToken")
// và bảo đảm có tiền tố "Bearer "
const getAuthHeader = () => {
    const raw =
        localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
    const val = raw.startsWith("Bearer ") ? raw : (raw ? `Bearer ${raw}` : "");
    return val ? { Authorization: val } : {};
};

const inventoryPartService = {
    // GET /api/inventory-parts/{centerId}/list-by-center
    listByCenter: async (centerId) => {
        const { data } = await axiosInstance.get(
            `${API_BASE}/${centerId}/list-by-center`,
            { headers: getAuthHeader() } // <-- ép header cho chắc
        );
        return data;
    },

    // GET /api/inventory-parts/{id}/get
    get: async (id) => {
        const { data } = await axiosInstance.get(
            `${API_BASE}/${id}/get`,
            { headers: getAuthHeader() }
        );
        return data;
    },

    // PUT /api/inventory-parts/{id}/update
    update: async (id, payload) => {
        const { data } = await axiosInstance.put(
            `${API_BASE}/${id}/update`,
            payload,
            { headers: getAuthHeader() }
        );
        return data;
    },

    // GET /api/inventory-parts/{partId}/list-by-part
    listByPart: async (partId) => {
        const { data } = await axiosInstance.get(
            `${API_BASE}/${partId}/list-by-part`,
            { headers: getAuthHeader() }
        );
        return data;
    },

    // POST /api/inventory-parts/adjust-quantity
    adjustQuantity: async (payload) => {
        const { data } = await axiosInstance.post(
            `${API_BASE}/adjust-quantity`,
            payload,
            { headers: getAuthHeader() }
        );
        return data;
    },

    // POST /api/inventory-parts/create
    create: async (payload) => {
        const { data } = await axiosInstance.post(
            `${API_BASE}/create`,
            payload,
            { headers: getAuthHeader() }
        );
        return data;
    },

    // GET /api/inventory-parts/search
    search: async (params) => {
        const { data } = await axiosInstance.get(
            `${API_BASE}/search`,
            { params, headers: getAuthHeader() }
        );
        return data; // {content,totalPages,...} hoặc []
    },
};

export default inventoryPartService;
