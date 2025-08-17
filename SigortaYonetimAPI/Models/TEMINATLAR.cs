using System;
using System.Collections.Generic;

namespace SigortaYonetimAPI.Models;

public partial class TEMINATLAR
{
    public int id { get; set; }

    public int police_turu_id { get; set; }

    public string teminat_adi { get; set; } = null!;

    public string teminat_kodu { get; set; } = null!;

    public string? aciklama { get; set; }

    public bool zorunlu_mu { get; set; }

    public decimal? min_teminat_tutari { get; set; }

    public decimal? max_teminat_tutari { get; set; }

    public decimal? varsayilan_teminat_tutari { get; set; }

    public string? hesaplama_turu { get; set; } // "SABIT", "YUZDE", "KADEMELI"

    public decimal? prim_orani { get; set; } // Yüzde olarak

    public decimal? sabit_prim { get; set; } // Sabit prim tutarı

    public bool aktif_mi { get; set; }

    public DateTime olusturma_tarihi { get; set; }

    public DateTime guncelleme_tarihi { get; set; }

    public virtual POLICE_TURLERI police_turu { get; set; } = null!;

    public virtual ICollection<POLICE_TEMINATLAR> POLICE_TEMINATLARs { get; set; } = new List<POLICE_TEMINATLAR>();

    public virtual ICollection<TEKLIF_TEMINATLAR> TEKLIF_TEMINATLARs { get; set; } = new List<TEKLIF_TEMINATLAR>();
}

