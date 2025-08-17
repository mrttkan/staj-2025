using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using System.Text.Json;

namespace SigortaYonetimAPI.Services
{
    public class PricingCalculationService : IPricingCalculationService
    {
        private readonly SigortaYonetimDbContext _context;

        public PricingCalculationService(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        public async Task<FiyatHesaplamaResponseDto> HesaplaFiyatAsync(FiyatHesaplamaRequestDto request)
        {
            try
            {
                // Poliçe türü ve sigorta şirketi kontrolü
                var policeTuru = await _context.POLICE_TURLERIs.FindAsync(request.PoliceTuruId);
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs.FindAsync(request.SigortaSirketiId);
                
                if (policeTuru == null)
                    throw new ArgumentException("Poliçe türü bulunamadı");
                if (sigortaSirketi == null)
                    throw new ArgumentException("Sigorta şirketi bulunamadı");

                // Risk bilgilerini parse et
                var riskBilgileri = new Dictionary<string, object>();
                var teminatBilgileri = new Dictionary<string, object>();
                
                try
                {
                    riskBilgileri = JsonSerializer.Deserialize<Dictionary<string, object>>(request.RiskBilgileri) ?? new Dictionary<string, object>();
                    teminatBilgileri = JsonSerializer.Deserialize<Dictionary<string, object>>(request.TeminatBilgileri) ?? new Dictionary<string, object>();
                }
                catch (JsonException)
                {
                    // JSON parse hatası durumunda varsayılan değerler kullan
                }

                // Temel prim hesaplama - poliçe türüne göre baz prim
                decimal temelPrim = await HesaplaTemelPrimAsync(request.PoliceTuruId, riskBilgileri);
                decimal teminatPrimi = 0;
                var teminatDetaylari = new List<FiyatTeminatDetayDto>();

                // Teminatları hesapla
                if (teminatBilgileri.ContainsKey("teminatlar") && teminatBilgileri["teminatlar"] is JsonElement teminatlarElement)
                {
                    if (teminatlarElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var teminatElement in teminatlarElement.EnumerateArray())
                        {
                            var teminatId = teminatElement.TryGetProperty("teminatId", out var idProp) ? idProp.GetInt32() : 0;
                            var dahilMi = teminatElement.TryGetProperty("dahilMi", out var dahilProp) && dahilProp.GetBoolean();
                            var limit = teminatElement.TryGetProperty("limit", out var limitProp) ? limitProp.GetDecimal() : 0;

                            if (dahilMi && teminatId > 0)
                            {
                                var teminat = await _context.TEMINATLARs.FindAsync(teminatId);
                                if (teminat != null)
                                {
                                    // Limit değeri kontrolü ve düzeltmesi
                                    decimal teminatTutari = limit;
                                    if (teminatTutari <= 0)
                                    {
                                        teminatTutari = teminat.varsayilan_teminat_tutari ?? 10000m;
                                    }
                                    
                                    // Minimum ve maksimum tutar kontrolü
                                    if (teminat.min_teminat_tutari.HasValue && teminatTutari < teminat.min_teminat_tutari.Value)
                                    {
                                        teminatTutari = teminat.min_teminat_tutari.Value;
                                    }
                                    if (teminat.max_teminat_tutari.HasValue && teminatTutari > teminat.max_teminat_tutari.Value)
                                    {
                                        teminatTutari = teminat.max_teminat_tutari.Value;
                                    }

                                    // Teminat tutarı 0'dan büyük olmalı
                                    if (teminatTutari <= 0)
                                    {
                                        teminatTutari = 10000m; // Varsayılan değer
                                    }

                                    var teminatPrim = await HesaplaTeminatPrimAsync(teminatId, teminatTutari, riskBilgileri);
                                    teminatPrimi += teminatPrim;

                                    var teminatDetay = new FiyatTeminatDetayDto
                                    {
                                        TeminatId = teminatId,
                                        TeminatAdi = teminat.teminat_adi,
                                        TeminatKodu = teminat.teminat_kodu,
                                        DahilMi = true,
                                        Limit = teminatTutari, // Düzeltilmiş tutar
                                        Birim = "TRY",
                                        Prim = teminatPrim,
                                        Muafiyet = 0, // Şimdilik sabit
                                        Aciklama = $"{teminat.aciklama ?? ""} (Hesaplama: {teminat.hesaplama_turu})"
                                    };

                                    teminatDetaylari.Add(teminatDetay);
                                }
                            }
                        }
                    }
                }

                // Brüt prim hesaplama
                decimal brutPrim = temelPrim + teminatPrimi;

                // Vergi hesaplama (%18 KDV + %3 BŞV)
                decimal vergiTutari = brutPrim * 0.21m; // %21 toplam vergi
                decimal vergiDahilTutar = brutPrim + vergiTutari;

                // Komisyon hesaplama (sigorta şirketinin kendi komisyon oranı)
                // Komisyon brüt prim üzerinden hesaplanır ve müşteriye ek ücret olarak eklenir
                decimal komisyonOrani = sigortaSirketi.komisyon_orani ?? 5m; // Sigorta şirketinin komisyon oranı (yüzde olarak), yoksa %5
                decimal komisyonTutari = brutPrim * (komisyonOrani / 100m); // Yüzdeyi ondalığa çevir
                
                // Müşteriye gösterilecek toplam tutar (komisyon dahil)
                decimal musteriToplamTutar = vergiDahilTutar + komisyonTutari;
                
                // Admin/Acente için net tutar (komisyon dahil, vergi dahil)
                decimal adminNetTutar = musteriToplamTutar;

                var response = new FiyatHesaplamaResponseDto
                {
                    IsSuccess = true,
                    Message = "Fiyat hesaplama başarılı",
                    TemelPrim = temelPrim,
                    TeminatPrimi = teminatPrimi,
                    VergiTutari = vergiTutari,
                    ToplamPrim = musteriToplamTutar, // Müşteriye gösterilecek tutar (komisyon dahil)
                    KomisyonTutari = komisyonTutari,
                    KomisyonOrani = komisyonOrani / 100m, // Komisyon oranı (ondalık format)
                    NetPrim = adminNetTutar, // Admin/Acente için net tutar
                    MusteriToplamTutar = musteriToplamTutar, // Müşteriye gösterilecek tutar (komisyon dahil)
                    AdminNetTutar = adminNetTutar, // Admin/Acente için net tutar
                    TeminatDetaylari = teminatDetaylari,
                    HesaplamaDetaylari = $"Temel Prim: {temelPrim:C}, Teminat Primi: {teminatPrimi:C}, Vergi: {vergiTutari:C}, Komisyon: {komisyonTutari:C}",
                    HesaplamaTarihi = DateTime.Now,
                    GecerlilikBaslangici = DateTime.Today,
                    GecerlilikBitisi = DateTime.Today.AddDays(30)
                };

                return response;
            }
            catch (Exception ex)
            {
                return new FiyatHesaplamaResponseDto
                {
                    IsSuccess = false,
                    Message = $"Fiyat hesaplama hatası: {ex.Message}",
                    HesaplamaTarihi = DateTime.Now
                };
            }
        }

