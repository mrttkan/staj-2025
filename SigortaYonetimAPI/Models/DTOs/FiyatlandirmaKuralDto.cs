using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs
{
    public class FiyatlandirmaKuralDto
    {
        public int Id { get; set; }
        public string KuralAdi { get; set; } = string.Empty;
        public int PoliceTuruId { get; set; }
        public string PoliceTuruAdi { get; set; } = string.Empty;
        public int SigortaSirketiId { get; set; }
        public string SigortaSirketiAdi { get; set; } = string.Empty;
        public string KuralTipi { get; set; } = string.Empty;
        public decimal Deger { get; set; }
        public string Birim { get; set; } = string.Empty;
        public string? Kosullar { get; set; }
        public int Oncelik { get; set; }
        public bool AktifMi { get; set; }
        public DateTime BaslangicTarihi { get; set; }
        public DateTime? BitisTarihi { get; set; }
        public string? Aciklama { get; set; }
        public DateTime OlusturmaTarihi { get; set; }
        public DateTime GuncellemeTarihi { get; set; }
    }
}


