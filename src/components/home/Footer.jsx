import { useState } from 'react';
import { Mail, Phone, Shield, Zap, ArrowUp } from "lucide-react";

export default function Footer() {
  const [hoveredContact, setHoveredContact] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const contactItems = [
    {
      icon: Mail,
      text: "support@oem-ev.vn",
      label: "Email hỗ trợ",
      gradient: "from-blue-400 to-cyan-400",
      href: "mailto:support@oem-ev.vn"
    },
    {
      icon: Phone,
      text: "Hotline IT: 1900-123-456",
      label: "Hotline",
      gradient: "from-emerald-400 to-teal-400",
      href: "tel:1900123456"
    },
    {
      icon: Shield,
      text: "Phòng CNTT - OEM EV",
      label: "Bộ phận",
      gradient: "from-purple-400 to-violet-400",
      href: "#"
    }
  ];

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid gap-12 md:grid-cols-3 mb-12">
          
          {/* Company Info */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  OEM EV
                </h2>
                <p className="text-sm text-slate-300">Warranty Management</p>
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed">
                Phần mềm nội bộ hỗ trợ quản lý bảo hành xe điện từ hãng một cách{" "}
                <span className="text-blue-400 font-semibold">hiệu quả</span> và{" "}
                <span className="text-purple-400 font-semibold">chuyên nghiệp</span>.
              </p>
              
              {/* Role tags */}
              <div className="flex flex-wrap gap-2">
                {['SC Staff', 'SC Technician', 'EVM Staff', 'Admin'].map((role, index) => (
                  <span 
                    key={role}
                    className="px-3 py-1 bg-white/10 backdrop-blur-sm text-xs font-medium rounded-full border border-white/20 hover:bg-white/20 transition-colors duration-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              Liên hệ nội bộ
            </h3>
            
            <div className="space-y-4">
              {contactItems.map((item, index) => {
                const IconComponent = item.icon;
                const isHovered = hoveredContact === index;
                
                return (
                  <a
                    key={index}
                    href={item.href}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1"
                    onMouseEnter={() => setHoveredContact(index)}
                    onMouseLeave={() => setHoveredContact(null)}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${item.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-white font-medium group-hover:text-blue-200 transition-colors">
                        {item.text}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Additional Info & CTA */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              Thông tin hệ thống
            </h3>
            
            {/* System status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-slate-300">Trạng thái hệ thống</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Hoạt động</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-slate-300">Phiên bản</span>
                <span className="text-blue-400 font-medium">v2.1.0</span>
              </div>
            </div>

            {/* Back to top button */}
            <button
              onClick={scrollToTop}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowUp className="w-4 h-4" />
              Về đầu trang
            </button>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-slate-400">
                © {new Date().getFullYear()}{" "}
                <span className="text-white font-semibold">OEM EV Warranty Management</span>.{" "}
                All rights reserved.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Phát triển bởi Phòng CNTT - OEM EV
              </p>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium text-sm">Bảo mật SSL</span>
              </div>
              
              <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium text-sm">Nội bộ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20 fill-slate-800/50">
          <path d="M0,0 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* Floating decorations */}
      <div className="absolute top-20 right-32 text-4xl opacity-10 animate-bounce">⚡</div>
      <div className="absolute bottom-32 left-20 text-3xl opacity-10 animate-pulse">🚗</div>
    </footer>
  );
}