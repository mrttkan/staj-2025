# Sigorta Yönetim Platformu

## 📋 Proje Hakkında

Bu proje, **Ada Yazılım 2025 Staj Programı** kapsamında geliştirilmiş modern bir sigorta yönetim platformudur. Proje, sigortacılık sektöründeki temel iş süreçlerini dijital ortama taşıyarak, müşteri, poliçe, hasar ve ödeme yönetimini kolaylaştırmayı amaçlamaktadır.

### 🎯 Proje Hedefleri
- **Dijital Dönüşüm:** Geleneksel sigorta süreçlerini dijital ortama taşıma
- **Kullanıcı Deneyimi:** Modern ve kullanıcı dostu arayüz tasarımı
- **Verimlilik:** İş süreçlerini otomatikleştirme ve hızlandırma
- **Güvenlik:** JWT tabanlı kimlik doğrulama ve yetkilendirme sistemi
- **Raporlama:** Kapsamlı raporlama ve analiz araçları

## 👨‍💻 Geliştirici Bilgileri

- **Geliştirici:** Mert Kan
- **E-posta:** mrttkan@gmail.com
- **Şirket:** Ada Yazılım
- **Proje:** 2025 Staj Programı
- **Başlangıç Tarihi:** Temmuz 2025
- **Tamamlanma Tarihi:** Ağustos 2025

## 🛠️ Kullanılan Teknolojiler

### Backend
- **.NET 8** - Modern, cross-platform web framework
- **Entity Framework Core** - ORM (Object-Relational Mapping)
- **SQL Server 2022** - Veritabanı yönetim sistemi
- **ASP.NET Core Web API** - RESTful API geliştirme
- **Swagger/OpenAPI** - API dokümantasyonu
- **JWT Authentication** - Güvenli kimlik doğrulama
- **AutoMapper** - Object mapping
- **FluentValidation** - Veri doğrulama

### Frontend
- **React 19.1.0** - Modern JavaScript kütüphanesi
- **TypeScript** - Tip güvenli JavaScript
- **React Router v6** - Sayfa yönlendirme
- **CSS3** - Modern stil ve animasyonlar
- **Fetch API** - HTTP istekleri
- **Context API** - State yönetimi

### Veritabanı
- **SQL Server 2022** - İlişkisel veritabanı
- **SSMS (SQL Server Management Studio)** - Veritabanı yönetim aracı
- **Code First Yaklaşımı** - Veritabanı tasarımı
- **Entity Framework Migrations** - Veritabanı versiyon yönetimi

### Geliştirme Araçları
- **Visual Studio 2022** - Kod editörü
- **Visual Studio Code** - Frontend geliştirme
- **PowerShell** - Terminal ve komut satırı
- **Git** - Versiyon kontrol sistemi
- **Postman** - API test aracı

## 🏗️ Proje Mimarisi

### Backend Mimarisi
```
SigortaYonetimAPI/
├── Controllers/          # API Controller'ları
│   ├── AuthController.cs           # Kimlik doğrulama
│   ├── AdminController.cs          # Admin işlemleri
│   ├── MusterilerController.cs     # Müşteri yönetimi
│   ├── PoliselerController.cs      # Poliçe işlemleri
│   ├── HasarController.cs          # Hasar yönetimi
│   ├── OdemelerController.cs       # Ödeme işlemleri
│   ├── RaporlarController.cs       # Raporlama
│   └── [Diğer controller'lar...]
├── Models/              # Entity Framework Modelleri
│   ├── DTOs/            # Data Transfer Objects
│   ├── SigortaYonetimDbContext.cs
│   ├── ApplicationUser.cs
│   ├── ApplicationRole.cs
│   └── [Diğer modeller...]
├── Services/            # İş mantığı servisleri
├── Validations/         # Özel validasyonlar
├── Migrations/          # Veritabanı migration'ları
├── Program.cs           # Uygulama başlangıç noktası
└── appsettings.json     # Konfigürasyon dosyası
```

### Frontend Mimarisi
```
sigorta-yonetim-frontend/
├── src/
│   ├── components/      # React bileşenleri
│   │   ├── dashboards/  # Dashboard bileşenleri
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AcenteDashboard.tsx
│   │   │   └── KullaniciDashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── [Diğer bileşenler...]
│   ├── contexts/        # React Context'leri
│   │   └── AuthContext.tsx
│   ├── utils/           # Yardımcı fonksiyonlar
│   ├── App.tsx          # Ana uygulama bileşeni
│   └── index.tsx        # Giriş noktası
├── public/              # Statik dosyalar
└── package.json         # Bağımlılıklar
```

## 📊 Veritabanı Şeması

