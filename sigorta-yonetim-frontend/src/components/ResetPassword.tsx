import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './ResetPassword.css';
import { validateStrongPassword } from '../utils/validation';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    }
  }, [searchParams]);

  // Şifre validasyonu
  const validatePasswordInput = (password: string) => {
    const result = validateStrongPassword(password);
    return result.isValid ? '' : result.error!;
  };

  // Şifre tekrarı validasyonu
  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) {
      return 'Şifre tekrarı gereklidir';
    }
    if (confirmPassword !== password) {
      return 'Şifreler eşleşmiyor';
    }
    return '';
  };

  // Gerçek zamanlı validasyon
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    setPasswordError(validatePasswordInput(value));
    if (confirmPassword) {
      setConfirmPasswordError(validateConfirmPassword(confirmPassword, value));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordError(validateConfirmPassword(value, newPassword));
  };

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToVerify }),
      });

      const data = await response.json();

      if (data.success) {
        setIsValidToken(true);
        setUserEmail(data.data?.email || '');
      } else {
        setIsValidToken(false);
        setMessage(data.message || 'Geçersiz token');
      }
    } catch (error) {
      setIsValidToken(false);
      setMessage('Token doğrulama sırasında hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validasyonu
    const passwordValidation = validatePasswordInput(newPassword);
    const confirmPasswordValidation = validateConfirmPassword(confirmPassword, newPassword);
    
    setPasswordError(passwordValidation);
    setConfirmPasswordError(confirmPasswordValidation);
    
    if (passwordValidation || confirmPasswordValidation) {
      setMessage('Lütfen şifre gereksinimlerini karşılayın');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        setMessage(data.message);
      } else {
        setIsSuccess(false);
        setMessage(data.message || 'Şifre sıfırlama başarısız');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('Sunucu bağlantısında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
            
            <div className="error-message">
              <div className="error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3>Geçersiz Bağlantı</h3>
              <p>Şifre sıfırlama bağlantısı geçersiz veya eksik.</p>
              <a href="/" className="switch-button">Ana sayfaya dön</a>
            </div>
          </div>
        </div>
        
        <footer className="login-footer">
          <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
          <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
        </footer>
      </div>
    );
  }

  if (!isValidToken) {
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
            
            <div className="error-message">
              <div className="error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3>Geçersiz veya Süresi Dolmuş Token</h3>
              <p>{message}</p>
              <a href="/" className="switch-button">Ana sayfaya dön</a>
            </div>
          </div>
        </div>
        
        <footer className="login-footer">
          <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
          <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
        </footer>
      </div>
    );
  }

  if (isSuccess) {
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
            
            <div className="success-message">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </svg>
              </div>
              <h3>Şifre Başarıyla Güncellendi!</h3>
              <p>{message}</p>
              <a href="/" className="login-button">Giriş sayfasına dön</a>
            </div>
          </div>
        </div>
        
        <footer className="login-footer">
          <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
          <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
        </footer>
      </div>
    );
  }

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
          
          <div className="reset-password-header">
            <h2>Yeni Şifre Belirleme</h2>
            <p>Yeni şifrenizi belirleyin</p>
            {userEmail && <p className="user-email">E-posta: {userEmail}</p>}
          </div>

          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">Yeni Şifre</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={handlePasswordChange}
                onBlur={() => setPasswordError(validatePasswordInput(newPassword))}
                placeholder="En az 8 karakter, büyük/küçük harf, rakam ve özel karakter"
                required
                disabled={loading}
                minLength={8}
                className={passwordError ? 'error' : ''}
              />
              {passwordError && <span className="error-text">{passwordError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Tekrarı</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={() => setConfirmPasswordError(validateConfirmPassword(confirmPassword, newPassword))}
                placeholder="Şifrenizi tekrar girin"
                required
                disabled={loading}
                className={confirmPasswordError ? 'error' : ''}
              />
              {confirmPasswordError && <span className="error-text">{confirmPasswordError}</span>}
            </div>

            {message && (
              <div className={`message ${isSuccess ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || !!passwordError || !!confirmPasswordError}
            >
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>
      </div>
      
      <footer className="login-footer">
        <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
        <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
      </footer>
    </div>
  );
};

export default ResetPassword; 