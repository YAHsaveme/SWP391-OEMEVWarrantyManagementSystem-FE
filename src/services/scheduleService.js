import axiosInstance from "./axiosInstance";

/**
 * ============================
 * scheduleService (Full Version)
 * ============================
 * Bao gồm đầy đủ API endpoints:
 *  - GET  /api/auth/staff/technicians
 *  - GET  /api/technicians/{technicianId}/schedules/get-slots
 *  - POST /api/technicians/{technicianId}/schedules/book
 *  - POST /api/technicians/{technicianId}/schedules/cancel
 *  - POST /api/technicians/{technicianId}/schedules/restore
 *  - POST /api/technicians/{technicianId}/schedules/generate-month
 *  - POST /api/technicians/{technicianId}/schedules/create-sunday
 */

const API_BASE_TECH = "technicians";

/* ------------------------------------------------------------- */
/* 🧩 Helper functions */
/* ------------------------------------------------------------- */

/** Định dạng kết quả chuẩn */
const result = (success, message, data = null, meta = {}) => ({
  success,
  message,
  data,
  meta,
});

/** Tạm dừng (cho retry) */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gọi POST có retry */
async function postWithRetry(url, payload, retries = 1, delayMs = 400) {
  let lastError = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axiosInstance.post(url, payload);
      return res;
    } catch (err) {
      lastError = err;
      if (i < retries) {
        console.warn(`[Retry ${i + 1}] ${url}`);
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------- */
/* ⚙️ Service chính */
/* ------------------------------------------------------------- */

const scheduleService = {
  /**
   * 📘 Lấy danh sách tất cả kỹ thuật viên
   * GET /api/technicians/get-all
   */
  async getAll() {
    try {
      const res = await axiosInstance.get(`${API_BASE_TECH}/get-all`);
      const data = res?.data ?? [];
      return data;
    } catch (err) {
      console.error("❌ technicianService.getAll error:", err);
      throw err;
    }
  },

  /**
   * 📅 Lấy lịch (slots) của kỹ thuật viên theo khoảng ngày
   * GET /api/technicians/{technicianId}/schedules/get-slots?from=&to=
   */
  async getTechnicianSlots(technicianId, from, to) {
    if (!technicianId || !from || !to)
      return result(false, "Thiếu technicianId hoặc khoảng thời gian (from, to)");

    try {
      const res = await axiosInstance.get(`${API_BASE_TECH}/${technicianId}/schedules/get-slots`, {
        params: { from, to },
      });

      const data = res?.data ?? {};
      let slots = [];
      if (Array.isArray(data.days)) {
        slots = data.days.flatMap((d) =>
          d.slots.map((s) => ({
            id: s.id,
            workDate: d.workDate,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            note: s.note,
          }))
        );
      }
      return result(true, "Lấy lịch làm việc thành công", slots, { raw: data });
    } catch (err) {
      console.error("❌ getTechnicianSlots error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi lấy lịch làm việc", null, { error: err });
    }
  },

  /**
   * 🕒 Đặt lịch
   * POST /api/technicians/{technicianId}/schedules/book
   */
  async bookSchedule(technicianId, payload) {
    if (!technicianId) return result(false, "Thiếu technicianId để đặt lịch");
    const required = ["centerId", "workDate", "startTime"];
    for (const f of required) if (!payload?.[f]) return result(false, `Thiếu trường bắt buộc: ${f}`);

    try {
      const res = await postWithRetry(`${API_BASE_TECH}/${technicianId}/schedules/book`, {
        centerId: payload.centerId,
        workDate: payload.workDate,
        startTime: payload.startTime,
        note: payload.note || "",
      });
      return result(true, res.data?.message || "Đặt lịch thành công", res.data, {
        affectedSlots: res.data?.affectedSlots,
        operationId: res.data?.operationId,
      });
    } catch (err) {
      console.error("❌ bookSchedule error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi đặt lịch", null, { error: err });
    }
  },

  /**
   * ❌ Hủy lịch
   * POST /api/technicians/{technicianId}/schedules/cancel
   */
  async cancelSchedule(technicianId, payload) {
    if (!technicianId) return result(false, "Thiếu technicianId để hủy lịch");
    const required = ["dateFrom", "dateTo", "slotTimes"];
    for (const f of required) if (!payload?.[f]) return result(false, `Thiếu trường bắt buộc: ${f}`);

    try {
      const res = await postWithRetry(`${API_BASE_TECH}/${technicianId}/schedules/cancel`, {
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        slotTimes: payload.slotTimes,
        note: payload.note || "",
      });
      return result(true, res.data?.message || "Hủy lịch thành công", res.data, {
        affectedSlots: res.data?.affectedSlots,
        operationId: res.data?.operationId,
      });
    } catch (err) {
      console.error("❌ cancelSchedule error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi hủy lịch", null, { error: err });
    }
  },

  /**
   * 🔄 Khôi phục lịch
   * POST /api/technicians/{technicianId}/schedules/restore
   */
  async restoreSchedule(technicianId, payload) {
    if (!technicianId) return result(false, "Thiếu technicianId để khôi phục lịch");
    const required = ["dateFrom", "dateTo", "slotTimes"];
    for (const f of required) if (!payload?.[f]) return result(false, `Thiếu trường bắt buộc: ${f}`);

    try {
      const res = await postWithRetry(`${API_BASE_TECH}/${technicianId}/schedules/restore`, {
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        slotTimes: payload.slotTimes,
      });
      return result(true, res.data?.message || "Khôi phục lịch thành công", res.data, {
        affectedSlots: res.data?.affectedSlots,
        operationId: res.data?.operationId,
      });
    } catch (err) {
      console.error("❌ restoreSchedule error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi khôi phục lịch", null, { error: err });
    }
  },

  /**
   * 🗓️ Tạo lịch tháng
   * POST /api/technicians/{technicianId}/schedules/generate-month
   */
  async generateMonthSchedule(technicianId, payload) {
    if (!technicianId) return result(false, "Thiếu technicianId để tạo lịch tháng");
    const required = ["targetMonth"];
    for (const f of required) if (!payload?.[f]) return result(false, `Thiếu trường bắt buộc: ${f}`);

    try {
      const res = await postWithRetry(`${API_BASE_TECH}/${technicianId}/schedules/generate-month`, {
        centerId: payload.centerId,
        targetMonth: payload.targetMonth,
      });
      return result(true, res.data?.message || "Tạo lịch tháng thành công", res.data, {
        affectedSlots: res.data?.affectedSlots,
        operationId: res.data?.operationId,
      });
    } catch (err) {
      console.error("❌ generateMonthSchedule error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi tạo lịch tháng", null, { error: err });
    }
  },

  /**
   * ☀️ Tạo ca Chủ Nhật
   * POST /api/technicians/{technicianId}/schedules/create-sunday
   */
  async createSundaySchedule(technicianId, payload) {
    if (!technicianId) return result(false, "Thiếu technicianId để tạo ca Chủ Nhật");
    const required = ["centerId", "date"];
    for (const f of required) if (!payload?.[f]) return result(false, `Thiếu trường bắt buộc: ${f}`);

    try {
      const res = await postWithRetry(`${API_BASE_TECH}/${technicianId}/schedules/create-sunday`, {
        centerId: payload.centerId,
        date: payload.date,
      });
      return result(true, res.data?.message || "Tạo ca Chủ Nhật thành công", res.data, {
        affectedSlots: res.data?.affectedSlots,
        operationId: res.data?.operationId,
      });
    } catch (err) {
      console.error("❌ createSundaySchedule error:", err);
      return result(false, err?.response?.data?.message || "Lỗi khi tạo ca Chủ Nhật", null, { error: err });
    }
  },
};

export default scheduleService;
