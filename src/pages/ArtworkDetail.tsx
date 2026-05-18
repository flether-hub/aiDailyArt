import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, ZoomIn, X, ExternalLink, ChevronDown, MessageSquare, Trash2, CheckCircle, Circle, Send, Home, Quote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';
import { extractFirstSubheading, cleanInterpretation, getProxiedImageUrl } from '../lib/artUtils';
import { maskIP } from '../lib/ipUtils';
import { useAuth } from '../AuthContext';

export default function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [artwork, setArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1.5);
  const [initialDist, setInitialDist] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1.5);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.002;
    setScale(prev => {
      const newScale = prev + delta;
      return Math.min(Math.max(newScale, 1), 3);
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialDist(dist);
      setInitialScale(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDist !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = dist / initialDist;
      setScale(Math.min(Math.max(initialScale * ratio, 1), 3));
    }
  };

  const handleTouchEnd = () => {
    setInitialDist(null);
  };
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [errorModalMsg, setErrorModalMsg] = useState('');
  
  // Custom Delete Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'bulk' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [similarArtworks, setSimilarArtworks] = useState<any[]>([]);
  const [showMoreSimilar, setShowMoreSimilar] = useState(false);

  const santizeHtml = (html: string) => {
    return { __html: DOMPurify.sanitize(html) };
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments/${id}`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } else {
        const text = await res.text();
        console.warn('Comments API did not return JSON. Status:', res.status, 'Body snippet:', text.substring(0, 100));
      }
    } catch (e) {
      console.error('Failed to fetch comments', e);
    }
  };

  const fetchSimilar = async () => {
    try {
      const res = await fetch(`/api/artworks/${id}/similar`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setSimilarArtworks(data.data || []);
      } else {
        const text = await res.text();
        console.warn('Similar API did not return JSON. Status:', res.status, 'Body snippet:', text.substring(0, 100));
      }
    } catch (e) {
      console.error('Failed to fetch similar artworks', e);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const resArt = await fetch(`/api/artworks/${id}`);
        if (!resArt.ok) throw new Error('Artwork not found');
        const item = await resArt.json();
        setArtwork(item);
        
        // Update SEO metadata
        document.title = `${item.title_zh || item.title} - 每日艺术画廊`;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          const intro = item.summary || item.title_zh || item.title;
          metaDescription.setAttribute("content", intro.length > 150 ? intro.substring(0, 150) + "..." : intro);
        }

        // Fetch comments and similar in parallel
        fetchComments();
        fetchSimilar();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    
    // Cleanup to default
    return () => {
      document.title = "每日艺术画廊 - 人工智能策展赏析";
    };
  }, [id]);

  useEffect(() => {
    if (isZoomed) {
      setScale(1.5);
    }
  }, [isZoomed]);

  const GuessYouLikeSection = () => {
    if (similarArtworks.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-12 opacity-80">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-700/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-700/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-700/20"></div>
          </div>
          <h2 className="text-xl font-bold tracking-[0.4em] uppercase brush-header whitespace-nowrap">
            猜你喜欢
          </h2>
          <div className="h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent flex-1 ml-2"></div>
        </div>

        <div className="bg-white border border-slate-100 p-6 shadow-sm rounded-none">
          <div className="flex flex-col gap-6">
            {similarArtworks.slice(0, showMoreSimilar ? 7 : 3).map((art, index) => (
              <Link
                to={`/artwork/${art.id}`}
                key={art.id}
                className="group flex gap-4 items-center"
              >
                <span className="text-xl font-serif italic text-slate-300 font-bold w-6 text-center shrink-0">
                  {index + 1}
                </span>
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 shrink-0 relative bg-slate-50 flex items-center justify-center">
                  <img
                    src={getProxiedImageUrl(art.image_url)}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate font-serif mb-1 group-hover:text-amber-800 transition-colors">
                    {art.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 truncate">
                      {art.artist}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-red-500/80 font-mono ml-auto shrink-0 bg-red-50 px-1.5 py-0.5 rounded-md">
                      <Eye className="w-3 h-3" /> {art.views}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {!showMoreSimilar && similarArtworks.length > 3 && (
              <button
                onClick={() => setShowMoreSimilar(true)}
                className="w-full py-3 mt-2 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
              >
                显示更多 <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        setNewComment('');
        await fetchComments();
      } else {
        const errorData = await res.json().catch(() => null);
        if (errorData?.error) {
          setErrorModalMsg(errorData.error);
        } else {
          setErrorModalMsg("发布评论失败，请稍后再试。");
        }
      }
    } catch (e) {
      console.error('Failed to post comment', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeleteMode('single');
    setTargetId(commentId);
    setShowConfirmModal(true);
  };

  const handleBulkDelete = async () => {
    if (selectedComments.size === 0) return;
    setDeleteMode('bulk');
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem('admin_token');
    
    try {
      if (deleteMode === 'single' && targetId) {
        const res = await fetch(`/api/admin/comments/${targetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setComments(prev => prev.filter(c => c.id !== targetId));
          setSelectedComments(prev => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
          });
        }
      } else if (deleteMode === 'bulk') {
        const res = await fetch('/api/admin/comments/bulk-delete', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ ids: Array.from(selectedComments) })
        });
        if (res.ok) {
          const deletedIds = new Set(selectedComments);
          setComments(prev => prev.filter(c => !deletedIds.has(c.id)));
          setSelectedComments(new Set());
        }
      }
    } catch (e) {
      console.error('Action failed', e);
    } finally {
      setShowConfirmModal(false);
      setDeleteMode(null);
      setTargetId(null);
    }
  };

  const toggleSelect = (commentId: string) => {
    setSelectedComments(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedComments.size === comments.length && comments.length > 0) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(comments.map(c => c.id)));
    }
  };

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
      {/* Error Modal */}
      {createPortal(
        <AnimatePresence>
          {!!errorModalMsg && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setErrorModalMsg('')}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative z-10 border border-slate-100"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <X className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-2">发布未能成功</h3>
                <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
                  {errorModalMsg}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setErrorModalMsg('')}
                    className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
                  >
                    我知道了
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirmModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative z-10 border border-slate-100"
              >
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认删除操作</h3>
                <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
                  {deleteMode === 'single' ? '此操作将永久删除该条艺术谈评论，无法撤销。' : `此操作将永久删除选中的 ${selectedComments.size} 条艺术谈评论，无法撤销。`}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
                  >
                    确认删除
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="w-full min-h-screen bg-[#faf9f6] flex py-8 sm:py-12 px-4 sm:px-8 md:px-12 lg:px-16 pb-32">
        <div className="w-full max-w-[1280px] mx-auto">
          <div className="flex items-center justify-between gap-4 md:gap-8 mb-12">
            <Link 
              to="/" 
              onClick={(e) => {
                e.preventDefault();
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="group inline-flex items-center gap-2 text-sm md:text-lg font-bold tracking-widest text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>返回档案库</span>
            </Link>

            <div className="flex-1 hidden sm:flex items-center justify-center opacity-40 px-6">
              <svg className="w-full text-slate-300" height="12" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0 6 L 100 6" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
                <circle cx="50" cy="6" r="3" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke"/>
                <circle cx="50" cy="6" r="1.5" fill="currentColor" />
              </svg>
            </div>

            <Link 
              to="/" 
              onClick={() => {
                sessionStorage.removeItem("artworksPage"); 
                sessionStorage.removeItem("artworksKeyword");
              }}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-full text-xs md:text-sm font-bold tracking-widest text-slate-600 hover:text-amber-800 hover:border-amber-200 transition-all hover:shadow-md shrink-0"
              title="返回画廊首页"
            >
              <Home className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-amber-700 transition-colors" />
              <span className="hidden sm:inline">返回画廊首页</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16"
          >
            {/* Left Column: Image (Sticky) */}
            <div className="lg:col-span-5 xl:col-span-6 min-w-0">
              <div className="sticky top-28 cursor-zoom-in group relative">
                <div 
                  className="art-frame bg-white overflow-hidden p-3 shadow-md border border-slate-200/60 relative block group-hover:shadow-xl transition-shadow duration-300 sm:min-h-[300px] flex items-center justify-center"
                  onClick={() => setIsZoomed(true)}
                >
                  <img
                    src={getProxiedImageUrl(artwork.image_url)}
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
                <div className="hidden lg:block mt-12">
                  <GuessYouLikeSection />
                </div>
              </div>
            </div>

            {/* Right Column: Details & Content */}
            <div className="lg:col-span-7 xl:col-span-6">
              {/* Title & Metadata */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-black text-slate-950 mb-4 leading-tight tracking-tight">
                {artwork.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-1 text-xs md:text-sm font-bold uppercase tracking-widest mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tracking-[0.2em]">艺术家:</span>
                  <span className="text-slate-800">{artwork.artist}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tracking-[0.2em]">年代:</span>
                  <span className="text-slate-800">{artwork.year ? artwork.year.toString().substring(0, 4) : '年代未知'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tracking-[0.2em]">浏览:</span>
                  <span className="text-slate-800 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {(artwork.views || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {(() => {
                const subheading = extractFirstSubheading(artwork.ai_interpretation);
                if (!subheading) return null;
                return (
                  <div className="mb-8 p-6 bg-amber-50/60 border-l-[3px] border-amber-900/30 rounded-r-sm animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-900/20 to-transparent"></div>
                    <h2 className="text-lg md:text-xl font-serif italic text-slate-900 leading-snug tracking-tight">
                      “{subheading}”
                    </h2>
                  </div>
                );
              })()}

              {/* Interpretation */}
              <div className="prose prose-slate prose-lg max-w-none font-serif text-slate-700 leading-relaxed mb-3"
                    dangerouslySetInnerHTML={santizeHtml(cleanInterpretation(artwork.ai_interpretation) || '<p>记录遗失，目前暂无关于该画作的深度分析手稿...</p>')} />

              {/* Additional Info / Footer */}
              <div className="mt-0 pt-4 border-t border-slate-200/60 ">
                {/* Meta Row - Wrapped to prevent scrollbar */}
                <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
                  
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

                  {/* Created At col */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] h-5 flex items-center whitespace-nowrap">收录时间</span>
                    <span className="text-[11px] md:text-xs text-slate-800 font-bold leading-relaxed whitespace-nowrap">
                      {artwork.created_at ? (() => {
                        try {
                          const dateStr = artwork.created_at.endsWith('Z') ? artwork.created_at : `${artwork.created_at}Z`;
                          return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
                        } catch (e) {
                          return '刚刚';
                        }
                      })() : '时间未知'}
                    </span>
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

          <div className="lg:hidden mt-20 pt-16 border-t border-slate-200">
            <GuessYouLikeSection />
          </div>

          {/* Comment Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 border-t border-slate-200 pt-16 w-full"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-black text-slate-900">艺术谈 (评论)</h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold">{comments.length}</span>
              </div>

              {isAdmin && comments.length > 0 && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                  >
                    {selectedComments.size === comments.length ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    全选
                  </button>
                  <AnimatePresence>
                    {selectedComments.size > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        批量删除 ({selectedComments.size})
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-12 bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm">
              <div className="flex flex-col gap-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="在此处留下你对这幅名画的见解或感受..."
                  className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition-all font-serif resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                    文明交流，传递艺术之美 (最多1000字)
                  </span>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold whitespace-nowrap hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmitting ? '正在发布...' : (
                      <>
                        <Send className="w-4 h-4" />
                        发布评论
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <motion.div
                      layout
                      key={comment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group relative p-6 rounded-xl border transition-all duration-300 ${
                        selectedComments.has(comment.id) 
                        ? 'bg-amber-50/50 border-amber-200/50 ring-1 ring-amber-200/50' 
                        : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {isAdmin && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toggleSelect(comment.id)}
                        >
                          {selectedComments.has(comment.id) ? (
                            <CheckCircle className="w-5 h-5 text-amber-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      )}

                      <div className={`${isAdmin ? 'pl-6' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 tracking-wide">{maskIP(comment.ip_address)}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-medium">{comment.location}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {formatDistanceToNow(new Date(comment.created_at.endsWith('Z') ? comment.created_at : `${comment.created_at}Z`), { addSuffix: true, locale: zhCN })}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                              title="删除此条"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 font-serif leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-serif italic">暂无评论，虚位以待你的真知灼见</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox / Zoom Overlay */}
      {createPortal(
        <AnimatePresence>
          {isZoomed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[120] bg-[#faf9f6]/95 backdrop-blur-sm flex items-center justify-center overflow-hidden cursor-zoom-out"
              onClick={() => setIsZoomed(false)}
            >
              <button 
                className="absolute top-4 right-4 lg:top-8 lg:right-8 bg-white/80 hover:bg-white text-slate-900 z-[100] p-3 rounded-full transition-all shadow-md border border-slate-200" 
                onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
                title="关闭"
              >
                 <X className="w-6 md:w-8 h-6 md:h-8" />
              </button>
              <motion.div 
                className="w-full h-full flex items-center justify-center"
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <motion.img 
                  drag
                  dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                  initial={{ scale: 0.95 }}
                  animate={{ scale }}
                  exit={{ scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300, scale: { duration: 0.1 } }}
                  src={getProxiedImageUrl(artwork.image_url)} 
                  alt={artwork.title} 
                  className="max-w-[80vw] max-h-[80vh] object-contain shadow-2xl rounded-sm border border-slate-200/50 cursor-grab active:cursor-grabbing relative z-10" 
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
