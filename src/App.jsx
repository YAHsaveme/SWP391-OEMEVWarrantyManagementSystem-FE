import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/home/HomePage";
import Dashboard from "./components/admin/DashBoard";
import Login from "./components/login/Login";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}


