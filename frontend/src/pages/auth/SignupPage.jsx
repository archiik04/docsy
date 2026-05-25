import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { useAuthStore } from '../../stores/authStore';

export function SignupPage() {
  const navigate = useNavigate();
  const { register, loading, error, setError } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Clear errors when entering the page
  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name || !password) return;

    const success = await register(email.trim(), name.trim(), password);
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
          <button className="pill-button" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </nav>

      <div className="auth-card-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '420px', marginTop: '60px' }}>
        <div className="auth-card glass-panel animate-fade-in">
          <div className="auth-header">
            <h2 className="auth-title">
              Begin your <span className="title-serif">research</span>
            </h2>
            <p className="auth-subtitle">Create a secure profile to start indexing</p>
          </div>

          {error && (
            <div className="auth-error-alert shake">
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input form-input-premium-focus"
                placeholder="Isaac Newton"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input form-input-premium-focus"
                placeholder="isaac@principia.org"
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
                  <Loader2 size={16} className="animate-spin" /> Ingesting credential...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-switch">
            Already registered?{' '}
            <span className="auth-switch-link" onClick={() => navigate('/login')}>
              Sign in
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

