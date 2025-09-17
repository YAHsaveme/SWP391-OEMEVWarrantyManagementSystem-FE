import { useState, useEffect, useRef } from 'react';
import { Users, Wrench, Briefcase, Shield } from "lucide-react";

export default function About() {
  const [visibleCards, setVisibleCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const sectionRef = useRef(null);

  const actors = [
    {
      icon: Users,
      title: "SC Staff",
      desc: "Tiếp nhận và quản lý hồ sơ bảo hành từ khách hàng, đảm bảo thông tin chính xác và đầy đủ.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      shadowColor: "shadow-blue-500/20",
      hoverShadow: "hover:shadow-blue-500/30"
    },
    {
      icon: Wrench,
      title: "SC Technician", 
      desc: "Thực hiện kiểm tra, sửa chữa và bảo trì theo yêu cầu bảo hành, cập nhật tiến trình xử lý.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      shadowColor: "shadow-emerald-500/20",
      hoverShadow: "hover:shadow-emerald-500/30"
    },
    {
      icon: Briefcase,
      title: "EVM Staff",
      desc: "Quản lý dữ liệu bảo hành tập trung, phân tích và phối hợp cùng các trung tâm dịch vụ.",
      gradient: "from-purple-500 to-violet-500",
      bgGradient: "from-purple-50 to-violet-50",
      shadowColor: "shadow-purple-500/20",
      hoverShadow: "hover:shadow-purple-500/30"
    },
    {
      icon: Shield,
      title: "Admin",
      desc: "Quản trị hệ thống, phân quyền người dùng, giám sát hoạt động và đảm bảo an toàn dữ liệu.",
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      shadowColor: "shadow-orange-500/20",
      hoverShadow: "hover:shadow-orange-500/30"
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate cards one by one
            actors.forEach((_, index) => {
              setTimeout(() => {
                setVisibleCards(prev => [...prev, index]);
              }, index * 200);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="about" 
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-cyan-100 to-emerald-100 rounded-full filter blur-3xl"></div>
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute top-32 left-10 w-4 h-4 bg-blue-400 rotate-45 opacity-20"></div>
      <div className="absolute top-64 right-16 w-6 h-6 bg-purple-400 rounded-full opacity-20"></div>
      <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-emerald-400 rotate-45 opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg">
              Tìm hiểu về hệ thống
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-slate-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Giới thiệu hệ thống
            </span>
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <p className="text-xl md:text-2xl text-slate-600 font-light leading-relaxed mb-6">
              OEM EV Warranty Management System là{" "}
              <span className="font-semibold text-blue-600">nền tảng nội bộ hỗ trợ toàn diện</span>{" "}
              cho việc quản lý bảo hành xe điện từ hãng.
            </p>
            <p className="text-lg text-slate-500">
              Hệ thống giúp tối ưu quy trình tiếp nhận, xử lý, và giám sát yêu cầu bảo hành một cách hiệu quả và chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {actors.map((actor, index) => {
            const IconComponent = actor.icon;
            const isVisible = visibleCards.includes(index);
            const isHovered = hoveredCard === index;
            
            return (
              <div
                key={index}
                className={`group relative transform transition-all duration-700 ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-12 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Card */}
                <div className={`relative h-full bg-white backdrop-blur-sm rounded-3xl p-8 shadow-xl ${actor.shadowColor} ${actor.hoverShadow} hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 border border-white/50`}>
                  {/* Background gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${actor.bgGradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Icon container */}
                  <div className="relative z-10 mb-6">
                    <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${actor.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 text-center">
                    <h3 className={`text-xl font-bold mb-4 bg-gradient-to-r ${actor.gradient} bg-clip-text text-transparent`}>
                      {actor.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">
                      {actor.desc}
                    </p>
                  </div>

                  {/* Hover effect border */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${actor.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                </div>

                {/* Floating icon effect */}
                <div className={`absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br ${actor.gradient} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-500 shadow-lg`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center bg-white/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-white/50">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
            Sẵn sàng trải nghiệm?
          </h3>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Khám phá cách hệ thống của chúng tôi có thể tối ưu hóa quy trình quản lý bảo hành xe điện của bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Bắt đầu ngay
            </button>
            <button className="px-8 py-4 bg-white/80 text-slate-700 font-semibold rounded-2xl border border-slate-200 hover:bg-white hover:shadow-lg transform hover:scale-105 transition-all duration-300">
              Xem demo
            </button>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20 fill-slate-100">
          <path d="M0,0 C150,100 350,0 600,50 C850,100 1050,0 1200,50 L1200,120 L0,120 Z"></path>
        </svg>
      </div>
    </section>
  );
}