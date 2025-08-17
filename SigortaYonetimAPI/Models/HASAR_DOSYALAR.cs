using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace SigortaYonetimAPI.Models;

public partial class HASAR_DOSYALAR
{
    public int id { get; set; }

    public string hasar_no { get; set; } = null!;

    public string? dosya_no { get; set; }

    public int police_id { get; set; }

    public int musteri_id { get; set; }

    public int bildiren_kullanici_id { get; set; }

    public DateTime olay_tarihi { get; set; }

    public string? olay_yeri_il { get; set; }

    public string? olay_yeri_ilce { get; set; }

    public string? olay_yeri_detay { get; set; }

    public string? olay_aciklamasi { get; set; }

    public int durum_id { get; set; }

    public decimal? talep_edilen_tutar { get; set; }

    public decimal? onaylanan_tutar { get; set; }

    public string? red_nedeni { get; set; }

    public DateTime bildirim_tarihi { get; set; }

    public DateTime guncelleme_tarihi { get; set; }

    public DateTime olusturma_tarihi { get; set; }

    public string? notlar { get; set; }

    public virtual ICollection<HASAR_TAKIP_NOTLARI> HASAR_TAKIP_NOTLARIs { get; set; } = new List<HASAR_TAKIP_NOTLARI>();

    [ForeignKey("bildiren_kullanici_id")]
    public virtual KULLANICILAR? bildiren_kullanici { get; set; }

    [ForeignKey("durum_id")]
    public virtual DURUM_TANIMLARI? durum { get; set; }

    [ForeignKey("musteri_id")]
    public virtual MUSTERILER? musteri { get; set; }

    [ForeignKey("police_id")]
    public virtual POLISELER? police { get; set; }
}
