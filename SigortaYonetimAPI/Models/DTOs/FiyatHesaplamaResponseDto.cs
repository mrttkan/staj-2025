namespace SigortaYonetimAPI.Models.DTOs
{
    public class FiyatHesaplamaResponseDto
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        
        // Fiyat hesaplama sonuçları
        public decimal TemelPrim { get; set; }
        public decimal TeminatPrimi { get; set; }
        public decimal VergiTutari { get; set; }
        public decimal ToplamPrim { get; set; } // Müşteriye gösterilecek tutar
        public decimal KomisyonTutari { get; set; } // Sadece admin/acente görür
        public decimal KomisyonOrani { get; set; } // Komisyon oranı (0.05 = %5)
        public decimal NetPrim { get; set; } // Admin/Acente için net tutar
        public decimal MusteriToplamTutar { get; set; } // Müşteriye gösterilecek tutar
        public decimal AdminNetTutar { get; set; } // Admin/Acente için net tutar
        
        // Teminat detayları
        public List<FiyatTeminatDetayDto> TeminatDetaylari { get; set; } = new List<FiyatTeminatDetayDto>();
        
        // Hesaplama detayları
        public string HesaplamaDetaylari { get; set; } = string.Empty;
        public DateTime HesaplamaTarihi { get; set; } = DateTime.Now;
        
        // Geçerlilik
        public DateTime GecerlilikBaslangici { get; set; }
        public DateTime GecerlilikBitisi { get; set; }
    }
    
    public class FiyatTeminatDetayDto
    {
        public int TeminatId { get; set; }
        public string TeminatAdi { get; set; } = string.Empty;
        public string TeminatKodu { get; set; } = string.Empty;
        public bool DahilMi { get; set; }
        public decimal Limit { get; set; }
        public string Birim { get; set; } = string.Empty;
        public decimal Prim { get; set; }
        public decimal Muafiyet { get; set; }
        public string Aciklama { get; set; } = string.Empty;
    }
}
