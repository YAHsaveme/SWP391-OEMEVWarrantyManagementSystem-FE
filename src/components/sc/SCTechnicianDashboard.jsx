import { useState } from "react";
import { Menu, Bell, Search, Wrench, Clock, CheckCircle, AlertCircle, LogOut, Home, ClipboardList, Settings, ChevronRight, Package, Calendar, MessageSquare } from "lucide-react";

export default function SCTechnicianDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const navItems = [
    { name: "Dashboard", icon: Home },
    { name: "My Tasks", icon: ClipboardList },
    { name: "Repair Jobs", icon: Wrench },
    { name: "Inventory", icon: Package },
    { name: "Settings", icon: Settings },
  ];

  const stats = [
    {
      title: "Active Jobs",
      value: "8",
      change: "In Progress",
      icon: Wrench,
      color: "emerald",
      subtitle: "2 urgent repairs"
    },
    {
      title: "Pending Tasks",
      value: "12",
      change: "Today",
      icon: Clock,
      color: "amber",
      subtitle: "5 high priority"
    },
    {
      title: "Completed Today",
      value: "15",
      change: "+25%",
      icon: CheckCircle,
      color: "green",
      subtitle: "↑ 3 from yesterday"
    },
    {
      title: "Success Rate",
      value: "96%",
      change: "Excellent",
      icon: AlertCircle,
      color: "blue",
      subtitle: "Above standard"
    }
  ];

  const repairJobs = [
    { id: "RJ-2847", device: "iPhone 14 Pro", issue: "Screen replacement", priority: "urgent", time: "30 min ago", status: "in-progress" },
    { id: "RJ-2846", device: "MacBook Air M2", issue: "Battery service", priority: "high", time: "1 hour ago", status: "pending" },
    { id: "RJ-2845", device: "iPad Pro 11\"", issue: "Charging port repair", priority: "normal", time: "2 hours ago", status: "in-progress" },
    { id: "RJ-2844", device: "Samsung Galaxy S23", issue: "Water damage diagnostic", priority: "urgent", time: "3 hours ago", status: "testing" },
    { id: "RJ-2843", device: "Dell XPS 15", issue: "Keyboard replacement", priority: "normal", time: "4 hours ago", status: "completed" },
  ];

  const getColorClasses = (color) => {
    const colors = {
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
      amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
      green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
      blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
      red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
      purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" }
    };
    return colors[color] || colors.emerald;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      normal: "bg-blue-100 text-blue-700"
    };
    return colors[priority] || colors.normal;
  };

  const getStatusColor = (status) => {
    const colors = {
      "in-progress": "bg-blue-100 text-blue-700",
      "pending": "bg-amber-100 text-amber-700",
      "testing": "bg-purple-100 text-purple-700",
      "completed": "bg-green-100 text-green-700"
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white flex flex-col relative shadow-xl`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center font-bold text-lg shadow-lg border border-white/30">
              SC
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-bold text-base">SC Technician</div>
                <div className="text-xs text-emerald-100">Repair Portal</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(item.name)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all group ${
                activeTab === item.name
                  ? "bg-white/20 backdrop-blur-sm font-medium shadow-lg border border-white/30"
                  : "hover:bg-white/10"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.name}</span>}
              {sidebarOpen && activeTab === item.name && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-emerald-500/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold">
                  MT
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">Mike Torres</div>
                  <div className="text-xs text-emerald-100">Senior Technician</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="p-4">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 transition-all w-full group">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-1.5 shadow-lg transition-all z-10 border-2 border-white"
        >
          <Menu className="w-4 h-4" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Good morning, Mike! You have 8 active jobs today.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repair jobs..."
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64 text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              {/* Notifications */}
              <button className="relative p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              {/* User Profile */}
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                  MT
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-gray-900">Mike Torres</div>
                  <div className="text-xs text-gray-500">Technician #TEC-042</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:-translate-y-0.5 duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${getColorClasses(stat.color).bg}`}>
                    <stat.icon className={`w-6 h-6 ${getColorClasses(stat.color).text}`} />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getColorClasses(stat.color).bg} ${getColorClasses(stat.color).text}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Repair Jobs */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Active Repair Jobs</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Your current workload and assignments</p>
                  </div>
                  <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {repairJobs.map((job, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-11 h-11 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm">{job.id}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                              {job.status.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="font-medium text-gray-700 text-sm">{job.device}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{job.issue}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-xs text-gray-400 block mb-2">{job.time}</span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions & Info */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                    <Wrench className="w-5 h-5" />
                    Start Repair
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5" />
                    My Schedule
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Package className="w-5 h-5" />
                    Check Parts
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Contact Support
                  </button>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Today's Schedule</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>09:00 - Team Meeting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span>10:30 - Training Session</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span>14:00 - Quality Check</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">This Week Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Jobs Completed</span>
                    <span className="font-semibold text-gray-900">47</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Repair Time</span>
                    <span className="font-semibold text-gray-900">45 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Rating</span>
                    <span className="font-semibold text-emerald-600">4.9/5.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">First-time Fix Rate</span>
                    <span className="font-semibold text-emerald-600">94%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}