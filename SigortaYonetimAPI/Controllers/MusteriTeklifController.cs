using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using System.Security.Claims;
using System.Text.Json;

namespace SigortaYonetimAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MusteriTeklifController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public MusteriTeklifController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // GET: api/MusteriTeklif/Liste
        [HttpGet("Liste")]
        public async Task<ActionResult<IEnumerable<MusteriTeklifListDto>>> GetMusteriTeklifleri()
        {
            try
            {
                var musteriId = GetCurrentMusteriId();
                if (musteriId == 0)
                    return Unauthorized(new { message = "Müşteri bilgisi bulunamadı" });



                // Sadece BEKLEMEDE durumundaki teklifleri göster
                var teklifler = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.musteri_id == musteriId && 
                               t.durum.deger_kodu == "BEKLEMEDE")
                    .Include(t => t.police_turu)
                    .Include(t => t.sigorta_sirketi)
                    .Include(t => t.durum)
                    .OrderByDescending(t => t.teklif_tarihi)
                    .Select(t => new MusteriTeklifListDto
                    {
                        id = t.id,
                        teklif_no = t.teklif_no,
                        police_turu_adi = t.police_turu.urun_adi,
                        sigorta_sirketi_adi = t.sigorta_sirketi.sirket_adi,
                        toplam_tutar = t.toplam_tutar ?? 0,
                        teklif_tarihi = t.teklif_tarihi,
                        gecerlilik_tarihi = t.gecerlilik_tarihi,
                        durum_adi = t.durum.deger_aciklama,
                        durum_id = t.durum_id,
                        gecerlilik_durumu = t.gecerlilik_tarihi > DateTime.Now
                    })
                    .ToListAsync();

                return Ok(teklifler);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teklifler alınırken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/MusteriTeklif/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MusteriTeklifDetayDto>> GetTeklifDetay(int id)
        {
            try
            {
                var musteriId = GetCurrentMusteriId();
                if (musteriId == 0)
                    return Unauthorized(new { message = "Müşteri bilgisi bulunamadı" });

                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.id == id && t.musteri_id == musteriId)
                    .Include(t => t.police_turu)
                    .Include(t => t.sigorta_sirketi)
                    .Include(t => t.durum)
                    .Include(t => t.TEKLIF_TEMINATLARs)
                        .ThenInclude(tt => tt.teminat)
                    .FirstOrDefaultAsync();

                if (teklif == null)
                    return NotFound(new { message = "Teklif bulunamadı" });

                var teklifDetay = new MusteriTeklifDetayDto
                {
                    id = teklif.id,
                    teklif_no = teklif.teklif_no,
                    police_turu_adi = teklif.police_turu.urun_adi,
                    sigorta_sirketi_adi = teklif.sigorta_sirketi.sirket_adi,
                    risk_bilgileri = teklif.risk_bilgileri ?? "",
                    teminatlar = teklif.TEKLIF_TEMINATLARs.Select(tt => new TeklifTeminatDetayDto
                    {
                        teminat_id = tt.teminat_id,
                        teminat_adi = tt.teminat.teminat_adi,
                        teminat_kodu = tt.teminat.teminat_kodu,
                        limit = tt.teminat_tutari,
                        prim = tt.prim_tutari,
                        aciklama = tt.ozel_sartlar,
                        secili_mi = tt.secili_mi
                    }).ToList(),
                    brut_prim = teklif.brut_prim ?? 0,
                    net_prim = teklif.net_prim ?? 0,
                    komisyon_tutari = teklif.komisyon_tutari ?? 0,
                    vergi_tutari = teklif.vergi_tutari ?? 0,
                    toplam_tutar = teklif.toplam_tutar ?? 0,
                    teklif_tarihi = teklif.teklif_tarihi,
                    gecerlilik_tarihi = teklif.gecerlilik_tarihi,
                    durum_adi = teklif.durum.deger_aciklama,
                    durum_id = teklif.durum_id,
                    notlar = teklif.notlar,
                    gecerlilik_durumu = teklif.gecerlilik_tarihi > DateTime.Now
                };

                return Ok(teklifDetay);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teklif detayı alınırken hata oluştu", error = ex.Message });
            }
        }

        // POST: api/MusteriTeklif/Onayla
        [HttpPost("Onayla")]
        public async Task<ActionResult<object>> OnaylaTeklif([FromBody] MusteriOnayTeklifDto onayDto)
        {
            // Transaction başlat
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var musteriId = GetCurrentMusteriId();
                if (musteriId == 0)
                    return Unauthorized(new { message = "Müşteri bilgisi bulunamadı" });

                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.id == onayDto.teklif_id && t.musteri_id == musteriId)
                    .FirstOrDefaultAsync();

                if (teklif == null)
                    return NotFound(new { message = "Teklif bulunamadı" });

                if (teklif.gecerlilik_tarihi < DateTime.Now)
                    return BadRequest(new { message = "Teklifin geçerlilik süresi dolmuş" });

                // Debug: Teklif durumunu logla
                Console.WriteLine($"Teklif ID: {teklif.id}, Durum ID: {teklif.durum_id}");
                
                // Beklemede durumu kontrolü - durum adına göre de kontrol et
                var bekleyenDurum = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "BEKLEMEDE");
                
                Console.WriteLine($"Bekleyen durum ID: {bekleyenDurum?.id ?? 1}");
                
                // Sadece onaylanmış (2) ve reddedilmiş (3) durumları kontrol et
                // Diğer tüm durumlar (1, 4, 5, vb.) onaylanabilir
                if (teklif.durum_id == 2 || teklif.durum_id == 3)
                {
                    Console.WriteLine($"Teklif zaten işlenmiş - Durum ID: {teklif.durum_id}");
                    return BadRequest(new { message = "Bu teklif zaten işlenmiş" });
                }

                if (onayDto.onaylandi)
                {
                    // Önce ödeme bilgilerini güvenli şekilde sakla
                    await OdemeBilgileriniKaydetAsync(teklif, onayDto);
                    
                    // Poliçe oluştur
                    await OlusturPoliceAsync(teklif, onayDto);
                    
                    // Son olarak teklifi onayla
                    teklif.durum_id = 2; // Onaylandı
                    teklif.onay_tarihi = DateTime.Now;
                    teklif.onaylayan_kullanici = User.Identity?.Name;
                }
                else
                {
                    // Teklifi reddet
                    teklif.durum_id = 3; // Reddedildi
                    teklif.red_nedeni = onayDto.red_nedeni;
                }

                teklif.guncelleme_tarihi = DateTime.Now;
                await _context.SaveChangesAsync();

                // Transaction'ı commit et
                await transaction.CommitAsync();

                return Ok(new { 
                    message = onayDto.onaylandi ? "Teklif başarıyla onaylandı ve poliçe oluşturuldu" : "Teklif reddedildi",
                    teklifId = teklif.id 
                });
            }
            catch (Exception ex)
            {
                // Hata durumunda transaction'ı rollback et
                await transaction.RollbackAsync();
                Console.WriteLine($"Teklif onaylama hatası: {ex.Message}");
                return StatusCode(500, new { message = "Teklif işlenirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/MusteriTeklif/dashboard-stats
        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<object>> GetKullaniciDashboardStats()
        {
            try
            {
                var musteriId = GetCurrentMusteriId();
                if (musteriId == 0)
                    return Unauthorized(new { message = "Müşteri bilgisi bulunamadı" });

                var bugun = DateTime.Today;
                var buAy = new DateTime(bugun.Year, bugun.Month, 1);

                // Poliçe istatistikleri
                var policeStats = await _context.POLISELERs
                    .Where(p => p.musteri_id == musteriId)
                    .GroupBy(p => 1)
                    .Select(g => new
                    {
                        toplam_police_sayisi = g.Count(),
                        aktif_police_sayisi = g.Count(p => p.bitis_tarihi > DateTime.Now),
                        toplam_prim_tutari = g.Sum(p => p.brut_prim ?? 0m),
                        bu_ay_odenen_prim = g.Where(p => p.tanzim_tarihi >= buAy).Sum(p => p.brut_prim ?? 0m)
                    })
                    .FirstOrDefaultAsync();

                // Ödeme istatistikleri
                var odemeStats = await _context.ODEMELERs
                    .Where(o => o.musteri_id == musteriId)
                    .GroupBy(o => 1)
                    .Select(g => new
                    {
                        toplam_odeme_sayisi = g.Count(),
                        toplam_odenen_tutar = g.Sum(o => o.tutar),
                        bekleyen_odeme_sayisi = g.Count(o => o.durum.deger_kodu == "BEKLEMEDE"),
                        bu_ay_odenen_tutar = g.Where(o => o.odeme_tarihi >= buAy && o.durum.deger_kodu == "ONAYLANDI").Sum(o => o.tutar)
                    })
                    .FirstOrDefaultAsync();

                // Hasar istatistikleri
                var hasarStats = await _context.HASAR_DOSYALARs
                    .Where(h => h.musteri_id == musteriId)
                    .GroupBy(h => 1)
                    .Select(g => new
                    {
                        toplam_hasar_sayisi = g.Count(),
                        bekleyen_hasar_sayisi = g.Count(h => h.durum!.deger_kodu == "BEKLEMEDE"),
                        toplam_hasar_tutari = g.Sum(h => h.talep_edilen_tutar ?? 0m),
                        bu_ay_hasar_sayisi = g.Count(h => h.olusturma_tarihi >= buAy)
                    })
                    .FirstOrDefaultAsync();

                // Teklif istatistikleri
                var teklifStats = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.musteri_id == musteriId)
                    .GroupBy(t => 1)
                    .Select(g => new
                    {
                        toplam_teklif_sayisi = g.Count(),
                        bekleyen_teklif_sayisi = g.Count(t => t.durum!.deger_kodu == "BEKLEMEDE"),
                        onaylanan_teklif_sayisi = g.Count(t => t.durum!.deger_kodu == "ONAYLANDI"),
                        reddedilen_teklif_sayisi = g.Count(t => t.durum!.deger_kodu == "REDDEDILDI"),
                        bu_ay_teklif_sayisi = g.Count(t => t.teklif_tarihi >= buAy)
                    })
                    .FirstOrDefaultAsync();

                // Son aktiviteler (son 5 işlem)
                var sonAktiviteler = new List<object>();

                // Poliçe aktiviteleri
                var policeAktiviteler = await _context.POLISELERs
                    .Where(p => p.musteri_id == musteriId)
                    .OrderByDescending(p => p.tanzim_tarihi)
                    .Take(3)
                    .Select(p => new
                    {
                        tip = "Poliçe",
                        aciklama = $"{p.police_no} poliçesi tanzim edildi",
                        tarih = p.tanzim_tarihi,
                        tutar = p.brut_prim ?? 0m
                    })
                    .ToListAsync();

                // Ödeme aktiviteleri
                var odemeAktiviteler = await _context.ODEMELERs
                    .Where(o => o.musteri_id == musteriId)
                    .OrderByDescending(o => o.odeme_tarihi)
                    .Take(3)
                    .Select(o => new
                    {
                        tip = "Ödeme",
                        aciklama = $"{o.odeme_no} ödemesi yapıldı",
                        tarih = o.odeme_tarihi,
                        tutar = o.tutar
                    })
                    .ToListAsync();

                // Hasar aktiviteleri
                var hasarAktiviteler = await _context.HASAR_DOSYALARs
                    .Where(h => h.musteri_id == musteriId)
                    .OrderByDescending(h => h.olusturma_tarihi)
                    .Take(3)
                    .Select(h => new
                    {
                        tip = "Hasar",
                        aciklama = $"{h.dosya_no} hasar dosyası açıldı",
                        tarih = h.olusturma_tarihi,
                        tutar = h.talep_edilen_tutar ?? 0m
                    })
                    .ToListAsync();

                // Teklif aktiviteleri
                var teklifAktiviteler = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.musteri_id == musteriId)
                    .OrderByDescending(t => t.teklif_tarihi)
                    .Take(3)
                    .Select(t => new
                    {
                        tip = "Teklif",
                        aciklama = $"{t.teklif_no} teklifi oluşturuldu",
                        tarih = t.teklif_tarihi,
                        tutar = t.toplam_tutar ?? 0m
                    })
                    .ToListAsync();

                // Tüm aktiviteleri birleştir ve tarihe göre sırala
                var tumAktiviteler = new List<object>();
                tumAktiviteler.AddRange(policeAktiviteler);
                tumAktiviteler.AddRange(odemeAktiviteler);
                tumAktiviteler.AddRange(hasarAktiviteler);
                tumAktiviteler.AddRange(teklifAktiviteler);
                
                sonAktiviteler = tumAktiviteler
                    .OrderByDescending(a => ((dynamic)a).tarih)
                    .Take(5)
                    .ToList();

                // Eğer istatistikler null ise varsayılan değerler
                if (policeStats == null)
                {
                    policeStats = new
                    {
                        toplam_police_sayisi = 0,
                        aktif_police_sayisi = 0,
                        toplam_prim_tutari = 0m,
                        bu_ay_odenen_prim = 0m
                    };
                }

                if (odemeStats == null)
                {
                    odemeStats = new
                    {
                        toplam_odeme_sayisi = 0,
                        toplam_odenen_tutar = 0m,
                        bekleyen_odeme_sayisi = 0,
                        bu_ay_odenen_tutar = 0m
                    };
                }

                if (hasarStats == null)
                {
                    hasarStats = new
                    {
                        toplam_hasar_sayisi = 0,
                        bekleyen_hasar_sayisi = 0,
                        toplam_hasar_tutari = 0m,
                        bu_ay_hasar_sayisi = 0
                    };
                }

                if (teklifStats == null)
                {
                    teklifStats = new
                    {
                        toplam_teklif_sayisi = 0,
                        bekleyen_teklif_sayisi = 0,
                        onaylanan_teklif_sayisi = 0,
                        reddedilen_teklif_sayisi = 0,
                        bu_ay_teklif_sayisi = 0
                    };
                }

                return Ok(new
                {
                    total_policies = policeStats.toplam_police_sayisi,
                    active_policies = policeStats.aktif_police_sayisi,
                    total_payments = odemeStats.toplam_odeme_sayisi,
                    pending_payments = odemeStats.bekleyen_odeme_sayisi,
                    total_claims = hasarStats.toplam_hasar_sayisi,
                    pending_claims = hasarStats.bekleyen_hasar_sayisi,
                    total_prim = policeStats.toplam_prim_tutari,
                    total_paid = odemeStats.toplam_odenen_tutar,
                    total_claims_amount = hasarStats.toplam_hasar_tutari,
                    pending_offers = teklifStats.bekleyen_teklif_sayisi,
                    accepted_offers = teklifStats.onaylanan_teklif_sayisi,
                    rejected_offers = teklifStats.reddedilen_teklif_sayisi,
                    this_month_payments = odemeStats.bu_ay_odenen_tutar,
                    this_month_claims = hasarStats.bu_ay_hasar_sayisi,
                    recent_activities = sonAktiviteler
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Dashboard istatistikleri alınırken hata oluştu", error = ex.Message });
            }
        }

        private async Task OdemeBilgileriniKaydetAsync(POLICE_TEKLIFLERI teklif, MusteriOnayTeklifDto onayDto)
        {
            try
            {
                // Ödeme bilgilerini güvenli şekilde şifrele ve sakla
                var odemeBilgileri = new
                {
                    odeme_yontemi = onayDto.odeme_yontemi,
                    taksit_sayisi = onayDto.taksit_sayisi,
                    kart_sahibi = onayDto.kart_sahibi,
                    kart_numarasi = onayDto.kart_numarasi,
                    son_kullanma_ayi = onayDto.son_kullanma_ayi,
                    son_kullanma_yili = onayDto.son_kullanma_yili,
                    cvv = onayDto.cvv,
                    banka_adi = onayDto.banka_adi,
                    hesap_sahibi = onayDto.hesap_sahibi,
                    iban = onayDto.iban
                };

                // Basit şifreleme (gerçek uygulamada daha güvenli şifreleme kullanılmalı)
                var sifreliBilgiler = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(odemeBilgileri)));

                // Ödeme kaydı oluştur
                var odeme = new ODEMELER
                {
                    odeme_no = await GenerateOdemeNo(),
                    musteri_id = teklif.musteri_id,
                    odeme_turu = "POLICE_ODEMESI",
                    odeme_yontemi_detay = onayDto.odeme_yontemi,
                    odeme_tarihi = DateTime.Now,
                    tutar = teklif.toplam_tutar ?? 0,
                    durum_id = 1, // Beklemede
                    sifreli_odeme_bilgileri = sifreliBilgiler,
                    taksit_sayisi = onayDto.taksit_sayisi,
                    taksit_tutari = onayDto.taksit_sayisi > 1 ? (teklif.toplam_tutar ?? 0) / onayDto.taksit_sayisi : teklif.toplam_tutar,
                    aciklama = $"Poliçe teklifi onayı - {teklif.teklif_no}",
                    olusturma_tarihi = DateTime.Now
                };

                _context.ODEMELERs.Add(odeme);
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"Ödeme kaydı oluşturuldu: {odeme.odeme_no}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ödeme kaydetme hatası: {ex.Message}");
                throw; // Hatayı yukarı fırlat
            }
        }

        private async Task<string> GenerateOdemeNo()
        {
            var prefix = "OD";
            var year = DateTime.Now.Year.ToString();
            var month = DateTime.Now.Month.ToString("D2");

            var lastNumber = await _context.ODEMELERs
                .Where(o => o.odeme_no != null && o.odeme_no.StartsWith(prefix + year + month))
                .CountAsync();

            var newNumber = (lastNumber + 1).ToString("D6");
            return $"{prefix}{year}{month}{newNumber}";
        }

        private async Task OlusturPoliceAsync(POLICE_TEKLIFLERI teklif, MusteriOnayTeklifDto onayDto)
        {
            try
            {
                // Poliçe numarası oluştur
                var policeNo = await GeneratePoliceNo();

                // Aktif durum ID'sini al
                var aktifDurum = await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "POLISELER" && d.deger_kodu == "AKTIF");
                
                if (aktifDurum == null)
                {
                    throw new Exception("Aktif durum bulunamadı");
                }

                // Poliçe oluştur - tanzim_eden_kullanici_id teklifi oluşturan acente kullanıcısının ID'si olmalı
                var police = new POLISELER
                {
                    police_no = policeNo,
                    teklif_id = teklif.id,
                    musteri_id = teklif.musteri_id,
                    police_turu_id = teklif.police_turu_id,
                    sigorta_sirketi_id = teklif.sigorta_sirketi_id,
                    tanzim_eden_kullanici_id = teklif.olusturan_kullanici_id, // Teklifi oluşturan acente kullanıcısı
                    risk_bilgileri = teklif.risk_bilgileri,
                    teminat_bilgileri = teklif.teminat_bilgileri,
                    baslangic_tarihi = DateTime.Today,
                    bitis_tarihi = DateTime.Today.AddYears(1),
                    brut_prim = teklif.brut_prim,
                    net_prim = teklif.net_prim,
                    komisyon_tutari = teklif.komisyon_tutari,
                    vergi_tutari = teklif.vergi_tutari,
                    toplam_tutar = teklif.toplam_tutar,
                    taksit_sayisi = onayDto.taksit_sayisi ?? 1,
                    odeme_yontemi = onayDto.odeme_yontemi ?? "NAKIT",
                    durum_id = aktifDurum.id, // Aktif durum ID'si
                    tanzim_tarihi = DateTime.Now,
                    olusturma_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _context.POLISELERs.Add(police);
                await _context.SaveChangesAsync();

                // Poliçe teminatlarını oluştur
                var teklifTeminatlar = await _context.TEKLIF_TEMINATLARs
                    .Where(tt => tt.teklif_id == teklif.id && tt.secili_mi)
                    .ToListAsync();

                foreach (var teklifTeminat in teklifTeminatlar)
                {
                    var policeTeminat = new POLICE_TEMINATLAR
                    {
                        police_id = police.id,
                        teminat_id = teklifTeminat.teminat_id,
                        teminat_tutari = teklifTeminat.teminat_tutari,
                        prim_tutari = teklifTeminat.prim_tutari,
                        ozel_sartlar = teklifTeminat.ozel_sartlar,
                        olusturma_tarihi = DateTime.Now
                    };

                    _context.POLICE_TEMINATLARs.Add(policeTeminat);
                }

                await _context.SaveChangesAsync();
                
                Console.WriteLine($"Poliçe başarıyla oluşturuldu: {police.police_no}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Poliçe oluşturma hatası: {ex.Message}");
                throw; // Hatayı yukarı fırlat
            }
        }

        private async Task<string> GeneratePoliceNo()
        {
            var prefix = "PL";
            var year = DateTime.Now.Year.ToString();
            var month = DateTime.Now.Month.ToString("D2");

            var lastNumber = await _context.POLISELERs
                .Where(p => p.police_no.StartsWith(prefix + year + month))
                .CountAsync();

            var newNumber = (lastNumber + 1).ToString("D6");
            return $"{prefix}{year}{month}{newNumber}";
        }

        private async Task<int> GetCurrentMusteriIdAsync()
        {
            // Önce MusteriId claim'ini kontrol et
            var musteriIdClaim = User.FindFirst("MusteriId")?.Value;
            if (int.TryParse(musteriIdClaim, out int musteriId))
                return musteriId;

            // KullanicilarId claim'ini kontrol et (JWT'de mevcut)
            var kullanicilarIdClaim = User.FindFirst("KullanicilarId")?.Value;
            if (int.TryParse(kullanicilarIdClaim, out int kullanicilarId))
            {
                Console.WriteLine($"Debug - KullanicilarId claim'den: {kullanicilarId}");
                var musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.kullanici_id == kullanicilarId);
                if (musteri != null)
                {
                    Console.WriteLine($"Debug - Müşteri bulundu (KullanicilarId ile): {musteri.id}");
                    return musteri.id;
                }
            }

            // Fallback: Email ile dene
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(userEmail))
            {
                Console.WriteLine($"Debug - Email ile aranıyor: {userEmail}");
                var musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.eposta == userEmail);
                if (musteri != null)
                {
                    Console.WriteLine($"Debug - Müşteri bulundu (email ile): {musteri.id}");
                    return musteri.id;
                }
            }

            Console.WriteLine($"Debug - Müşteri bulunamadı");
            return 0;
        }

        private int GetCurrentMusteriId()
        {
            return GetCurrentMusteriIdAsync().GetAwaiter().GetResult();
        }

        private int GetCurrentKullaniciId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userIdClaim))
            {
                // GUID formatındaki kullanıcı ID'sini int'e çevirmeye çalış
                // Eğer başarısız olursa 0 döndür
                if (int.TryParse(userIdClaim, out int userId))
                    return userId;
            }

            return 0;
        }
    }
}
