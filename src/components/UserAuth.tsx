import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  LogIn, 
  LogOut, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Chrome, 
  CheckCircle, 
  AlertCircle, 
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  ChevronDown
} from 'lucide-react';

interface UserAuthProps {
  onUserChanged: (user: any, isDemo?: boolean) => void;
  language: string;
  isInline?: boolean;
  currentUser?: any;
  isDemoUser?: boolean;
}

export default function UserAuth({ 
  onUserChanged, 
  language, 
  isInline = false,
  currentUser = null,
  isDemoUser: isDemoProp = false
}: UserAuthProps) {
  const [user, setUser] = useState<any>(currentUser);
  const [isDemoUser, setIsDemoUser] = useState(isDemoProp);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Forms state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  
  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with parent props
  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    setIsDemoUser(isDemoProp);
  }, [isDemoProp]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setSuccess(language === 'ZH' ? 'Google 登录成功！' : 'Google Login successful!');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Auth Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === 'ZH' ? '请填写完整的邮箱及密码！' : 'Please fill all required fields!');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess(language === 'ZH' ? '邮箱登录成功！' : 'Sign-in successful!');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setSuccess(language === 'ZH' ? '注册成功！' : 'Account created!');
      }
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Auth failure';
      if (err.code === 'auth/wrong-password') errMsg = '密码错误，请重新输入。';
      if (err.code === 'auth/user-not-found') errMsg = '该账户不存在，请注册。';
      if (err.code === 'auth/email-already-in-use') errMsg = '该邮箱已被注册，请直接登录。';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(language === 'ZH' ? '请填写用户名和密码！' : 'Please enter username and password!');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName })
      });
      const data = await resp.json();
      if (data.status !== 'ok') {
        setError(data.message || (language === 'ZH' ? '认证失败' : 'Auth failed'));
        return;
      }
      if (mode === 'register') {
        setSuccess(language === 'ZH' ? '注册成功，请使用账号登录。' : 'Registered! Please sign in.');
        setMode('login');
        return;
      }
      // Login success: persist local session and notify parent.
      try {
        localStorage.setItem('pancreas_local_auth', JSON.stringify({ token: data.token, user: data.user }));
      } catch (_) {
        // ignore storage failures
      }
      const u = { ...data.user, photoURL: null, emailVerified: true };
      setUser(u);
      setIsDemoUser(true);
      onUserChanged(u, true);
      setSuccess(language === 'ZH' ? '登录成功，正在进入...' : 'Login successful...');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 700);
    } catch (_) {
      setError(language === 'ZH' ? '网络错误，请稍后重试。' : 'Network error, try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      const mockUser = {
        uid: 'demo-pancreas-osint-101',
        email: 'demo-consultant@pancreas-osint.org',
        displayName: '专家学术顾问 (Demo)',
        photoURL: null,
        emailVerified: true
      } as any;
      
      setUser(mockUser);
      setIsDemoUser(true);
      onUserChanged(mockUser, true);
      setSuccess(language === 'ZH' ? '登录成功，正在进入学术研判中心...' : 'Login successful, entering Clinical Center...');
      
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
        setIsLoading(false);
      }, 500);
    }, 200);
  };

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('pancreas_local_auth');
      } catch (_) {
        // ignore
      }
      if (isDemoUser) {
        setUser(null);
        setIsDemoUser(false);
        onUserChanged(null);
      } else {
        await signOut(auth);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const renderLoginForm = (showClose: boolean, inlineStyles: boolean) => {
    return (
      <div className={`w-full max-w-sm bg-[#0d0d11] border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col font-sans text-left ${inlineStyles ? 'mx-auto border-purple-500/20 shadow-purple-950/10' : ''}`}>
        <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-purple-500/[0.03] rounded-full blur-[60px] pointer-events-none"></div>

        {/* Close button */}
        {showClose && (
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 p-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Modal Title */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="inline-flex p-2.5 bg-purple-500/10 border border-purple-550/25 rounded-xl text-purple-400 mb-1">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wider uppercase font-sans">
            {language === 'ZH' ? '胰腺开源情报中心登录' : 'Pancreas OSINT Auth'}
          </h3>
          <p className="text-[10px] text-zinc-400 max-w-[280px] mx-auto leading-normal">
            {language === 'ZH' 
              ? '联合开启医学循证社区，激活云同步病情画像及专属科学文献推送服务' 
              : 'Join clinical community to unlock profiles sync and persistent logs'}
          </p>
        </div>

        {/* Alert boxes */}
        {error && (
          <div className="p-3 mb-4 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-xl text-[11px] flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-normal">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 bg-emerald-950/20 border border-emerald-950/30 text-emerald-300 rounded-xl text-[11px] flex gap-2 animate-pulse">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-normal">{success}</span>
          </div>
        )}

        {/* 1. Google Authentication - PLACED ON TOP */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
            {language === 'ZH' ? '方式一：Google 账号安全快连' : 'Method 1: Sign in with Google'}
          </span>
          <button
            onClick={handleGoogleLogin}
            type="button"
            disabled={isLoading}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 hover:border-white/20 rounded-xl text-xs font-semibold cursor-pointer flex justify-center items-center gap-2 transition font-sans"
          >
            <Chrome className="h-4 w-4 text-rose-450" />
            <span>
              {language === 'ZH' ? '使用 Google 账号登录' : 'Sign in with Google'}
            </span>
          </button>
        </div>

        {/* Separator line style */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute inset-0 border-t border-white/5"></div>
          <span className="relative bg-[#0d0d11] px-3 text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
            {language === 'ZH' ? '方式二：电子邮箱及密码' : 'Method 2: standard Email'}
          </span>
        </div>

        {/* 2. Email or Password Authentication - PLACED IN THE MIDDLE */}
        <form onSubmit={handleEmailAuth} className="space-y-3 mb-5">
          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              {language === 'ZH' ? '电子邮箱 Email' : 'Email Address'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-500">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              {language === 'ZH' ? '密码 Password' : 'Password'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-zinc-500">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-zinc-655 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono"
              />
            </div>
          </div>

          {/* Action row button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-purple-700 hover:bg-purple-650 text-white rounded-xl text-xs font-bold cursor-pointer transition flex justify-center items-center gap-1.5 font-sans active-glow shadow shadow-purple-900/15"
          >
            {isLoading ? (
              <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                <span>
                  {mode === 'login' 
                    ? (language === 'ZH' ? '立即邮箱登录' : 'Sign In Now')
                    : (language === 'ZH' ? '提交邮箱注册' : 'Submit Registration')}
                </span>
              </>
            )}
          </button>

          {/* Toggle Mode */}
          <div className="text-center pt-1.5">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              type="button"
              className="text-[10px] text-zinc-500 hover:text-purple-400 transition cursor-pointer underline font-sans"
            >
              {mode === 'login'
                ? (language === 'ZH' ? "还没有账户？申请密码快速注册" : "Don't have an account? Sign up")
                : (language === 'ZH' ? "已经有账户？切换到密码登录模式" : "Already have an account? Sign in")}
            </button>
          </div>
        </form>

        {/* Separator line style */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="absolute inset-0 border-t border-white/5"></div>
          <span className="relative bg-[#0d0d11] px-3 text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
            {language === 'ZH' ? '方式三：体验专区' : 'Method 3: demo account'}
          </span>
        </div>

        {/* 3. One-click Demo simulated login - PLACED AT THE BOTTOM */}
        <button
          onClick={handleDemoLogin}
          type="button"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-to-r from-purple-800/10 to-indigo-800/10 hover:from-purple-800/20 hover:to-indigo-800/20 text-purple-300 border border-purple-500/25 hover:border-purple-500/40 rounded-xl text-xs font-bold cursor-pointer flex justify-center items-center gap-2 transition duration-150 relative overflow-hidden group font-sans shrink-0 active:scale-[0.98]"
        >
          <Zap className="h-4 w-4 text-purple-400 animate-pulse" />
          <span>
            {language === 'ZH' ? '🎯 极速一键模拟登录 (演示及评测专属)' : '🎯 Instant Demo Login'}
          </span>
          <span className="absolute right-2 top-1 text-[8px] bg-purple-500 text-white font-mono uppercase px-1 rounded scale-75 font-semibold">
            Demo
          </span>
        </button>

      </div>
    );
  };

  if (isInline) {
    if (user) return null;
    return (
      <div className="w-full max-w-sm bg-[#0d0d11]/90 border border-purple-550/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col font-sans text-center items-center justify-center animate-fade-in mx-auto shadow-purple-950/10">
        <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-purple-500/[0.03] rounded-full blur-[60px] pointer-events-none"></div>

        <div className="inline-flex p-3 bg-purple-950/40 border border-purple-500/20 rounded-2xl text-purple-400 mb-4 animate-pulse">
          <Zap className="h-6 w-6 text-purple-450 animate-bounce" />
        </div>
        
        <h3 className="text-sm font-bold text-white tracking-widest uppercase mb-1 font-sans">
          {language === 'ZH' ? '学术循证控制中心快速登录' : 'Authorized Access Center'}
        </h3>
        <p className="text-[10.5px] text-zinc-400 leading-relaxed mb-6 max-w-xs">
          {language === 'ZH'
            ? '请点击下方一键快速登录。免密激活病情画像云同步及多模型自愈沙盒。'
            : 'Click below to instantly activate client-server intelligence and profiles backup.'}
        </p>

        {/* Alert boxes */}
        {error && (
          <div className="p-3 mb-4 w-full bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-xl text-[10.5px] flex gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 w-full bg-emerald-950/20 border border-emerald-950/30 text-emerald-300 rounded-xl text-[10.5px] flex gap-2 text-left animate-pulse">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        <button
          onClick={handleDemoLogin}
          type="button"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-purple-650 to-indigo-600 hover:from-purple-550 hover:to-indigo-550 active:from-purple-750 active:to-indigo-750 text-white border border-purple-500/30 rounded-xl text-xs font-bold cursor-pointer flex justify-center items-center gap-2 transition duration-150 relative overflow-hidden group shadow-lg shadow-purple-950/60 font-sans shrink-0 active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
          ) : (
            <>
              <Zap className="h-4 w-4 text-purple-300 animate-pulse" />
              <span>
                {language === 'ZH' ? '一键模拟登录 / Quick Login' : 'Quick Instant Login'}
              </span>
            </>
          )}
        </button>

        {/* Local username/password (test-friendly, .env default account) */}
        <form onSubmit={handleLocalAuth} className="mt-5 w-full space-y-2.5 text-left">
          <div className="relative flex items-center justify-center py-0.5">
            <div className="absolute inset-0 border-t border-white/5"></div>
            <span className="relative bg-[#0d0d11] px-2 text-[8px] text-zinc-500 uppercase tracking-widest font-mono">
              {language === 'ZH' ? '账号密码登录 / 注册（测试）' : 'Username / Password (test)'}
            </span>
          </div>
          {mode === 'register' && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={language === 'ZH' ? '昵称（可选）' : 'Display name (optional)'}
              className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-500/40 font-mono"
            />
          )}
          <div className="relative">
            <span className="absolute left-3 top-2 text-zinc-500"><UserIcon className="h-3.5 w-3.5" /></span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={language === 'ZH' ? '用户名 (默认 admin)' : 'Username (default admin)'}
              className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-500/40 font-mono"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-zinc-500"><Lock className="h-3.5 w-3.5" /></span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === 'ZH' ? '密码 (默认 pancreas123)' : 'Password (default pancreas123)'}
              className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-teal-500/40 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-[11px] font-bold cursor-pointer transition flex justify-center items-center gap-1.5"
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            ) : (
              <span>{mode === 'login' ? (language === 'ZH' ? '账号登录' : 'Sign In') : (language === 'ZH' ? '账号注册' : 'Register')}</span>
            )}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-[9px] text-zinc-500 hover:text-teal-400 transition cursor-pointer underline"
            >
              {mode === 'login'
                ? (language === 'ZH' ? '没有账号？点此注册' : 'No account? Register')
                : (language === 'ZH' ? '已有账号？切换登录' : 'Have an account? Sign in')}
            </button>
          </div>
        </form>

        {/* Collapsible toggle for Advanced methods (Google/Email) */}
        <div className="mt-5 w-full">
          <details className="group cursor-pointer select-none">
            <summary className="text-[9.5px] text-zinc-500 group-hover:text-zinc-400 transition flex items-center justify-center gap-1 list-none outline-none">
              <span>{language === 'ZH' ? '🔒 其它专业登录方式 (高级)' : '🔒 Advanced Authentication (OAuth/Email)'}</span>
              <ChevronDown className="h-3 w-3 transition duration-200 group-open:rotate-180" />
            </summary>
            
            <div className="mt-4 pt-4 border-t border-white/5 space-y-4 text-left animate-fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  {language === 'ZH' ? '方式一：Google 账号安全快连' : 'Method 1: Google login'}
                </span>
                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  disabled={isLoading}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-805 text-zinc-350 hover:text-white border border-white/10 rounded-xl text-[11px] font-semibold cursor-pointer flex justify-center items-center gap-2 transition font-sans"
                >
                  <Chrome className="h-3.5 w-3.5 text-rose-500" />
                  <span>
                    {language === 'ZH' ? '使用 Google 账号登录' : 'Sign in with Google'}
                  </span>
                </button>
              </div>

              <div className="relative flex items-center justify-center py-0.5">
                <div className="absolute inset-0 border-t border-white/5"></div>
                <span className="relative bg-[#0d0d11] px-2 text-[8px] text-zinc-600 uppercase tracking-widest font-mono">
                  {language === 'ZH' ? '方式二：电子邮箱 / Standard' : 'Method 2: Email Password'}
                </span>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 font-mono uppercase">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 font-mono uppercase">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-white/10 hover:border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-purple-500/40 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-purple-700 hover:bg-purple-650 text-white rounded-xl text-[11px] font-bold cursor-pointer transition flex justify-center items-center gap-1.5"
                >
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                  ) : (
                    <span>{mode === 'login' ? (language === 'ZH' ? '立即登录' : 'Sign In') : (language === 'ZH' ? '注 册' : 'Register')}</span>
                  )}
                </button>

                <div className="text-center pt-1 animate-pulse">
                  <button
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    type="button"
                    className="text-[9px] text-zinc-500 hover:text-purple-400 transition cursor-pointer underline"
                  >
                    {mode === 'login' ? (language === 'ZH' ? '还没有账号？极速注册' : 'Create an Account') : (language === 'ZH' ? '已有账号？切换登录' : 'Switch to Sign In')}
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="relative font-sans" id="user-auth-module">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-xs font-bold text-purple-300 tracking-wide font-sans truncate max-w-[140px]">
              {user.displayName || user.email?.split('@')[0] || 'Authenticated User'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {isDemoUser ? 'DEMO NODE' : 'CLOUD AUTH'}
            </span>
          </div>

          <div className="relative group">
            <div className="p-1 px-1.5 bg-zinc-900 border border-white/10 group-hover:border-purple-500/30 rounded-xl flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow font-sans uppercase">
                {(user.displayName?.slice(0, 1) || user.email?.slice(0, 1) || 'U')}
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-450 transition cursor-pointer"
                title={language === 'ZH' ? '退出登录' : 'Logout'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-purple-900/20 active:scale-95 font-sans"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>{language === 'ZH' ? '登录 / 注册' : 'Sign In / Register'}</span>
        </button>
      )}

      {/* Auth Modal Container overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          {renderLoginForm(true, false)}
        </div>
      )}

    </div>
  );
}
