import axiosInstance from "./axiosInstance";

/**
 * API Endpoints (chuẩn theo Swagger):
 * - GET  /api/auth/staff/technicians                         → Lấy danh sách kỹ thuật viên
 * - GET  /api/technicians/{technicianId}/schedules/get-slots → Lấy slot theo khoảng
 * - POST /api/technicians/{technicianId}/schedules/book       → Đặt lịch
 * - POST /api/technicians/{technicianId}/schedules/cancel     → Hủy lịch
 * - POST /api/technicians/{technicianId}/schedules/restore    → Khôi phục lịch
 * - POST /api/technicians/{technicianId}/schedules/generate-month → Tạo lịch tháng
 * - POST /api/technicians/{technicianId}/schedules/create-sunday → Tạo ca Chủ Nhật
 */

const API_BASE_LIST = "auth/staff/technicians";
const API_BASE_TECH = "technicians";

const technicianService = {
  /**
   * Lấy danh sách kỹ thuật viên (phân trang)
   */
  getAll: async (page = 0, size = 10) => {
    const res = await axiosInstance.get(API_BASE_LIST, { params: { page, size } });
    return res.data.content || [];
  },

  /**
   * Lấy lịch làm việc (slot) của kỹ thuật viên theo khoảng ngày
   * GET /api/technicians/{technicianId}/schedules/get-slots?from=yyyy-MM-dd&to=yyyy-MM-dd
   */
  getTechnicianSlots: async (technicianId, from, to) => {
    if (!technicianId || !from || !to) {
      throw new Error("Thiếu technicianId hoặc khoảng thời gian (from, to)");
    }

    try {
      const res = await axiosInstance.get(
        `${API_BASE_TECH}/${technicianId}/schedules/get-slots`,
        { params: { from, to } }
      );

      // ✅ Backend trả về { days: [ { workDate, slots: [ ... ] } ] }
      const data = res.data;
      if (Array.isArray(data.days)) {
        return data.days.flatMap((d) =>
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

      return [];
    } catch (err) {
      console.error("❌ getTechnicianSlots failed:", err);
      throw err;
    }
  },

  /**
   * Đặt lịch làm việc
   */
  bookSchedule: async (technicianId, payload) => {
    if (!technicianId) throw new Error("Thiếu technicianId để đặt lịch");
    const required = ["centerId", "workDate", "startTime"];
    for (const field of required) {
      if (!payload?.[field]) throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }

    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/book`,
      {
        centerId: payload.centerId,
        workDate: payload.workDate,
        startTime: payload.startTime,
        note: payload.note || "",
      }
    );
    return res.data;
  },

  /**
   * Hủy lịch
   */
  cancelSchedule: async (technicianId, payload) => {
    if (!technicianId) throw new Error("Thiếu technicianId để hủy lịch");
    const required = ["dateFrom", "dateTo", "slotTimes"];
    for (const field of required) {
      if (!payload?.[field]) throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }

    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/cancel`,
      {
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        slotTimes: payload.slotTimes,
        note: payload.note || "",
      }
    );
    return res.data;
  },

  /**
   * Khôi phục lịch
   */
  restoreSchedule: async (technicianId, payload) => {
    if (!technicianId) throw new Error("Thiếu technicianId để khôi phục lịch");
    const required = ["dateFrom", "dateTo", "slotTimes"];
    for (const field of required) {
      if (!payload?.[field]) throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }

    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/restore`,
      {
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        slotTimes: payload.slotTimes,
      }
    );
    return res.data;
  },

  /**
   * Tạo lịch tháng
   */
  generateMonthSchedule: async (technicianId, payload) => {
    if (!technicianId) throw new Error("Thiếu technicianId để tạo lịch tháng");
    const required = ["centerId", "targetMonth"];
    for (const field of required) {
      if (!payload?.[field]) throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }

    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/generate-month`,
      {
        centerId: payload.centerId,
        targetMonth: payload.targetMonth,
      }
    );
    return res.data;
  },

  /**
   * Tạo ca Chủ Nhật
   */
  createSundaySchedule: async (technicianId, payload) => {
    if (!technicianId) throw new Error("Thiếu technicianId để tạo ca Chủ Nhật");
    const required = ["centerId", "date"];
    for (const field of required) {
      if (!payload?.[field]) throw new Error(`Thiếu trường bắt buộc: ${field}`);
    }

    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/create-sunday`,
      {
        centerId: payload.centerId,
        date: payload.date,
      }
    );
    return res.data;
  },
};

export default technicianService;
