import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, setError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Clear errors when entering the page
  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    const success = await login(email.trim(), password);
    if (success) {
      navigate('/workspace');
    }
  };

  return (
    <div className="auth-container">
      <AmbientBackground />
      
      {/* Thin, Premium Navbar */}
      <nav className="navbar">
        <Logo onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        <ul className="nav-links">
          <li><a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a></li>
        </ul>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button className="pill-button" onClick={() => navigate('/signup')}>
            Create Account
          </button>
        </div>
      </nav>

      <div className="auth-card-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '420px', marginTop: '60px' }}>
        <div className="auth-card glass-panel animate-fade-in">
          <div className="auth-header">
            <h2 className="auth-title">
              Welcome <span className="title-serif">back</span>
            </h2>
            <p className="auth-subtitle">Enter your credentials to enter the archive</p>
          </div>

          {error && (
            <div className="auth-error-alert shake">
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input form-input-premium-focus"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input form-input-premium-focus"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-switch">
            Don&apos;t have an account?{' '}
            <span className="auth-switch-link" onClick={() => navigate('/signup')}>
              Sign up
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

