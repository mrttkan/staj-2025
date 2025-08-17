using System;
using System.Collections.Generic;

namespace SigortaYonetimAPI.Models;

public partial class TEKLIF_TEMINATLAR
{
    public int id { get; set; }

    public int teklif_id { get; set; }

    public int teminat_id { get; set; }

    public decimal teminat_tutari { get; set; }

    public decimal prim_tutari { get; set; }

    public string? ozel_sartlar { get; set; }

    public bool secili_mi { get; set; }

    public DateTime olusturma_tarihi { get; set; }

    public virtual POLICE_TEKLIFLERI teklif { get; set; } = null!;

    public virtual TEMINATLAR teminat { get; set; } = null!;
}

