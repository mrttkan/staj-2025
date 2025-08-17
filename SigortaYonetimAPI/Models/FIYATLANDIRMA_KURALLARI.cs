using System;
using System.Collections.Generic;

namespace SigortaYonetimAPI.Models;

public partial class FIYATLANDIRMA_KURALLARI
{
    public int id { get; set; }

    public int police_turu_id { get; set; }

    public string kural_adi { get; set; } = null!;

    public string kural_tipi { get; set; } = null!; // "YAS", "CINSIYET", "MESLEK", "IL", "ARAC_MODELI" vs.

    public string kosul { get; set; } = null!; // JSON format

    public string islem_tipi { get; set; } = null!; // "CARPAN", "EKLEME", "CIKARTMA", "YUZDE"

    public decimal deger { get; set; }

    public decimal? min_deger { get; set; }

    public decimal? max_deger { get; set; }

    public int oncelik { get; set; }

    public bool aktif_mi { get; set; }

    public DateTime olusturma_tarihi { get; set; }

    public DateTime guncelleme_tarihi { get; set; }

    public virtual POLICE_TURLERI police_turu { get; set; } = null!;
}

