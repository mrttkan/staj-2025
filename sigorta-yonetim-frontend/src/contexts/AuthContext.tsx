import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  ad: string;
  soyad: string;
  email: string;
  telefon?: string;
  roles: string[];
  // KULLANICILAR tablosu ile entegrasyon
  kullanicilarId?: number;
  kayitTarihi?: string;
  emailDogrulandi?: boolean;
  // MUSTERILER tablosu ile entegrasyon (KULLANICI rolü için)
  musteriId?: number;
  // Müşteri bilgileri
  tcKimlikNo?: string;
  dogumTarihi?: string;
  cinsiyet?: number;
  medeniDurum?: number;
  meslek?: string;
  egitimDurumu?: number;
  aylikGelir?: number;
  adresIl?: string;
  adresIlce?: string;
  adresMahalle?: string;
  adresDetay?: string;
  postaKodu?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

interface RegisterData {
  ad: string;
  soyad: string;
  email: string;
  password: string;
  confirmPassword: string;
  telefon: string;
  // Müşteri bilgileri - artık tüm müşteriler için ortak
  tcKimlikNo?: string;
  dogumTarihi?: string;
  cinsiyet?: number;
  medeniDurum?: number;
  meslek?: string;
  egitimDurumu?: number;
  aylikGelir?: number;
  adresIl: string;
  adresIlce: string;
  adresMahalle: string;
  adresDetay: string;
  postaKodu?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Token'ın süresi dolup dolmadığını kontrol et
  const isTokenExpired = (): boolean => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return true;
    
    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  };

  // Token yenileme fonksiyonu
  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) return false;

      const response = await fetch('/api/Auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  // Sayfa yüklendiğinde localStorage'dan token ve kullanıcı bilgilerini kontrol et
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Token süresi dolmuşsa yenilemeye çalış
          if (isTokenExpired()) {
            console.log('Token süresi dolmuş, yenilenmeye çalışılıyor...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              // Yenileme başarısızsa logout yap
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          // Geçersiz JSON, localStorage'ı temizle
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Token süresi dolduğunda otomatik yenileme
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiry = async () => {
      if (isTokenExpired()) {
        console.log('Token süresi doldu, yenilenmeye çalışılıyor...');
        const refreshed = await refreshToken();
        if (!refreshed) {
          logout();
        }
      }
    };

    // Her 5 dakikada bir token süresini kontrol et
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Güvenlik başlıkları ile istek
      const response = await fetch('/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password: password,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent.substring(0, 100) // Kısıtlı user agent bilgisi
        }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Token ve kullanıcı bilgilerini güvenli şekilde sakla
        setToken(data.token);
        setUser(data.user);
        
        // Güvenli localStorage kullanımı
        try {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('loginTime', new Date().toISOString());
          localStorage.setItem('appVersion', '1.0.0');
        } catch (storageError) {
          console.warn('LocalStorage yazma hatası:', storageError);
        }
        
        return { success: true, message: data.message || 'Giriş başarılı' };
      } else {
        return { success: false, message: data.message || 'Giriş başarısız' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Bağlantı hatası oluştu' };
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('AuthContext: Register API çağrısı başlıyor...');
      console.log('AuthContext: Gönderilen data:', data);

      const response = await fetch('/api/Auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('AuthContext: API yanıtı status:', response.status);
      console.log('AuthContext: API yanıtı headers:', response.headers);

      const result = await response.json();
      console.log('AuthContext: API yanıtı body:', result);

      if (result.success && result.token) {
        console.log('AuthContext: Kayıt başarılı, otomatik giriş yapılıyor...');
        // Kayıt başarılı, otomatik giriş yap
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        return { success: true, message: result.message };
      } else {
        console.log('AuthContext: Kayıt başarısız:', result.message);
        let errorMessage = result.message || 'Kayıt başarısız';
        
        // HTTP status koduna göre daha açıklayıcı mesajlar
        if (response.status === 400) {
          errorMessage = `Geçersiz veri: ${result.message}`;
        } else if (response.status === 500) {
          errorMessage = `Sunucu hatası: ${result.message}`;
        } else if (response.status === 0) {
          errorMessage = 'Sunucuya bağlanılamıyor. Backend çalışıyor mu?';
        }
        
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('AuthContext: Register error:', error);
      let errorMessage = 'Sunucu hatası oluştu';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Sunucuya bağlanılamıyor. Backend çalışıyor mu?';
      } else if (error instanceof Error) {
        errorMessage = `Hata: ${error.message}`;
      }
      
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user && !!token;

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
    refreshToken,
    isTokenExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 