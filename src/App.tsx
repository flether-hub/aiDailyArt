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
      .then(data => setVisits(data.visits))
      .catch(console.error);
  }, []);
  
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 sm:px-10 shrink-0 z-50 sticky top-0">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-all duration-500 shadow-lg">
          <Palette className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex flex-col -space-y-1">
          <h1 className="text-xl font-black tracking-tighter text-slate-900 font-serif uppercase">
            AI <span className="text-amber-700">名画艺术馆</span>
          </h1>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">人工智能 策展赏析</span>
        </div>
      </Link>
      
      <div className="flex items-center gap-6">
        {visits !== null && (
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            累计访客: {visits.toLocaleString()}
          </div>
        )}
        
        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

        {isAdmin ? (
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/dashboard" 
              className="text-xs font-bold text-slate-600 hover:text-amber-700 uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 管理后台
            </Link>
            <button 
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> 退出登录
            </button>
          </div>
        ) : (
          <Link 
            to="/admin/login" 
            className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-colors"
          >
            后台
          </Link>
        )}
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
      className="flex-1 w-full flex flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans text-slate-900 gallery-paper">
      <Navbar />
      <main className="flex-1 overflow-x-hidden p-0 sm:p-0 flex justify-center selection:bg-amber-100">
        {children}
      </main>
      <footer className="py-12 border-t border-slate-200/60 text-center bg-white/30 backdrop-blur-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          AI 名画艺术馆 &copy; {new Date().getFullYear()} — 永恒经典与人工智能的碰撞
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
