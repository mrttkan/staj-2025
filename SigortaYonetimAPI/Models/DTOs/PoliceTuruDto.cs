using System;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class PoliceTuruDto
    {
        public int Id { get; set; }
        public string UrunAdi { get; set; } = null!;
        public string UrunKodu { get; set; } = null!;
        public string? Aciklama { get; set; }
        public bool? ZorunluMi { get; set; }
        public decimal? MinTutar { get; set; }
        public decimal? MaxTutar { get; set; }
        public int? MinSureGun { get; set; }
        public int? MaxSureGun { get; set; }
        public string? RiskFaktorleri { get; set; }
        public bool AktifMi { get; set; }
        public DateTime OlusturmaTarihi { get; set; }
    }

    public class PoliceTuruCreateDto
    {
        public string UrunAdi { get; set; } = null!;
        public string UrunKodu { get; set; } = null!;
        public string? Aciklama { get; set; }
        public bool? ZorunluMi { get; set; }
        public decimal? MinTutar { get; set; }
        public decimal? MaxTutar { get; set; }
        public int? MinSureGun { get; set; }
        public int? MaxSureGun { get; set; }
        public string? RiskFaktorleri { get; set; }
        public bool AktifMi { get; set; } = true;
    }

    public class PoliceTuruUpdateDto
    {
        public string UrunAdi { get; set; } = null!;
        public string UrunKodu { get; set; } = null!;
        public string? Aciklama { get; set; }
        public bool? ZorunluMi { get; set; }
        public decimal? MinTutar { get; set; }
        public decimal? MaxTutar { get; set; }
        public int? MinSureGun { get; set; }
        public int? MaxSureGun { get; set; }
        public string? RiskFaktorleri { get; set; }
        public bool AktifMi { get; set; }
    }
} 