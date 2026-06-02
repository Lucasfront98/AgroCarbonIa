import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (anchorId) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: anchorId } });
    } else {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const dashboardUrl = role === 'produtor' ? '/dashboard/produtor' : '/dashboard/comprador';

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 999,
          backgroundColor: scrolled ? 'var(--surface)' : 'rgba(9, 16, 13, 0.95)',
          borderBottom: scrolled ? '1px solid var(--border2)' : '1px solid var(--border)',
          transition: 'var(--transition)',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            className="font-clash"
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              letterSpacing: '0.05em',
            }}
          >
            AGRO<span style={{ color: 'var(--text)' }}>CARBON</span>
            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--border2)', color: 'var(--green)', padding: '0.1rem 0.3rem', marginLeft: '0.4rem', fontWeight: 500, fontFamily: 'Satoshi' }}>IA</span>
          </Link>

          {/* Links Center - Desktop */}
          <div
            className="nav-links-desktop"
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
            }}
          >
            <span style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }} onClick={() => handleNavClick('como-funciona')}>Como funciona</span>
            <Link to="/marketplace" style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Marketplace</Link>
            <Link to="/avaliar" style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Avaliação</Link>
            <span style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }} onClick={() => handleNavClick('por-que-nos')}>Por que nós</span>
          </div>

          {/* Action buttons - Desktop */}
          <div
            className="nav-actions-desktop"
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {isAuthenticated ? (
              <>
                <Link to={dashboardUrl} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  Entrar
                </Link>
                <Link to="/cadastro" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  Criar conta grátis
                </Link>
              </>
            )}
          </div>

          {/* Burger - Mobile (<= 768px display via CSS) */}
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'none',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '24px',
              height: '18px',
              padding: 0,
            }}
            aria-label="Toggle menu"
          >
            <span style={{ width: '100%', height: '2px', backgroundColor: 'var(--text)', transition: 'var(--transition)', transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
            <span style={{ width: '100%', height: '2px', backgroundColor: 'var(--text)', transition: 'var(--transition)', opacity: mobileMenuOpen ? 0 : 1 }}></span>
            <span style={{ width: '100%', height: '2px', backgroundColor: 'var(--text)', transition: 'var(--transition)', transform: mobileMenuOpen ? 'rotate(-45deg) translate(6px, -7px)' : 'none' }}></span>
          </button>
        </div>
      </nav>

      {/* Full screen dropdown menu - Mobile */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            width: '100%',
            height: 'calc(100vh - 70px)',
            backgroundColor: 'var(--bg)',
            borderTop: '1px solid var(--border)',
            zIndex: 998,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <span
              style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}
              onClick={() => handleNavClick('como-funciona')}
            >
              Como funciona
            </span>
            <Link
              to="/marketplace"
              style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link
              to="/avaliar"
              style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Avaliação
            </Link>
            <span
              style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}
              onClick={() => handleNavClick('por-que-nos')}
            >
              Por que nós
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardUrl}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost"
                  style={{ width: '100%', padding: '1rem' }}
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-ghost"
                  style={{ width: '100%', padding: '1rem', border: '1px solid var(--border)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Criar conta grátis
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global CSS overrides for responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop, .nav-actions-desktop {
            display: none !important;
          }
          .hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
