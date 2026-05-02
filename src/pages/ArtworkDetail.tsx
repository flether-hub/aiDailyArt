import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, ZoomIn, X, ExternalLink, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

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
          <Link to="/" className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mb-12">
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">返回档案库</span>
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
                <div className="art-frame bg-white overflow-hidden p-3 shadow-md border border-slate-200/60 relative group-hover:shadow-xl transition-shadow duration-300">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="w-full h-auto object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
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
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-slate-950 mb-6 leading-tight tracking-tight">
                {artwork.title}
              </h1>

              <div className="flex flex-col sm:flex-row flex-wrap sm:items-center gap-x-8 gap-y-6 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest mb-10 pb-8 border-b border-slate-200/60">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-amber-700 tracking-[0.3em] flex items-center gap-1">艺术家</span>
                  <span className="text-slate-900 text-sm md:text-base">{artwork.artist}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-amber-700 tracking-[0.3em] flex items-center gap-1">创作年代</span>
                  <span className="text-slate-900 text-sm md:text-base">{artwork.year}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-amber-700 tracking-[0.3em] flex items-center gap-1">馆藏机构</span>
                  <span className="text-slate-900 text-sm md:text-base">{artwork.museum}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-amber-700 tracking-[0.3em] flex items-center gap-1">连接</span>
                  {artwork.source_url ? (
                    <a href={artwork.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors text-sm md:text-base underline tracking-wider uppercase font-bold flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4" /> 来源网站
                    </a>
                  ) : (
                    <span className="text-slate-400 text-sm md:text-base flex items-center gap-1.5"><ExternalLink className="w-4 h-4 opacity-50"/> 无档案来源</span>
                  )}
                </div>
              </div>

              {/* Interpretation */}
              <div className="prose prose-slate prose-lg md:prose-xl max-w-none font-serif text-slate-700 leading-relaxed prose-h3:mt-8 prose-h3:mb-4 prose-p:mb-6"
                    dangerouslySetInnerHTML={{ __html: artwork.ai_interpretation || '<p>记录遗失，目前暂无关于该画作的深度分析手稿...</p>' }} />

              {/* Additional Info / Footer */}
              <div className="mt-16 pt-10 border-t border-slate-200/60 flex flex-col sm:flex-row gap-10">
                {artwork.keywords && Array.isArray(artwork.keywords) && artwork.keywords.length > 0 && (
                  <div className="flex-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-4">艺术焦点</h3>
                    <div className="flex flex-wrap gap-2 pb-4">
                      {artwork.keywords.map((k: string) => (
                        <span key={k} className="px-3 py-1.5 bg-slate-100/50 border border-slate-200/60 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-default">
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="shrink-0 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">浏览次数</span>
                    <span className="text-sm font-serif italic text-slate-600 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/> {(artwork.views || 0).toLocaleString()} 次</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">收录时间</span>
                    <span className="text-sm font-serif italic text-slate-600">{formatDistanceToNow(new Date((artwork.created_at ? (artwork.created_at + (artwork.created_at.endsWith('Z') ? '' : 'Z')) : Date.now())), { addSuffix: true, locale: zhCN })}</span>
                  </div>
                </div>
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
            className="fixed inset-0 z-50 bg-[#faf9f6]/95 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 cursor-zoom-out"
            onClick={() => setIsZoomed(false)}
          >
            <button className="absolute top-6 right-6 lg:top-10 lg:right-10 bg-white/50 hover:bg-white text-slate-900 p-3 rounded-full transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>
               <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={artwork.image_url} 
              alt={artwork.title} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm border border-slate-200/50" 
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
