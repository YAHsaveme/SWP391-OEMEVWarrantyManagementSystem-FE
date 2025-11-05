import axiosInstance from "./axiosInstance";
const BASE = "/shipments";

const staffShipmentService = {
    getAll: async () => (await axiosInstance.get(`${BASE}/get-all`)).data,
    receive: async (id) => (await axiosInstance.post(`${BASE}/${id}/receive`)).data,
    close: async (id) => (await axiosInstance.post(`${BASE}/${id}/close`)).data,
};
export default staffShipmentService;