import React, { useState, useContext } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { fetchAPI } from '../../services/api';
import './Login.css';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetchAPI('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.success) {
      login(res.usuario, res.token);
    } else {
      setError(res.message || 'Credenciales inválidas');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header" style={{textAlign: 'center', marginBottom: '2rem'}}>
          <img src="/logo.png" alt="JIZFact Logo" style={{height: '100px', margin: '0 auto 10px', display: 'block', objectFit: 'contain'}} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{fontSize: '2.5rem', margin: 0, color: '#0f172a', letterSpacing: '4px', fontWeight: '900'}}>JIZFact</h1>
          <p style={{fontSize: '0.9rem', letterSpacing: '3px', color: '#64748b', textTransform: 'uppercase', marginTop: '5px', marginBottom: '1.5rem', fontWeight: '600'}}>Sistema de Facturación</p>
          
          <div style={{display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6', flexWrap: 'wrap'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>RÁPIDO</span> <span style={{color: '#cbd5e1'}}>|</span>
            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>SEGURO</span> <span style={{color: '#cbd5e1'}}>|</span>
            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>INTUITIVO</span> <span style={{color: '#cbd5e1'}}>|</span>
            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>EFICIENTE</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" />
              <input 
                type="email" 
                className="form-control" 
                placeholder="admin@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-icon-wrapper">
              <Lock className="input-icon" />
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="primary-btn submit-btn" disabled={loading}>
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> Conectando...</>
            ) : (
              <>Ingresar <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
