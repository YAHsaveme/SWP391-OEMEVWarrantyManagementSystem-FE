// src/services/vehicleWarrantyService.js
import api from "./axiosInstance";

const BASE_URL = "/vehicle-warranties"; // axiosInstance đã có baseURL = "/api", nên không cần /api nữa

const vehicleWarrantyService = {
  // Lấy thông tin warranty của một vehicle theo VIN
  getByVin: async (vin) => {
    const response = await api.get(`${BASE_URL}/${encodeURIComponent(vin)}/get`);
    return response.data;
  },

  // Kích hoạt warranty cho một vehicle
  activate: async (vin) => {
    const response = await api.post(`${BASE_URL}/${encodeURIComponent(vin)}/activate`);
    return response.data;
  },

  // Kiểm tra xem vehicle có warranty đã kích hoạt không (startDate != null)
  checkActivated: async (vin) => {
    try {
      const raw = await vehicleWarrantyService.getByVin(vin);
      console.log(`[WarrantyCheck] VIN ${vin} - Raw Response:`, raw);
      
      // Unwrap response: backend có thể trả về {warranty: {...}} hoặc {data: {...}} hoặc object trực tiếp
      let warranty = raw?.warranty ?? raw?.data ?? raw;
      
      // Nếu backend trả về array (nhiều warranty versions), chọn bản mới nhất
      if (Array.isArray(warranty)) {
        // Sort theo startDate DESC và lấy phần tử đầu tiên
        warranty = warranty
          .filter(w => w && (w.startDate || w.start_date))
          .sort((a, b) => {
            const dateA = new Date(a.startDate || a.start_date || 0);
            const dateB = new Date(b.startDate || b.start_date || 0);
            return dateB - dateA; // DESC
          })[0];
        console.log(`[WarrantyCheck] VIN ${vin} - Selected newest from array:`, warranty);
      }
      
      if (!warranty || typeof warranty !== "object") {
        console.log(`[WarrantyCheck] VIN ${vin} - Invalid warranty object:`, warranty);
        return false;
      }
      
      // Kiểm tra startDate (hỗ trợ cả camelCase và snake_case)
      // Có thể startDate nằm trong nested object hoặc trong policy object
      const startDate = warranty.startDate || 
                       warranty.start_date || 
                       warranty.warranty?.startDate ||
                       warranty.warranty?.start_date ||
                       warranty.policy?.startDate ||
                       warranty.policy?.start_date;
      
      console.log(`[WarrantyCheck] VIN ${vin} - Full warranty object:`, JSON.stringify(warranty, null, 2));
      console.log(`[WarrantyCheck] VIN ${vin} - startDate found:`, startDate);
      console.log(`[WarrantyCheck] VIN ${vin} - policyId:`, warranty.policyId || warranty.policy_id || warranty.policy?.id);
      
      // startDate phải tồn tại và không phải empty string
      // Hoặc có thể kiểm tra status nếu backend dùng status thay vì startDate
      const hasStartDate = startDate != null && 
                          startDate !== undefined && 
                          startDate !== "" && 
                          String(startDate).trim() !== "";
      
      // Nếu không có startDate, kiểm tra status hoặc các field khác
      let isActivated = hasStartDate;
      
      // Nếu không có startDate nhưng có policyId và status = ACTIVE hoặc ACTIVE
      if (!hasStartDate && warranty.policyId) {
        const status = warranty.status || warranty.warranty?.status || warranty.policy?.status;
        console.log(`[WarrantyCheck] VIN ${vin} - No startDate, checking status:`, status);
        // Nếu có status ACTIVE, có thể đã kích hoạt
        isActivated = status === "ACTIVE" || status === "active" || status === "ACTIVATED" || status === "activated";
      }
      
      console.log(`[WarrantyCheck] VIN ${vin} - Final isActivated:`, isActivated, `(startDate: ${startDate})`);
      
      return isActivated;
    } catch (err) {
      console.warn(`[WarrantyCheck] VIN ${vin} - Error:`, err);
      console.warn(`[WarrantyCheck] VIN ${vin} - Error response:`, err.response?.data);
      
      // Nếu là 404 (không tìm thấy warranty), trả về false
      if (err.response?.status === 404) {
        console.log(`[WarrantyCheck] VIN ${vin} - Warranty not found (404)`);
        return false;
      }
      
      // Nếu là lỗi khác, log và trả về false
      return false;
    }
  },
};

export default vehicleWarrantyService;

