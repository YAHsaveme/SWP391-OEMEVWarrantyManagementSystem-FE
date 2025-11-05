// Facade cho luồng: kiểm kho (Parts/Lots) + mở ticket bổ sung
import inventoryPartService from "./inventoryPartService";
import inventoryLotService from "./inventoryLotService";
import ticketService from "./ticketService";

const staffInventory = Object.freeze({
    // Parts
    listPartsByCenter: (centerId) => inventoryPartService.listByCenter(centerId),
    listPartsByPart: (partId) => inventoryPartService.listByPart(partId),

    // Lots
    listLotsByCenter: (centerId) => inventoryLotService.listByCenter(centerId),
    listLotsByPart: (partId) => inventoryLotService.listByPart(partId),
    summaryLotsByCenter: (centerId) => inventoryLotService.summaryByCenter(centerId), // ✅ thêm dòng này

    // Ticket
    createReplenishTicket: (centerId, items, reasonNote = "Auto-replenish từ Inventory") =>
        ticketService.create({
            centerId: String(centerId),
            items,
            reasonNote,
        }),
});

export default staffInventory;
