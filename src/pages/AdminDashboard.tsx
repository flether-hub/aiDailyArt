import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Settings2, RefreshCw, ShieldCheck, Eye, Palette, Save, Info } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoadingAuth, token, logout } = useAuth();
  const [fetchingWorks, setFetchingWorks] = useState(false);
  const [fetchingProgress, setFetchingProgress] = useState<{message: string, error?: string} | null>(null);
  const [reinterpretingId, setReinterpretingId] = useState<string | null>(null);
  const [reinterpretMessages, setReinterpretMessages] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>({});
  const [artworks, setArtworks] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const limit = 20;

  const fetchAdminArtworks = async (currentPage: number) => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
      const res = await fetch(`/api/admin/artworks?limit=${limit}&offset=${currentPage * limit}`, { headers });
      const data = await res.json();
      setArtworks(Array.isArray(data) ? data : (data.data || []));
      if (data.total !== undefined) setTotalArtworks(data.total);
    } catch(e) {}
  };

  useEffect(() => {
    if (isLoadingAuth) return;
    
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    
    const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

    Promise.all([
      fetch('/api/admin/settings', { headers }).then(r => r.json()),
      fetch('/api/keywords').then(r => r.json())
    ]).then(([settingsData, keywordsData]) => {
      setSettings(settingsData);
      setKeywords(Array.isArray(keywordsData) ? keywordsData : []);
      setLoading(false);
    });
  }, [isAdmin, isLoadingAuth, navigate, token]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminArtworks(page);
    }
  }, [page, isAdmin, token]);

  const handleSettingsChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value, [`${key}Masked`]: value });
  };

  const [toastMessage, setToastMessage] = useState<{message: string, isError: boolean} | null>(null);

  const showToast = (message: string, isError = false) => {
    setToastMessage({ message, isError });
    if (!isError) {
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const saveSettings = async () => {
    const hours = parseInt(settings.interval_hours || '0', 10);
    const mins = parseInt(settings.interval_minutes || '0', 10);
    if (isNaN(hours) || isNaN(mins) || hours * 60 + mins < 30) {
      showToast('自动抓取间隔不能小于30分钟', true);
      return;
    }

    setSavingSettings(true);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(settings)
    });
    setSavingSettings(false);
    showToast('配置已成功保存');
  };

  const triggerFetch = async () => {
    setFetchingWorks(true);
    setFetchingProgress({ message: '正在启动名画寻脉任务...' });
    try {
      const res = await fetch('/api/admin/trigger-fetch', { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`请求失败 (${res.status}): ${errorText.substring(0, 100)}...`);
      }
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream');

      let done = false;
      let finalResult = null;
      let buffer = '';
      
      while (!done) {
         const { value, done: readerDone } = await reader.read();
         done = readerDone;
         if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last part in the buffer as it might be incomplete
            buffer = lines.pop() || '';
            
            for (const line of lines) {
               let trimmed = line.trim();
               if (!trimmed) continue;
               
               // Strip potential SSE data: prefix
               if (trimmed.startsWith('data: ')) {
                  trimmed = trimmed.substring(6).trim();
               }
               
               try {
                  const data = JSON.parse(trimmed);
                  if (data.type === 'progress') {
                     setFetchingProgress({ message: data.message, error: data.error ? '预警' : undefined });
                  } else if (data.type === 'complete') {
                     finalResult = data.data;
                  }
               } catch (e) {
                  console.warn('Failed to parse line:', trimmed, e);
                  // Attempt recovery if multiple objects somehow got concatenated without newlines
                  const parts = trimmed.split('}{');
                  if (parts.length > 1) {
                     for (let i = 0; i < parts.length; i++) {
                        let part = parts[i];
                        if (i > 0) part = '{' + part;
                        if (i < parts.length - 1) part = part + '}';
                        try {
                           const data = JSON.parse(part);
                           if (data.type === 'progress') setFetchingProgress({ message: data.message, error: data.error ? '预警' : undefined });
                           else if (data.type === 'complete') finalResult = data.data;
                        } catch(e2) {}
                     }
                  }
               }
            }
         }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
         let trimmed = buffer.trim();
         if (trimmed.startsWith('data: ')) trimmed = trimmed.substring(6).trim();
         try {
            const data = JSON.parse(trimmed);
            if (data.type === 'complete') finalResult = data.data;
         } catch (e) {
            // Attempt recovery
            const parts = trimmed.split('}{');
            if (parts.length > 1) {
               for (let i = 0; i < parts.length; i++) {
                  let part = parts[i];
                  if (i > 0) part = '{' + part;
                  if (i < parts.length - 1) part = part + '}';
                  try {
                     const data = JSON.parse(part);
                     if (data.type === 'complete') finalResult = data.data;
                  } catch(e2) {}
               }
            }
         }
      }

      const data = finalResult;
      if (data?.success) {
        setFetchingProgress({ message: data.message });
      } else if (data) {
        setFetchingProgress({ message: '抓取中止', error: data.message });
      } else {
        setFetchingProgress({ message: '流已断开，后台可能仍在继续执行...' });
      }
      
      // Always refresh list
      await fetchAdminArtworks(page);

    } catch (e: any) {
       setFetchingProgress({ message: '连接服务发生异常', error: e.message || '网络断开' });
    } finally {
      setFetchingWorks(false);
      setTimeout(() => setFetchingProgress(prev => prev?.error ? prev : null), 5000); // Clear after 5 seconds if not an error
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; } | null>(null);

  const deleteKeyword = (keyword: string) => {
    setConfirmDialog({
      isOpen: true,
      message: `确定要全局删除焦点 "${keyword}" 吗？所有名画中包含的该焦点都将被抹除。`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/keywords/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ keyword })
          });
          if (res.ok) {
            setKeywords(prev => prev.filter(k => k !== keyword));
            // Update local artworks keywords
            setArtworks(prev => prev.map(a => ({
              ...a,
              keywords: Array.isArray(a.keywords) ? a.keywords.filter((k: string) => k !== keyword) : a.keywords
            })));
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const reinterpretArtwork = async (id: string) => {
    setReinterpretingId(id);
    setReinterpretMessages(prev => ({ ...prev, [id]: '正在启动重新解读...' }));
    let hasError = false;
    try {
      const res = await fetch(`/api/admin/artworks/${id}/reinterpret`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream');

      let done = false;
      let finalData = null;
      let buffer = '';

      while (!done) {
         const { value, done: readerDone } = await reader.read();
         done = readerDone;
         if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
               let trimmed = line.trim();
               if (!trimmed) continue;
               if (trimmed.startsWith('data: ')) trimmed = trimmed.substring(6).trim();
               
               const jsonBlocks = trimmed.match(/\{.*?\}(?=\s*\{|$)/g);
               if (!jsonBlocks) continue;
               
               for (const block of jsonBlocks) {
                  try {
                    const data = JSON.parse(block);
                    if (data.type === 'progress') {
                       setReinterpretMessages(prev => ({ ...prev, [id]: data.message }));
                    } else if (data.type === 'complete') {
                       finalData = data.data;
                    }
                  } catch(e) { }
               }
            }
         }
      }

      if (finalData && finalData.success) {
        setArtworks(prev => prev.map(a => a.id === id ? { ...a, ai_interpretation: finalData.ai_interpretation, keywords: finalData.keywords, title: finalData.title, artist: finalData.artist } : a));
        showToast('重新解读成功');
      } else if (finalData) {
        const err = finalData.message;
        showToast(`重新解读失败: ${err}`, true);
        setReinterpretMessages(prev => ({ ...prev, [id]: `❌ ${err}` }));
        hasError = true;
      } else {
        showToast('请求流已断开，操作将在后台继续执行');
      }
      
      // Try refresh to ensure we didn't miss completion
      await fetchAdminArtworks(page);

    } catch (e: any) {
      showToast(`发生错误: ${e.message}`, true);
      setReinterpretMessages(prev => ({ ...prev, [id]: `❌ ${e.message}` }));
      hasError = true;
    } finally {
      setReinterpretingId(null);
      if (!hasError) {
        setReinterpretMessages(prev => ({ ...prev, [id]: '' }));
      }
    }
  };

  const deleteArtwork = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: '您确定要删除此幅画作吗？',
      onConfirm: async () => {
        await fetch(`/api/admin/artworks/${id}`, { 
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        });
        setArtworks(artworks.filter(n => n.id !== id));
        setSelectedIds(selectedIds.filter(sid => sid !== id));
        setTotalArtworks(prev => Math.max(0, prev - 1));
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === artworks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(artworks.map(n => n.id));
    }
  };

  const bulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      message: `您确定要删除这 ${selectedIds.length} 幅名画吗？`,
      onConfirm: async () => {
        await fetch('/api/admin/artworks/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ ids: selectedIds })
        });
        setArtworks(prev => prev.filter(n => !selectedIds.includes(n.id)));
        setTotalArtworks(prev => Math.max(0, prev - selectedIds.length));
        setSelectedIds([]);
      }
    });
  };

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">加载配置中...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toastMessage && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-bold shadow-xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 ${toastMessage.isError ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          <span>{toastMessage.message}</span>
          {toastMessage.isError && (
            <button onClick={() => setToastMessage(null)} className="hover:opacity-75 text-white/80 transition-opacity" title="关闭">&times;</button>
          )}
        </div>
      )}
      <header className="flex justify-between items-end pb-4 border-b border-slate-200">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
             <ShieldCheck className="w-7 h-7 text-amber-500" />
             艺术殿堂管理控制台
           </h1>
           <p className="text-slate-500 mt-1 text-sm">管理每日抓取的名画及解读内容。</p>
        </div>
        <div className="flex items-center gap-3">
          {fetchingProgress && (
             <div className={`text-xs px-3 py-1.5 rounded-md font-mono border max-w-sm flex items-center gap-2 ${fetchingProgress.error ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`} title={fetchingProgress.error ? `${fetchingProgress.message}: ${fetchingProgress.error}` : fetchingProgress.message}>
               <span className="truncate">{fetchingProgress.error ? `${fetchingProgress.message}: ${fetchingProgress.error}` : fetchingProgress.message}</span>
               {fetchingProgress.error && (
                 <button onClick={() => setFetchingProgress(null)} className="opacity-60 hover:opacity-100 flex-shrink-0" title="关闭">&times;</button>
               )}
             </div>
          )}
          <button 
            onClick={triggerFetch}
            disabled={fetchingWorks}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingWorks ? 'animate-spin' : ''}`} />
            {fetchingWorks ? '正在鉴赏中...' : '手动甄选单幅名画'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar Controls */}
        <div className="flex flex-col gap-6 col-span-1 lg:col-span-1 h-fit">
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2"><Settings2 className="w-4 h-4" /> 鉴赏模型配置</h3>
                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded uppercase font-bold">生效中</span>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">解读引擎 (AI Provider)</label>
                  <select 
                    value={settings.ai_provider || 'gemini'}
                    onChange={e => handleSettingsChange('ai_provider', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="gemini">Google Gemini (推荐)</option>
                    <option value="dashscope">阿里百炼 / 通义千问 (DashScope)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase">模型标识 (Model ID)</label>
                   <input 
                     disabled={settings.ai_provider === 'gemini'}
                     value={settings.ai_provider === 'gemini' ? '' : (settings.model_id || '')}
                     onChange={e => handleSettingsChange('model_id', e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-amber-500/20 disabled:text-slate-400 disabled:bg-slate-100"
                     placeholder={settings.ai_provider === 'gemini' ? "自动选择最优免费模型" : "qwen-plus"}
                   />
                </div>

                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase">API 密钥 (加密存储)</label>
                   <input 
                     type="password"
                     value={settings.api_keyMasked || ''}
                     onChange={e => handleSettingsChange('api_key', e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                     placeholder="留空则使用部署环境默认 Key"
                   />
                   <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> 若在此设置，将优先于环境变量加载</p>
                </div>

                <div className="pt-2 space-y-2 border-t border-slate-100">
                   <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={settings.use_min_interval !== 'false'} 
                          onChange={e => handleSettingsChange('use_min_interval', e.target.checked ? 'true' : 'false')} 
                        />
                        启用后台自动抓取间隔
                     </div>
                     <span className="text-xs text-slate-400 font-normal">最少30分钟</span>
                   </label>
                   <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                           <input 
                             type="number"
                             min="0"
                             disabled={settings.use_min_interval === 'false'}
                             value={settings.interval_hours ?? '0'}
                             onChange={e => handleSettingsChange('interval_hours', e.target.value)}
                             className="w-16 bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1 outline-none text-center disabled:opacity-50"
                           />
                           <span className="text-xs text-slate-500 font-bold">小时</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <input 
                             type="number"
                             min="0"
                             max="59"
                             disabled={settings.use_min_interval === 'false'}
                             value={settings.interval_minutes ?? '30'}
                             onChange={e => handleSettingsChange('interval_minutes', e.target.value)}
                             className="w-16 bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1 outline-none text-center disabled:opacity-50"
                           />
                           <span className="text-xs text-slate-500 font-bold">分钟</span>
                         </div>
                       </div>
                       <button 
                         onClick={saveSettings}
                         disabled={savingSettings}
                         className="bg-amber-100/50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                       >
                         {savingSettings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                         快速保存
                       </button>
                     </div>
                     {settings.cron_last_trigger && (
                        <div className="text-[10px] text-slate-400 p-2 bg-slate-50/50 border border-slate-200/50 rounded-md">
                          <span className="uppercase font-bold tracking-wider opacity-60">上次收到触发任务:</span>
                          <span className="font-mono ml-2 text-slate-600">{new Date(settings.cron_last_trigger).toLocaleString()}</span>
                        </div>
                     )}
                   </div>
                </div>

                <button 
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full bg-slate-900 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors mt-2 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> 保存核心配置
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Palette className="w-4 h-4" /> 焦点管理</h3>
                </div>
                <div className="p-4 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                   {keywords.length === 0 ? (
                     <div className="text-xs text-slate-400 text-center w-full py-4">暂无焦点内容</div>
                   ) : (
                     keywords.map(kw => (
                       <div key={kw} className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-medium text-slate-600 flex items-center gap-2 group">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-3">
               <h2 className="font-bold text-slate-700 flex items-center gap-2"><Palette className="w-4 h-4 text-slate-400" /> 藏品库管理</h2>
               {artworks.length > 0 && (
                 <button onClick={toggleSelectAll} className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
                   {selectedIds.length === artworks.length ? '取消全选' : '全选当前页'}
                 </button>
               )}
             </div>
             {selectedIds.length > 0 && (
               <button 
                 onClick={bulkDelete}
                 className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
               >
                 批量删除 ({selectedIds.length})
               </button>
             )}
          </div>

          <div className="flex flex-col divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[600px]">
             {artworks.length === 0 ? (
               <div className="p-6 text-sm text-slate-500">暂无馆藏名画。</div>
             ) : artworks.map((item, index) => (
               <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center p-4 gap-4 transition-colors ${index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'} hover:bg-slate-50`}>
                 <div className="flex items-center gap-4">
                   <div className="flex items-center justify-center shrink-0 w-6">
                     <input 
                       type="checkbox" 
                       checked={selectedIds.includes(item.id)}
                       onChange={() => toggleSelect(item.id)}
                       className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                     />
                   </div>
                   <div className="text-slate-400 font-mono text-xs w-6 shrink-0">{String(index + 1).padStart(2, '0')}</div>
                   <Link to={`/artwork/${item.id}`} className="shrink-0 w-12 h-12 bg-slate-100 rounded overflow-hidden hover:opacity-80">
                   {item.image_url ? (
                         <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   ) : (
                         <div className="w-full h-full bg-slate-200"></div>
                   )}
                   </Link>
                 </div>
                 <div className="flex-1 min-w-0 flex flex-col justify-center">
                   <p className="font-medium text-sm text-slate-800 truncate">
                      <Link to={`/artwork/${item.id}`} className="hover:text-amber-600 transition-colors">{item.title}</Link> 
                      <span className="text-slate-400 font-normal"> - {item.artist}</span>
                   </p>
                   <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400 mt-1">
                     <span className="text-slate-600 flex items-center gap-1 shrink-0"><Eye className="w-3 h-3"/> {item.views}</span>
                     <span className="shrink-0" title="收录时间">收录: {new Date(item.created_at).toLocaleDateString()}</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                   {reinterpretMessages[item.id] && (
                     <div className={`text-xs font-mono px-2 py-1 rounded max-w-[200px] border flex items-center gap-2 ${reinterpretMessages[item.id].startsWith('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                       <motion.span
                           className="truncate"
                           initial={{ opacity: 0, x: 10 }}
                           animate={{ opacity: 1, x: 0 }}
                           key={reinterpretMessages[item.id]}
                           title={reinterpretMessages[item.id]}
                       >
                         {reinterpretMessages[item.id]}
                       </motion.span>
                       {reinterpretMessages[item.id].startsWith('❌') && (
                         <button onClick={() => setReinterpretMessages(prev => ({...prev, [item.id]: ''}))} className="opacity-60 hover:opacity-100 flex-shrink-0" title="关闭">&times;</button>
                       )}
                     </div>
                   )}
                   <button 
                     onClick={() => reinterpretArtwork(item.id)}
                     disabled={reinterpretingId === item.id}
                     className="text-[13px] font-medium text-amber-600 hover:text-amber-800 transition-colors px-3 py-1 rounded hover:bg-amber-50 disabled:opacity-50 break-keep"
                   >
                     {reinterpretingId === item.id ? '正在解读...' : '重新解读'}
                   </button>
                   <button 
                     onClick={() => deleteArtwork(item.id)}
                     className="text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors px-3 py-1 rounded hover:bg-red-50 break-keep"
                   >
                     删除
                   </button>
                 </div>
               </div>
             ))}
          </div>
          
          {totalArtworks > 0 && (
            <div className="px-4 py-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
              <div className="order-2 md:order-1">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] bg-white border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
                   Inventory: {totalArtworks} Masterpieces
                </span>
              </div>
              
              <div className="flex items-center gap-1 order-1 md:order-2">
                 <button 
                   onClick={() => setPage(Math.max(0, page - 1))} 
                   disabled={page === 0}
                   className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all font-bold text-lg"
                   title="上一页"
                 >
                   ‹
                 </button>
                 
                 <div className="flex items-center gap-1.5 px-3">
                   {Array.from({ length: Math.min(5, Math.ceil(totalArtworks / limit)) }, (_, i) => {
                     const pageCount = Math.ceil(totalArtworks / limit);
                     let pageNum = page + i - 2;
                     if (pageNum < 0) pageNum = i;
                     if (pageNum >= pageCount) pageNum = pageCount - 5 + i;
                     if (pageNum < 0) pageNum = i;
                     if (pageNum >= pageCount) return null;

                     return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === pageNum ? 'bg-slate-900 text-white shadow-md shadow-slate-200 scale-110' : 'bg-white border border-slate-100 text-slate-500 hover:border-slate-300'}`}
                        >
                          {pageNum + 1}
                        </button>
                     );
                   })}
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">系统确认</h3>
            <p className="text-sm text-slate-600 mb-8">{confirmDialog.message}</p>
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
