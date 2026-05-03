import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Palette, LogOut, Activity, LayoutGrid } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import Home from './pages/Home';
import ArtworkDetail from './pages/ArtworkDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function GalleryLogo() {
  const [animating, setAnimating] = useState(false);
  
  const triggerAnimation = () => {
    if (!animating) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 1500);
    }
  };

  return (
    <motion.div 
      className="w-16 h-16 flex items-center justify-center cursor-pointer relative group shrink-0"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onMouseEnter={triggerAnimation}
      onMouseDown={triggerAnimation}
    >
      <motion.svg 
        viewBox="0 0 200 200" 
        className="w-full h-full drop-shadow-xl z-10 relative filter saturate-120" 
      >
        <g animate={animating ? { 
          rotate: [0, -10, 10, -5, 5, 0],
          scale: [1, 1.1, 1]
        } : {}} transition={{ duration: 0.8, ease: "easeInOut" }}>
          
          {/* Wooden Palette - Irregular Shape */}
          <path 
            d="M 170 100 C 170 150, 140 185, 80 185 C 20 185, 10 140, 10 90 C 10 40, 50 15, 100 15 C 130 15, 170 50, 170 100 Z" 
            fill="#d29851" 
            stroke="#92400e" 
            strokeWidth="1.5"
          />
          <path 
            d="M 165 100 C 165 145, 137 178, 80 178 C 25 178, 16 136, 16 90 C 16 45, 53 21, 100 21 C 127 21, 165 54, 165 100 Z" 
            fill="#e2a65a" 
          />
          
          {/* Thumb Hole */}
          <circle cx="130" cy="140" r="14" fill="#78350f" opacity="0.9" />
          
          {/* Mixed Color Area */}
          <g>
            <radialGradient id="mixedGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#92400e" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#78350f" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
            </radialGradient>
            <path 
              d="M 85 85 Q 115 75 135 105 Q 110 135 80 120 Q 70 100 85 85 Z" 
              fill="url(#mixedGrad)" 
              className="filter blur-[2px]"
            />
            {/* Some smaller subtle mixed spots */}
            <circle cx="105" cy="100" r="10" fill="#92400e" opacity="0.2" />
            <circle cx="115" cy="90" r="8" fill="#451a03" opacity="0.15" />
          </g>
          
          {/* Paint Splotches - Thick and Glossy */}
          <g>
            {/* Red */}
            <circle cx="45" cy="70" r="14" fill="#ef4444" />
            <circle cx="41" cy="66" r="4" fill="white" opacity="0.4" />
            {/* Green */}
            <circle cx="65" cy="40" r="12" fill="#22c55e" />
            <circle cx="62" cy="37" r="3" fill="white" opacity="0.4" />
            {/* Black */}
            <circle cx="105" cy="45" r="13" fill="#171717" />
            <circle cx="102" cy="42" r="3" fill="white" opacity="0.4" />
            {/* Yellow */}
            <circle cx="42" cy="115" r="15" fill="#facc15" />
            <circle cx="38" cy="111" r="5" fill="white" opacity="0.4" />
            {/* Blue */}
            <circle cx="75" cy="155" r="16" fill="#3b82f6" />
            <circle cx="71" cy="151" r="6" fill="white" opacity="0.4" />
          </g>
          
          {/* Paint Brush */}
          <g transform="rotate(-25, 100, 110)" animate={animating ? { 
            x: [0, 10, -10, 0],
            rotate: [-25, -15, -35, -25]
          } : {}} transition={{ duration: 1 }}>
             {/* Handle */}
             <rect x="155" y="0" width="10" height="150" fill="#f87171" rx="2" stroke="#b91c1c" strokeWidth="1" />
             <rect x="157" y="10" width="2" height="130" fill="white" opacity="0.2" rx="1" />
             {/* Metal Ferrule */}
             <rect x="154" y="135" width="12" height="25" fill="#94a3b8" rx="1" />
             <rect x="154" y="142" width="12" height="3" fill="#475569" opacity="0.5" />
             {/* Bristles */}
             <path d="M 154 160 Q 160 195 166 160 Z" fill="#451a03" />
             {/* Paint on brush tip */}
             <path d="M 157 175 Q 160 185 163 175 Z" fill="#3b82f6" fillOpacity="0.8" />
          </g>
        </g>
      </motion.svg>

      <AnimatePresence>
        {animating && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Many small colorful sparkles */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * Math.PI * 2) / 16;
              const distance = 40 + Math.random() * 60;
              const colors = ["#ef4444", "#22c55e", "#facc15", "#3b82f6", "#ec4899", "#a855f7"];
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                  animate={{ 
                    x: Math.cos(angle) * distance, 
                    y: Math.sin(angle) * distance,
                    scale: [0, 1.2, 0],
                    opacity: [1, 1, 0],
                    rotate: 360
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.8 + Math.random() * 0.4, 
                    ease: "easeOut",
                    delay: Math.random() * 0.1
                  }}
                  className="absolute w-2 h-2 rounded-full blur-[1px]"
                  style={{ 
                    backgroundColor: colors[i % colors.length],
                    boxShadow: `0 0 8px ${colors[i % colors.length]}`
                  }}
                />
              );
            })}
            
            {/* Radiant light flash */}
            <motion.div 
               initial={{ scale: 0, opacity: 0 }}
               animate={{ scale: [0, 1.5, 2], opacity: [0, 0.4, 0] }}
               transition={{ duration: 0.5 }}
               className="absolute w-24 h-24 bg-white rounded-full blur-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Navbar() {
  const { isAdmin, logout } = useAuth();
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats/visit', { method: 'POST' })
      .then(() => fetch('/api/stats'))
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.visits === 'number') {
           setVisits(data.visits);
        }
      })
      .catch(console.error);
  }, []);
  
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0 z-50 sticky top-0">
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <GalleryLogo />
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter font-serif uppercase leading-tight brush-header">
              AI 每日画廊
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">人工智能 策展赏析</span>
          </div>
        </Link>
        
        {/* Animated AI Robot & Data Streams graphic */}
        <div className="hidden lg:flex flex-1 justify-center items-center px-8 pointer-events-none select-none opacity-80">
          <svg width="340" height="40" viewBox="0 0 340 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 20 Q 85 5, 140 20" stroke="url(#lineGrad1)" strokeWidth="1.5" fill="none" className="animate-[pulse_3s_ease-in-out_infinite]" />
            <path d="M340 20 Q 255 35, 200 20" stroke="url(#lineGrad2)" strokeWidth="1.5" fill="none" className="animate-[pulse_3.5s_ease-in-out_infinite]" />
            <path d="M0 25 Q 100 35, 145 25" stroke="url(#lineGrad1)" strokeWidth="1" fill="none" strokeDasharray="2 3" opacity="0.5" className="animate-[pulse_4s_ease-in-out_infinite]" />
            <path d="M340 15 Q 240 5, 195 15" stroke="url(#lineGrad2)" strokeWidth="1" fill="none" strokeDasharray="3 4" opacity="0.5" className="animate-[pulse_2.5s_ease-in-out_infinite]" />
            
            {/* Energy Nodes */}
            <circle cx="70" cy="12" r="2" fill="#d97706" className="animate-ping" />
            <circle cx="270" cy="28" r="2" fill="#d97706" className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            
            <circle r="1.5" fill="#f59e0b">
              <animateMotion dur="4s" repeatCount="indefinite" path="M0 20 Q 85 5, 140 20" />
            </circle>
            <circle r="1.5" fill="#f59e0b">
              <animateMotion dur="3.5s" repeatCount="indefinite" path="M340 20 Q 255 35, 200 20" />
            </circle>

            {/* AI Robot Core */}
            <g transform="translate(155, 10)">
              <rect x="0" y="4" width="30" height="18" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" className="animate-[pulse_5s_ease-in-out_infinite]" />
              {/* Eyes */}
              <rect x="6" y="10" width="6" height="3" rx="1.5" fill="#0f172a" className="animate-[pulse_1.5s_ease-in-out_infinite]" />
              <rect x="18" y="10" width="6" height="3" rx="1.5" fill="#0f172a" className="animate-[pulse_1.5s_ease-in-out_infinite]" />
              {/* Antennae */}
              <path d="M15 4 L15 0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="15" cy="0" r="2" fill="#f59e0b" className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <circle cx="15" cy="0" r="2" fill="#f59e0b" />
            </g>
            
            <defs>
              <linearGradient id="lineGrad1" x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" stopOpacity="0" />
                <stop offset="1" stopColor="#d97706" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="340" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" stopOpacity="0" />
                <stop offset="1" stopColor="#d97706" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {visits !== null && (
            <div className="hidden md:flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-500">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              累计访客: {visits.toLocaleString()}
            </div>
          )}
          
          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

          {isAdmin ? (
            <div className="flex items-center gap-3 md:gap-4">
              <Link 
                to="/admin/dashboard" 
                className="text-slate-500 hover:text-amber-700 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-slate-100"
                title="管理"
              >
                <LayoutGrid className="w-5 h-5" />
              </Link>
              <button 
                onClick={logout}
                className="text-red-400 hover:text-red-600 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-red-50"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/admin/login" 
              className="text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-slate-100"
              title="管理"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <div key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/artwork/:id" element={<PageWrapper><ArtworkDetail /></PageWrapper>} />
          <Route path="/admin/login" element={<PageWrapper><AdminLogin /></PageWrapper>} />
          <Route path="/admin/dashboard" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        </Routes>
      </div>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 w-full flex flex-col"
    >
      {children}
    </motion.div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans text-slate-900 gallery-paper">
      <Navbar />
      <main className="flex-1 w-full flex flex-col overflow-x-hidden p-0 sm:p-0 selection:bg-amber-100">
        {children}
      </main>
      <footer className="py-24 border-t border-slate-200/60 bg-white/30 backdrop-blur-md relative overflow-hidden">
        {/* Artistic background element for footer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-10">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="flex items-center gap-4 group"
          >
             <div className="grayscale group-hover:grayscale-0 transition-all duration-700 scale-75">
               <GalleryLogo />
             </div>
             <div className="h-10 w-px bg-slate-200"></div>
             <span className="font-serif font-black text-xl tracking-[0.2em] text-slate-800 brush-header">AI ART DAILY</span>
          </motion.div>

          <div className="flex flex-col items-center gap-4 w-full px-4 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-6 w-full max-w-lg">
              <div className="h-px flex-1 bg-slate-200"></div>
              <p className="text-[10px] sm:text-sm font-black text-slate-900 uppercase tracking-[0.2em] sm:tracking-[0.5em] leading-relaxed whitespace-nowrap">
                AI 每日画廊 &copy; {new Date().getFullYear()} 
              </p>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
          </div>
          
          <div className="max-w-2xl text-center px-8">
            <p className="text-[11px] text-slate-500 font-medium leading-loose opacity-80">
              <span className="text-amber-800/80 font-bold mr-2">永恒经典与人工智能的碰撞 —</span>
              本馆致力于通过尖端 AI 技术重新发现世界艺术遗产。每一幅作品的解读均融合了海量历史数据与当代审美洞察，为您呈现跨越时空的艺术盛宴。
            </p>
          </div>

          </div>
        </footer>
      </div>
    );
  }

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <AnimatedRoutes />
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}
