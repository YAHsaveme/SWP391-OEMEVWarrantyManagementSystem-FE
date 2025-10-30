import api from "./axiosInstance";

const BASE = "warranty-policies";

// 🧹 Utility: Xóa các field rỗng/null/undefined
const cleanObject = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined
    )
  );

// 🔄 Utility: Convert date + number đúng định dạng backend
const normalizePayload = (payload) => {
  if (!payload) return payload;
  const p = { ...payload };

  // Convert Date -> ISO string
  if (p.effectiveFrom instanceof Date)
    p.effectiveFrom = p.effectiveFrom.toISOString();
  if (p.effectiveTo instanceof Date)
    p.effectiveTo = p.effectiveTo.toISOString();

  // Convert number fields
  const numericKeys = [
    "termMonths",
    "mileageKm",
    "batterySohThreshold",
    "laborCoveragePct",
    "partsCoveragePct",
    "perClaimCapVND",
  ];
  numericKeys.forEach((key) => {
    if (p[key] !== undefined && p[key] !== null)
      p[key] = Number(p[key]);
  });

  // Handle nested goodwill
  if (p.goodwill) {
    p.goodwill = { ...p.goodwill };
    ["graceMonths", "graceKm", "tiersPct"].forEach((key) => {
      if (p.goodwill[key] !== undefined && p.goodwill[key] !== null)
        p.goodwill[key] = Number(p.goodwill[key]);
    });
  }

  return p;
};

// 🧩 Utility: Chuẩn hoá final payload gửi lên backend
const preparePayload = (payload) => cleanObject(normalizePayload(payload));

// 🧱 SERVICE
const warrantyPolicyService = {
  // 📘 Lấy tất cả policies
  getAll: async () => {
    try {
      const res = await api.get(`${BASE}/get-all`);
      return res.data;
    } catch (err) {
      console.error("❌ getAll error:", err);
      throw err;
    }
  },

  // 🔍 Tìm kiếm policies (keyword, status, modelCode, page, size)
  search: async (params = {}) => {
    try {
      const cleanParams = cleanObject(params);
      const res = await api.post(`${BASE}/search`, cleanParams);
      return res.data;
    } catch (err) {
      console.error("❌ search error:", err);
      throw err;
    }
  },

  // 🆔 Lấy tất cả policies theo modelCode
  getByModelCode: async (modelCode) => {
    if (!modelCode) throw new Error("modelCode is required");
    try {
      const res = await api.get(`${BASE}/${encodeURIComponent(modelCode)}/get`);
      return res.data;
    } catch (err) {
      console.error("❌ getByModelCode error:", err);
      throw err;
    }
  },

  // 🆕 Tạo mới warranty policy
  create: async (payload) => {
    try {
      const res = await api.post(`${BASE}/create`, preparePayload(payload));
      return res.data;
    } catch (err) {
      console.error("❌ create policy error:", err);
      throw err;
    }
  },

  // ✏️ Cập nhật thông tin policy (update-info)
  updateInfo: async (policyId, payload) => {
    if (!policyId) throw new Error("policyId is required");
    try {
      const res = await api.put(
        `${BASE}/${policyId}/update-info`,
        preparePayload(payload)
      );
      return res.data;
    } catch (err) {
      console.error("❌ updateInfo error:", err);
      throw err;
    }
  },

  // 🔄 Cập nhật trạng thái (status-update)
  updateStatus: async (policyId, payload) => {
    if (!policyId) throw new Error("policyId is required");
    try {
      const res = await api.put(
        `${BASE}/${policyId}/status-update`,
        preparePayload(payload)
      );
      return res.data;
    } catch (err) {
      console.error("❌ updateStatus error:", err);
      throw err;
    }
  },

  // ♻️ Khôi phục policy (restore)
  restore: async (policyId, payload = {}) => {
    if (!policyId) throw new Error("policyId is required");
    try {
      const res = await api.post(
        `${BASE}/${policyId}/restore`,
        preparePayload(payload)
      );
      return res.data;
    } catch (err) {
      console.error("❌ restore error:", err);
      throw err;
    }
  },

  // 🚫 Vô hiệu hóa policy (disable)
  disable: async (policyId, payload) => {
    if (!policyId) throw new Error("policyId is required");
    try {
      const res = await api.post(
        `${BASE}/${policyId}/disable`,
        preparePayload(payload)
      );
      return res.data;
    } catch (err) {
      console.error("❌ disable error:", err);
      throw err;
    }
  },
};

export default warrantyPolicyService;
