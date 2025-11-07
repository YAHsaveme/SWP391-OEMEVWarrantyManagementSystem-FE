import axiosInstance from "./axiosInstance";

const BASE_URL = "/dashboard";

const dashboardService = {
    /**
     * GET /api/dashboard/performance
     * Lấy dữ liệu performance dashboard
     */
    getPerformance: async () => {
        try {
            const response = await axiosInstance.get(`${BASE_URL}/performance`);
            return response.data;
        } catch (error) {
            console.error("Error fetching dashboard performance:", error);
            throw error;
        }
    },

    /**
     * GET /api/dashboard/summary
     * Lấy dữ liệu summary dashboard
     */
    getSummary: async () => {
        try {
            const response = await axiosInstance.get(`${BASE_URL}/summary`);
            return response.data;
        } catch (error) {
            console.error("Error fetching dashboard summary:", error);
            throw error;
        }
    },
};

export default dashboardService;

