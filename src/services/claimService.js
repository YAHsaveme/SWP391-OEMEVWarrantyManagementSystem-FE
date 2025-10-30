// src/services/claimService.js
import axiosInstance from "./axiosInstance";

const BASE = "claims";

/**
 * 📦 ENUM - Trạng thái khiếu nại (ClaimStatus)
 * Đồng bộ hoàn toàn với backend: com.example.Warranty.enums.ClaimStatus
 */
export const CLAIM_STATUS = {
  DIAGNOSING: "DIAGNOSING",      // Đang chẩn đoán lỗi
  ESTIMATING: "ESTIMATING",      // Đang lập báo giá
  UNDER_REVIEW: "UNDER_REVIEW",  // Đang chờ xem xét / duyệt
  APPROVED: "APPROVED",          // Đã được duyệt
  COMPLETED: "COMPLETED",        // Đã hoàn tất quy trình
  REJECTED: "REJECTED",          // Bị từ chối
};

/**
 * 🧠 claimService - Service quản lý Claims
 * Gồm đầy đủ tất cả API:
 * - GET /get-all
 * - GET /{id}/get
 * - GET /by-vin/{vin}/get
 * - GET /by-status/{status}/get
 * - POST /create
 * - PUT /{claimId}/update
 * - PUT /{claimId}/update-status
 */
const claimService = {
  /**
   * 🧾 Lấy tất cả Claims
   * GET /api/claims/get-all
   * @returns {Promise<Array>} Danh sách tất cả claims
   */
  async getAll() {
    const res = await axiosInstance.get(`${BASE}/get-all`);
    return res.data;
  },

  /**
   * 🔍 Lấy claim theo ID
   * GET /api/claims/{id}/get
   * @param {string} id - claimId (UUID)
   * @returns {Promise<Object>} Dữ liệu claim
   */
  async getById(id) {
    if (!id) throw new Error("⚠️ claimId không được để trống!");
    const res = await axiosInstance.get(`${BASE}/${id}/get`);
    return res.data;
  },

  /**
   * 🚗 Lấy danh sách claim theo VIN
   * GET /api/claims/by-vin/{vin}/get
   * @param {string} vin - Mã số khung xe
   * @returns {Promise<Array>} Danh sách claims thuộc VIN
   */
  async getByVin(vin) {
    if (!vin) throw new Error("⚠️ VIN không được để trống!");
    const res = await axiosInstance.get(`${BASE}/by-vin/${encodeURIComponent(vin)}/get`);
    return res.data;
  },

  /**
   * 📊 Lấy danh sách claim theo trạng thái
   * GET /api/claims/by-status/{status}/get
   * @param {string} status - Một trong các giá trị thuộc ClaimStatus enum
   * @returns {Promise<Array>} Danh sách claim theo trạng thái
   */
  async getByStatus(status) {
    if (!Object.values(CLAIM_STATUS).includes(status)) {
      throw new Error(
        `⚠️ Trạng thái không hợp lệ! Phải là một trong: ${Object.keys(CLAIM_STATUS).join(", ")}`
      );
    }
    const res = await axiosInstance.get(`${BASE}/by-status/${encodeURIComponent(status)}/get`);
    return res.data;
  },

  /**
   * ➕ Tạo mới Claim
   * POST /api/claims/create
   * @param {Object} payload - Dữ liệu khi tạo claim
   * {
   *   vin: string,
   *   claimType: string, // NORMAL, GOODWILL,...
   *   errorDate: string (ISO 8601),
   *   odometerKm: number,
   *   summary: string,
   *   attachmentUrls: [string],
   *   exclusion: string
   * }
   * @returns {Promise<Object>} Claim vừa tạo
   */
  async create(payload) {
    if (!payload?.vin) throw new Error("⚠️ VIN là bắt buộc!");
    if (!payload?.claimType) throw new Error("⚠️ claimType là bắt buộc!");
    if (!payload?.errorDate) throw new Error("⚠️ errorDate là bắt buộc!");

    // Làm sạch dữ liệu trước khi gửi
    const cleanPayload = {
      vin: payload.vin.trim(),
      claimType: payload.claimType.trim(),
      errorDate: new Date(payload.errorDate).toISOString(),
      odometerKm: Number(payload.odometerKm || 0),
      summary: payload.summary?.trim() || "",
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter((x) => x)
        : [],
      exclusion: payload.exclusion?.trim() || "",
    };

    const res = await axiosInstance.post(`${BASE}/create`, cleanPayload);
    return res.data;
  },

  /**
   * ✏️ Cập nhật thông tin Claim
   * PUT /api/claims/{claimId}/update
   * @param {string} claimId - UUID của claim
   * @param {Object} payload - Dữ liệu cập nhật
   * {
   *   summary: string,
   *   attachmentUrls: [string],
   *   odometerKm: number,
   *   errorDate: string (ISO 8601),
   *   exclusion: string
   * }
   * @returns {Promise<Object>} Claim đã được cập nhật
   */
  async update(claimId, payload) {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");
    if (!payload) throw new Error("⚠️ payload không được để trống!");

    const cleanPayload = {
      summary: payload.summary?.trim() || "",
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter((x) => x)
        : [],
      odometerKm: Number(payload.odometerKm || 0),
      errorDate: payload.errorDate ? new Date(payload.errorDate).toISOString() : null,
      exclusion: payload.exclusion?.trim() || "",
    };

    const res = await axiosInstance.put(`${BASE}/${claimId}/update`, cleanPayload);
    return res.data;
  },

  /**
   * 🔄 Cập nhật trạng thái Claim
   * PUT /api/claims/{claimId}/update-status
   * @param {string} claimId - UUID của claim
   * @param {string} status - Giá trị thuộc ClaimStatus enum
   * @returns {Promise<Object>} Claim sau khi cập nhật trạng thái
   */
  async updateStatus(claimId, status) {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");
    if (!Object.values(CLAIM_STATUS).includes(status)) {
      throw new Error(
        `⚠️ Trạng thái không hợp lệ! Chỉ chấp nhận: ${Object.keys(CLAIM_STATUS).join(", ")}`
      );
    }

    const res = await axiosInstance.put(`${BASE}/${claimId}/update-status`, { status });
    return res.data;
  },
};

export default claimService;
