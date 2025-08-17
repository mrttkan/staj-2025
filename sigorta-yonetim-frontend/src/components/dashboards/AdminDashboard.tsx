import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AdminDashboard.css';
import ConfirmDialog from '../ConfirmDialog';
import AddressSelector from '../AddressSelector';
import {
  validateName,
  validatePhone,
  validateEmail,
  validateTcKimlik,
  validatePostalCode,
  validatePassword,
  validateCity,
  validateDistrict,
  validateNeighborhood,
  validateAddress,
  formatPhone,
  formatTcKimlik,
  formatPostalCode,
  formatName,
  formatCompanyName
} from '../../utils/validation';

interface User {
  id: string;
  userName: string;
  email: string;
  tamAd: string;
  roles: string[];
  hesapKilitlenmeTarihi: string | null;
  emailDogrulandi: boolean;
  sonGirisTarihi: string | null;
  aktifMi: boolean;
  pozisyon?: string;
  departman?: string;
  telefon?: string;
  kayitTarihi: string;
  guncellemeTarihi: string;
}

interface Customer {
  id: number;
  musteri_no: string;
  ad: string;
  soyad: string;
  sirket_adi?: string;
  eposta: string;
  telefon: string;
  adres_il: string;
  blacklist_mi: boolean;
  kayit_tarihi: string;
  tc_kimlik_no?: string;
  vergi_no?: string;
}

interface Payment {
  id: number;
  odeme_no: string;
  musteri_adi: string;
  police_no?: string;
  odeme_tarihi: string;
  vade_tarihi?: string;
  tutar: number;
  odeme_turu: string;
  odeme_yontemi_detay: string;
  durum_adi: string;
  tahsilat_yapan_kullanici?: string;
  aciklama?: string;
  makbuz_no?: string;
  komisyon_tutari?: number;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  verifiedUsers: number;
  totalCustomers: number;
  totalPolicies: number;
  totalOffers: number;
  totalClaims: number;
  pendingClaims: number;
  roleDistribution: Array<{ role: string; count: number }>;
  policyTypeDistribution: Array<{ type: string; count: number }>;
  recentLogins: Array<{
    ad: string;
    soyad: string;
    email: string;
    sonGirisTarihi: string;
  }>;
  systemPerformance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

interface Hasar {
  id: number;
  dosya_no: string;
  police_no: string;
  musteri_adi: string;
  durum_adi: string;
  olay_tarihi: string;
  olay_yeri_detay?: string;
  olay_aciklamasi?: string;
  olusturma_tarihi: string;
  talep_edilen_tutar?: number;
  onaylanan_tutar?: number;
}

interface HasarDosya {
  id: number;
  hasar_id: number;
  dosya_adi: string;
  dosya_yolu: string;
  dosya_tipi: string;
  dosya_boyutu: number;
  aciklama?: string;
  yukleyen_kullanici_adi: string;
  yukleme_tarihi: string;
}

interface HasarDetay {
  id: number;
  dosya_no: string;
  police_id: number;
  police_no: string;
  musteri_id: number;
  musteri_adi: string;
  durum_id: number;
  durum_adi: string;
  olay_tarihi: string;
  olay_yeri_detay?: string;
  olay_aciklamasi?: string;
  talep_edilen_tutar?: number;
  onaylanan_tutar?: number;
  red_nedeni?: string;
  notlar?: string;
  olusturma_tarihi: string;
  guncelleme_tarihi: string;
  notlar_listesi: Array<{
    id: number;
    not_metni: string;
    kullanici_adi: string;
    olusturma_tarihi: string;
  }>;
}

const AdminDashboard = () => {
  const { user, logout, refreshToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Kullanıcı rol kontrolü
  const isAdmin = user?.roles?.includes('ADMIN');
  const isAcente = user?.roles?.includes('ACENTE');
  const canSeeCommission = isAdmin || isAcente; // Komisyon bilgilerini sadece admin ve acente görebilir
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasarlar, setHasarlar] = useState<Hasar[]>([]);
  const [selectedHasar, setSelectedHasar] = useState<HasarDetay | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState('');
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  
  // Ödemeler için state'ler
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentSearchDebounced, setPaymentSearchDebounced] = useState('');
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  
  // Ödemeler modal state'leri
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'create' | 'edit'>('create');
  const [paymentForm, setPaymentForm] = useState({
    id: '',
    musteriId: '',
    policeNo: '',
    tutar: '',
    odemeTarihi: '',
    vadeTarihi: '',
    odemeTuru: '',
    aciklama: ''
  });
  
