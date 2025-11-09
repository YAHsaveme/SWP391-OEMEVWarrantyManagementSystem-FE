// src/services/claimService.js
import axiosInstance from "./axiosInstance";

const BASE = "/claims";

/** Đồng bộ hoàn toàn với BE enum ClaimStatus.java */
export const CLAIM_STATUS = {
  DIAGNOSING: "DIAGNOSING",
  ESTIMATING: "ESTIMATING",
  UNDER_REVIEW: "UNDER_REVIEW",
  CLOSED_NO_FAULT: "CLOSED_NO_FAULT",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

// Helper: unwrap + log lỗi rõ endpoint khi 400/500
const unwrap = (p) =>
  p.then((r) => r.data).catch((e) => {
    const m = e?.config?.method?.toUpperCase();
    const url = e?.config?.url;
    console.error(`❌ Claim API Error [${m} ${url}]`, e.response?.data || e.message);
    throw e;
  });

const claimService = {
  /** ✅ GET /api/claims/get-all */
  getAll: () => unwrap(axiosInstance.get(`${BASE}/get-all`)),

  /** ✅ GET /api/claims/{id}/get */
  getById: (id) => {
    if (!id) throw new Error("⚠️ claimId không được để trống!");
    return unwrap(axiosInstance.get(`${BASE}/${encodeURIComponent(id)}/get`));
  },

  /** ✅ GET /api/claims/by-vin/{vin}/get */
  getByVin: (vin) => {
    if (!vin) throw new Error("⚠️ VIN không được để trống!");
    return unwrap(
      axiosInstance.get(`${BASE}/by-vin/${encodeURIComponent(vin)}/get`)
    );
  },

  /** ✅ GET /api/claims/by-status/{status}/get */
  getByStatus: (status) => {
    if (!Object.values(CLAIM_STATUS).includes(status)) {
      throw new Error(
        `⚠️ Trạng thái không hợp lệ! (${Object.keys(CLAIM_STATUS).join(", ")})`
      );
    }
    return unwrap(
      axiosInstance.get(`${BASE}/by-status/${encodeURIComponent(status)}/get`)
    );
  },

  /** ✅ POST /api/claims/create */
  create: (payload = {}) => {
    if (!payload?.vin) throw new Error("⚠️ VIN là bắt buộc!");
    if (!payload?.errorDate) throw new Error("⚠️ errorDate là bắt buộc!");
    if (payload?.odometerKm == null)
      throw new Error("⚠️ odometerKm là bắt buộc!");

    const draft = {
      vin: String(payload.vin).trim(),
      errorDate: new Date(payload.errorDate).toISOString(),
      odometerKm: Number(payload.odometerKm),
      summary: payload.summary?.toString().trim(),
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter(Boolean)
        : [],
      exclusion: payload.exclusion?.toString().trim(),
    };

    // Lọc bỏ field rỗng/undefined/null
    const cleanPayload = Object.fromEntries(
      Object.entries(draft).filter(
        ([, v]) =>
          v !== undefined &&
          v !== null &&
          (typeof v !== "string" || v.trim() !== "")
      )
    );

    console.log("[ClaimService] create payload:", cleanPayload);
    return unwrap(axiosInstance.post(`${BASE}/create`, cleanPayload));
  },

  /** ✅ PUT /api/claims/{claimId}/update */
  update: (claimId, payload = {}) => {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");

    const draft = {
      summary: payload.summary?.toString().trim(),
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter(Boolean)
        : [],
      odometerKm:
        payload.odometerKm != null ? Number(payload.odometerKm) : undefined,
      errorDate: payload.errorDate
        ? new Date(payload.errorDate).toISOString()
        : undefined,
      exclusion: payload.exclusion?.toString().trim(),
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(draft).filter(
        ([, v]) =>
          v !== undefined &&
          v !== null &&
          (typeof v !== "string" || v.trim() !== "")
      )
    );

    return unwrap(
      axiosInstance.put(
        `${BASE}/${encodeURIComponent(claimId)}/update`,
        cleanPayload
      )
    );
  },

  /** ✅ PUT /api/claims/{claimId}/update-status */
  updateStatus: (claimId, status) => {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");
    if (!Object.values(CLAIM_STATUS).includes(status)) {
      throw new Error(
        `⚠️ Trạng thái không hợp lệ! (${Object.keys(CLAIM_STATUS).join(", ")})`
      );
    }

    const body = { status };

    return unwrap(
      axiosInstance.put(
        `${BASE}/${encodeURIComponent(claimId)}/update-status`,
        body
      )
    );
  },
};

export default claimService;
