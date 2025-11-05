// src/services/ticketService.js
import axiosInstance from "./axiosInstance";

const API_BASE = "/tickets";

const unwrap = (p) =>
    p.then((r) => r.data).catch((e) => {
        console.error("❌ Ticket API Error:", e.response?.data || e.message);
        throw e;
    });

const ticketService = {
    /** POST /api/tickets/create
     * body: { centerId, items:[{partId, quantity}], reasonNote? }
     */
    create: (body = {}) =>
        unwrap(axiosInstance.post(`${API_BASE}/create`, body)),

    /** GET /api/tickets/get-all
     * params?: { page?, size?, status?, centerId?... }
     */
    getAll: (params = {}) =>
        unwrap(axiosInstance.get(`${API_BASE}/get-all`, { params })),

    /** GET /api/tickets/{ticketId}/get */
    get: (ticketId) =>
        unwrap(axiosInstance.get(`${API_BASE}/${encodeURIComponent(ticketId)}/get`)),

    /** PUT /api/tickets/{ticketId}/update
     * body: { reasonNote?, items?: [{partId, quantity}], ... }
     */
    update: (ticketId, body = {}) =>
        unwrap(axiosInstance.put(
            `${API_BASE}/${encodeURIComponent(ticketId)}/update`,
            body
        )),

    /** PUT /api/tickets/{ticketId}/update-status
     * body: { status, reasonNote }
     */
    updateStatus: (ticketId, status, reasonNote = "") =>
        unwrap(axiosInstance.put(
            `${API_BASE}/${encodeURIComponent(ticketId)}/update-status`,
            { status, reasonNote }
        )),

    /** GET /api/tickets/summary
     * params?: { from?, to?, centerId?, status?... }
     */
    summary: (params = {}) =>
        unwrap(axiosInstance.get(`${API_BASE}/summary`, { params })),
};

export default ticketService;
