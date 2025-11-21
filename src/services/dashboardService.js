import axiosInstance from "./axiosInstance";

const BASE_URL = "/dashboard";

/**
* Dashboard Service - Full API Support
*/
const dashboardService = {
    /**
    * GET /api/dashboard/performance
    * @param {string} startDate - ISO date string
    * @param {string} endDate - ISO date string
    */
    getPerformance: async (startDate, endDate) => {
        try {
            const response = await axiosInstance.get(`${BASE_URL}/performance`, {
                params: { startDate, endDate },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching dashboard performance:", error);
            throw error;
        }
    },


    /**
    * GET /api/dashboard/performance/center/{centerId}
    * @param {string} centerId - UUID string
    * @param {string} startDate - ISO date string
    * @param {string} endDate - ISO date string
    */
    getPerformanceByCenter: async (centerId, startDate, endDate) => {
        try {
            const response = await axiosInstance.get(
                `${BASE_URL}/performance/center/${centerId}`,
                {
                    params: { startDate, endDate },
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching performance by center:", error);
            throw error;
        }
    },


    /**
    * GET /api/dashboard/summary
    * @param {string} startDate - ISO date string
    * @param {string} endDate - ISO date string
    */
    getSummary: async (startDate, endDate) => {
        try {
            const response = await axiosInstance.get(`${BASE_URL}/summary`, {
                params: { startDate, endDate },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching dashboard summary:", error);
            throw error;
        }
    },


    /**
    * GET /api/dashboard/summary/center/{centerId}
    * @param {string} centerId - UUID string
    * @param {string} startDate - ISO date string
    * @param {string} endDate - ISO date string
    */
    getSummaryByCenter: async (centerId, startDate, endDate) => {
        try {
            const response = await axiosInstance.get(
                `${BASE_URL}/summary/center/${centerId}`,
                {
                    params: { startDate, endDate },
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching summary by center:", error);
            throw error;
        }
    },
};

export default dashboardService;

