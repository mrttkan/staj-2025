using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class TeminatDetayDto
    {
        public int id { get; set; }
        public int police_turu_id { get; set; }
        public string police_turu_adi { get; set; } = string.Empty;
        public string teminat_adi { get; set; } = string.Empty;
        public string teminat_kodu { get; set; } = string.Empty;
        public string? aciklama { get; set; }
        public bool zorunlu_mu { get; set; }
        public decimal? min_teminat_tutari { get; set; }
        public decimal? max_teminat_tutari { get; set; }
        public decimal? varsayilan_teminat_tutari { get; set; }
        public string? hesaplama_turu { get; set; }
        public decimal? prim_orani { get; set; }
        public decimal? sabit_prim { get; set; }
        public bool aktif_mi { get; set; }
        public DateTime olusturma_tarihi { get; set; }
        public DateTime guncelleme_tarihi { get; set; }
    }

    public class TeminatCreateDto
    {
        [Required(ErrorMessage = "Poliçe türü seçimi zorunludur")]
        public int police_turu_id { get; set; }

        [Required(ErrorMessage = "Teminat adı zorunludur")]
        [StringLength(100, ErrorMessage = "Teminat adı en fazla 100 karakter olabilir")]
        public string teminat_adi { get; set; } = string.Empty;

        [Required(ErrorMessage = "Teminat kodu zorunludur")]
        [StringLength(20, ErrorMessage = "Teminat kodu en fazla 20 karakter olabilir")]
        public string teminat_kodu { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Açıklama en fazla 500 karakter olabilir")]
        public string? aciklama { get; set; }

        public bool zorunlu_mu { get; set; } = false;

        [Range(0, double.MaxValue, ErrorMessage = "Minimum teminat tutarı negatif olamaz")]
        public decimal? min_teminat_tutari { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Maksimum teminat tutarı negatif olamaz")]
        public decimal? max_teminat_tutari { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Varsayılan teminat tutarı negatif olamaz")]
        public decimal? varsayilan_teminat_tutari { get; set; }

        [StringLength(20, ErrorMessage = "Hesaplama türü en fazla 20 karakter olabilir")]
        public string? hesaplama_turu { get; set; } = "YUZDE"; // "SABIT", "YUZDE", "KADEMELI"

        [Range(0, 100, ErrorMessage = "Prim oranı 0-100 arasında olmalıdır")]
        public decimal? prim_orani { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Sabit prim negatif olamaz")]
        public decimal? sabit_prim { get; set; }

        public bool aktif_mi { get; set; } = true;
    }

    public class TeminatUpdateDto : TeminatCreateDto
    {
        [Required]
        public int id { get; set; }
    }

    public class TeklifTeminatDto
    {
        public int id { get; set; }
        public int teminat_id { get; set; }
        public string teminat_adi { get; set; } = string.Empty;
        public string teminat_kodu { get; set; } = string.Empty;
        public string? aciklama { get; set; }
        public bool zorunlu_mu { get; set; }
        public decimal teminat_tutari { get; set; }
        public decimal prim_tutari { get; set; }
        public string? ozel_sartlar { get; set; }
        public bool secili_mi { get; set; }
        public string? hesaplama_turu { get; set; }
        public decimal? prim_orani { get; set; }
    }

    public class PoliceTeminatDto
    {
        public int id { get; set; }
        public int teminat_id { get; set; }
        public string teminat_adi { get; set; } = string.Empty;
        public string teminat_kodu { get; set; } = string.Empty;
        public decimal teminat_tutari { get; set; }
        public decimal prim_tutari { get; set; }
        public string? ozel_sartlar { get; set; }
        public bool aktif_mi { get; set; }
    }
}