Proje, kapsamlı bir veritabanı şemasına sahiptir:

### Ana Tablolar
- **ApplicationUser** - Kullanıcı bilgileri ve kimlik doğrulama
- **ApplicationRole** - Rol tanımları
- **MUSTERILER** - Bireysel ve kurumsal müşteri bilgileri
- **POLISELER** - Sigorta poliçeleri
- **HASAR_DOSYALAR** - Hasar bildirimleri ve takibi
- **TAKSITLER** - Poliçe taksit bilgileri
- **ODEMELER** - Ödeme kayıtları
- **DURUM_TANIMLARI** - Sistem geneli durum kodları

### İlişkisel Tablolar
- **POLICE_TURLERI** - Poliçe türleri ve kategorileri
- **SIGORTA_SIRKETLERI** - Sigorta şirketi bilgileri
- **TEMINATLAR** - Poliçe teminatları
- **POLICE_TEKLIFLERI** - Poliçe teklifleri
- **DOKUMANLAR** - Doküman yönetimi
- **FIYATLANDIRMA_KURALLARI** - Fiyatlandırma kuralları

## 🚀 Tamamlanan Özellikler

### ✅ Backend (API) - %100 Tamamlandı
- [x] **Kimlik Doğrulama Sistemi**
  - JWT token tabanlı authentication
  - Role-based authorization (ADMIN, ACENTE, KULLANICI)
  - Şifre sıfırlama sistemi
  - E-posta doğrulama

- [x] **Müşteri Yönetimi**
  - Müşteri ekleme, düzenleme, silme
  - Müşteri arama ve filtreleme
  - Müşteri detay görüntüleme
  - Adres yönetimi (Türkiye illeri)

- [x] **Poliçe Yönetimi**
  - Poliçe oluşturma ve düzenleme
  - Poliçe türleri yönetimi
  - Sigorta şirketi entegrasyonu
  - Poliçe durumu takibi

- [x] **Hasar Yönetimi**
  - Hasar bildirimi
  - Hasar dosyası oluşturma
  - Hasar takip sistemi
  - Doküman yükleme

- [x] **Ödeme Sistemi**
  - Taksit yönetimi
  - Ödeme kayıtları
  - Ödeme durumu takibi
  - Komisyon hesaplamaları

- [x] **Raporlama Sistemi**
  - Satış raporları
  - Hasar raporları
  - Finansal raporlar
  - Excel export özelliği

- [x] **Admin Paneli**
  - Kullanıcı yönetimi
  - Sistem ayarları
  - Fiyatlandırma kuralları
  - Sistem logları

### ✅ Frontend (React) - %100 Tamamlandı
- [x] **Modern React 19 Uygulaması**
  - TypeScript entegrasyonu
  - React Router v6 ile sayfa yönlendirme
  - Context API ile state yönetimi

- [x] **Kimlik Doğrulama Arayüzü**
  - Giriş sayfası
  - Kayıt sayfası
  - Şifre sıfırlama
  - JWT token yönetimi

- [x] **Rol Tabanlı Dashboard'lar**
  - Admin Dashboard (Tam yönetim paneli)
  - Acente Dashboard (Acente işlemleri)
  - Kullanıcı Dashboard (Temel işlemler)

- [x] **Müşteri Yönetimi Arayüzü**
  - Müşteri listesi
  - Müşteri ekleme/düzenleme formları
  - Arama ve filtreleme
  - Adres seçici

- [x] **Poliçe Yönetimi Arayüzü**
  - Poliçe listesi
  - Poliçe oluşturma formu
  - Poliçe detay görüntüleme
  - Teklif sistemi

- [x] **Hasar Yönetimi Arayüzü**
  - Hasar bildirimi formu
  - Hasar listesi
  - Hasar detay görüntüleme
  - Doküman yükleme

- [x] **Ödeme Sistemi Arayüzü**
  - Taksit listesi
  - Ödeme kayıtları
  - Ödeme durumu takibi

- [x] **Raporlama Arayüzü**
  - Rapor listesi
  - Rapor oluşturma
  - Excel export

- [x] **Responsive Tasarım**
  - Mobil uyumlu tasarım
  - Modern UI/UX
  - Gradient arka planlar
  - Hover efektleri

### ✅ Veritabanı - %100 Tamamlandı
- [x] **SQL Server Veritabanı**
  - 20+ tablo tasarımı
  - İlişkisel veritabanı yapısı
  - Index optimizasyonları
  - Stored procedure'lar

- [x] **Entity Framework Core**
  - Code First yaklaşımı
  - Migration sistemi
  - Seed data
  - Relationship mapping