  // Confirm Dialog States
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning' as 'danger' | 'warning' | 'info'
  });
  
  // Rol modalı kaldırıldı - düzenle modalında rol seçimi yapılacak

  // Kullanıcı oluştur/düzenle modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalType, setUserModalType] = useState<'create' | 'edit'>('create');
  const [userForm, setUserForm] = useState({
    id: '',
    ad: '',
    soyad: '',
    email: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    telefon: '',
    rol: 'KULLANICI',
    pozisyon: '',
    departman: '',
    changePassword: false, // Şifre değiştirme checkbox'ı için
  });
  const [userFormErrors, setUserFormErrors] = useState<{[k:string]: string}>({});
  const [editingIdentityId, setEditingIdentityId] = useState<string>('');

  // Form state güncelleme fonksiyonu - daha güvenli state yönetimi için
  const updateUserForm = (field: string, value: any) => {
    setUserForm(prevForm => ({
      ...prevForm,
      [field]: value
    }));
  };

  // Müşteri form state güncelleme fonksiyonu
  const updateCustomerForm = (field: string, value: any) => {
    setCustomerForm(prevForm => ({
      ...prevForm,
      [field]: value
    }));
  };

  // Müşteri düzenleme form state güncelleme fonksiyonu
  const updateEditCustomerForm = (field: string, value: any) => {
    setEditCustomerForm(prevForm => ({
      ...prevForm,
      [field]: value
    }));
  };

  // Poliçe Yönetimi state'leri
  const [sigortaSirketleri, setSigortaSirketleri] = useState<any[]>([]);
  const [policeTurleri, setPoliceTurleri] = useState<any[]>([]);
  const [teminatlar, setTeminatlar] = useState<any[]>([]);
  // const [komisyonHesaplamalari, setKomisyonHesaplamalari] = useState<any[]>([]);
  const [policeTeklifleri, setPoliceTeklifleri] = useState<any[]>([]);
  const [showEditTeklifModal, setShowEditTeklifModal] = useState(false);
  const [editingTeklif, setEditingTeklif] = useState<any>(null);
  const [editTeklifForm, setEditTeklifForm] = useState({
    musteri_id: '',
    police_turu_id: '',
    sigorta_sirketi_id: '',
    brut_prim: '',
    net_prim: '',
    komisyon_tutari: '',
    vergi_tutari: '',
    toplam_tutar: '',
    notlar: '',
    taksit_sayisi: 1
  });
  const [poliseler, setPoliseler] = useState<any[]>([]);
  const [currentPoliceTab, setCurrentPoliceTab] = useState('sirketler');
  const [showPoliceEditModal, setShowPoliceEditModal] = useState(false);
  const [editingPolice, setEditingPolice] = useState<any>(null);
  const [editPoliceForm, setEditPoliceForm] = useState({
    musteri_id: '',
    police_turu_id: '',
    sigorta_sirketi_id: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    brut_prim: '',
    net_prim: '',
    komisyon_tutari: '',
    vergi_tutari: '',
    toplam_tutar: '',
    taksit_sayisi: 1,
    ozel_sartlar: '',
    notlar: ''
  });
  // const [showPoliceModal, setShowPoliceModal] = useState(false);
  // const [selectedPoliceItem, setSelectedPoliceItem] = useState<any>(null);
  // const [policeModalType, setPoliceModalType] = useState<'create' | 'edit'>('create');
  // Teklif oluşturma modalı
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerLookup, setOfferLookup] = useState<{ policeTurleri: Array<{id:number,text:string}>, sigortaSirketleri: Array<{id:number,text:string}>, teminatlar: Array<{id:number,text:string,policeTuruId:number}> }>({ 
    policeTurleri: [], 
    sigortaSirketleri: [],
    teminatlar: []
  });
  const [offerForm, setOfferForm] = useState<{ 
    musteriId: string; 
    policeTuruId: string; 
    sigortaSirketiId: string; 
    riskBilgileri: any;
    teminatlar: Array<{teminatId:number,limit:number,dahilMi:boolean}>;
    taksitSayisi: number;
    notlar: string;
  }>({
    musteriId: '',
    policeTuruId: '',
    sigortaSirketiId: '',
    riskBilgileri: {},
    teminatlar: [],
    taksitSayisi: 1,
    notlar: ''
  });
  const [offerCalc, setOfferCalc] = useState<any>(null);
  const [selectedTeminatlar, setSelectedTeminatlar] = useState<Array<{
    id: number;
    text: string;
    limit: number;
    dahilMi: boolean;
    zorunluMu?: boolean;
    hesaplamaTuru?: string;
    minTutar?: number;
    maxTutar?: number;
    primOrani?: number;
    sabitPrim?: number;
  }>>([]);

  // Müşteri oluşturma modalı (KULLANICI rolündeki ve müşteri kaydı olmayan kullanıcılar için)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerCandidates, setCustomerCandidates] = useState<Array<{id:string, email:string, ad?:string, soyad?:string, telefon?:string}>>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [customerForm, setCustomerForm] = useState({
    ad: '', soyad: '', eposta: '', telefon: '', tc_kimlik_no: '', vergi_no: '', 
    adres_il: '', adres_ilce: '', adres_mahalle: '', adres_sokak: ''
  });
  const [customerErrors, setCustomerErrors] = useState<{[k:string]: string}>({});

  // Müşteri düzenleme modalı
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: 0,
    ad: '', soyad: '', sirket_adi: '', tc_kimlik_no: '', vergi_no: '',
    eposta: '', telefon: '', dogum_tarihi: '', meslek: '', aylik_gelir: '',
    adres_il: '', adres_ilce: '', adres_mahalle: '', adres_sokak: '', adres_detay: '', posta_kodu: '',
    not_bilgileri: '', blacklist_mi: false, blacklist_nedeni: ''
  });
  const [editCustomerErrors, setEditCustomerErrors] = useState<{[k:string]: string}>({});

  // CRUD Modal States
  const [showSirketModal, setShowSirketModal] = useState(false);
  const [showTurModal, setShowTurModal] = useState(false);
  const [showTeminatModal, setShowTeminatModal] = useState(false);
  const [showTeklifModal, setShowTeklifModal] = useState(false);
  const [showHasarDetayModal, setShowHasarDetayModal] = useState(false);
  const [showHasarDurumModal, setShowHasarDurumModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form States
  const [sirketForm, setSirketForm] = useState({
    sirket_adi: '', sirket_kodu: '', vergi_no: '', telefon: '', eposta: '', adres: '', 
    komisyon_orani: '', aktif_mi: true
  });
  const [turForm, setTurForm] = useState({
    urun_adi: '', urun_kodu: '', aciklama: '', min_tutar: '', max_tutar: '', 
    min_sure_gun: '', max_sure_gun: '', zorunlu_mi: false, aktif_mi: true
  });
  const [teminatForm, setTeminatForm] = useState({
    police_turu_id: '', teminat_adi: '', teminat_kodu: '', zorunlu_mu: false,
    min_teminat_tutari: '', max_teminat_tutari: '', hesaplama_turu: 'YUZDE',
    prim_orani: '', sabit_prim: '', aktif_mi: true
  });
  const [teklifForm, setTeklifForm] = useState({
    musteri_id: '', police_turu_id: '', sigorta_sirketi_id: '', baslangic_tarihi: '',
    bitis_tarihi: '', toplam_tutar: '', aciklama: '', teminatlar: []
  });

  const [hasarNotForm, setHasarNotForm] = useState({
    not_metni: ''
  });

  const [hasarDurumForm, setHasarDurumForm] = useState({
    durum_id: 0,
    onaylanan_tutar: '',
    red_nedeni: '',
    notlar: ''
  });

  // Dosya yükleme state'leri
  const [hasarDosyalari, setHasarDosyalari] = useState<HasarDosya[]>([]);
  const [showDosyaYukleModal, setShowDosyaYukleModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dosyaAciklama, setDosyaAciklama] = useState('');
  const [dosyaYukleniyor, setDosyaYukleniyor] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    console.log('ActiveTab değişti:', activeTab);
    if (activeTab === 'dashboard') {
      setLoading(true);
      fetchDashboardStats().finally(() => setLoading(false));
    } else if (activeTab === 'users') {
      console.log('Kullanıcılar sekmesi açılıyor...');
      fetchUsers();
    } else if (activeTab === 'customers') {
      console.log('Müşteriler sekmesi açılıyor...');
      fetchCustomers();
    } else if (activeTab === 'police') {
      console.log('Poliçe sekmesi açılıyor...');
      fetchPoliceData();
    } else if (activeTab === 'hasarlar') {
      console.log('Hasar sekmesi açılıyor...');
      fetchHasarlar();
    } else if (activeTab === 'payments') {
      console.log('Ödemeler sekmesi açılıyor...');
      fetchPayments();
    }
  }, [activeTab, currentPage, searchTerm, selectedRole, customerCurrentPage, customerSearchTerm, paymentCurrentPage, paymentSearchTerm]);

  // Müşteri arama için debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerSearchDebounced(customerSearchTerm);
    }, 500); // 500ms bekle

    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  // Müşteri arama için ayrı useEffect
  useEffect(() => {
    if (activeTab === 'customers') {
      console.log('Müşteri arama terimi değişti:', customerSearchDebounced);
      setCustomerCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
      fetchCustomers();
    }
  }, [customerSearchDebounced, activeTab]);

  // Ödemeler arama için debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentSearchDebounced(paymentSearchTerm);
    }, 500); // 500ms bekle

    return () => clearTimeout(timer);
  }, [paymentSearchTerm]);

  // Ödemeler arama için ayrı useEffect
  useEffect(() => {
    if (activeTab === 'payments') {
      console.log('Ödeme arama terimi değişti:', paymentSearchDebounced);
      setPaymentCurrentPage(1); // Arama yapıldığında ilk sayfaya dön
      fetchPayments();
    }
  }, [paymentSearchDebounced, activeTab]);

  // Confirm Dialog Helper
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
      type: 'warning'
    });
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`/api/Admin/dashboard-stats?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Dashboard stats yüklenemedi:', response.status);
        // Hata durumunda varsayılan değerler göster
        setStats({
          totalUsers: 1,
          activeUsers: 1,
          lockedUsers: 0,
          verifiedUsers: 1,
          totalCustomers: 0,
          totalPolicies: 0,
          totalOffers: 0,
          totalClaims: 0,
          pendingClaims: 0,
          roleDistribution: [
            { role: "ADMIN", count: 1 },
            { role: "ACENTE", count: 0 },
            { role: "KULLANICI", count: 0 }
          ],
          policyTypeDistribution: [
            { type: "Trafik Sigortası", count: 0 },
            { type: "Kasko Sigortası", count: 0 },
            { type: "DASK", count: 0 },
            { type: "Sağlık Sigortası", count: 0 }
          ],
          recentLogins: [
            {
              ad: "Admin",
              soyad: "Kullanıcı",
              email: "admin@sigorta.com",
              sonGirisTarihi: new Date().toISOString()
            }
          ],
          systemPerformance: {
            cpuUsage: 25,
            memoryUsage: 45,
            diskUsage: 30,
            activeConnections: 12
          },
          recentActivities: [
            {
              id: "1",
              type: "LOGIN",
              description: "Sisteme giriş yapıldı",
              timestamp: new Date().toISOString(),
              user: "Admin Kullanıcı"
            }
          ]
        });
      }
    } catch (error) {
      console.error('Dashboard istatistikleri yüklenirken hata:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole })
      });

      const response = await fetch(`/api/Admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Kullanıcılar yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    try {
      console.log('=== Auth Test Başladı ===');
      const token = localStorage.getItem('token');
      console.log('Token:', token);
      
      // Token'ı decode et ve expiration'ı kontrol et
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);
          console.log('Token expiration:', new Date(payload.exp * 1000));
          console.log('Current time:', new Date());
          console.log('Token expired:', Date.now() > payload.exp * 1000);
          
          // Token süresi dolmuşsa yenilemeye çalış
          if (Date.now() > payload.exp * 1000) {
            console.log('Token süresi dolmuş, yenilenmeye çalışılıyor...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              console.error('Token yenilenemedi, kullanıcı logout yapılacak');
              // Kullanıcıyı login sayfasına yönlendir
              window.location.href = '/login';
              return;
            }
            console.log('Token başarıyla yenilendi');
          }
        } catch (e) {
          console.error('Token decode error:', e);
        }
      }
      
      const response = await fetch('/api/Musteriler/auth-test', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Auth test response status:', response.status);
      const data = await response.json();
      console.log('Auth test response:', data);
    } catch (error) {
      console.error('Auth test error:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('fetchCustomers başladı');
      
      // Önce auth test yap
      await testAuth();
      
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const params = new URLSearchParams({
        sayfa: customerCurrentPage.toString(),
        sayfa_boyutu: '10',
        ...(customerSearchDebounced && { arama_metni: customerSearchDebounced })
      });

      const url = `/api/Musteriler?${params}`;
      console.log('API URL:', url);
      console.log('Token var mı:', !!token);
      console.log('Token değeri:', token);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Müşteri API response:', data); // Debug için
        console.log('Raw data object:', JSON.stringify(data, null, 2)); // JSON yapısını detaylı göster
        console.log('data.data:', data.data);
        console.log('data.totalPages:', data.totalPages);
        console.log('data.totalCount:', data.totalCount);
        console.log('Müşteri sayısı:', data.data?.length || 0);
        setCustomers(data.data || []); // Küçük harfle "data"
        // Müşteri verileri zaten customers state'inde tutuluyor
        setCustomerTotalPages(data.totalPages || 1); // Küçük harfle "totalPages"
        console.log('Müşteriler state güncellendi');
      } else {
        console.error('Müşteriler yüklenemedi:', response.status);
        const errorData = await response.text();
        console.error('Hata detayı:', errorData);
      }
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      console.log('fetchPayments başladı');
      
      // Önce auth test yap
      await testAuth();
      
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const params = new URLSearchParams({
        sayfa: paymentCurrentPage.toString(),
        sayfa_boyutu: '10',
        ...(paymentSearchDebounced && { arama_metni: paymentSearchDebounced })
      });

      const url = `/api/Odemeler?${params}`;
      console.log('Ödemeler API URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Ödemeler Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ödemeler API response:', data);
        setPayments(data.odemeler || []);
        setPaymentTotalPages(data.toplam_sayfa || 1);
        console.log('Ödemeler state güncellendi');
      } else {
        console.error('Ödemeler yüklenemedi:', response.status);
        const errorData = await response.text();
        console.error('Hata detayı:', errorData);
      }
    } catch (error) {
      console.error('Ödemeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = (userId: string, action: 'delete' | 'lock' | 'unlock') => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı');
      return;
    }

    let endpoint = '';
    let method = 'POST';
    let confirmMessage = '';
    let confirmTitle = '';
    let successMessage = '';
    let dialogType: 'danger' | 'warning' | 'info' = 'warning';

    switch (action) {
      case 'delete':
        endpoint = `/api/Admin/users/${userId}`;
        method = 'DELETE';
        confirmTitle = 'Kullanıcı Silme Onayı';
        confirmMessage = 'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.';
        successMessage = 'Kullanıcı başarıyla silindi.';
        dialogType = 'danger';
        break;
      case 'lock':
        endpoint = `/api/Admin/users/${userId}/lock`;
        confirmTitle = 'Kullanıcı Kilitleme Onayı';
        confirmMessage = 'Bu kullanıcıyı kilitlemek istediğinizden emin misiniz?';
        successMessage = 'Kullanıcı başarıyla kilitlendi.';
        dialogType = 'warning';
        break;
      case 'unlock':
        endpoint = `/api/Admin/users/${userId}/unlock`;
        confirmTitle = 'Kullanıcı Kilit Açma Onayı';
        confirmMessage = 'Bu kullanıcının kilidini açmak istediğinizden emin misiniz?';
        successMessage = 'Kullanıcı başarıyla açıldı.';
        dialogType = 'info';
        break;
    }

    const executeAction = async () => {
      closeConfirmDialog();
      try {
        const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Her zaman kullanıcı listesini ve dashboard istatistiklerini güncelle
        if (activeTab === 'users') {
          fetchUsers();
        }
        // Dashboard istatistiklerini her zaman güncelle
        await fetchDashboardStats();
        alert(successMessage);
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
        console.error(`${action} işlemi sırasında hata:`, error);
        alert('İşlem sırasında hata oluştu');
      }
    };

    showConfirmDialog(confirmTitle, confirmMessage, executeAction, dialogType);
  };

  const handlePaymentEdit = (payment: Payment) => {
    setShowPaymentModal(true);
    setPaymentModalType('edit');
    setPaymentForm({
      id: payment.id.toString(),
      musteriId: '', // API'den müşteri ID'sini almak gerekiyor
      policeNo: payment.police_no || '',
      tutar: payment.tutar.toString(),
      odemeTarihi: new Date(payment.odeme_tarihi).toISOString().split('T')[0],
      vadeTarihi: payment.vade_tarihi ? new Date(payment.vade_tarihi).toISOString().split('T')[0] : '',
      odemeTuru: payment.odeme_yontemi_detay,
      aciklama: payment.aciklama || ''
    });
  };

  const handlePaymentDelete = (paymentId: number) => {
    showConfirmDialog(
      'Ödeme Silme Onayı',
      'Bu ödemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      () => executePaymentDelete(paymentId),
      'danger'
    );
  };

  const executePaymentDelete = async (paymentId: number) => {
    closeConfirmDialog();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/Odemeler/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPayments();
        alert('Ödeme başarıyla silindi.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Ödeme silme işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const handlePaymentStatusUpdate = (payment: Payment) => {
    // Durum seçenekleri
    const durumlar = [
      { id: 1, adi: 'Beklemede' },
      { id: 2, adi: 'Onaylandı' },
      { id: 3, adi: 'Reddedildi' },
      { id: 4, adi: 'İptal Edildi' }
    ];

    const yeniDurum = prompt(
      `Ödeme durumunu güncelleyin:\n${durumlar.map(d => `${d.id}: ${d.adi}`).join('\n')}\n\nMevcut durum: ${payment.durum_adi}\nYeni durum ID'si:`
    );

    if (yeniDurum && !isNaN(parseInt(yeniDurum))) {
      executePaymentStatusUpdate(payment.id, parseInt(yeniDurum));
    }
  };

  const executePaymentStatusUpdate = async (paymentId: number, yeniDurumId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/Odemeler/${paymentId}/durum`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(yeniDurumId)
      });

      if (response.ok) {
        fetchPayments();
        alert('Ödeme durumu başarıyla güncellendi.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Ödeme durumu güncelleme işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = paymentModalType === 'create' ? '/api/Odemeler' : `/api/Odemeler/${paymentForm.id}`;
      const method = paymentModalType === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          musteri_id: parseInt(paymentForm.musteriId),
          police_no: paymentForm.policeNo || null,
          tutar: parseFloat(paymentForm.tutar),
          odeme_tarihi: paymentForm.odemeTarihi,
          vade_tarihi: paymentForm.vadeTarihi || null,
          odeme_turu: paymentForm.odemeTuru,
          aciklama: paymentForm.aciklama || null
        })
      });

      if (response.ok) {
        setShowPaymentModal(false);
        fetchPayments();
        alert(paymentModalType === 'create' ? 'Ödeme başarıyla oluşturuldu.' : 'Ödeme başarıyla güncellendi.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Ödeme işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const handleCustomerAction = (customerId: number, action: 'delete' | 'toggle-blacklist') => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı');
      return;
    }

    let endpoint = '';
    let method = 'POST';
    let confirmMessage = '';
    let confirmTitle = '';
    let successMessage = '';
    let dialogType: 'danger' | 'warning' | 'info' = 'warning';

    switch (action) {
      case 'delete':
        endpoint = `/api/Musteriler/${customerId}`;
        method = 'DELETE';
        confirmTitle = 'Müşteri Silme Onayı';
        confirmMessage = 'Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.';
        successMessage = 'Müşteri başarıyla silindi.';
        dialogType = 'danger';
        break;
      case 'toggle-blacklist':
        endpoint = `/api/Musteriler/${customerId}/toggle-blacklist`;
        confirmTitle = 'Blacklist Durumu Değiştirme';
        confirmMessage = 'Bu müşterinin blacklist durumunu değiştirmek istediğinizden emin misiniz?';
        successMessage = 'Müşteri blacklist durumu başarıyla güncellendi.';
        dialogType = 'warning';
        break;
    }

    const executeAction = async () => {
      closeConfirmDialog();
      try {
        const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Her zaman müşteri listesini ve dashboard istatistiklerini güncelle
        if (activeTab === 'customers') {
          fetchCustomers();
        }
        // Dashboard istatistiklerini her zaman güncelle
        await fetchDashboardStats();
        alert(successMessage);
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
      } catch (error) {
        console.error(`${action} işlemi sırasında hata:`, error);
        alert('İşlem sırasında hata oluştu');
      }
    };

    showConfirmDialog(confirmTitle, confirmMessage, executeAction, dialogType);
  };

  // Rol yönetimi fonksiyonları kaldırıldı - düzenle modalında rol seçimi yapılacak

  // Poliçe Yönetimi fonksiyonları
  const fetchPoliceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      // Sigorta şirketleri
      const sirketlerResponse = await fetch('/api/SigortaSirketleri', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (sirketlerResponse.ok) {
        const sirketlerData = await sirketlerResponse.json();
        setSigortaSirketleri(sirketlerData.data || []);
        setOfferLookup(prev => ({
          ...prev,
          sigortaSirketleri: (sirketlerData.data || []).map((s: any) => ({
            id: s.id,
            text: s.sirketAdi || s.SirketAdi
          }))
        }));
      }

      // Poliçe türleri
      const turlerResponse = await fetch('/api/PoliceTurleri', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (turlerResponse.ok) {
        const turlerData = await turlerResponse.json();
        setPoliceTurleri(turlerData.data || []);
        setOfferLookup(prev => ({
          ...prev,
          policeTurleri: (turlerData.data || []).map((t: any) => ({
            id: t.id,
            text: t.urunAdi || t.UrunAdi
          }))
        }));
      }

      // Teminatlar
      const teminatlarResponse = await fetch('/api/Teminatlar', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (teminatlarResponse.ok) {
        const teminatlarData = await teminatlarResponse.json();
        setTeminatlar(teminatlarData.data || []);
        setOfferLookup(prev => ({
          ...prev,
          teminatlar: (teminatlarData.data || []).map((t: any) => ({
            id: t.id,
            text: t.teminat_adi,
            policeTuruId: t.police_turu_id
          }))
        }));
      }

      // Poliçe teklifleri
      const tekliflerResponse = await fetch('/api/PoliceTeklifleri', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tekliflerResponse.ok) {
        const tekliflerData = await tekliflerResponse.json();
        setPoliceTeklifleri(tekliflerData.data || []);
      }

      // Poliçeler
      const poliselerResponse = await fetch('/api/Poliseler', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (poliselerResponse.ok) {
        const poliselerData = await poliselerResponse.json();
        setPoliseler(poliselerData.data || []);
      }
    } catch (error) {
      console.error('Poliçe verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hasar Yönetimi fonksiyonları
  const fetchHasarlar = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/Hasar', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHasarlar(data);
      } else {
        console.error('Hasar dosyaları yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Hasar dosyaları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHasarDetay = async (hasarId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`/api/Hasar/${hasarId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedHasar(data);
        setShowHasarDetayModal(true);
        // Hasar dosyalarını da yükle
        fetchHasarDosyalari(hasarId);
      } else {
        console.error('Hasar detayı yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Hasar detayı yüklenirken hata:', error);
    }
  };

  const handleHasarDurumUpdate = async () => {
    try {
      if (!selectedHasar) return;

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const requestBody = {
        durum_id: hasarDurumForm.durum_id,
        onaylanan_tutar: hasarDurumForm.onaylanan_tutar ? parseFloat(hasarDurumForm.onaylanan_tutar) : undefined,
        red_nedeni: hasarDurumForm.red_nedeni || undefined,
        notlar: hasarDurumForm.notlar || undefined
      };

      const response = await fetch(`/api/Hasar/${selectedHasar.id}/durum`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        alert('Hasar durumu başarıyla güncellendi');
        setShowHasarDurumModal(false);
        setHasarDurumForm({
          durum_id: 0,
          onaylanan_tutar: '',
          red_nedeni: '',
          notlar: ''
        });
        fetchHasarlar(); // Hasar listesini yenile
      } else {
        const errorData = await response.json();
        alert(`Hasar durumu güncellenemedi: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Hasar durumu güncelleme hatası:', error);
      alert('İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleHasarSil = async (hasarId: number) => {
    try {
      if (!window.confirm('Bu hasar dosyasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`/api/Hasar/${hasarId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Hasar dosyası başarıyla silindi');
        fetchHasarlar(); // Hasar listesini yenile
      } else {
        const errorData = await response.json();
        alert(`Hasar silinemedi: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Hasar silme hatası:', error);
      alert('İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleHasarNotEkle = async () => {
    try {
      if (!hasarNotForm.not_metni.trim()) {
        alert('Lütfen not metnini girin');
        return;
      }

      if (!selectedHasar) return;

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`/api/Hasar/${selectedHasar.id}/not`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          not_metni: hasarNotForm.not_metni
        })
      });

      if (response.ok) {
        alert('Not başarıyla eklendi');
        setHasarNotForm({ not_metni: '' });
        fetchHasarDetay(selectedHasar.id); // Hasar detayını yenile
      } else {
        const errorData = await response.json();
        alert(`Not ekleme başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Not ekleme hatası:', error);
      alert('İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Dosya yükleme fonksiyonları
  const fetchHasarDosyalari = async (hasarId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/Hasar/${hasarId}/dosyalar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const dosyalar = await response.json();
        setHasarDosyalari(dosyalar);
      } else {
        console.error('Dosyalar yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const uploadHasarDosyalari = async (hasarId: number) => {
    if (selectedFiles.length === 0) {
      alert('Lütfen en az bir dosya seçin');
      return;
    }

    setDosyaYukleniyor(true);
    const token = localStorage.getItem('token');

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('dosya', file);
        if (dosyaAciklama) {
          formData.append('aciklama', dosyaAciklama);
        }

        const response = await fetch(`/api/Hasar/${hasarId}/dosya-yukle`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Dosya yüklenemedi');
        }
      }

      alert('Dosyalar başarıyla yüklendi');
      setSelectedFiles([]);
      setDosyaAciklama('');
      setShowDosyaYukleModal(false);
      fetchHasarDosyalari(hasarId);
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      alert(`Dosya yükleme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setDosyaYukleniyor(false);
    }
  };

  const deleteHasarDosyasi = async (dosyaId: number, hasarId: number) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/Hasar/dosya/${dosyaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Dosya başarıyla silindi');
        fetchHasarDosyalari(hasarId);
      } else {
        const errorData = await response.json();
        alert(`Dosya silinemedi: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Dosya silme hatası:', error);
      alert('Dosya silinirken hata oluştu');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Poliçe türü değiştiğinde teminatları güncelle
  const handlePoliceTuruChange = async (policeTuruId: string) => {
    setOfferForm(prev => ({ ...prev, policeTuruId }));
    
    if (policeTuruId) {
      try {
        // Teminatları API'den al
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/Teminatlar/PoliceTuru/${policeTuruId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const teminatlarData = await response.json();
          const teminatlar = teminatlarData.data || teminatlarData;
          
          setSelectedTeminatlar(teminatlar.map((t: any) => ({
            id: t.id,
            text: t.teminat_adi,
            limit: t.varsayilan_teminat_tutari || 10000,
            dahilMi: t.zorunlu_mu || false,
            zorunluMu: t.zorunlu_mu || false,
            hesaplamaTuru: t.hesaplama_turu,
            minTutar: t.min_teminat_tutari,
            maxTutar: t.max_teminat_tutari,
            primOrani: t.prim_orani,
            sabitPrim: t.sabit_prim
          })));
        } else {
          // API çağrısı başarısız olursa eski yöntemi kullan
          const filteredTeminatlar = offerLookup.teminatlar.filter(t => t.policeTuruId === parseInt(policeTuruId));
          setSelectedTeminatlar(filteredTeminatlar.map(t => ({
            id: t.id,
            text: t.text,
            limit: 0,
            dahilMi: false,
            zorunluMu: false,
            hesaplamaTuru: 'YUZDE',
            minTutar: 0,
            maxTutar: 0,
            primOrani: 1,
            sabitPrim: 0
          })));
        }
      } catch (error) {
        console.error('Teminatlar yüklenirken hata:', error);
        // Hata durumunda eski yöntemi kullan
        const filteredTeminatlar = offerLookup.teminatlar.filter(t => t.policeTuruId === parseInt(policeTuruId));
        setSelectedTeminatlar(filteredTeminatlar.map(t => ({
          id: t.id,
          text: t.text,
          limit: 0,
          dahilMi: false,
          zorunluMu: false,
          hesaplamaTuru: 'YUZDE',
          minTutar: 0,
          maxTutar: 0,
          primOrani: 1,
          sabitPrim: 0
        })));
      }
    } else {
      setSelectedTeminatlar([]);
    }
    
    setOfferCalc(null);
  };

  // Teminat seçimi değiştiğinde
  const handleTeminatChange = (teminatId: number, field: 'dahilMi' | 'limit', value: any) => {
    setSelectedTeminatlar(prev => prev.map(t => 
      t.id === teminatId ? { ...t, [field]: value } : t
    ));
    setOfferCalc(null);
  };

  // Risk bilgileri değiştiğinde
  const handleRiskBilgileriChange = (field: string, value: any) => {
    setOfferForm(prev => ({
      ...prev,
      riskBilgileri: { ...prev.riskBilgileri, [field]: value }
    }));
    setOfferCalc(null);
  };

  const handleTeklifEdit = (teklif: any) => {
    setEditingTeklif(teklif);
    setEditTeklifForm({
      musteri_id: teklif.musteri_id?.toString() || '',
      police_turu_id: teklif.police_turu_id?.toString() || '',
      sigorta_sirketi_id: teklif.sigorta_sirketi_id?.toString() || '',
      brut_prim: teklif.brut_prim?.toString() || '',
      net_prim: teklif.net_prim?.toString() || '',
      komisyon_tutari: teklif.komisyon_tutari?.toString() || '',
      vergi_tutari: teklif.vergi_tutari?.toString() || '',
      toplam_tutar: teklif.toplam_tutar?.toString() || '',
      notlar: teklif.notlar || '',
      taksit_sayisi: teklif.taksit_sayisi || 1
    });
    setShowEditTeklifModal(true);
  };

  const handleTeklifUpdate = async () => {
    if (!editingTeklif) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı');
      return;
    }

    try {
      const requestData = {
        musteri_id: parseInt(editTeklifForm.musteri_id),
        police_turu_id: parseInt(editTeklifForm.police_turu_id),
        sigorta_sirketi_id: parseInt(editTeklifForm.sigorta_sirketi_id),
        brut_prim: editTeklifForm.brut_prim ? parseFloat(editTeklifForm.brut_prim) : null,
        net_prim: editTeklifForm.net_prim ? parseFloat(editTeklifForm.net_prim) : null,
        komisyon_tutari: editTeklifForm.komisyon_tutari ? parseFloat(editTeklifForm.komisyon_tutari) : null,
        vergi_tutari: editTeklifForm.vergi_tutari ? parseFloat(editTeklifForm.vergi_tutari) : null,
        toplam_tutar: editTeklifForm.toplam_tutar ? parseFloat(editTeklifForm.toplam_tutar) : null,
        notlar: editTeklifForm.notlar,
        taksit_sayisi: editTeklifForm.taksit_sayisi
      };

      const response = await fetch(`/api/PoliceTeklifleri/${editingTeklif.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        alert('Teklif başarıyla güncellendi.');
        setShowEditTeklifModal(false);
        setEditingTeklif(null);
        fetchPoliceData(); // Verileri yenile
      } else {
        const errorData = await response.json();
        alert(`Güncelleme başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Teklif güncellenirken hata:', error);
      alert('Güncelleme sırasında hata oluştu');
    }
  };

  const handlePoliceEdit = (police: any) => {
    setEditingPolice(police);
    setEditPoliceForm({
      musteri_id: police.musteri_id?.toString() || '',
      police_turu_id: police.police_turu_id?.toString() || '',
      sigorta_sirketi_id: police.sigorta_sirketi_id?.toString() || '',
      baslangic_tarihi: police.baslangic_tarihi ? new Date(police.baslangic_tarihi).toISOString().split('T')[0] : '',
      bitis_tarihi: police.bitis_tarihi ? new Date(police.bitis_tarihi).toISOString().split('T')[0] : '',
      brut_prim: police.brut_prim?.toString() || '',
      net_prim: police.net_prim?.toString() || '',
      komisyon_tutari: police.komisyon_tutari?.toString() || '',
      vergi_tutari: police.vergi_tutari?.toString() || '',
      toplam_tutar: police.toplam_tutar?.toString() || '',
      taksit_sayisi: police.taksit_sayisi || 1,
      ozel_sartlar: police.ozel_sartlar || '',
      notlar: police.notlar || ''
    });
    setShowPoliceEditModal(true);
  };

  const handlePoliceUpdate = async () => {
    if (!editingPolice) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı');
      return;
    }

    try {
      const response = await fetch(`/api/Poliseler/${editingPolice.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editPoliceForm,
          id: editingPolice.id,
          musteri_id: parseInt(editPoliceForm.musteri_id),
          police_turu_id: parseInt(editPoliceForm.police_turu_id),
          sigorta_sirketi_id: parseInt(editPoliceForm.sigorta_sirketi_id),
          brut_prim: editPoliceForm.brut_prim ? parseFloat(editPoliceForm.brut_prim) : null,
          net_prim: editPoliceForm.net_prim ? parseFloat(editPoliceForm.net_prim) : null,
          komisyon_tutari: editPoliceForm.komisyon_tutari ? parseFloat(editPoliceForm.komisyon_tutari) : null,
          vergi_tutari: editPoliceForm.vergi_tutari ? parseFloat(editPoliceForm.vergi_tutari) : null,
          toplam_tutar: editPoliceForm.toplam_tutar ? parseFloat(editPoliceForm.toplam_tutar) : null,
          taksit_sayisi: parseInt(editPoliceForm.taksit_sayisi.toString())
        })
      });

      if (response.ok) {
        alert('Poliçe başarıyla güncellendi.');
        setShowPoliceEditModal(false);
        setEditingPolice(null);
        fetchPoliceData(); // Verileri yenile
      } else {
        const errorData = await response.json();
        alert(`Güncelleme başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Poliçe güncellenirken hata:', error);
      alert('Güncelleme sırasında hata oluştu');
    }
  };

  const handlePoliceAction = (id: number, action: 'delete', type: 'sirket' | 'tur' | 'komisyon' | 'teklif' | 'police') => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Token bulunamadı');
      return;
    }

    let endpoint = '';
    let confirmMessage = '';
    let confirmTitle = '';
    let successMessage = '';

    switch (type) {
      case 'sirket':
        endpoint = `/api/SigortaSirketleri/${id}`;
        confirmTitle = 'Sigorta Şirketi Silme Onayı';
        confirmMessage = 'Bu sigorta şirketini silmek istediğinizden emin misiniz?';
        successMessage = 'Sigorta şirketi başarıyla silindi.';
        break;
      case 'tur':
        endpoint = `/api/PoliceTurleri/${id}`;
        confirmTitle = 'Poliçe Türü Silme Onayı';
        confirmMessage = 'Bu poliçe türünü silmek istediğinizden emin misiniz?';
        successMessage = 'Poliçe türü başarıyla silindi.';
        break;
      case 'komisyon':
        endpoint = `/api/KomisyonHesaplamalari/${id}`;
        confirmTitle = 'Komisyon Hesaplaması Silme Onayı';
        confirmMessage = 'Bu komisyon hesaplamasını silmek istediğinizden emin misiniz?';
        successMessage = 'Komisyon hesaplaması başarıyla silindi.';
        break;
      case 'teklif':
        endpoint = `/api/PoliceTeklifleri/${id}`;
        confirmTitle = 'Poliçe Teklifi Silme Onayı';
        confirmMessage = 'Bu poliçe teklifini silmek istediğinizden emin misiniz?';
        successMessage = 'Poliçe teklifi başarıyla silindi.';
        break;
      case 'police':
        // Silmek yerine iptal önerilir; yine de backend DELETE eklendi (sadece ADMIN)
        endpoint = `/api/Poliseler/${id}`;
        confirmTitle = 'Poliçe Silme Onayı';
        confirmMessage = 'Bu poliçeyi silmek istediğinizden emin misiniz? (Önerilen: İptal)';
        successMessage = 'Poliçe başarıyla silindi.';
        break;
    }

    const executeAction = async () => {
      closeConfirmDialog();
      try {
        const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

        if (response.ok) {
          alert(successMessage);
          fetchPoliceData();
        } else {
          const errorData = await response.json();
          alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
        }
      } catch (error) {
        console.error(`${action} işlemi sırasında hata:`, error);
        alert('İşlem sırasında hata oluştu');
      }
    };

    showConfirmDialog(confirmTitle, confirmMessage, executeAction, 'danger');
  };

  const renderDashboardContent = () => (
    <div>
      {loading ? (
        <div className="loading">Veriler yükleniyor...</div>
      ) : stats ? (
        <>
          {/* Yenile Butonu */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  await fetchDashboardStats();
                } finally {
                  setLoading(false);
                }
              }} 
              className="refresh-btn"
              disabled={loading}
              title="İstatistikleri Yenile"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              Yenile
            </button>
          </div>

          {/* Ana İstatistikler */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Toplam Kullanıcı</h3>
                <div className="stat-number">{stats.totalUsers}</div>
                <small>Kayıtlı kullanıcılar</small>
              </div>
            </div>

            <div className="stat-card success">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Toplam Müşteri</h3>
                <div className="stat-number">{stats.totalCustomers}</div>
                <small>Kayıtlı müşteriler</small>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Aktif Poliçeler</h3>
                <div className="stat-number">{stats.totalPolicies}</div>
                <small>Devam eden poliçeler</small>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Bekleyen Teklifler</h3>
                <div className="stat-number">{stats.totalOffers}</div>
                <small>Onay bekleyen teklifler</small>
              </div>
            </div>

            <div className="stat-card danger">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Kilitli Kullanıcı</h3>
                <div className="stat-number">{stats.lockedUsers}</div>
                <small>Kilitli hesaplar</small>
              </div>
            </div>
          </div>

          {/* Dashboard Bölümleri */}
          <div className="dashboard-sections-container">
            <div className="dashboard-sections">
              <div className="recent-activity">
                <h3>Son Aktiviteler</h3>
                <div className="activity-list-container">
                  <div className="activity-list">
                    {stats.recentActivities && stats.recentActivities.length > 0 ? (
                      stats.recentActivities.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                              <polyline points="10,17 15,12 10,7"></polyline>
                              <line x1="15" y1="12" x2="3" y2="12"></line>
                            </svg>
                          </div>
                          <div className="activity-info">
                            <div className="activity-user">{activity.user}</div>
                            <div className="activity-description">{activity.description}</div>
                            <div className="activity-time">{new Date(activity.timestamp).toLocaleString('tr-TR')}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-activity">
                        <div className="no-activity-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"></path>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                          </svg>
                        </div>
                        <p>Henüz sistem aktivitesi bulunmuyor</p>
                        <small>Kullanıcı girişleri ve sistem işlemleri burada görünecek</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="role-distribution">
                <h3>Rol Dağılımı</h3>
                <div className="role-list-container">
                  <div className="role-list">
                    {stats.roleDistribution.map((role, index) => (
                      <div key={index} className="role-item">
                        <span className="role-name">{role.role}</span>
                        <span className="role-count">{role.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Poliçe Türü Dağılımı */}
          <div className="policy-distribution-section">
            <h3>Poliçe Türü Dağılımı (Kesilmiş Poliçeler)</h3>
            <div className="policy-distribution-grid">
              {stats.policyTypeDistribution.map((policy, index) => (
                <div key={index} className="policy-distribution-card">
                  <div className="policy-type-info">
                    <span className="policy-type-name">{policy.type}</span>
                    <span className="policy-type-count">{policy.count}</span>
                  </div>
                  <div className="policy-type-bar">
                    <div 
                      className="policy-type-fill" 
                      style={{width: `${(policy.count / Math.max(...stats.policyTypeDistribution.map(p => p.count), 1)) * 100}%`}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="error-message">
          <p>Dashboard verileri yüklenemedi.</p>
          <button onClick={fetchDashboardStats} className="retry-btn">Tekrar Dene</button>
        </div>
      )}
    </div>
  );

  const renderUsersContent = () => (
    <div className="users-content">
      <div className="users-header">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="role-filter"
          >
            <option value="">Tüm Roller</option>
            <option value="ADMIN">Admin</option>
            <option value="ACENTE">Acente</option>
            <option value="KULLANICI">Kullanıcı</option>
          </select>
          <button
            className="create-btn"
            onClick={() => {
              setUserModalType('create');
              // Form state'ini temizle
              setUserForm({ 
                id: '', 
                ad: '', 
                soyad: '', 
                email: '', 
                password: '', 
                newPassword: '',
                confirmPassword: '',
                telefon: '', 
                rol: 'KULLANICI', 
                pozisyon: '', 
                departman: '',
                changePassword: false
              });
              setUserFormErrors({});
              setShowUserModal(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Yeni Kullanıcı
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Kullanıcılar yükleniyor...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th>Roller</th>
                  <th>Durum</th>
                  <th>Son Giriş</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.tamAd}</td>
                    <td>{user.email}</td>
                    <td>
                      <div className="user-roles">
                        {user.roles.map((role, index) => (
                          <span key={index} className="role-badge">{role}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${user.hesapKilitlenmeTarihi ? 'locked' : 'active'}`}>
                        {user.hesapKilitlenmeTarihi ? 'Kilitli' : 'Aktif'}
                      </span>
                    </td>
                    <td>
                      {user.sonGirisTarihi ? new Date(user.sonGirisTarihi).toLocaleDateString('tr-TR') : 'Hiç giriş yapmamış'}
                    </td>
                    <td>
                      <div className="user-actions">
                        <button
                          onClick={async () => {
                            // Düzenle modalini aç ve formu doldur
                            setUserModalType('edit');
                            setShowUserModal(true);
                            // Form state'ini doldur
                            setUserForm({
                              id: user.id,
                              ad: user.tamAd.split(' ')[0] || '',
                              soyad: user.tamAd.split(' ').slice(1).join(' ') || '',
                              email: user.email,
                              password: '',
                              newPassword: '',
                              confirmPassword: '',
                              telefon: user.telefon || '',
                              rol: user.roles[0] || 'KULLANICI',
                              pozisyon: user.pozisyon || '',
                              departman: user.departman || '',
                              changePassword: false
                            });
                            setUserFormErrors({});
                            // Identity ID eşlemesi (Auth/test-users)
                            try {
                              const token = localStorage.getItem('token');
                              const r = await fetch('/api/Auth/test-users', { headers: { 'Authorization': `Bearer ${token}` }});
                              if (r.ok) {
                                const data = await r.json();
                                const match = data.IdentityUsers?.find((u: any) => u.KullanicilarId?.toString() === user.id);
                                if (match) {
                                  setEditingIdentityId(match.Id);
                                } else {
                                  // Eğer Identity eşleştirmesi bulunamazsa, backend KULLANICILAR.id'yi desteklediği için direkt kullan
                                  console.warn(`Identity kullanıcısı bulunamadı, KULLANICILAR.id (${user.id}) kullanılacak`);
                                  setEditingIdentityId('');
                                }
                              } else {
                                console.warn('test-users endpoint\'ine erişilemedi, KULLANICILAR.id kullanılacak');
                                setEditingIdentityId('');
                              }
                            } catch (e) {
                              console.warn('Identity eşleştirmesi başarısız, KULLANICILAR.id kullanılacak:', e);
                              setEditingIdentityId('');
                            }
                          }}
                          className="action-btn-small info"
                          title="Düzenle"
                        >
                          Düzenle
                        </button>

                        {user.hesapKilitlenmeTarihi ? (
                          <button
                            onClick={() => handleUserAction(user.id, 'unlock')}
                            className="action-btn-small success"
                            title="Kilidi Aç"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"></path>
                              <rect x="7" y="11" width="10" height="8"></rect>
                              <circle cx="12" cy="16" r="1"></circle>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Kilidi Aç
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user.id, 'lock')}
                            className="action-btn-small warning"
                            title="Kilitle"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <circle cx="12" cy="16" r="1"></circle>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Kilitle
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(user.id, 'delete')}
                          className="action-btn-small danger"
                          title="Sil"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                          </svg>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Önceki
            </button>
            <span className="page-info">Sayfa {currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderCustomersContent = () => (
    <div className="customers-content">
      <div className="section-header">
        <h2>Müşteri Yönetimi</h2>
        <p>Tüm müşterilerin yönetimi ve takibi</p>
      </div>
      
      <div className="customers-header">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Müşteri ara (ad, soyad, e-posta, telefon, müşteri no)..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="search-input"
            />
            {customerSearchTerm && (
              <button
                onClick={() => setCustomerSearchTerm('')}
                className="clear-search-btn"
                title="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="create-btn"
            onClick={async () => {
              setShowCustomerModal(true);
              setCustomerErrors({});
              setSelectedCandidate('');
              setCustomerForm({ ad:'', soyad:'', eposta:'', telefon:'', tc_kimlik_no:'', vergi_no:'', adres_il:'', adres_ilce:'', adres_mahalle:'', adres_sokak:'' });
              // KULLANICI rolünde olan ve müşteri kaydı olmayan kullanıcıları getir
              try {
                const token = localStorage.getItem('token');
                              const res = await fetch('/api/Admin/users/non-customers', {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
              });
              if (res.ok) {
                const data = await res.json();
                const list: Array<{id:string, email:string, ad?:string, soyad?:string, telefon?:string}> = data.map((u:any) => ({ id: u.id, email: u.email, ad: u.ad, soyad: u.soyad, telefon: u.telefon }));
                setCustomerCandidates(list);
                }
              } catch (e) { console.error(e); }
            }}
          >
            Yeni Müşteri
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Müşteriler yükleniyor...</div>
      ) : (
        <>
          <div className="customers-table">
            <table>
              <thead>
                <tr>
                  <th>Müşteri No</th>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th>İl</th>
                  <th>Durum</th>
                  <th>Kayıt Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.musteri_no}</td>
                      <td>{customer.ad} {customer.soyad}</td>
                      <td>{customer.eposta}</td>
                      <td>{customer.telefon}</td>
                      <td>{customer.adres_il}</td>
                      <td>
                        <span className={`status-badge ${customer.blacklist_mi ? 'blacklist' : 'active'}`}>
                          {customer.blacklist_mi ? 'Blacklist' : 'Aktif'}
                        </span>
                      </td>
                      <td>{new Date(customer.kayit_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td>
                        <div className="customer-actions">
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`/api/Musteriler/${customer.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                                if (res.ok) {
                                  const data = await res.json();
                                  setEditingCustomer(data);
                                  setEditCustomerForm({
                                    id: data.id,
                                    ad: data.ad || '',
                                    soyad: data.soyad || '',
                                    sirket_adi: data.sirket_adi || '',
                                    tc_kimlik_no: data.tc_kimlik_no || '',
                                    vergi_no: data.vergi_no || '',
                                    eposta: data.eposta || '',
                                    telefon: data.telefon || '',
                                    dogum_tarihi: data.dogum_tarihi ? data.dogum_tarihi.split('T')[0] : '',
                                    meslek: data.meslek || '',
                                    aylik_gelir: data.aylik_gelir?.toString() || '',
                                    adres_il: data.adres_il || '',
                                    adres_ilce: data.adres_ilce || '',
                                    adres_mahalle: data.adres_mahalle || '',
                                    adres_sokak: data.adres_sokak || '',
                                    adres_detay: data.adres_detay || '',
                                    posta_kodu: data.posta_kodu || '',
                                    not_bilgileri: data.not_bilgileri || '',
                                    blacklist_mi: data.blacklist_mi || false,
                                    blacklist_nedeni: data.blacklist_nedeni || ''
                                  });
                                  setEditCustomerErrors({});
                                  setShowEditCustomerModal(true);
                                }
                              } catch(e) { console.error(e); }
                            }}
                            className="action-btn-small info"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleCustomerAction(customer.id, 'toggle-blacklist')}
                            className="action-btn-small warning"
                          >
                            {customer.blacklist_mi ? 'Blacklist\'ten Çıkar' : 'Blacklist\'e Ekle'}
                          </button>
                          <button
                            onClick={() => handleCustomerAction(customer.id, 'delete')}
                            className="action-btn-small danger"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="no-data">
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '10px' }}>📋</div>
                        <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
                          {customerSearchTerm ? 'Arama kriterlerine uygun müşteri bulunamadı.' : 'Henüz müşteri kaydı bulunmuyor.'}
                        </p>
                        {customerSearchTerm && (
                          <button
                            onClick={() => setCustomerSearchTerm('')}
                            style={{
                              marginTop: '10px',
                              padding: '8px 16px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Aramayı Temizle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setCustomerCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={customerCurrentPage === 1}
              className="pagination-btn"
            >
              Önceki
            </button>
            <span className="page-info">Sayfa {customerCurrentPage} / {customerTotalPages}</span>
            <button
              onClick={() => setCustomerCurrentPage(prev => Math.min(customerTotalPages, prev + 1))}
              disabled={customerCurrentPage === customerTotalPages}
              className="pagination-btn"
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderPoliceContent = () => (
    <div className="police-content">
      <div className="section-header">
        <h2>Poliçe Yönetimi</h2>
        <p>Sigorta şirketleri, poliçe türleri, teklifler ve komisyon hesaplamaları</p>
      </div>

      <div className="police-tabs">
        <button 
          className={`police-tab ${currentPoliceTab === 'sirketler' ? 'active' : ''}`}
          onClick={() => setCurrentPoliceTab('sirketler')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
          Sigorta Şirketleri
        </button>
        <button 
          className={`police-tab ${currentPoliceTab === 'turler' ? 'active' : ''}`}
          onClick={() => setCurrentPoliceTab('turler')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Poliçe Türleri
        </button>
        <button 
          className={`police-tab ${currentPoliceTab === 'teklifler' ? 'active' : ''}`}
          onClick={() => setCurrentPoliceTab('teklifler')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          Poliçe Teklifleri
        </button>
        <button 
          className={`police-tab ${currentPoliceTab === 'poliseler' ? 'active' : ''}`}
          onClick={() => setCurrentPoliceTab('poliseler')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          Poliçeler
        </button>
        <button 
          className={`police-tab ${currentPoliceTab === 'teminatlar' ? 'active' : ''}`}
          onClick={() => setCurrentPoliceTab('teminatlar')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1v22"></path>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          Teminatlar
        </button>
      </div>

      <div className="police-tab-content">
        {currentPoliceTab === 'sirketler' && (
          <div className="sirketler-content">
            <div className="content-header">
              <h3>Sigorta Şirketleri</h3>
              <button 
                className="add-btn"
                onClick={() => {
                  setModalMode('create');
                  setSelectedItem(null);
                  setSirketForm({
                    sirket_adi: '', sirket_kodu: '', vergi_no: '', telefon: '', eposta: '', adres: '', 
                    komisyon_orani: '', aktif_mi: true
                  });
                  setShowSirketModal(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Yeni Şirket Ekle
              </button>
            </div>
            
            {loading ? (
              <div className="loading">Sigorta şirketleri yükleniyor...</div>
            ) : (
              <div className="sirketler-table">
                <table>
                  <thead>
                    <tr>
                      <th>Şirket Adı</th>
                      <th>Şirket Kodu</th>
                      <th>Vergi No</th>
                      <th>Telefon</th>
                      <th>E-posta</th>
                      <th>Komisyon Oranı</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sigortaSirketleri.map((sirket) => (
                      <tr key={sirket.id}>
                        <td>{sirket.SirketAdi || sirket.sirketAdi}</td>
                        <td>{sirket.SirketKodu || sirket.sirketKodu}</td>
                        <td>{sirket.VergiNo || sirket.vergiNo || '-'}</td>
                        <td>{sirket.Telefon || sirket.telefon || '-'}</td>
                        <td>{sirket.Eposta || sirket.eposta || '-'}</td>
                        <td>{(sirket.KomisyonOrani || sirket.komisyonOrani) ? `%${sirket.KomisyonOrani || sirket.komisyonOrani}` : '-'}</td>
                        <td>
                          <span className={`status-badge ${(sirket.AktifMi !== undefined ? sirket.AktifMi : sirket.aktifMi) ? 'active' : 'inactive'}`}>
                            {(sirket.AktifMi !== undefined ? sirket.AktifMi : sirket.aktifMi) ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => {
                                setModalMode('edit');
                                setSelectedItem(sirket);
                                setSirketForm({
                                  sirket_adi: sirket.SirketAdi || sirket.sirketAdi || '',
                                  sirket_kodu: sirket.SirketKodu || sirket.sirketKodu || '',
                                  vergi_no: sirket.VergiNo || sirket.vergiNo || '',
                                  telefon: sirket.Telefon || sirket.telefon || '',
                                  eposta: sirket.Eposta || sirket.eposta || '',
                                  adres: sirket.Adres || sirket.adres || '',
                                  komisyon_orani: sirket.KomisyonOrani || sirket.komisyonOrani || '',
                                  aktif_mi: sirket.AktifMi !== undefined ? sirket.AktifMi : sirket.aktifMi
                                });
                                setShowSirketModal(true);
                              }}
                              className="action-btn-small info"
                              title="Düzenle"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePoliceAction(sirket.id, 'delete', 'sirket')}
                              className="action-btn-small danger"
                              title="Sil"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentPoliceTab === 'turler' && (
          <div className="turler-content">
            <div className="content-header">
              <h3>Poliçe Türleri</h3>
              <button 
                className="add-btn"
                onClick={() => {
                  setModalMode('create');
                  setSelectedItem(null);
                  setTurForm({
                    urun_adi: '', urun_kodu: '', aciklama: '', min_tutar: '', max_tutar: '', 
                    min_sure_gun: '', max_sure_gun: '', zorunlu_mi: false, aktif_mi: true
                  });
                  setShowTurModal(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Yeni Tür Ekle
              </button>
            </div>
            
            {loading ? (
              <div className="loading">Poliçe türleri yükleniyor...</div>
            ) : (
              <div className="turler-table">
                <table>
                  <thead>
                    <tr>
                      <th>Ürün Adı</th>
                      <th>Ürün Kodu</th>
                      <th>Açıklama</th>
                      <th>Min Tutar</th>
                      <th>Max Tutar</th>
                      <th>Zorunlu</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policeTurleri.map((tur) => (
                      <tr key={tur.id}>
                        <td>{tur.UrunAdi || tur.urunAdi}</td>
                        <td>{tur.UrunKodu || tur.urunKodu}</td>
                        <td>{tur.Aciklama || tur.aciklama || '-'}</td>
                        <td>{(tur.MinTutar || tur.minTutar) ? `₺${tur.MinTutar || tur.minTutar}` : '-'}</td>
                        <td>{(tur.MaxTutar || tur.maxTutar) ? `₺${tur.MaxTutar || tur.maxTutar}` : '-'}</td>
                        <td>
                          <span className={`status-badge ${(tur.ZorunluMi !== undefined ? tur.ZorunluMi : tur.zorunluMi) ? 'warning' : 'info'}`}>
                            {(tur.ZorunluMi !== undefined ? tur.ZorunluMi : tur.zorunluMi) ? 'Evet' : 'Hayır'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${(tur.AktifMi !== undefined ? tur.AktifMi : tur.aktifMi) ? 'active' : 'inactive'}`}>
                            {(tur.AktifMi !== undefined ? tur.AktifMi : tur.aktifMi) ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => {
                                setModalMode('edit');
                                setSelectedItem(tur);
                                setTurForm({
                                  urun_adi: tur.UrunAdi || tur.urunAdi || '',
                                  urun_kodu: tur.UrunKodu || tur.urunKodu || '',
                                  aciklama: tur.Aciklama || tur.aciklama || '',
                                  min_tutar: (tur.MinTutar || tur.minTutar || '').toString(),
                                  max_tutar: (tur.MaxTutar || tur.maxTutar || '').toString(),
                                  min_sure_gun: (tur.MinSureGun || tur.minSureGun || '').toString(),
                                  max_sure_gun: (tur.MaxSureGun || tur.maxSureGun || '').toString(),
                                  zorunlu_mi: tur.ZorunluMi !== undefined ? tur.ZorunluMi : tur.zorunluMi,
                                  aktif_mi: tur.AktifMi !== undefined ? tur.AktifMi : tur.aktifMi
                                });
                                setShowTurModal(true);
                              }}
                              className="action-btn-small info"
                              title="Düzenle"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePoliceAction(tur.id, 'delete', 'tur')}
                              className="action-btn-small danger"
                              title="Sil"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentPoliceTab === 'teklifler' && (
          <div className="teklifler-content">
            <div className="content-header">
              <h3>Poliçe Teklifleri</h3>
              <button
                className="add-btn"
                onClick={() => {
                  setShowOfferModal(true);
                  setOfferCalc(null);
                  setOfferForm({
                    musteriId: '',
                    policeTuruId: '',
                    sigortaSirketiId: '',
                    riskBilgileri: {},
                    teminatlar: [],
                    taksitSayisi: 1,
                    notlar: ''
                  });
                  setSelectedTeminatlar([]);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Yeni Teklif Oluştur
              </button>
            </div>
            
            {loading ? (
              <div className="loading">Poliçe teklifleri yükleniyor...</div>
            ) : (
              <div className="teklifler-table">
                <table>
                  <thead>
                    <tr>
                      <th>Teklif No</th>
                      <th>Müşteri</th>
                      <th>Poliçe Türü</th>
                      <th>Sigorta Şirketi</th>
                      <th>Brüt Prim</th>
                      <th>Net Prim</th>
                      <th>Toplam Tutar</th>
                      <th>Durum</th>
                      <th>Teklif Tarihi</th>
                      <th>Geçerlilik Tarihi</th>
                      <th>Oluşturan</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policeTeklifleri.map((teklif) => (
                      <tr key={teklif.id}>
                        <td>{teklif.teklif_no}</td>
                        <td>{teklif.musteri_adi}</td>
                        <td>{teklif.police_turu_adi}</td>
                        <td>{teklif.sigorta_sirketi_adi}</td>
                        <td>{teklif.brut_prim ? `₺${teklif.brut_prim}` : '-'}</td>
                        <td>{teklif.net_prim ? `₺${teklif.net_prim}` : '-'}</td>
                        <td>{teklif.toplam_tutar ? `₺${teklif.toplam_tutar}` : '-'}</td>
                        <td>
                          <span className={`status-badge ${teklif.durum_adi === 'Onaylandı' ? 'success' : teklif.durum_adi === 'Beklemede' ? 'warning' : 'inactive'}`}>
                            {teklif.durum_adi}
                          </span>
                        </td>
                        <td>{teklif.teklif_tarihi ? new Date(teklif.teklif_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>{teklif.gecerlilik_tarihi ? new Date(teklif.gecerlilik_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>{teklif.olusturan_kullanici}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleTeklifEdit(teklif)}
                              className="action-btn-small info"
                              title="Düzenle"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePoliceAction(teklif.id, 'delete', 'teklif')}
                              className="action-btn-small danger"
                              title="Sil"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentPoliceTab === 'poliseler' && (
          <div className="poliseler-content">
            <div className="content-header">
              <h3>Poliçeler</h3>
            </div>
            
            {loading ? (
              <div className="loading">Poliçeler yükleniyor...</div>
            ) : (
              <div className="poliseler-table">
                <table>
                  <thead>
                    <tr>
                      <th>Poliçe No</th>
                      <th>Müşteri</th>
                      <th>Poliçe Türü</th>
                      <th>Sigorta Şirketi</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                      <th>Toplam Tutar</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poliseler.map((police) => (
                      <tr key={police.id}>
                        <td>{police.police_no}</td>
                        <td>{police.musteri_adi}</td>
                        <td>{police.police_turu_adi}</td>
                        <td>{police.sigorta_sirketi_adi}</td>
                        <td>{police.baslangic_tarihi ? new Date(police.baslangic_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>{police.bitis_tarihi ? new Date(police.bitis_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>{police.toplam_tutar ? `₺${police.toplam_tutar}` : '-'}</td>
                        <td>
                          <span className={`status-badge ${police.durum_adi === 'Aktif' ? 'success' : police.durum_adi === 'Beklemede' ? 'warning' : 'inactive'}`}>
                            {police.durum_adi}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handlePoliceEdit(police)}
                              className="action-btn-small info"
                              title="Düzenle"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePoliceAction(police.id, 'delete', 'police')}
                              className="action-btn-small danger"
                              title="Sil"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentPoliceTab === 'teminatlar' && (
          <div className="teminatlar-content">
            <div className="content-header">
              <h3>Teminatlar</h3>
              <button className="add-btn" onClick={() => {
                setModalMode('create');
                setSelectedItem(null);
                setTeminatForm({
                  police_turu_id: '', teminat_adi: '', teminat_kodu: '', zorunlu_mu: false,
                  min_teminat_tutari: '', max_teminat_tutari: '', hesaplama_turu: 'YUZDE',
                  prim_orani: '', sabit_prim: '', aktif_mi: true
                });
                setShowTeminatModal(true);
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14"/>
                  <path d="M5 12h14"/>
                </svg>
                Yeni Teminat
              </button>
            </div>
            
            {loading ? (
              <div className="loading">Teminatlar yükleniyor...</div>
            ) : (
              <div className="teminatlar-table">
                <table>
                  <thead>
                    <tr>
                      <th>Teminat Adı</th>
                      <th>Teminat Kodu</th>
                      <th>Poliçe Türü</th>
                      <th>Hesaplama Türü</th>
                      <th>Prim Oranı</th>
                      <th>Min Tutar</th>
                      <th>Max Tutar</th>
                      <th>Zorunlu</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teminatlar.length > 0 ? (
                      teminatlar.map((teminat: any) => (
                        <tr key={teminat.id}>
                          <td>{teminat.teminat_adi}</td>
                          <td>{teminat.teminat_kodu}</td>
                          <td>{teminat.police_turu_adi || 'N/A'}</td>
                          <td>{teminat.hesaplama_turu}</td>
                          <td>
                            {teminat.hesaplama_turu === 'YUZDE' 
                              ? `%${teminat.prim_orani}` 
                              : `₺${teminat.sabit_prim}`
                            }
                          </td>
                          <td>{teminat.min_teminat_tutari ? `₺${teminat.min_teminat_tutari}` : '-'}</td>
                          <td>{teminat.max_teminat_tutari ? `₺${teminat.max_teminat_tutari}` : '-'}</td>
                          <td>
                            <span className={`status-badge ${teminat.zorunlu_mu ? 'warning' : 'info'}`}>
                              {teminat.zorunlu_mu ? 'Evet' : 'Hayır'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${teminat.aktif_mi ? 'active' : 'inactive'}`}>
                              {teminat.aktif_mi ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => {
                                  setModalMode('edit');
                                  setSelectedItem(teminat);
                                  setTeminatForm({
                                    police_turu_id: teminat.police_turu_id?.toString() || '',
                                    teminat_adi: teminat.teminat_adi || '',
                                    teminat_kodu: teminat.teminat_kodu || '',
                                    zorunlu_mu: teminat.zorunlu_mu || false,
                                    min_teminat_tutari: teminat.min_teminat_tutari?.toString() || '',
                                    max_teminat_tutari: teminat.max_teminat_tutari?.toString() || '',
                                    hesaplama_turu: teminat.hesaplama_turu || 'YUZDE',
                                    prim_orani: teminat.prim_orani?.toString() || '',
                                    sabit_prim: teminat.sabit_prim?.toString() || '',
                                    aktif_mi: teminat.aktif_mi || true
                                  });
                                  setShowTeminatModal(true);
                                }}
                                className="action-btn-small info"
                                title="Düzenle"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  const executeAction = async () => {
                                    closeConfirmDialog();
                                    try {
                                      const token = localStorage.getItem('token');
                                      const res = await fetch(`/api/Teminatlar/${teminat.id}`, {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                      
                                      if (res.ok) {
                                        alert('Teminat başarıyla silindi');
                                        fetchPoliceData();
                                      } else {
                                        const error = await res.text();
                                        alert(`Silme hatası: ${error}`);
                                      }
                                    } catch (e) {
                                      console.error(e);
                                      alert('Silme işlemi sırasında hata oluştu');
                                    }
                                  };
                                  showConfirmDialog(
                                    'Teminat Silme Onayı',
                                    'Bu teminatı silmek istediğinizden emin misiniz?',
                                    executeAction,
                                    'danger'
                                  );
                                }}
                                className="action-btn-small danger"
                                title="Sil"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3,6 5,6 21,6"></polyline>
                                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} style={{textAlign: 'center', padding: '20px'}}>
                          Henüz teminat bulunmuyor
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentsContent = () => (
    <div className="payments-content">
      <div className="section-header">
        <h2>Ödemeler Yönetimi</h2>
        <p>Tüm ödemelerin yönetimi ve takibi</p>
      </div>
      
      <div className="payments-header">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Ödeme ara (ödeme no, müşteri adı, poliçe no)..."
              value={paymentSearchTerm}
              onChange={(e) => setPaymentSearchTerm(e.target.value)}
              className="search-input"
            />
            {paymentSearchTerm && (
              <button
                onClick={() => setPaymentSearchTerm('')}
                className="clear-search-btn"
                title="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="create-btn"
            onClick={() => {
              setShowPaymentModal(true);
              setPaymentModalType('create');
              setPaymentForm({
                id: '',
                musteriId: '',
                policeNo: '',
                tutar: '',
                odemeTarihi: new Date().toISOString().split('T')[0],
                vadeTarihi: '',
                odemeTuru: '',
                aciklama: ''
              });
            }}
          >
            Yeni Ödeme
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Ödemeler yükleniyor...</div>
      ) : (
        <>
          <div className="payments-table">
            <table>
              <thead>
                <tr>
                  <th>Ödeme No</th>
                  <th>Müşteri</th>
                  <th>Poliçe No</th>
                  <th>Tutar</th>
                  <th>Ödeme Tarihi</th>
                  <th>Ödeme Türü</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.odeme_no}</td>
                      <td>{payment.musteri_adi}</td>
                      <td>{payment.police_no || '-'}</td>
                      <td>{payment.tutar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td>{new Date(payment.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td>{payment.odeme_yontemi_detay}</td>
                      <td>
                        <span className={`status-badge ${payment.durum_adi.toLowerCase()}`}>
                          {payment.durum_adi}
                        </span>
                      </td>
                      <td>
                        <div className="payment-actions">
                          <button
                            onClick={() => handlePaymentEdit(payment)}
                            className="btn btn-sm btn-primary"
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handlePaymentStatusUpdate(payment)}
                            className="btn btn-sm btn-warning"
                            title="Durum Güncelle"
                          >
                            🔄
                          </button>
                          <button
                            onClick={() => handlePaymentDelete(payment.id)}
                            className="btn btn-sm btn-danger"
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="no-data">
                      Ödeme bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paymentTotalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPaymentCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={paymentCurrentPage === 1}
                className="pagination-btn"
              >
                Önceki
              </button>
              <span className="pagination-info">
                Sayfa {paymentCurrentPage} / {paymentTotalPages}
              </span>
              <button
                onClick={() => setPaymentCurrentPage(prev => Math.min(paymentTotalPages, prev + 1))}
                disabled={paymentCurrentPage === paymentTotalPages}
                className="pagination-btn"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderHasarlarContent = () => (
    <div className="hasarlar-content">
      <div className="section-header">
        <h2>Hasar Yönetimi</h2>
        <p>Tüm hasar dosyalarını görüntüleyin ve yönetin</p>
      </div>

      {loading ? (
        <div className="loading">Hasar dosyaları yükleniyor...</div>
      ) : (
        <div className="hasarlar-grid">
          {hasarlar.length > 0 ? (
            hasarlar.map((hasar) => (
              <div key={hasar.id} className="hasar-card">
                <div className="hasar-header">
                  <div className="hasar-no">{hasar.dosya_no}</div>
                  <div className={`hasar-durum ${hasar.durum_adi.toLowerCase().includes('beklemede') ? 'beklemede' : hasar.durum_adi.toLowerCase().includes('onaylandı') ? 'onaylandi' : 'reddedildi'}`}>
                    {hasar.durum_adi}
                  </div>
                </div>
                
                <div className="hasar-body">
                  <div className="hasar-info">
                    <div className="info-item">
                      <span className="label">Poliçe No:</span>
                      <span className="value">{hasar.police_no}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Müşteri:</span>
                      <span className="value">{hasar.musteri_adi}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Talep Edilen Tutar:</span>
                      <span className="value price">
                        {hasar.talep_edilen_tutar ? `₺${hasar.talep_edilen_tutar.toLocaleString('tr-TR')}` : 'Belirtilmemiş'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">Onaylanan Tutar:</span>
                      <span className="value price">
                        {hasar.onaylanan_tutar ? `₺${hasar.onaylanan_tutar.toLocaleString('tr-TR')}` : 'Henüz onaylanmadı'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="label">Bildirim Tarihi:</span>
                      <span className="value">{new Date(hasar.olusturma_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                <div className="hasar-actions">
                  <button
                    onClick={() => fetchHasarDetay(hasar.id)}
                    className="btn btn-primary"
                  >
                    Detayları Görüntüle
                  </button>
                  <button
                    onClick={() => {
                      setSelectedHasar(hasar as any);
                      setHasarDurumForm({
                        durum_id: 0, // Hasar interface'inde durum_id yok, API'den alınacak
                        onaylanan_tutar: hasar.onaylanan_tutar?.toString() || '',
                        red_nedeni: '',
                        notlar: ''
                      });
                      setShowHasarDurumModal(true);
                    }}
                    className="btn btn-warning"
                  >
                    Durum Güncelle
                  </button>
                  <button
                    onClick={() => handleHasarSil(hasar.id)}
                    className="btn btn-danger"
                    disabled={loading}
                  >
                    {loading ? 'Siliniyor...' : 'Sil'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-hasar">
              <div className="no-hasar-icon">🚨</div>
              <h3>Henüz hasar dosyası bulunmuyor</h3>
              <p>Hasar bildirimi bulunmamaktadır.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'users':
        return renderUsersContent();
      case 'customers':
        return renderCustomersContent();
      case 'police':
        return renderPoliceContent();
      case 'hasarlar':
        return renderHasarlarContent();
      case 'payments':
        return renderPaymentsContent();
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-left">
            <div className="favicon-section">
              <img src="/favicon.png" alt="AdaYazılım Favicon" className="dashboard-favicon" />
            </div>
            <nav className="admin-nav">
              <button 
                className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Genel Bakış
              </button>
              <button 
                className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Kullanıcılar
              </button>
              <button 
                className={`nav-btn ${activeTab === 'customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Müşteriler
              </button>
              <button 
                className={`nav-btn ${activeTab === 'police' ? 'active' : ''}`}
                onClick={() => setActiveTab('police')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                Poliçeler
              </button>
              <button 
                className={`nav-btn ${activeTab === 'hasarlar' ? 'active' : ''}`}
                onClick={() => setActiveTab('hasarlar')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Hasarlar
              </button>
              <button 
                className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Ödemeler
              </button>
            </nav>
          </div>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user?.ad} {user?.soyad}</span>
              <span className="user-role">Sistem Yöneticisi</span>
            </div>
            <button className="logout-btn" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="content-section">
          {renderContent()}
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır. | <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
      </footer>


      {/* Teklif Oluşturma Modal */}
      {showOfferModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Yeni Poliçe Teklifi Oluştur</h3>
              <button className="modal-close" onClick={() => { 
                setShowOfferModal(false); 
                setOfferCalc(null); 
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                {/* Temel Bilgiler */}
                <div className="form-section">
                  <h4>Temel Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Müşteri</label>
                      <select 
                        value={offerForm.musteriId} 
                        onChange={(e) => setOfferForm({ ...offerForm, musteriId: e.target.value })}
                        required
                      >
                        <option value="">Müşteri Seçiniz</option>
                        {customers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.ad} {m.soyad} - {m.musteri_no}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Poliçe Türü</label>
                      <select 
                        value={offerForm.policeTuruId} 
                        onChange={(e) => handlePoliceTuruChange(e.target.value)}
                        required
                      >
                        <option value="">Poliçe Türü Seçiniz</option>
                        {offerLookup.policeTurleri.map((t) => (
                          <option key={t.id} value={t.id}>{t.text}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Sigorta Şirketi</label>
                      <select 
                        value={offerForm.sigortaSirketiId} 
                        onChange={(e) => setOfferForm({ ...offerForm, sigortaSirketiId: e.target.value })}
                        required
                      >
                        <option value="">Sigorta Şirketi Seçiniz</option>
                        {offerLookup.sigortaSirketleri.map((s) => (
                          <option key={s.id} value={s.id}>{s.text}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Taksit Sayısı</label>
                      <select 
                        value={offerForm.taksitSayisi} 
                        onChange={(e) => setOfferForm({ ...offerForm, taksitSayisi: parseInt(e.target.value) })}
                      >
                        <option value={1}>Peşin</option>
                        <option value={3}>3 Taksit</option>
                        <option value={6}>6 Taksit</option>
                        <option value={12}>12 Taksit</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Risk Bilgileri */}
                {offerForm.policeTuruId && (
                  <div className="form-section">
                    <h4>Risk Bilgileri</h4>
                    {offerForm.policeTuruId && offerLookup.policeTurleri.find(t => t.id === parseInt(offerForm.policeTuruId))?.text === 'Trafik Sigortası' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Araç Değeri (₺)</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.aracDegeri || ''} 
                            onChange={(e) => handleRiskBilgileriChange('aracDegeri', parseFloat(e.target.value) || 0)}
                            placeholder="Örn: 500000"
                          />
                        </div>
                        <div className="form-group">
                          <label>Araç Yaşı</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.aracYasi || ''} 
                            onChange={(e) => handleRiskBilgileriChange('aracYasi', parseInt(e.target.value) || 0)}
                            placeholder="Örn: 3"
                          />
                        </div>
                        <div className="form-group">
                          <label>İl</label>
                          <select 
                            value={offerForm.riskBilgileri.il || ''} 
                            onChange={(e) => handleRiskBilgileriChange('il', e.target.value)}
                          >
                            <option value="">İl Seçiniz</option>
                            <option value="İSTANBUL">İstanbul</option>
                            <option value="ANKARA">Ankara</option>
                            <option value="İZMİR">İzmir</option>
                            <option value="BURSA">Bursa</option>
                            <option value="ANTALYA">Antalya</option>
                            <option value="ADANA">Adana</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {offerForm.policeTuruId && offerLookup.policeTurleri.find(t => t.id === parseInt(offerForm.policeTuruId))?.text === 'Kasko Sigortası' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Araç Değeri (₺)</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.aracDegeri || ''} 
                            onChange={(e) => handleRiskBilgileriChange('aracDegeri', parseFloat(e.target.value) || 0)}
                            placeholder="Örn: 500000"
                          />
                        </div>
                        <div className="form-group">
                          <label>Sürücü Yaşı</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.surucuYasi || ''} 
                            onChange={(e) => handleRiskBilgileriChange('surucuYasi', parseInt(e.target.value) || 25)}
                            placeholder="Örn: 30"
                          />
                        </div>
                        <div className="form-group">
                          <label>Sürücü Deneyimi</label>
                          <select 
                            value={offerForm.riskBilgileri.surucuDeneyimi || ''} 
                            onChange={(e) => handleRiskBilgileriChange('surucuDeneyimi', e.target.value)}
                          >
                            <option value="YENI">Yeni Sürücü</option>
                            <option value="DENEYIMLI">Deneyimli Sürücü</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {offerForm.policeTuruId && offerLookup.policeTurleri.find(t => t.id === parseInt(offerForm.policeTuruId))?.text === 'DASK' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Bina Değeri (₺)</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.binaDegeri || ''} 
                            onChange={(e) => handleRiskBilgileriChange('binaDegeri', parseFloat(e.target.value) || 0)}
                            placeholder="Örn: 1000000"
                          />
                        </div>
                        <div className="form-group">
                          <label>İl</label>
                          <select 
                            value={offerForm.riskBilgileri.il || ''} 
                            onChange={(e) => handleRiskBilgileriChange('il', e.target.value)}
                          >
                            <option value="">İl Seçiniz</option>
                            <option value="İSTANBUL">İstanbul</option>
                            <option value="ANKARA">Ankara</option>
                            <option value="İZMİR">İzmir</option>
                            <option value="BURSA">Bursa</option>
                            <option value="ANTALYA">Antalya</option>
                            <option value="ADANA">Adana</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Deprem Bölgesi</label>
                          <select 
                            value={offerForm.riskBilgileri.depremBolgesi || ''} 
                            onChange={(e) => handleRiskBilgileriChange('depremBolgesi', e.target.value)}
                          >
                            <option value="1">1. Bölge</option>
                            <option value="2">2. Bölge</option>
                            <option value="3">3. Bölge</option>
                            <option value="4">4. Bölge</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {offerForm.policeTuruId && offerLookup.policeTurleri.find(t => t.id === parseInt(offerForm.policeTuruId))?.text === 'Sağlık Sigortası' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Yaş</label>
                          <input 
                            type="number" 
                            value={offerForm.riskBilgileri.yas || ''} 
                            onChange={(e) => handleRiskBilgileriChange('yas', parseInt(e.target.value) || 30)}
                            placeholder="Örn: 35"
                          />
                        </div>
                        <div className="form-group">
                          <label>Sağlık Durumu</label>
                          <select 
                            value={offerForm.riskBilgileri.saglikDurumu || ''} 
                            onChange={(e) => handleRiskBilgileriChange('saglikDurumu', e.target.value)}
                          >
                            <option value="İYİ">İyi</option>
                            <option value="ORTA">Orta</option>
                            <option value="KÖTÜ">Kötü</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Meslek</label>
                          <select 
                            value={offerForm.riskBilgileri.meslek || ''} 
                            onChange={(e) => handleRiskBilgileriChange('meslek', e.target.value)}
                          >
                            <option value="MEMUR">Memur</option>
                            <option value="İŞÇİ">İşçi</option>
                            <option value="SERBEST">Serbest</option>
                            <option value="TEHLİKELİ">Tehlikeli Meslek</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Teminatlar */}
                {selectedTeminatlar.length > 0 && (
                  <div className="form-section">
                    <h4>Teminatlar</h4>
                    <div className="teminatlar-grid">
                      {selectedTeminatlar.map((teminat) => (
                        <div key={teminat.id} className="teminat-item">
                          <div className="teminat-header">
                            <label>
                              <input
                                type="checkbox"
                                checked={teminat.dahilMi}
                                onChange={(e) => handleTeminatChange(teminat.id, 'dahilMi', e.target.checked)}
                                disabled={teminat.zorunluMu}
                                style={{ opacity: teminat.zorunluMu ? 0.6 : 1 }}
                              />
                              {teminat.text}
                              {teminat.zorunluMu && <span className="zorunlu-badge">Zorunlu</span>}
                            </label>
                          </div>
                          {teminat.dahilMi && (
                            <div className="teminat-details">
                              <div className="teminat-info">
                                <span className="hesaplama-bilgi">
                                  {teminat.hesaplamaTuru === 'SABIT' 
                                    ? `Sabit: ₺${teminat.sabitPrim || 0}` 
                                    : `Oran: %${teminat.primOrani || 0}`
                                  }
                                </span>
                                {(teminat.minTutar || teminat.maxTutar) && (
                                  <span className="limit-bilgi">
                                    {teminat.minTutar && `Min: ₺${teminat.minTutar}`}
                                    {teminat.maxTutar && ` Max: ₺${teminat.maxTutar}`}
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                placeholder="Limit (₺)"
                                value={teminat.limit || ''}
                                onChange={(e) => handleTeminatChange(teminat.id, 'limit', parseFloat(e.target.value) || 0)}
                                min={teminat.minTutar || 0}
                                max={teminat.maxTutar || undefined}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fiyat Hesaplama Sonucu */}
                {offerCalc && (
                  <div className="form-section">
                    <h4>Fiyat Hesaplama Sonucu</h4>
                    <div className="calculation-summary">
                      <div className="summary-item">
                        <span className="label">Temel Prim:</span>
                        <span className="value">₺{offerCalc.temelPrim?.toFixed(2)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Teminat Primi:</span>
                        <span className="value">₺{offerCalc.teminatPrimi?.toFixed(2)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Brüt Prim:</span>
                        <span className="value">₺{(offerCalc.temelPrim + offerCalc.teminatPrimi)?.toFixed(2)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Vergi Dahil Tutar:</span>
                        <span className="value">₺{(offerCalc.temelPrim + offerCalc.teminatPrimi + offerCalc.vergiTutari)?.toFixed(2)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Vergi (%21):</span>
                        <span className="value">₺{offerCalc.vergiTutari?.toFixed(2)}</span>
                      </div>
                      
                      {/* Komisyon bilgileri sadece admin ve acente için */}
                      {canSeeCommission && (
                        <>
                          <div className="summary-item commission-info">
                            <span className="label">
                              Komisyon (
                              {offerCalc.komisyonOrani 
                                ? `%${(offerCalc.komisyonOrani * 100).toFixed(1)}`
                                : (() => {
                                    const selectedSirket = sigortaSirketleri.find(s => s.id === parseInt(offerForm.sigortaSirketiId));
                                    const komisyonOrani = selectedSirket?.komisyon_orani || 5; // Yüzde olarak (5 = %5)
                                    return `%${komisyonOrani.toFixed(1)}`;
                                  })()
                              }
                              ):
                            </span>
                            <span className="value">₺{offerCalc.komisyonTutari?.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="summary-item total">
                        <span className="label">
                          {canSeeCommission ? 'Müşteri Toplam Tutarı (Komisyon Dahil):' : 'Toplam Tutar (Komisyon Dahil):'}
                        </span>
                        <span className="value">₺{offerCalc.musteriToplamTutar?.toFixed(2) || offerCalc.toplamPrim?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Teminat Detayları */}
                    {offerCalc.teminatDetaylari && offerCalc.teminatDetaylari.length > 0 && (
                      <div className="teminat-detaylari">
                        <h5>Teminat Detayları</h5>
                        <div className="teminat-detay-list">
                          {offerCalc.teminatDetaylari.map((teminat: any, index: number) => (
                            <div key={index} className="teminat-detay-item">
                              <div className="teminat-detay-header">
                                <span className="teminat-adi">{teminat.teminatAdi}</span>
                                <span className="teminat-prim">₺{teminat.prim?.toFixed(2)}</span>
                              </div>
                              <div className="teminat-detay-info">
                                <span className="teminat-limit">Limit: ₺{teminat.limit?.toFixed(2)}</span>
                                <span className="teminat-aciklama">{teminat.aciklama}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notlar */}
                <div className="form-section">
                  <h4>Notlar</h4>
                  <div className="form-group">
                    <textarea
                      value={offerForm.notlar}
                      onChange={(e) => setOfferForm({ ...offerForm, notlar: e.target.value })}
                      placeholder="Teklif ile ilgili notlar..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button className="modal-btn secondary" onClick={() => setShowOfferModal(false)}>
                    İptal
                  </button>
                  <button
                    className="modal-btn"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        
                        // Seçili teminatları formatla
                        const teminatlar = selectedTeminatlar
                          .filter(t => t.dahilMi)
                          .map(t => ({
                            teminatId: t.id,
                            limit: t.limit || 0,
                            dahilMi: true
                          }));

                        // requestData değişkeni kullanılmadığı için kaldırıldı

                        const res = await fetch('/api/PoliceTeklifleri/hesapla', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${token}`, 
                            'Content-Type': 'application/json' 
                          },
                          body: JSON.stringify({
                            police_turu_id: parseInt(offerForm.policeTuruId),
                            sigorta_sirketi_id: parseInt(offerForm.sigortaSirketiId),
                            risk_bilgileri: JSON.stringify(offerForm.riskBilgileri),
                            teminat_bilgileri: JSON.stringify({ teminatlar: teminatlar })
                          })
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          setOfferCalc(data);
                        } else {
                          const error = await res.text();
                          alert('Fiyat hesaplama başarısız: ' + error);
                        }
                      } catch (e) { 
                        console.error(e); 
                        alert('Fiyat hesaplama sırasında hata oluştu');
                      }
                    }}
                    disabled={!offerForm.musteriId || !offerForm.policeTuruId || !offerForm.sigortaSirketiId}
                  >
                    Fiyat Hesapla
                  </button>
                  <button
                    className="modal-btn primary"
                    disabled={!offerCalc || !offerForm.musteriId || !offerForm.policeTuruId || !offerForm.sigortaSirketiId}
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        
                        // Seçili teminatları formatla
                        const teminatlar = selectedTeminatlar
                          .filter(t => t.dahilMi)
                          .map(t => ({
                            teminatId: t.id,
                            limit: t.limit || 0,
                            dahilMi: true
                          }));

                        const requestData = {
                          musteri_id: parseInt(offerForm.musteriId),
                          police_turu_id: parseInt(offerForm.policeTuruId),
                          sigorta_sirketi_id: parseInt(offerForm.sigortaSirketiId),
                          risk_bilgileri: JSON.stringify(offerForm.riskBilgileri),
                          teminat_bilgileri: JSON.stringify({ teminatlar: teminatlar }),
                          brut_prim: offerCalc ? (offerCalc.temelPrim + offerCalc.teminatPrimi) : null,
                          net_prim: offerCalc ? offerCalc.adminNetTutar : null,
                          komisyon_tutari: offerCalc ? offerCalc.komisyonTutari : null,
                          vergi_tutari: offerCalc ? offerCalc.vergiTutari : null,
                          toplam_tutar: offerCalc ? offerCalc.musteriToplamTutar : null,
                          notlar: offerForm.notlar
                        };

                        const res = await fetch('/api/PoliceTeklifleri', {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${token}`, 
                            'Content-Type': 'application/json' 
                          },
                          body: JSON.stringify(requestData)
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          setShowOfferModal(false);
                          setOfferCalc(null);
                          await fetchPoliceData();
                          alert('Teklif başarıyla oluşturuldu! Teklif No: ' + data.teklif_no);
                        } else {
                          const error = await res.text();
                          alert('Teklif oluşturulamadı: ' + error);
                        }
                      } catch (e) { 
                        console.error(e); 
                        alert('Teklif oluşturma sırasında hata oluştu');
                      }
                    }}
                  >
                    Teklif Oluştur
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Kullanıcı Oluştur/Düzenle Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{userModalType === 'create' ? 'Yeni Kullanıcı' : 'Kullanıcıyı Düzenle'}</h3>
              <button className="modal-close" onClick={() => { 
                setShowUserModal(false); 
                setUserFormErrors({});
                // Form state'ini sıfırla - sadece modal kapandığında
                if (userModalType === 'create') {
                  setUserForm({ 
                    id: '', 
                    ad: '', 
                    soyad: '', 
                    email: '', 
                    password: '', 
                    newPassword: '',
                    confirmPassword: '',
                    telefon: '', 
                    rol: 'KULLANICI', 
                    pozisyon: '', 
                    departman: '',
                    changePassword: false
                  });
                }
              }}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad *</label>
                    <input
                      value={userForm.ad}
                      onChange={(e) => updateUserForm('ad', e.target.value)}
                      onBlur={(e) => updateUserForm('ad', formatName(e.target.value))}
                      maxLength={50}
                      pattern="^[A-Za-zÇĞİÖŞÜçğıöşü\s'-]{2,50}$"
                      title="Sadece harf, boşluk, - ve ' karakterleri"
                      required
                    />
                    {userFormErrors.ad && <small className="error-text">{userFormErrors.ad}</small>}
                  </div>
                  <div className="form-group">
                    <label>Soyad *</label>
                    <input
                      value={userForm.soyad}
                      onChange={(e) => updateUserForm('soyad', e.target.value)}
                      onBlur={(e) => updateUserForm('soyad', formatName(e.target.value))}
                      maxLength={50}
                      pattern="^[A-Za-zÇĞİÖŞÜçğıöşü\s'-]{2,50}$"
                      title="Sadece harf, boşluk, - ve ' karakterleri"
                      required
                    />
                    {userFormErrors.soyad && <small className="error-text">{userFormErrors.soyad}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>E-posta *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => updateUserForm('email', e.target.value)}
                      required
                    />
                    {userFormErrors.email && <small className="error-text">{userFormErrors.email}</small>}
                  </div>
                  <div className="form-group">
                    <label>Telefon *</label>
                    <input
                      value={userForm.telefon}
                      onChange={(e) => updateUserForm('telefon', e.target.value)}
                      onBlur={(e) => updateUserForm('telefon', formatPhone(e.target.value))}
                      pattern="^[0-9]{10}$"
                      maxLength={10}
                      placeholder="5XXXXXXXXX (sadece rakam)"
                      title="10 haneli, sadece rakam"
                      required
                    />
                    {userFormErrors.telefon && <small className="error-text">{userFormErrors.telefon}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Rol</label>
                    <select value={userForm.rol} onChange={(e) => updateUserForm('rol', e.target.value)}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="ACENTE">ACENTE</option>
                      <option value="KULLANICI">KULLANICI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pozisyon</label>
                    <input value={userForm.pozisyon} onChange={(e) => updateUserForm('pozisyon', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Departman</label>
                    <input value={userForm.departman} onChange={(e) => updateUserForm('departman', e.target.value)} />
                  </div>
                  {userModalType === 'create' && (
                    <div className="form-group">
                      <label>Şifre *</label>
                      <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => updateUserForm('password', e.target.value)}
                          placeholder="En az 12 karakter"
                          required={userModalType === 'create'}
                        />
                      {userFormErrors.password && <small className="error-text">{userFormErrors.password}</small>}
                    </div>
                  )}
                </div>
                
                {/* Şifre Değiştirme Bölümü - Sadece Düzenleme Modunda */}
                {userModalType === 'edit' && (
                  <div className="form-section">
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>
                          <input
                            type="checkbox"
                            checked={userForm.changePassword}
                            onChange={(e) => {
                              updateUserForm('changePassword', e.target.checked);
                              if (!e.target.checked) {
                                updateUserForm('newPassword', '');
                                updateUserForm('confirmPassword', '');
                              }
                            }}
                          />
                          <span style={{marginLeft: '8px'}}>Şifre değiştir</span>
                        </label>
                      </div>
                    </div>
                    
                    {userForm.changePassword && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Yeni Şifre</label>
                            <input
                              type="password"
                              value={userForm.newPassword}
                              onChange={(e) => updateUserForm('newPassword', e.target.value)}
                              placeholder="En az 12 karakter, büyük/küçük harf, rakam, özel karakter"
                              required={userForm.changePassword}
                            />
                            {userFormErrors.newPassword && <small className="error-text">{userFormErrors.newPassword}</small>}
                          </div>
                          <div className="form-group">
                            <label>Şifre Tekrarı</label>
                            <input
                              type="password"
                              value={userForm.confirmPassword}
                              onChange={(e) => updateUserForm('confirmPassword', e.target.value)}
                              placeholder="Şifreyi tekrar girin"
                              required={userForm.changePassword}
                            />
                            {userFormErrors.confirmPassword && <small className="error-text">{userFormErrors.confirmPassword}</small>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => {
                setShowUserModal(false);
                setUserFormErrors({});
                // Form state'ini sıfırla
                setUserForm({ 
                  id: '', 
                  ad: '', 
                  soyad: '', 
                  email: '', 
                  password: '', 
                  newPassword: '',
                  confirmPassword: '',
                  telefon: '', 
                  rol: 'KULLANICI', 
                  pozisyon: '', 
                  departman: '',
                  changePassword: false
                });
              }}>Kapat</button>
              <button
                className="modal-btn primary"
                onClick={async () => {
                  console.log('Form submit başladı, userForm:', userForm);
                  
                  // Form verilerini geçici olarak sakla
                  const formData = { ...userForm };
                  
                  // Validation kontrolü
                  const errs: {[k:string]: string} = {};
                  
                  // Ad validation
                  if (!formData.ad || !formData.ad.trim()) {
                    errs.ad = 'Ad zorunludur';
                  } else {
                    const adValidation = validateName(formData.ad, 'Ad');
                    if (!adValidation.isValid) errs.ad = adValidation.error!;
                  }
                  
                  // Soyad validation
                  if (!formData.soyad || !formData.soyad.trim()) {
                    errs.soyad = 'Soyad zorunludur';
                  } else {
                    const soyadValidation = validateName(formData.soyad, 'Soyad');
                    if (!soyadValidation.isValid) errs.soyad = soyadValidation.error!;
                  }
                  
                  // Email validation
                  if (!formData.email || !formData.email.trim()) {
                    errs.email = 'E-posta zorunludur';
                  } else {
                    const emailValidation = validateEmail(formData.email);
                    if (!emailValidation.isValid) errs.email = emailValidation.error!;
                  }
                  
                  // Telefon validation
                  if (!formData.telefon || !formData.telefon.trim()) {
                    errs.telefon = 'Telefon zorunludur';
                  } else {
                    const phoneValidation = validatePhone(formData.telefon);
                    if (!phoneValidation.isValid) errs.telefon = phoneValidation.error!;
                  }
                  
                  // Şifre validation (sadece create modunda)
                  if (userModalType === 'create') {
                    if (!formData.password || !formData.password.trim()) {
                      errs.password = 'Şifre zorunludur';
                    } else {
                      const passwordValidation = validatePassword(formData.password);
                      if (!passwordValidation.isValid) errs.password = passwordValidation.error!;
                    }
                  }
                  
                  // Düzenleme modunda şifre değiştirme validation'ı
                  if (userModalType === 'edit' && formData.changePassword) {
                    if (!formData.newPassword) {
                      errs.newPassword = 'Yeni şifre zorunludur';
                    } else {
                      const newPasswordValidation = validatePassword(formData.newPassword);
                      if (!newPasswordValidation.isValid) errs.newPassword = newPasswordValidation.error!;
                    }
                    
                    if (!formData.confirmPassword) {
                      errs.confirmPassword = 'Şifre tekrarı zorunludur';
                    } else if (formData.newPassword !== formData.confirmPassword) {
                      errs.confirmPassword = 'Şifreler uyuşmuyor';
                    }
                  }
                  
                  console.log('Validation hataları:', errs);
                  setUserFormErrors(errs);
                  if (Object.keys(errs).length > 0) {
                    console.log('Validation hataları var, işlem durduruluyor');
                    return;
                  }

                  try {
                    const token = localStorage.getItem('token');
                    if (userModalType === 'create') {
                      const res = await fetch('/api/Admin/users', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          Ad: formData.ad,
                          Soyad: formData.soyad,
                          Email: formData.email,
                          Password: formData.password,
                          Telefon: formData.telefon.replace(/\D/g, ''),
                          Role: formData.rol,
                          Pozisyon: formData.pozisyon,
                          Departman: formData.departman
                        })
                      });
                      if (!res.ok) { 
                        const e = await res.text(); 
                        console.error('Kullanıcı ekleme hatası:', e);
                        alert('Kullanıcı eklenemedi: ' + e); 
                        return; 
                      }
                      console.log('Kullanıcı başarıyla oluşturuldu');
                    } else {
                      // Düzenle: backend hem Identity Id hem de KULLANICILAR.id kabul ediyor
                      const id = editingIdentityId || userForm.id;
                      const res = await fetch(`/api/Admin/users/${id}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          Ad: formData.ad,
                          Soyad: formData.soyad,
                          Email: formData.email,
                          Telefon: formData.telefon.replace(/\D/g, ''),
                          Pozisyon: formData.pozisyon,
                          Departman: formData.departman,
                          Role: formData.rol, // Rol bilgisini de gönder
                          AktifMi: true
                        })
                      });
                      if (!res.ok) { 
                        const e = await res.text(); 
                        console.error('Kullanıcı güncelleme hatası:', e);
                        console.error('Kullanılan ID:', id, 'editingIdentityId:', editingIdentityId, 'userForm.id:', userForm.id);
                        alert('Kullanıcı güncellenemedi: ' + e); 
                        return; 
                      }
                      
                      // Şifre güncelleme - sadece şifre değiştirme checkbox'ı işaretliyse
                      if (formData.changePassword && formData.newPassword) {
                        try {
                          const passwordRes = await fetch(`/api/Admin/users/${id}/reset-password`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({ NewPassword: formData.newPassword })
                          });
                          if (!passwordRes.ok) {
                            const passwordErr = await passwordRes.text();
                            console.error('Şifre güncellenemedi:', passwordErr);
                            alert('Şifre güncellenemedi: ' + passwordErr);
                            return;
                          } else {
                            alert('Kullanıcı bilgileri ve şifre başarıyla güncellendi');
                          }
                        } catch (passwordError) {
                          console.error('Şifre güncelleme hatası:', passwordError);
                          alert('Şifre güncelleme sırasında hata oluştu');
                          return;
                        }
                      }
                    }
                    console.log('İşlem başarılı, form state sıfırlanıyor...');
                    setUserFormErrors({});
                    await fetchUsers();
                    await fetchDashboardStats();
                    
                    // Modal'ı kapat ve form'u sıfırla
                    if (userModalType === 'create') {
                      console.log('Create modunda form sıfırlanıyor');
                      setUserForm({ 
                        id: '', 
                        ad: '', 
                        soyad: '', 
                        email: '', 
                        password: '', 
                        newPassword: '',
                        confirmPassword: '',
                        telefon: '', 
                        rol: 'KULLANICI', 
                        pozisyon: '', 
                        departman: '',
                        changePassword: false
                      });
                      alert('Kullanıcı eklendi');
                    } else if (!formData.changePassword) {
                      alert('Kullanıcı güncellendi');
                    }
                    
                    // Modal'ı en son kapat
                    setShowUserModal(false);
                  } catch (e) { console.error(e); }
                }}
              >
                {userModalType === 'create' ? 'Oluştur' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Müşteri Oluşturma Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yeni Müşteri</h3>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-group">
                  <label>KULLANICI Rolündeki Kullanıcı Seç</label>
                  <select
                    value={selectedCandidate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCandidate(val);
                      const u = customerCandidates.find(c => c.id === val);
                      if (u) {
                        setCustomerForm({
                          ad: u.ad || '',
                          soyad: u.soyad || '',
                          eposta: u.email || '',
                          telefon: u.telefon || '',
                          tc_kimlik_no: '',
                          vergi_no: '',
                          adres_il: '',
                          adres_ilce: '',
                          adres_mahalle: '',
                          adres_sokak: ''
                        });
                      }
                    }}
                  >
                    <option value="">Seçiniz...</option>
                    {customerCandidates.map(c => (
                      <option key={c.id} value={c.id}>{c.email} - {(c.ad||'') + ' ' + (c.soyad||'')}</option>
                    ))}
                  </select>
                  {customerErrors.candidate && <small className="error-text">{customerErrors.candidate}</small>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad *</label>
                    <input value={customerForm.ad} readOnly required />
                    {customerErrors.ad && <small className="error-text">{customerErrors.ad}</small>}
                  </div>
                  <div className="form-group">
                    <label>Soyad *</label>
                    <input value={customerForm.soyad} readOnly required />
                    {customerErrors.soyad && <small className="error-text">{customerErrors.soyad}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>E-posta *</label>
                    <input type="email" value={customerForm.eposta} readOnly required />
                    {customerErrors.eposta && <small className="error-text">{customerErrors.eposta}</small>}
                  </div>
                  <div className="form-group">
                    <label>Telefon *</label>
                    <input value={customerForm.telefon} onChange={(e)=> updateCustomerForm('telefon', e.target.value)}
                      onBlur={(e)=> updateCustomerForm('telefon', formatPhone(e.target.value))}
                      placeholder="5XXXXXXXXX (sadece rakam)" required />
                    {customerErrors.telefon && <small className="error-text">{customerErrors.telefon}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>TC Kimlik No</label>
                    <input value={customerForm.tc_kimlik_no} onChange={(e)=> updateCustomerForm('tc_kimlik_no', e.target.value)}
                      onBlur={(e)=> updateCustomerForm('tc_kimlik_no', formatTcKimlik(e.target.value))}
                      placeholder="XXXXXXXXXXX" />
                    {customerErrors.tc_kimlik_no && <small className="error-text">{customerErrors.tc_kimlik_no}</small>}
                  </div>
                  <div className="form-group">
                    <label>Vergi No (Geçici olarak devre dışı)</label>
                    <input value={customerForm.vergi_no} onChange={(e)=> updateCustomerForm('vergi_no', e.target.value)}
                                              onBlur={(e)=> updateCustomerForm('vergi_no', e.target.value)}
                      placeholder="XXXXXXXXXX" disabled />
                    {customerErrors.vergi_no && <small className="error-text">{customerErrors.vergi_no}</small>}
                  </div>
                </div>
                <AddressSelector
                  selectedIl={customerForm.adres_il}
                  selectedIlce={customerForm.adres_ilce}
                  selectedMahalle={customerForm.adres_mahalle}
                  selectedSokak={customerForm.adres_sokak}
                  onIlChange={(il) => updateCustomerForm('adres_il', il)}
                  onIlceChange={(ilce) => updateCustomerForm('adres_ilce', ilce)}
                  onMahalleChange={(mahalle) => updateCustomerForm('adres_mahalle', mahalle)}
                  onSokakChange={(sokak) => updateCustomerForm('adres_sokak', sokak)}
                  disabled={false}
                  showSokak={true}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowCustomerModal(false)}>Kapat</button>
              <button className="modal-btn primary" onClick={async ()=>{
                const errs: {[k:string]:string} = {};
                if (!selectedCandidate) errs.candidate = 'Kullanıcı seçiniz';
                
                // Ad validation
                if (!customerForm.ad || !customerForm.ad.trim()) {
                  errs.ad = 'Ad zorunludur';
                } else {
                  const adValidation = validateName(customerForm.ad, 'Ad');
                  if (!adValidation.isValid) errs.ad = adValidation.error!;
                }
                
                // Soyad validation
                if (!customerForm.soyad || !customerForm.soyad.trim()) {
                  errs.soyad = 'Soyad zorunludur';
                } else {
                  const soyadValidation = validateName(customerForm.soyad, 'Soyad');
                  if (!soyadValidation.isValid) errs.soyad = soyadValidation.error!;
                }
                
                // Email validation
                if (!customerForm.eposta || !customerForm.eposta.trim()) {
                  errs.eposta = 'E-posta zorunludur';
                } else {
                  const emailValidation = validateEmail(customerForm.eposta);
                  if (!emailValidation.isValid) errs.eposta = emailValidation.error!;
                }
                
                // Telefon validation
                if (!customerForm.telefon || !customerForm.telefon.trim()) {
                  errs.telefon = 'Telefon zorunludur';
                } else {
                  const phoneValidation = validatePhone(customerForm.telefon);
                  if (!phoneValidation.isValid) errs.telefon = phoneValidation.error!;
                }
                
                // TC Kimlik No validation (opsiyonel)
                if (customerForm.tc_kimlik_no && customerForm.tc_kimlik_no.trim()) {
                  const tcValidation = validateTcKimlik(customerForm.tc_kimlik_no);
                  if (!tcValidation.isValid) errs.tc_kimlik_no = tcValidation.error!;
                }
                
                // Vergi No validation (geçici olarak devre dışı)
                // if (customerForm.vergi_no && customerForm.vergi_no.trim()) {
                //   const vergiValidation = validateVergiNo(customerForm.vergi_no);
                //   if (!vergiValidation.isValid) errs.vergi_no = vergiValidation.error!;
                // }
                
                // İl validation (opsiyonel)
                if (customerForm.adres_il && customerForm.adres_il.trim()) {
                  const cityValidation = validateCity(customerForm.adres_il);
                  if (!cityValidation.isValid) errs.adres_il = cityValidation.error!;
                }
                
                setCustomerErrors(errs);
                if (Object.keys(errs).length>0) return;
                try {
                  const token = localStorage.getItem('token');
                  // Seçilen kullanıcının ID'sini al
                  const selectedUser = customerCandidates.find(c => c.id === selectedCandidate);
                  const kullanicilarId = selectedUser ? parseInt(selectedUser.id) : null;
                  console.log('Kullanıcı ID:', kullanicilarId); // Kullanımı göstermek için
                  // Müşteri oluştur
                  const requestBody = {
                    kullanici_id: kullanicilarId,
                    ad: customerForm.ad,
                    soyad: customerForm.soyad,
                    eposta: customerForm.eposta,
                    telefon: customerForm.telefon.replace(/\D/g, '').length === 10 ? customerForm.telefon.replace(/\D/g, '') : null,
                    tc_kimlik_no: customerForm.tc_kimlik_no && customerForm.tc_kimlik_no.replace(/\D/g, '').length === 11 ? customerForm.tc_kimlik_no.replace(/\D/g, '') : null,
                                          vergi_no: null, // Vergi numarası geçici olarak devre dışı bırakıldı
                    adres_il: customerForm.adres_il || null,
                    dogum_tarihi: null,
                    cinsiyet_id: null,
                    medeni_durum_id: null,
                    meslek: null,
                    egitim_durumu_id: null,
                    aylik_gelir: null,
                    adres_ilce: null,
                    adres_mahalle: null,
                    adres_detay: null,
                    posta_kodu: null,
                    not_bilgileri: null,
                    blacklist_mi: false,
                    blacklist_nedeni: null
                  };
                  
                  console.log('Müşteri oluşturma request body:', requestBody);
                  
                  const res = await fetch('/api/Musteriler', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                  });
                  if (!res.ok){ 
                    const e = await res.text(); 
                    console.error('Müşteri oluşturma hatası:', e);
                    alert('Müşteri kaydedilemedi: '+e); 
                    return; 
                  }
                  setShowCustomerModal(false);
                  await fetchCustomers();
                  await fetchDashboardStats();
                  alert('Müşteri oluşturuldu');
                } catch(e){ console.error(e); }
              }}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Düzenleme Modal */}
      {showEditCustomerModal && editingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>Müşteri Düzenle - {editingCustomer.ad} {editingCustomer.soyad}</h3>
              <button className="modal-close" onClick={() => setShowEditCustomerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad *</label>
                    <input 
                      value={editCustomerForm.ad} 
                      onChange={(e) => updateEditCustomerForm('ad', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('ad', formatName(e.target.value))}
                      required 
                    />
                    {editCustomerErrors.ad && <small className="error-text">{editCustomerErrors.ad}</small>}
                  </div>
                  <div className="form-group">
                    <label>Soyad *</label>
                    <input 
                      value={editCustomerForm.soyad} 
                      onChange={(e) => updateEditCustomerForm('soyad', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('soyad', formatName(e.target.value))}
                      required 
                    />
                    {editCustomerErrors.soyad && <small className="error-text">{editCustomerErrors.soyad}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Şirket Adı</label>
                    <input 
                      value={editCustomerForm.sirket_adi} 
                      onChange={(e) => updateEditCustomerForm('sirket_adi', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('sirket_adi', formatCompanyName(e.target.value))}
                      maxLength={100}
                    />
                  </div>
                  <div className="form-group">
                    <label>E-posta *</label>
                    <input 
                      type="email" 
                      value={editCustomerForm.eposta} 
                      onChange={(e) => updateEditCustomerForm('eposta', e.target.value)}
                      required 
                    />
                    {editCustomerErrors.eposta && <small className="error-text">{editCustomerErrors.eposta}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Telefon *</label>
                    <input 
                      value={editCustomerForm.telefon} 
                      onChange={(e) => updateEditCustomerForm('telefon', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('telefon', formatPhone(e.target.value))}
                      maxLength={10}
                      placeholder="5XXXXXXXXX (sadece rakam)"
                      required 
                    />
                    {editCustomerErrors.telefon && <small className="error-text">{editCustomerErrors.telefon}</small>}
                  </div>
                                    <div className="form-group">
                    <label>TC Kimlik No</label>
                    <input 
                      value={editCustomerForm.tc_kimlik_no} 
                      onChange={(e) => updateEditCustomerForm('tc_kimlik_no', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('tc_kimlik_no', formatTcKimlik(e.target.value))}
                      maxLength={11}
                    />
                    {editCustomerErrors.tc_kimlik_no && <small className="error-text">{editCustomerErrors.tc_kimlik_no}</small>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vergi No (Geçici olarak devre dışı)</label>
                    <input 
                      value={editCustomerForm.vergi_no} 
                      onChange={(e) => updateEditCustomerForm('vergi_no', e.target.value)}
                                              onBlur={(e) => updateEditCustomerForm('vergi_no', e.target.value)}
                      maxLength={10}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Doğum Tarihi</label>
                    <input 
                      type="date" 
                      value={editCustomerForm.dogum_tarihi} 
                      onChange={(e) => updateEditCustomerForm('dogum_tarihi', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Meslek</label>
                    <input 
                      value={editCustomerForm.meslek} 
                      onChange={(e) => updateEditCustomerForm('meslek', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Aylık Gelir</label>
                    <input 
                      type="number" 
                      value={editCustomerForm.aylik_gelir} 
                      onChange={(e) => updateEditCustomerForm('aylik_gelir', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <AddressSelector
                  selectedIl={editCustomerForm.adres_il}
                  selectedIlce={editCustomerForm.adres_ilce}
                  selectedMahalle={editCustomerForm.adres_mahalle}
                  selectedSokak={editCustomerForm.adres_sokak}
                  onIlChange={(il) => updateEditCustomerForm('adres_il', il)}
                  onIlceChange={(ilce) => updateEditCustomerForm('adres_ilce', ilce)}
                  onMahalleChange={(mahalle) => updateEditCustomerForm('adres_mahalle', mahalle)}
                  onSokakChange={(sokak) => updateEditCustomerForm('adres_sokak', sokak)}
                  disabled={false}
                  showSokak={true}
                />
                <div className="form-row">
                  <div className="form-group">
                    <label>Posta Kodu</label>
                    <input 
                      value={editCustomerForm.posta_kodu} 
                      onChange={(e) => updateEditCustomerForm('posta_kodu', e.target.value)}
                      onBlur={(e) => updateEditCustomerForm('posta_kodu', formatPostalCode(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adres Detay</label>
                  <textarea 
                    value={editCustomerForm.adres_detay} 
                    onChange={(e) => updateEditCustomerForm('adres_detay', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Not Bilgileri</label>
                  <textarea 
                    value={editCustomerForm.not_bilgileri} 
                    onChange={(e) => updateEditCustomerForm('not_bilgileri', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={editCustomerForm.blacklist_mi} 
                        onChange={(e) => updateEditCustomerForm('blacklist_mi', e.target.checked)}
                      />
                      Blacklist'te
                    </label>
                  </div>
                  {editCustomerForm.blacklist_mi && (
                    <div className="form-group">
                      <label>Blacklist Nedeni</label>
                      <input 
                        value={editCustomerForm.blacklist_nedeni} 
                        onChange={(e) => updateEditCustomerForm('blacklist_nedeni', e.target.value)}
                        maxLength={255}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowEditCustomerModal(false)}>Kapat</button>
              <button className="modal-btn primary" onClick={async () => {
                const errs: {[k:string]: string} = {};
                
                // Validasyonlar
                // Ad validation
                if (!editCustomerForm.ad || !editCustomerForm.ad.trim()) {
                  errs.ad = 'Ad zorunludur';
                } else {
                  const adValidation = validateName(editCustomerForm.ad, 'Ad');
                  if (!adValidation.isValid) errs.ad = adValidation.error!;
                }
                
                // Soyad validation
                if (!editCustomerForm.soyad || !editCustomerForm.soyad.trim()) {
                  errs.soyad = 'Soyad zorunludur';
                } else {
                  const soyadValidation = validateName(editCustomerForm.soyad, 'Soyad');
                  if (!soyadValidation.isValid) errs.soyad = soyadValidation.error!;
                }
                
                // Email validation
                if (!editCustomerForm.eposta || !editCustomerForm.eposta.trim()) {
                  errs.eposta = 'E-posta zorunludur';
                } else {
                  const emailValidation = validateEmail(editCustomerForm.eposta);
                  if (!emailValidation.isValid) errs.eposta = emailValidation.error!;
                }
                
                // Telefon validation
                if (!editCustomerForm.telefon || !editCustomerForm.telefon.trim()) {
                  errs.telefon = 'Telefon zorunludur';
                } else {
                  const phoneValidation = validatePhone(editCustomerForm.telefon);
                  if (!phoneValidation.isValid) errs.telefon = phoneValidation.error!;
                }
                
                if (editCustomerForm.tc_kimlik_no) {
                  const tcValidation = validateTcKimlik(editCustomerForm.tc_kimlik_no);
                  if (!tcValidation.isValid) errs.tc_kimlik_no = tcValidation.error!;
                }
                
                // Vergi No validation (geçici olarak devre dışı)
                // if (editCustomerForm.vergi_no) {
                //   const vergiValidation = validateVergiNo(editCustomerForm.vergi_no);
                //   if (!vergiValidation.isValid) errs.vergi_no = vergiValidation.error!;
                // }
                
                if (editCustomerForm.posta_kodu) {
                  const postalValidation = validatePostalCode(editCustomerForm.posta_kodu);
                  if (!postalValidation.isValid) errs.posta_kodu = postalValidation.error!;
                }
                
                if (editCustomerForm.adres_il) {
                  const cityValidation = validateCity(editCustomerForm.adres_il);
                  if (!cityValidation.isValid) errs.adres_il = cityValidation.error!;
                }
                
                if (editCustomerForm.adres_ilce) {
                  const districtValidation = validateDistrict(editCustomerForm.adres_ilce);
                  if (!districtValidation.isValid) errs.adres_ilce = districtValidation.error!;
                }
                
                if (editCustomerForm.adres_mahalle) {
                  const neighborhoodValidation = validateNeighborhood(editCustomerForm.adres_mahalle);
                  if (!neighborhoodValidation.isValid) errs.adres_mahalle = neighborhoodValidation.error!;
                }
                
                if (editCustomerForm.adres_detay) {
                  const addressValidation = validateAddress(editCustomerForm.adres_detay);
                  if (!addressValidation.isValid) errs.adres_detay = addressValidation.error!;
                }
                
                setEditCustomerErrors(errs);
                if (Object.keys(errs).length > 0) return;

                try {
                  const token = localStorage.getItem('token');
                  const body = {
                    id: editCustomerForm.id,
                    ad: editCustomerForm.ad,
                    soyad: editCustomerForm.soyad,
                    sirket_adi: editCustomerForm.sirket_adi || null,
                    tc_kimlik_no: editCustomerForm.tc_kimlik_no && editCustomerForm.tc_kimlik_no.replace(/\D/g, '').length === 11 ? editCustomerForm.tc_kimlik_no.replace(/\D/g, '') : null,
                    vergi_no: null, // Vergi numarası geçici olarak devre dışı bırakıldı
                    eposta: editCustomerForm.eposta,
                    telefon: editCustomerForm.telefon.replace(/\D/g, '').length === 10 ? editCustomerForm.telefon.replace(/\D/g, '') : null,
                    dogum_tarihi: editCustomerForm.dogum_tarihi || null,
                    cinsiyet_id: null,
                    medeni_durum_id: null,
                    meslek: editCustomerForm.meslek || null,
                    egitim_durumu_id: null,
                    aylik_gelir: editCustomerForm.aylik_gelir ? parseFloat(editCustomerForm.aylik_gelir) : null,
                    adres_il: editCustomerForm.adres_il || null,
                    adres_ilce: editCustomerForm.adres_ilce || null,
                    adres_mahalle: editCustomerForm.adres_mahalle || null,
                    adres_detay: editCustomerForm.adres_detay || null,
                    posta_kodu: editCustomerForm.posta_kodu || null,
                    not_bilgileri: editCustomerForm.not_bilgileri || null,
                    blacklist_mi: editCustomerForm.blacklist_mi,
                    blacklist_nedeni: editCustomerForm.blacklist_mi ? editCustomerForm.blacklist_nedeni : null
                  };
                  
                  console.log('Müşteri güncelleme request body:', body);
                  
                  const res = await fetch(`/api/Musteriler/${editCustomerForm.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                  });
                  
                  if (!res.ok) { 
                    const e = await res.text(); 
                    console.error('Müşteri güncelleme hatası:', e);
                    alert('Müşteri güncellenemedi: ' + e); 
                    return; 
                  }
                  
                  setShowEditCustomerModal(false);
                  await fetchCustomers();
                  await fetchDashboardStats();
                  alert('Müşteri başarıyla güncellendi');
                } catch(e) { 
                  console.error(e); 
                  alert('Güncelleme sırasında hata oluştu');
                }
              }}>Güncelle</button>
            </div>
          </div>
        </div>
      )}

      {/* Sigorta Şirketi Modal */}
      {showSirketModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Yeni Sigorta Şirketi' : 'Sigorta Şirketi Düzenle'}</h3>
              <button className="modal-close" onClick={() => setShowSirketModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Şirket Adı *</label>
                <input
                  type="text"
                  value={sirketForm.sirket_adi}
                  onChange={(e) => setSirketForm({...sirketForm, sirket_adi: e.target.value})}
                  placeholder="Aksigorta A.Ş."
                />
              </div>
              <div className="form-group">
                <label>Şirket Kodu *</label>
                <input
                  type="text"
                  value={sirketForm.sirket_kodu}
                  onChange={(e) => setSirketForm({...sirketForm, sirket_kodu: e.target.value})}
                  placeholder="AKSG"
                />
              </div>
              <div className="form-group">
                <label>Vergi No</label>
                <input
                  type="text"
                  value={sirketForm.vergi_no}
                  onChange={(e) => setSirketForm({...sirketForm, vergi_no: e.target.value})}
                  placeholder="1234567890"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="text"
                    value={sirketForm.telefon}
                    onChange={(e) => setSirketForm({...sirketForm, telefon: e.target.value})}
                    placeholder="5321234567"
                  />
                </div>
                <div className="form-group">
                  <label>E-posta</label>
                  <input
                    type="email"
                    value={sirketForm.eposta}
                    onChange={(e) => setSirketForm({...sirketForm, eposta: e.target.value})}
                    placeholder="info@aksigorta.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Adres</label>
                <textarea
                  value={sirketForm.adres}
                  onChange={(e) => setSirketForm({...sirketForm, adres: e.target.value})}
                  placeholder="Şirket adresi"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Komisyon Oranı (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sirketForm.komisyon_orani}
                    onChange={(e) => setSirketForm({...sirketForm, komisyon_orani: e.target.value})}
                    placeholder="15.00"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={sirketForm.aktif_mi}
                      onChange={(e) => setSirketForm({...sirketForm, aktif_mi: e.target.checked})}
                    />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSirketModal(false)}>İptal</button>
              <button onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const method = modalMode === 'create' ? 'POST' : 'PUT';
                  const url = modalMode === 'create' ? '/api/SigortaSirketleri' : `/api/SigortaSirketleri/${selectedItem.id}`;
                  
                  // Veri türlerini düzelt
                  const requestData = {
                    sirketAdi: sirketForm.sirket_adi,
                    sirketKodu: sirketForm.sirket_kodu,
                    vergiNo: sirketForm.vergi_no,
                    telefon: sirketForm.telefon,
                    eposta: sirketForm.eposta,
                    adres: sirketForm.adres,
                    aktifMi: sirketForm.aktif_mi,
                    komisyonOrani: sirketForm.komisyon_orani ? parseFloat(sirketForm.komisyon_orani) : null,
                    sozlesmeBaslangic: null,
                    sozlesmeBitis: null
                  };
                  
                  const res = await fetch(url, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                  });
                  
                  if (res.ok) {
                    setShowSirketModal(false);
                    alert(`Sigorta şirketi başarıyla ${modalMode === 'create' ? 'oluşturuldu' : 'güncellendi'}`);
                    // Refresh data
                    fetchPoliceData();
                  } else {
                    const error = await res.text();
                    alert(`Hata: ${error}`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('İşlem sırasında hata oluştu');
                }
              }}>
                {modalMode === 'create' ? 'Oluştur' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poliçe Türü Modal */}
      {showTurModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Yeni Poliçe Türü' : 'Poliçe Türü Düzenle'}</h3>
              <button className="modal-close" onClick={() => setShowTurModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Ürün Adı *</label>
                  <input
                    type="text"
                    value={turForm.urun_adi}
                    onChange={(e) => setTurForm({...turForm, urun_adi: e.target.value})}
                    placeholder="Kasko Sigortası"
                  />
                </div>
                <div className="form-group">
                  <label>Ürün Kodu *</label>
                  <input
                    type="text"
                    value={turForm.urun_kodu}
                    onChange={(e) => setTurForm({...turForm, urun_kodu: e.target.value})}
                    placeholder="KASKO"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={turForm.aciklama}
                  onChange={(e) => setTurForm({...turForm, aciklama: e.target.value})}
                  placeholder="Poliçe türü açıklaması"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Tutar (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={turForm.min_tutar}
                    onChange={(e) => setTurForm({...turForm, min_tutar: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                <div className="form-group">
                  <label>Max Tutar (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={turForm.max_tutar}
                    onChange={(e) => setTurForm({...turForm, max_tutar: e.target.value})}
                    placeholder="50000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Süre (Gün)</label>
                  <input
                    type="number"
                    value={turForm.min_sure_gun}
                    onChange={(e) => setTurForm({...turForm, min_sure_gun: e.target.value})}
                    placeholder="30"
                  />
                </div>
                <div className="form-group">
                  <label>Max Süre (Gün)</label>
                  <input
                    type="number"
                    value={turForm.max_sure_gun}
                    onChange={(e) => setTurForm({...turForm, max_sure_gun: e.target.value})}
                    placeholder="365"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={turForm.zorunlu_mi}
                      onChange={(e) => setTurForm({...turForm, zorunlu_mi: e.target.checked})}
                    />
                    Zorunlu Sigorta
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={turForm.aktif_mi}
                      onChange={(e) => setTurForm({...turForm, aktif_mi: e.target.checked})}
                    />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTurModal(false)}>İptal</button>
              <button onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const method = modalMode === 'create' ? 'POST' : 'PUT';
                  const url = modalMode === 'create' ? '/api/PoliceTurleri' : `/api/PoliceTurleri/${selectedItem.id || selectedItem.Id}`;
                  
                  // Veri türlerini düzelt
                  const requestData = {
                    urunAdi: turForm.urun_adi,
                    urunKodu: turForm.urun_kodu,
                    aciklama: turForm.aciklama,
                    zorunluMi: turForm.zorunlu_mi,
                    minTutar: turForm.min_tutar ? parseFloat(turForm.min_tutar) : null,
                    maxTutar: turForm.max_tutar ? parseFloat(turForm.max_tutar) : null,
                    minSureGun: turForm.min_sure_gun ? parseInt(turForm.min_sure_gun) : null,
                    maxSureGun: turForm.max_sure_gun ? parseInt(turForm.max_sure_gun) : null,
                    riskFaktorleri: null,
                    aktifMi: turForm.aktif_mi
                  };
                  
                  const res = await fetch(url, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                  });
                  
                  if (res.ok) {
                    setShowTurModal(false);
                    alert(`Poliçe türü başarıyla ${modalMode === 'create' ? 'oluşturuldu' : 'güncellendi'}`);
                    // Refresh data
                    fetchPoliceData();
                  } else {
                    const error = await res.text();
                    alert(`Hata: ${error}`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('İşlem sırasında hata oluştu');
                }
              }}>
                {modalMode === 'create' ? 'Oluştur' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teminat Modal */}
      {showTeminatModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Yeni Teminat' : 'Teminat Düzenle'}</h3>
              <button className="modal-close" onClick={() => setShowTeminatModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Poliçe Türü *</label>
                <select
                  value={teminatForm.police_turu_id}
                  onChange={(e) => setTeminatForm({...teminatForm, police_turu_id: e.target.value})}
                >
                  <option value="">Seçiniz</option>
                  {policeTurleri.map(tur => (
                    <option key={tur.id || tur.Id} value={tur.id || tur.Id}>
                      {tur.UrunAdi || tur.urunAdi}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Teminat Adı *</label>
                  <input
                    type="text"
                    value={teminatForm.teminat_adi}
                    onChange={(e) => setTeminatForm({...teminatForm, teminat_adi: e.target.value})}
                    placeholder="Araç Hasarı"
                  />
                </div>
                <div className="form-group">
                  <label>Teminat Kodu *</label>
                  <input
                    type="text"
                    value={teminatForm.teminat_kodu}
                    onChange={(e) => setTeminatForm({...teminatForm, teminat_kodu: e.target.value})}
                    placeholder="ARAC_HASAR"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Teminat Tutarı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={teminatForm.min_teminat_tutari}
                    onChange={(e) => setTeminatForm({...teminatForm, min_teminat_tutari: e.target.value})}
                    placeholder="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Max Teminat Tutarı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={teminatForm.max_teminat_tutari}
                    onChange={(e) => setTeminatForm({...teminatForm, max_teminat_tutari: e.target.value})}
                    placeholder="500000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Hesaplama Türü</label>
                  <select
                    value={teminatForm.hesaplama_turu}
                    onChange={(e) => setTeminatForm({...teminatForm, hesaplama_turu: e.target.value})}
                  >
                    <option value="YUZDE">Yüzde</option>
                    <option value="SABIT">Sabit Tutar</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    {teminatForm.hesaplama_turu === 'YUZDE' ? 'Prim Oranı (%)' : 'Sabit Prim (₺)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={teminatForm.hesaplama_turu === 'YUZDE' ? teminatForm.prim_orani : teminatForm.sabit_prim}
                    onChange={(e) => {
                      if (teminatForm.hesaplama_turu === 'YUZDE') {
                        setTeminatForm({...teminatForm, prim_orani: e.target.value});
                      } else {
                        setTeminatForm({...teminatForm, sabit_prim: e.target.value});
                      }
                    }}
                    placeholder={teminatForm.hesaplama_turu === 'YUZDE' ? '2.5' : '150'}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={teminatForm.zorunlu_mu}
                      onChange={(e) => setTeminatForm({...teminatForm, zorunlu_mu: e.target.checked})}
                    />
                    Zorunlu Teminat
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={teminatForm.aktif_mi}
                      onChange={(e) => setTeminatForm({...teminatForm, aktif_mi: e.target.checked})}
                    />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTeminatModal(false)}>İptal</button>
              <button onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const method = modalMode === 'create' ? 'POST' : 'PUT';
                  const url = modalMode === 'create' ? '/api/Teminatlar' : `/api/Teminatlar/${selectedItem.id}`;
                  
                  // Veri türlerini düzelt
                  const requestData: any = {
                    police_turu_id: parseInt(teminatForm.police_turu_id),
                    teminat_adi: teminatForm.teminat_adi,
                    teminat_kodu: teminatForm.teminat_kodu,
                    aciklama: null,
                    zorunlu_mu: teminatForm.zorunlu_mu,
                    min_teminat_tutari: teminatForm.min_teminat_tutari ? parseFloat(teminatForm.min_teminat_tutari) : null,
                    max_teminat_tutari: teminatForm.max_teminat_tutari ? parseFloat(teminatForm.max_teminat_tutari) : null,
                    varsayilan_teminat_tutari: null,
                    hesaplama_turu: teminatForm.hesaplama_turu,
                    prim_orani: teminatForm.hesaplama_turu === 'YUZDE' && teminatForm.prim_orani ? parseFloat(teminatForm.prim_orani) : null,
                    sabit_prim: teminatForm.hesaplama_turu === 'SABIT' && teminatForm.sabit_prim ? parseFloat(teminatForm.sabit_prim) : null,
                    aktif_mi: teminatForm.aktif_mi
                  };

                  if (modalMode === 'edit') {
                    (requestData as any).id = selectedItem.id;
                  }
                  
                  const res = await fetch(url, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                  });
                  
                  if (res.ok) {
                    setShowTeminatModal(false);
                    alert(`Teminat başarıyla ${modalMode === 'create' ? 'oluşturuldu' : 'güncellendi'}`);
                    // Refresh data
                    fetchPoliceData();
                  } else {
                    const error = await res.text();
                    alert(`Hata: ${error}`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('İşlem sırasında hata oluştu');
                }
              }}>
                {modalMode === 'create' ? 'Oluştur' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teklif Modal */}
      {showTeklifModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Yeni Teklif Oluştur' : 'Teklif Düzenle'}</h3>
              <button className="modal-close" onClick={() => setShowTeklifModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Müşteri *</label>
                  <select
                    value={teklifForm.musteri_id}
                    onChange={(e) => setTeklifForm({...teklifForm, musteri_id: e.target.value})}
                  >
                    <option value="">Müşteri Seçiniz</option>
                    {customers.map((musteri: Customer) => (
                      <option key={musteri.id} value={musteri.id}>
                        {musteri.ad} {musteri.soyad} {musteri.sirket_adi ? `(${musteri.sirket_adi})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Poliçe Türü *</label>
                  <select
                    value={teklifForm.police_turu_id}
                    onChange={(e) => setTeklifForm({...teklifForm, police_turu_id: e.target.value})}
                  >
                    <option value="">Poliçe Türü Seçiniz</option>
                    {policeTurleri.map((tur: any) => (
                      <option key={tur.id || tur.Id} value={tur.id || tur.Id}>
                        {tur.UrunAdi || tur.urunAdi}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Sigorta Şirketi *</label>
                <select
                  value={teklifForm.sigorta_sirketi_id}
                  onChange={(e) => setTeklifForm({...teklifForm, sigorta_sirketi_id: e.target.value})}
                >
                  <option value="">Sigorta Şirketi Seçiniz</option>
                                      {sigortaSirketleri.map((sirket: any) => (
                    <option key={sirket.id} value={sirket.id}>
                      {sirket.SirketAdi || sirket.sirketAdi}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    value={teklifForm.baslangic_tarihi}
                    onChange={(e) => setTeklifForm({...teklifForm, baslangic_tarihi: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Bitiş Tarihi *</label>
                  <input
                    type="date"
                    value={teklifForm.bitis_tarihi}
                    onChange={(e) => setTeklifForm({...teklifForm, bitis_tarihi: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Toplam Tutar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={teklifForm.toplam_tutar}
                  onChange={(e) => setTeklifForm({...teklifForm, toplam_tutar: e.target.value})}
                  placeholder="2500.00"
                />
              </div>
              <div className="form-group">
                <label>Açıklama</label>
                <textarea
                  value={teklifForm.aciklama}
                  onChange={(e) => setTeklifForm({...teklifForm, aciklama: e.target.value})}
                  placeholder="Teklif detayları ve açıklamaları"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTeklifModal(false)}>İptal</button>
              <button onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const method = modalMode === 'create' ? 'POST' : 'PUT';
                  const url = modalMode === 'create' ? '/api/PoliceTeklifleri' : `/api/PoliceTeklifleri/${selectedItem.id}`;
                  
                  const res = await fetch(url, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(teklifForm)
                  });
                  
                  if (res.ok) {
                    setShowTeklifModal(false);
                    alert(`Teklif başarıyla ${modalMode === 'create' ? 'oluşturuldu' : 'güncellendi'}`);
                    // Refresh data
                    fetchPoliceData();
                  } else {
                    const error = await res.text();
                    alert(`Hata: ${error}`);
                  }
                } catch (e) {
                  console.error(e);
                  alert('İşlem sırasında hata oluştu');
                }
              }}>
                {modalMode === 'create' ? 'Teklif Oluştur' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teklif Düzenleme Modal */}
      {showEditTeklifModal && editingTeklif && (
        <div className="modal-overlay teklif-edit-modal">
          <div className="modal">
            <div className="modal-header">
              <h3>Teklif Düzenle - {editingTeklif.teklif_no}</h3>
              <button onClick={() => setShowEditTeklifModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="teklif-info">
                <p><strong>Teklif No:</strong> {editingTeklif.teklif_no}</p>
                <p><strong>Müşteri:</strong> {editingTeklif.musteri_adi}</p>
                <p><strong>Poliçe Türü:</strong> {editingTeklif.police_turu_adi}</p>
                <p><strong>Sigorta Şirketi:</strong> {editingTeklif.sigorta_sirketi_adi}</p>
                <p><strong>Toplam Tutar:</strong> ₺{editingTeklif.toplam_tutar}</p>
              </div>
              
              <form className="teklif-edit-form">
                <div className="form-section">
                  <h4>Müşteri ve Poliçe Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Müşteri</label>
                      <select
                        value={editTeklifForm.musteri_id}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, musteri_id: e.target.value})}
                      >
                        <option value="">Müşteri Seçin</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.ad} {customer.soyad} {customer.sirket_adi ? `(${customer.sirket_adi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group half-width">
                      <label>Poliçe Türü</label>
                      <select
                        value={editTeklifForm.police_turu_id}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, police_turu_id: e.target.value})}
                      >
                        <option value="">Poliçe Türü Seçin</option>
                        {policeTurleri.map((tur) => (
                          <option key={tur.id} value={tur.id}>
                            {tur.UrunAdi || tur.urunAdi}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Sigorta Şirketi</label>
                      <select
                        value={editTeklifForm.sigorta_sirketi_id}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, sigorta_sirketi_id: e.target.value})}
                      >
                        <option value="">Sigorta Şirketi Seçin</option>
                        {sigortaSirketleri.map((sirket) => (
                          <option key={sirket.id} value={sirket.id}>
                            {sirket.SirketAdi || sirket.sirketAdi}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group half-width">
                      <label>Taksit Sayısı</label>
                      <select
                        value={editTeklifForm.taksit_sayisi}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, taksit_sayisi: parseInt(e.target.value)})}
                      >
                        <option value={1}>1 Taksit</option>
                        <option value={2}>2 Taksit</option>
                        <option value={3}>3 Taksit</option>
                        <option value={6}>6 Taksit</option>
                        <option value={12}>12 Taksit</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Hesaplama Detayları</h4>
                  <div className="form-row">
                    <div className="form-group quarter-width">
                      <label>Brüt Prim</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTeklifForm.brut_prim}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, brut_prim: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Net Prim</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTeklifForm.net_prim}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, net_prim: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Komisyon Tutarı</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTeklifForm.komisyon_tutari}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, komisyon_tutari: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Vergi Tutarı</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTeklifForm.vergi_tutari}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, vergi_tutari: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Toplam Tutar</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editTeklifForm.toplam_tutar}
                        onChange={(e) => setEditTeklifForm({...editTeklifForm, toplam_tutar: e.target.value})}
                        placeholder="0.00"
                        className="total-amount"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Notlar ve Açıklamalar</h4>
                  <div className="form-group full-width">
                    <label>Teklif Notları</label>
                    <textarea
                      value={editTeklifForm.notlar}
                      onChange={(e) => setEditTeklifForm({...editTeklifForm, notlar: e.target.value})}
                      placeholder="Teklif notları ve açıklamaları"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowEditTeklifModal(false)} className="secondary">
                    İptal
                  </button>
                  <button type="button" onClick={handleTeklifUpdate} className="primary">
                    Güncelle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Poliçe Düzenleme Modal */}
      {showPoliceEditModal && editingPolice && (
        <div className="modal-overlay police-edit-modal">
          <div className="modal">
            <div className="modal-header">
              <h3>Poliçe Düzenle - {editingPolice.police_no}</h3>
              <button onClick={() => setShowPoliceEditModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <form className="police-edit-form">
                <div className="form-section">
                  <h4>Müşteri ve Poliçe Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Müşteri</label>
                      <select
                        value={editPoliceForm.musteri_id}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, musteri_id: e.target.value})}
                      >
                        <option value="">Müşteri Seçin</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.ad} {customer.soyad} {customer.sirket_adi ? `(${customer.sirket_adi})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group half-width">
                      <label>Poliçe Türü</label>
                      <select
                        value={editPoliceForm.police_turu_id}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, police_turu_id: e.target.value})}
                      >
                        <option value="">Poliçe Türü Seçin</option>
                        {policeTurleri.map((tur) => (
                          <option key={tur.id} value={tur.id}>
                            {tur.UrunAdi || tur.urunAdi}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Sigorta Şirketi</label>
                      <select
                        value={editPoliceForm.sigorta_sirketi_id}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, sigorta_sirketi_id: e.target.value})}
                      >
                        <option value="">Sigorta Şirketi Seçin</option>
                        {sigortaSirketleri.map((sirket) => (
                          <option key={sirket.id} value={sirket.id}>
                            {sirket.SirketAdi || sirket.sirketAdi}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group half-width">
                      <label>Taksit Sayısı</label>
                      <select
                        value={editPoliceForm.taksit_sayisi}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, taksit_sayisi: parseInt(e.target.value)})}
                      >
                        <option value={1}>1 Taksit</option>
                        <option value={2}>2 Taksit</option>
                        <option value={3}>3 Taksit</option>
                        <option value={6}>6 Taksit</option>
                        <option value={12}>12 Taksit</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Tarih Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={editPoliceForm.baslangic_tarihi}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, baslangic_tarihi: e.target.value})}
                      />
                    </div>

                    <div className="form-group half-width">
                      <label>Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={editPoliceForm.bitis_tarihi}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, bitis_tarihi: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Hesaplama Detayları</h4>
                  <div className="form-row">
                    <div className="form-group quarter-width">
                      <label>Brüt Prim</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoliceForm.brut_prim}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, brut_prim: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Net Prim</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoliceForm.net_prim}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, net_prim: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Komisyon Tutarı</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoliceForm.komisyon_tutari}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, komisyon_tutari: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group quarter-width">
                      <label>Vergi Tutarı</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoliceForm.vergi_tutari}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, vergi_tutari: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>Toplam Tutar</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editPoliceForm.toplam_tutar}
                        onChange={(e) => setEditPoliceForm({...editPoliceForm, toplam_tutar: e.target.value})}
                        placeholder="0.00"
                        className="total-amount"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Şartlar ve Notlar</h4>
                  <div className="form-group full-width">
                    <label>Özel Şartlar</label>
                    <textarea
                      value={editPoliceForm.ozel_sartlar}
                      onChange={(e) => setEditPoliceForm({...editPoliceForm, ozel_sartlar: e.target.value})}
                      placeholder="Poliçe özel şartları"
                      rows={3}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Notlar</label>
                    <textarea
                      value={editPoliceForm.notlar}
                      onChange={(e) => setEditPoliceForm({...editPoliceForm, notlar: e.target.value})}
                      placeholder="Poliçe notları"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => setShowPoliceEditModal(false)} className="secondary">
                    İptal
                  </button>
                  <button type="button" onClick={handlePoliceUpdate} className="primary">
                    Güncelle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Hasar Detay Modal */}
      {showHasarDetayModal && selectedHasar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Hasar Detayları - {selectedHasar.dosya_no}</h3>
              <button className="modal-close" onClick={() => setShowHasarDetayModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hasar-detay">
                <div className="detay-section">
                  <h4>Genel Bilgiler</h4>
                  <div className="detay-grid">
                    <div className="detay-item">
                      <span className="label">Poliçe No:</span>
                      <span className="value">{selectedHasar.police_no}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Müşteri:</span>
                      <span className="value">{selectedHasar.musteri_adi}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Durum:</span>
                      <span className={`value ${selectedHasar.durum_adi.toLowerCase().includes('beklemede') ? 'beklemede' : selectedHasar.durum_adi.toLowerCase().includes('onaylandı') ? 'onaylandi' : 'reddedildi'}`}>
                        {selectedHasar.durum_adi}
                      </span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Olay Tarihi:</span>
                      <span className="value">{new Date(selectedHasar.olay_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Bildirim Tarihi:</span>
                      <span className="value">{new Date(selectedHasar.olusturma_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                <div className="detay-section">
                  <h4>Olay Bilgileri</h4>
                  <div className="detay-grid">
                    <div className="detay-item">
                      <span className="label">Olay Yeri:</span>
                      <span className="value">{selectedHasar.olay_yeri_detay || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Olay Açıklaması:</span>
                      <span className="value">{selectedHasar.olay_aciklamasi || 'Belirtilmemiş'}</span>
                    </div>
                  </div>
                </div>

                <div className="detay-section">
                  <h4>Finansal Bilgiler</h4>
                  <div className="detay-grid">
                    <div className="detay-item">
                      <span className="label">Talep Edilen Tutar:</span>
                      <span className="value price">
                        {selectedHasar.talep_edilen_tutar ? `₺${selectedHasar.talep_edilen_tutar.toLocaleString('tr-TR')}` : 'Belirtilmemiş'}
                      </span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Onaylanan Tutar:</span>
                      <span className="value price">
                        {selectedHasar.onaylanan_tutar ? `₺${selectedHasar.onaylanan_tutar.toLocaleString('tr-TR')}` : 'Henüz onaylanmadı'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedHasar.red_nedeni && (
                  <div className="detay-section">
                    <h4>Red Nedeni</h4>
                    <div className="red-nedeni">{selectedHasar.red_nedeni}</div>
                  </div>
                )}

                {selectedHasar.notlar && (
                  <div className="detay-section">
                    <h4>Notlar</h4>
                    <div className="notlar">{selectedHasar.notlar}</div>
                  </div>
                )}

                <div className="detay-section">
                  <h4>Takip Notları</h4>
                  <div className="notlar-list">
                    {selectedHasar.notlar_listesi.length > 0 ? (
                      selectedHasar.notlar_listesi.map((not) => (
                        <div key={not.id} className="not-item">
                          <div className="not-header">
                            <span className="not-kullanici">{not.kullanici_adi}</span>
                            <span className="not-tarih">{new Date(not.olusturma_tarihi).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="not-metni">{not.not_metni}</div>
                        </div>
                      ))
                    ) : (
                      <p>Henüz not eklenmemiş</p>
                    )}
                  </div>
                  
                  <div className="not-ekleme">
                    <h5>Yeni Not Ekle</h5>
                    <div className="form-group">
                      <textarea
                        value={hasarNotForm.not_metni}
                        onChange={(e) => setHasarNotForm({ not_metni: e.target.value })}
                        placeholder="Notunuzu yazın..."
                        rows={3}
                      />
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={handleHasarNotEkle}
                      disabled={loading || !hasarNotForm.not_metni.trim()}
                    >
                      {loading ? 'Ekleniyor...' : 'Not Ekle'}
                    </button>
                  </div>
                </div>

                <div className="detay-section">
                  <h4>Dosyalar</h4>
                  <div className="dosyalar-section">
                    <div className="dosyalar-header">
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowDosyaYukleModal(true)}
                      >
                        📁 Dosya Ekle
                      </button>
                    </div>
                    
                    <div className="dosyalar-list">
                      {hasarDosyalari.length > 0 ? (
                        hasarDosyalari.map((dosya) => (
                          <div key={dosya.id} className="dosya-item">
                            <div className="dosya-info">
                              <div className="dosya-icon">
                                {dosya.dosya_tipi === '.pdf' ? '📄' : 
                                 dosya.dosya_tipi === '.jpg' || dosya.dosya_tipi === '.jpeg' || dosya.dosya_tipi === '.png' ? '🖼️' : 
                                 dosya.dosya_tipi === '.doc' || dosya.dosya_tipi === '.docx' ? '📝' : '📎'}
                              </div>
                              <div className="dosya-details">
                                <div className="dosya-adi">{dosya.dosya_adi}</div>
                                <div className="dosya-meta">
                                  <span>{formatFileSize(dosya.dosya_boyutu)}</span>
                                  <span>•</span>
                                  <span>{dosya.yukleyen_kullanici_adi}</span>
                                  <span>•</span>
                                  <span>{new Date(dosya.yukleme_tarihi).toLocaleDateString('tr-TR')}</span>
                                </div>
                                {dosya.aciklama && (
                                  <div className="dosya-aciklama">{dosya.aciklama}</div>
                                )}
                              </div>
                            </div>
                            <div className="dosya-actions">
                              <a 
                                href={dosya.dosya_yolu} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline"
                              >
                                👁️ Görüntüle
                              </a>
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteHasarDosyasi(dosya.id, selectedHasar.id)}
                              >
                                🗑️ Sil
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-dosya">
                          <p>Henüz dosya yüklenmemiş</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowHasarDetayModal(false)}>
                    Kapat
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => {
                      setHasarDurumForm({
                        durum_id: selectedHasar.durum_id,
                        onaylanan_tutar: selectedHasar.onaylanan_tutar?.toString() || '',
                        red_nedeni: selectedHasar.red_nedeni || '',
                        notlar: selectedHasar.notlar || ''
                      });
                      setShowHasarDurumModal(true);
                    }}
                  >
                    Durum Güncelle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hasar Durum Güncelleme Modal */}
      {showHasarDurumModal && selectedHasar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Hasar Durumu Güncelle - {selectedHasar.dosya_no}</h3>
              <button className="modal-close" onClick={() => setShowHasarDurumModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hasar-durum-form">
                <div className="form-section">
                  <h4>Durum Bilgileri</h4>
                  <div className="form-group">
                    <label>Durum:</label>
                    <select
                      value={hasarDurumForm.durum_id}
                      onChange={(e) => setHasarDurumForm({ ...hasarDurumForm, durum_id: parseInt(e.target.value) })}
                      required
                    >
                      <option value={0}>Durum seçiniz</option>
                      <option value={1}>Beklemede</option>
                      <option value={2}>Onaylandı</option>
                      <option value={3}>Reddedildi</option>
                      <option value={4}>İşlemde</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Onaylanan Tutar (₺):</label>
                    <input
                      type="number"
                      value={hasarDurumForm.onaylanan_tutar}
                      onChange={(e) => setHasarDurumForm({ ...hasarDurumForm, onaylanan_tutar: e.target.value })}
                      placeholder="Onaylanan tutar"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Red Nedeni:</label>
                    <textarea
                      value={hasarDurumForm.red_nedeni}
                      onChange={(e) => setHasarDurumForm({ ...hasarDurumForm, red_nedeni: e.target.value })}
                      placeholder="Red nedeni (eğer reddedildiyse)"
                      rows={3}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Notlar:</label>
                    <textarea
                      value={hasarDurumForm.notlar}
                      onChange={(e) => setHasarDurumForm({ ...hasarDurumForm, notlar: e.target.value })}
                      placeholder="Ek notlar"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowHasarDurumModal(false)}>
                  İptal
                </button>
                <button className="btn btn-primary" onClick={handleHasarDurumUpdate} disabled={loading}>
                  {loading ? 'Güncelleniyor...' : 'Durumu Güncelle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dosya Yükleme Modal */}
      {showDosyaYukleModal && selectedHasar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Dosya Yükle - {selectedHasar.dosya_no}</h3>
              <button className="modal-close" onClick={() => setShowDosyaYukleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="dosya-yukleme">
                <div className="form-group">
                  <label>Dosya Açıklaması (Opsiyonel):</label>
                  <input
                    type="text"
                    value={dosyaAciklama}
                    onChange={(e) => setDosyaAciklama(e.target.value)}
                    placeholder="Dosya hakkında açıklama..."
                  />
                </div>

                <div className="dosya-yukleme-alani">
                  <div 
                    className={`drag-drop-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="drag-drop-content">
                      <div className="drag-drop-icon">📁</div>
                      <h4>Dosyaları buraya sürükleyin veya seçin</h4>
                      <p>Desteklenen formatlar: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX</p>
                      <p>Maksimum dosya boyutu: 10MB</p>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                        id="file-input"
                      />
                      <label htmlFor="file-input" className="btn btn-primary">
                        Dosya Seç
                      </label>
                    </div>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="secilen-dosyalar">
                    <h4>Seçilen Dosyalar ({selectedFiles.length})</h4>
                    <div className="dosya-listesi">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="secilen-dosya">
                          <div className="dosya-bilgi">
                            <span className="dosya-adi">{file.name}</span>
                            <span className="dosya-boyut">{formatFileSize(file.size)}</span>
                          </div>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleFileRemove(index)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowDosyaYukleModal(false);
                      setSelectedFiles([]);
                      setDosyaAciklama('');
                    }}
                  >
                    İptal
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => uploadHasarDosyalari(selectedHasar.id)}
                    disabled={dosyaYukleniyor || selectedFiles.length === 0}
                  >
                    {dosyaYukleniyor ? 'Yükleniyor...' : 'Dosyaları Yükle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
        type={confirmDialog.type}
      />

      {/* Ödemeler Yönetimi Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{paymentModalType === 'create' ? 'Yeni Ödeme' : 'Ödeme Düzenle'}</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Müşteri</label>
                    <select 
                      value={paymentForm.musteriId} 
                      onChange={(e) => setPaymentForm({ ...paymentForm, musteriId: e.target.value })}
                      required
                    >
                      <option value="">Müşteri seçin</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.ad} {customer.soyad} - {customer.musteri_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Poliçe No (Opsiyonel)</label>
                    <input
                      type="text"
                      value={paymentForm.policeNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, policeNo: e.target.value })}
                      placeholder="Poliçe numarası..."
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tutar</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.tutar}
                      onChange={(e) => setPaymentForm({ ...paymentForm, tutar: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Ödeme Tarihi</label>
                    <input
                      type="date"
                      value={paymentForm.odemeTarihi}
                      onChange={(e) => setPaymentForm({ ...paymentForm, odemeTarihi: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ödeme Türü</label>
                    <select 
                      value={paymentForm.odemeTuru} 
                      onChange={(e) => setPaymentForm({ ...paymentForm, odemeTuru: e.target.value })}
                      required
                    >
                      <option value="">Seçin</option>
                      <option value="NAKIT">Nakit</option>
                      <option value="KREDI_KARTI">Kredi Kartı</option>
                      <option value="HAVALE">Havale</option>
                      <option value="CEK">Çek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vade Tarihi (Opsiyonel)</label>
                    <input
                      type="date"
                      value={paymentForm.vadeTarihi}
                      onChange={(e) => setPaymentForm({ ...paymentForm, vadeTarihi: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Açıklama</label>
                  <textarea
                    value={paymentForm.aciklama}
                    onChange={(e) => setPaymentForm({ ...paymentForm, aciklama: e.target.value })}
                    placeholder="Ödeme hakkında açıklama..."
                    rows={3}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    İptal
                  </button>
                  <button className="btn btn-primary" onClick={handlePaymentSubmit}>
                    {paymentModalType === 'create' ? 'Ödeme Oluştur' : 'Güncelle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard; 