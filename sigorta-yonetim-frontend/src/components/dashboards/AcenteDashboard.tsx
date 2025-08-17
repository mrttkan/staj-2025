import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPermissions, UserPermissions } from '../../utils/permissions';
import './AcenteDashboard.css';
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

interface Customer {
  id: number;
  musteri_no: string;
  ad: string;
  soyad: string;
  sirket_adi?: string;
  eposta: string;
  telefon: string;
  adres_il: string;
  adres_ilce?: string;
  adres_mahalle?: string;
  adres_detay?: string;
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

interface Policy {
  id: number;
  police_no: string;
  police_turu_adi: string;
  sigorta_sirketi_adi: string;
  musteri_adi: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  toplam_tutar: number;
  komisyon_tutari?: number;
  durum_adi: string;
  durum_id: number;
  tanzim_tarihi: string;
  teklif_no?: string;
}

interface Claim {
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

interface ClaimDetail {
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

interface ClaimFile {
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

interface DashboardStats {
  totalCustomers: number;
  totalPolicies: number;
  totalPayments: number;
  totalCommissions: number;
  activePolicies: number;
  pendingClaims: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  policyTypeDistribution: Array<{ type: string; count: number }>;
  monthlyCommissions: Array<{ month: string; amount: number }>;
}

const AcenteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [permissions] = useState<UserPermissions>(getUserPermissions(user?.roles?.[0] || 'acente'));
  
  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalPolicies: 0,
    totalPayments: 0,
    totalCommissions: 0,
    activePolicies: 0,
    pendingClaims: 0,
    recentActivities: [],
    policyTypeDistribution: [],
    monthlyCommissions: []
  });

