import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';
import { validateEmail } from '../utils/validation';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  // Email validasyonu
  const validateEmailInput = (email: string) => {
    const result = validateEmail(email);
    return result.isValid ? '' : result.error!;
  };

  // Gerçek zamanlı validasyon
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmailInput(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validasyonu
    const emailValidation = validateEmailInput(email);
    setEmailError(emailValidation);
    
    if (emailValidation) {
      setMessage('Lütfen geçerli bir e-posta adresi giriniz');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        setMessage(data.message);
      } else {
        setIsSuccess(false);
        setMessage(data.message || 'Bir hata oluştu');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('Sunucu bağlantısında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="logo-section">
            <img 
              src="/logo.png" 
              alt="AdaYazılım Logo" 
              className="company-logo"
            />
          </div>
          
          <div className="forgot-password-header">
            <h2>Şifremi Unuttum</h2>
            <p>E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim</p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="forgot-password-form">
              <div className="form-group">
                <label htmlFor="email">E-posta Adresi</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailError(validateEmailInput(email))}
                  placeholder="ornek@email.com"
                  required
                  disabled={loading}
                  className={emailError ? 'error' : ''}
                />
                {emailError && <span className="error-text">{emailError}</span>}
              </div>

              {message && (
                <div className={`message ${isSuccess ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              <button 
                type="submit" 
                className="login-button" 
                disabled={loading || !!emailError}
              >
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
              </button>

              <div className="auth-switch">
                <button type="button" onClick={() => navigate('/login')} className="switch-button">
                  ← Giriş sayfasına dön
                </button>
              </div>
            </form>
          ) : (
            <div className="success-message">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </svg>
              </div>
              <h3>E-posta Gönderildi!</h3>
              <p>{message}</p>
              <p className="note">
                E-posta kutunuzu kontrol edin. Eğer e-posta gelmezse spam klasörünü de kontrol edin.
              </p>
              <button onClick={() => navigate('/login')} className="login-button">
                Giriş sayfasına dön
              </button>
            </div>
          )}
        </div>
      </div>
      
      <footer className="login-footer">
        <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
        <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
      </footer>
    </div>
  );
};

export default ForgotPassword; 