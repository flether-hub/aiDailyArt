import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Settings2, RefreshCw, ShieldCheck, Eye, Palette, Save, Info } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>({});
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingWorks, setFetchingWorks] = useState(false);
  const [fetchingProgress, setFetchingProgress] = useState<{message: string, error?: string} | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    
    const token = localStorage.getItem('admin_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

    Promise.all([
      fetch('/api/admin/settings', { headers }).then(r => r.json()),
      fetch('/api/artworks').then(r => r.json())
    ]).then(([settingsData, artworksData]) => {
      setSettings(settingsData);
      setArtworks(Array.isArray(artworksData) ? artworksData : (artworksData.data || []));
      setLoading(false);
    });
  }, [isAdmin, navigate]);

  const handleSettingsChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value, [`${key}Masked`]: value });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const token = localStorage.getItem('admin_token');
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(settings)
    });
    setSavingSettings(false);
    alert('配置已成功保存');
  };

  const triggerFetch = async () => {
    setFetchingWorks(true);
    setFetchingProgress({ message: '正在启动名画寻脉任务...' });
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/admin/trigger-fetch', { 
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
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
               
               // Attempt to find individual JSON objects if they got glued together
               const jsonBlocks = trimmed.match(/\{.*?\}(?=\s*\{|$)/g);
               if (!jsonBlocks) continue; // Skip lines that don't contain valid looking JSON blocks
               
               for (const block of jsonBlocks) {
                  try {
                     const data = JSON.parse(block);
                     if (data.type === 'progress') {
                        setFetchingProgress({ message: data.message, error: data.error ? '预警' : undefined });
                     } else if (data.type === 'complete') {
                        finalResult = data.data;
                     }
                  } catch (e) {
                     console.warn('Failed to parse block:', block, e);
                  }
               }
            }
         }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
         let trimmed = buffer.trim();
         if (trimmed.startsWith('data: ')) trimmed = trimmed.substring(6).trim();
         const jsonBlocks = trimmed.match(/\{.*?\}(?=\s*\{|$)/g);
         if (jsonBlocks) {
            for (const block of jsonBlocks) {
               try {
                  const data = JSON.parse(block);
                  if (data.type === 'complete') finalResult = data.data;
               } catch (e) {}
            }
         }
      }

      const data = finalResult;
      if (data?.success) {
        setFetchingProgress({ message: data.message });
        const resArts = await fetch('/api/artworks').then(r => r.json());
        setArtworks(Array.isArray(resArts) ? resArts : (resArts.data || []));
      } else if (data) {
        setFetchingProgress({ message: '抓取中断', error: data.message });
      } else {
        setFetchingProgress({ message: '抓取结束', error: '无法解析返回流水' });
      }
    } catch (e: any) {
       setFetchingProgress({ message: '连接服务发生异常', error: e.message || '网络断开' });
    } finally {
      setFetchingWorks(false);
      setTimeout(() => setFetchingProgress(null), 5000); // Clear after 5 seconds
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void; } | null>(null);

  const deleteArtwork = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      message: '您确定要删除此幅画作吗？',
      onConfirm: async () => {
        const token = localStorage.getItem('admin_token');
        await fetch(`/api/admin/artworks/${id}`, { 
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        });
        setArtworks(artworks.filter(n => n.id !== id));
        setSelectedIds(selectedIds.filter(sid => sid !== id));
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
        const token = localStorage.getItem('admin_token');
        await fetch('/api/admin/artworks/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ ids: selectedIds })
        });
        setArtworks(artworks.filter(n => !selectedIds.includes(n.id)));
        setSelectedIds([]);
      }
    });
  };

  if (loading) return <div className="text-center py-20 text-slate-500 animate-pulse">加载配置中...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end pb-4 border-b border-slate-200">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
             <ShieldCheck className="w-7 h-7 text-amber-500" />
             艺术殿堂管理控制台
           </h1>
           <p className="text-slate-500 mt-1 text-sm">管理每日抓取的名画及解读内容。</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {fetchingProgress && (
             <div className={`text-xs px-3 py-1.5 rounded-md font-medium border ${fetchingProgress.error ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
               {fetchingProgress.error ? `${fetchingProgress.message}: ${fetchingProgress.error}` : fetchingProgress.message}
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
        
        {/* Settings Form */}
        <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 flex flex-col gap-6 col-span-1 lg:col-span-1 h-fit">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2"><Settings2 className="w-4 h-4" /> 鉴赏模型配置</h3>
              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded uppercase font-bold">生效中</span>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">解读引擎 (AI Provider)</label>
                <select 
                  value={settings.ai_provider || 'gemini'}
                  onChange={e => handleSettingsChange('ai_provider', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="gemini">Google Gemini (推荐)</option>
                  <option value="qwen">阿里通义千问 (Qwen)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[11px] font-bold text-slate-500 uppercase">模型标识 (Model ID)</label>
                 <input 
                   value={settings.model_id || ''}
                   onChange={e => handleSettingsChange('model_id', e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-amber-500/20"
                   placeholder={settings.ai_provider === 'gemini' ? "gemini-2.0-flash" : "qwen-plus"}
                 />
              </div>

              <div className="space-y-1.5">
                 <label className="text-[11px] font-bold text-slate-500 uppercase">API 密钥 (加密存储)</label>
                 <input 
                   type="password"
                   value={settings.api_keyMasked || ''}
                   onChange={e => handleSettingsChange('api_key', e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                   placeholder="留空则使用部署环境默认 Key"
                 />
                 <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> 若在此设置，将优先于环境变量加载</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                 <label className="text-xs font-bold text-slate-600">单次抓取数量上限</label>
                 <input 
                   type="number"
                   value={settings.daily_limit || '1'}
                   onChange={e => handleSettingsChange('daily_limit', e.target.value)}
                   className="w-16 bg-slate-50 border border-slate-200 text-sm rounded px-2 py-1 outline-none text-center"
                   placeholder="1"
                 />
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
               <div key={item.id} className={`flex justify-between items-center p-4 line-clamp-1 gap-4 transition-colors ${index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'} hover:bg-slate-50`}>
                 <div className="flex items-center justify-center shrink-0 w-6">
                   <input 
                     type="checkbox" 
                     checked={selectedIds.includes(item.id)}
                     onChange={() => toggleSelect(item.id)}
                     className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                   />
                 </div>
                 <div className="text-slate-400 font-mono text-xs w-6 shrink-0">{String(index + 1).padStart(2, '0')}</div>
                 {item.image_url && (
                    <div className="shrink-0 w-12 h-12 bg-slate-100 rounded overflow-hidden">
                       <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <p className="font-medium text-sm text-slate-800 truncate">{item.title} <span className="text-slate-400 font-normal"> - {item.artist}</span></p>
                   <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                     <span className="text-slate-600 flex items-center gap-1"><Eye className="w-3 h-3"/> {item.views}</span>
                     <span title="抓取时间">收录: {new Date(item.created_at).toLocaleString()}</span>
                     <span className="text-blue-500">来自 API</span>
                   </div>
                 </div>
                 <button 
                   onClick={() => deleteArtwork(item.id)}
                   className="text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors px-3 py-1 rounded hover:bg-red-50"
                 >
                   删除
                 </button>
               </div>
             ))}
          </div>
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
