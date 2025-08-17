import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addressApiService, Il, Ilce, Mahalle } from '../../utils/addressApi';
import './KullaniciDashboard.css';

interface Teklif {
  id: number;
  teklif_no: string;
  police_turu_adi: string;
  sigorta_sirketi_adi: string;
  toplam_tutar: number;
  teklif_tarihi: string;
  gecerlilik_tarihi: string;
  durum_adi: string;
  durum_id: number;
  gecerlilik_durumu: boolean;
}

interface TeklifDetay {
  id: number;
  teklif_no: string;
  police_turu_adi: string;
  sigorta_sirketi_adi: string;
  risk_bilgileri: string;
  teminatlar: Array<{
    teminat_id: number;
    teminat_adi: string;
    teminat_kodu: string;
    limit: number;
    prim: number;
    aciklama: string;
    secili_mi: boolean;
  }>;
  brut_prim: number;
  net_prim: number;
  komisyon_tutari: number;
  vergi_tutari: number;
  toplam_tutar: number;
  teklif_tarihi: string;
  gecerlilik_tarihi: string;
  durum_adi: string;
  durum_id: number;
  notlar: string;
  gecerlilik_durumu: boolean;
}

interface Police {
  id: number;
  police_no: string;
  police_turu_adi: string;
  sigorta_sirketi_adi: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  toplam_tutar: number;
  durum_adi: string;
  durum_id: number;
  tanzim_tarihi: string;
  teklif_no?: string;
}

