using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class HasarListDto
    {
        public int id { get; set; }
        public string dosya_no { get; set; } = string.Empty;
        public string police_no { get; set; } = string.Empty;
        public string musteri_adi { get; set; } = string.Empty;
        public string durum_adi { get; set; } = string.Empty;
        public DateTime olusturma_tarihi { get; set; }
        public decimal? talep_edilen_tutar { get; set; }
        public decimal? onaylanan_tutar { get; set; }
    }

    public class HasarDetayDto
    {
        public int id { get; set; }
        public string dosya_no { get; set; } = string.Empty;
        public int police_id { get; set; }
        public string police_no { get; set; } = string.Empty;
        public int musteri_id { get; set; }
        public string musteri_adi { get; set; } = string.Empty;
        public int durum_id { get; set; }
        public string durum_adi { get; set; } = string.Empty;
        public DateTime olay_tarihi { get; set; }
        public string? olay_yeri_il { get; set; }
        public string? olay_yeri_ilce { get; set; }
        public string? olay_yeri_detay { get; set; }
        public string? olay_aciklamasi { get; set; }
        public decimal? talep_edilen_tutar { get; set; }
        public decimal? onaylanan_tutar { get; set; }
        public string? red_nedeni { get; set; }
        public string? notlar { get; set; }
        public DateTime olusturma_tarihi { get; set; }
        public DateTime guncelleme_tarihi { get; set; }
        public List<HasarNotDto> notlar_listesi { get; set; } = new List<HasarNotDto>();
    }

    public class HasarCreateDto
    {
        [Required(ErrorMessage = "Poliçe seçimi zorunludur")]
        public int police_id { get; set; }

        [Required(ErrorMessage = "Olay tarihi zorunludur")]
        public DateTime olay_tarihi { get; set; }

        [Required(ErrorMessage = "Olay yeri zorunludur")]
        [StringLength(255, ErrorMessage = "Olay yeri en fazla 255 karakter olabilir")]
        public string olay_yeri { get; set; } = string.Empty;

        [Required(ErrorMessage = "Olay açıklaması zorunludur")]
        [StringLength(1000, ErrorMessage = "Olay açıklaması en fazla 1000 karakter olabilir")]
        public string olay_aciklamasi { get; set; } = string.Empty;

        [Range(0, double.MaxValue, ErrorMessage = "Talep edilen tutar negatif olamaz")]
        public decimal? talep_edilen_tutar { get; set; }

        [StringLength(500, ErrorMessage = "Notlar en fazla 500 karakter olabilir")]
        public string? notlar { get; set; }
    }

    public class HasarDurumUpdateDto
    {
        public int durum_id { get; set; }
        public decimal? onaylanan_tutar { get; set; }
        public string? red_nedeni { get; set; }
        public string? notlar { get; set; }
    }

    public class HasarNotDto
    {
        public int id { get; set; }
        public string not_metni { get; set; } = string.Empty;
        public string kullanici_adi { get; set; } = string.Empty;
        public DateTime olusturma_tarihi { get; set; }
    }

    public class HasarNotCreateDto
    {
        [Required(ErrorMessage = "Not metni zorunludur")]
        [StringLength(500, ErrorMessage = "Not metni en fazla 500 karakter olabilir")]
        public string not_metni { get; set; } = string.Empty;
    }
} 