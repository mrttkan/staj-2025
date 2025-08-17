using System;
using System.Collections.Generic;

namespace SigortaYonetimAPI.Models;

public partial class POLICE_TEMINATLAR
{
    public int id { get; set; }

    public int police_id { get; set; }

    public int teminat_id { get; set; }

    public decimal teminat_tutari { get; set; }

    public decimal prim_tutari { get; set; }

    public string? ozel_sartlar { get; set; }

    public bool aktif_mi { get; set; }

    public DateTime olusturma_tarihi { get; set; }

    public virtual POLISELER police { get; set; } = null!;

    public virtual TEMINATLAR teminat { get; set; } = null!;
}

