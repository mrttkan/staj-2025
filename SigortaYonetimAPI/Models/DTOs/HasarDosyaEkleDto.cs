using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs;

public class HasarDosyaEkleDto
{
    public int id { get; set; }
    public int hasar_id { get; set; }
    public string dosya_adi { get; set; } = string.Empty;
    public string dosya_yolu { get; set; } = string.Empty;
    public string dosya_tipi { get; set; } = string.Empty;
    public long dosya_boyutu { get; set; }
    public string? aciklama { get; set; }
    public string yukleyen_kullanici_adi { get; set; } = string.Empty;
    public DateTime yukleme_tarihi { get; set; }
}

public class HasarDosyaEkleCreateDto
{
    [Required(ErrorMessage = "Dosya adı zorunludur")]
    public string dosya_adi { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Dosya tipi zorunludur")]
    public string dosya_tipi { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Dosya boyutu zorunludur")]
    public long dosya_boyutu { get; set; }
    
    public string? aciklama { get; set; }
}
