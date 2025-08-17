using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class TeklifTeminatRequestDto
    {
        public int TeminatId { get; set; }
        public decimal Limit { get; set; }
        public bool DahilMi { get; set; }
        public string? Aciklama { get; set; }
    }
    
    public class TeklifTeminatUpdateDto
    {
        [Required]
        public int Id { get; set; }
        
        [Required]
        public bool DahilMi { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal Limit { get; set; }
        
        [StringLength(10)]
        public string Birim { get; set; } = "TRY";
        
        [Range(0, double.MaxValue)]
        public decimal Muafiyet { get; set; } = 0;
        
        [Range(0, double.MaxValue)]
        public decimal Prim { get; set; } = 0;
        
        [StringLength(500)]
        public string? Aciklama { get; set; }
        
        public string? EkParametreler { get; set; }
    }
}


