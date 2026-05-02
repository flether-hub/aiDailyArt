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

  return (
    <motion.div 
      className="w-16 h-16 flex items-center justify-center cursor-pointer relative group shrink-0"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.preventDefault();
        if (animating) return;
        setAnimating(true);
        setTimeout(() => setAnimating(false), 1500);
      }}
    >
      <motion.svg 
        viewBox="0 0 200 200" 
        className="w-full h-full drop-shadow-md z-10 relative" 
      >
        <g animate={animating ? { rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] } : {}} transition={{ duration: 0.5 }}>
          {/* Frame */}
          <rect x="20" y="10" width="120" height="150" fill="#c2410c" rx="4" transform="rotate(-5, 80, 85)" stroke="#9a3412" strokeWidth="2" />
          <rect x="25" y="15" width="110" height="140" fill="#ea580c" rx="2" transform="rotate(-5, 80, 85)" />
          
          {/* Canvas */}
          <g transform="rotate(-5, 80, 85)">
            <rect x="30" y="20" width="100" height="130" fill="#bef264" />
            <path d="M 30 60 Q 50 40 70 70 T 110 50 L 130 60 L 130 150 L 30 150 Z" fill="#a3e635" />
            <path d="M 30 90 Q 60 70 90 90 T 130 70 L 130 150 L 30 150 Z" fill="#84cc16" />
            
            {/* Mona Lisa Silhouette */}
            <path d="M 45 150 C 45 95, 55 70, 80 70 C 105 70, 115 95, 115 150 Z" fill="#171717" />
            {/* Face */}
            <path d="M 65 65 C 60 40, 100 40, 95 65 C 92 85, 68 85, 65 65 Z" fill="#fde047" /> 
            {/* Neck */}
            <path d="M 72 80 C 72 90, 88 90, 88 80 Z" fill="#fef08a" /> 
            {/* Pink Sash */}
            <path d="M 115 110 C 95 120, 70 140, 70 150 L 85 150 C 95 130, 115 120, 115 110 Z" fill="#db2777" />
            <path d="M 115 110 C 95 120, 70 140, 70 150 L 80 150 C 90 135, 110 120, 115 120 Z" fill="#be185d" /> 
            
            {/* Hands */}
            <path d="M 55 130 C 70 125, 90 135, 90 145 C 70 145, 55 135, 55 130 Z" fill="#fde047" /> 
            <path d="M 60 142 C 70 138, 80 142, 80 150 L 60 150 Z" fill="#fef08a" /> 
          </g>
        </g>

        {/* Palette */}
        <g transform="translate(65, 80)" animate={animating ? { scale: [1, 1.1, 1], rotate: [0, -10, 0] } : {}} transition={{ duration: 0.6, delay: 0.1 }}>
          {/* Main Palette Base */}
          <path d="M 10 30 C -20 0, 40 -20, 80 10 C 120 40, 110 100, 60 100 C 40 100, 30 80, 10 30 Z" fill="#eab308" />
          <path d="M 13 33 C -15 5, 43 -15, 80 13 C 115 40, 105 95, 60 95 C 43 95, 33 78, 13 33 Z" fill="#fde047" />
          
          {/* Thumb Hole */}
          <ellipse cx="30" cy="70" rx="8" ry="12" fill="#a16207" transform="rotate(-30, 30, 70)" />
          
          {/* Paint Splotches Layer */}
          {/* Pink */}
          <path d="M 60 15 C 65 5, 80 10, 75 25 C 70 40, 55 30, 60 15 Z" fill="#ec4899" />
          <path d="M 62 17 C 65 10, 75 14, 73 23 C 69 32, 59 26, 62 17 Z" fill="#f472b6" />
          {/* Pink Drip */}
          <path d="M 82 5 C 85 0, 95 10, 92 18 C 90 25, 80 15, 82 5 Z" fill="#ec4899" />

          {/* Purple */}
          <path d="M 85 45 C 95 35, 110 40, 105 55 C 100 70, 80 60, 85 45 Z" fill="#a855f7" />
          <path d="M 87 47 C 95 40, 105 44, 102 53 C 98 62, 84 56, 87 47 Z" fill="#c084fc" />

          {/* Cyan */}
          <path d="M 70 70 C 80 60, 95 70, 90 85 C 85 100, 65 85, 70 70 Z" fill="#06b6d4" />
          <path d="M 72 72 C 80 64, 90 72, 87 83 C 83 94, 69 83, 72 72 Z" fill="#22d3ee" />
        </g>

        {/* Brushes */}
        <g transform="translate(75, 110)" animate={animating ? { x: [0, 8, 0], y: [0, -12, 0] } : {}} transition={{ duration: 0.5, delay: 0.2 }}>
          {/* Brush 1 */}
          <g transform="rotate(-40)">
            {/* Wooden Handle */}
            <rect x="-5" y="0" width="10" height="70" fill="#6b21a8" rx="2" />
            <rect x="-3" y="0" width="4" height="70" fill="#9333ea" rx="1" />
            {/* Ferrule (Metal part) */}
            <rect x="-6" y="-18" width="12" height="18" fill="#d1d5db" rx="1" />
            <rect x="-6" y="-14" width="12" height="2" fill="#9ca3af" />
            <rect x="-6" y="-6" width="12" height="2" fill="#9ca3af" />
            {/* Bristles */}
            <path d="M -5 -18 C -5 -35, 0 -45, 0 -45 C 0 -45, 5 -35, 5 -18 Z" fill="#5f370e" />
            {/* Paint */}
            <path d="M -3 -30 C -2 -42, 0 -45, 0 -45 C 0 -45, 2 -42, 3 -30 Z" fill="#ec4899" />
          </g>
        </g>

        <g transform="translate(100, 135)" animate={animating ? { x: [0, 12, 0], y: [0, -18, 0] } : {}} transition={{ duration: 0.6, delay: 0.3 }}>
          {/* Brush 2 */}
          <g transform="rotate(-30)">
            <rect x="-4" y="0" width="8" height="60" fill="#4c1d95" rx="2" />
            <rect x="-2" y="0" width="3" height="60" fill="#6d28d9" rx="1" />
            <rect x="-5" y="-15" width="10" height="15" fill="#e5e7eb" rx="1" />
            <rect x="-5" y="-10" width="10" height="2" fill="#9ca3af" />
            <path d="M -4 -15 C -4 -30, 0 -40, 0 -40 C 0 -40, 4 -30, 4 -15 Z" fill="#451a03" />
            <path d="M -2 -25 C -1 -35, 0 -40, 0 -40 C 0 -40, 1 -35, 2 -25 Z" fill="#a855f7" />
          </g>
        </g>
      </motion.svg>
      <AnimatePresence>
        {animating && (
          <>
            {Array.from({ length: 8 }).map((_, i) => {
              const colors = ["#ec4899", "#a855f7", "#06b6d4", "#eab308"];
              const color = colors[i % colors.length];
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ 
                    x: Math.cos((i * Math.PI * 2) / 8) * 55, 
                    y: Math.sin((i * Math.PI * 2) / 8) * 55,
                    scale: 0,
                    opacity: 0
                  }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="absolute w-3 h-3 rounded-full z-20"
                  style={{ backgroundColor: color }}
                />
              )
            })}
          </>
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
