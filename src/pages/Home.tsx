import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, Brush, MapPin, Hash, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Artwork = {
  id: string;
  title: string;
  artist: string;
  year: string;
  museum: string;
  summary: string;
  created_at: string;
  views: number;
  keywords?: string[];
  image_url?: string;
};

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const limit = 12;

  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      setKeywords(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setKeywords([]);
    }
  };

  const fetchArtworks = async (currentPage: number, currentKeyword: string | null, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setIsFetchingMore(true);
      
      const offset = currentPage * limit;
      let url = `/api/artworks?limit=${limit}&offset=${offset}`;
      if (currentKeyword) {
        url += `&keyword=${encodeURIComponent(currentKeyword)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      const fetchedArtworks = Array.isArray(data) ? data : (data.data || []);
      
      if (fetchedArtworks.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (isLoadMore) {
        setArtworks(prev => [...prev, ...fetchedArtworks]);
      } else {
        setArtworks(fetchedArtworks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  useEffect(() => {
    fetchArtworks(page, selectedKeyword, page > 0);
  }, [page, selectedKeyword]);

  const handleKeywordClick = (k: string) => {
    if (selectedKeyword === k) {
      setSelectedKeyword(null);
    } else {
      setSelectedKeyword(k);
    }
    setPage(0);
    setHasMore(true);
  };

  const showHighlight = !selectedKeyword && page === 0 && artworks.length > 0;
  const highlight = showHighlight ? artworks[0] : null;
  const gridItems = showHighlight ? artworks.slice(1) : artworks;

  return (
    <div className="flex-1 flex flex-col pb-24 w-full">
      {/* Cinematic Hero Section */}
      <header className="relative w-full py-16 flex flex-col items-center justify-center overflow-hidden">
         {/* Subtle background texture or soft glow */}
         <div className="absolute inset-0 bg-gradient-to-b from-white to-[#faf9f6] z-0"></div>
         <div className="absolute inset-0 opacity-10 filter blur-3xl scale-125"></div>
         
         <div className="relative z-10 text-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="max-w-4xl mx-auto relative px-8 py-4"
            >
              <div className="absolute top-0 left-4 text-[6rem] md:text-[8rem] leading-none text-amber-900/5 font-serif select-none -translate-y-8 -translate-x-4 md:-translate-x-8">
                "
              </div>
              <div className="absolute bottom-12 right-4 text-[6rem] md:text-[8rem] leading-none text-amber-900/5 font-serif select-none translate-y-8 translate-x-4 md:translate-x-8">
                "
              </div>
              <p className="relative z-10 text-2xl md:text-3xl lg:text-4xl text-slate-700 font-serif mb-12 leading-relaxed italic tracking-wide">
                “每一位艺术家都将画笔浸入自己的灵魂，将自己的本性画入画中。”
              </p>
              <div className="flex items-center justify-center gap-6 opacity-70 relative z-10">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-slate-400"></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.5em]">经典杰作</span>
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-slate-400"></div>
              </div>
            </motion.div>
         </div>
      </header>

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Main Content Area */}
          <div className="flex-1 order-2 lg:order-1">
            {loading && artworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-12 h-12 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">正在打开艺术馆大门...</span>
              </div>
            ) : artworks.length === 0 ? (
              <div className="text-center py-24 bg-white border border-slate-100 rounded-2xl shadow-sm">
                 <div className="text-slate-300 mb-4 font-serif text-2xl italic">艺术馆目前空空如也</div>
                 <button onClick={() => { setSelectedKeyword(null); setPage(0); }} className="text-amber-800 text-xs font-bold uppercase tracking-widest border-b border-amber-800 pb-1">重置展览</button>
              </div>
            ) : (
              <>
                {highlight && (
                  <section className="mb-24">
                    <div className="flex items-center gap-6 mb-12">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white"></div>
                        ))}
                      </div>
                      <h2 className="text-xs font-bold text-slate-900 tracking-[0.3em] uppercase">今日推荐</h2>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    <Link to={`/artwork/${highlight.id}`} className="group block relative">
                      <div className="flex flex-col lg:flex-row items-stretch bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-100 group-hover:border-amber-200 transition-colors duration-500">
                        <div className="lg:w-3/5 relative overflow-hidden bg-slate-100 flex items-center justify-center p-8">
                           <img 
                             src={highlight.image_url} 
                             alt={highlight.title} 
                             className="relative z-10 max-h-[500px] object-contain shadow-2xl transition-transform duration-700 group-hover:scale-105" 
                             referrerPolicy="no-referrer" 
                           />
                        </div>
                        <div className="lg:w-2/5 p-12 lg:p-16 flex flex-col">
                           <span className="text-xs font-bold text-amber-700 uppercase tracking-[0.3em] mb-6">展览焦点</span>
                           <h3 className="text-3xl md:text-4xl font-serif font-black text-slate-950 mb-6 leading-tight group-hover:text-amber-900 transition-colors">
                             {highlight.title}
                           </h3>
                           <div className="flex items-center gap-3 text-slate-500 mb-10">
                             <div className="w-10 h-px bg-slate-300"></div>
                             <span className="text-sm font-medium">{highlight.artist}</span>
                           </div>
                           
                           <div className="mt-auto pt-10 border-t border-slate-100 flex items-center gap-8">
                             <div className="flex flex-col gap-1">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">馆藏机构</span>
                               <span className="text-sm font-bold text-slate-700">{highlight.museum}</span>
                             </div>
                             <div className="flex flex-col gap-1">
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">浏览量</span>
                               <span className="text-sm font-bold text-slate-700">{highlight.views}</span>
                             </div>
                           </div>
                        </div>
                      </div>
                    </Link>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-16">
                    <h2 className="text-2xl font-serif font-black text-slate-950 tracking-tight">
                      {selectedKeyword ? (
                        <span className="flex items-center gap-3">
                          <span className="text-slate-300 italic font-medium">主题 //</span> {selectedKeyword}
                        </span>
                      ) : "永恒档案"}
                    </h2>
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                       漫步于历史的长廊 <div className="w-12 h-px bg-slate-200"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                    {gridItems.map((item, idx) => (
                       <motion.div
                         key={item.id}
                         initial={{ opacity: 0, y: 20 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         viewport={{ once: true }}
                         transition={{ delay: idx % 3 * 0.1 }}
                       >
                         <Link to={`/artwork/${item.id}`} className="group flex flex-col">
                            <div className="art-frame aspect-[3/4] mb-8 overflow-hidden bg-slate-50">
                              <img 
                                src={item.image_url} 
                                alt={item.title} 
                                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
                                referrerPolicy="no-referrer" 
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                            </div>
                            <div className="flex flex-col px-1">
                               <h3 className="text-xl font-serif font-bold text-slate-900 mb-2 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2">
                                 {item.title}
                               </h3>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                 {item.artist} · {item.year}
                               </p>
                               <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-widest">
                                 <span>{item.museum}</span>
                                 <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                               </div>
                            </div>
                         </Link>
                       </motion.div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-32 text-center">
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={isFetchingMore}
                        className="group relative inline-flex items-center gap-4 px-10 py-5 bg-slate-950 text-white text-xs font-bold uppercase tracking-[0.4em] overflow-hidden"
                      >
                        <span className="relative z-10">{isFetchingMore ? '正在展开...' : '探索深度档案'}</span>
                        <div className="absolute inset-0 bg-amber-800 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          {/* New Interactive Sidebar/Filter */}
          <aside className="w-full lg:w-72 shrink-0 order-1 lg:order-2 lg:sticky lg:top-32">
             <div className="bg-white border border-slate-100 p-8 shadow-sm rounded-none">
                <div className="mb-8">
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                     <div className="w-2 h-2 bg-amber-600 rounded-full"></div> 艺术焦点
                   </h3>
                   <div className="flex flex-wrap gap-2">
                     {keywords.slice(0, 50).map(k => (
                       <button
                         key={k}
                         onClick={() => handleKeywordClick(k)}
                         className={`text-center text-xs font-bold py-1.5 px-3 rounded-full transition-all tracking-widest border ${
                           selectedKeyword === k 
                             ? 'border-amber-600 bg-amber-50 text-amber-900' 
                             : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:border-slate-300'
                         }`}
                       >
                         #{k}
                       </button>
                     ))}
                   </div>
                </div>
                
                {selectedKeyword && (
                  <button 
                    onClick={() => { setSelectedKeyword(null); setPage(0); }}
                    className="w-full py-4 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    清除筛选
                  </button>
                )}
             </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