  // Customer management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState('');
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    ad: '',
    soyad: '',
    sirket_adi: '',
    eposta: '',
    telefon: '',
    tc_kimlik_no: '',
    vergi_no: '',
    adres_il: '',
    adres_ilce: '',
    adres_mahalle: '',
    adres_detay: ''
  });

  // Payment management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentSearchDebounced, setPaymentSearchDebounced] = useState('');
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    musteri_adi: '',
    police_no: '',
    odeme_tarihi: '',
    vade_tarihi: '',
    tutar: 0,
    odeme_turu: '',
    odeme_yontemi_detay: '',
    aciklama: '',
    makbuz_no: ''
  });

  // Policy management
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policySearchTerm, setPolicySearchTerm] = useState('');
  const [policySearchDebounced, setPolicySearchDebounced] = useState('');
  const [policyCurrentPage, setPolicyCurrentPage] = useState(1);
  const [policyTotalPages, setPolicyTotalPages] = useState(1);

  // Claim management
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimSearchDebounced, setClaimSearchDebounced] = useState('');
  const [claimCurrentPage, setClaimCurrentPage] = useState(1);
  const [claimTotalPages, setClaimTotalPages] = useState(1);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [claimForm, setClaimForm] = useState({
    police_no: '',
    olay_tarihi: '',
    olay_yeri_detay: '',
    olay_aciklamasi: '',
    talep_edilen_tutar: 0
  });

  // Claim detail modal
  const [showClaimDetailModal, setShowClaimDetailModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimDetail | null>(null);
  const [claimFiles, setClaimFiles] = useState<ClaimFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [claimNote, setClaimNote] = useState('');

  // Confirm dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning' as 'danger' | 'warning' | 'info'
  });

  // Address selector
  const [iller, setIller] = useState<string[]>([]);
  const [ilceler, setIlceler] = useState<string[]>([]);
  const [mahalleler, setMahalleler] = useState<string[]>([]);

  // Commission data
  const [commissionData, setCommissionData] = useState({
    totalCommission: 0,
    monthlyCommissions: [] as Array<{ month: string; amount: number }>,
    policyTypeCommissions: [] as Array<{ type: string; amount: number; count: number }>,
    recentCommissions: [] as Array<{ id: number; police_no: string; musteri_adi: string; commission: number; date: string }>
  });

  useEffect(() => {
    console.log('ActiveTab değişti:', activeTab);
    if (activeTab === 'dashboard') {
      setLoading(true);
      fetchAcenteStats().finally(() => setLoading(false));
    } else if (activeTab === 'customers') {
      console.log('Müşteriler sekmesi açılıyor...');
      fetchCustomers();
    } else if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'policies') {
      fetchPolicies();
    } else if (activeTab === 'claims') {
      fetchClaims();
    }
  }, [activeTab, customerCurrentPage, customerSearchTerm, paymentCurrentPage, paymentSearchTerm, policyCurrentPage, policySearchTerm, claimCurrentPage, claimSearchTerm]);

  // Search debounce effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerSearchDebounced(customerSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPaymentSearchDebounced(paymentSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [paymentSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPolicySearchDebounced(policySearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [policySearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClaimSearchDebounced(claimSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [claimSearchTerm]);

  // Search triggered effects
  useEffect(() => {
    if (activeTab === 'customers') {
      setCustomerCurrentPage(1);
      fetchCustomers();
    }
  }, [customerSearchDebounced]);

  useEffect(() => {
    if (activeTab === 'payments') {
      setPaymentCurrentPage(1);
      fetchPayments();
    }
  }, [paymentSearchDebounced]);

  useEffect(() => {
    if (activeTab === 'policies') {
      setPolicyCurrentPage(1);
      fetchPolicies();
    }
  }, [policySearchDebounced]);

  useEffect(() => {
    if (activeTab === 'claims') {
      setClaimCurrentPage(1);
      fetchClaims();
    }
  }, [claimSearchDebounced]);

  const fetchAcenteStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      // Acente istatistiklerini API'den al
      const [teklifStatsResponse, musteriStatsResponse, policeStatsResponse, odemeStatsResponse, hasarStatsResponse] = await Promise.all([
        fetch('/api/PoliceTeklifleri/acente-istatistikler', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/Musteriler/istatistikler', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/Poliseler?sayfa=1&sayfa_boyutu=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/Odemeler?sayfa=1&sayfa_boyutu=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/Hasar?sayfa=1&sayfa_boyutu=1000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      let teklifStats = { toplam_teklif_sayisi: 0, bekleyen_teklif_sayisi: 0, onaylanan_teklif_sayisi: 0, toplam_prim_tutari: 0, bu_ay_prim_tutari: 0 };
      let musteriStats = { toplam_musteri_sayisi: 0 };
      let policeler = [];
      let odemeler = [];
      let hasarlar = [];

      if (teklifStatsResponse.ok) {
        teklifStats = await teklifStatsResponse.json();
      }

      if (musteriStatsResponse.ok) {
        musteriStats = await musteriStatsResponse.json();
      }

      if (policeStatsResponse.ok) {
        const policeData = await policeStatsResponse.json();
        policeler = policeData.data || [];
      }

      if (odemeStatsResponse.ok) {
        const odemeData = await odemeStatsResponse.json();
        odemeler = odemeData.data || [];
      }

      if (hasarStatsResponse.ok) {
        const hasarData = await hasarStatsResponse.json();
        hasarlar = hasarData.data || [];
      }

      // Poliçe türü dağılımını hesapla
      const policyTypeDistribution = policeler.reduce((acc: any[], police: any) => {
        const existing = acc.find(item => item.type === police.police_turu_adi);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type: police.police_turu_adi, count: 1 });
        }
        return acc;
      }, []);

      // Aktif poliçe sayısını hesapla
      const activePolicies = policeler.filter((police: any) => 
        new Date(police.bitis_tarihi) > new Date()
      ).length;

      // Bekleyen hasar sayısını hesapla
      const pendingClaims = hasarlar.filter((hasar: any) => 
        hasar.durum_adi.toLowerCase().includes('beklemede') || 
        hasar.durum_adi.toLowerCase().includes('işlemde')
      ).length;

      // Toplam komisyon tutarını hesapla
      const totalCommissions = policeler.reduce((sum: number, police: any) => 
        sum + (police.komisyon_tutari || 0), 0
      );

      // Son aktiviteleri oluştur
      const recentActivities = [
        {
          id: "1",
          type: "POLICY_CREATED",
          description: `${teklifStats.onaylanan_teklif_sayisi} poliçe onaylandı`,
          timestamp: new Date().toISOString(),
          user: "Acente Kullanıcı"
        },
        {
          id: "2",
          type: "PAYMENT_RECEIVED",
          description: `₺${teklifStats.bu_ay_prim_tutari.toLocaleString()} bu ay prim`,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: "Acente Kullanıcı"
        },
        {
          id: "3",
          type: "CLAIM_FILED",
          description: `${pendingClaims} bekleyen hasar dosyası`,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: "Acente Kullanıcı"
        }
      ];

      // Aylık komisyon verilerini oluştur (son 6 ay)
      const monthlyCommissions = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        const monthAmount = policeler
          .filter((police: any) => {
            const policeDate = new Date(police.tanzim_tarihi);
            return policeDate.getMonth() === date.getMonth() && 
                   policeDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum: number, police: any) => sum + (police.komisyon_tutari || 0), 0);
        
        monthlyCommissions.push({ month: monthName, amount: monthAmount });
      }

      setStats({
        totalCustomers: musteriStats.toplam_musteri_sayisi || 0,
        totalPolicies: policeler.length,
        totalPayments: odemeler.length,
        totalCommissions: totalCommissions,
        activePolicies: activePolicies,
        pendingClaims: pendingClaims,
        recentActivities: recentActivities,
        policyTypeDistribution: policyTypeDistribution,
        monthlyCommissions: monthlyCommissions
      });
    } catch (error) {
      console.error('Acente stats yüklenirken hata:', error);
      // Hata durumunda varsayılan değerler
      setStats({
        totalCustomers: 0,
        totalPolicies: 0,
        totalPayments: 0,
        totalCommissions: 0,
        activePolicies: 0,
        pendingClaims: 0,
        recentActivities: [],
        policyTypeDistribution: [],
        monthlyCommissions: []
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('fetchCustomers başladı');
      
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

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Müşteri API response:', data);
        setCustomers(data.data || []);
        setCustomerTotalPages(data.totalPages || 1);
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

      const response = await fetch(`/api/Odemeler?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ödemeler API response:', data);
        setPayments(data.odemeler || []);
        setPaymentTotalPages(data.toplam_sayfa || 1);
      } else {
        console.error('Ödemeler yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Ödemeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const params = new URLSearchParams({
        sayfa: policyCurrentPage.toString(),
        sayfa_boyutu: '10',
        ...(policySearchDebounced && { arama_metni: policySearchDebounced })
      });

      const response = await fetch(`/api/Poliseler?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPolicies(data.data || []);
        setPolicyTotalPages(data.totalPages || 1);
      } else {
        console.error('Poliçeler yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Poliçeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const params = new URLSearchParams({
        sayfa: claimCurrentPage.toString(),
        sayfa_boyutu: '10',
        ...(claimSearchDebounced && { arama_metni: claimSearchDebounced })
      });

      const response = await fetch(`/api/Hasar?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Hasarlar API response:', data);
        setClaims(data || []);
        setClaimTotalPages(1); // Hasar API'si sayfalama döndürmüyor
      } else {
        console.error('Hasarlar yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Hasarlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialogData({
      title,
      message,
      onConfirm,
      type
    });
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  const updateCustomerForm = (field: string, value: any) => {
    setCustomerForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePaymentForm = (field: string, value: any) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateClaimForm = (field: string, value: any) => {
    setClaimForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Customer management functions
  const handleCustomerCreate = () => {
    if (!permissions.canCreateCustomer) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingCustomer(null);
    setCustomerForm({
      ad: '',
      soyad: '',
      sirket_adi: '',
      eposta: '',
      telefon: '',
      tc_kimlik_no: '',
      vergi_no: '',
      adres_il: '',
      adres_ilce: '',
      adres_mahalle: '',
      adres_detay: ''
    });
    setShowCustomerModal(true);
  };

  const handleCustomerEdit = (customer: Customer) => {
    if (!permissions.canUpdateCustomer) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingCustomer(customer);
    setCustomerForm({
      ad: customer.ad,
      soyad: customer.soyad,
      sirket_adi: customer.sirket_adi || '',
      eposta: customer.eposta,
      telefon: customer.telefon,
      tc_kimlik_no: customer.tc_kimlik_no || '',
      vergi_no: customer.vergi_no || '',
      adres_il: customer.adres_il,
      adres_ilce: customer.adres_ilce || '',
      adres_mahalle: customer.adres_mahalle || '',
      adres_detay: customer.adres_detay || ''
    });
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const url = editingCustomer 
        ? `/api/Musteriler/${editingCustomer.id}`
        : '/api/Musteriler';
      
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerForm)
      });

      if (response.ok) {
        setShowCustomerModal(false);
        fetchCustomers();
        await fetchAcenteStats();
        alert(editingCustomer ? 'Müşteri başarıyla güncellendi.' : 'Müşteri başarıyla oluşturuldu.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Müşteri işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  // Payment management functions
  const handlePaymentCreate = () => {
    if (!permissions.canCreatePayment) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingPayment(null);
    setPaymentForm({
      musteri_adi: '',
      police_no: '',
      odeme_tarihi: '',
      vade_tarihi: '',
      tutar: 0,
      odeme_turu: '',
      odeme_yontemi_detay: '',
      aciklama: '',
      makbuz_no: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentEdit = (payment: Payment) => {
    if (!permissions.canUpdatePayment) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingPayment(payment);
    setPaymentForm({
      musteri_adi: payment.musteri_adi,
      police_no: payment.police_no || '',
      odeme_tarihi: payment.odeme_tarihi,
      vade_tarihi: payment.vade_tarihi || '',
      tutar: payment.tutar,
      odeme_turu: payment.odeme_turu,
      odeme_yontemi_detay: payment.odeme_yontemi_detay,
      aciklama: payment.aciklama || '',
      makbuz_no: payment.makbuz_no || ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const url = editingPayment 
        ? `/api/Odemeler/${editingPayment.id}`
        : '/api/Odemeler';
      
      const method = editingPayment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentForm)
      });

      if (response.ok) {
        setShowPaymentModal(false);
        fetchPayments();
        await fetchAcenteStats();
        alert(editingPayment ? 'Ödeme başarıyla güncellendi.' : 'Ödeme başarıyla oluşturuldu.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Ödeme işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  // Claim management functions
  const handleClaimCreate = () => {
    if (!permissions.canCreateClaim) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingClaim(null);
    setClaimForm({
      police_no: '',
      olay_tarihi: '',
      olay_yeri_detay: '',
      olay_aciklamasi: '',
      talep_edilen_tutar: 0
    });
    setShowClaimModal(true);
  };

  const handleClaimEdit = (claim: Claim) => {
    if (!permissions.canUpdateClaim) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }
    setEditingClaim(claim);
    setClaimForm({
      police_no: claim.police_no,
      olay_tarihi: claim.olay_tarihi,
      olay_yeri_detay: claim.olay_yeri_detay || '',
      olay_aciklamasi: claim.olay_aciklamasi || '',
      talep_edilen_tutar: claim.talep_edilen_tutar || 0
    });
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const url = editingClaim 
        ? `/api/Hasar/${editingClaim.id}`
        : '/api/Hasar';
      
      const method = editingClaim ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(claimForm)
      });

      if (response.ok) {
        setShowClaimModal(false);
        fetchClaims();
        await fetchAcenteStats();
        alert(editingClaim ? 'Hasar başarıyla güncellendi.' : 'Hasar başarıyla oluşturuldu.');
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Hasar işlemi sırasında hata:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const handleCustomerAction = async (customerId: number, action: 'delete' | 'toggle-blacklist') => {
    // Yetki kontrolü
    if (action === 'delete' && !permissions.canDeleteCustomer) {
      alert('Bu işlem için yetkiniz bulunmamaktadır.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      let endpoint = '';
      let method = 'POST';
      let confirmMessage = '';
      let successMessage = '';

      switch (action) {
        case 'delete':
          endpoint = `/api/Musteriler/${customerId}`;
          method = 'DELETE';
          confirmMessage = 'Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.';
          successMessage = 'Müşteri başarıyla silindi.';
          break;
        case 'toggle-blacklist':
          endpoint = `/api/Musteriler/${customerId}/toggle-blacklist`;
          confirmMessage = 'Bu müşterinin blacklist durumunu değiştirmek istediğinizden emin misiniz?';
          successMessage = 'Müşteri blacklist durumu başarıyla güncellendi.';
          break;
      }

      openConfirmDialog(
        'Onay Gerekli',
        confirmMessage,
        async () => {
          const response = await fetch(endpoint, {
            method,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            if (activeTab === 'customers') {
              fetchCustomers();
            }
            await fetchAcenteStats();
            alert(successMessage);
          } else {
            const errorData = await response.json();
            alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
          }
          closeConfirmDialog();
        },
        action === 'delete' ? 'danger' : 'warning'
      );
    } catch (error) {
      console.error(`${action} işlemi sırasında hata:`, error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  // Helper functions
  const getClaimStatusClass = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('beklemede') || statusLower.includes('işlemde')) {
      return 'beklemede';
    } else if (statusLower.includes('onaylandı') || statusLower.includes('onaylandi')) {
      return 'onaylandi';
    } else if (statusLower.includes('reddedildi') || statusLower.includes('red')) {
      return 'reddedildi';
    } else if (statusLower.includes('tamamlandı') || statusLower.includes('tamamlandi')) {
      return 'tamamlandi';
    }
    return 'beklemede';
  };

  const handleClaimDetail = (claim: Claim) => {
    // For now, show basic claim details in an alert
    // In the future, this could open a detailed modal
    const details = `
Hasar Detayları:
Dosya No: ${claim.dosya_no}
Poliçe No: ${claim.police_no}
Müşteri: ${claim.musteri_adi}
Durum: ${claim.durum_adi}
Olay Tarihi: ${new Date(claim.olay_tarihi).toLocaleDateString('tr-TR')}
Bildirim Tarihi: ${new Date(claim.olusturma_tarihi).toLocaleDateString('tr-TR')}
${claim.olay_yeri_detay ? `Olay Yeri: ${claim.olay_yeri_detay}` : ''}
${claim.talep_edilen_tutar ? `Talep Edilen: ₺${claim.talep_edilen_tutar.toLocaleString()}` : ''}
${claim.onaylanan_tutar ? `Onaylanan: ₺${claim.onaylanan_tutar.toLocaleString()}` : ''}
${claim.olay_aciklamasi ? `Açıklama: ${claim.olay_aciklamasi}` : ''}
    `.trim();
    
    alert(details);
  };

  const renderDashboardContent = () => (
    <div>
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Acente Dashboard - Genel Bakış</h2>
            <p>Acente performansı ve müşteri portföyü</p>
          </div>
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                await fetchAcenteStats();
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
      </div>

      {loading ? (
        <div className="loading">Veriler yükleniyor...</div>
      ) : (
        <>
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
                <h3>Toplam Müşteri</h3>
                <div className="stat-number">{stats.totalCustomers}</div>
                <small>Kayıtlı müşteriler</small>
              </div>
            </div>

            <div className="stat-card success">
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
                <h3>Aktif Poliçe</h3>
                <div className="stat-number">{stats.activePolicies}</div>
                <small>Devam eden poliçeler</small>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Toplam Ödeme</h3>
                <div className="stat-number">{stats.totalPayments}</div>
                <small>Bu ay yapılan</small>
              </div>
            </div>

            <div className="stat-card info">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-info">
                <h3>Toplam Komisyon</h3>
                <div className="stat-number">₺{stats.totalCommissions.toLocaleString()}</div>
                <small>Bu ay kazanılan</small>
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
                <h3>Bekleyen Hasar</h3>
                <div className="stat-number">{stats.pendingClaims}</div>
                <small>Açık dosyalar</small>
              </div>
            </div>

            <div className="stat-card secondary">
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
                <h3>Toplam Poliçe</h3>
                <div className="stat-number">{stats.totalPolicies}</div>
                <small>Tüm zamanlar</small>
              </div>
            </div>
          </div>

          {/* Hızlı İşlemler */}
          <div className="quick-actions">
            <h3>Hızlı İşlemler</h3>
            <div className="action-buttons">
              <button className="action-btn primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Yeni Müşteri Ekle
              </button>
              <button className="action-btn success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                Yeni Poliçe Oluştur
              </button>
              <button className="action-btn warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Ödeme Al
              </button>
              <button className="action-btn info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Hasar Bildir
              </button>
            </div>
          </div>

          {/* Dashboard Bölümleri */}
          <div className="dashboard-sections">
            <div className="recent-activity">
              <h3>Son Aktiviteler</h3>
              <div className="activity-list">
                {stats.recentActivities.map((activity, index) => (
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
                ))}
              </div>
            </div>

            <div className="policy-distribution">
              <h3>Poliçe Türü Dağılımı</h3>
              <div className="policy-list">
                {stats.policyTypeDistribution.map((policy, index) => (
                  <div key={index} className="policy-item">
                    <span className="policy-name">{policy.type}</span>
                    <span className="policy-count">{policy.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aylık Komisyon Grafiği */}
          <div className="monthly-commissions-section">
            <h3>Aylık Komisyon Grafiği</h3>
            <div className="commissions-chart">
              {stats.monthlyCommissions.map((commission, index) => (
                <div key={index} className="commission-bar">
                  <div className="commission-label">{commission.month}</div>
                  <div className="commission-bar-container">
                    <div 
                      className="commission-bar-fill" 
                      style={{
                        width: `${(commission.amount / Math.max(...stats.monthlyCommissions.map(c => c.amount), 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="commission-amount">₺{commission.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPaymentsContent = () => (
    <div className="payments-content">
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Ödeme Yönetimi</h2>
            <p>Ödemeleri takip edin ve yönetin</p>
          </div>
          {permissions.canCreatePayment && (
            <button 
              onClick={handlePaymentCreate}
              className="create-btn"
              title="Yeni Ödeme Ekle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Yeni Ödeme
            </button>
          )}
        </div>
      </div>
      
      <div className="payments-header">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Ödeme ara (müşteri adı, poliçe no, ödeme no)..."
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
                  <th>Müşteri Adı</th>
                  <th>Poliçe No</th>
                  <th>Ödeme Tarihi</th>
                  <th>Vade Tarihi</th>
                  <th>Tutar</th>
                  <th>Ödeme Türü</th>
                  <th>Ödeme Yöntemi</th>
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
                      <td>{new Date(payment.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td>{payment.vade_tarihi ? new Date(payment.vade_tarihi).toLocaleDateString('tr-TR') : '-'}</td>
                      <td>₺{payment.tutar.toLocaleString()}</td>
                      <td>{payment.odeme_turu}</td>
                      <td>{payment.odeme_yontemi_detay || '-'}</td>
                      <td>
                        <span className={`status-badge ${payment.durum_adi.toLowerCase()}`}>
                          {payment.durum_adi}
                        </span>
                      </td>
                      <td>
                        <div className="payment-actions">
                          {permissions.canUpdatePayment && (
                            <button
                              onClick={() => handlePaymentEdit(payment)}
                              className="action-btn-small primary"
                              title="Düzenle"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Düzenle
                            </button>
                          )}
                          {payment.makbuz_no && (
                            <button
                              onClick={() => alert(`Makbuz No: ${payment.makbuz_no}`)}
                              className="action-btn-small info"
                              title="Makbuz Detayı"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                              </svg>
                              Makbuz
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="no-data">
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '10px' }}>💰</div>
                        <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
                          {paymentSearchTerm ? 'Arama kriterlerine uygun ödeme bulunamadı.' : 'Henüz ödeme kaydı bulunmuyor.'}
                        </p>
                        {paymentSearchTerm && (
                          <button
                            onClick={() => setPaymentSearchTerm('')}
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
              onClick={() => setPaymentCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={paymentCurrentPage === 1}
              className="pagination-btn"
            >
              Önceki
            </button>
            <span className="page-info">Sayfa {paymentCurrentPage} / {paymentTotalPages}</span>
            <button
              onClick={() => setPaymentCurrentPage(prev => Math.min(paymentTotalPages, prev + 1))}
              disabled={paymentCurrentPage === paymentTotalPages}
              className="pagination-btn"
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderClaimsContent = () => (
    <div className="hasarlar-content">
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Hasar Yönetimi</h2>
            <p>Hasar dosyalarını oluşturun ve takip edin</p>
          </div>
          {permissions.canCreateClaim && (
            <button 
              onClick={handleClaimCreate}
              className="hasar-add-btn"
              title="Yeni Hasar Bildirimi"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Yeni Hasar Bildirimi
            </button>
          )}
        </div>
      </div>
      
      <div className="hasarlar-header">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Hasar ara (dosya no, poliçe no, müşteri adı)..."
              value={claimSearchTerm}
              onChange={(e) => setClaimSearchTerm(e.target.value)}
              className="search-input"
            />
            {claimSearchTerm && (
              <button
                onClick={() => setClaimSearchTerm('')}
                className="clear-search-btn"
                title="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Hasarlar yükleniyor...</div>
      ) : (
        <>
          <div className="hasarlar-grid">
            {claims.length > 0 ? (
              claims.map((claim) => (
                <div key={claim.id} className="hasar-card">
                  <div className="hasar-header">
                    <div className="hasar-no">
                      <strong>Dosya No:</strong> {claim.dosya_no}
                    </div>
                    <div className={`hasar-durum ${getClaimStatusClass(claim.durum_adi)}`}>
                      {claim.durum_adi}
                    </div>
                  </div>
                  <div className="hasar-body">
                    <div className="hasar-info">
                      <div className="info-item">
                        <span className="label">Poliçe No:</span>
                        <span className="value">{claim.police_no}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Müşteri:</span>
                        <span className="value">{claim.musteri_adi}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Olay Tarihi:</span>
                        <span className="value">{new Date(claim.olay_tarihi).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Bildirim Tarihi:</span>
                        <span className="value">{new Date(claim.olusturma_tarihi).toLocaleDateString('tr-TR')}</span>
                      </div>
                      {claim.olay_yeri_detay && (
                        <div className="info-item">
                          <span className="label">Olay Yeri:</span>
                          <span className="value">{claim.olay_yeri_detay}</span>
                        </div>
                      )}
                      {claim.talep_edilen_tutar && (
                        <div className="info-item">
                          <span className="label">Talep Edilen:</span>
                          <span className="value price">₺{claim.talep_edilen_tutar.toLocaleString()}</span>
                        </div>
                      )}
                      {claim.onaylanan_tutar && (
                        <div className="info-item">
                          <span className="label">Onaylanan:</span>
                          <span className="value price approved">₺{claim.onaylanan_tutar.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="hasar-actions">
                      {permissions.canUpdateClaim && (
                        <button
                          onClick={() => handleClaimEdit(claim)}
                          className="hasar-action-btn edit"
                          title="Düzenle"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Düzenle
                        </button>
                      )}
                      <button
                        onClick={() => handleClaimDetail(claim)}
                        className="hasar-action-btn detail"
                        title="Detay Görüntüle"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Detay
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-hasar">
                <div className="no-hasar-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <h3>Henüz Hasar Kaydı Bulunmuyor</h3>
                <p>
                  {claimSearchTerm ? 'Arama kriterlerine uygun hasar bulunamadı.' : 'Henüz hasar dosyası oluşturulmamış.'}
                </p>
                {claimSearchTerm && (
                  <button
                    onClick={() => setClaimSearchTerm('')}
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
            )}
          </div>

          {claims.length > 0 && (
            <div className="pagination">
              <button
                onClick={() => setClaimCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={claimCurrentPage === 1}
                className="pagination-btn"
              >
                Önceki
              </button>
              <span className="page-info">Sayfa {claimCurrentPage} / {claimTotalPages}</span>
              <button
                onClick={() => setClaimCurrentPage(prev => Math.min(claimTotalPages, prev + 1))}
                disabled={claimCurrentPage === claimTotalPages}
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

  const renderPoliciesContent = () => (
    <div className="policies-content">
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Poliçe Yönetimi</h2>
            <p>Sigorta poliçelerini oluşturun ve yönetin</p>
          </div>
          {permissions.canCreatePolicy && (
            <button 
              onClick={() => alert('Poliçe oluşturma özelliği yakında eklenecek')}
              className="create-btn"
              title="Yeni Poliçe Oluştur"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Yeni Poliçe
            </button>
          )}
        </div>
      </div>
      
      <div className="policies-header">
        <div className="search-filters">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Poliçe ara (poliçe no, müşteri adı, sigorta şirketi)..."
              value={policySearchTerm}
              onChange={(e) => setPolicySearchTerm(e.target.value)}
              className="search-input"
            />
            {policySearchTerm && (
              <button
                onClick={() => setPolicySearchTerm('')}
                className="clear-search-btn"
                title="Aramayı temizle"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Poliçeler yükleniyor...</div>
      ) : (
        <>
          <div className="policies-table">
            <table>
              <thead>
                <tr>
                  <th>Poliçe No</th>
                  <th>Poliçe Türü</th>
                  <th>Sigorta Şirketi</th>
                  <th>Müşteri</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Toplam Tutar</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {policies.length > 0 ? (
                  policies.map((policy) => (
                    <tr key={policy.id}>
                      <td>{policy.police_no}</td>
                      <td>{policy.police_turu_adi}</td>
                      <td>{policy.sigorta_sirketi_adi}</td>
                      <td>{policy.musteri_adi}</td>
                      <td>{new Date(policy.baslangic_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td>{new Date(policy.bitis_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td className="price">₺{policy.toplam_tutar.toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${policy.durum_adi.toLowerCase()}`}>
                          {policy.durum_adi}
                        </span>
                      </td>
                      <td>
                        <div className="policy-actions">
                          {permissions.canUpdatePolicy && (
                            <button
                              onClick={() => alert('Poliçe düzenleme özelliği yakında eklenecek')}
                              className="action-btn-small primary"
                              title="Düzenle"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Düzenle
                            </button>
                          )}
                          <button
                            onClick={() => alert('Poliçe detayları yakında eklenecek')}
                            className="action-btn-small secondary"
                            title="Detaylar"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            Detaylar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="no-data">
                      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '48px', color: '#ccc', marginBottom: '10px' }}>📄</div>
                        <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
                          {policySearchTerm ? 'Arama kriterlerine uygun poliçe bulunamadı.' : 'Henüz poliçe kaydı bulunmuyor.'}
                        </p>
                        {policySearchTerm && (
                          <button
                            onClick={() => setPolicySearchTerm('')}
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
              onClick={() => setPolicyCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={policyCurrentPage === 1}
              className="pagination-btn"
            >
              Önceki
            </button>
            <span className="page-info">Sayfa {policyCurrentPage} / {policyTotalPages}</span>
            <button
              onClick={() => setPolicyCurrentPage(prev => Math.min(policyTotalPages, prev + 1))}
              disabled={policyCurrentPage === policyTotalPages}
              className="pagination-btn"
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderCommissionsContent = () => {
    // Komisyon verilerini hesapla
    const totalCommission = policies.reduce((sum, policy) => sum + (policy.komisyon_tutari || 0), 0);
    
    // Poliçe türüne göre komisyon dağılımı
    const policyTypeCommissions = policies.reduce((acc: any[], policy) => {
      const existing = acc.find(item => item.type === policy.police_turu_adi);
      if (existing) {
        existing.amount += policy.komisyon_tutari || 0;
        existing.count++;
      } else {
        acc.push({ 
          type: policy.police_turu_adi, 
          amount: policy.komisyon_tutari || 0, 
          count: 1 
        });
      }
      return acc;
    }, []);

    // Son komisyonlar
    const recentCommissions = policies
      .filter(policy => policy.komisyon_tutari && policy.komisyon_tutari > 0)
      .sort((a, b) => new Date(b.tanzim_tarihi).getTime() - new Date(a.tanzim_tarihi).getTime())
      .slice(0, 10)
      .map(policy => ({
        id: policy.id,
        police_no: policy.police_no,
        musteri_adi: policy.musteri_adi,
        commission: policy.komisyon_tutari || 0,
        date: policy.tanzim_tarihi
      }));

    return (
      <div className="commissions-content">
        <div className="section-header">
          <div className="header-content">
            <div>
              <h2>Komisyon Takibi</h2>
              <p>Komisyon bilgilerini görüntüleyin ve analiz edin</p>
            </div>
          </div>
        </div>

        <div className="commissions-overview">
          <div className="commission-stats">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Toplam Komisyon</h3>
                <p className="stat-value">₺{totalCommission.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Poliçe Sayısı</h3>
                <p className="stat-value">{policies.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <h3>Ortalama Komisyon</h3>
                <p className="stat-value">₺{policies.length > 0 ? (totalCommission / policies.length).toFixed(2) : '0'}</p>
              </div>
            </div>
          </div>

          <div className="commission-details">
            <div className="detail-section">
              <h3>Poliçe Türüne Göre Komisyon Dağılımı</h3>
              <div className="commission-chart">
                {policyTypeCommissions.length > 0 ? (
                  policyTypeCommissions.map((item, index) => (
                    <div key={index} className="chart-item">
                      <div className="chart-label">
                        <span className="policy-type">{item.type}</span>
                        <span className="policy-count">({item.count} poliçe)</span>
                      </div>
                      <div className="chart-bar">
                        <div 
                          className="chart-fill" 
                          style={{ 
                            width: `${(item.amount / totalCommission) * 100}%`,
                            background: `hsl(${index * 60}, 70%, 60%)`
                          }}
                        ></div>
                      </div>
                      <div className="chart-value">₺{item.amount.toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">Henüz komisyon verisi bulunmuyor.</p>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3>Son Komisyonlar</h3>
              <div className="recent-commissions">
                {recentCommissions.length > 0 ? (
                  <div className="commissions-list">
                    {recentCommissions.map((commission) => (
                      <div key={commission.id} className="commission-item">
                        <div className="commission-info">
                          <div className="commission-header">
                            <span className="police-no">{commission.police_no}</span>
                            <span className="commission-amount">₺{commission.commission.toLocaleString()}</span>
                          </div>
                          <div className="commission-details">
                            <span className="customer-name">{commission.musteri_adi}</span>
                            <span className="commission-date">{new Date(commission.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">Henüz komisyon kaydı bulunmuyor.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportsContent = () => {
    // Rapor verilerini hesapla
    const totalRevenue = policies.reduce((sum, policy) => sum + policy.toplam_tutar, 0);
    const totalCommission = policies.reduce((sum, policy) => sum + (policy.komisyon_tutari || 0), 0);
    const activePolicyCount = policies.filter(policy => new Date(policy.bitis_tarihi) > new Date()).length;
    const pendingClaimCount = claims.filter(claim => 
      claim.durum_adi.toLowerCase().includes('beklemede') || 
      claim.durum_adi.toLowerCase().includes('işlemde')
    ).length;

    // Aylık trend verileri
    const monthlyTrend: Array<{
      month: string;
      policies: number;
      revenue: number;
      commission: number;
    }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
      const monthPolicies = policies.filter(policy => {
        const policyDate = new Date(policy.tanzim_tarihi);
        return policyDate.getMonth() === date.getMonth() && 
               policyDate.getFullYear() === date.getFullYear();
      });
      const monthRevenue = monthPolicies.reduce((sum, policy) => sum + policy.toplam_tutar, 0);
      const monthCommission = monthPolicies.reduce((sum, policy) => sum + (policy.komisyon_tutari || 0), 0);
      
      monthlyTrend.push({
        month: monthName,
        policies: monthPolicies.length,
        revenue: monthRevenue,
        commission: monthCommission
      });
    }

    return (
      <div className="reports-content">
        <div className="section-header">
          <div className="header-content">
            <div>
              <h2>Raporlar</h2>
              <p>Acente raporlarını görüntüleyin ve analiz edin</p>
            </div>
          </div>
        </div>

        <div className="reports-overview">
          <div className="report-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Toplam Gelir</h3>
                <p className="stat-value">₺{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Toplam Komisyon</h3>
                <p className="stat-value">₺{totalCommission.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>Aktif Poliçeler</h3>
                <p className="stat-value">{activePolicyCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>Bekleyen Hasarlar</h3>
                <p className="stat-value">{pendingClaimCount}</p>
              </div>
            </div>
          </div>

          <div className="report-details">
            <div className="detail-section">
              <h3>Aylık Trend Raporu</h3>
              <div className="trend-chart">
                {monthlyTrend.map((item, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-header">
                      <span className="month-name">{item.month}</span>
                      <span className="policy-count">{item.policies} poliçe</span>
                    </div>
                    <div className="trend-bars">
                      <div className="trend-bar revenue">
                        <div className="bar-label">Gelir</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${(item.revenue / Math.max(...monthlyTrend.map(t => t.revenue))) * 100}%`,
                              background: '#4CAF50'
                            }}
                          ></div>
                        </div>
                        <div className="bar-value">₺{item.revenue.toLocaleString()}</div>
                      </div>
                      <div className="trend-bar commission">
                        <div className="bar-label">Komisyon</div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${(item.commission / Math.max(...monthlyTrend.map(t => t.commission))) * 100}%`,
                              background: '#FF9800'
                            }}
                          ></div>
                        </div>
                        <div className="bar-value">₺{item.commission.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h3>Özet Rapor</h3>
              <div className="summary-report">
                <div className="summary-item">
                  <h4>Müşteri Analizi</h4>
                  <p>Toplam müşteri sayısı: <strong>{customers.length}</strong></p>
                  <p>Aktif müşteri oranı: <strong>{customers.length > 0 ? ((customers.filter(c => !c.blacklist_mi).length / customers.length) * 100).toFixed(1) : 0}%</strong></p>
                </div>
                <div className="summary-item">
                  <h4>Poliçe Analizi</h4>
                  <p>Toplam poliçe sayısı: <strong>{policies.length}</strong></p>
                  <p>Aktif poliçe oranı: <strong>{policies.length > 0 ? ((activePolicyCount / policies.length) * 100).toFixed(1) : 0}%</strong></p>
                </div>
                <div className="summary-item">
                  <h4>Hasar Analizi</h4>
                  <p>Toplam hasar sayısı: <strong>{claims.length}</strong></p>
                  <p>Bekleyen hasar oranı: <strong>{claims.length > 0 ? ((pendingClaimCount / claims.length) * 100).toFixed(1) : 0}%</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomersContent = () => (
    <div className="customers-content">
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Müşteri Yönetimi</h2>
            <p>Tüm müşterilerin yönetimi ve takibi</p>
          </div>
          {permissions.canCreateCustomer && (
            <button 
              onClick={handleCustomerCreate}
              className="create-btn"
              title="Yeni Müşteri Ekle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Yeni Müşteri
            </button>
          )}
        </div>
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
                          {permissions.canUpdateCustomer && (
                            <button
                              onClick={() => handleCustomerEdit(customer)}
                              className="action-btn-small primary"
                              title="Düzenle"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Düzenle
                            </button>
                          )}
                          <button
                            onClick={() => handleCustomerAction(customer.id, 'toggle-blacklist')}
                            className="action-btn-small warning"
                            title={customer.blacklist_mi ? 'Blacklist\'ten Çıkar' : 'Blacklist\'e Ekle'}
                          >
                            {customer.blacklist_mi ? 'Blacklist\'ten Çıkar' : 'Blacklist\'e Ekle'}
                          </button>
                          {permissions.canDeleteCustomer && (
                            <button
                              onClick={() => handleCustomerAction(customer.id, 'delete')}
                              className="action-btn-small danger"
                              title="Sil"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              </svg>
                              Sil
                            </button>
                          )}
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'customers':
        return renderCustomersContent();
      case 'policies':
        return renderPoliciesContent();
      case 'payments':
        return renderPaymentsContent();
      case 'claims':
        return renderClaimsContent();
      case 'commissions':
        return renderCommissionsContent();
      case 'reports':
        return renderReportsContent();
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="acente-dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-left">
            <div className="favicon-section">
              <img src="/favicon.png" alt="AdaYazılım Favicon" className="dashboard-favicon" />
            </div>
            <nav className="dashboard-nav">
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
                className={`nav-btn ${activeTab === 'policies' ? 'active' : ''}`}
                onClick={() => setActiveTab('policies')}
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
                className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Ödemeler
              </button>
              <button 
                className={`nav-btn ${activeTab === 'claims' ? 'active' : ''}`}
                onClick={() => setActiveTab('claims')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Hasarlar
              </button>
              <button 
                className={`nav-btn ${activeTab === 'commissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('commissions')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Komisyonlar
              </button>
              <button 
                className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                Raporlar
              </button>
            </nav>
          </div>
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user?.ad} {user?.soyad}</span>
              <span className="user-role">Sigorta Acentesi</span>
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

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h3>
              <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Ad *</label>
                  <input
                    type="text"
                    value={customerForm.ad}
                    onChange={(e) => updateCustomerForm('ad', e.target.value)}
                    placeholder="Müşteri adı"
                  />
                </div>
                <div className="form-group">
                  <label>Soyad *</label>
                  <input
                    type="text"
                    value={customerForm.soyad}
                    onChange={(e) => updateCustomerForm('soyad', e.target.value)}
                    placeholder="Müşteri soyadı"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>E-posta *</label>
                  <input
                    type="email"
                    value={customerForm.eposta}
                    onChange={(e) => updateCustomerForm('eposta', e.target.value)}
                    placeholder="E-posta adresi"
                  />
                </div>
                <div className="form-group">
                  <label>Telefon *</label>
                  <input
                    type="tel"
                    value={customerForm.telefon}
                    onChange={(e) => updateCustomerForm('telefon', e.target.value)}
                    placeholder="Telefon numarası"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>TC Kimlik No</label>
                  <input
                    type="text"
                    value={customerForm.tc_kimlik_no}
                    onChange={(e) => updateCustomerForm('tc_kimlik_no', e.target.value)}
                    placeholder="TC Kimlik numarası"
                  />
                </div>
                <div className="form-group">
                  <label>Vergi No</label>
                  <input
                    type="text"
                    value={customerForm.vergi_no}
                    onChange={(e) => updateCustomerForm('vergi_no', e.target.value)}
                    placeholder="Vergi numarası"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Şirket Adı</label>
                  <input
                    type="text"
                    value={customerForm.sirket_adi}
                    onChange={(e) => updateCustomerForm('sirket_adi', e.target.value)}
                    placeholder="Şirket adı (varsa)"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Adres Detayı</label>
                  <textarea
                    value={customerForm.adres_detay}
                    onChange={(e) => updateCustomerForm('adres_detay', e.target.value)}
                    placeholder="Detaylı adres bilgisi"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowCustomerModal(false)}>
                İptal
              </button>
              <button className="modal-btn primary" onClick={handleCustomerSubmit}>
                {editingCustomer ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme Ekle'}</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Müşteri Adı *</label>
                  <input
                    type="text"
                    value={paymentForm.musteri_adi}
                    onChange={(e) => updatePaymentForm('musteri_adi', e.target.value)}
                    placeholder="Müşteri adı"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Poliçe No</label>
                  <input
                    type="text"
                    value={paymentForm.police_no}
                    onChange={(e) => updatePaymentForm('police_no', e.target.value)}
                    placeholder="Poliçe numarası"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ödeme Tarihi *</label>
                  <input
                    type="date"
                    value={paymentForm.odeme_tarihi}
                    onChange={(e) => updatePaymentForm('odeme_tarihi', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Vade Tarihi</label>
                  <input
                    type="date"
                    value={paymentForm.vade_tarihi}
                    onChange={(e) => updatePaymentForm('vade_tarihi', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tutar *</label>
                  <input
                    type="number"
                    value={paymentForm.tutar}
                    onChange={(e) => updatePaymentForm('tutar', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ödeme Türü *</label>
                  <select
                    value={paymentForm.odeme_turu}
                    onChange={(e) => updatePaymentForm('odeme_turu', e.target.value)}
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="Nakit">Nakit</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Banka Transferi">Banka Transferi</option>
                    <option value="Çek">Çek</option>
                    <option value="Senet">Senet</option>
                    <option value="Havale">Havale</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ödeme Yöntemi Detayı</label>
                  <input
                    type="text"
                    value={paymentForm.odeme_yontemi_detay}
                    onChange={(e) => updatePaymentForm('odeme_yontemi_detay', e.target.value)}
                    placeholder="Ödeme yöntemi detayı (örn: Visa, MasterCard, Garanti Bankası)"
                  />
                </div>
                <div className="form-group">
                  <label>Makbuz No</label>
                  <input
                    type="text"
                    value={paymentForm.makbuz_no}
                    onChange={(e) => updatePaymentForm('makbuz_no', e.target.value)}
                    placeholder="Makbuz numarası"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Açıklama</label>
                  <textarea
                    value={paymentForm.aciklama}
                    onChange={(e) => updatePaymentForm('aciklama', e.target.value)}
                    placeholder="Ödeme açıklaması (opsiyonel)"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowPaymentModal(false)}>
                İptal
              </button>
              <button 
                className="modal-btn primary" 
                onClick={handlePaymentSubmit}
                disabled={!paymentForm.musteri_adi || !paymentForm.odeme_tarihi || !paymentForm.tutar || !paymentForm.odeme_turu}
              >
                {editingPayment ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingClaim ? 'Hasar Düzenle' : 'Yeni Hasar Bildirimi'}</h3>
              <button className="modal-close" onClick={() => setShowClaimModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Poliçe No *</label>
                  <input
                    type="text"
                    value={claimForm.police_no}
                    onChange={(e) => updateClaimForm('police_no', e.target.value)}
                    placeholder="Poliçe numarası"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Olay Tarihi *</label>
                  <input
                    type="date"
                    value={claimForm.olay_tarihi}
                    onChange={(e) => updateClaimForm('olay_tarihi', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Olay Yeri Detayı</label>
                  <input
                    type="text"
                    value={claimForm.olay_yeri_detay}
                    onChange={(e) => updateClaimForm('olay_yeri_detay', e.target.value)}
                    placeholder="Olay yeri detayı (adres, şehir, vb.)"
                  />
                </div>
                <div className="form-group">
                  <label>Talep Edilen Tutar</label>
                  <input
                    type="number"
                    value={claimForm.talep_edilen_tutar}
                    onChange={(e) => updateClaimForm('talep_edilen_tutar', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Olay Açıklaması *</label>
                  <textarea
                    value={claimForm.olay_aciklamasi}
                    onChange={(e) => updateClaimForm('olay_aciklamasi', e.target.value)}
                    placeholder="Olayın detaylı açıklaması (ne oldu, nasıl oldu, zararın boyutu vb.)"
                    rows={4}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowClaimModal(false)}>
                İptal
              </button>
              <button 
                className="modal-btn primary" 
                onClick={handleClaimSubmit}
                disabled={!claimForm.police_no || !claimForm.olay_tarihi || !claimForm.olay_aciklamasi}
              >
                {editingClaim ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={confirmDialogData.title}
        message={confirmDialogData.message}
        onConfirm={confirmDialogData.onConfirm}
        onCancel={closeConfirmDialog}
        type={confirmDialogData.type}
      />
    </div>
  );
};

export default AcenteDashboard; 