import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Shield, KeyRound, Loader2 } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
           await checkAuth(data.token);
        } else {
           await checkAuth();
        }
        navigate('/admin/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex bg-slate-100 p-4 rounded-xl mb-4 border border-slate-200">
          <Shield className="w-8 h-8 text-slate-800" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">管理员登录</h2>
        <p className="mt-2 text-sm text-slate-500">
          请登录以管理您的 AI 聚合内容。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                管理密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-200 rounded-lg placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-500/20 sm:text-sm transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 flex justify-center rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
               >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '进入系统'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
