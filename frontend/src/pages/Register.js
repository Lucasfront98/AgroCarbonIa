import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('produtor'); // 'produtor' or 'comprador'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const data = await register(name, email, password, role);
      if (data.role === 'produtor') {
        navigate('/dashboard/produtor');
      } else {
        navigate('/dashboard/comprador');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao realizar o cadastro. Tente outro e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '3rem 2.5rem', width: '100%', maxWidth: '520px' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="font-mono" style={{ color: 'var(--green)', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Junte-se à plataforma</span>
          <h2 className="font-clash" style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Criar conta grátis</h2>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Role selector cards */}
          <div className="form-group">
            <label className="form-label">Selecione seu Perfil de Acesso</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              
              {/* Producer Option Card */}
              <div
                onClick={() => setRole('produtor')}
                style={{
                  backgroundColor: role === 'produtor' ? 'var(--surface2)' : 'var(--bg)',
                  border: role === 'produtor' ? '1px solid var(--green)' : '1px solid var(--border)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🚜</span>
                <span className="font-clash" style={{ fontSize: '0.95rem', display: 'block', fontWeight: 600, color: role === 'produtor' ? 'var(--green)' : 'var(--text)' }}>
                  Produtor Rural
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>Quero avaliar e vender créditos</span>
              </div>

              {/* Buyer Option Card */}
              <div
                onClick={() => setRole('comprador')}
                style={{
                  backgroundColor: role === 'comprador' ? 'var(--surface2)' : 'var(--bg)',
                  border: role === 'comprador' ? '1px solid var(--green)' : '1px solid var(--border)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>💼</span>
                <span className="font-clash" style={{ fontSize: '0.95rem', display: 'block', fontWeight: 600, color: role === 'comprador' ? 'var(--green)' : 'var(--text)' }}>
                  Comprador ESG
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>Quero comprar créditos verificados</span>
              </div>

            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">E-mail Corporativo ou Pessoal</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label">Confirmar Senha</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Cadastrando conta...' : 'Concluir Cadastro'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Já possui uma conta? &nbsp;
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600 }}>
            Fazer Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
