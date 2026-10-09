import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Globe, ShieldAlert, Lock, Mail, CheckCircle } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      setIsLoading(false);
      
      if (user.role === 'system_admin') {
        navigate('/admin');
      } else if (user.role === 'field_officer') {
        navigate('/field');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let errorMsg = "Unable to sign in. Please check your email and password.";

      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map(d => {
          if (typeof d === 'string') return d;
          if (d && typeof d === 'object') return d.msg || JSON.stringify(d);
          return String(d);
        }).join(", ");
      } else if (detail && typeof detail === 'object') {
        errorMsg = detail.msg || JSON.stringify(detail);
      }

      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await googleLogin(credential);
      if (user.role === 'system_admin') navigate('/admin');
      else if (user.role === 'field_officer') navigate('/field');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass-card p-10 border border-[#1e1e24] shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Globe className="text-[#3b82f6] w-12 h-12 mb-4" />
          <h1 className="text-3xl font-black text-white tracking-tighter">SIGN <span className="text-[#3b82f6]">IN</span></h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#64748b] mt-2">Access your account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && !error && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 text-emerald-500 text-xs font-bold animate-pulse">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="space-y-5">
          <GoogleSignInButton
            onCredential={handleGoogleSignIn}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
          <div className="relative flex items-center">
            <div className="w-full border-t border-[#1e1e24]" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-[#0a0a0c] px-3 text-xs text-[#64748b]">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input 
                type="email" 
                required
                placeholder="you@example.com"
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all placeholder:text-[#3a3a41]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all placeholder:text-[#3a3a41]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#1e1e24]">
          <p className="text-xs text-[#64748b] font-medium">
            Don't have an account? <Link to="/register" className="text-[#3b82f6] hover:underline font-bold">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
