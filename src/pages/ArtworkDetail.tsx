import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, ZoomIn, X, ExternalLink, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { extractFirstSubheading, cleanInterpretation } from '../lib/artUtils';

export default function ArtworkDetail() {
  const { id } = useParams();
  const [artwork, setArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const resArt = await fetch(`/api/artworks/${id}`);
        if (!resArt.ok) throw new Error('Artwork not found');
        const item = await resArt.json();
        setArtwork(item);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isZoomed]);

  if (loading) return <div className="text-center py-40 text-slate-500 animate-pulse font-serif uppercase tracking-[0.4em] text-xs font-bold">正在揭开名画真容...</div>;
  if (!artwork) return <div className="text-center py-40 text-slate-500 font-serif">档案中未找到该画作。</div>;

  return (
    <>
      <div className="w-full min-h-screen bg-[#faf9f6] flex py-8 sm:py-12 px-4 sm:px-8 md:px-12 lg:px-16 pb-32">
        <div className="w-full max-w-[1280px] mx-auto">
          <Link to="/" className="group inline-flex items-center gap-2 text-[11px] md:text-sm font-bold tracking-widest text-slate-500 hover:text-slate-900 transition-colors mb-12">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>返回档案库</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16"
          >
            {/* Left Column: Image (Sticky) */}
            <div className="lg:col-span-5 xl:col-span-6">
              <div className="sticky top-28 cursor-zoom-in group relative" onClick={() => setIsZoomed(true)}>
                <div className="art-frame bg-white overflow-hidden p-3 shadow-md border border-slate-200/60 relative group-hover:shadow-xl transition-shadow duration-300 min-h-[300px] flex items-center justify-center">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="w-full h-auto object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.className = "hidden";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = "flex flex-col items-center justify-center py-20 text-slate-300 w-full";
                        placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><p class="text-xs uppercase tracking-widest font-bold">画作加载受阻</p>';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
                     <div className="bg-white/90 text-slate-900 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur transform scale-90 group-hover:scale-100 shadow-xl">
                        <ZoomIn className="w-6 h-6" />
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details & Content */}
            <div className="lg:col-span-7 xl:col-span-6">
              {/* Title & Metadata */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-black text-slate-950 mb-6 leading-tight tracking-tight">
                {artwork.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs md:text-sm font-bold uppercase tracking-widest mb-8">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tracking-[0.2em]">艺术家:</span>
                  <span className="text-slate-800">{artwork.artist}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tracking-[0.2em]">年代:</span>
                  <span className="text-slate-800">{artwork.year ? artwork.year.toString().substring(0, 4) : '未知'}</span>
                </div>
              </div>

              {(() => {
                const subheading = extractFirstSubheading(artwork.ai_interpretation);
                if (!subheading) return null;
                return (
                  <div className="mb-10 p-6 bg-slate-50 border-l-4 border-amber-800/20 rounded-r-lg animate-fade-in shadow-sm">
                    <h2 className="text-xl md:text-2xl font-serif italic text-slate-800 leading-tight">
                      “{subheading}”
                    </h2>
                  </div>
                );
              })()}

              {/* Interpretation */}
              <div className="prose prose-slate prose-base md:prose-lg max-w-none font-serif text-slate-700 leading-relaxed mb-12"
                    dangerouslySetInnerHTML={{ __html: cleanInterpretation(artwork.ai_interpretation) || '<p>记录遗失，目前暂无关于该画作的深度分析手稿...</p>' }} />

              {/* Additional Info / Footer */}
              <div className="mt-4 pt-4 border-t border-slate-200/60 ">
                {/* Meta Row - Wrapped to prevent scrollbar */}
                <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
                  
                  {/* Museum col */}
                  <div className="flex flex-col gap-1 min-w-[180px]">
                    <span className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] h-5 flex items-center">馆藏机构</span>
                    <span className="text-slate-800 text-[11px] md:text-xs font-bold leading-relaxed">{artwork.museum}</span>
                  </div>

                  {/* Source col */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] h-5 flex items-center">连接</span>
                    {artwork.source_url ? (
                      <a href={artwork.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors text-[11px] md:text-xs font-bold flex items-center gap-1 group whitespace-nowrap leading-relaxed">
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> 来源网站
                      </a>
                    ) : (
                      <span className="text-slate-800 text-[11px] md:text-xs font-bold flex items-center gap-1 leading-relaxed">未提供</span>
                    )}
                  </div>

                  {/* Views col */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] h-5 flex items-center">浏览次数</span>
                    <span className="text-[11px] md:text-xs text-slate-800 font-bold flex items-center gap-1.5 leading-relaxed"><Eye className="w-3 h-3 text-slate-400"/> {(artwork.views || 0).toLocaleString()} 次</span>
                  </div>

                  {/* Created At col */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] h-5 flex items-center whitespace-nowrap">收录时间</span>
                    <span className="text-[11px] md:text-xs text-slate-800 font-bold leading-relaxed whitespace-nowrap">{formatDistanceToNow(new Date((artwork.created_at ? (artwork.created_at + (artwork.created_at.endsWith('Z') ? '' : 'Z')) : Date.now())), { addSuffix: true, locale: zhCN })}</span>
                  </div>
                </div>

                {/* Keywords (Tags) row */}
                {artwork.keywords && Array.isArray(artwork.keywords) && artwork.keywords.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100/50">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.3em] h-5 flex items-center">艺术焦点</h3>
                      <div className="flex flex-wrap gap-2">
                        {artwork.keywords.map((k: string) => (
                          <span key={k} className="px-2.5 py-1 bg-slate-100/50 border border-slate-200/60 text-slate-800 text-[11px] md:text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-default">
                            #{k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox / Zoom Overlay */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#faf9f6]/95 backdrop-blur-sm flex items-center justify-center overflow-hidden cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-6 right-6 lg:top-10 lg:right-10 bg-white/50 hover:bg-white text-slate-900 z-10 p-3 rounded-full transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>
               <X className="w-6 h-6" />
            </button>
            <motion.div 
              className="w-full h-full flex items-center justify-center"
            >
              <motion.img 
                drag
                dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 2 }}
                exit={{ scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                src={artwork.image_url} 
                alt={artwork.title} 
                className="max-w-[80vw] max-h-[80vh] object-contain shadow-2xl rounded-sm border border-slate-200/50 cursor-grab active:cursor-grabbing" 
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
