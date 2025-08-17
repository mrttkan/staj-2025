import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';
import { validateEmail, validatePassword } from '../utils/validation';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Chrome password manager blocking
  useEffect(() => {
    const blockPasswordManagers = () => {
      // Remove all data-* attributes that password managers might use
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      passwordInputs.forEach((input) => {
        const element = input as HTMLInputElement;
        
        // Clear any autofill
        element.setAttribute('autocomplete', 'new-password');
        element.setAttribute('data-form-type', 'other');
        
        // Block common password manager attributes
        element.removeAttribute('data-dashlane-rid');
        element.removeAttribute('data-lastpass-icon-root');
        element.removeAttribute('data-1password-uuid');
        
        // Add custom styling to override manager injections
        element.style.backgroundImage = 'none';
        element.style.backgroundPosition = '0 0';
        element.style.backgroundRepeat = 'no-repeat';
        element.style.transition = 'none';
      });
    };

    // Run immediately and on interval
    blockPasswordManagers();
    const interval = setInterval(blockPasswordManagers, 100);

    return () => clearInterval(interval);
  }, []);

  // Additional security measures
  useEffect(() => {
    // Disable browser password saving prompt
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.setAttribute('autocomplete', 'off');
    });

    // Block right-click on password fields
    const handlePasswordRightClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'password') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('contextmenu', handlePasswordRightClick);
    return () => document.removeEventListener('contextmenu', handlePasswordRightClick);
  }, []);

  // Email validasyonu
  const validateEmailInput = (email: string) => {
    const result = validateEmail(email);
    return result.isValid ? '' : result.error!;
  };

  // Şifre validasyonu
  const validatePasswordInput = (password: string) => {
    const result = validatePassword(password);
    return result.isValid ? '' : result.error!;
  };

  // Gerçek zamanlı validasyon
  // handleEmailChange ve handlePasswordChange fonksiyonları kullanılmadığı için kaldırıldı

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validasyonu
    const emailValidation = validateEmailInput(email);
    const passwordValidation = validatePasswordInput(password);
    
    setEmailError(emailValidation);
    setPasswordError(passwordValidation);
    
    if (emailValidation || passwordValidation) {
      setMessage('Lütfen tüm alanları doğru şekilde doldurunuz');
      return;
    }

    setLoading(true);
    setMessage('');

    const result = await login(email, password);
    
    if (!result.success) {
      setMessage(result.message);
    }
    
    setLoading(false);
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
          
          <h2>Sigorta Yönetim Platformu</h2>
          <h3>Giriş Yap</h3>
          
          <form 
            onSubmit={handleSubmit} 
            autoComplete="off"
            method="post"
            action=""
            noValidate
            data-secure-form="true"
          >
            <input type="hidden" name="form-name" value="login-form" />
            <input type="hidden" name="form-id" value={`login-${Date.now()}`} />
            
            {/* Honeypot fields - hidden from users but visible to bots */}
            <div style={{position: 'absolute', left: '-5000px', top: '-5000px', opacity: 0, visibility: 'hidden'}}>
              <input type="text" name="username_fake" tabIndex={-1} autoComplete="off" />
              <input type="password" name="password_fake" tabIndex={-1} autoComplete="off" />
              <input type="email" name="email_fake" tabIndex={-1} autoComplete="off" />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">E-posta:</label>
              <input
                type="email"
                id="email"
                name="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="ornek@email.com"
                className={emailError !== null ? 'error' : ''}
                style={{ borderColor: emailError !== null ? '#dc3545' : '#e8e8e8' }}
                autoComplete="username email"
                spellCheck="false"
                aria-label="E-posta adresi"
                data-lpignore="true"
              />
              {emailError !== null && <span className="error-text">{emailError}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre:</label>
              <input
                ref={passwordRef}
                type="password"
                id="password"
                name="secure-password-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => {
                  // Additional security on focus
                  if (passwordRef.current) {
                    passwordRef.current.setAttribute('autocomplete', 'new-password');
                    passwordRef.current.style.backgroundColor = 'white';
                  }
                }}
                required
                disabled={loading}
                placeholder="Şifrenizi giriniz"
                className={passwordError !== null ? 'error password-secure' : 'password-secure'}
                autoComplete="new-password"
                spellCheck="false"
                aria-label="Güvenli şifre alanı"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                data-bwignore="true"
                data-dashlane-ignore="true"
                data-bitwarden-watching="1"
                autoCorrect="off"
                autoCapitalize="off"
                maxLength={50}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  // Block common password manager shortcuts
                  if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
                    e.preventDefault();
                  }
                }}
              />
              {passwordError !== null && <span className="error-text">{passwordError}</span>}
              <button 
                type="button" 
                onClick={() => navigate('/forgot-password')}
                className="forgot-password-link"
              >
                Şifremi Unuttum
              </button>
            </div>

            {message && (
              <div className={`message ${message.includes('başarı') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !!emailError || !!passwordError}
              className="login-button"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="auth-switch">
            <p>Hesabınız yok mu?</p>
            <button 
              type="button" 
              onClick={() => navigate('/register')}
              className="switch-button"
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      </div>
      
      <footer className="login-footer">
        <p className="copyright">© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır.</p>
        <p className="contact">İletişim: <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
      </footer>
    </div>
  );
};

export default Login; 