        private async Task<decimal> HesaplaTemelPrimAsync(int policeTuruId, Dictionary<string, object> riskBilgileri)
        {
            // Poliçe türüne göre baz prim hesaplama
            var policeTuru = await _context.POLICE_TURLERIs.FindAsync(policeTuruId);
            if (policeTuru == null) return 1000; // Varsayılan

            decimal bazPrim = 0;

            // Poliçe türüne göre farklı hesaplama yöntemleri
            switch (policeTuru.urun_kodu?.ToUpper())
            {
                case "TRAFIK":
                    // Trafik sigortası - araç değeri ve yaşa göre
                    bazPrim = HesaplaTrafikPrimi(riskBilgileri);
                    break;
                case "KASKO":
                    // Kasko sigortası - araç değeri ve risk faktörlerine göre
                    bazPrim = HesaplaKaskoPrimi(riskBilgileri);
                    break;
                case "DASK":
                    // DASK - bina değeri ve lokasyona göre
                    bazPrim = HesaplaDaskPrimi(riskBilgileri);
                    break;
                case "SAGLIK":
                    // Sağlık sigortası - yaş ve sağlık durumuna göre
                    bazPrim = HesaplaSaglikPrimi(riskBilgileri);
                    break;
                default:
                    // Varsayılan hesaplama
                    bazPrim = policeTuru.min_tutar ?? 1000;
                    break;
            }

            return bazPrim;
        }

        private decimal HesaplaTrafikPrimi(Dictionary<string, object> riskBilgileri)
        {
            // Trafik sigortası primi hesaplama
            decimal araçDeğeri = 0;
            int araçYaşı = 0;
            string il = "İSTANBUL";

            if (riskBilgileri.ContainsKey("aracDegeri"))
                decimal.TryParse(riskBilgileri["aracDegeri"].ToString(), out araçDeğeri);
            if (riskBilgileri.ContainsKey("aracYasi"))
                int.TryParse(riskBilgileri["aracYasi"].ToString(), out araçYaşı);
            if (riskBilgileri.ContainsKey("il"))
                il = riskBilgileri["il"].ToString() ?? "İSTANBUL";

            // Baz prim hesaplama
            decimal bazPrim = araçDeğeri * 0.015m; // %1.5

            // Yaş faktörü
            if (araçYaşı > 10) bazPrim *= 1.2m;
            else if (araçYaşı > 5) bazPrim *= 1.1m;

            // İl faktörü
            if (il == "İSTANBUL" || il == "ANKARA" || il == "İZMİR")
                bazPrim *= 1.3m;
            else if (il == "BURSA" || il == "ANTALYA" || il == "ADANA")
                bazPrim *= 1.15m;

            return Math.Max(bazPrim, 500); // Minimum 500 TL
        }

