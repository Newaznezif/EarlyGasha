import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Globe, UserPlus, ShieldAlert, Lock, Mail } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [role, setRole] = useState('institutional_user');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    
    setIsLoading(true);
    setError(null);

    try {
      await register(email, password, role);
      setIsLoading(false);
      // Redirect to login after success as per requirements
      navigate('/login', { 
        state: { message: "Your account has been created. You can now sign in." }
      });
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let errorMsg = err.message || "Unable to create your account. Please try again.";
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        // Handle FastAPI validation error array
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
      const user = await googleLogin(credential, role);
      if (user.role === 'system_admin') navigate('/admin');
      else if (user.role === 'field_officer') navigate('/field');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 glass-card p-10 border border-[#1e1e24] shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Globe className="text-[#3b82f6] w-12 h-12 mb-4" />
          <h1 className="text-3xl font-black text-white tracking-tighter">CREATE <span className="text-[#3b82f6]">ACCOUNT</span></h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#64748b] mt-2">Register for an account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <GoogleSignInButton
            onCredential={handleGoogleSignIn}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
          <div className="relative flex items-center">
            <div className="w-full border-t border-[#1e1e24]" />
            <span className="absolute left-1/2 -translate-x-1/2 bg-[#0a0a0c] px-3 text-xs text-[#64748b]">or create an account with email</span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input 
                type="email" 
                required
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input 
                type="password" 
                required
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input 
                type="password" 
                required
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Account type</label>
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <select 
                className="w-full bg-[#16161a] border border-[#1e1e24] p-4 pl-12 rounded-xl text-white text-sm focus:outline-none focus:border-[#3b82f6] transition-all appearance-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="institutional_user">Institutional User (NGO/Gov)</option>
                <option value="field_officer">Field Officer (Ground Reporting)</option>
                <option value="community_user">Community User (Alerts Only)</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[#1e1e24]">
          <p className="text-xs text-[#64748b] font-medium">
            Already have an account? <Link to="/login" className="text-[#3b82f6] hover:underline font-bold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
