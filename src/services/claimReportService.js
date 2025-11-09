// src/services/claimReportService.js
import axiosInstance from "./axiosInstance";

const BASE = "/claim-reports";

// Helper: unwrap + log lỗi rõ endpoint khi 400/500
const unwrap = (p) =>
    p.then((r) => r.data).catch((e) => {
        const m = e?.config?.method?.toUpperCase();
        const url = e?.config?.url;
        console.error(`❌ ClaimReport API Error [${m} ${url}]`, e.response?.data || e.message);
        throw e;
    });

const claimReportService = {
    /** ✅ GET /api/claim-reports/get-all */
    getAll: () => {
        return unwrap(axiosInstance.get(`${BASE}/get-all`));
    },

    /** ✅ GET /api/claim-reports/{reportId}/get */
    getById: (reportId) => {
        if (!reportId) throw new Error("⚠️ reportId không được để trống!");
        return unwrap(
            axiosInstance.get(`${BASE}/${encodeURIComponent(reportId)}/get`)
        );
    },

    /** ✅ GET /api/claim-reports/{claimId}/get-by-claim */
    getByClaim: (claimId) => {
        if (!claimId) throw new Error("⚠️ claimId không được để trống!");
        return unwrap(
            axiosInstance.get(`${BASE}/${encodeURIComponent(claimId)}/get-by-claim`)
        );
    },

    /** ✅ POST /api/claim-reports/create */
    create: (payload = {}) => {
        if (!payload?.claimId) throw new Error("⚠️ claimId là bắt buộc!");

        const draft = {
            claimId: String(payload.claimId).trim(),
            note: payload.note?.toString().trim() || undefined,
        };

        // Lọc bỏ field rỗng/undefined/null (trừ claimId)
        const cleanPayload = {
            claimId: draft.claimId,
            ...(draft.note && draft.note.trim() !== "" ? { note: draft.note } : {}),
        };

        console.log("[ClaimReportService] create payload:", cleanPayload);
        return unwrap(axiosInstance.post(`${BASE}/create`, cleanPayload));
    },

    /** ✅ PUT /api/claim-reports/{reportId}/update */
    update: (reportId, payload = {}) => {
        if (!reportId) throw new Error("⚠️ reportId là bắt buộc!");

        const draft = {
            note: payload.note?.toString().trim() || undefined,
        };

        // Chỉ gửi note nếu có giá trị
        const cleanPayload = {};
        if (draft.note && draft.note.trim() !== "") {
            cleanPayload.note = draft.note;
        } else {
            // Nếu note rỗng, vẫn gửi empty string để xóa note
            cleanPayload.note = "";
        }

        console.log("[ClaimReportService] update payload:", cleanPayload);
        return unwrap(
            axiosInstance.put(
                `${BASE}/${encodeURIComponent(reportId)}/update`,
                cleanPayload
            )
        );
    },
};

export default claimReportService;