interface Hasar {
  id: number;
  dosya_no: string;
  police_no: string;
  musteri_adi: string;
  durum_adi: string;
  olusturma_tarihi: string;
  talep_edilen_tutar?: number;
  onaylanan_tutar?: number;
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

const KullaniciDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teklifler, setTeklifler] = useState<Teklif[]>([]);
  const [selectedTeklif, setSelectedTeklif] = useState<TeklifDetay | null>(null);
  const [poliseler, setPoliseler] = useState<Police[]>([]);
  const [hasarlar, setHasarlar] = useState<Hasar[]>([]);
  const [selectedHasar, setSelectedHasar] = useState<HasarDetay | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTeklifModal, setShowTeklifModal] = useState(false);
  const [showOnayModal, setShowOnayModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHasarDetayModal, setShowHasarDetayModal] = useState(false);
  const [showHasarBildirimModal, setShowHasarBildirimModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    ad: user?.ad || '',
    soyad: user?.soyad || '',
    telefon: user?.telefon || '',
    meslek: user?.meslek || '',
    aylikGelir: user?.aylikGelir?.toString() || '',
    adresIl: user?.adresIl || '',
    adresIlce: user?.adresIlce || '',
    adresMahalle: user?.adresMahalle || '',
    adresDetay: user?.adresDetay || '',
    postaKodu: user?.postaKodu || ''
  });
  const [onayForm, setOnayForm] = useState({
    onaylandi: true,
    red_nedeni: '',
    odeme_yontemi: 'NAKIT',
    taksit_sayisi: 1,
    // Ödeme bilgileri
    kart_sahibi: '',
    kart_numarasi: '',
    son_kullanma_ayi: '',
    son_kullanma_yili: '',
    cvv: '',
    // Havale bilgileri
    banka_adi: '',
    hesap_sahibi: '',
    iban: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    eski_sifre: '',
    yeni_sifre: '',
    yeni_sifre_tekrar: ''
  });

  const [hasarBildirimForm, setHasarBildirimForm] = useState({
    police_id: 0,
    olay_tarihi: '',
    olay_yeri_detay: '',
    olay_aciklamasi: '',
    talep_edilen_tutar: '',
    notlar: ''
  });

  const [hasarNotForm, setHasarNotForm] = useState({
    not_metni: ''
  });

  // Dosya yükleme state'leri
  const [hasarDosyalari, setHasarDosyalari] = useState<HasarDosya[]>([]);
  const [showDosyaYukleModal, setShowDosyaYukleModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dosyaAciklama, setDosyaAciklama] = useState('');
  const [dosyaYukleniyor, setDosyaYukleniyor] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Adres API state'leri
  const [iller, setIller] = useState<Il[]>([]);
  const [ilceler, setIlceler] = useState<Ilce[]>([]);
  const [mahalleler, setMahalleler] = useState<Mahalle[]>([]);
  const [selectedIl, setSelectedIl] = useState<string>('');
  const [selectedIlce, setSelectedIlce] = useState<string>('');
  const [selectedMahalle, setSelectedMahalle] = useState<string>('');

  const [stats, setStats] = useState({
    total_policies: 0,
    active_policies: 0,
    total_payments: 0,
    pending_payments: 0,
    total_claims: 0,
    pending_claims: 0,
    total_prim: 0,
    total_paid: 0,
    total_claims_amount: 0,
    pending_offers: 0,
    accepted_offers: 0,
    rejected_offers: 0,
    this_month_payments: 0,
    this_month_claims: 0,
    recent_activities: []
  });

  useEffect(() => {
    if (activeTab === 'teklifler') {
      fetchTeklifler();
    } else if (activeTab === 'poliseler') {
      fetchPoliseler();
    } else if (activeTab === 'hasarlar') {
      fetchHasarlar();
    } else if (activeTab === 'dashboard') {
      fetchKullaniciStats();
    }
  }, [activeTab]);

  // İlleri yükle
  useEffect(() => {
    fetchIller();
  }, []);

  const fetchKullaniciStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/MusteriTeklif/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Kullanıcı stats yüklenemedi:', response.status);
        // Hata durumunda varsayılan değerler
        setStats({
          total_policies: 0,
          active_policies: 0,
          total_payments: 0,
          pending_payments: 0,
          total_claims: 0,
          pending_claims: 0,
          total_prim: 0,
          total_paid: 0,
          total_claims_amount: 0,
          pending_offers: 0,
          accepted_offers: 0,
          rejected_offers: 0,
          this_month_payments: 0,
          this_month_claims: 0,
          recent_activities: []
        });
      }
    } catch (error) {
      console.error('Kullanıcı stats yüklenirken hata:', error);
      // Hata durumunda varsayılan değerler
      setStats({
        total_policies: 0,
        active_policies: 0,
        total_payments: 0,
        pending_payments: 0,
        total_claims: 0,
        pending_claims: 0,
        total_prim: 0,
        total_paid: 0,
        total_claims_amount: 0,
        pending_offers: 0,
        accepted_offers: 0,
        rejected_offers: 0,
        this_month_payments: 0,
        this_month_claims: 0,
        recent_activities: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeklifler = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/MusteriTeklif/Liste', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeklifler(data);
      } else {
        console.error('Teklifler yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Teklifler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoliseler = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/Poliseler/MusteriPoliseleri', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPoliseler(data);
      } else {
        console.error('Poliçeler yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Poliçeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTeklifDetay = async (teklifId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`/api/MusteriTeklif/${teklifId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTeklif(data);
        setShowTeklifModal(true);
      } else {
        console.error('Teklif detayı yüklenemedi:', response.status);
      }
    } catch (error) {
      console.error('Teklif detayı yüklenirken hata:', error);
    }
  };

  const handleTeklifOnay = async () => {
    try {
      if (!selectedTeklif) return;

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/MusteriTeklif/Onayla', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teklif_id: selectedTeklif.id,
          onaylandi: onayForm.onaylandi,
          red_nedeni: onayForm.red_nedeni,
          odeme_yontemi: onayForm.odeme_yontemi,
          taksit_sayisi: onayForm.taksit_sayisi,
          // Ödeme bilgileri
          kart_sahibi: onayForm.kart_sahibi,
          kart_numarasi: onayForm.kart_numarasi,
          son_kullanma_ayi: onayForm.son_kullanma_ayi,
          son_kullanma_yili: onayForm.son_kullanma_yili,
          cvv: onayForm.cvv,
          banka_adi: onayForm.banka_adi,
          hesap_sahibi: onayForm.hesap_sahibi,
          iban: onayForm.iban
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowOnayModal(false);
        setShowTeklifModal(false);
        setSelectedTeklif(null);
        fetchTeklifler(); // Teklifleri yenile
      } else {
        const errorData = await response.json();
        alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Teklif onaylama hatası:', error);
      alert('İşlem sırasında hata oluştu');
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const requestBody = {
        ad: profileForm.ad,
        soyad: profileForm.soyad,
        telefon: profileForm.telefon,
        meslek: profileForm.meslek,
        aylik_gelir: profileForm.aylikGelir ? parseFloat(profileForm.aylikGelir) : undefined,
        adres_il: selectedIl,
        adres_ilce: selectedIlce,
        adres_mahalle: selectedMahalle,
        adres_detay: profileForm.adresDetay,
        posta_kodu: profileForm.postaKodu
      };

      console.log('Gönderilen veri:', requestBody);

      const response = await fetch('/api/Musteriler/Current', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        alert('Profil bilgileri başarıyla güncellendi!');
        setShowEditProfileModal(false);
        setShowProfileModal(false);
        // Kullanıcı bilgilerini yenile
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Güncelleme başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      alert('İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordForm.yeni_sifre !== passwordForm.yeni_sifre_tekrar) {
        alert('Yeni şifreler eşleşmiyor');
        return;
      }

      if (passwordForm.yeni_sifre.length < 6) {
        alert('Yeni şifre en az 6 karakter olmalıdır');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch('/api/Auth/SifreDegistir', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eski_sifre: passwordForm.eski_sifre,
          yeni_sifre: passwordForm.yeni_sifre
        })
      });

      if (response.ok) {
        alert('Şifre başarıyla değiştirildi');
        setShowPasswordModal(false);
        setPasswordForm({
          eski_sifre: '',
          yeni_sifre: '',
          yeni_sifre_tekrar: ''
        });
      } else {
        const errorData = await response.json();
        alert(`Şifre değiştirme başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Şifre değiştirilirken hata:', error);
      alert('Şifre değiştirilirken hata oluştu');
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

  const handleHasarBildirim = async () => {
    try {
      if (!hasarBildirimForm.police_id || !hasarBildirimForm.olay_tarihi || 
          !hasarBildirimForm.olay_yeri_detay || !hasarBildirimForm.olay_aciklamasi) {
        alert('Lütfen tüm zorunlu alanları doldurun');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const requestBody = {
        police_id: hasarBildirimForm.police_id,
        olay_tarihi: hasarBildirimForm.olay_tarihi,
        olay_yeri: hasarBildirimForm.olay_yeri_detay,
        olay_aciklamasi: hasarBildirimForm.olay_aciklamasi,
        talep_edilen_tutar: hasarBildirimForm.talep_edilen_tutar ? parseFloat(hasarBildirimForm.talep_edilen_tutar) : undefined,
        notlar: hasarBildirimForm.notlar || undefined
      };

      const response = await fetch('/api/Hasar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        
                   // Dosya yükleme özelliği şu anda kullanılamıyor
           if (selectedFiles.length > 0) {
             console.log('Dosya yükleme özelliği şu anda kullanılamıyor');
           }

        alert(`Hasar bildirimi başarıyla oluşturuldu. Hasar No: ${data.hasar_no}`);
        setShowHasarBildirimModal(false);
        setHasarBildirimForm({
          police_id: 0,
          olay_tarihi: '',
          olay_yeri_detay: '',
          olay_aciklamasi: '',
          talep_edilen_tutar: '',
          notlar: ''
        });
        setSelectedFiles([]);
        setDosyaAciklama('');
        fetchHasarlar(); // Hasar listesini yenile
      } else {
        const errorData = await response.json();
        alert(`Hasar bildirimi başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Hasar bildirimi hatası:', error);
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

  // Adres API fonksiyonları
  const fetchIller = async () => {
    try {
      const data = await addressApiService.getIller();
      setIller(data);
    } catch (error) {
      console.error('İller yüklenirken hata:', error);
    }
  };

  const handleIlChange = async (ilAdi: string) => {
    setSelectedIl(ilAdi);
    setSelectedIlce('');
    setSelectedMahalle('');
    setIlceler([]);
    setMahalleler([]);
    
    if (ilAdi) {
      try {
        const data = await addressApiService.getIlceler(ilAdi);
        setIlceler(data);
      } catch (error) {
        console.error('İlçeler yüklenirken hata:', error);
      }
    }
  };

  const handleIlceChange = async (ilceAdi: string) => {
    setSelectedIlce(ilceAdi);
    setSelectedMahalle('');
    setMahalleler([]);
    
    if (ilceAdi && selectedIl) {
      try {
        const data = await addressApiService.getMahalleler(selectedIl, ilceAdi);
        setMahalleler(data);
      } catch (error) {
        console.error('Mahalleler yüklenirken hata:', error);
      }
    }
  };

  const handleMahalleChange = (mahalleAdi: string) => {
    setSelectedMahalle(mahalleAdi);
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

  // Düzenleme modal'ı açıldığında mevcut adres bilgilerini yükle
  const handleEditProfileOpen = async () => {
    setShowEditProfileModal(true);
    
    // Mevcut adres bilgilerini seçili hale getir
    if (user?.adresIl && user.adresIl !== 'Kullanici' && user.adresIl.trim() !== '') {
      setSelectedIl(user.adresIl);
      // İlçeleri yükle
      try {
        const ilceData = await addressApiService.getIlceler(user.adresIl);
        setIlceler(ilceData);
        
        if (user.adresIlce && user.adresIlce !== 'Kullanici' && user.adresIlce.trim() !== '') {
          setSelectedIlce(user.adresIlce);
          // Mahalleleri yükle
          try {
            const mahalleData = await addressApiService.getMahalleler(user.adresIl, user.adresIlce);
            setMahalleler(mahalleData);
            
            if (user.adresMahalle && user.adresMahalle !== 'Kullanici' && user.adresMahalle.trim() !== '') {
              setSelectedMahalle(user.adresMahalle);
            }
          } catch (error) {
            console.error('Mahalleler yüklenirken hata:', error);
            // Hata durumunda mahalle seçimini temizle
            setSelectedMahalle('');
          }
        }
      } catch (error) {
        console.error('İlçeler yüklenirken hata:', error);
        // Hata durumunda ilçe ve mahalle seçimlerini temizle
        setSelectedIlce('');
        setSelectedMahalle('');
      }
    }
  };

  const renderTekliflerContent = () => (
    <div className="teklifler-content">
      <div className="section-header">
        <h2>Poliçe Tekliflerim</h2>
        <p>Size sunulan poliçe tekliflerini görüntüleyin ve onaylayın</p>
      </div>

      {loading ? (
        <div className="loading">Teklifler yükleniyor...</div>
      ) : (
        <div className="teklifler-grid">
          {teklifler.length > 0 ? (
            teklifler.map((teklif) => (
              <div key={teklif.id} className="teklif-card">
                                  <div className="teklif-header">
                    <div className="teklif-no">{teklif.teklif_no}</div>
                    <div className={`teklif-durum ${teklif.durum_id === 1 ? 'beklemede' : teklif.durum_id === 2 ? 'onaylandi' : 'reddedildi'}`}>
                      {teklif.durum_adi}
                    </div>
                  </div>
                
                <div className="teklif-body">
                  <div className="teklif-info">
                    <div className="info-item">
                      <span className="label">Poliçe Türü:</span>
                      <span className="value">{teklif.police_turu_adi}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Sigorta Şirketi:</span>
                      <span className="value">{teklif.sigorta_sirketi_adi}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Toplam Tutar:</span>
                      <span className="value price">₺{teklif.toplam_tutar.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Teklif Tarihi:</span>
                      <span className="value">{new Date(teklif.teklif_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Geçerlilik:</span>
                      <span className={`value ${teklif.gecerlilik_durumu ? 'gecerli' : 'suresi-dolmus'}`}>
                        {teklif.gecerlilik_durumu ? 'Geçerli' : 'Süresi Dolmuş'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="teklif-actions">
                  <button
                    onClick={() => fetchTeklifDetay(teklif.id)}
                    className="btn btn-primary"
                    disabled={!teklif.gecerlilik_durumu}
                  >
                    Detayları Görüntüle
                  </button>
                  

                  
                  {teklif.gecerlilik_durumu && (
                    <button
                      onClick={() => {
                        setSelectedTeklif(teklif as any);
                        setOnayForm({
                          onaylandi: true,
                          red_nedeni: '',
                          odeme_yontemi: 'NAKIT',
                          taksit_sayisi: 1,
                          kart_sahibi: '',
                          kart_numarasi: '',
                          son_kullanma_ayi: '',
                          son_kullanma_yili: '',
                          cvv: '',
                          banka_adi: '',
                          hesap_sahibi: '',
                          iban: ''
                        });
                        setShowOnayModal(true);
                      }}
                      className="btn btn-success"
                    >
                      Onayla
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-teklif">
              <div className="no-teklif-icon">📋</div>
              <h3>Henüz teklif bulunmuyor</h3>
              <p>Size sunulan poliçe teklifi bulunmamaktadır.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPoliselerContent = () => (
    <div className="poliseler-content">
      <div className="section-header">
        <h2>Poliçelerim</h2>
        <p>Aktif poliçelerinizi görüntüleyin</p>
      </div>

      {loading ? (
        <div className="loading">Poliçeler yükleniyor...</div>
      ) : (
        <div className="poliseler-grid">
          {poliseler.length > 0 ? (
            poliseler.map((police) => (
              <div key={police.id} className="police-card">
                <div className="police-header">
                  <div className="police-no">{police.police_no}</div>
                  <div className={`police-durum ${police.durum_id === 1 ? 'aktif' : 'pasif'}`}>
                    {police.durum_adi}
                  </div>
                </div>
                
                <div className="police-body">
                  <div className="police-info">
                    <div className="info-item">
                      <span className="label">Poliçe Türü:</span>
                      <span className="value">{police.police_turu_adi}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Sigorta Şirketi:</span>
                      <span className="value">{police.sigorta_sirketi_adi}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Toplam Tutar:</span>
                      <span className="value price">₺{police.toplam_tutar.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Başlangıç Tarihi:</span>
                      <span className="value">{new Date(police.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Bitiş Tarihi:</span>
                      <span className="value">{new Date(police.bitis_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Tanzim Tarihi:</span>
                      <span className="value">{new Date(police.tanzim_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {police.teklif_no && (
                      <div className="info-item">
                        <span className="label">Teklif No:</span>
                        <span className="value">{police.teklif_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-police">
              <div className="no-police-icon">📄</div>
              <h3>Henüz poliçe bulunmuyor</h3>
              <p>Aktif poliçeniz bulunmamaktadır.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderHasarlarContent = () => (
    <div className="hasarlar-content">
      <div className="section-header">
        <h2>Hasar Dosyalarım</h2>
        <p>Hasar bildirimlerinizi görüntüleyin ve yönetin</p>
        <button 
          className="btn btn-primary"
          onClick={() => setShowHasarBildirimModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          Yeni Hasar Bildirimi
        </button>
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
                </div>
              </div>
            ))
          ) : (
            <div className="no-hasar">
              <div className="no-hasar-icon">🚨</div>
              <h3>Henüz hasar dosyası bulunmuyor</h3>
              <p>Hasar bildiriminiz bulunmamaktadır.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );



  const renderDashboardContent = () => (
    <div className="dashboard-content">
      <div className="section-header">
        <h2>Genel Bakış</h2>
        <p>Poliçe ve ödeme durumlarınız</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card primary">
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
            <div className="stat-number">{stats.total_policies}</div>
            <small>Tüm poliçeleriniz</small>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
              <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
              <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
              <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Aktif Poliçe</h3>
            <div className="stat-number">{stats.active_policies}</div>
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
            <h3>Bekleyen Ödeme</h3>
            <div className="stat-number">{stats.pending_payments}</div>
            <small>Ödenmesi gereken</small>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Toplam Ödeme</h3>
            <div className="stat-number">{stats.total_payments}</div>
            <small>Yapılan ödemeler</small>
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
            <div className="stat-number">{stats.pending_claims}</div>
            <small>Açık dosyalar</small>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Toplam Hasar</h3>
            <div className="stat-number">{stats.total_claims}</div>
            <small>Tüm dosyalar</small>
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Bekleyen Teklif</h3>
            <div className="stat-number">{stats.pending_offers}</div>
            <small>Onay bekleyen teklifler</small>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22,4 12,14.01 9,11.01"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Onaylanan Teklif</h3>
            <div className="stat-number">{stats.accepted_offers}</div>
            <small>Kabul edilen teklifler</small>
          </div>
        </div>
      </div>

      <div className="dashboard-sections-container">
        <div className="dashboard-sections">
          <div className="recent-activity">
            <h3>Son Aktiviteler</h3>
            <div className="activity-list-container">
              {stats.recent_activities && stats.recent_activities.length > 0 ? (
                <div className="activity-list">
                  {stats.recent_activities.map((activity: any, index: number) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        {activity.tip === "Poliçe" ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                          </svg>
                        ) : activity.tip === "Ödeme" ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                          </svg>
                        ) : activity.tip === "Hasar" ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        ) : activity.tip === "Teklif" ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="activity-info">
                        <div className="activity-user">{activity.aciklama}</div>
                        <div className="activity-time">
                          {new Date(activity.tarih).toLocaleDateString('tr-TR')} - 
                          {activity.tutar ? ` ${activity.tutar.toLocaleString('tr-TR')} ₺` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-activity">
                  <div className="no-activity-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                  </div>
                  <p>Henüz aktivite bulunmuyor</p>
                  <small>Poliçe işlemleriniz burada görünecek</small>
                </div>
              )}
            </div>
          </div>

          <div className="role-distribution">
            <h3>Finansal Özet</h3>
            <div className="role-list-container">
              <div className="role-list">
                <div className="role-item">
                  <span className="role-name">Toplam Prim</span>
                  <span className="role-count">{stats.total_prim?.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="role-item">
                  <span className="role-name">Toplam Ödenen</span>
                  <span className="role-count">{stats.total_paid?.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="role-item">
                  <span className="role-name">Bu Ay Ödenen</span>
                  <span className="role-count">{stats.this_month_payments?.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="role-item">
                  <span className="role-name">Toplam Hasar Tutarı</span>
                  <span className="role-count">{stats.total_claims_amount?.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="role-item">
                  <span className="role-name">Bu Ay Hasar</span>
                  <span className="role-count">{stats.this_month_claims}</span>
                </div>
                <div className="role-item">
                  <span className="role-name">Reddedilen Teklif</span>
                  <span className="role-count">{stats.rejected_offers}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Hızlı İşlemler</h3>
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => setShowEditProfileModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profil Güncelle
          </button>
          <button className="action-btn success" onClick={() => setActiveTab('poliseler')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Poliçelerim
          </button>
          <button className="action-btn warning" onClick={() => setActiveTab('teklifler')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Tekliflerim
          </button>
          <button className="action-btn info" onClick={() => setShowPasswordModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Şifre Değiştir
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'teklifler':
        return renderTekliflerContent();
      case 'poliseler':
        return renderPoliselerContent();
      case 'hasarlar':
        return renderHasarlarContent();
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="kullanici-dashboard">
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
                className={`nav-btn ${activeTab === 'teklifler' ? 'active' : ''}`}
                onClick={() => setActiveTab('teklifler')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                Teklifler
              </button>
              <button 
                className={`nav-btn ${activeTab === 'poliseler' ? 'active' : ''}`}
                onClick={() => setActiveTab('poliseler')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"></path>
                  <path d="M21 12c-1 0-2-.4-2-1s1-2 2-2 2 1 2 2-1 1-2 1z"></path>
                  <path d="M3 12c1 0 2-.4 2-1s-1-2-2-2-2 1-2 2 1 1 2 1z"></path>
                  <path d="M12 3c0 1-.4 2-1 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
                  <path d="M12 21c0-1-.4-2-1-2s-2 1-2 2 1 2 2 2 2-1 2-2z"></path>
                </svg>
                Poliçelerim
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
            </nav>
          </div>
          <div className="user-info">
            <div className="user-details" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
              <span className="user-name">{user?.ad} {user?.soyad}</span>
              <span className="user-role">Müşteri</span>
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

      {/* Teklif Detay Modal */}
      {showTeklifModal && selectedTeklif && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Teklif Detayları - {selectedTeklif.teklif_no}</h3>
              <button className="modal-close" onClick={() => setShowTeklifModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="teklif-detay">
                <div className="detay-section">
                  <h4>Genel Bilgiler</h4>
                  <div className="detay-grid">
                    <div className="detay-item">
                      <span className="label">Poliçe Türü:</span>
                      <span className="value">{selectedTeklif.police_turu_adi}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Sigorta Şirketi:</span>
                      <span className="value">{selectedTeklif.sigorta_sirketi_adi}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Teklif Tarihi:</span>
                      <span className="value">{new Date(selectedTeklif.teklif_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="detay-item">
                      <span className="label">Geçerlilik Tarihi:</span>
                      <span className="value">{new Date(selectedTeklif.gecerlilik_tarihi).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                <div className="detay-section">
                  <h4>Teminatlar</h4>
                  <div className="teminatlar-list">
                    {selectedTeklif.teminatlar.map((teminat) => (
                      <div key={teminat.teminat_id} className="teminat-item">
                        <div className="teminat-header">
                          <span className="teminat-adi">{teminat.teminat_adi}</span>
                          <span className="teminat-kod">({teminat.teminat_kodu})</span>
                        </div>
                        <div className="teminat-detay">
                          <span className="limit">Limit: ₺{teminat.limit.toLocaleString('tr-TR')}</span>
                          <span className="prim">Prim: ₺{teminat.prim.toLocaleString('tr-TR')}</span>
                        </div>
                        {teminat.aciklama && (
                          <div className="teminat-aciklama">{teminat.aciklama}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detay-section">
                  <h4>Fiyat Detayları</h4>
                  <div className="fiyat-detay">
                    <div className="fiyat-item">
                      <span className="label">Brüt Prim:</span>
                      <span className="value">₺{selectedTeklif.brut_prim.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="fiyat-item">
                      <span className="label">Vergi (%21):</span>
                      <span className="value">₺{selectedTeklif.vergi_tutari.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="fiyat-item">
                      <span className="label">Komisyon:</span>
                      <span className="value">₺{selectedTeklif.komisyon_tutari.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="fiyat-item total">
                      <span className="label">Toplam Tutar:</span>
                      <span className="value">₺{selectedTeklif.toplam_tutar.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                {selectedTeklif.notlar && (
                  <div className="detay-section">
                    <h4>Notlar</h4>
                    <div className="notlar">{selectedTeklif.notlar}</div>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowTeklifModal(false)}>
                    Kapat
                  </button>
                  {selectedTeklif.durum_id === 1 && selectedTeklif.gecerlilik_durumu && (
                    <button
                      className="btn btn-success"
                                             onClick={() => {
                         setOnayForm({
                           onaylandi: true,
                           red_nedeni: '',
                           odeme_yontemi: 'NAKIT',
                           taksit_sayisi: 1,
                           kart_sahibi: '',
                           kart_numarasi: '',
                           son_kullanma_ayi: '',
                           son_kullanma_yili: '',
                           cvv: '',
                           banka_adi: '',
                           hesap_sahibi: '',
                           iban: ''
                         });
                         setShowOnayModal(true);
                       }}
                    >
                      Teklifi Onayla
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onay Modal */}
      {showOnayModal && selectedTeklif && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Teklif Onaylama</h3>
              <button className="modal-close" onClick={() => setShowOnayModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="onay-form">
                <div className="form-group">
                  <label>Onay Durumu</label>
                  <select
                    value={onayForm.onaylandi ? 'true' : 'false'}
                    onChange={(e) => setOnayForm({ ...onayForm, onaylandi: e.target.value === 'true' })}
                  >
                    <option value="true">Teklifi Onayla</option>
                    <option value="false">Teklifi Reddet</option>
                  </select>
                </div>

                {!onayForm.onaylandi && (
                  <div className="form-group">
                    <label>Red Nedeni</label>
                    <textarea
                      value={onayForm.red_nedeni}
                      onChange={(e) => setOnayForm({ ...onayForm, red_nedeni: e.target.value })}
                      placeholder="Red nedenini belirtiniz..."
                      rows={3}
                      required
                    />
                  </div>
                )}

                {onayForm.onaylandi && (
                  <>
                    <div className="form-group">
                      <label>Ödeme Yöntemi</label>
                      <select
                        value={onayForm.odeme_yontemi}
                        onChange={(e) => {
                          const yeniOdemeYontemi = e.target.value;
                          setOnayForm({ 
                            ...onayForm, 
                            odeme_yontemi: yeniOdemeYontemi,
                            // Nakit ve Havale için taksit sayısını 1 yap
                            taksit_sayisi: yeniOdemeYontemi === 'KREDI_KARTI' ? onayForm.taksit_sayisi : 1
                          });
                        }}
                      >
                        <option value="NAKIT">Nakit</option>
                        <option value="KREDI_KARTI">Kredi Kartı</option>
                        <option value="HAVALE">Havale/EFT</option>
                      </select>
                    </div>

                    {onayForm.odeme_yontemi === 'KREDI_KARTI' && (
                      <div className="odeme-detay">
                        <h4>Kredi Kartı Bilgileri</h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Kart Sahibi</label>
                            <input
                              type="text"
                              value={onayForm.kart_sahibi}
                              onChange={(e) => setOnayForm({ ...onayForm, kart_sahibi: e.target.value })}
                              placeholder="Kart sahibinin adı soyadı"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Kart Numarası</label>
                            <input
                              type="text"
                              value={onayForm.kart_numarasi}
                              onChange={(e) => setOnayForm({ ...onayForm, kart_numarasi: e.target.value })}
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                              required
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Son Kullanma Ayı</label>
                            <select
                              value={onayForm.son_kullanma_ayi}
                              onChange={(e) => setOnayForm({ ...onayForm, son_kullanma_ayi: e.target.value })}
                              required
                            >
                              <option value="">Ay Seçin</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                                  {(i + 1).toString().padStart(2, '0')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Son Kullanma Yılı</label>
                            <select
                              value={onayForm.son_kullanma_yili}
                              onChange={(e) => setOnayForm({ ...onayForm, son_kullanma_yili: e.target.value })}
                              required
                            >
                              <option value="">Yıl Seçin</option>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() + i;
                                return (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>CVV</label>
                            <input
                              type="text"
                              value={onayForm.cvv}
                              onChange={(e) => setOnayForm({ ...onayForm, cvv: e.target.value })}
                              placeholder="123"
                              maxLength={4}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {onayForm.odeme_yontemi === 'HAVALE' && (
                      <div className="odeme-detay">
                        <h4>Havale/EFT Bilgileri</h4>
                        <div className="form-group">
                          <label>Banka Adı</label>
                          <select
                            value={onayForm.banka_adi}
                            onChange={(e) => setOnayForm({ ...onayForm, banka_adi: e.target.value })}
                            required
                          >
                            <option value="">Banka Seçin</option>
                            <option value="Ziraat Bankası">Ziraat Bankası</option>
                            <option value="İş Bankası">İş Bankası</option>
                            <option value="Garanti BBVA">Garanti BBVA</option>
                            <option value="Yapı Kredi">Yapı Kredi</option>
                            <option value="Akbank">Akbank</option>
                            <option value="VakıfBank">VakıfBank</option>
                            <option value="Halkbank">Halkbank</option>
                            <option value="QNB Finansbank">QNB Finansbank</option>
                            <option value="Denizbank">Denizbank</option>
                            <option value="TEB">TEB</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Hesap Sahibi</label>
                          <input
                            type="text"
                            value={onayForm.hesap_sahibi}
                            onChange={(e) => setOnayForm({ ...onayForm, hesap_sahibi: e.target.value })}
                            placeholder="Hesap sahibinin adı soyadı"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>IBAN</label>
                          <input
                            type="text"
                            value={onayForm.iban}
                            onChange={(e) => setOnayForm({ ...onayForm, iban: e.target.value })}
                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                            maxLength={32}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {onayForm.odeme_yontemi === 'KREDI_KARTI' && (
                      <div className="form-group">
                        <label>Taksit Sayısı</label>
                        <select
                          value={onayForm.taksit_sayisi}
                          onChange={(e) => setOnayForm({ ...onayForm, taksit_sayisi: parseInt(e.target.value) })}
                        >
                          <option value={1}>Peşin</option>
                          <option value={3}>3 Taksit</option>
                          <option value={6}>6 Taksit</option>
                          <option value={12}>12 Taksit</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowOnayModal(false)}>
                    İptal
                  </button>
                  <button className="btn btn-primary" onClick={handleTeklifOnay}>
                    {onayForm.onaylandi ? 'Onayla' : 'Reddet'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profil Düzenleme Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Profil Bilgilerini Düzenle</h3>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-section">
                <h4>Temel Bilgiler</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad:</label>
                    <input
                      type="text"
                      value={profileForm.ad}
                      onChange={(e) => setProfileForm({ ...profileForm, ad: e.target.value })}
                      placeholder="Adınızı giriniz"
                    />
                  </div>
                  <div className="form-group">
                    <label>Soyad:</label>
                    <input
                      type="text"
                      value={profileForm.soyad}
                      onChange={(e) => setProfileForm({ ...profileForm, soyad: e.target.value })}
                      placeholder="Soyadınızı giriniz"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Telefon:</label>
                    <input
                      type="tel"
                      value={profileForm.telefon}
                      onChange={(e) => setProfileForm({ ...profileForm, telefon: e.target.value })}
                      placeholder="5XXXXXXXXX"
                    />
                  </div>
                  <div className="form-group">
                    <label>Meslek:</label>
                    <input
                      type="text"
                      value={profileForm.meslek}
                      onChange={(e) => setProfileForm({ ...profileForm, meslek: e.target.value })}
                      placeholder="Mesleğinizi giriniz"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Aylık Gelir (₺):</label>
                    <input
                      type="number"
                      value={profileForm.aylikGelir}
                      onChange={(e) => setProfileForm({ ...profileForm, aylikGelir: e.target.value })}
                      placeholder="Aylık gelirinizi giriniz"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Adres Bilgileri</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>İl:</label>
                    <input
                      type="text"
                      value={profileForm.adresIl}
                      onChange={(e) => setProfileForm({ ...profileForm, adresIl: e.target.value })}
                      placeholder="İl adını giriniz"
                    />
                  </div>
                  <div className="form-group">
                    <label>İlçe:</label>
                    <input
                      type="text"
                      value={profileForm.adresIlce}
                      onChange={(e) => setProfileForm({ ...profileForm, adresIlce: e.target.value })}
                      placeholder="İlçe adını giriniz"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Mahalle:</label>
                    <input
                      type="text"
                      value={profileForm.adresMahalle}
                      onChange={(e) => setProfileForm({ ...profileForm, adresMahalle: e.target.value })}
                      placeholder="Mahalle adını giriniz"
                    />
                  </div>
                  <div className="form-group">
                    <label>Posta Kodu:</label>
                    <input
                      type="text"
                      value={profileForm.postaKodu}
                      onChange={(e) => setProfileForm({ ...profileForm, postaKodu: e.target.value })}
                      placeholder="Posta kodunu giriniz"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Açık Adres:</label>
                  <textarea
                    value={profileForm.adresDetay}
                    onChange={(e) => setProfileForm({ ...profileForm, adresDetay: e.target.value })}
                    placeholder="Sokak, cadde, bina no, daire no vb."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                  İptal
                </button>
                <button className="btn btn-primary" onClick={handleProfileUpdate}>
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profil Modal */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Profil Bilgileri</h3>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="profile-form">
                <div className="form-section">
                  <h4>Temel Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ad:</label>
                      <input
                        type="text"
                        value={user?.ad || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Soyad:</label>
                      <input
                        type="text"
                        value={user?.soyad || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>E-posta:</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Telefon:</label>
                      <input
                        type="tel"
                        value={user?.telefon || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Kimlik Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>TC Kimlik No:</label>
                      <input
                        type="text"
                        value={user?.tcKimlikNo || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Doğum Tarihi:</label>
                      <input
                        type="date"
                        value={user?.dogumTarihi || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Kişisel Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cinsiyet:</label>
                      <input
                        type="text"
                        value={user?.cinsiyet === 1 ? 'Erkek' : 'Kadın'}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Medeni Durum:</label>
                      <input
                        type="text"
                        value={
                          user?.medeniDurum === 1 ? 'Bekar' :
                          user?.medeniDurum === 2 ? 'Evli' :
                          user?.medeniDurum === 3 ? 'Boşanmış' : ''
                        }
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Eğitim Durumu:</label>
                      <input
                        type="text"
                        value={
                          user?.egitimDurumu === 1 ? 'İlkokul' :
                          user?.egitimDurumu === 2 ? 'Ortaokul' :
                          user?.egitimDurumu === 3 ? 'Lise' :
                          user?.egitimDurumu === 4 ? 'Üniversite' :
                          user?.egitimDurumu === 5 ? 'Yüksek Lisans' :
                          user?.egitimDurumu === 6 ? 'Doktora' : ''
                        }
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Müşteri Tipi:</label>
                      <input
                        type="text"
                        value="Bireysel"
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Ekonomik Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Meslek:</label>
                      <input
                        type="text"
                        value={user?.meslek || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Aylık Gelir (₺):</label>
                      <input
                        type="text"
                        value={user?.aylikGelir ? `₺${user.aylikGelir.toLocaleString('tr-TR')}` : ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Adres Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>İl:</label>
                      <input
                        type="text"
                        value={user?.adresIl || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>İlçe:</label>
                      <input
                        type="text"
                        value={user?.adresIlce || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mahalle:</label>
                      <input
                        type="text"
                        value={user?.adresMahalle || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Posta Kodu:</label>
                      <input
                        type="text"
                        value={user?.postaKodu || ''}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Açık Adres:</label>
                    <textarea
                      value={user?.adresDetay || ''}
                      disabled
                      className="disabled-input"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Kapat
                </button>
                <button className="btn btn-primary" onClick={handleEditProfileOpen}>
                  Düzenle
                </button>
                <button className="btn btn-warning" onClick={() => setShowPasswordModal(true)}>
                  Şifre Değiştir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profil Düzenleme Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Profil Bilgilerini Düzenle</h3>
              <button className="modal-close" onClick={() => setShowEditProfileModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="profile-form">
                <div className="form-section">
                  <h4>Temel Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ad:</label>
                      <input
                        type="text"
                        value={profileForm.ad}
                        onChange={(e) => setProfileForm({ ...profileForm, ad: e.target.value })}
                        placeholder="Adınızı giriniz"
                      />
                    </div>
                    <div className="form-group">
                      <label>Soyad:</label>
                      <input
                        type="text"
                        value={profileForm.soyad}
                        onChange={(e) => setProfileForm({ ...profileForm, soyad: e.target.value })}
                        placeholder="Soyadınızı giriniz"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Telefon:</label>
                      <input
                        type="tel"
                        value={profileForm.telefon}
                        onChange={(e) => setProfileForm({ ...profileForm, telefon: e.target.value })}
                        placeholder="Telefon numaranızı giriniz"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Ekonomik Bilgiler</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Meslek:</label>
                      <input
                        type="text"
                        value={profileForm.meslek}
                        onChange={(e) => setProfileForm({ ...profileForm, meslek: e.target.value })}
                        placeholder="Mesleğinizi giriniz"
                      />
                    </div>
                    <div className="form-group">
                      <label>Aylık Gelir (₺):</label>
                      <input
                        type="number"
                        value={profileForm.aylikGelir}
                        onChange={(e) => setProfileForm({ ...profileForm, aylikGelir: e.target.value })}
                        placeholder="Aylık gelirinizi giriniz"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Adres Bilgileri</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>İl:</label>
                      <select
                        value={selectedIl}
                        onChange={(e) => handleIlChange(e.target.value)}
                      >
                        <option value="">İl seçiniz</option>
                        {iller.map((il) => (
                          <option key={il.ilId} value={il.ilAdi}>
                            {il.ilAdi}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>İlçe:</label>
                      <select
                        value={selectedIlce}
                        onChange={(e) => handleIlceChange(e.target.value)}
                        disabled={!selectedIl}
                      >
                        <option value="">İlçe seçiniz</option>
                        {ilceler.map((ilce, index) => (
                          <option key={index} value={ilce.ilceAdi}>
                            {ilce.ilceAdi}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mahalle:</label>
                      <select
                        value={selectedMahalle}
                        onChange={(e) => handleMahalleChange(e.target.value)}
                        disabled={!selectedIlce}
                      >
                        <option value="">Mahalle seçiniz</option>
                        {mahalleler.map((mahalle, index) => (
                          <option key={index} value={mahalle.mahalleAdi}>
                            {mahalle.mahalleAdi}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Posta Kodu:</label>
                      <input
                        type="text"
                        value={profileForm.postaKodu}
                        onChange={(e) => setProfileForm({ ...profileForm, postaKodu: e.target.value })}
                        placeholder="Posta kodunu giriniz"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Açık Adres:</label>
                    <textarea
                      value={profileForm.adresDetay}
                      onChange={(e) => setProfileForm({ ...profileForm, adresDetay: e.target.value })}
                      placeholder="Sokak, cadde, bina no, daire no vb."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowEditProfileModal(false)}>
                  İptal
                </button>
                <button className="btn btn-primary" onClick={handleProfileUpdate} disabled={loading}>
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hasar Bildirim Modal */}
      {showHasarBildirimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yeni Hasar Bildirimi</h3>
              <button className="modal-close" onClick={() => setShowHasarBildirimModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hasar-bildirim-form">
                <div className="form-section">
                  <h4>Hasar Bilgileri</h4>
                  <div className="form-group">
                    <label>Poliçe Seçin:</label>
                    <select
                      value={hasarBildirimForm.police_id}
                      onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, police_id: parseInt(e.target.value) })}
                      required
                    >
                      <option value={0}>Poliçe seçiniz</option>
                      {poliseler.map((police) => (
                        <option key={police.id} value={police.id}>
                          {police.police_no} - {police.police_turu_adi}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Olay Tarihi:</label>
                    <input
                      type="date"
                      value={hasarBildirimForm.olay_tarihi}
                      onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, olay_tarihi: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Olay Yeri:</label>
                    <input
                      type="text"
                                      value={hasarBildirimForm.olay_yeri_detay}
                onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, olay_yeri_detay: e.target.value })}
                      placeholder="Olayın gerçekleştiği yer"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Olay Açıklaması:</label>
                    <textarea
                      value={hasarBildirimForm.olay_aciklamasi}
                      onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, olay_aciklamasi: e.target.value })}
                      placeholder="Olayı detaylı olarak açıklayın"
                      rows={4}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Talep Edilen Tutar (₺):</label>
                    <input
                      type="number"
                      value={hasarBildirimForm.talep_edilen_tutar}
                      onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, talep_edilen_tutar: e.target.value })}
                      placeholder="Talep ettiğiniz tutar"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Ek Notlar:</label>
                    <textarea
                      value={hasarBildirimForm.notlar}
                      onChange={(e) => setHasarBildirimForm({ ...hasarBildirimForm, notlar: e.target.value })}
                      placeholder="Ek bilgiler, belgeler vb."
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Dosya Ekle:</label>
                    <div 
                      className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const files = Array.from(e.dataTransfer.files);
                        setSelectedFiles(prev => [...prev, ...files]);
                      }}
                    >
                      <div className="file-upload-content">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Dosyaları buraya sürükleyin veya tıklayın</p>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setSelectedFiles(prev => [...prev, ...files]);
                          }}
                          style={{ display: 'none' }}
                          id="file-input"
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline"
                          onClick={() => document.getElementById('file-input')?.click()}
                        >
                          Dosya Seç
                        </button>
                      </div>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="selected-files">
                        <h5>Seçilen Dosyalar:</h5>
                        <ul>
                          {selectedFiles.map((file, index) => (
                            <li key={index}>
                              <span>{file.name}</span>
                              <button 
                                type="button" 
                                className="btn-remove-file"
                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowHasarBildirimModal(false)}>
                  İptal
                </button>
                <button className="btn btn-primary" onClick={handleHasarBildirim} disabled={loading}>
                  {loading ? 'Gönderiliyor...' : 'Hasar Bildirimi Gönder'}
                </button>
              </div>
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
                </div>
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

      {/* Şifre Değiştirme Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Şifre Değiştir</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="password-form">
                <div className="form-section">
                  <h4>Şifre Bilgileri</h4>
                  <div className="form-group">
                    <label>Mevcut Şifre:</label>
                    <input
                      type="password"
                      value={passwordForm.eski_sifre}
                      onChange={(e) => setPasswordForm({ ...passwordForm, eski_sifre: e.target.value })}
                      placeholder="Mevcut şifrenizi giriniz"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Yeni Şifre:</label>
                    <input
                      type="password"
                      value={passwordForm.yeni_sifre}
                      onChange={(e) => setPasswordForm({ ...passwordForm, yeni_sifre: e.target.value })}
                      placeholder="Yeni şifrenizi giriniz (en az 6 karakter)"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Yeni Şifre (Tekrar):</label>
                    <input
                      type="password"
                      value={passwordForm.yeni_sifre_tekrar}
                      onChange={(e) => setPasswordForm({ ...passwordForm, yeni_sifre_tekrar: e.target.value })}
                      placeholder="Yeni şifrenizi tekrar giriniz"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  İptal
                </button>
                <button className="btn btn-warning" onClick={handlePasswordChange} disabled={loading}>
                  {loading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="dashboard-footer">
        <p>© 2025 Mert Kan - AdaYazılım Staj Projesi. Tüm hakları saklıdır. | <a href="mailto:mrttkan@gmail.com">mrttkan@gmail.com</a></p>
      </footer>
    </div>
  );
};

export default KullaniciDashboard; 