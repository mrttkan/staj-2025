using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class AdminOdemeDto
    {
        [Required]
        public int MusteriId { get; set; }
        
        public string? PoliceNo { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Tutar 0'dan büyük olmalıdır")]
        public decimal Tutar { get; set; }
        
        [Required]
        public DateTime OdemeTarihi { get; set; }
        
        public DateTime? VadeTarihi { get; set; }
        
        public string? OdemeTuru { get; set; }
        
        public string? OdemeYontemiDetay { get; set; }
        
        public string? Aciklama { get; set; }
    }
}
