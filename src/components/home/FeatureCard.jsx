import { useState, useEffect, useRef } from 'react';
import { FileText, ClipboardCheck, Wrench, DollarSign, Megaphone, BarChart3 } from "lucide-react";

export default function FeatureCard() {
  const [visibleCards, setVisibleCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const sectionRef = useRef(null);

  const features = [
    {
      icon: FileText,
      title: "Quản lý hồ sơ xe & khách hàng",
      desc: "Lưu trữ và quản lý tập trung thông tin xe điện, khách hàng và lịch sử bảo hành.",
      gradient: "from-blue-500 to-indigo-600",
      glowColor: "blue",
      pattern: "📋"
    },
    {
      icon: ClipboardCheck,
      title: "Tiếp nhận & xử lý yêu cầu bảo hành",
      desc: "Tiếp nhận, xác thực và phân loại các yêu cầu từ trung tâm dịch vụ.",
      gradient: "from-emerald-500 to-teal-600",
      glowColor: "emerald",
      pattern: "✓"
    },
    {
      icon: Wrench,
      title: "Theo dõi tiến trình sửa chữa",
      desc: "Theo dõi tình trạng xử lý của kỹ thuật viên từ khi tiếp nhận đến khi hoàn tất.",
      gradient: "from-orange-500 to-red-500",
      glowColor: "orange",
      pattern: "🔧"
    },
    {
      icon: DollarSign,
      title: "Quản lý chi phí bảo hành",
      desc: "Tự động tính toán và theo dõi chi phí bảo hành do hãng chi trả.",
      gradient: "from-green-500 to-emerald-500",
      glowColor: "green",
      pattern: "💰"
    },
    {
      icon: Megaphone,
      title: "Chiến dịch Recall/Service Campaign",
      desc: "Tạo và quản lý chiến dịch triệu hồi xe hoặc dịch vụ bảo dưỡng quy mô lớn.",
      gradient: "from-purple-500 to-violet-600",
      glowColor: "purple",
      pattern: "📢"
    },
    {
      icon: BarChart3,
      title: "Báo cáo & phân tích",
      desc: "Cung cấp báo cáo chi tiết và phân tích dữ liệu phục vụ quản lý.",
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "cyan",
      pattern: "📊"
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            features.forEach((_, index) => {
              setTimeout(() => {
                setVisibleCards(prev => [...prev, index]);
              }, index * 150);
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
      id="features" 
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-2000"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-full shadow-lg backdrop-blur-sm border border-white/20">
              ✨ Tính năng nổi bật
            </span>
          </div>
          
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-200 mb-6">
            <span className="block">Tính năng</span>
            <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">Mạnh mẽ</span>
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed mb-4">
              Hệ thống cung cấp đầy đủ công cụ để{" "}
              <span className="text-blue-400 font-semibold">SC Staff</span>,{" "}
              <span className="text-emerald-400 font-semibold">SC Technician</span>,{" "}
              <span className="text-purple-400 font-semibold">EVM Staff</span>{" "}
              và <span className="text-orange-400 font-semibold">Admin</span>
            </p>
            <p className="text-lg text-slate-400">
              quản lý toàn diện quy trình bảo hành xe điện một cách hiệu quả và chuyên nghiệp.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            const isVisible = visibleCards.includes(index);
            const isHovered = hoveredCard === index;
            
            return (
              <div
                key={index}
                className={`group relative transform transition-all duration-700 ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-16 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 scale-105`}></div>
                
                {/* Main card */}
                <div className="relative h-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500 transform hover:-translate-y-2">
                  {/* Pattern decoration */}
                  <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                    {feature.pattern}
                  </div>
                  
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Floating mini icon */}
                    <div className={`absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br ${feature.gradient} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-500 shadow-lg`}>
                      <IconComponent className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-200 transition-all duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                      {feature.desc}
                    </p>
                  </div>

                  {/* Animated border */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                  
                  {/* Interactive dots */}
                  <div className="absolute bottom-4 left-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`w-2 h-2 bg-gradient-to-r ${feature.gradient} rounded-full animate-pulse`}></div>
                    <div className={`w-2 h-2 bg-gradient-to-r ${feature.gradient} rounded-full animate-pulse delay-200`}></div>
                    <div className={`w-2 h-2 bg-gradient-to-r ${feature.gradient} rounded-full animate-pulse delay-400`}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 right-20 text-6xl opacity-10 animate-bounce">⚡</div>
        <div className="absolute bottom-32 left-10 text-4xl opacity-10 animate-pulse">🚗</div>
        <div className="absolute top-1/2 right-10 text-5xl opacity-10 animate-bounce delay-1000">🔧</div>
      </div>
    </section>
  );
}