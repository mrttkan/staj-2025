using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigortaYonetimAPI.Models;

public partial class HASAR_DOSYA_EKLELERI
{
    public int id { get; set; }
    public int hasar_id { get; set; }
    public string dosya_adi { get; set; } = null!;
    public string dosya_yolu { get; set; } = null!;
    public string dosya_tipi { get; set; } = null!;
    public long dosya_boyutu { get; set; }
    public string? aciklama { get; set; }
    public int yukleyen_kullanici_id { get; set; }
    public DateTime yukleme_tarihi { get; set; }
    
    [ForeignKey("hasar_id")]
    public virtual HASAR_DOSYALAR? hasar { get; set; }
    [ForeignKey("yukleyen_kullanici_id")]
    public virtual KULLANICILAR? yukleyen_kullanici { get; set; }
}
