import React, { useState, useEffect } from 'react';
import { addressApiService, Il, Ilce, Mahalle, Sokak } from '../utils/addressApi';
import './AddressSelector.css';

interface AddressSelectorProps {
  selectedIl: string;
  selectedIlce: string;
  selectedMahalle: string;
  selectedSokak: string;
  onIlChange: (il: string) => void;
  onIlceChange: (ilce: string) => void;
  onMahalleChange: (mahalle: string) => void;
  onSokakChange: (sokak: string) => void;
  disabled?: boolean;
  showSokak?: boolean;
  ilError?: string | null;
  ilceError?: string | null;
  mahalleError?: string | null;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedIl,
  selectedIlce,
  selectedMahalle,
  selectedSokak,
  onIlChange,
  onIlceChange,
  onMahalleChange,
  onSokakChange,
  disabled = false,
  showSokak = true,
  ilError = null,
  ilceError = null,
  mahalleError = null
}) => {
  const [iller, setIller] = useState<Il[]>([]);
  const [ilceler, setIlceler] = useState<Ilce[]>([]);
  

  const [mahalleler, setMahalleler] = useState<Mahalle[]>([]);
  const [sokaklar, setSokaklar] = useState<Sokak[]>([]);
  const [loading, setLoading] = useState({
    iller: false,
    ilceler: false,
    mahalleler: false,
    sokaklar: false
  });

  // İlleri yükle
  useEffect(() => {
    const loadIller = async () => {
      setLoading(prev => ({ ...prev, iller: true }));
      try {
        const data = await addressApiService.getIller();
        setIller(data);
      } catch (error) {
        console.error('İller yüklenirken hata:', error);
      } finally {
        setLoading(prev => ({ ...prev, iller: false }));
      }
    };

    loadIller();
  }, []);

  // İl değiştiğinde ilçeleri yükle
  useEffect(() => {
    if (selectedIl) {
      const loadIlceler = async () => {
        setLoading(prev => ({ ...prev, ilceler: true }));
                                   try {
            const data = await addressApiService.getIlceler(selectedIl);
            setIlceler(data);
         // İl değiştiğinde alt seçimleri sıfırla
         onIlceChange('');
         onMahalleChange('');
         onSokakChange('');
         setMahalleler([]);
         setSokaklar([]);
       } catch (error) {
         console.error('İlçeler yüklenirken hata:', error);
       } finally {
         setLoading(prev => ({ ...prev, ilceler: false }));
       }
      };

      loadIlceler();
    } else {
      setIlceler([]);
      setMahalleler([]);
      setSokaklar([]);
    }
     }, [selectedIl]);

  // İlçe değiştiğinde mahalleleri yükle
  useEffect(() => {
    if (selectedIl && selectedIlce) {
      const loadMahalleler = async () => {
        setLoading(prev => ({ ...prev, mahalleler: true }));
        try {
          const data = await addressApiService.getMahalleler(selectedIl, selectedIlce);
          setMahalleler(data);
          // İlçe değiştiğinde alt seçimleri sıfırla
          onMahalleChange('');
          onSokakChange('');
          setSokaklar([]);
        } catch (error) {
          console.error('Mahalleler yüklenirken hata:', error);
        } finally {
          setLoading(prev => ({ ...prev, mahalleler: false }));
        }
      };

      loadMahalleler();
    } else {
      setMahalleler([]);
      setSokaklar([]);
    }
     }, [selectedIl, selectedIlce]);

    // Mahalle değiştiğinde sokakları yükle - Şimdilik devre dışı
  // useEffect(() => {
  //   if (selectedIl && selectedMahalle && showSokak) {
  //     const loadSokaklar = async () => {
  //       setLoading(prev => ({ ...prev, sokaklar: true }));
  //       try {
  //         const ilKodu = await addressApiService.getIlKodu(selectedIl);
  //         if (ilKodu) {
  //           const data = await addressApiService.getSokaklar(ilKodu, selectedMahalle);
  //           setSokaklar(data);
  //           onSokakChange('');
  //         }
  //       } catch (error) {
  //         console.error('Sokaklar yüklenirken hata:', error);
  //       } finally {
  //         setLoading(prev => ({ ...prev, sokaklar: false }));
  //       }
  //     };
  //     loadSokaklar();
  //   } else {
  //     setSokaklar([]);
  //   }
  // }, [selectedIl, selectedMahalle, showSokak]);

  const handleIlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onIlChange(e.target.value);
  };

  const handleIlceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onIlceChange(e.target.value);
  };

  const handleMahalleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMahalleChange(e.target.value);
  };

  const handleSokakChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSokakChange(e.target.value);
  };

  return (
    <div className="address-selector">
      <div className="form-row">
        <div className="form-group">
          <label>İl *</label>
          <select
            value={selectedIl}
            onChange={handleIlChange}
            disabled={disabled || loading.iller}
            required
            className={ilError ? 'error' : ''}
          >
            <option value="">İl Seçiniz</option>
                         {iller.map((il) => (
               <option key={`il-${il.ilId}`} value={il.ilAdi}>
                 {il.ilAdi}
               </option>
             ))}
          </select>
          {loading.iller && <small className="loading-text">İller yükleniyor...</small>}
          {ilError && <span className="error-text">{ilError}</span>}
        </div>

        <div className="form-group">
          <label>İlçe *</label>
          <select
            value={selectedIlce}
            onChange={handleIlceChange}
            disabled={disabled || !selectedIl || loading.ilceler}
            required
            className={ilceError ? 'error' : ''}
          >
            <option value="">İlçe Seçiniz</option>
                                      {ilceler.map((ilce, index) => (
                <option key={`ilce-${index}`} value={ilce.ilceAdi}>
                  {ilce.ilceAdi}
                </option>
              ))}
          </select>
          {loading.ilceler && <small className="loading-text">İlçeler yükleniyor...</small>}
          {ilceError && <span className="error-text">{ilceError}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Mahalle *</label>
          <select
            value={selectedMahalle}
            onChange={handleMahalleChange}
            disabled={disabled || !selectedIlce || loading.mahalleler}
            required
            className={mahalleError ? 'error' : ''}
          >
            <option value="">Mahalle Seçiniz</option>
                                      {mahalleler.map((mahalle, index) => (
                <option key={`mahalle-${index}`} value={mahalle.mahalleAdi}>
                  {mahalle.mahalleAdi}
                </option>
              ))}
          </select>
          {loading.mahalleler && <small className="loading-text">Mahalleler yükleniyor...</small>}
          {mahalleError && <span className="error-text">{mahalleError}</span>}
        </div>

                 {/* Sokak seçimi şimdilik devre dışı */}
         {/* {showSokak && (
           <div className="form-group">
             <label>Sokak</label>
             <select
               value={selectedSokak}
               onChange={handleSokakChange}
               disabled={disabled || !selectedMahalle || loading.sokaklar}
             >
               <option value="">Sokak Seçiniz (Opsiyonel)</option>
               {sokaklar.map((sokak, index) => (
                 <option key={`sokak-${index}`} value={sokak.sokakAdi}>
                   {sokak.sokakAdi}
                 </option>
               ))}
             </select>
             {loading.sokaklar && <small className="loading-text">Sokaklar yükleniyor...</small>}
           </div>
         )} */}
      </div>
    </div>
  );
};

export default AddressSelector;
