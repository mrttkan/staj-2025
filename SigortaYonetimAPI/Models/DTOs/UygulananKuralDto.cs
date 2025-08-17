namespace SigortaYonetimAPI.Models.DTOs
{
    public class UygulananKuralDto
    {
        public int KuralId { get; set; }
        public string KuralAdi { get; set; } = string.Empty;
        public string KuralTipi { get; set; } = string.Empty;
        public decimal UygulananDeger { get; set; }
        public string Birim { get; set; } = string.Empty;
        public decimal EtkiTutari { get; set; }
        public string Aciklama { get; set; } = string.Empty;
    }
}












