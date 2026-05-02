import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Palette, LogOut, Activity, LayoutGrid } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import Home from './pages/Home';
import ArtworkDetail from './pages/ArtworkDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

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
          <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-all duration-500 shadow-lg">
            <Palette className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-slate-900 font-serif uppercase leading-tight">
              AI <span className="text-amber-700">每日画廊</span>
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
            <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
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
      <footer className="py-12 border-t border-slate-200/60 text-center bg-white/30 backdrop-blur-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] px-4">
          AI 每日画廊 &copy; {new Date().getFullYear()} — 永恒经典与人工智能的碰撞
        </p>
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
