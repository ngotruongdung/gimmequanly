
import React, { useState } from 'react';
import { User } from '../types';
import { Button } from './Button';
import { Key, User as UserIcon, Lock, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[];
  loading?: boolean;
  onBack: () => void; // New prop to go back to public home
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, loading, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.id === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 md:p-10 relative z-10 animate-fade-in">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Quay lại trang chủ"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-4 transform -rotate-6">
            <span className="text-2xl font-extrabold italic">LM</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">LiveSync Manager</h1>
          <p className="text-slate-500 font-medium text-sm mt-2">Đăng nhập để vào hệ thống</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">ID Nhân sự</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <UserIcon size={18} />
              </div>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ví dụ: u1"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Mật khẩu</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold animate-pulse">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-base shadow-lg shadow-indigo-200 mt-2" 
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            Quên mật khẩu? Liên hệ <span className="text-indigo-600 font-bold cursor-pointer hover:underline">Quản lý kỹ thuật</span>
          </p>
        </div>
      </div>
    </div>
  );
};
