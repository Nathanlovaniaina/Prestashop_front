import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { LoginService } from '../services/LoginService';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await LoginService.login(email, password);

    if (result.success) {
      navigate('/products'); // Navigate to products after login
    } else {
      setError(result.error || 'Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f5f6f7',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #bbcdd2',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '40px 30px', 
          textAlign: 'center',
          backgroundColor: '#363a41',
          color: 'white'
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: '#25b9d7', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px',
            boxShadow: '0 4px 10px rgba(37, 185, 215, 0.3)'
          }}>
            <LogIn size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>PrestaShop Admin</h1>
          <p style={{ fontSize: '14px', color: '#abb1b9', marginTop: '8px' }}>Connectez-vous pour gérer votre boutique</p>
        </div>

        <div style={{ padding: '40px 30px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6c868e', marginBottom: '8px', textTransform: 'uppercase' }}>
                Adresse e-mail
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#bbcdd2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shop.com"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    border: '1px solid #bbcdd2', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6c868e', marginBottom: '8px', textTransform: 'uppercase' }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#bbcdd2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    border: '1px solid #bbcdd2', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ 
                backgroundColor: '#fff5f5', 
                color: '#f44336', 
                padding: '12px', 
                borderRadius: '4px', 
                fontSize: '13px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #f9d6d6'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-ps btn-ps-primary"
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: '#25b9d7',
                border: 'none',
                color: 'white',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {loading ? <Loader2 size={20} className="spin" /> : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <a href="/" style={{ fontSize: '13px', color: '#25b9d7', textDecoration: 'none' }}>
              ← Retour au Front Office
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
