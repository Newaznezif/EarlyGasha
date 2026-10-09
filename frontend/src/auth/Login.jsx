import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldAlert, Lock, Mail, CheckCircle } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import AuthLayout from './AuthLayout';

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
      let errorMsg = err.message || "Unable to sign in. Please check your email and password.";

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
      setError(err.response?.data?.detail || err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" description="Access your EarlyGasha account.">
      <div className="space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && !error && (
          <div role="status" className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <GoogleSignInButton
          onCredential={handleGoogleSignIn}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />
        <div className="relative flex items-center py-1">
          <div className="w-full border-t border-edge" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-element px-3 text-xs text-muted">or continue with email</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-sm font-medium text-default">Email address</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-edge bg-element px-3 py-2.5 text-sm text-default placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-default">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full rounded-md border border-edge bg-element px-3 py-2.5 text-sm text-default placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="border-t border-edge pt-4">
          <p className="text-sm text-muted">
            New to EarlyGasha? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
