import { useState } from "react";
import { Menu, Bell, Search, TrendingUp, Clock, CheckCircle, AlertCircle, LogOut, BarChart2, ClipboardList, Settings, ChevronRight, Download, Plus, Filter } from "lucide-react";

export default function SCStaffDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");

  const navItems = [
    { name: "Dashboard", icon: BarChart2 },
    { name: "Warranty Claims", icon: ClipboardList },
    { name: "Reports", icon: BarChart2 },
    { name: "Settings", icon: Settings },
  ];

  const stats = [
    {
      title: "Total Claims",
      value: "125",
      change: "+12.5%",
      trend: "up",
      icon: ClipboardList,
      color: "blue",
      subtitle: "↑ 14 from last month"
    },
    {
      title: "Pending Approvals",
      value: "18",
      change: "Pending",
      trend: "neutral",
      icon: Clock,
      color: "amber",
      subtitle: "Requires attention"
    },
    {
      title: "Completed Repairs",
      value: "90",
      change: "+8.2%",
      trend: "up",
      icon: CheckCircle,
      color: "green",
      subtitle: "↑ 7 from last week"
    },
    {
      title: "Success Rate",
      value: "94%",
      change: "+15.3%",
      trend: "up",
      icon: TrendingUp,
      color: "purple",
      subtitle: "Above target (90%)"
    }
  ];

  const activities = [
    { id: "W123", status: "approved", time: "2 hours ago", color: "green", desc: "Laptop repair completed" },
    { id: "W124", status: "pending review", time: "5 hours ago", color: "amber", desc: "Smartphone screen replacement" },
    { id: "W125", status: "completed", time: "1 day ago", color: "blue", desc: "Tablet battery service" },
    { id: "W126", status: "rejected", time: "1 day ago", color: "red", desc: "Out of warranty coverage" },
    { id: "W127", status: "in progress", time: "2 days ago", color: "purple", desc: "Desktop diagnostic" },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      amber: "bg-amber-50 text-amber-600",
      green: "bg-green-50 text-green-600",
      purple: "bg-purple-50 text-purple-600",
      red: "bg-red-50 text-red-600"
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col relative`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              SC
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-bold text-gray-900 text-base">SC Portal</div>
                <div className="text-xs text-gray-500">Service Center</div>
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
                  ? "bg-blue-50 text-blue-600 font-medium shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all w-full group">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full p-1.5 shadow-md transition-all z-10"
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Welcome back, John Doe</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search claims..."
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              {/* Notifications */}
              <button className="relative p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              </button>
              {/* User Profile */}
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                  JD
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-gray-900">John Doe</div>
                  <div className="text-xs text-gray-500">SC Manager</div>
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
                  <div className={`p-2.5 rounded-lg ${getColorClasses(stat.color).split(' ')[0]}`}>
                    <stat.icon className={`w-6 h-6 ${getColorClasses(stat.color).split(' ')[1]}`} />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    stat.trend === 'up' ? 'bg-green-50 text-green-600' : 
                    stat.trend === 'neutral' ? 'bg-amber-50 text-amber-600' : 
                    'bg-gray-50 text-gray-600'
                  }`}>
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
            {/* Recent Activities */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Latest warranty claim updates</p>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {activities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(activity.color).split(' ')[0]}`}>
                          <ClipboardList className={`w-5 h-5 ${getColorClasses(activity.color).split(' ')[1]}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Claim #{activity.id}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{activity.desc}</p>
                          <span className={`inline-block mt-1.5 text-xs font-medium capitalize px-2 py-0.5 rounded-full ${getColorClasses(activity.color)}`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400">{activity.time}</span>
                        <button className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions & Alerts */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                    <Plus className="w-5 h-5" />
                    New Claim
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    Generate Report
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Data
                  </button>
                  <button className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filter Claims
                  </button>
                </div>
              </div>

              {/* System Alert */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">System Update</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      New features available! Check the changelog for exciting updates and improvements.
                    </p>
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Learn more →
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">This Week Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Claims Processed</span>
                    <span className="font-semibold text-gray-900">32</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Response Time</span>
                    <span className="font-semibold text-gray-900">2.5h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold text-green-600">98%</span>
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