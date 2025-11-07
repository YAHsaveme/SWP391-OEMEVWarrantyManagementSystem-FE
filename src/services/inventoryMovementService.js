// src/services/inventoryMovementService.js
import axiosInstance from "./axiosInstance";

const BASE_URL = "inventory-movements";

const inventoryMovementService = {
    /**
     * ======================================================
     * 🟢 POST /api/inventory-movements/service-use
     * ======================================================
     * Xuất kho linh kiện để sử dụng cho dịch vụ (Service Use)
     *
     * @param {Object} data
     * {
     *   appointmentId: string,
     *   partQuantities: [{ partId: string, quantity: number }],
     *   note?: string
     * }
     * @returns {Promise<AxiosResponse>}
     */
    serviceUse: (data) => {
        return axiosInstance.post(`${BASE_URL}/service-use`, data);
    },

    /**
     * ======================================================
     * 🔵 POST /api/inventory-movements/return
     * ======================================================
     * Trả lại linh kiện (Return parts)
     *
     * @param {Object} data
     * {
     *   appointmentId: string,
     *   partLotQuantities: [{ partLotId: string, quantity: number }],
     *   note?: string
     * }
     * @returns {Promise<AxiosResponse>}
     */
    returnParts: (data) => {
        return axiosInstance.post(`${BASE_URL}/return`, data);
    },

    /**
     * ======================================================
     * 🟡 GET /api/inventory-movements/{id}/get
     * ======================================================
     * Lấy chi tiết một lần di chuyển kho theo ID
     *
     * @param {string} id
     * @returns {Promise<AxiosResponse>}
     */
    getById: (id) => {
        return axiosInstance.get(`${BASE_URL}/${id}/get`);
    },

    /**
     * ======================================================
     * 🟣 GET /api/inventory-movements/{centerId}/list-by-center
     * ======================================================
     * Lấy danh sách các movement theo trung tâm (center)
     *
     * @param {string} centerId
     * @returns {Promise<AxiosResponse>}
     */
    listByCenter: (centerId) => {
        return axiosInstance.get(`${BASE_URL}/${centerId}/list-by-center`);
    },

    /**
     * ======================================================
     * 🟠 GET /api/inventory-movements/{appointmentId}/list-by-appointment
     * ======================================================
     * Lấy danh sách các movement theo appointment
     *
     * @param {string} appointmentId
     * @returns {Promise<AxiosResponse>}
     */
    listByAppointment: (appointmentId) => {
        return axiosInstance.get(`${BASE_URL}/${appointmentId}/list-by-appointment`);
    },

    /**
     * ======================================================
     * 🔍 GET /api/inventory-movements/search
     * ======================================================
     * Tìm kiếm hoặc lọc các movement theo điều kiện
     *
     * @param {Object} params
     * {
     *   centerId?: string,
     *   appointmentId?: string,
     *   partLotId?: string,
     *   direction?: "IN" | "OUT",
     *   reason?: "SHIPMENT_IN" | "SHIPMENT_OUT" | "SERVICE_USE" | "RETURN" | "ADJUSTMENT",
     *   startDate?: string (ISO),
     *   endDate?: string (ISO),
     *   page?: number,
     *   size?: number
     * }
     * @returns {Promise<AxiosResponse>}
     */
    search: (params = {}) => {
        return axiosInstance.get(`${BASE_URL}/search`, { params });
    },

    /**
     * ======================================================
     * 🔎 GET /api/inventory-movements/traceability/{vin}/parts
     * ======================================================
     * Truy xuất nguồn gốc phụ tùng theo VIN
     * Hiển thị lịch sử đầy đủ: Ngày sản xuất, Nhà cung cấp, Lần thay thế trước, Xe liên kết
     *
     * @param {string} vin - Vehicle Identification Number
     * @returns {Promise<AxiosResponse>}
     * Response: Array of parts with traceability info
     * {
     *   partId: string,
     *   partName: string,
     *   partNo: string,
     *   serialNo?: string,
     *   batchNo?: string,
     *   productionDate?: string,
     *   supplier?: string,
     *   previousReplacement?: {
     *     date: string,
     *     vin: string,
     *     reason: string
     *   },
     *   linkedVehicles: Array<{ vin: string, installedDate: string }>,
     *   movements: Array<{
     *     date: string,
     *     direction: "IN" | "OUT",
     *     reason: string,
     *     centerName: string
     *   }>
     * }
     */
    traceabilityByVin: (vin) => {
        return axiosInstance.get(`${BASE_URL}/traceability/${vin}/parts`);
    },
};

export default inventoryMovementService;
