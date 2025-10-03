import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/home/HomePage";
import Dashboard from "./components/admin/DashBoard";
import Login from "./components/login/Login";
import Overview from "./components/evm/Overview";
import SCStaffDashboard from "./components/sc/SCStaffDashboard";
import SCTechnicianDashboard from "./components/sc/SCTechnicianDashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scstaff" element={<SCStaffDashboard />} />
        <Route path="/sctech" element={<SCTechnicianDashboard />} />
      </Routes>
    </Router>
  );
}


