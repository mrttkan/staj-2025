import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import AddressSelector from './AddressSelector';
import {
  validateName,
  validatePhone,
  validateEmail,
  validateTcKimlik,
  validatePostalCode,
  validatePassword,
  validateIncome,
  validateCity,
  validateDistrict,
  validateNeighborhood,
  validateAddress,
  validateProfession,
  formatPhone,
  formatTcKimlik,
  formatPostalCode,
  formatName
} from '../utils/validation';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefon: '',
    // Müşteri bilgileri - artık tüm müşteriler için ortak
    tcKimlikNo: '',
    dogumTarihi: '',
    cinsiyet: 1, // Varsayılan: Erkek
    medeniDurum: 1, // Varsayılan: Bekar
    meslek: '',
    egitimDurumu: 1, // Varsayılan: İlkokul
    aylikGelir: '',
    adresIl: '',
    adresIlce: '',
    adresMahalle: '',
    adresSokak: '',
    adresDetay: '',
    postaKodu: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string | null}>({
    ad: null,
    soyad: null,
    email: null,
    password: null,
    confirmPassword: null,
    telefon: null,
    tcKimlikNo: null,
    dogumTarihi: null,
    cinsiyet: null,
    medeniDurum: null,
    meslek: null,
    egitimDurumu: null,
    aylikGelir: null,
    adresIl: null,
    adresIlce: null,
    adresMahalle: null,
    adresSokak: null,
    adresDetay: null,
    postaKodu: null
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    
    // Format değerleri
    switch (e.target.name) {
      case 'ad':
      case 'soyad':
        value = formatName(value);
        break;
      case 'telefon':
        value = formatPhone(value);
        break;
      case 'tcKimlikNo':
        value = formatTcKimlik(value);
        break;
      case 'postaKodu':
        value = formatPostalCode(value);
        break;
      case 'meslek':
        value = formatName(value);
        break;
      case 'adresIl':
      case 'adresIlce':
        value = formatName(value);
        break;
      case 'adresMahalle':
      case 'adresSokak':
        // Mahalle ve sokak için rakam da kabul ediyoruz
        value = value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s'-]/g, '').slice(0, 100);
        break;
      case 'adresDetay':
        // Adres detayı için özel karakterler de kabul ediyoruz
        value = value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s.,/'-]/g, '').slice(0, 500);
        break;
      case 'aylikGelir':
        // Sadece rakam ve nokta
        value = value.replace(/[^\d.]/g, '');
        break;
    }

    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  const validateForm = () => {
    // Ad validasyonu
    const adValidation = validateName(formData.ad, 'Ad');
    if (!adValidation.isValid) {
      setMessage(adValidation.error!);
      return false;
    }

    // Soyad validasyonu
    const soyadValidation = validateName(formData.soyad, 'Soyad');
    if (!soyadValidation.isValid) {
      setMessage(soyadValidation.error!);
      return false;
    }

    // E-posta validasyonu
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setMessage(emailValidation.error!);
      return false;
    }

    // Telefon validasyonu
    const phoneValidation = validatePhone(formData.telefon);
    if (!phoneValidation.isValid) {
      setMessage(phoneValidation.error!);
      return false;
    }

    // Şifre validasyonu
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setMessage(passwordValidation.error!);
      return false;
    }

    // Şifre eşleşme kontrolü
    if (formData.password !== formData.confirmPassword) {
      setMessage('Şifreler eşleşmiyor');
      return false;
    }

    // TC Kimlik No validasyonu (opsiyonel)
    if (formData.tcKimlikNo) {
      const tcValidation = validateTcKimlik(formData.tcKimlikNo);
      if (!tcValidation.isValid) {
        setMessage(tcValidation.error!);
        return false;
      }
    }

    // Meslek validasyonu (opsiyonel)
    if (formData.meslek) {
      const meslekValidation = validateProfession(formData.meslek);
      if (!meslekValidation.isValid) {
        setMessage(meslekValidation.error!);
        return false;
      }
    }

    // Aylık gelir validasyonu (opsiyonel)
    if (formData.aylikGelir) {
      const incomeValidation = validateIncome(formData.aylikGelir);
      if (!incomeValidation.isValid) {
        setMessage(incomeValidation.error!);
        return false;
      }
    }

    // İl validasyonu
    const cityValidation = validateCity(formData.adresIl);
    if (!cityValidation.isValid) {
      setMessage(cityValidation.error!);
      return false;
    }

    // İlçe validasyonu
    const districtValidation = validateDistrict(formData.adresIlce);
    if (!districtValidation.isValid) {
      setMessage(districtValidation.error!);
      return false;
    }

    // Mahalle validasyonu
    const neighborhoodValidation = validateNeighborhood(formData.adresMahalle);
    if (!neighborhoodValidation.isValid) {
      setMessage(neighborhoodValidation.error!);
      return false;
    }

    // Adres detayı validasyonu
    const addressValidation = validateAddress(formData.adresDetay);
    if (!addressValidation.isValid) {
      setMessage(addressValidation.error!);
      return false;
    }

    // Posta kodu validasyonu (opsiyonel)
    if (formData.postaKodu) {
      const postalValidation = validatePostalCode(formData.postaKodu);
      if (!postalValidation.isValid) {
        setMessage(postalValidation.error!);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    console.log('Form validasyonu başlıyor...');
    if (!validateForm()) {
      console.log('Form validasyonu başarısız');
      setLoading(false);
      return;
    }

    console.log('Form validasyonu başarılı, register data hazırlanıyor...');
    // Register data'yı hazırla - boş string'leri undefined yap
    const registerData = {
      ad: formData.ad,
      soyad: formData.soyad,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      telefon: formData.telefon.replace(/\D/g, ''),
      // Müşteri bilgileri - artık tüm müşteriler için ortak
      tcKimlikNo: formData.tcKimlikNo ? formData.tcKimlikNo.replace(/\D/g, '') : undefined,
      dogumTarihi: formData.dogumTarihi || undefined,
      cinsiyet: formData.cinsiyet,
      medeniDurum: formData.medeniDurum,
      meslek: formData.meslek || undefined,
      egitimDurumu: formData.egitimDurumu,
      aylikGelir: formData.aylikGelir ? parseFloat(formData.aylikGelir) : undefined,
      adresIl: formData.adresIl,
      adresIlce: formData.adresIlce,
      adresMahalle: formData.adresMahalle,
      adresDetay: formData.adresDetay,
      postaKodu: formData.postaKodu || undefined
    };

    console.log('Register data:', registerData);

    try {
      console.log('Register API çağrısı yapılıyor...');
      const result = await register(registerData);
      console.log('Register API yanıtı:', result);

      if (result.success) {
        console.log('Kayıt başarılı!');
        setMessage('Kayıt başarılı! Giriş yapabilirsiniz.');
        // Başarılı kayıt sonrası login sayfasına yönlendir
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        console.log('Kayıt başarısız:', result.message);
        setMessage(`Kayıt başarısız: ${result.message}`);
      }
    } catch (error) {
      console.error('Register API hatası:', error);
      setMessage('Sunucu hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card register-card">
          <div className="logo-section register-logo-section">
            <img 
              src="/logo.png" 
              alt="AdaYazılım Logo" 
              className="company-logo register-logo"
            />
          </div>
          
          <h2>Sigorta Yönetim Platformu</h2>
          <h3>Kayıt Ol</h3>
          
          <form 
            onSubmit={handleSubmit} 
            autoComplete="on"
            method="post"
            action=""
            noValidate
          >
            <input type="hidden" name="form-name" value="register-form" />
            {/* Temel Bilgiler */}
            <div className="form-section">
              <h4>Temel Bilgiler</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ad">Ad:</label>
                  <input
                    type="text"
                    id="ad"
                    name="ad"
                    value={formData.ad}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    disabled={loading}
                    placeholder="Adınızı giriniz"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="soyad">Soyad:</label>
                  <input
                    type="text"
                    id="soyad"
                    name="soyad"
                    value={formData.soyad}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    disabled={loading}
                    placeholder="Soyadınızı giriniz"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">E-posta:</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="E-posta adresinizi giriniz"
                    autoComplete="username email"
                    spellCheck="false"
                    aria-label="E-posta adresi"
                    data-lpignore="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefon">Telefon:</label>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loading}
                    placeholder="5XXXXXXXXX (sadece rakam)"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Şifre:</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="Şifrenizi giriniz (en az 12 karakter)"
                    autoComplete="new-password"
                    spellCheck="false"
                    aria-label="Yeni şifre"
                    data-lpignore="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Şifre Tekrarı:</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="Şifrenizi tekrar giriniz"
                    autoComplete="new-password"
                    spellCheck="false"
                    aria-label="Şifre tekrarı"
                    data-lpignore="true"
                  />
                </div>
              </div>
            </div>

            {/* Kimlik Bilgileri */}
            <div className="form-section">
              <h4>Kimlik Bilgileri</h4>
              <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tcKimlikNo">TC Kimlik No:</label>
                    <input
                      type="text"
                      id="tcKimlikNo"
                      name="tcKimlikNo"
                      value={formData.tcKimlikNo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      placeholder="11 haneli TC Kimlik No"
                      maxLength={11}
                    />
                  </div>
              </div>
            </div>

                        {/* Kişisel Bilgiler */}
            <div className="form-section">
              <h4>Kişisel Bilgiler</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dogumTarihi">Doğum Tarihi:</label>
                    <input
                      type="date"
                      id="dogumTarihi"
                      name="dogumTarihi"
                      value={formData.dogumTarihi}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cinsiyet">Cinsiyet:</label>
                    <select
                      id="cinsiyet"
                      name="cinsiyet"
                      value={formData.cinsiyet}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value={1}>Erkek</option>
                      <option value={2}>Kadın</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="medeniDurum">Medeni Durum:</label>
                    <select
                      id="medeniDurum"
                      name="medeniDurum"
                      value={formData.medeniDurum}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value={1}>Bekar</option>
                      <option value={2}>Evli</option>
                      <option value={3}>Boşanmış</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="egitimDurumu">Eğitim Durumu:</label>
                    <select
                      id="egitimDurumu"
                      name="egitimDurumu"
                      value={formData.egitimDurumu}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value={1}>İlkokul</option>
                      <option value={2}>Ortaokul</option>
                      <option value={3}>Lise</option>
                      <option value={4}>Üniversite</option>
                      <option value={5}>Yüksek Lisans</option>
                      <option value={6}>Doktora</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="meslek">Meslek:</label>
                    <input
                      type="text"
                      id="meslek"
                      name="meslek"
                      value={formData.meslek}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      placeholder="Mesleğinizi giriniz"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="aylikGelir">Aylık Gelir (₺):</label>
                    <input
                      type="number"
                      id="aylikGelir"
                      name="aylikGelir"
                      value={formData.aylikGelir}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={loading}
                      placeholder="Aylık gelirinizi giriniz"
                      min="0"
                    />
                  </div>
                </div>
              </div>

            {/* Adres Bilgileri */}
            <div className="form-section">
              <h4>📍 Adres Bilgileri</h4>
              
              <AddressSelector
                selectedIl={formData.adresIl}
                selectedIlce={formData.adresIlce}
                selectedMahalle={formData.adresMahalle}
                selectedSokak={formData.adresSokak}
                onIlChange={(il) => setFormData(prev => ({ ...prev, adresIl: il }))}
                onIlceChange={(ilce) => setFormData(prev => ({ ...prev, adresIlce: ilce }))}
                onMahalleChange={(mahalle) => setFormData(prev => ({ ...prev, adresMahalle: mahalle }))}
                onSokakChange={(sokak) => setFormData(prev => ({ ...prev, adresSokak: sokak }))}
                disabled={loading}
                showSokak={true}
                ilError={errors.adresIl}
                ilceError={errors.adresIlce}
                mahalleError={errors.adresMahalle}
              />

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="postaKodu">Posta Kodu:</label>
                  <input
                    type="text"
                    id="postaKodu"
                    name="postaKodu"
                    value={formData.postaKodu}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loading}
                    placeholder="Posta kodunu giriniz"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="adresDetay">Açık Adres:</label>
                <textarea
                  id="adresDetay"
                  name="adresDetay"
                  value={formData.adresDetay}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading}
                  placeholder="Sokak, cadde, bina no, daire no vb."
                  rows={3}
                />
              </div>
            </div>

            {message && (
              <div className={message.toLowerCase().includes('başarısız') || message.toLowerCase().includes('hata') ? 'error-message' : 'success-message'}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="auth-switch">
            <p>Zaten hesabınız var mı?</p>
            <button 
              type="button" 
              onClick={() => navigate('/login')}
              className="switch-button"
            >
              Giriş Yap
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

export default Register; 