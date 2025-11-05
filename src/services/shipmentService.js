// src/services/shipmentService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "shipments"; // giữ nguyên, vì axiosInstance đã có baseURL=/api/

const shipmentService = {
  /** 🟢 Manufacturer -> Center */
  createFromManufacturer: async (body) => {
    const { data } = await axiosInstance.post(
      `${API_BASE}/create-from-manufacturer`,
      body
    );
    return data;
  },

  /** 🟢 Center -> Center */
  createBetweenCenters: async (body) => {
    const { data } = await axiosInstance.post(
      `${API_BASE}/create-between-centers`,
      body
    );
    return data;
  },

  /** 🚚 Dispatch (IN_TRANSIT + post tồn kho OUT nếu center->center) */
  dispatch: async (shipmentId, trackingNo) => {
    const { data } = await axiosInstance.post(
      `${API_BASE}/${shipmentId}/${encodeURIComponent(trackingNo)}/dispatch`
    );
    return data;
  },

  /** 📦 Receive (post tồn kho IN; create/find PartLot nếu manufacturer->center) */
  receive: async (shipmentId) => {
    const { data } = await axiosInstance.post(
      `${API_BASE}/${shipmentId}/receive`
    );
    return data;
  },

  /** ✅ Close (sau khi DELIVERED / DELIVERED_WITH_ISSUE) */
  close: async (shipmentId) => {
    const { data } = await axiosInstance.post(
      `${API_BASE}/${shipmentId}/close`
    );
    return data;
  },

  /** 🔍 Get 1 shipment */
  get: async (shipmentId) => {
    const { data } = await axiosInstance.get(`${API_BASE}/${shipmentId}/get`);
    return data;
  },

  /** 🔍 Get theo ticket */
  getByTicketId: async (ticketId) => {
    const { data } = await axiosInstance.get(
      `${API_BASE}/${ticketId}/get-by-ticket-id`
    );
    return data;
  },

  /** ✅ Simple existence check for a ticket's shipment (used in list UI) */
  existsForTicket: async (ticketId) => {
    try {
      const data = await shipmentService.getByTicketId(ticketId);
      if (!data) return false;
      // BE may return a single shipment object or array; treat both
      if (Array.isArray(data)) return data.length > 0;
      return !!data.id;
    } catch (_) {
      return false;
    }
  },

  /** 📋 Get all */
  getAll: async () => {
    const { data } = await axiosInstance.get(`${API_BASE}/get-all`);
    return data;
  },

  /** ✏️ Update plan cho manufacturer -> center (khi status=REQUESTED) */
  updateFromManufacturer: async (shipmentId, body) => {
    const { data } = await axiosInstance.put(
      `${API_BASE}/${shipmentId}/update-from-manufacturer`,
      body
    );
    return data;
  },

  /** ✏️ Update plan cho center -> center (khi status=REQUESTED) */
  updateBetweenCenters: async (shipmentId, body) => {
    const { data } = await axiosInstance.put(
      `${API_BASE}/${shipmentId}/update-between-centers`,
      body
    );
    return data;
  },

  /**
   * 🧠 Suggest Part Lots (dùng cho luồng Center -> Center)
   * BE yêu cầu body:
   * { centerId, partQuantities: [{ partId, quantity }] }
   * LƯU Ý: Response KHÔNG có field `part` → chỉ dùng để gợi ý lot/availableQty.
   */
  suggestPartLots: async ({ centerId, partQuantities, parts }) => {
    if (!centerId) throw new Error("centerId is required for suggestPartLots");

    // Ưu tiên partQuantities nếu có, nếu không thì convert từ parts
    let finalPartQuantities;
    if (partQuantities && Array.isArray(partQuantities)) {
      finalPartQuantities = partQuantities;
    } else if (parts && Array.isArray(parts)) {
      // Cho phép truyền: parts = ["id1","id2"] hoặc [{partId:"id", quantity:2}]
      finalPartQuantities = parts.map((p) =>
        typeof p === "string"
          ? { partId: p, quantity: 1 }
          : { partId: p.partId, quantity: Number(p.quantity) || 1 }
      );
    } else {
      finalPartQuantities = [];
    }

    const payload = { centerId, partQuantities: finalPartQuantities };
    const { data } = await axiosInstance.post(
      `${API_BASE}/suggest-part-lots`,
      payload
    );
    return data;
  },

  /**
   * 🏢 Suggest Centers (dùng cho luồng Center -> Center)
   * POST /api/shipments/suggest-center
   * Body: { partIds: [...] } hoặc { partQuantities: [{ partId, quantity }] }
   * Trả về danh sách centers có các parts đó để gửi hàng
   */
  suggestCenter: async ({ partIds, partQuantities }) => {
    let payload = {};
    if (partQuantities && Array.isArray(partQuantities)) {
      payload = { partQuantities };
    } else if (partIds && Array.isArray(partIds)) {
      // Convert partIds to partQuantities with quantity=1
      payload = { 
        partQuantities: partIds.map(partId => ({ partId, quantity: 1 }))
      };
    }
    const { data } = await axiosInstance.post(`${API_BASE}/suggest-center`, payload);
    return data;
  },
};

export default shipmentService;
