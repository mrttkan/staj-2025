using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class MusteriOnayTeklifDto
    {
        [Required]
        public int teklif_id { get; set; }
        
        [Required]
        public bool onaylandi { get; set; }
        
        public string? red_nedeni { get; set; }
        
        public string? odeme_yontemi { get; set; } // "NAKIT", "KREDI_KARTI", "HAVALE"
        
        public int? taksit_sayisi { get; set; }

        // Kredi kartı bilgileri
        public string? kart_sahibi { get; set; }
        public string? kart_numarasi { get; set; }
        public string? son_kullanma_ayi { get; set; }
        public string? son_kullanma_yili { get; set; }
        public string? cvv { get; set; }

        // Havale bilgileri
        public string? banka_adi { get; set; }
        public string? hesap_sahibi { get; set; }
        public string? iban { get; set; }


    }
    
    public class MusteriTeklifListDto
    {
        public int id { get; set; }
        public string teklif_no { get; set; } = string.Empty;
        public string police_turu_adi { get; set; } = string.Empty;
        public string sigorta_sirketi_adi { get; set; } = string.Empty;
        public decimal toplam_tutar { get; set; }
        public DateTime teklif_tarihi { get; set; }
        public DateTime? gecerlilik_tarihi { get; set; }
        public string durum_adi { get; set; } = string.Empty;
        public int durum_id { get; set; }
        public bool gecerlilik_durumu { get; set; } // true: geçerli, false: süresi dolmuş
    }
    
    public class MusteriTeklifDetayDto
    {
        public int id { get; set; }
        public string teklif_no { get; set; } = string.Empty;
        public string police_turu_adi { get; set; } = string.Empty;
        public string sigorta_sirketi_adi { get; set; } = string.Empty;
        public string risk_bilgileri { get; set; } = string.Empty;
        public List<TeklifTeminatDetayDto> teminatlar { get; set; } = new List<TeklifTeminatDetayDto>();
        public decimal brut_prim { get; set; }
        public decimal net_prim { get; set; }
        public decimal komisyon_tutari { get; set; }
        public decimal vergi_tutari { get; set; }
        public decimal toplam_tutar { get; set; }
        public DateTime teklif_tarihi { get; set; }
        public DateTime? gecerlilik_tarihi { get; set; }
        public string durum_adi { get; set; } = string.Empty;
        public int durum_id { get; set; }
        public string? notlar { get; set; }
        public bool gecerlilik_durumu { get; set; }
    }
    
    public class TeklifTeminatDetayDto
    {
        public int teminat_id { get; set; }
        public string teminat_adi { get; set; } = string.Empty;
        public string teminat_kodu { get; set; } = string.Empty;
        public decimal limit { get; set; }
        public decimal prim { get; set; }
        public string? aciklama { get; set; }
        public bool secili_mi { get; set; }
    }
}
