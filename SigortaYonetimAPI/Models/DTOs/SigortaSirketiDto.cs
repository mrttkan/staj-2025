using System;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class SigortaSirketiDto
    {
        public int Id { get; set; }
        public string SirketAdi { get; set; } = null!;
        public string SirketKodu { get; set; } = null!;
        public string? VergiNo { get; set; }
        public string? Telefon { get; set; }
        public string? Eposta { get; set; }
        public string? Adres { get; set; }
        public bool AktifMi { get; set; }
        public decimal? KomisyonOrani { get; set; }
        public DateTime? SozlesmeBaslangic { get; set; }
        public DateTime? SozlesmeBitis { get; set; }
    }

    public class SigortaSirketiCreateDto
    {
        public string SirketAdi { get; set; } = null!;
        public string SirketKodu { get; set; } = null!;
        public string? VergiNo { get; set; }
        public string? Telefon { get; set; }
        public string? Eposta { get; set; }
        public string? Adres { get; set; }
        public bool AktifMi { get; set; } = true;
        public decimal? KomisyonOrani { get; set; }
        public DateTime? SozlesmeBaslangic { get; set; }
        public DateTime? SozlesmeBitis { get; set; }
    }

    public class SigortaSirketiUpdateDto
    {
        public string SirketAdi { get; set; } = null!;
        public string SirketKodu { get; set; } = null!;
        public string? VergiNo { get; set; }
        public string? Telefon { get; set; }
        public string? Eposta { get; set; }
        public string? Adres { get; set; }
        public bool AktifMi { get; set; }
        public decimal? KomisyonOrani { get; set; }
        public DateTime? SozlesmeBaslangic { get; set; }
        public DateTime? SozlesmeBitis { get; set; }
    }
} 