        private decimal HesaplaKaskoPrimi(Dictionary<string, object> riskBilgileri)
        {
            // Kasko sigortası primi hesaplama
            decimal araçDeğeri = 0;
            int sürücüYaşı = 25;
            string sürücüDeneyimi = "YENI";

            if (riskBilgileri.ContainsKey("aracDegeri"))
                decimal.TryParse(riskBilgileri["aracDegeri"].ToString(), out araçDeğeri);
            if (riskBilgileri.ContainsKey("surucuYasi"))
                int.TryParse(riskBilgileri["surucuYasi"].ToString(), out sürücüYaşı);
            if (riskBilgileri.ContainsKey("surucuDeneyimi"))
                sürücüDeneyimi = riskBilgileri["surucuDeneyimi"].ToString() ?? "YENI";

            // Baz prim hesaplama
            decimal bazPrim = araçDeğeri * 0.025m; // %2.5

            // Sürücü yaşı faktörü
            if (sürücüYaşı < 25) bazPrim *= 1.5m;
            else if (sürücüYaşı < 30) bazPrim *= 1.3m;
            else if (sürücüYaşı > 65) bazPrim *= 1.4m;

            // Deneyim faktörü
            if (sürücüDeneyimi == "YENI") bazPrim *= 1.3m;
            else if (sürücüDeneyimi == "DENEYIMLI") bazPrim *= 0.9m;

            return Math.Max(bazPrim, 1000); // Minimum 1000 TL
        }

        private decimal HesaplaDaskPrimi(Dictionary<string, object> riskBilgileri)
        {
            // DASK primi hesaplama
            decimal binaDeğeri = 0;
            string il = "İSTANBUL";
            string depremBölgesi = "1";

            if (riskBilgileri.ContainsKey("binaDegeri"))
                decimal.TryParse(riskBilgileri["binaDegeri"].ToString(), out binaDeğeri);
            if (riskBilgileri.ContainsKey("il"))
                il = riskBilgileri["il"].ToString() ?? "İSTANBUL";
            if (riskBilgileri.ContainsKey("depremBolgesi"))
                depremBölgesi = riskBilgileri["depremBolgesi"].ToString() ?? "1";

            // Baz prim hesaplama
            decimal bazPrim = binaDeğeri * 0.008m; // %0.8

            // Deprem bölgesi faktörü
            switch (depremBölgesi)
            {
                case "1": bazPrim *= 1.0m; break;
                case "2": bazPrim *= 1.2m; break;
                case "3": bazPrim *= 1.5m; break;
                case "4": bazPrim *= 2.0m; break;
                default: bazPrim *= 1.0m; break;
            }

            return Math.Max(bazPrim, 200); // Minimum 200 TL
        }

        private decimal HesaplaSaglikPrimi(Dictionary<string, object> riskBilgileri)
        {
            // Sağlık sigortası primi hesaplama
            int yaş = 30;
            string sağlıkDurumu = "İYİ";
            string meslek = "MEMUR";

            if (riskBilgileri.ContainsKey("yas"))
                int.TryParse(riskBilgileri["yas"].ToString(), out yaş);
            if (riskBilgileri.ContainsKey("saglikDurumu"))
                sağlıkDurumu = riskBilgileri["saglikDurumu"].ToString() ?? "İYİ";
            if (riskBilgileri.ContainsKey("meslek"))
                meslek = riskBilgileri["meslek"].ToString() ?? "MEMUR";

            // Baz prim hesaplama
            decimal bazPrim = 2000; // Temel sağlık sigortası

            // Yaş faktörü
            if (yaş < 18) bazPrim *= 0.7m;
            else if (yaş < 30) bazPrim *= 1.0m;
            else if (yaş < 50) bazPrim *= 1.3m;
            else if (yaş < 65) bazPrim *= 1.8m;
            else bazPrim *= 2.5m;

            // Sağlık durumu faktörü
            switch (sağlıkDurumu.ToUpper())
            {
                case "İYİ": bazPrim *= 1.0m; break;
                case "ORTA": bazPrim *= 1.2m; break;
                case "KÖTÜ": bazPrim *= 1.5m; break;
                default: bazPrim *= 1.0m; break;
            }

            // Meslek faktörü
            switch (meslek.ToUpper())
            {
                case "MEMUR": bazPrim *= 1.0m; break;
                case "İŞÇİ": bazPrim *= 1.1m; break;
                case "SERBEST": bazPrim *= 1.2m; break;
                case "TEHLİKELİ": bazPrim *= 1.5m; break;
                default: bazPrim *= 1.0m; break;
            }

            return Math.Max(bazPrim, 1000); // Minimum 1000 TL
        }

