// Validation fonksiyonları ve kuralları

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Ad ve Soyad için validation - sadece Türkçe harfler, boşluk ve tire
export const validateName = (value: string, fieldName: string = 'Bu alan'): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} zorunludur` };
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: `${fieldName} en az 2 karakter olmalıdır` };
  }
  
  if (value.trim().length > 50) {
    return { isValid: false, error: `${fieldName} en fazla 50 karakter olabilir` };
  }
  
  // Sadece Türkçe harfler, boşluk ve tire
  const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$/;
  if (!nameRegex.test(value.trim())) {
    return { isValid: false, error: `${fieldName} sadece harf içerebilir` };
  }
  
  return { isValid: true };
};

// Şirket adı için validation - daha esnek
export const validateCompanyName = (value: string, fieldName: string = 'Şirket adı'): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: `${fieldName} en az 2 karakter olmalıdır` };
  }
  
  if (value.trim().length > 100) {
    return { isValid: false, error: `${fieldName} en fazla 100 karakter olabilir` };
  }
  
  // Şirket adı için daha esnek regex (rakam ve özel karakterler de olabilir)
  const companyRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s'.,&-]+$/;
  if (!companyRegex.test(value.trim())) {
    return { isValid: false, error: `${fieldName} geçersiz karakterler içeriyor` };
  }
  
  return { isValid: true };
};

// Telefon numarası validation - başında 0 olmadan 10 haneli rakam
export const validatePhone = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'Telefon numarası zorunludur' };
  }
  
  // Sadece rakamları al (boşlukları ve diğer karakterleri temizle)
  const digitsOnly = value.replace(/\D/g, '');
  
  // 10 haneli olmalı
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Telefon numarası 10 haneli olmalıdır' };
  }
  
  // 5 ile başlamalı (cep telefonu)
  if (!digitsOnly.startsWith('5')) {
    return { isValid: false, error: 'Telefon numarası 5 ile başlamalıdır (5XX XXX XX XX)' };
  }
  
  return { isValid: true };
};

// Email validation
export const validateEmail = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'E-posta adresi zorunludur' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return { isValid: false, error: 'Geçerli bir e-posta adresi giriniz' };
  }
  
  return { isValid: true };
};

// TC Kimlik No validation - Sadece 11 haneli rakam kontrolü
export const validateTcKimlik = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  // Sadece rakamları al
  const digitsOnly = value.replace(/\D/g, '');
  
  // 11 haneli olmalı
  if (digitsOnly.length !== 11) {
    return { isValid: false, error: 'TC Kimlik numarası 11 haneli olmalıdır' };
  }
  
  // İlk hane 0 olamaz
  if (digitsOnly[0] === '0') {
    return { isValid: false, error: 'TC Kimlik numarası 0 ile başlayamaz' };
  }
  
  return { isValid: true };
};

// Vergi No validation
export const validateVergiNo = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  // Sadece rakamları al
  const digitsOnly = value.replace(/\D/g, '');
  
  // 10 haneli olmalı
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Vergi numarası 10 haneli olmalıdır' };
  }
  
  return { isValid: true };
};

// Posta Kodu validation
export const validatePostalCode = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  // Sadece rakamları al
  const digitsOnly = value.replace(/\D/g, '');
  
  // 5 haneli olmalı
  if (digitsOnly.length !== 5) {
    return { isValid: false, error: 'Posta kodu 5 haneli olmalıdır' };
  }
  
  return { isValid: true };
};

// Güçlü şifre validation - Chrome uyarısını önlemek için
export const validatePassword = (value: string): ValidationResult => {
  if (!value) {
    return { isValid: false, error: 'Şifre zorunludur' };
  }

  // Uzunluk kontrolü - Chrome için minimum 12 karakter
  if (value.length < 12) {
    return { isValid: false, error: 'Şifre en az 12 karakter olmalıdır' };
  }

  if (value.length > 128) {
    return { isValid: false, error: 'Şifre en fazla 128 karakter olabilir' };
  }

  // Karakter çeşitliliği kontrolü
  const hasLowercase = /[a-z]/.test(value);
  const hasUppercase = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);

  const missingRequirements = [];
  if (!hasLowercase) missingRequirements.push('küçük harf');
  if (!hasUppercase) missingRequirements.push('büyük harf');
  if (!hasDigit) missingRequirements.push('rakam');
  if (!hasSpecialChar) missingRequirements.push('özel karakter (!@#$%^&* vb.)');

  if (missingRequirements.length > 0) {
    return { 
      isValid: false, 
      error: `Şifre en az bir ${missingRequirements.join(', ')} içermelidir` 
    };
  }

  // Benzersiz karakter sayısı
  const uniqueChars = new Set(value).size;
  if (uniqueChars < 8) {
    return { 
      isValid: false, 
      error: 'Şifre en az 8 farklı karakter içermelidir' 
    };
  }

  // Yaygın şifreler kontrolü
  const commonPasswords = [
    '123456', 'password', '123456789', '12345678', 'qwerty', 'abc123',
    'password123', 'admin123', 'user123', 'test123', 'demo123',
    'Password123!', 'Admin123!', 'User123!', 'Test123!', 'Demo123!',
    '123qwe', 'qwe123', 'asdf123', 'zxcv123'
  ];

  const lowerPassword = value.toLowerCase();
  for (const common of commonPasswords) {
    if (lowerPassword.includes(common.toLowerCase())) {
      return { 
        isValid: false, 
        error: 'Bu şifre çok yaygın kullanılan bir şifredir. Lütfen daha güvenli bir şifre seçin' 
      };
    }
  }

  // Basit pattern kontrolü
  if (/^(.)\1+$/.test(value)) {
    return { 
      isValid: false, 
      error: 'Şifre aynı karakterin tekrarından oluşamaz' 
    };
  }

  if (/^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(value)) {
    return { 
      isValid: false, 
      error: 'Şifre ardışık sayılar içermemelidir' 
    };
  }

  if (/^(abc|bcd|cde|def|efg|fgh|ghi|qwe|wer|ert|rty|asd|sdf|dfg|zxc|xcv|cvb)/i.test(value)) {
    return { 
      isValid: false, 
      error: 'Şifre klavye üzerinde ardışık karakterler içermemelidir' 
    };
  }

  // Güçlü şifre - tüm kontroller geçti
  return { isValid: true };
};

// Güçlü şifre validation (ResetPassword için)
export const validateStrongPassword = (value: string): ValidationResult => {
  if (!value) {
    return { isValid: false, error: 'Şifre zorunludur' };
  }
  
  if (value.length < 8) {
    return { isValid: false, error: 'Şifre en az 8 karakter olmalıdır' };
  }
  
  if (!/(?=.*[a-z])/.test(value)) {
    return { isValid: false, error: 'Şifre en az bir küçük harf içermelidir' };
  }
  
  if (!/(?=.*[A-Z])/.test(value)) {
    return { isValid: false, error: 'Şifre en az bir büyük harf içermelidir' };
  }
  
  if (!/(?=.*\d)/.test(value)) {
    return { isValid: false, error: 'Şifre en az bir rakam içermelidir' };
  }
  
  if (!/(?=.*[@$!%*?&])/.test(value)) {
    return { isValid: false, error: 'Şifre en az bir özel karakter içermelidir (@$!%*?&)' };
  }
  
  return { isValid: true };
};

// Aylık gelir validation
export const validateIncome = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0 || numValue > 1000000) {
    return { isValid: false, error: 'Aylık gelir 0-1.000.000 TL arasında olmalıdır' };
  }
  
  return { isValid: true };
};

// Şehir/İl validation
export const validateCity = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'İl zorunludur' };
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: 'İl en az 2 karakter olmalıdır' };
  }
  
  if (value.trim().length > 50) {
    return { isValid: false, error: 'İl en fazla 50 karakter olabilir' };
  }
  
  // Sadece Türkçe harfler ve boşluk
  const cityRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
  if (!cityRegex.test(value.trim())) {
    return { isValid: false, error: 'İl adı sadece harf içerebilir' };
  }
  
  return { isValid: true };
};

// İlçe validation
export const validateDistrict = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'İlçe zorunludur' };
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: 'İlçe en az 2 karakter olmalıdır' };
  }
  
  if (value.trim().length > 50) {
    return { isValid: false, error: 'İlçe en fazla 50 karakter olabilir' };
  }
  
  // Sadece Türkçe harfler ve boşluk
  const districtRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
  if (!districtRegex.test(value.trim())) {
    return { isValid: false, error: 'İlçe adı sadece harf içerebilir' };
  }
  
  return { isValid: true };
};

// Mahalle validation
export const validateNeighborhood = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'Mahalle zorunludur' };
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: 'Mahalle en az 2 karakter olmalıdır' };
  }
  
  if (value.trim().length > 100) {
    return { isValid: false, error: 'Mahalle en fazla 100 karakter olabilir' };
  }
  
  return { isValid: true };
};

// Adres detayı validation
export const validateAddress = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: false, error: 'Adres detayı zorunludur' };
  }
  
  if (value.trim().length < 10) {
    return { isValid: false, error: 'Adres detayı en az 10 karakter olmalıdır' };
  }
  
  if (value.trim().length > 500) {
    return { isValid: false, error: 'Adres detayı en fazla 500 karakter olabilir' };
  }
  
  return { isValid: true };
};

// Meslek validation
export const validateProfession = (value: string): ValidationResult => {
  if (!value || !value.trim()) {
    return { isValid: true }; // Opsiyonel alan
  }
  
  if (value.trim().length < 2) {
    return { isValid: false, error: 'Meslek en az 2 karakter olmalıdır' };
  }
  
  if (value.trim().length > 100) {
    return { isValid: false, error: 'Meslek en fazla 100 karakter olabilir' };
  }
  
  // Sadece Türkçe harfler ve boşluk
  const professionRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
  if (!professionRegex.test(value.trim())) {
    return { isValid: false, error: 'Meslek sadece harf içerebilir' };
  }
  
  return { isValid: true };
};



// Input formatları
export const formatPhone = (value: string): string => {
  // Sadece rakamları al ve 10 hane ile sınırla
  const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
  
  // Sadece rakamları döndür - boşluksuz
  return digitsOnly;
};

export const formatTcKimlik = (value: string): string => {
  // Sadece rakamları al ve 11 hane ile sınırla
  const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
  return digitsOnly;
};

export const formatVergiNo = (value: string): string => {
  // Sadece rakamları al ve 10 hane ile sınırla
  const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
  return digitsOnly;
};

export const formatPostalCode = (value: string): string => {
  // Sadece rakamları al ve 5 hane ile sınırla
  const digitsOnly = value.replace(/\D/g, '').slice(0, 5);
  return digitsOnly;
};

export const formatName = (value: string): string => {
  // Sadece harfleri, boşlukları ve geçerli karakterleri al
  return value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]/g, '').slice(0, 50);
};

export const formatCompanyName = (value: string): string => {
  // Şirket adı için daha esnek format (rakam ve bazı özel karakterler de olabilir)
  return value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s'.,&-]/g, '').slice(0, 100);
};
