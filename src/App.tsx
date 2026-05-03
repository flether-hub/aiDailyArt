import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Palette, LogOut, Activity, LayoutGrid } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

import Home from './pages/Home';
import ArtworkDetail from './pages/ArtworkDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function GalleryLogo() {
  const [animating, setAnimating] = useState(false);
  const [splashParticles, setSplashParticles] = useState<{ id: number; x: number; y: number; color: string; scale: number }[]>([]);
  
  const triggerAnimation = (e: React.MouseEvent) => {
    if (!animating) {
      setAnimating(true);
      
      // Create custom paint splash "fireworks"
      const colors = ["#fbbf24", "#ef4444", "#22c55e", "#1d4ed8", "#a855f7"];
      const newParticles = Array.from({ length: 14 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        scale: Math.random() * 0.7 + 0.3,
        color: colors[i % colors.length]
      }));
      setSplashParticles(newParticles);

      setTimeout(() => {
        setAnimating(false);
        setSplashParticles([]);
      }, 1200);
      
      // Keep confetti for extra flair
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { x, y },
        colors: colors,
        gravity: 0.8,
        ticks: 200,
        scalar: 0.8,
        shapes: ['circle'],
        disableForced3d: true
      });
    }
  };

  return (
    <motion.div 
      className="w-16 h-16 flex items-center justify-center cursor-pointer relative group shrink-0"
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      onMouseDown={triggerAnimation}
    >
      {/* Animated Paint Splashes (Firework Effect) */}
      <AnimatePresence>
        {splashParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none z-20"
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{ 
              scale: [0, p.scale * 4, 0],
              x: p.x * 2.8,
              y: p.y * 2.8,
              opacity: [1, 1, 0],
              filter: ["blur(0px)", "blur(1.5px)", "blur(4px)"]
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ 
              backgroundColor: p.color, 
              width: `${Math.random() * 6 + 4}px`, 
              height: `${Math.random() * 6 + 4}px`,
              boxShadow: `0 0 15px ${p.color}, 0 0 5px white` 
            }}
          />
        ))}
      </AnimatePresence>

      <motion.svg 
        viewBox="0 0 200 200" 
        className="w-full h-full drop-shadow-xl z-10 relative filter saturate-150" 
      >
        <motion.g animate={animating ? { 
          rotate: [0, -12, 12, -8, 8, 0],
          scale: [1, 1.2, 0.9, 1.1, 1]
        } : {}} transition={{ duration: 0.9, ease: "backOut" }}>
          
          <defs>
            <radialGradient id="paletteGrad" cx="35%" cy="35%" r="85%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>
            
            <filter id="blobShadow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" />
               <feOffset dx="2" dy="4" />
               <feComponentTransfer>
                 <feFuncA type="linear" slope="0.5" />
               </feComponentTransfer>
               <feMerge>
                 <feMergeNode />
                 <feMergeNode in="SourceGraphic" />
               </feMerge>
            </filter>

            {/* Glossy Paint Gradients */}
            <radialGradient id="paintRed" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="paintGreen" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#15803d" />
            </radialGradient>
            <radialGradient id="paintBlue" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <radialGradient id="paintYellow" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
          </defs>

          {/* Wooden Palette Base - Perfectly smooth rounded kidney shape without any sharp edges */}
          <g transform="rotate(-5, 100, 100)">
            <path 
              d="M 180,105 C 180,165 140,195 90,195 C 40,195 15,155 15,105 C 15,55 55,15 110,15 C 145,15 160,55 135,85 C 115,110 145,150 180,105 Z" 
              fill="url(#paletteGrad)" 
              stroke="#78350f" 
              strokeWidth="1.2"
              strokeLinejoin="round"
              shapeRendering="geometricPrecision"
            />
            
            {/* Soft Wood Grain Lines */}
            <path d="M 45,75 Q 85,55 145,70" stroke="#78350f" strokeWidth="0.8" opacity="0.15" fill="none" />
            <path d="M 55,135 Q 105,155 165,125" stroke="#78350f" strokeWidth="0.8" opacity="0.15" fill="none" />
            
            {/* Thumb Hole */}
            <ellipse cx="120" cy="140" rx="14" ry="11" fill="#451a03" opacity="0.4" transform="rotate(25, 120, 140)" />
            <ellipse cx="120" cy="140" rx="12" ry="9" fill="#fafaf9" />
            
            {/* Paint Blobs */}
            <g filter="url(#blobShadow)">
               {/* Yellow (Top Left) */}
               <ellipse cx="78" cy="65" rx="17" ry="15" fill="url(#paintYellow)" transform="rotate(-10, 78, 65)" />
               <circle cx="72" cy="58" r="3.5" fill="white" opacity="0.6" filter="blur(1.5px)" />
               
               {/* Red (Top Right) */}
               <ellipse cx="128" cy="78" rx="16" ry="14" fill="url(#paintRed)" transform="rotate(15, 128, 78)" />
               <circle cx="122" cy="72" r="3" fill="white" opacity="0.6" filter="blur(1.5px)" />
               
               {/* Green (Lower Left) */}
               <ellipse cx="62" cy="115" rx="18" ry="16" fill="url(#paintGreen)" transform="rotate(0, 62, 115)" />
               <circle cx="55" cy="108" r="4" fill="white" opacity="0.5" filter="blur(1.5px)" />
               
               {/* Blue (Bottom Center) */}
               <ellipse cx="90" cy="150" rx="17" ry="14" fill="url(#paintBlue)" transform="rotate(-5, 90, 150)" />
               <circle cx="84" cy="144" r="3.5" fill="white" opacity="0.6" filter="blur(1.5px)" />
            </g>
          </g>
          
          {/* Main Paint Brush */}
          <motion.g 
            transform="translate(100, 100) rotate(140) translate(-100, -100)"
            animate={animating ? { 
              rotate: [140, 150, 130, 140],
              scale: [1, 1.15, 1]
            } : {}}
            transition={{ duration: 0.9 }}
          >
             {/* Vibrant Red Handle */}
             <path d="M 96,15 L 104,15 L 104,125 Q 100,130 96,125 Z" fill="#b91c1c" />
             <rect x="95" y="12" width="10" height="105" rx="4" fill="url(#handleHighlight)" opacity="0.4" />
             <defs>
               <linearGradient id="handleHighlight" x1="0" y1="0" x2="1" y2="0">
                 <stop offset="0%" stopColor="white" />
                 <stop offset="100%" stopColor="transparent" />
               </linearGradient>
             </defs>
             
             {/* Polished Metal Ferrule */}
             <rect x="93" y="110" width="14" height="28" fill="#64748b" rx="2.5" />
             <rect x="93" y="116" width="14" height="3" fill="#cbd5e1" opacity="0.9" />
             <rect x="93" y="125" width="14" height="3" fill="#cbd5e1" opacity="0.9" />
             
             {/* Tapered Bristles */}
             <path d="M 93,138 C 88,180 112,180 107,138 Z" fill="#0f172a" />
             <path d="M 96,165 Q 100,180 104,165 Z" fill="#fbbf24" opacity="0.9" /> {/* Paint on tip */}
          </motion.g>
        </motion.g>
      </motion.svg>
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
      <footer className="py-16 border-t border-slate-200/60 bg-white/30 backdrop-blur-md relative overflow-hidden">
        {/* Artistic background element for footer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
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
              <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-[0.2em] sm:tracking-[0.5em] leading-relaxed whitespace-nowrap">
                AI 每日画廊 &copy; {new Date().getFullYear()} 
              </p>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
          </div>
          
          <div className="max-w-2xl text-center px-4 sm:px-8">
            <p className="text-[12px] sm:text-[13px] md:text-sm text-slate-500 font-medium leading-relaxed sm:leading-loose opacity-90">
              <span className="text-amber-800 font-bold mr-2">永恒经典与人工智能的碰撞 —</span>
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
