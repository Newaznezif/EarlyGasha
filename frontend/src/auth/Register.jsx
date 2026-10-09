import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldAlert } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import AuthLayout from './AuthLayout';

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
    <AuthLayout title="Create your account" description="Register to access Ethiopia regional monitoring.">
      <div className="space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <GoogleSignInButton
          onCredential={handleGoogleSignIn}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />
        <div className="relative flex items-center py-1">
          <div className="w-full border-t border-edge" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-element px-3 text-xs text-muted">or register with email</span>
        </div>

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor="register-email" className="block text-sm font-medium text-default">Email address</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className="block text-sm font-medium text-default">Password</label>
            <input
              id="register-password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-edge bg-element px-3 py-2.5 text-sm text-default focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-confirm-password" className="block text-sm font-medium text-default">Confirm password</label>
            <input
              id="register-confirm-password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-edge bg-element px-3 py-2.5 text-sm text-default focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-role" className="block text-sm font-medium text-default">Account type</label>
            <select
              id="register-role"
              className="w-full rounded-md border border-edge bg-element px-3 py-2.5 text-sm text-default focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="institutional_user">Institutional User (NGO/Gov)</option>
              <option value="field_officer">Field Officer (Ground Reporting)</option>
              <option value="community_user">Community User (Alerts Only)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="border-t border-edge pt-4">
          <p className="text-sm text-muted">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Register;
