// src/services/estimatesService.js
import axiosInstance from "./axiosInstance";

const BASE = "estimates";

const estimatesService = {
  /**
   * ✅ Validate payload trước khi gửi
   * @param {Object} payload
   */
  validatePayload(payload) {
    if (!payload) throw new Error("Payload không được để trống.");
    if (!payload.claim_id)
      throw new Error("Thiếu claim_id trong payload.");
    if (!Array.isArray(payload.itemsJson))
      throw new Error("itemsJson phải là một mảng hợp lệ.");
    if (payload.itemsJson.length === 0)
      throw new Error("Cần ít nhất 1 item trong itemsJson.");
    for (const it of payload.itemsJson) {
      if (!it.partId) throw new Error("Mỗi item phải có partId hợp lệ.");
      if (typeof it.quantity !== "number" || it.quantity <= 0)
        throw new Error(`Số lượng cho partId=${it.partId} phải > 0.`);
    }
    return true;
  },

  /**
   * POST /api/estimates/create
   */
  async create(payload) {
    try {
      this.validatePayload(payload);
      const res = await axiosInstance.post(`${BASE}/create`, payload);
      return res.data;
    } catch (err) {
      console.error("[estimatesService.create] ❌", err);
      throw err.response?.data || err.message || "Lỗi khi tạo estimate";
    }
  },

  /**
   * PUT /api/estimates/{id}/update
   */
  async update(id, payload) {
    if (!id) throw new Error("Thiếu id để cập nhật estimate.");
    try {
      this.validatePayload(payload);
      const res = await axiosInstance.put(
        `${BASE}/${encodeURIComponent(id)}/update`,
        payload
      );
      return res.data;
    } catch (err) {
      console.error("[estimatesService.update] ❌", err);
      throw err.response?.data || err.message || "Lỗi khi cập nhật estimate";
    }
  },

  /**
   * GET /api/estimates/{id}/get
   */
  async getById(id) {
    if (!id) throw new Error("Thiếu id khi gọi getById.");
    try {
      const res = await axiosInstance.get(
        `${BASE}/${encodeURIComponent(id)}/get`
      );
      return res.data;
    } catch (err) {
      console.error("[estimatesService.getById] ❌", err);
      throw err.response?.data || err.message || "Lỗi khi tải estimate theo ID";
    }
  },

  /**
   * GET /api/estimates/{claimId}/get-by-claim
   */
  async getByClaim(claimId) {
    if (!claimId) throw new Error("Thiếu claimId khi gọi getByClaim.");
    try {
      const res = await axiosInstance.get(
        `${BASE}/${encodeURIComponent(claimId)}/get-by-claim`
      );
      return res.data;
    } catch (err) {
      console.error("[estimatesService.getByClaim] ❌", err);
      throw (
        err.response?.data ||
        err.message ||
        "Lỗi khi tải danh sách estimate theo claim"
      );
    }
  },

  /**
   * GET /api/estimates/{claimId}/{versionNo}/get
   */
  async getByClaimAndVersion(claimId, versionNo) {
    if (!claimId) throw new Error("Thiếu claimId khi gọi getByClaimAndVersion.");
    if (versionNo === undefined || versionNo === null)
      throw new Error("Thiếu versionNo khi gọi getByClaimAndVersion.");
    try {
      const res = await axiosInstance.get(
        `${BASE}/${encodeURIComponent(claimId)}/${encodeURIComponent(
          versionNo
        )}/get`
      );
      return res.data;
    } catch (err) {
      console.error("[estimatesService.getByClaimAndVersion] ❌", err);
      throw (
        err.response?.data ||
        err.message ||
        "Lỗi khi tải estimate theo claim và version"
      );
    }
  },

  /**
   * (Tùy chọn mở rộng) DELETE /api/estimates/{id}/delete
   * Dự phòng cho tương lai nếu backend hỗ trợ xoá.
   */
  async delete(id) {
    if (!id) throw new Error("Thiếu id để xoá estimate.");
    try {
      const res = await axiosInstance.delete(
        `${BASE}/${encodeURIComponent(id)}/delete`
      );
      return res.data;
    } catch (err) {
      console.error("[estimatesService.delete] ❌", err);
      throw err.response?.data || err.message || "Lỗi khi xoá estimate";
    }
  },
};

export default estimatesService;
