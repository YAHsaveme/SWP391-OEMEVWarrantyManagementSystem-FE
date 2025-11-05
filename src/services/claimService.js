// src/services/claimService.js
import axiosInstance from "./axiosInstance";

const BASE = "/claims";

/** Đồng bộ với BE */
export const CLAIM_STATUS = {
  DIAGNOSING: "DIAGNOSING",
  ESTIMATING: "ESTIMATING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
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
  /** GET /api/claims/get-all */
  getAll: () => unwrap(axiosInstance.get(`${BASE}/get-all`)),

  /** GET /api/claims/{id}/get */
  getById: (id) => {
    if (!id) throw new Error("⚠️ claimId không được để trống!");
    return unwrap(axiosInstance.get(`${BASE}/${encodeURIComponent(id)}/get`));
  },

  /** GET /api/claims/by-vin/{vin}/get */
  getByVin: (vin) => {
    if (!vin) throw new Error("⚠️ VIN không được để trống!");
    return unwrap(
      axiosInstance.get(`${BASE}/by-vin/${encodeURIComponent(vin)}/get`)
    );
  },

  /** GET /api/claims/by-status/{status}/get */
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

  /** POST /api/claims/create */
  create: (payload = {}) => {
    if (!payload?.vin) throw new Error("⚠️ VIN là bắt buộc!");
    if (!payload?.claimType) throw new Error("⚠️ claimType là bắt buộc!");
    if (!payload?.errorDate) throw new Error("⚠️ errorDate là bắt buộc!");

    const draft = {
      vin: String(payload.vin).trim(),
      claimType: String(payload.claimType).trim(), // NORMAL/GOODWILL/RECALL/...
      coverageType: payload.coverageType?.toString().trim(),
      errorDate: new Date(payload.errorDate).toISOString(),
      odometerKm:
        payload.odometerKm != null ? Number(payload.odometerKm) : undefined,
      summary: payload.summary?.toString().trim(),
      intakeContactName: payload.intakeContactName?.toString().trim(),
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter(Boolean)
        : undefined,
      exclusion: payload.exclusion?.toString().trim(),
    };

    // bỏ các key undefined/null/empty string trước khi gửi để tránh 400
    const cleanPayload = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => {
        if (v === undefined || v === null) return false;
        if (typeof v === "string" && v.trim() === "") return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      })
    );

    console.log("[ClaimService] create payload:", cleanPayload);
    return unwrap(axiosInstance.post(`${BASE}/create`, cleanPayload));
  },

  /** PUT /api/claims/{claimId}/update */
  update: (claimId, payload = {}) => {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");

    const draft = {
      summary: payload.summary?.toString().trim(),
      attachmentUrls: Array.isArray(payload.attachmentUrls)
        ? payload.attachmentUrls.filter(Boolean)
        : undefined,
      odometerKm:
        payload.odometerKm != null ? Number(payload.odometerKm) : undefined,
      errorDate: payload.errorDate
        ? new Date(payload.errorDate).toISOString()
        : undefined,
      exclusion: payload.exclusion?.toString().trim(),
    };

    const cleanPayload = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v !== undefined && v !== null)
    );

    return unwrap(
      axiosInstance.put(`${BASE}/${encodeURIComponent(claimId)}/update`, cleanPayload)
    );
  },

  /** PUT /api/claims/{claimId}/update-status */
  updateStatus: (claimId, status, reasonNote = "") => {
    if (!claimId) throw new Error("⚠️ claimId là bắt buộc!");
    if (!Object.values(CLAIM_STATUS).includes(status)) {
      throw new Error(
        `⚠️ Trạng thái không hợp lệ! (${Object.keys(CLAIM_STATUS).join(", ")})`
      );
    }
    const body = { status };
    if (reasonNote?.trim()) body.reasonNote = reasonNote.trim();

    return unwrap(
      axiosInstance.put(
        `${BASE}/${encodeURIComponent(claimId)}/update-status`,
        body
      )
    );
  },
};

export default claimService;
