import axiosInstance from "./axiosInstance";

const API_BASE = "inventory-parts";

// unwrap tiện dụng + log lỗi
const unwrap = (p) =>
    p.then((r) => r.data).catch((e) => {
        console.error("❌ API Error:", e?.response?.data || e?.message || e);
        throw e;
    });

// Phòng khi axiosInstance chưa add Authorization (vẫn thêm cho chắc)
const getAuthHeader = () => {
    const raw =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        "";
    const val = raw.startsWith("Bearer ") ? raw : raw ? `Bearer ${raw}` : "";
    return val ? { Authorization: val } : {};
};

/**
 * Service đầy đủ cho quản lý tồn kho Part.
 * - ⚙️ EVM_STAFF: dùng tất cả CRUD (create, update, upsert, search…)
 * - 🧰 SC_STAFF: chỉ dùng listByCenter, listByPart (qua staffInventoryFacade)
 */
const inventoryPartService = {
    /** ✅ Dùng cho cả SC_STAFF & EVM
     * GET /api/inventory-parts/{centerId}/list-by-center
     */
    listByCenter: (centerId) =>
        unwrap(
            axiosInstance.get(`${API_BASE}/${encodeURIComponent(centerId)}/list-by-center`, {
                headers: getAuthHeader(),
            })
        ),

    /** ⚙️ EVM_STAFF: POST /api/inventory-parts/{centerId}/upsert-by-center
     * payload: { items: [{ partId, quantity, minQty, maxQty, status }, ...] }
     * ⚠️ SC_STAFF không gọi trực tiếp (sử dụng staffInventoryFacade thay thế)
     */
    upsertByCenter: (centerId, payload = {}) =>
        unwrap(
            axiosInstance.post(
                `${API_BASE}/${encodeURIComponent(centerId)}/upsert-by-center`,
                payload,
                { headers: getAuthHeader() }
            )
        ),

    /** ⚙️ EVM_STAFF: GET /api/inventory-parts/{id}/get */
    get: (id) =>
        unwrap(
            axiosInstance.get(`${API_BASE}/${encodeURIComponent(id)}/get`, {
                headers: getAuthHeader(),
            })
        ),

    /** ⚙️ EVM_STAFF: PUT /api/inventory-parts/{id}/update */
    update: (id, body = {}) =>
        unwrap(
            axiosInstance.put(`${API_BASE}/${encodeURIComponent(id)}/update`, body, {
                headers: getAuthHeader(),
            })
        ),

    /** ✅ Dùng cho cả SC_STAFF & EVM
     * GET /api/inventory-parts/{partId}/list-by-part
     */
    listByPart: (partId) =>
        unwrap(
            axiosInstance.get(`${API_BASE}/${encodeURIComponent(partId)}/list-by-part`, {
                headers: getAuthHeader(),
            })
        ),

    /** ⚙️ EVM_STAFF: POST /api/inventory-parts/create */
    create: (body = {}) =>
        unwrap(
            axiosInstance.post(`${API_BASE}/create`, body, {
                headers: getAuthHeader(),
            })
        ),

    /** ⚙️ EVM_STAFF: GET /api/inventory-parts/search?q=... */
    search: (params = {}) =>
        unwrap(
            axiosInstance.get(`${API_BASE}/search`, {
                headers: getAuthHeader(),
                params,
            })
        ),

    /** ⚙️ EVM_STAFF: GET /api/inventory-parts/get-all */
    getAll: () =>
        unwrap(
            axiosInstance.get(`${API_BASE}/get-all`, {
                headers: getAuthHeader(),
            })
        ),
};

export default inventoryPartService;
