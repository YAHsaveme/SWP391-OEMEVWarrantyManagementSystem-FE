import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/home/HomePage";
import Dashboard from "./components/admin/DashBoard";
import Login from "./components/login/Login";
import Overview from "./components/evm/Overview";
import SCStaffDashboard from "./components/sc/SCStaffDashboard";
import SCTechnicianDashboard from "./components/sc/SCTechnicianDashboard";
import PrivateRoute from "./routes/PrivateRoute"; 
import useAutoLogout from "./hooks/useAutoLogout";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

function AutoLogoutWrapper() {
  useAutoLogout();
  return null;
}

export default function App() {
  return (
    <Router>
      <AutoLogoutWrapper />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Private routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/overview"
          element={
            <PrivateRoute roles={["EVM_STAFF"]}>
              <Overview />
            </PrivateRoute>
          }
        />

        <Route
          path="/scstaff"
          element={
            <PrivateRoute roles={["SC_STAFF"]}>
              <SCStaffDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/sctech"
          element={
            <PrivateRoute roles={["SC_TECHNICIAN"]}>
              <SCTechnicianDashboard />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