        public async Task<List<TeminatListDto>> GetPoliceTuruTeminatlariAsync(int policeTuruId)
        {
            var teminatlar = await _context.TEMINATLARs
                .Where(t => t.police_turu_id == policeTuruId && t.aktif_mi)
                .Join(_context.POLICE_TURLERIs, 
                      t => t.police_turu_id, 
                      pt => pt.id, 
                      (t, pt) => new TeminatListDto
                      {
                          id = t.id,
                          teminat_adi = t.teminat_adi,
                          teminat_kodu = t.teminat_kodu,
                          police_turu_adi = pt.urun_adi,
                          police_turu_id = pt.id,
                          hesaplama_turu = t.hesaplama_turu,
                          min_teminat_tutari = t.min_teminat_tutari,
                          max_teminat_tutari = t.max_teminat_tutari,
                          varsayilan_teminat_tutari = t.varsayilan_teminat_tutari,
                          zorunlu_mu = t.zorunlu_mu,
                          aktif_mi = t.aktif_mi,
                          aciklama = t.aciklama,
                          prim_orani = t.prim_orani,
                          sabit_prim = t.sabit_prim
                      })
                .ToListAsync();

            return teminatlar;
        }

        public async Task<List<FiyatlandirmaKuralDto>> GetFiyatlandirmaKurallariAsync(int policeTuruId)
        {
            var kurallar = await _context.FIYATLANDIRMA_KURALLARIs
                .Where(k => k.police_turu_id == policeTuruId && k.aktif_mi)
                .Join(_context.POLICE_TURLERIs,
                      k => k.police_turu_id,
                      pt => pt.id,
                      (k, pt) => new FiyatlandirmaKuralDto
                      {
                          Id = k.id,
                          KuralAdi = k.kural_adi,
                          PoliceTuruId = pt.id,
                          PoliceTuruAdi = pt.urun_adi,
                          SigortaSirketiId = 1, // Geçici olarak sabit değer
                          SigortaSirketiAdi = "Genel", // Geçici olarak sabit değer
                          KuralTipi = k.kural_tipi,
                          Deger = k.deger,
                          Birim = "TRY", // Varsayılan
                          Kosullar = k.kosul,
                          Oncelik = k.oncelik,
                          AktifMi = k.aktif_mi,
                          BaslangicTarihi = k.olusturma_tarihi,
                          BitisTarihi = null,
                          Aciklama = $"İşlem Tipi: {k.islem_tipi}",
                          OlusturmaTarihi = k.olusturma_tarihi,
                          GuncellemeTarihi = k.guncelleme_tarihi
                      })
                .ToListAsync();

            return kurallar;
        }

        public async Task<decimal> HesaplaTeminatPrimAsync(int teminatId, decimal teminatTutari, Dictionary<string, object> riskBilgileri)
        {
            var teminat = await _context.TEMINATLARs.FindAsync(teminatId);
            if (teminat == null)
                return 0;

            decimal prim = 0;

            // Teminat tutarı kontrolü
            if (teminatTutari <= 0)
            {
                // Eğer teminat tutarı 0 ise, varsayılan tutarı kullan
                teminatTutari = teminat.varsayilan_teminat_tutari ?? 10000m;
            }

            // Minimum ve maksimum tutar kontrolü
            if (teminat.min_teminat_tutari.HasValue && teminatTutari < teminat.min_teminat_tutari.Value)
            {
                teminatTutari = teminat.min_teminat_tutari.Value;
            }
            if (teminat.max_teminat_tutari.HasValue && teminatTutari > teminat.max_teminat_tutari.Value)
            {
                teminatTutari = teminat.max_teminat_tutari.Value;
            }

            // Hesaplama türüne göre prim hesapla
            if (teminat.hesaplama_turu == "SABIT" && teminat.sabit_prim.HasValue)
            {
                prim = teminat.sabit_prim.Value;
            }
            else if (teminat.hesaplama_turu == "YUZDE" && teminat.prim_orani.HasValue)
            {
                prim = teminatTutari * (teminat.prim_orani.Value / 100);
            }
            else
            {
                // Varsayılan hesaplama: %1
                prim = teminatTutari * 0.01m;
            }

            // Minimum prim kontrolü
            if (teminat.min_teminat_tutari.HasValue && prim < 100m)
            {
                prim = 100m; // Minimum 100 TL prim
            }

            return Math.Max(prim, 0); // Negatif değer olmamasını sağla
        }
    }
}