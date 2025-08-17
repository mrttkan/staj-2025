using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class FiyatHesaplamaRequestDto
    {
        [Required]
        public int PoliceTuruId { get; set; }
        
        [Required]
        public int SigortaSirketiId { get; set; }
        
        [Required]
        public string RiskBilgileri { get; set; } = string.Empty;
        
        [Required]
        public string TeminatBilgileri { get; set; } = string.Empty;
        
        // Opsiyonel müşteri bilgileri
        public int? MusteriId { get; set; }
        
        // Hesaplama parametreleri
        public decimal? TemelPrim { get; set; }
        public decimal? TeminatLimiti { get; set; }
        public string? EkParametreler { get; set; }
    }
}












