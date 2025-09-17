import { UserCircle, Quote, Star, Users, Award, Sparkles } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      role: "SC Staff",
      name: "Nguyễn Thu Hà",
      position: "Nhân viên Trung tâm Dịch vụ",
      feedback:
        "Việc tiếp nhận và quản lý hồ sơ bảo hành trở nên dễ dàng, nhanh chóng và chính xác hơn rất nhiều.",
      rating: 5,
      avatar: "NH",
      gradient: "from-emerald-400 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      highlight: "emerald"
    },
    {
      role: "SC Technician", 
      name: "Trần Minh Đức",
      position: "Kỹ thuật viên Sửa chữa",
      feedback:
        "Hệ thống giúp tôi theo dõi tiến trình sửa chữa rõ ràng, tiết kiệm thời gian và hạn chế sai sót.",
      rating: 5,
      avatar: "MD",
      gradient: "from-blue-400 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      highlight: "blue"
    },
    {
      role: "EVM Staff",
      name: "Lê Phương Anh",
      position: "Chuyên viên Quản lý Xe điện",
      feedback:
        "Có được dữ liệu tập trung giúp phân tích và phối hợp với các trung tâm dịch vụ hiệu quả hơn.",
      rating: 5,
      avatar: "PA",
      gradient: "from-purple-400 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      highlight: "purple"
    },
    {
      role: "Admin",
      name: "Phạm Quốc Việt",
      position: "Quản trị viên Hệ thống",
      feedback:
        "Quản lý người dùng, phân quyền và giám sát hoạt động hệ thống trở nên đơn giản và minh bạch.",
      rating: 5,
      avatar: "QV",
      gradient: "from-orange-400 to-red-600",
      bgGradient: "from-orange-50 to-red-50",
      highlight: "orange"
    },
  ];

  const stats = [
    { number: "98%", label: "Độ hài lòng", icon: Sparkles },
    { number: "500+", label: "Người dùng", icon: Users },
    { number: "4.9/5", label: "Đánh giá", icon: Star },
    { number: "99%", label: "Uptime", icon: Award }
  ];

  return (
    <section id="testimonials" className="relative py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-100/20 to-pink-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-6 py-3 rounded-full font-semibold text-sm mb-6 shadow-lg">
            <Users className="w-5 h-5" />
            <span>Phản hồi từ người dùng</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            Cảm nhận từ người dùng
            <br />
            <span className="text-4xl md:text-5xl">nội bộ</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Hệ thống được thiết kế để hỗ trợ tối đa cho từng vai trò trong quy trình 
            bảo hành xe điện, mang lại trải nghiệm làm việc tuyệt vời.
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-500 border border-white/50 group">
                <div className="flex flex-col items-center">
                  <stat.icon className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((item, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${item.bgGradient} backdrop-blur-sm rounded-3xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-700 group border border-white/60 overflow-hidden`}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 right-4">
                  <Quote className="w-20 h-20 rotate-12" />
                </div>
                <div className="absolute bottom-4 left-4">
                  <Quote className="w-16 h-16 -rotate-12" />
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Quote Icon */}
                <div className="mb-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
                    <Quote className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Feedback */}
                <blockquote className="text-gray-700 text-sm leading-relaxed mb-8 font-medium">
                  "{item.feedback}"
                </blockquote>

                {/* Rating */}
                <div className="flex items-center space-x-1 mb-6">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 text-${item.highlight}-400 fill-current`} />
                  ))}
                </div>

                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <div className={`relative w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500`}>
                    <span className="text-white font-bold text-lg">{item.avatar}</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-3 border-white rounded-full"></div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-lg">{item.name}</div>
                    <div className="text-sm text-gray-600 font-medium">{item.position}</div>
                    <div className={`inline-block px-3 py-1 bg-${item.highlight}-100 text-${item.highlight}-700 text-xs font-semibold rounded-full mt-2`}>
                      {item.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tham gia cùng chúng tôi ngay hôm nay!
            </h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Khám phá hệ thống quản lý bảo hành xe điện hiện đại, 
              được tin dùng bởi hàng trăm chuyên gia trong ngành.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 flex items-center space-x-3">
                <Users className="w-6 h-6" />
                <span>Bắt đầu ngay</span>
              </button>
              <button className="bg-white/80 hover:bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-300 px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-500 transform hover:scale-105 flex items-center space-x-3">
                <Award className="w-6 h-6" />
                <span>Tìm hiểu thêm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}