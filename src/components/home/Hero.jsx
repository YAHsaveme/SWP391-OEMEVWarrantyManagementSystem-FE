import { useState, useEffect } from 'react';

export default function Hero() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        {/* Dynamic mouse-following gradient */}
        <div 
          className="absolute inset-0 opacity-40 transition-all duration-700 ease-out"
          style={{
            background: `
              radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(59, 130, 246, 0.6) 0%, 
                rgba(147, 51, 234, 0.4) 25%, 
                rgba(6, 182, 212, 0.3) 50%, 
                transparent 70%
              )
            `
          }}
        ></div>

        {/* Enhanced floating orbs with better positioning */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-3/4 w-72 h-72 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse delay-2000"></div>
        
        {/* Animated grid with glow effect */}
        <div className="absolute inset-0 opacity-[0.08]">
          <div 
            className="absolute inset-0 animate-pulse" 
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              filter: 'drop-shadow(0 0 2px rgba(59, 130, 246, 0.3))'
            }}
          ></div>
        </div>

        {/* Particle effect simulation */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 py-24">
        {/* Premium Logo with glow effect */}
        <div className={`mb-10 transform transition-all duration-1200 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}`}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl blur-md opacity-60"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 via-cyan-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 hover:shadow-blue-400/50 transition-all duration-500 transform hover:scale-110">
              <svg className="w-12 h-12 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Epic main heading with better typography */}
        <div className={`mb-8 transform transition-all duration-1200 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-none">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-cyan-100 drop-shadow-2xl">
              OEM EV
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mt-2 drop-shadow-xl">
              Warranty
            </span>
          </h1>
          <p className="text-4xl md:text-5xl lg:text-6xl font-light text-slate-300 mt-4 tracking-wide">
            Management System
          </p>
        </div>

        {/* Enhanced subtitle with better spacing */}
        <div className={`max-w-5xl mx-auto mb-14 transform transition-all duration-1200 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <p className="text-xl md:text-2xl text-slate-300 font-light leading-relaxed mb-8 tracking-wide">
            Nền tảng nội bộ hiện đại hỗ trợ toàn diện
          </p>
          
          {/* Premium role badges with animations */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[
              { name: 'SC Staff', color: 'from-blue-500 via-blue-600 to-cyan-500', shadow: 'shadow-blue-500/40' },
              { name: 'SC Technician', color: 'from-emerald-500 via-green-600 to-teal-500', shadow: 'shadow-emerald-500/40' },
              { name: 'EVM Staff', color: 'from-purple-500 via-violet-600 to-indigo-500', shadow: 'shadow-purple-500/40' },
              { name: 'Admin', color: 'from-orange-500 via-red-600 to-pink-500', shadow: 'shadow-orange-500/40' }
            ].map((role, index) => (
              <div
                key={role.name}
                className={`group transform transition-all duration-500 hover:scale-110 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ 
                  transitionDelay: `${600 + index * 150}ms`,
                  animationDelay: `${600 + index * 150}ms`
                }}
              >
                <span className={`relative px-6 py-3 bg-gradient-to-r ${role.color} text-white font-bold rounded-2xl text-sm md:text-base shadow-xl ${role.shadow} hover:shadow-2xl transition-all duration-300 border border-white/20`}>
                  <span className="relative z-10">{role.name}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </span>
              </div>
            ))}
          </div>
          
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-4xl mx-auto">
            trong việc quản lý bảo hành xe điện một cách hiệu quả và chuyên nghiệp
          </p>
        </div>

        {/* Premium CTA Buttons */}
        <div className={`flex flex-col sm:flex-row gap-6 mb-16 transform transition-all duration-1200 delay-600 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-cyan-500 text-white font-bold rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-400/50 transform hover:scale-105 transition-all duration-400 text-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-400"></div>
            <span className="relative flex items-center justify-center gap-3 z-10">
              Bắt đầu ngay
              <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          
          <button className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/20 hover:border-white/50 transform hover:scale-105 transition-all duration-400 text-lg shadow-xl">
            Tìm hiểu thêm
          </button>
        </div>

        {/* Enhanced Stats with better design */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto transform transition-all duration-1200 delay-800 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          {[
            { number: '99%', label: 'Độ tin cậy', icon: '🎯' },
            { number: '24/7', label: 'Hỗ trợ', icon: '🚀' },
            { number: '100+', label: 'Tính năng', icon: '⚡' }
          ].map((stat, index) => (
            <div key={stat.label} className="group text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-400 transform hover:scale-105">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">{stat.number}</div>
              <div className="text-slate-300 text-sm font-medium uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Enhanced decorative elements */}
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-gradient-to-bl from-blue-500/30 via-purple-500/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-gradient-to-tr from-purple-500/30 via-pink-500/20 to-transparent rounded-full blur-3xl"></div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </section>
  );
}