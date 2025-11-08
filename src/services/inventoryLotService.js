import axiosInstance from "./axiosInstance";

const API = "inventory-lots";

const authHeader = () => {
    const raw =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("access_token") ||
        "";
    return raw ? { Authorization: raw.startsWith("Bearer ") ? raw : `Bearer ${raw}` } : {};
};

// 🔧 Chuẩn hoá mọi kiểu response về { inventoryLots: [...] }
const normalizeLots = (data) => {
    if (Array.isArray(data?.inventoryLots)) return { inventoryLots: data.inventoryLots };
    if (Array.isArray(data)) return { inventoryLots: data };
    if (Array.isArray(data?.data)) return { inventoryLots: data.data };
    return { inventoryLots: [] };
};

/**
 * Service đầy đủ cho quản lý tồn kho Lot.
 * - ⚙️ EVM_STAFF: dùng tất cả CRUD.
 * - 🧰 SC_STAFF: chỉ dùng listByCenter, listByPart (backend tự lấy centerId từ token).
 */
const inventoryLotService = {
    /** ⚙️ EVM_STAFF: GET /api/inventory-lots/{inventoryLotId}/get */
    get: async (lotId) => {
        const { data } = await axiosInstance.get(`${API}/${encodeURIComponent(lotId)}/get`, {
            headers: authHeader(),
        });
        return data;
    },

    /** ⚙️ EVM_STAFF: PUT /api/inventory-lots/{inventoryLotId}/update */
    update: async (lotId, body) => {
        const { data } = await axiosInstance.put(
            `${API}/${encodeURIComponent(lotId)}/update`,
            body,
            { headers: authHeader() }
        );
        return data;
    },

    /** ✅ SC_STAFF: BE tự xác định centerId từ token
     * GET /api/inventory-lots/by-center/get
     */
    listByCenter: async () => {
        const { data } = await axiosInstance.get(`${API}/by-center/get`, {
            headers: authHeader(),
        });
        return data;
    },

    /** 🆕 ✅ EVM_STAFF: chỉ định centerId rõ ràng
     * GET /api/inventory-lots/by-center/{centerId}/get
     */
    listByCenterWithId: async (centerId) => {
        if (!centerId) throw new Error("listByCenterWithId: missing centerId");
        const { data } = await axiosInstance.get(
            `${API}/by-center/${encodeURIComponent(centerId)}/get`,
            { headers: authHeader() }
        );
        return data;
    },

    /** ✅ Dùng cho cả SC_STAFF & EVM
     * GET /api/inventory-lots/by-part/{partId}/get
     */
    listByPart: async (partId) => {
        const { data } = await axiosInstance.get(
            `${API}/by-part/${encodeURIComponent(partId)}/get`,
            { headers: authHeader() }
        );
        return data;
    },

    /** 🆕 ✅ Dùng cho case chọn serial theo kho NGUỒN cụ thể (CENTER → CENTER)
     * Ưu tiên path:  GET /api/inventory-lots/by-part/{partId}/by-center/{centerId}/get
     * Fallback path: GET /api/inventory-lots/by-center/{centerId}/by-part/{partId}/get
     * Trả về luôn dạng chuẩn hoá { inventoryLots: [...] }
     */
    getLotsByPartByCenter: async (partId, centerId) => {
        if (!partId || !centerId) {
            throw new Error("getLotsByPartByCenter: thiếu partId/centerId");
        }

        const primaryUrl = `${API}/by-part/${encodeURIComponent(partId)}/by-center/${encodeURIComponent(centerId)}/get`;
        const fallbackUrl = `${API}/by-center/${encodeURIComponent(centerId)}/by-part/${encodeURIComponent(partId)}/get`;

        try {
            const { data } = await axiosInstance.get(primaryUrl, { headers: authHeader() });
            return normalizeLots(data);
        } catch (e) {
            const status = e?.response?.status;
            if (status === 404 || status === 405) {
                // thử path đảo ngược nếu BE dùng convention khác
                const { data } = await axiosInstance.get(fallbackUrl, { headers: authHeader() });
                return normalizeLots(data);
            }
            throw e;
        }
    },

    /** ⚙️ EVM_STAFF: POST /api/inventory-lots/create */
    create: async (body) => {
        // Kiểm tra serialized không được trùng ở 2 center - SerialNo phải unique toàn hệ thống
        const { partLotId, centerId } = body;
        if (partLotId) {
            let partLot = null;
            let serialNo = null;
            
            try {
                // Load thông tin Part Lot để kiểm tra có serialized không
                const partLotRes = await axiosInstance.get(`/part-lots/${encodeURIComponent(partLotId)}/get`, {
                    headers: authHeader(),
                });
                partLot = partLotRes?.data;
                serialNo = partLot?.serialNo;
                const isSerialized = !!serialNo;
                
                if (isSerialized && serialNo) {
                    console.log(`[InventoryLot.create] Checking serialized unique for SerialNo: ${serialNo}, PartLotId: ${partLotId}`);
                    
                    // Nếu là serialized, kiểm tra SerialNo đã tồn tại trong toàn hệ thống chưa
                    const allInventoryLots = await inventoryLotService.getAll();
                    const inventoryLotsArray = Array.isArray(allInventoryLots) 
                        ? allInventoryLots 
                        : (Array.isArray(allInventoryLots?.inventoryLots) ? allInventoryLots.inventoryLots : []);
                    
                    console.log(`[InventoryLot.create] Found ${inventoryLotsArray.length} inventory lots in system`);
                    
                    // Tìm Inventory Lot có cùng SerialNo (không phân biệt partLotId, kiểm tra toàn hệ thống)
                    const existingInventoryLot = inventoryLotsArray.find(invLot => {
                        const invSerialNo = invLot.serialNo || invLot.partLotSerialNo || invLot.partLot?.serialNo;
                        if (!invSerialNo) return false;
                        const serialNoMatch = String(invSerialNo).trim().toLowerCase() === String(serialNo).trim().toLowerCase();
                        if (serialNoMatch) {
                            console.log(`[InventoryLot.create] Found duplicate SerialNo: ${serialNo} in InventoryLot ID: ${invLot.id}, Center: ${invLot.centerId || invLot.center?.id}`);
                        }
                        return serialNoMatch;
                    });
                    
                    if (existingInventoryLot) {
                        const existingCenterName = existingInventoryLot.centerName || existingInventoryLot.center?.name || "center khác";
                        const errorMsg = `Serial No "${serialNo}" đã tồn tại ở "${existingCenterName}". Serial number phải unique toàn hệ thống.`;
                        console.error(`[InventoryLot.create] ${errorMsg}`);
                        throw new Error(errorMsg);
                    }
                    
                    console.log(`[InventoryLot.create] SerialNo ${serialNo} is unique, proceeding with create`);
                }
            } catch (e) {
                // Nếu là error từ validation trên, throw lại
                if (e?.message && (e.message.includes("Serial No") || e.message.includes("Serial number"))) {
                    throw e;
                }
                // Nếu không load được Part Lot, vẫn tiếp tục và để backend validate
                // Nhưng log warning để debug
                console.warn(`[InventoryLot.create] Không thể kiểm tra serialized unique. PartLotId: ${partLotId}, Error:`, e);
                // Nếu là lỗi 404 (không tìm thấy Part Lot), có thể Part Lot không tồn tại
                if (e?.response?.status === 404) {
                    console.warn(`[InventoryLot.create] Part Lot ${partLotId} not found, backend will validate`);
                }
            }
        }
        
        const { data } = await axiosInstance.post(`${API}/create`, body, { headers: authHeader() });
        return data;
    },

    /** ⚙️ EVM_STAFF: GET /api/inventory-lots/get-all */
    getAll: async () => {
        const { data } = await axiosInstance.get(`${API}/get-all`, { headers: authHeader() });
        return data;
    },

    /** ⚙️ EVM_STAFF: GET /api/inventory-lots/summary/{centerId}/get */
    summaryByCenter: async (centerId) => {
        const { data } = await axiosInstance.get(
            `${API}/summary/${encodeURIComponent(centerId)}/get`,
            { headers: authHeader() }
        );
        return data;
    },
    adjustQuantity: async ({ inventoryLotId, delta, reason }) => {
        if (!inventoryLotId || delta === undefined) {
            throw new Error("Missing required fields");
        }
        const { data } = await axiosInstance.post(
            `${API}/${encodeURIComponent(inventoryLotId)}/adjust`,
            { delta: Number(delta), reason },
            { headers: authHeader() }
        );
        return data;
    },

};

export default inventoryLotService;
