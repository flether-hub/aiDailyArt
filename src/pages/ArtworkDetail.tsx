import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion } from 'motion/react';

export default function ArtworkDetail() {
  const { id } = useParams();
  const [artwork, setArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-center py-40 text-slate-500 animate-pulse font-serif uppercase tracking-[0.4em] text-xs font-bold">正在揭开名画真容...</div>;
  if (!artwork) return <div className="text-center py-40 text-slate-500 font-serif">档案中未找到该画作。</div>;

  return (
    <div className="w-full min-h-screen bg-[#faf9f6] flex justify-center py-12 px-6 md:px-12 lg:px-16 pb-32">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-12 lg:gap-20">

        {/* Left Column - Image */}
        <div className="w-full lg:w-5/12 xl:w-1/2 flex flex-col lg:sticky lg:top-12 self-start">
          <Link to="/" className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            返回档案库
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <div className="art-frame bg-white overflow-hidden p-3 shadow-sm border border-slate-200/60">
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="w-full h-auto max-h-[85vh] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>

        {/* Right Column - Interpretation */}
        <div className="w-full lg:w-7/12 xl:w-1/2 flex flex-col pt-0 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-slate-950 mb-8 leading-[1.15] tracking-tight">
              {artwork.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-12 py-6 border-y border-slate-200/60">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-amber-700 tracking-[0.3em]">艺术家</span>
                <span className="text-slate-900 text-xs">{artwork.artist}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-amber-700 tracking-[0.3em]">创作年代</span>
                <span className="text-slate-900 text-xs">{artwork.year}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-amber-700 tracking-[0.3em]">馆藏机构</span>
                <span className="text-slate-900 text-xs">{artwork.museum}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-amber-700 tracking-[0.3em]">连接</span>
                {artwork.source_url ? (
                  <a href={artwork.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors text-[10px] underline tracking-wider uppercase font-bold flex items-center gap-1">
                    来源网站
                  </a>
                ) : (
                  <span className="text-slate-400 text-[10px]">无档案来源</span>
                )}
              </div>
            </div>

            <div className="prose prose-slate prose-lg md:prose-xl max-w-none font-serif text-slate-700 leading-loose prose-h3:mt-8 prose-h3:mb-4 prose-p:mb-6"
                 dangerouslySetInnerHTML={{ __html: artwork.ai_interpretation || '<p>记录遗失，目前暂无关于该画作的深度分析手稿...</p>' }} />

            {/* Additional Info / Footer */}
            <div className="mt-16 pt-10 border-t border-slate-200/60 flex flex-col sm:flex-row gap-10">
              {artwork.keywords && Array.isArray(artwork.keywords) && artwork.keywords.length > 0 && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-4">艺术焦点</h3>
                  <div className="flex flex-wrap gap-2">
                    {artwork.keywords.map((k: string) => (
                      <span key={k} className="px-3 py-1.5 bg-slate-100/50 border border-slate-200/60 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-default">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="shrink-0 flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">浏览次数</span>
                  <span className="text-sm font-serif italic text-slate-600 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/> {artwork.views.toLocaleString()} 次</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">收录时间</span>
                  <span className="text-sm font-serif italic text-slate-600">{formatDistanceToNow(new Date(artwork.created_at), { addSuffix: true, locale: zhCN })}</span>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
