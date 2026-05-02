import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, Send, ArrowLeft, Brush, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion } from 'motion/react';

type Comment = {
  id: string;
  content: string;
  created_at: string;
};

export default function ArtworkDetail() {
  const { id } = useParams();
  const [artwork, setArtwork] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const resArt = await fetch(`/api/artworks/${id}`);
        if (!resArt.ok) throw new Error('Artwork not found');
        const item = await resArt.json();
        
        // Fetch comments if you have implemented the endpoint in Hono
        // For now we'll just handle the artwork
        setArtwork(item);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || submitting) return;
    setSubmitting(true);
    // Add comment logic here if needed
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-40 text-slate-500 animate-pulse font-serif uppercase tracking-[0.4em] text-xs font-bold">正在揭开名画真容...</div>;
  if (!artwork) return <div className="text-center py-40 text-slate-500 font-serif">档案中未找到该画作。</div>;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Immersive Image Header */}
      <section className="w-full bg-slate-950 flex items-center justify-center py-16 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 filter blur-3xl scale-125">
           <img src={artwork.image_url} alt="" className="w-full h-full object-cover" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 art-frame max-w-5xl"
        >
          <img 
            src={artwork.image_url} 
            alt={artwork.title} 
            className="max-h-[80vh] object-contain" 
            referrerPolicy="no-referrer" 
          />
        </motion.div>
      </section>

      <div className="max-w-4xl w-full px-6 py-20 pb-40 flex flex-col items-center">
        <Link to="/" className="group mb-16 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
          返回档案库
        </Link>
        
        <header className="w-full text-center mb-24">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
           >
             <h1 className="text-4xl md:text-7xl font-serif font-black text-slate-950 mb-10 leading-[1.1] tracking-tight">
               {artwork.title}
             </h1>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
             className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-y border-slate-100 py-8"
           >
             <div className="flex flex-col items-center gap-1">
               <span className="text-[9px] text-amber-700">艺术家</span>
               <span className="text-slate-700">{artwork.artist}</span>
             </div>
             <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>
             <div className="flex flex-col items-center gap-1">
               <span className="text-[9px] text-amber-700">创作年代</span>
               <span className="text-slate-700">{artwork.year}</span>
             </div>
             <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>
             <div className="flex flex-col items-center gap-1">
               <span className="text-[9px] text-amber-700">馆藏机构</span>
               <span className="text-slate-700">{artwork.museum}</span>
             </div>
           </motion.div>
        </header>

        <div className="w-full flex flex-col md:flex-row gap-16 relative">
          <aside className="w-full md:w-48 shrink-0 flex flex-col gap-10">
             <div className="flex flex-col gap-2">
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4">名画档案</span>
               <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">浏览次数</span>
                    <span className="text-sm font-serif italic text-slate-600">{artwork.views.toLocaleString()} 次欣赏</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">收录时间</span>
                    <span className="text-sm font-serif italic text-slate-600">{formatDistanceToNow(new Date(artwork.created_at), { addSuffix: true, locale: zhCN })}</span>
                  </div>
               </div>
             </div>

             {artwork.keywords && Array.isArray(artwork.keywords) && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4">艺术焦点</span>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {artwork.keywords.map((k: string) => (
                      <span key={k} className="text-[10px] font-bold text-slate-400 uppercase hover:text-amber-800 transition-colors cursor-default">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
             )}
          </aside>

          <div className="flex-1 min-w-0">
             <div className="relative mb-20 whitespace-pre-wrap">
               <div className="prose prose-slate prose-lg max-w-none font-serif" 
                 dangerouslySetInnerHTML={{ __html: artwork.ai_interpretation || '<p>正在整理策展人的深度手稿...</p>' }}
               />
             </div>

             <section className="mt-20 pt-16 border-t border-slate-100 italic">
               <p className="text-slate-400 text-sm font-serif">
                本品评由 AI 策展人基于 {artwork.museum} 的历史馆藏记录生成。
               </p>
             </section>
          </div>
        </div>
      </div>
    </div>
  );
}
