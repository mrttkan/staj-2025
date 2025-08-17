using SigortaYonetimAPI.Models;

namespace SigortaYonetimAPI.Services
{
    public interface IPricingService
    {
        PricingResult CalculatePricing(POLICE_TURLERI policeTuru, SIGORTA_SIRKETLERI sigortaSirketi, string? teminatBilgileriJson, string? riskBilgileriJson);
    }

    public class PricingResult
    {
        public decimal BrutPrim { get; set; }
        public decimal NetPrim { get; set; }
        public decimal KomisyonTutari { get; set; }
        public decimal VergiTutari { get; set; }
        public decimal ToplamTutar { get; set; }
        public string? HesaplananTeminatlarJson { get; set; }
    }
}
















