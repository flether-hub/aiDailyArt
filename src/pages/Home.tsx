import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Eye, Brush, MapPin, Hash, ChevronDown, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

import { extractFirstSubheading } from "../lib/artUtils";
import { useAuth } from "../AuthContext";

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
  ai_interpretation?: string;
};

export default function Home() {
  const { isAdmin } = useAuth();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(() => sessionStorage.getItem("artworksKeyword") || null);
  const [popularArtworks, setPopularArtworks] = useState<Artwork[]>([]);
  const [showMorePopular, setShowMorePopular] = useState(false);
  const [page, setPage] = useState(() => Number(sessionStorage.getItem("artworksPage")) || 0);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const [sortMode, setSortMode] = useState<string>(
    localStorage.getItem("artworksSort") || "latest",
  );
  const [latestArtwork, setLatestArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    localStorage.setItem("artworksSort", sortMode);
  }, [sortMode]);

  useEffect(() => {
    sessionStorage.setItem("artworksPage", page.toString());
  }, [page]);

  useEffect(() => {
    if (selectedKeyword) sessionStorage.setItem("artworksKeyword", selectedKeyword);
    else sessionStorage.removeItem("artworksKeyword");
  }, [selectedKeyword]);

  const fetchLatestArtwork = async () => {
    try {
      const res = await fetch("/api/artworks?limit=1&sort=latest");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data || [];
        if (items.length > 0) {
          setLatestArtwork(items[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getPageInfo = (p: number) => {
    if (p === 0) return { limit: 13, offset: 0 };
    return { limit: 12, offset: 13 + (p - 1) * 12 };
  };

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/keywords");
      const data = await res.json();
      setKeywords(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setKeywords([]);
    }
  };

  const fetchArtworks = async (
    currentPage: number,
    currentKeyword: string | null,
    currentSortMode: string,
    signal?: AbortSignal,
  ) => {
    try {
      setLoading(true);

      const { limit, offset } = getPageInfo(currentPage);
      let url = `/api/artworks?limit=${limit}&offset=${offset}&sort=${currentSortMode}`;
      if (currentKeyword) {
        url += `&keyword=${encodeURIComponent(currentKeyword)}`;
      }

      const res = await fetch(url, { signal });
      const data = await res.json();
      const fetchedArtworks = Array.isArray(data) ? data : data.data || [];

      if (data.total !== undefined) {
        setTotalArtworks(data.total);
      }

      setArtworks(fetchedArtworks);
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularArtworks = async () => {
    try {
      const res = await fetch("/api/artworks?limit=10&sort=views");
      if (res.ok) {
        const data = await res.json();
        setPopularArtworks(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    document.title = "每日艺术画廊 - 人工智能策展赏析";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "探索永恒经典与人工智能的碰撞，本馆致力于通过尖端 AI 技术重新发现世界艺术遗产，每日为您呈现跨越时空的艺术盛宴。",
      );
    }

    fetchKeywords();
    fetchPopularArtworks();
    fetchLatestArtwork();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchArtworks(page, selectedKeyword, sortMode, ac.signal);
    return () => ac.abort();
  }, [page, selectedKeyword, sortMode]);

  const handleKeywordClick = (k: string) => {
    if (selectedKeyword === k) {
      setSelectedKeyword(null);
    } else {
      setSelectedKeyword(k);
    }
    setPage(0);
  };

  const showHighlight =
    !selectedKeyword && page === 0 && latestArtwork !== null;
  const highlight = showHighlight ? latestArtwork : null;
  const gridItems = showHighlight
    ? artworks.filter((a) => a.id !== highlight?.id).slice(0, 12)
    : artworks;

  return (
    <div className="flex-1 flex flex-col pb-24 w-full overflow-x-hidden">
      {/* Cinematic Hero Section */}
      <header className="relative w-full min-h-[280px] md:min-h-[350px] flex flex-col items-center justify-center overflow-hidden">
        {/* Artistic background blending */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-slate-900">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{
              backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg")`,
            }}
          ></div>

          {/* Dark overlay to ensure white text is readable while keeping colors rich */}
          <div className="absolute inset-0 bg-[#0a192f]/50"></div>

          {/* Edge fade to seamlessly blend into the `#faf9f6` background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6]/95 to-transparent"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-12 -translate-y-4 md:-translate-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1.2 }}
            className="relative px-4 py-8"
          >
            <div className="absolute -top-6 -left-4 md:-left-12 text-[8rem] md:text-[12rem] leading-none text-white/5 font-serif select-none pointer-events-none">
              "
            </div>

            <p className="relative z-10 text-2xl md:text-3xl lg:text-4xl text-white font-serif mb-8 leading-[1.6] md:leading-[1.8] italic tracking-widest drop-shadow-lg shadow-black/50">
              “每一位艺术家都将画笔浸入自己的灵魂，
              <br className="hidden md:block" />
              将自己的本性画入画中。”
            </p>

            <div className="flex items-center justify-center gap-4 md:gap-6 opacity-80 relative z-10">
              <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent to-amber-200"></div>
              <span className="text-[10px] md:text-xs font-black text-amber-100 uppercase tracking-[0.4em] md:tracking-[0.5em] shadow-black drop-shadow-md">
                Henry Ward Beecher
              </span>
              <div className="h-px w-16 md:w-32 bg-gradient-to-l from-transparent to-amber-200"></div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-16 items-start min-w-0 w-full">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 w-full order-1 lg:order-1">
            {loading && artworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-12 h-12 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  正在打开艺术馆大门...
                </span>
              </div>
            ) : artworks.length === 0 ? (
              <div className="text-center py-24 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="text-slate-300 mb-4 font-serif text-2xl italic">
                  艺术馆目前空空如也
                </div>
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setSelectedKeyword(null);
                      setPage(0);
                    }}
                    className="text-amber-800 text-xs font-bold uppercase tracking-widest border-b border-amber-800 pb-1"
                  >
                    重置展览
                  </button>
                ) : (
                  <p className="text-slate-400 text-sm">请稍后再来</p>
                )}
              </div>
            ) : (
              <>
                {highlight && (
                  <section className="mb-24">
                    <div className="flex items-center gap-4 mb-12 opacity-80">
                      <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-700/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-700/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-700/20"></div>
                      </div>
                      <h2 className="text-xl font-bold tracking-[0.4em] uppercase brush-header">
                        今日推荐
                      </h2>
                      <div className="h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent flex-1 ml-2"></div>
                    </div>

                    <Link
                      to={`/artwork/${highlight.id}`}
                      className="group block relative"
                    >
                      <div className="flex flex-col lg:flex-row items-stretch bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-100 group-hover:border-amber-200 transition-colors duration-500 min-w-0">
                        <div className="lg:w-3/5 min-w-0 relative overflow-hidden bg-slate-100 flex items-center justify-center p-4 md:p-8">
                          <img
                            src={highlight.image_url}
                            alt={highlight.title}
                            className="relative z-10 w-full max-h-[400px] md:max-h-[500px] object-contain shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="lg:w-2/5 p-12 lg:p-16 flex flex-col">
                          <h3 className="text-xl md:text-2xl font-serif font-black text-slate-950 mb-6 leading-tight group-hover:text-amber-900 transition-colors">
                            {highlight.title}
                          </h3>
                          <div className="flex items-center gap-3 text-slate-500 mb-6">
                            <div className="w-10 h-px bg-slate-300"></div>
                            <span className="text-sm font-medium">
                              {highlight.artist}
                            </span>
                          </div>

                          {(() => {
                            const subheading = extractFirstSubheading(
                              highlight.ai_interpretation,
                            );
                            if (!subheading) return null;
                            return (
                              <div className="mb-10 animate-fade-in">
                                <p className="text-lg md:text-xl font-serif italic text-slate-700 leading-snug">
                                  “{subheading}”
                                </p>
                              </div>
                            );
                          })()}

                          <div className="mt-auto pt-10 border-t border-slate-100 flex items-start gap-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                馆藏机构
                              </span>
                              <span className="text-slate-700 text-[11px] md:text-xs font-bold leading-relaxed">
                                {highlight.museum}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0 ml-auto">
                              <span className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed whitespace-nowrap">
                                浏览次数
                              </span>
                              <span className="text-slate-700 text-[11px] md:text-xs font-bold leading-relaxed">
                                {highlight.views}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </section>
                )}

                <section>
                  <div className="flex flex-row items-center justify-between mb-12 sm:mb-16 gap-4 w-full">
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-950 tracking-tight shrink-0">
                      {selectedKeyword ? (
                        <span className="flex items-center gap-3">
                          <span className="text-slate-300 italic font-medium hidden sm:inline">
                            主题 //
                          </span>{" "}
                          {selectedKeyword}
                        </span>
                      ) : (
                        "永恒档案"
                      )}
                    </h2>

                    <div className="flex-1 h-px bg-slate-200/80 hidden md:block mx-4"></div>

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest shrink-0">
                      <div className="relative flex items-center bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white px-3 py-1.5 rounded-md transition-colors shadow-sm cursor-pointer">
                        <select
                          value={sortMode}
                          onChange={(e) => {
                            setSortMode(e.target.value);
                            setPage(0);
                          }}
                          className="bg-transparent border-none text-slate-600 font-bold focus:ring-0 cursor-pointer appearance-none outline-none pr-6 relative z-10 text-sm w-full"
                        >
                          <option value="latest">最新收录 (默认)</option>
                          <option value="oldest">拾遗溯源 (最早入库)</option>
                          <option value="views_desc">
                            热门瞩目 (浏览最多)
                          </option>
                          <option value="views_asc">静谧风光 (浏览最少)</option>
                          <option value="comments_desc">
                            热议交流 (探讨最多)
                          </option>
                          <option value="comments_asc">
                            静待解读 (探讨最少)
                          </option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                    {gridItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        className="min-w-0"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (idx % 3) * 0.1 }}
                      >
                        <Link
                          to={`/artwork/${item.id}`}
                          className="group flex flex-col min-w-0"
                        >
                          <div className="art-frame mb-8 overflow-hidden bg-white relative flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] aspect-square md:aspect-[5/6]">
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="block w-full max-w-[90%] max-h-[90%] object-contain grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                const parent = e.currentTarget.parentElement;
                                e.currentTarget.className = "hidden";
                                if (parent) {
                                  const placeholder =
                                    document.createElement("div");
                                  placeholder.className =
                                    "flex flex-col items-center justify-center h-full bg-slate-100 text-slate-300";
                                  placeholder.innerHTML =
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><p class="text-[8px] uppercase tracking-widest font-bold">画作暂无法显示</p>';
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors pointer-events-none"></div>
                          </div>
                          <div className="flex flex-col px-1">
                            <h3 className="text-xl font-serif font-bold text-slate-900 mb-2 group-hover:text-amber-800 transition-colors leading-snug line-clamp-2 h-14 flex items-start">
                              {item.title}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 truncate">
                              {item.artist} ·{" "}
                              {item.year
                                ? item.year.toString().substring(0, 4)
                                : "年代未知"}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-widest">
                              <span className="truncate mr-4">
                                {item.museum}
                              </span>
                              <span className="flex items-center gap-1 shrink-0">
                                <Eye className="w-3 h-3" /> {item.views}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {totalArtworks > 0 && (
                    <div className="mt-20 flex justify-center items-center">
                      <div className="flex items-center gap-2 bg-white px-2 py-2 rounded-full border border-slate-200 shadow-sm">
                        <button
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                          ‹
                        </button>

                        <div className="flex items-center gap-1 px-4">
                          {(() => {
                            const pageCount =
                              totalArtworks <= 13
                                ? 1
                                : 1 + Math.ceil((totalArtworks - 13) / 12);
                            if (pageCount === 0) return null;
                            let startPage = Math.max(0, page - 2);
                            let endPage = Math.min(pageCount - 1, page + 2);
                            if (endPage - startPage < 4) {
                              if (startPage === 0) {
                                endPage = Math.min(
                                  pageCount - 1,
                                  startPage + 4,
                                );
                              } else {
                                startPage = Math.max(0, endPage - 4);
                              }
                            }
                            return Array.from(
                              { length: endPage - startPage + 1 },
                              (_, i) => startPage + i,
                            ).map((pageNum) => (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${page === pageNum ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
                              >
                                {pageNum + 1}
                              </button>
                            ));
                          })()}
                        </div>

                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={(() => {
                            const { limit, offset } = getPageInfo(page);
                            return offset + limit >= totalArtworks;
                          })()}
                          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          {/* New Interactive Sidebar/Filter */}
          <aside className="w-full lg:w-72 shrink-0 order-2 lg:order-2 lg:sticky lg:top-32 flex flex-col gap-12">
            {popularArtworks.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-12 opacity-80">
                  <div className="flex gap-2 hidden lg:flex">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-700/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-700/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-700/20"></div>
                  </div>
                  <h2 className="text-xl font-bold tracking-[0.4em] uppercase brush-header">
                    最受欢迎
                  </h2>
                  <div className="h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent flex-1 ml-2"></div>
                </div>

                <div className="bg-white border border-slate-100 p-6 shadow-sm rounded-none">
                  <div className="flex flex-col gap-4">
                    {popularArtworks
                      .slice(0, showMorePopular ? 10 : 5)
                      .map((art, index) => (
                        <Link
                          to={`/artwork/${art.id}`}
                          key={art.id}
                          className="group flex gap-4 items-center"
                        >
                          <span className="text-xl font-serif italic text-slate-300 font-bold w-6 text-center">
                            {index + 1}
                          </span>
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0 relative">
                            <img
                              src={art.image_url}
                              alt={art.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-800 truncate font-serif">
                              {art.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500 truncate">
                                {art.artist}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-red-500/80 font-mono ml-auto shrink-0 bg-red-50 px-1.5 py-0.5 rounded-md">
                                <Eye className="w-3 h-3" /> {art.views}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    {!showMorePopular && popularArtworks.length > 5 && (
                      <button
                        onClick={() => setShowMorePopular(true)}
                        className="w-full py-3 mt-2 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                      >
                        显示更多 <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-4 mb-12 opacity-80">
                <div className="flex gap-2 hidden lg:flex">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-700/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-700/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-700/20"></div>
                </div>
                <h2 className="text-xl font-bold tracking-[0.4em] uppercase brush-header">
                  艺术焦点
                </h2>
                <div className="h-px bg-gradient-to-r from-slate-300 via-slate-200 to-transparent flex-1 ml-2"></div>
              </div>

              <div className="bg-white border border-slate-100 p-8 shadow-sm rounded-none">
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2">
                    {keywords.slice(0, 20).map((k) => (
                      <button
                        key={k}
                        onClick={() => handleKeywordClick(k)}
                        className={`text-center text-xs font-bold py-1.5 px-3 rounded-full transition-all tracking-widest border ${
                          selectedKeyword === k
                            ? "border-amber-600 bg-amber-50 text-amber-900"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                        }`}
                      >
                        #{k}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedKeyword && (
                  <button
                    onClick={() => {
                      setSelectedKeyword(null);
                      setPage(0);
                    }}
                    className="w-full py-4 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
