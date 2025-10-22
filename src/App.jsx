import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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

// Technician
import SCTechnicianDashboard from "./components/tech/SCTechnicianDashboard";

// SC_Staff
import StaffLayout from "./components/staff/StaffLayout";
import StaffOverview from "./components/staff/StaffOverview";
import CampaignsPage from "./components/staff/CampaignsPage";
import VehiclesPage from "./components/staff/VehiclesPage";
import VehicleDetailPage from "./components/staff/VehicleDetailPage";
import WarrantyClaimsPage from "./components/staff/WarrantyClaim";
import TechniciansPage from "./components/staff/TechniciansPage";
import EvModelsPage from "./components/staff/EvModelsPage";
import ServiceCentersPage from "./components/staff/ServiceCentersPage";

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
          <Route index element={<StaffOverview />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:vin" element={<VehicleDetailPage />} />
          <Route path="claims" element={<WarrantyClaimsPage />} />
          <Route path="technicians" element={<TechniciansPage />} />
          <Route path="ev-models" element={<EvModelsPage />} />
          <Route path="centers" element={<ServiceCentersPage />} />
        </Route>

        {/* ===== 404 ===== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
