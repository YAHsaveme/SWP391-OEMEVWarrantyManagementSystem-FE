import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Public (tùy bạn giữ/đổi)
import HomePage from "./components/home/HomePage.jsx";
import Dashboard from "./components/admin/DashBoard.jsx";
import Login from "./components/login/Login.jsx";
import Overview from "./components/evm/Overview.jsx";

// Staff
import StaffLayout from "./components/staff/StaffLayout.jsx";
import StaffOverview from "./components/staff/StaffOverview.jsx";
import CampaignsPage from "./components/staff/CampaignsPage.jsx";
import VehiclesPage from "./components/staff/VehiclesPage.jsx";
import VehicleDetailPage from "./components/staff/VehicleDetailPage.jsx";
import WarrantyClaimsPage from "./components/staff/WarrantyClaim.jsx"; // <-- file của bạn tên WarrantyClaim.jsx
import TechniciansPage from "./components/staff/TechniciansPage.jsx";
import EvModelsPage from "./components/staff/EvModelsPage.jsx";
import ServiceCentersPage from "./components/staff/ServiceCentersPage.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/evm" element={<Overview />} />
        <Route path="/admin" element={<Dashboard />} />

        {/* Staff (nested) */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<StaffOverview />} />                     {/* /staff */}
          <Route path="campaigns" element={<CampaignsPage />} />           {/* /staff/campaigns */}
          <Route path="vehicles" element={<VehiclesPage />} />            {/* /staff/vehicles */}
          <Route path="vehicles/:vin" element={<VehicleDetailPage />} />  {/* /staff/vehicles/1HGB... */}
          <Route path="claims" element={<WarrantyClaimsPage />} />        {/* /staff/claims */}
          <Route path="technicians" element={<TechniciansPage />} />      {/* /staff/technicians */}
          <Route path="ev-models" element={<EvModelsPage />} />           {/* /staff/ev-models */}
          <Route path="centers" element={<ServiceCentersPage />} />       {/* /staff/centers */}
        </Route>

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 24 }}>404 - Not Found</div>} />
      </Routes>
    </Router>
  );
}