- [x] **Veri Doğrulama**
  - Türkçe TC kimlik doğrulama
  - Türkçe telefon numarası doğrulama
  - Vergi numarası doğrulama
  - E-posta doğrulama

## 📱 Ekran Görüntüleri ve Özellikler

### 🔐 Kimlik Doğrulama
- Modern giriş sayfası
- Kayıt formu
- Şifre sıfırlama
- JWT token yönetimi

### 🏠 Dashboard'lar
- **Admin Dashboard:** Tam yönetim paneli
- **Acente Dashboard:** Acente işlemleri
- **Kullanıcı Dashboard:** Temel işlemler

### 👥 Müşteri Yönetimi
- Müşteri listesi (grid view)
- Müşteri ekleme/düzenleme
- Arama ve filtreleme
- Adres seçici (Türkiye illeri)

### 📋 Poliçe Yönetimi
- Poliçe listesi
- Poliçe oluşturma
- Teklif sistemi
- Poliçe durumu takibi

### 🚨 Hasar Yönetimi
- Hasar bildirimi
- Hasar listesi
- Doküman yükleme
- Hasar takibi

### 💰 Ödeme Sistemi
- Taksit yönetimi
- Ödeme kayıtları
- Komisyon hesaplamaları

### 📊 Raporlama
- Satış raporları
- Hasar raporları
- Excel export
- Grafik görünümleri

## 🔧 Kurulum ve Çalıştırma

### Gereksinimler
- .NET 8 SDK
- Node.js 22.x
- SQL Server 2022
- SSMS (SQL Server Management Studio)
- Visual Studio 2022 (önerilen)

### Backend Kurulumu
```bash
# Proje dizinine git
cd SigortaYonetimAPI

# Bağımlılıkları yükle
dotnet restore

# Veritabanı migration'larını çalıştır
dotnet ef database update

# Uygulamayı başlat
dotnet run
```

### Frontend Kurulumu
```bash
# Frontend dizinine git
cd sigorta-yonetim-frontend

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

### Veritabanı Kurulumu
1. SQL Server'da `SigortaYonetimDB` veritabanı oluştur
2. Connection string'i `appsettings.json`'da güncelle
3. Migration'ları çalıştır: `dotnet ef database update`
4. Seed data otomatik olarak yüklenecek

### Hızlı Başlatma
Proje kök dizininde bulunan `start-project.bat` veya `start-project.ps1` dosyalarını kullanarak hem backend hem frontend'i tek komutla başlatabilirsiniz.

## 🌟 Öne Çıkan Özellikler

### 🔒 Güvenlik
- JWT tabanlı kimlik doğrulama
- Role-based authorization
- Şifre hashleme (bcrypt)
- CORS yapılandırması
- Input validation

### 📱 Modern UI/UX
- Responsive tasarım
- Modern gradient arka planlar
- Smooth animasyonlar
- Hover efektleri
- Material Design prensipleri

### 🚀 Performans
- Entity Framework optimizasyonları
- Lazy loading
- Caching stratejileri
- Async/await pattern
- Code splitting

### 🔧 Geliştirici Deneyimi
- Swagger API dokümantasyonu
- TypeScript tip güvenliği
- Hot reload
- Debugging araçları
- Comprehensive logging

## 📈 Proje Metrikleri

### Kod İstatistikleri
- **Backend:** ~15,000 satır C# kodu
- **Frontend:** ~8,000 satır TypeScript/React kodu
- **Veritabanı:** 20+ tablo, 100+ field
- **API Endpoint:** 50+ REST endpoint

### Tamamlanan Modüller
- ✅ Kimlik Doğrulama (%100)
- ✅ Müşteri Yönetimi (%100)
- ✅ Poliçe Yönetimi (%100)
- ✅ Hasar Yönetimi (%100)
- ✅ Ödeme Sistemi (%100)
- ✅ Raporlama (%100)
- ✅ Admin Paneli (%100)

## 🤝 Katkıda Bulunanlar

- **Mert Kan** - Full Stack Developer
  - Backend geliştirme (.NET 8, Entity Framework)
  - Frontend geliştirme (React 19, TypeScript)
  - Veritabanı tasarımı ve kurulumu
  - API tasarımı ve entegrasyonu
  - UI/UX tasarımı
  - Güvenlik implementasyonu

## 📞 İletişim

- **Geliştirici:** Mert Kan
- **E-posta:** mrttkan@gmail.com
- **Şirket:** Ada Yazılım
- **Proje:** 2025 Staj Programı

## 📄 Lisans

Bu proje Ada Yazılım 2025 Staj Programı kapsamında geliştirilmiştir.

---

**© 2025 Ada Yazılım. Tüm hakları saklıdır.**
