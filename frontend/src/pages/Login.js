import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect target
  const from = location.state?.from || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      // Redirect
      if (from) {
        navigate(from);
      } else if (data.role === 'produtor') {
        navigate('/dashboard/produtor');
      } else {
        navigate('/dashboard/comprador');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '3.5rem 2.5rem', width: '100%', maxWidth: '460px' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Seja bem-vindo de volta</span>
          <h2 className="font-clash" style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Acessar Plataforma</h2>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label className="form-label">E-mail de acesso</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label">Senha de segurança</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Acessando credenciais...' : 'Acessar Conta'}
          </button>
        </form>

        <div style={{ backgroundColor: 'rgba(76,200,130,0.05)', border: '1px dashed var(--border2)', padding: '1rem', marginTop: '2rem' }}>
          <span className="font-mono" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--green)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>
            Contas de Teste Integradas (MOCK_MODE):
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
            <div>• <strong>Produtor:</strong> produtor@agro.com.br / 123</div>
            <div>• <strong>Comprador:</strong> comprador@esg.com.br / 123</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Ainda não possui uma conta? &nbsp;
          <Link to="/cadastro" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Criar conta grátis
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
