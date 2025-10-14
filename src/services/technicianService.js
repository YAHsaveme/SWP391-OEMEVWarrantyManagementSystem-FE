import axiosInstance from "./axiosInstance";

/**
 * API Endpoints:
 * - GET  /api/auth/staff/technicians           → Lấy danh sách kỹ thuật viên (có phân trang)
 * - GET  /api/technicians/{id}/schedules/get-slots → Lấy slot theo khoảng
 * - POST /api/technicians/{id}/schedules/book      → Đặt lịch
 * - POST /api/technicians/{id}/schedules/cancel    → Hủy lịch
 * - POST /api/technicians/{id}/schedules/restore   → Khôi phục lịch mặc định
 * - POST /api/technicians/{id}/schedules/generate-month → Tạo lịch tháng
 * - POST /api/technicians/{id}/schedules/create-sunday → Tạo ca Chủ Nhật
 */

const API_BASE_LIST = "/auth/staff/technicians"; // chỉ dùng cho getAll
const API_BASE_TECH = "/technicians"; // dùng cho tất cả API liên quan technicianId

const technicianService = {
  /**
   * 🧑‍🔧 Lấy toàn bộ kỹ thuật viên
   * Quyền: SC_STAFF
   */
  getAll: async (page = 0, size = 10) => {
    const res = await axiosInstance.get(API_BASE_LIST, { params: { page, size } });
    // res.data.content là mảng kỹ thuật viên
    return res.data.content || [];
  },

  /**
   * 📅 Lấy toàn bộ lịch làm việc (slots) của 1 kỹ thuật viên theo khoảng ngày
   * GET /api/technicians/{technicianId}/schedules/get-slots?from=yyyy-mm-dd&to=yyyy-mm-dd
   * Quyền: SC_STAFF
   */
  getTechnicianSlots: async (technicianId, from, to) => {
    if (!technicianId || !from || !to) {
      throw new Error("Thiếu technicianId hoặc khoảng thời gian (from, to)");
    }
    const res = await axiosInstance.get(
      `${API_BASE_TECH}/${technicianId}/schedules/get-slots`,
      { params: { from, to } }
    );
    return res.data;
  },

  /**
   * 📆 Đặt lịch làm việc cho kỹ thuật viên
   * POST /api/technicians/{technicianId}/schedules/book
   */
  bookSchedule: async (technicianId, payload) => {
    if (!technicianId || !payload.workDate || !payload.startTime || !payload.centerId) {
      throw new Error(
        "Thiếu dữ liệu bắt buộc để đặt lịch (technicianId, centerId, workDate, startTime)"
      );
    }
    try {
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
    } catch (error) {
      console.error("❌ Error booking schedule:", error);
      throw error;
    }
  },

  /**
   * ❌ Hủy lịch làm việc
   * POST /api/technicians/{technicianId}/schedules/cancel
   */
  cancelSchedule: async (technicianId, payload) => {
    if (!technicianId || !payload) {
      throw new Error("Thiếu technicianId hoặc payload để hủy lịch");
    }
    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/cancel`,
      payload
    );
    return res.data;
  },

  /**
   * 🔁 Khôi phục toàn bộ lịch làm việc mặc định của kỹ thuật viên
   * POST /api/technicians/{technicianId}/schedules/restore
   */
  restoreSchedule: async (technicianId) => {
    if (!technicianId) throw new Error("Thiếu technicianId để restore lịch");
    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/restore`
    );
    return res.data;
  },

  /**
   * 🗓️ Tạo lịch làm việc cho tháng mới
   * POST /api/technicians/{technicianId}/schedules/generate-month
   */
  generateMonthSchedule: async (technicianId) => {
    if (!technicianId) throw new Error("Thiếu technicianId để tạo lịch tháng mới");
    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/generate-month`
    );
    return res.data;
  },

  /**
   * ☀️ Tạo lịch riêng cho Chủ Nhật
   * POST /api/technicians/{technicianId}/schedules/create-sunday
   */
  createSundaySchedule: async (technicianId) => {
    if (!technicianId) throw new Error("Thiếu technicianId để tạo lịch Chủ Nhật");
    const res = await axiosInstance.post(
      `${API_BASE_TECH}/${technicianId}/schedules/create-sunday`
    );
    return res.data;
  },
};

export default technicianService;
