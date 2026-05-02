import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppWindow, Clock, Eye, Send, ArrowLeft, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Comment = {
  id: string;
  content: string;
  created_at: string;
};

export default function NewsDetail() {
  const { id } = useParams();
  const [news, setNews] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Record view
    fetch(`/api/news/${id}/view`, { method: 'POST' }).catch(console.error);

    const fetchAll = async () => {
      try {
        const resNews = await fetch(`/api/news/${id}`);
        if (!resNews.ok) {
          throw new Error('News not found');
        }
        const item = await resNews.json();
        
        const resComments = await fetch(`/api/news/${id}/comments`);
        const dataComments = await resComments.json();
        
        setNews(item);
        setComments(Array.isArray(dataComments) ? dataComments : []);
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
    try {
      await fetch(`/api/news/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentInput })
      });
      setCommentInput('');
      const resComments = await fetch(`/api/news/${id}/comments`);
      const dataComments = await resComments.json();
      setComments(Array.isArray(dataComments) ? dataComments : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">加载中...</div>;
  if (!news) return <div className="text-center py-20 text-slate-500">未找到该新闻。</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回新闻列表
      </Link>
      
      <article className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          <span className="text-blue-500">来源: {news.source}</span>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(new Date(news.published_at), { addSuffix: true, locale: zhCN })}
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1 text-slate-500">
            <Eye className="w-3.5 h-3.5" />
            {(news.views || 0) + 1} 阅读量
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
          {news.title}
        </h1>

        {news.image_url && (
          <div className="w-full h-auto max-h-[400px] overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center">
            <img src={news.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="prose prose-slate max-w-none text-[15px] text-slate-700 leading-relaxed bg-amber-50 p-6 rounded-lg border border-amber-100">
          <h3 className="text-sm font-bold text-amber-800 mb-2">AI 摘要</h3>
          {news.summary}
        </div>

        {news.content && (
          <div className="prose prose-slate max-w-none text-[15px] text-slate-800 leading-relaxed mt-8" dangerouslySetInnerHTML={{ __html: news.content }}>
          </div>
        )}

        <div className="pt-2">
          <a 
            href={news.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            阅读原文 <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </article>

      <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            评论区 <span className="bg-slate-100 px-2 rounded-full text-slate-600 text-xs py-0.5">{comments.length}</span>
          </h3>
        </div>

        <form onSubmit={submitComment} className="relative">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="分享您的看法（匿名发表）..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-sans"
            rows={2}
            required
            disabled={submitting}
          />
          <button 
            type="submit" 
            disabled={submitting}
            className="absolute right-2.5 bottom-2.5 p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {comments.map(c => (
            <div key={c.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-slate-700 text-[14px] leading-relaxed break-words">{c.content}</p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>[ 匿名用户 ]</span>
                <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: zhCN })}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4 italic">暂无评论。</p>
          )}
        </div>
      </section>
    </div>
  );
}
