using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigortaYonetimAPI.Models;

public partial class HASAR_TAKIP_NOTLARI
{
    public int id { get; set; }

    public int hasar_id { get; set; }

    public int kullanici_id { get; set; }

    public string not_metni { get; set; } = null!;

    public DateTime olusturma_tarihi { get; set; }

    [ForeignKey("hasar_id")]
    public virtual HASAR_DOSYALAR? hasar { get; set; }

    [ForeignKey("kullanici_id")]
    public virtual KULLANICILAR? kullanici { get; set; }
}
