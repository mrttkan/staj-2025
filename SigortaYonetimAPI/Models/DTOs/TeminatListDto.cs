namespace SigortaYonetimAPI.Models.DTOs
{
    public class TeminatListDto
    {
        public int id { get; set; }
        public string teminat_adi { get; set; } = string.Empty;
        public string teminat_kodu { get; set; } = string.Empty;
        public string police_turu_adi { get; set; } = string.Empty;
        public int police_turu_id { get; set; }
        public string? hesaplama_turu { get; set; }
        public decimal? min_teminat_tutari { get; set; }
        public decimal? max_teminat_tutari { get; set; }
        public decimal? varsayilan_teminat_tutari { get; set; }
        public bool zorunlu_mu { get; set; }
        public bool aktif_mi { get; set; }
        public string? aciklama { get; set; }
        public decimal? prim_orani { get; set; }
        public decimal? sabit_prim { get; set; }
    }
}
