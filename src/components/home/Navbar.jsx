import React, { useState } from 'react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-cyan-100 font-bold text-lg hidden sm:block drop-shadow-lg">OEM EV</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a
                href="#warranty-policy"
                className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
              >
                Chính sách bảo hành
              </a>
              <a
                href="#campaigns"
                className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
              >
                Chiến dịch
              </a>
              <a
                href="#support"
                className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm"
              >
                Hỗ trợ
              </a>
            </div>
          </div>

          {/* Login Button */}
          <div className="hidden md:block">
            <button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-xl border border-cyan-400/30">
              Đăng nhập
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-white/10 inline-flex items-center justify-center p-2 rounded-md text-cyan-100 hover:text-yellow-300 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300"
            >
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white/5 backdrop-blur-md border-t border-white/10">
            <a
              href="#warranty-policy"
              className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Chính sách bảo hành
            </a>
            <a
              href="#campaigns"
              className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Chiến dịch
            </a>
            <a
              href="#support"
              className="text-blue-100 hover:text-yellow-300 hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Hỗ trợ
            </a>
            <div className="pt-2">
              <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-xl border border-cyan-400/30">
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;