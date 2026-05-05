import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  Settings2,
  RefreshCw,
  BarChart3,
  Library,
  Eye,
  Palette,
  Save,
  Info,
  Trash2,
  MessageSquare,
  CheckSquare,
} from "lucide-react";

export default function AdminDashboard() {
  const { isAdmin, isLoadingAuth, token, logout } = useAuth();
  const [fetchingWorks, setFetchingWorks] = useState(false);
  const [fetchingProgress, setFetchingProgress] = useState<{
    message: string;
    error?: string;
  } | null>(null);
  const [reinterpretingId, setReinterpretingId] = useState<string | null>(null);
  const [reinterpretMessages, setReinterpretMessages] = useState<
    Record<string, string>
  >({});
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>({});
  const [artworks, setArtworks] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const [activeTab, setActiveTab] = useState<'artworks' | 'comments'>('artworks');
  const [allComments, setAllComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [bannedIps, setBannedIps] = useState<string[]>([]);

  const fetchBannedIps = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch("/api/admin/banned-ips", { headers });
      const data = await res.json();
      setBannedIps(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const toggleBanIp = async (ip: string) => {
    if (!token) return;
    try {
      const isBanned = bannedIps.includes(ip);
      const url = `/api/admin/banned-ips${isBanned ? `/${ip}` : ''}`;
      const method = isBanned ? 'DELETE' : 'POST';
      const body = isBanned ? undefined : JSON.stringify({ ip_address: ip });
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body
      });
      
      if (res.ok) {
        if (isBanned) {
          setBannedIps(prev => prev.filter(i => i !== ip));
        } else {
          setBannedIps(prev => [...prev, ip]);
        }
      }
    } catch (e) {}
  };
  const limit = 12;

  const fetchJobStatus = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch("/api/admin/job-status", { headers });
      const data = await res.json();
      if (data.status === "running") {
        setFetchingWorks(true);
        setFetchingProgress({
          message: data.message,
          error: data.error ? "预警" : undefined,
        });
      } else if (fetchingWorks && data.status === "idle") {
        // Job just finished while we were polling or just loaded
        setFetchingWorks(false);
        setFetchingProgress({ message: data.message, error: data.error ? "已中止" : undefined });
        fetchAdminArtworks(page);
        setTimeout(() => setFetchingProgress(null), 5000);
      } else if (!fetchingWorks && data.status === "idle" && data.message && data.message.includes('圆满完成')) {
          // If we just loaded and there's a recent completion message, maybe show it?
          // But usually we don't want to show old completion messages forever.
          // For now, let's only set if it's an error or we were previously fetching.
      }
      return data.status;
    } catch (e) {
      return "idle";
    }
  };

  useEffect(() => {
    let interval: any;
    if (isAdmin && token) {
      fetchJobStatus();
      interval = setInterval(async () => {
        const status = await fetchJobStatus();
        if (status !== "running" && !fetchingWorks) {
          // stop interval if not running and we are not in a manual fetch state
          // but actually we want to poll if it IS running
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAdmin, token, fetchingWorks]);

  const fetchAdminArtworks = async (currentPage: number) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(
        `/api/admin/artworks?limit=${limit}&offset=${currentPage * limit}`,
        { headers },
      );
      const data = await res.json();
      setArtworks(Array.isArray(data) ? data : data.data || []);
      if (data.total !== undefined) setTotalArtworks(data.total);
    } catch (e) {}
  };

  const fetchAdminComments = async () => {
    setLoadingComments(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch("/api/admin/comments", { headers });
      const data = await res.json();
      setAllComments(data);
    } catch (e) {}
    setLoadingComments(false);
  };

  const deleteComment = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAllComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {}
  };

  const bulkDeleteComments = async () => {
    if (!token || selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/comments/bulk-delete", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setAllComments((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
        setSelectedIds([]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAdmin) {
      navigate("/admin/login");
      return;
    }

    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch("/api/admin/settings", { headers }).then((r) => r.json()),
        fetch("/api/keywords").then((r) => r.json()),
      ]).then(([settingsData, keywordsData]) => {
        setSettings(settingsData);
        setKeywords(Array.isArray(keywordsData) ? keywordsData : []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isAdmin, isLoadingAuth, navigate, token]);

  useEffect(() => {
    if (isAdmin && token) {
      if (activeTab === 'artworks') {
        fetchAdminArtworks(page);
      } else {
        fetchAdminComments();
        fetchBannedIps();
      }
    }
  }, [page, isAdmin, token, activeTab]);

  const handleSettingsChange = (key: string, value: string) => {
    let newSettings = { ...settings };
    
    // If updating model_id/api_key, save them with provider prefix
    if (key === "model_id" || key === "api_key") {
       newSettings[`${settings.ai_provider || 'gemini'}_${key}`] = value;
       newSettings[`${settings.ai_provider || 'gemini'}_${key}Masked`] = value; // Also update masked for UI
    } else {
       newSettings[key] = value;
    }
    
    // Automatically handle logical defaults when provider changes
    if (key === "ai_provider") {
      newSettings.ai_provider = value;
      // When switching providers, ensure we have defaults for them if not set
      if (value === "gemini" && !newSettings.gemini_model_id) {
        newSettings.gemini_model_id = "gemini-2.0-flash";
      } else if (value === "dashscope" && !newSettings.dashscope_model_id) {
        newSettings.dashscope_model_id = "qwen3.6-max-preview";
      }
    }
    
    setSettings(newSettings);
  };

  const [toastMessage, setToastMessage] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToastMessage({ message, isError });
    if (!isError) {
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const saveSettings = async () => {
    const hours = parseInt(settings.interval_hours || "0", 10);
    const mins = parseInt(settings.interval_minutes || "0", 10);
    if (isNaN(hours) || isNaN(mins) || hours * 60 + mins < 30) {
      showToast("自动抓取间隔不能小于30分钟", true);
      return;
    }

    setSavingSettings(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(settings),
    });
    setSavingSettings(false);
    showToast("配置已成功保存");
  };

  const triggerFetch = async () => {
    setFetchingWorks(true);
    setFetchingProgress({ message: "正在启动名画寻脉任务..." });
    try {
      const provider = settings.ai_provider || 'gemini';
      const modelId = settings[`${provider}_model_id`] || "";
      const apiKey = settings[`${provider}_api_key`] || "";

      const res = await fetch("/api/admin/trigger-fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
           provider,
           modelId,
           apiKey
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `请求失败 (${res.status}): ${errorText.substring(0, 100)}...`,
        );
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No readable stream");

      let done = false;
      let finalResult = null;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last part in the buffer as it might be incomplete
          buffer = lines.pop() || "";

          for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;

            // Strip potential SSE data: prefix
            if (trimmed.startsWith("data: ")) {
              trimmed = trimmed.substring(6).trim();
            }

            try {
              const data = JSON.parse(trimmed);
              if (data.type === "progress") {
                setFetchingProgress({
                  message: data.message,
                  error: data.error ? "预警" : undefined,
                });
              } else if (data.type === "complete") {
                finalResult = data.data;
              }
            } catch (e) {
              console.warn("Failed to parse line:", trimmed, e);
              // Attempt recovery if multiple objects somehow got concatenated without newlines
              const parts = trimmed.split("}{");
              if (parts.length > 1) {
                for (let i = 0; i < parts.length; i++) {
                  let part = parts[i];
                  if (i > 0) part = "{" + part;
                  if (i < parts.length - 1) part = part + "}";
                  try {
                    const data = JSON.parse(part);
                    if (data.type === "progress")
                      setFetchingProgress({
                        message: data.message,
                        error: data.error ? "预警" : undefined,
                      });
                    else if (data.type === "complete") finalResult = data.data;
                  } catch (e2) {}
                }
              }
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        let trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) trimmed = trimmed.substring(6).trim();
        try {
          const data = JSON.parse(trimmed);
          if (data.type === "complete") finalResult = data.data;
        } catch (e) {
          // Attempt recovery
          const parts = trimmed.split("}{");
          if (parts.length > 1) {
            for (let i = 0; i < parts.length; i++) {
              let part = parts[i];
              if (i > 0) part = "{" + part;
              if (i < parts.length - 1) part = part + "}";
              try {
                const data = JSON.parse(part);
                if (data.type === "complete") finalResult = data.data;
              } catch (e2) {}
            }
          }
        }
      }

      const data = finalResult;
      if (data?.success) {
        setFetchingProgress({ message: data.message });
      } else if (data) {
        setFetchingProgress({ message: "抓取中止", error: data.message });
      } else {
        setFetchingProgress({ message: "流已断开，后台可能仍在继续执行..." });
      }

      // Always refresh list
      await fetchAdminArtworks(page);
    } catch (e: any) {
      setFetchingProgress({
        message: "连接服务发生异常",
        error: e.message || "网络断开",
      });
    } finally {
      setFetchingWorks(false);
      setTimeout(
        () => setFetchingProgress((prev) => (prev?.error ? prev : null)),
        5000,
      ); // Clear after 5 seconds if not an error
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const deleteKeyword = (keyword: string) => {
    setConfirmDialog({
      isOpen: true,
      message: `确定要全局删除焦点 "${keyword}" 吗？所有名画中包含的该焦点都将被抹除。`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/keywords/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ keyword }),
          });
          if (res.ok) {
            setKeywords((prev) => prev.filter((k) => k !== keyword));
            // Update local artworks keywords
            setArtworks((prev) =>
              prev.map((a) => {
                if (Array.isArray(a.keywords)) {
                  return {
                    ...a,
                    keywords: a.keywords.filter((k: string) => k !== keyword),
                  };
                } else if (typeof a.keywords === 'string') {
                  const kwList = a.keywords.split(/[，,]/).map((k: string) => k.trim());
                  const newKwList = kwList.filter((k) => k !== keyword);
                  return {
                    ...a,
                    keywords: newKwList.join(', '),
                  };
                }
                return a;
              }),
            );
          }
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const reinterpretArtwork = async (id: string) => {
    setReinterpretingId(id);
    setReinterpretMessages((prev) => ({
      ...prev,
      [id]: "正在启动重新解读...",
    }));
    let hasError = false;
    try {
      const res = await fetch(`/api/admin/artworks/${id}/reinterpret`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No readable stream");

      let done = false;
      let finalData = null;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith("data: "))
              trimmed = trimmed.substring(6).trim();

            const jsonBlocks = trimmed.match(/\{.*?\}(?=\s*\{|$)/g);
            if (!jsonBlocks) continue;

            for (const block of jsonBlocks) {
              try {
                const data = JSON.parse(block);
                if (data.type === "progress") {
                  setReinterpretMessages((prev) => ({
                    ...prev,
                    [id]: data.message,
                  }));
                } else if (data.type === "complete") {
                  finalData = data.data;
                }
              } catch (e) {}
            }
          }
        }
      }

      if (finalData && finalData.success) {
        setArtworks((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  ai_interpretation: finalData.ai_interpretation,
                  keywords: finalData.keywords,
                  title: finalData.title,
                  artist: finalData.artist,
                }
              : a,
          ),
        );
        showToast("重新解读成功");
      } else if (finalData) {
        const err = finalData.message;
        showToast(`重新解读失败: ${err}`, true);
        setReinterpretMessages((prev) => ({ ...prev, [id]: `❌ ${err}` }));
        hasError = true;
      } else {
        showToast("请求流已断开，操作将在后台继续执行");
      }

      // Try refresh to ensure we didn't miss completion
      await fetchAdminArtworks(page);
    } catch (e: any) {
      showToast(`发生错误: ${e.message}`, true);
      setReinterpretMessages((prev) => ({ ...prev, [id]: `❌ ${e.message}` }));
      hasError = true;
    } finally {
      setReinterpretingId(null);
      if (!hasError) {
        setReinterpretMessages((prev) => ({ ...prev, [id]: "" }));
      }
    }
  };

  const deleteArtwork = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: "您确定要删除此幅画作吗？",
      onConfirm: async () => {
        await fetch(`/api/admin/artworks/${id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setArtworks(artworks.filter((n) => n.id !== id));
        setSelectedIds(selectedIds.filter((sid) => sid !== id));
        setTotalArtworks((prev) => Math.max(0, prev - 1));
      },
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === artworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(artworks.map((n) => n.id));
    }
  };

  const bulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      message: `您确定要删除这 ${selectedIds.length} 幅名画吗？`,
      onConfirm: async () => {
        await fetch("/api/admin/artworks/bulk-delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ids: selectedIds }),
        });
        setArtworks((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
        setTotalArtworks((prev) => Math.max(0, prev - selectedIds.length));
        setSelectedIds([]);
      },
    });
  };

  if (loading)
    return (
      <div className="text-center py-20 text-slate-500 animate-pulse">
        加载配置中...
      </div>
    );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toastMessage && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-bold shadow-xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 ${toastMessage.isError ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}
        >
          <span>{toastMessage.message}</span>
          {toastMessage.isError && (
            <button
              onClick={() => setToastMessage(null)}
              className="hover:opacity-75 text-white/80 transition-opacity"
              title="关闭"
            >
              &times;
            </button>
          )}
        </div>
      )}
      <header className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-slate-500 mt-1 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              目前馆藏：
              <span>
                {totalArtworks}
              </span>{" "}
              幅名作
            </span>
          </h2>
        </div>
        <div className="w-full sm:w-auto">
          {fetchingProgress && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs px-4 py-2 rounded-lg font-medium border flex items-center gap-3 shadow-sm ${fetchingProgress.error ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"}`}
            >
              <div className={`w-2 h-2 rounded-full ${fetchingProgress.error ? "bg-red-500" : "bg-amber-500 animate-ping"}`} />
              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-md">
                {fetchingProgress.message}
                {fetchingProgress.error && <span className="ml-1 opacity-70">({fetchingProgress.error})</span>}
              </span>
              {fetchingProgress.error && (
                <button
                  onClick={() => setFetchingProgress(null)}
                  className="p-1 hover:bg-red-100 rounded-full transition-colors ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Sidebar Controls */}
        <div className="flex flex-col gap-6 col-span-1 lg:col-span-1 h-fit order-2 lg:order-1">
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 text-slate-800 px-4 py-3 flex justify-between items-center gap-2">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-amber-500" /> 鉴赏模型配置
                </h3>
                <div className="flex items-center gap-2 relative">
                  <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="text-slate-500 hover:text-amber-700 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-slate-200 disabled:opacity-50 shrink-0"
                    title="保存核心配置"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    解读引擎 (AI Provider)
                  </label>
                  <select
                    value={settings.ai_provider || "gemini"}
                    onChange={(e) =>
                      handleSettingsChange("ai_provider", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="gemini">Google Gemini (推荐)</option>
                    <option value="dashscope">
                      阿里百炼 / 通义千问 (DashScope)
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    模型标识 (Model ID)
                  </label>
                  <input
                    value={settings[`${settings.ai_provider || 'gemini'}_model_id`] || ""}
                    onChange={(e) =>
                      handleSettingsChange("model_id", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder={
                      settings.ai_provider === "gemini"
                        ? "gemini-2.0-flash"
                        : "qwen3.6-max-preview"
                    }
                  />
                </div>
 
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    API 密钥 (加密存储)
                  </label>
                  <input
                    type="password"
                    value={settings[`${settings.ai_provider || 'gemini'}_api_keyMasked`] || ""}
                    onChange={(e) =>
                      handleSettingsChange("api_key", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="请输入您的 API 密钥"
                  />
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> API 密钥必须在此设置才能使用 AI 解读功能
                  </p>
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.use_min_interval !== "false"}
                        onChange={(e) =>
                          handleSettingsChange(
                            "use_min_interval",
                            e.target.checked ? "true" : "false",
                          )
                        }
                      />
                      启用后台自动抓取间隔
                    </div>
                    <span className="text-xs text-slate-400 font-normal">
                      最少30分钟
                    </span>
                  </label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            disabled={settings.use_min_interval === "false"}
                            value={settings.interval_hours ?? "0"}
                            onChange={(e) =>
                              handleSettingsChange(
                                "interval_hours",
                                e.target.value,
                              )
                            }
                            className="w-16 bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1 outline-none text-center disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-500 font-bold">
                            小时
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            disabled={settings.use_min_interval === "false"}
                            value={settings.interval_minutes ?? "30"}
                            onChange={(e) =>
                              handleSettingsChange(
                                "interval_minutes",
                                e.target.value,
                              )
                            }
                            className="w-16 bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1 outline-none text-center disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-500 font-bold">
                            分钟
                          </span>
                        </div>
                      </div>
                    </div>
                    {settings.cron_last_trigger && (
                      <div className="text-xs sm:text-sm font-mono text-slate-400 p-2 bg-slate-50/50 border border-slate-200/50 rounded-md">
                        <span className="shrink-0">
                          上次收到触发任务:
                        </span>
                        <span className="ml-2 text-slate-500">
                          {new Date(
                            settings.cron_last_trigger
                              ? settings.cron_last_trigger +
                                  (settings.cron_last_trigger.endsWith("Z")
                                    ? ""
                                    : "Z")
                              : Date.now(),
                          ).toLocaleString("zh-CN", {
                            timeZone: "Asia/Shanghai",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 text-slate-800 px-4 py-3 flex justify-between items-center">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-500" /> 焦点管理
                </h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2 max-h-64 overflow-y-auto scrollbar-hide">
                {keywords.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center w-full py-4">
                    暂无焦点内容
                  </div>
                ) : (
                  keywords.map((kw) => (
                    <div
                      key={kw}
                      className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-medium text-slate-600 flex items-center gap-2 group"
                    >
                      <span>#{kw}</span>
                      <button
                        onClick={() => deleteKeyword(kw)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="全局删除该焦点"
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 overflow-hidden flex flex-col h-fit order-1 lg:order-2">
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              onClick={() => { setActiveTab('artworks'); setSelectedIds([]); }}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'artworks' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <Library className="w-4 h-4" /> 藏品库
            </button>
            <button
              onClick={() => { setActiveTab('comments'); setSelectedIds([]); }}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'comments' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <MessageSquare className="w-4 h-4" /> 评论管理
            </button>
          </div>
          <div className="p-4 border-b border-slate-100 flex flex-row justify-between items-center bg-slate-50/50 gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
                {activeTab === 'artworks' ? (
                  <><Palette className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> 藏品库管理</>
                ) : (
                  <><MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> 评论审查</>
                )}
              </h2>
              {(activeTab === 'artworks' ? artworks.length : allComments.length) > 0 && (
                <button
                  onClick={activeTab === 'artworks' ? toggleSelectAll : () => {
                    if (selectedIds.length === allComments.length) setSelectedIds([]);
                    else setSelectedIds(allComments.map(c => c.id));
                  }}
                  className="text-[10px] sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-200/50"
                >
                  {selectedIds.length === (activeTab === 'artworks' ? artworks.length : allComments.length)
                    ? "取消全选"
                    : "全选"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {selectedIds.length > 0 && (
                <button
                  onClick={activeTab === 'artworks' ? bulkDelete : bulkDeleteComments}
                  className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold transition-colors shadow-xl"
                >
                  <Trash2 className="w-3 h-3" /> 删除 ({selectedIds.length})
                </button>
              )}
              {activeTab === 'artworks' && (
                <button
                  onClick={triggerFetch}
                  disabled={fetchingWorks}
                  className="text-slate-500 hover:text-amber-700 transition-colors flex items-center justify-center p-1.5 rounded-full hover:bg-slate-200 disabled:opacity-50 shrink-0 shadow-sm"
                  title="手动抓取新名画"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${fetchingWorks ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col divide-y divide-slate-100 min-h-[400px] overflow-y-auto">
            {activeTab === 'artworks' ? (
              artworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 lg:p-24 text-slate-400 min-h-[300px]">
                  <div className="w-16 h-16 mb-4 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                    <Palette className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">暂无馆藏名画</p>
                  <p className="text-xs mt-2 opacity-70">
                    系统目前尚未抓取到名画内容，您可以等待后台任务或手动触发获取。
                  </p>
                </div>
              ) : (
                artworks.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center p-4 sm:p-4 gap-3 sm:gap-4 transition-colors ${index % 2 === 1 ? "bg-slate-50/30" : "bg-white"} hover:bg-slate-50`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex items-center justify-center shrink-0 w-5 sm:w-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                      </div>
                      <div className="text-slate-400 font-mono text-xs sm:text-sm w-6 sm:w-8 shrink-0">
                        {String(page * limit + index + 1).padStart(2, "0")}
                      </div>
                      <Link
                        to={`/artwork/${item.id}`}
                        className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity shadow-sm"
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-200"></div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col justify-center ml-1 sm:ml-0">
                        <p className="font-bold text-sm sm:text-base text-slate-800 truncate">
                          <Link
                            to={`/artwork/${item.id}`}
                            className="hover:text-amber-600 transition-colors"
                          >
                            {item.title}
                          </Link>
                          <span className="text-slate-500 font-medium">
                            {" "}
                            - {item.artist}
                          </span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-mono text-slate-400 mt-1 sm:mt-1.5">
                          <span className="text-slate-600 flex items-center gap-1.5 shrink-0">
                            <Eye className="w-4 h-4" /> {item.views}
                          </span>
                          <span
                            className="shrink-0 text-slate-500"
                            title="收录时间"
                          >
                            收录:{" "}
                            {new Date(
                              item.created_at
                                ? item.created_at +
                                    (item.created_at.endsWith("Z") ? "" : "Z")
                                : Date.now(),
                            ).toLocaleString("zh-CN", {
                              timeZone: "Asia/Shanghai",
                              hour12: false,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end sm:w-auto">
                      {reinterpretMessages[item.id] && (
                        <div
                          className={`text-xs font-mono px-2 py-1 rounded max-w-[200px] border flex items-center gap-2 ${reinterpretMessages[item.id].startsWith("❌") ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}
                        >
                          <motion.span
                            className="truncate"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={reinterpretMessages[item.id]}
                            title={reinterpretMessages[item.id]}
                          >
                            {reinterpretMessages[item.id]}
                          </motion.span>
                          {reinterpretMessages[item.id].startsWith("❌") && (
                            <button
                              onClick={() =>
                                setReinterpretMessages((prev) => ({
                                  ...prev,
                                  [item.id]: "",
                                }))
                              }
                              className="opacity-60 hover:opacity-100 flex-shrink-0"
                              title="关闭"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => reinterpretArtwork(item.id)}
                        disabled={reinterpretingId === item.id}
                        className="text-[13px] sm:text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors px-4 py-2 sm:py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-50 break-keep border border-amber-200 sm:border-none shadow-sm sm:shadow-none bg-amber-50/50 sm:bg-transparent"
                      >
                        {reinterpretingId === item.id
                          ? "正在解读..."
                          : "重新解读"}
                      </button>
                      <button
                        onClick={() => deleteArtwork(item.id)}
                        className="text-[13px] sm:text-sm font-bold text-red-500 hover:text-red-700 transition-colors px-4 py-2 sm:py-1.5 rounded-lg hover:bg-red-50 break-keep border border-red-200 sm:border-none shadow-sm sm:shadow-none bg-red-50/50 sm:bg-transparent ml-2"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              loadingComments ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-amber-500 animate-spin opacity-20" />
                  <p className="text-slate-400 font-serif italic">
                    正在核审评论...
                  </p>
                </div>
              ) : allComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 grayscale opacity-40">
                  <MessageSquare className="w-16 h-16 text-slate-300" />
                  <p className="text-slate-400 font-serif italic">
                    目前尚无评论，世界安宁
                  </p>
                </div>
              ) : (
                allComments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`flex flex-col p-4 gap-3 transition-colors ${index % 2 === 1 ? "bg-slate-50/30" : "bg-white"} hover:bg-slate-50`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center shrink-0 w-6 mt-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(comment.id)}
                          onChange={() => {
                            if (selectedIds.includes(comment.id)) setSelectedIds(selectedIds.filter(id => id !== comment.id));
                            else setSelectedIds([...selectedIds, comment.id]);
                          }}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                           <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                             来自馆藏: <Link to={`/artwork/${comment.artwork_id}`} className="text-amber-600 hover:underline">《{comment.artwork_title || '未知作品'}》</Link>
                           </p>
                           <span className="text-[10px] sm:text-xs font-mono text-slate-400">
                             {new Date(comment.created_at.endsWith('Z') ? comment.created_at : `${comment.created_at}Z`).toLocaleString('zh-CN')}
                           </span>
                        </div>
                        <div className="bg-white/50 p-3 rounded-lg border border-slate-100 text-slate-700 text-sm leading-relaxed mb-2">
                          {comment.content}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-slate-400 font-mono">
                            <span>IP: {comment.ip_address}</span>
                            <span>位置: {comment.location || '未知'}</span>
                            {comment.ip_address && comment.ip_address !== 'Unknown' && (
                              <button
                                onClick={() => toggleBanIp(comment.ip_address)}
                                className={`px-2 py-0.5 rounded border transition-colors ${bannedIps.includes(comment.ip_address) ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                              >
                                {bannedIps.includes(comment.ip_address) ? '已禁止 (点击解除)' : '封禁IP'}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            移除评论
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {activeTab === 'artworks' && totalArtworks > 0 && (
            <div className="px-4 py-4 border-t border-slate-100 flex justify-end items-center bg-slate-50/50">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all font-bold text-lg"
                  title="上一页"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1.5 px-3">
                  {(() => {
                    const pageCount = Math.ceil(totalArtworks / limit);
                    if (pageCount === 0) return null;
                    let startPage = Math.max(0, page - 2);
                    let endPage = Math.min(pageCount - 1, page + 2);
                    if (endPage - startPage < 4) {
                      if (startPage === 0) {
                        endPage = Math.min(pageCount - 1, startPage + 4);
                      } else {
                        startPage = Math.max(0, endPage - 4);
                      }
                    }
                    return Array.from(
                      { length: endPage - startPage + 1 },
                      (_, i) => startPage + i
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === pageNum ? "bg-slate-800 text-white shadow-md shadow-slate-200 scale-110" : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"}`}
                      >
                        {pageNum + 1}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= totalArtworks}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all font-bold text-lg"
                  title="下一页"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">系统确认</h3>
            <p className="text-sm text-slate-600 mb-8">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3 font-semibold">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-5 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-500/20"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
