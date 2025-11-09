import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Hooks
import useAutoLogout from "./hooks/useAutoLogout";

// Routes protection
import PrivateRoute from "./routes/PrivateRoute";

// Public pages
import HomePage from "./components/home/HomePage";
import Login from "./components/login/Login";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Admin & EVM
import Dashboard from "./components/admin/DashBoard";
import Overview from "./components/evm/Overview";
import ShipmentDetailPage from "./components/evm/ShipmentDetailPage";

// Technician
import SCTechnicianDashboard from "./components/tech/SCTechnicianDashboard";

// SC_Staff
import StaffLayout from "./components/staff/StaffLayout";
import Inventory from "./components/staff/Inventory";
import VehiclesPage from "./components/staff/VehiclesPage";
import VehicleDetailPage from "./components/staff/VehicleDetailPage";
import WarrantyClaimsPage from "./components/staff/WarrantyClaim";
import ClaimReport from "./components/staff/ClaimReport";
import TechniciansPage from "./components/staff/TechniciansPage";
import EvModelsPage from "./components/staff/EvModelsPage";
import ServiceCentersPage from "./components/staff/ServiceCentersPage";
import Appointment from "./components/staff/Appointment";

function AutoLogoutWrapper() {
  useAutoLogout();
  return null;
}

export default function App() {
  return (
    <Router>
      <AutoLogoutWrapper />

      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ===== ADMIN ===== */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ===== EVM STAFF ===== */}
        <Route
          path="/overview"
          element={
            <PrivateRoute roles={["EVM_STAFF"]}>
              <Overview />
            </PrivateRoute>
          }
        />
        <Route
          path="/shipments/:id"
          element={
            <PrivateRoute roles={["EVM_STAFF", "SC_STAFF"]}>
              <ShipmentDetailPage />
            </PrivateRoute>
          }
        />

        {/* ===== SC TECHNICIAN ===== */}
        <Route
          path="/tech/*"
          element={
            <PrivateRoute roles={["SC_TECHNICIAN"]}>
              <SCTechnicianDashboard />
            </PrivateRoute>
          }
        />

        {/* ===== SC STAFF ===== */}
        <Route
          path="/staff"
          element={
            <PrivateRoute roles={["SC_STAFF"]}>
              <StaffLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/staff/vehicles" replace />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:vin" element={<VehicleDetailPage />} />
          <Route path="claims" element={<WarrantyClaimsPage />} />
          <Route path="claim-report" element={<ClaimReport />} />
          <Route path="technicians" element={<TechniciansPage />} />
          <Route path="ev-models" element={<EvModelsPage />} />
          <Route path="centers" element={<ServiceCentersPage />} />
          <Route path="appointments" element={<Appointment />} />
        </Route>

        {/* ===== 404 ===== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
