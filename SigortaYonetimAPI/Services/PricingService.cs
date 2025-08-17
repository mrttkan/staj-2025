using Newtonsoft.Json.Linq;
using SigortaYonetimAPI.Models;

namespace SigortaYonetimAPI.Services
{
    public class PricingService : IPricingService
    {
        public PricingResult CalculatePricing(POLICE_TURLERI policeTuru, SIGORTA_SIRKETLERI sigortaSirketi, string? teminatBilgileriJson, string? riskBilgileriJson)
        {
            // Basit referans hesaplama: teminatlar içindeki bazPrim * çarpan toplamı üzerinden
            decimal brut = 0m;
            JArray? teminatlar = null;
            try
            {
                if (!string.IsNullOrWhiteSpace(teminatBilgileriJson))
                {
                    var root = JObject.Parse(teminatBilgileriJson);
                    teminatlar = root["teminatlar"] as JArray;
                    if (teminatlar != null)
                    {
                        foreach (var t in teminatlar)
                        {
                            var dahilMi = t.Value<bool?>("dahilMi") ?? false;
                            if (!dahilMi) continue;
                            var bazPrim = t.Value<decimal?>("bazPrim") ?? 0m;
                            var carpan = t.Value<decimal?>("carpan") ?? 1m;
                            var hesaplanan = bazPrim * carpan;
                            brut += hesaplanan;
                            t["hesaplananPrim"] = hesaplanan;
                        }
                    }
                }
            }
            catch
            {
                // JSON hatası durumunda brut 0 kalır, servis yine sonuç döner
            }

            // Risk katsayısı örneği (il, yaş vs. basit etki) - şimdilik yok/yatay
            // Komisyon ve vergi basit örnekle hesaplanır
            var komisyonOrani = sigortaSirketi.komisyon_orani ?? 0.15m;
            var komisyon = brut * komisyonOrani;
            var vergi = brut * 0.05m; // örnek vergi
            var net = brut - komisyon;
            var toplam = brut + vergi;

            return new PricingResult
            {
                BrutPrim = decimal.Round(brut, 2),
                NetPrim = decimal.Round(net, 2),
                KomisyonTutari = decimal.Round(komisyon, 2),
                VergiTutari = decimal.Round(vergi, 2),
                ToplamTutar = decimal.Round(toplam, 2),
                HesaplananTeminatlarJson = teminatlar?.ToString()
            };
        }
    }
}
















