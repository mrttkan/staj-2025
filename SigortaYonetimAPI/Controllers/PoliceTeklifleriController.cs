using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using SigortaYonetimAPI.Services;

namespace SigortaYonetimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PoliceTeklifleriController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;
        private readonly IPricingService _pricingService;
        private readonly IPricingCalculationService _pricingCalculationService;

        public PoliceTeklifleriController(SigortaYonetimDbContext context, IPricingService pricingService, IPricingCalculationService pricingCalculationService)
        {
            _context = context;
            _pricingService = pricingService;
            _pricingCalculationService = pricingCalculationService;
        }

        // GET: api/PoliceTeklifleri
        [HttpGet]
        public async Task<IActionResult> GetPoliceTeklifleri([FromQuery] int? musteriId = null, [FromQuery] string? durum = null)
        {
            try
            {
                var query = _context.POLICE_TEKLIFLERIs
                    .Include(t => t.musteri)
                    .Include(t => t.police_turu)
                    .Include(t => t.sigorta_sirketi)
                    .Include(t => t.olusturan_kullanici)
                    .Include(t => t.durum)
                    .AsQueryable();

                // Acente kullanıcıları sadece kendi oluşturdukları teklifleri görebilir
                if (User.IsInRole("ACENTE"))
                {
                    var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                    if (kullaniciId > 0)
                    {
                        query = query.Where(t => t.olusturan_kullanici_id == kullaniciId);
                    }
                }

                if (musteriId.HasValue)
                    query = query.Where(t => t.musteri_id == musteriId.Value);

                if (!string.IsNullOrEmpty(durum))
                    query = query.Where(t => t.durum.deger_kodu == durum);

                var teklifler = await query
                    .OrderByDescending(t => t.teklif_tarihi)
                    .Select(t => new PoliceTeklifListDto
                    {
                        id = t.id,
                        teklif_no = t.teklif_no,
                        musteri_adi = ($"{t.musteri.ad} {t.musteri.soyad}").Trim(),
                        police_turu_adi = t.police_turu.urun_adi,
                        sigorta_sirketi_adi = t.sigorta_sirketi.sirket_adi,
                        brut_prim = t.brut_prim,
                        net_prim = t.net_prim,
                        toplam_tutar = t.toplam_tutar,
                        durum_adi = t.durum.deger_aciklama,
                        teklif_tarihi = t.teklif_tarihi,
                        gecerlilik_tarihi = t.gecerlilik_tarihi,
                        olusturan_kullanici = $"{t.olusturan_kullanici.ad} {t.olusturan_kullanici.soyad}"
                    })
                    .ToListAsync();

                return Ok(new { data = teklifler });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifleri listelenirken hata oluştu: {ex.Message}");
            }
        }

        // POST: api/PoliceTeklifleri/hesapla
        [HttpPost("hesapla")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> Hesapla([FromBody] PoliceTeklifCreateDto request)
        {
            try
            {
                // Gerekli referansları doğrula
                var policeTuru = await _context.POLICE_TURLERIs.FindAsync(request.police_turu_id);
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs.FindAsync(request.sigorta_sirketi_id);
                if (policeTuru == null || sigortaSirketi == null)
                    return BadRequest("Geçersiz poliçe türü veya sigorta şirketi");

                // PricingCalculationService kullan
                var fiyatRequest = new FiyatHesaplamaRequestDto
                {
                    PoliceTuruId = request.police_turu_id,
                    SigortaSirketiId = request.sigorta_sirketi_id,
                    RiskBilgileri = request.risk_bilgileri ?? "{}",
                    TeminatBilgileri = request.teminat_bilgileri ?? "{}",
                    MusteriId = request.musteri_id
                };

                var hesap = await _pricingCalculationService.HesaplaFiyatAsync(fiyatRequest);
                return Ok(hesap);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Prim hesaplanırken hata oluştu: {ex.Message}" });
            }
        }

        // GET: api/PoliceTeklifleri/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPoliceTeklifi(int id)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Include(t => t.musteri)
                    .Include(t => t.police_turu)
                    .Include(t => t.sigorta_sirketi)
                    .Include(t => t.olusturan_kullanici)
                    .Include(t => t.durum)
                    .FirstOrDefaultAsync(t => t.id == id);

                if (teklif == null)
                {
                    return NotFound("Poliçe teklifi bulunamadı");
                }

                var teklifDetay = new PoliceTeklifDetayDto
                {
                    id = teklif.id,
                    teklif_no = teklif.teklif_no,
                    musteri_id = teklif.musteri_id,
                    musteri_adi = ($"{teklif.musteri.ad} {teklif.musteri.soyad}").Trim(),
                    police_turu_id = teklif.police_turu_id,
                    police_turu_adi = teklif.police_turu.urun_adi,
                    sigorta_sirketi_id = teklif.sigorta_sirketi_id,
                    sigorta_sirketi_adi = teklif.sigorta_sirketi.sirket_adi,
                    olusturan_kullanici_id = teklif.olusturan_kullanici_id,
                    olusturan_kullanici = $"{teklif.olusturan_kullanici.ad} {teklif.olusturan_kullanici.soyad}",
                    risk_bilgileri = teklif.risk_bilgileri,
                    teminat_bilgileri = teklif.teminat_bilgileri,
                    brut_prim = teklif.brut_prim,
                    net_prim = teklif.net_prim,
                    komisyon_tutari = teklif.komisyon_tutari,
                    vergi_tutari = teklif.vergi_tutari,
                    toplam_tutar = teklif.toplam_tutar,
                    durum_id = teklif.durum_id,
                    durum_adi = teklif.durum.deger_aciklama,
                    teklif_tarihi = teklif.teklif_tarihi,
                    gecerlilik_tarihi = teklif.gecerlilik_tarihi,
                    onay_tarihi = teklif.onay_tarihi,
                    onaylayan_kullanici = teklif.onaylayan_kullanici,
                    red_nedeni = teklif.red_nedeni,
                    notlar = teklif.notlar,
                    olusturma_tarihi = teklif.olusturma_tarihi,
                    guncelleme_tarihi = teklif.guncelleme_tarihi
                };

                return Ok(teklifDetay);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi detayı alınırken hata oluştu: {ex.Message}");
            }
        }

        // POST: api/PoliceTeklifleri
        [HttpPost]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> CreatePoliceTeklifi([FromBody] PoliceTeklifCreateDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Müşteri kontrolü
                var musteri = await _context.MUSTERILERs.FindAsync(createDto.musteri_id);
                if (musteri == null)
                {
                    return BadRequest("Müşteri bulunamadı");
                }

                // Poliçe türü kontrolü
                var policeTuru = await _context.POLICE_TURLERIs.FindAsync(createDto.police_turu_id);
                if (policeTuru == null)
                {
                    return BadRequest("Poliçe türü bulunamadı");
                }

                // Sigorta şirketi kontrolü
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs.FindAsync(createDto.sigorta_sirketi_id);
                if (sigortaSirketi == null)
                {
                    return BadRequest("Sigorta şirketi bulunamadı");
                }

                // Bekleyen durum ID'si
                var bekleyenDurumId = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "BEKLEMEDE")?.id ?? 1;

                // Teklif numarası oluştur
                var teklifNo = await GenerateTeklifNo();

                // Kullanıcı ID'sini al
                var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "1");

                // Eğer primler gönderilmemişse PricingCalculationService ile hesapla
                decimal? brut = createDto.brut_prim;
                decimal? net = createDto.net_prim;
                decimal? komisyon = createDto.komisyon_tutari;
                decimal? vergi = createDto.vergi_tutari;
                decimal? toplam = createDto.toplam_tutar;

                if (!brut.HasValue || !net.HasValue || !komisyon.HasValue || !vergi.HasValue || !toplam.HasValue)
                {
                    var fiyatRequest = new FiyatHesaplamaRequestDto
                    {
                        PoliceTuruId = createDto.police_turu_id,
                        SigortaSirketiId = createDto.sigorta_sirketi_id,
                        RiskBilgileri = createDto.risk_bilgileri ?? "{}",
                        TeminatBilgileri = createDto.teminat_bilgileri ?? "{}",
                        MusteriId = createDto.musteri_id
                    };

                    var hesap = await _pricingCalculationService.HesaplaFiyatAsync(fiyatRequest);
                    
                    // Brüt prim = temel prim + teminat primi
                    brut = hesap.TemelPrim + hesap.TeminatPrimi;
                    net = hesap.AdminNetTutar; // Admin net tutar (komisyon dahil)
                    komisyon = hesap.KomisyonTutari;
                    vergi = hesap.VergiTutari;
                    toplam = hesap.MusteriToplamTutar; // Müşteriye gösterilecek tutar (komisyon dahil)
                }

                var teklif = new POLICE_TEKLIFLERI
                {
                    teklif_no = teklifNo,
                    musteri_id = createDto.musteri_id,
                    police_turu_id = createDto.police_turu_id,
                    sigorta_sirketi_id = createDto.sigorta_sirketi_id,
                    olusturan_kullanici_id = kullaniciId,
                    risk_bilgileri = createDto.risk_bilgileri,
                    teminat_bilgileri = createDto.teminat_bilgileri,
                    brut_prim = brut,
                    net_prim = net,
                    komisyon_tutari = komisyon,
                    vergi_tutari = vergi,
                    toplam_tutar = toplam,
                    durum_id = bekleyenDurumId,
                    teklif_tarihi = DateTime.Now,
                    gecerlilik_tarihi = DateTime.Now.AddDays(30), // 30 gün geçerli
                    notlar = createDto.notlar,
                    olusturma_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _context.POLICE_TEKLIFLERIs.Add(teklif);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetPoliceTeklifi), new { id = teklif.id }, 
                    new { id = teklif.id, teklif_no = teklif.teklif_no });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi oluşturulurken hata oluştu: {ex.Message}");
            }
        }

        // PUT: api/PoliceTeklifleri/5/onayla
        [HttpPut("{id}/onayla")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> OnaylaTeklif(int id)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs.FindAsync(id);
                if (teklif == null)
                {
                    return NotFound("Poliçe teklifi bulunamadı");
                }

                // Acente kullanıcıları sadece kendi oluşturdukları teklifleri onaylayabilir
                if (User.IsInRole("ACENTE"))
                {
                    var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                    if (teklif.olusturan_kullanici_id != kullaniciId)
                    {
                        return Forbid("Bu teklifi onaylama yetkiniz yok");
                    }
                }

                // Onaylandı durum ID'si
                var onaylandiDurumId = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "ONAYLANDI")?.id ?? 2;

                teklif.durum_id = onaylandiDurumId;
                teklif.onay_tarihi = DateTime.Now;
                teklif.onaylayan_kullanici = User.Identity?.Name;
                teklif.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();

                // Müşteriye bildirim gönder
                await SendNotificationToCustomer(teklif.musteri_id, $"Poliçe teklifi {teklif.teklif_no} onaylandı.");

                return Ok(new { message = "Poliçe teklifi onaylandı", teklif_no = teklif.teklif_no });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi onaylanırken hata oluştu: {ex.Message}");
            }
        }

        // PUT: api/PoliceTeklifleri/5/musteri-onayla
        [HttpPut("{id}/musteri-onayla")]
        [Authorize(Roles = "KULLANICI")]
        public async Task<IActionResult> MusteriOnaylaTeklif(int id)
        {
            try
            {
                // Kullanıcının müşteri ID'sini al
                var kullaniciId = User.FindFirst("KullanicilarId")?.Value;
                if (string.IsNullOrEmpty(kullaniciId))
                {
                    return BadRequest("Kullanıcı bilgisi bulunamadı");
                }

                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Include(t => t.musteri)
                    .FirstOrDefaultAsync(t => t.id == id);

                if (teklif == null)
                {
                    return NotFound("Poliçe teklifi bulunamadı");
                }

                // Müşterinin kendi teklifini onayladığından emin ol
                var musteri = await _context.MUSTERILERs
                    .FirstOrDefaultAsync(m => m.kullanici_id == int.Parse(kullaniciId));
                
                if (musteri == null || teklif.musteri_id != musteri.id)
                {
                    return Forbid("Bu teklifi onaylama yetkiniz yok");
                }

                // Onaylandı durum ID'si
                var onaylandiDurumId = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "ONAYLANDI")?.id ?? 2;

                teklif.durum_id = onaylandiDurumId;
                teklif.onay_tarihi = DateTime.Now;
                teklif.onaylayan_kullanici = $"{musteri.ad} {musteri.soyad}";
                teklif.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();

                // Acente'ye bildirim gönder
                await SendNotificationToAcente(teklif.olusturan_kullanici_id, $"Müşteri {musteri.ad} {musteri.soyad} poliçe teklifi {teklif.teklif_no} onayladı.");

                return Ok(new { message = "Poliçe teklifi onaylandı", teklif_no = teklif.teklif_no });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi onaylanırken hata oluştu: {ex.Message}");
            }
        }

        // PUT: api/PoliceTeklifleri/5/reddet
        [HttpPut("{id}/reddet")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> ReddetTeklif(int id, [FromBody] string redNedeni)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs.FindAsync(id);
                if (teklif == null)
                {
                    return NotFound("Poliçe teklifi bulunamadı");
                }

                // Acente kullanıcıları sadece kendi oluşturdukları teklifleri reddedebilir
                if (User.IsInRole("ACENTE"))
                {
                    var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                    if (teklif.olusturan_kullanici_id != kullaniciId)
                    {
                        return Forbid("Bu teklifi reddetme yetkiniz yok");
                    }
                }

                // Reddedildi durum ID'si
                var reddedildiDurumId = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "REDDEDILDI")?.id ?? 3;

                teklif.durum_id = reddedildiDurumId;
                teklif.red_nedeni = redNedeni;
                teklif.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Poliçe teklifi reddedildi", teklif_no = teklif.teklif_no });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi reddedilirken hata oluştu: {ex.Message}");
            }
        }

        // PUT: api/PoliceTeklifleri/5/musteri-reddet
        [HttpPut("{id}/musteri-reddet")]
        [Authorize(Roles = "KULLANICI")]
        public async Task<IActionResult> MusteriReddetTeklif(int id, [FromBody] string redNedeni)
        {
            try
            {
                // Kullanıcının müşteri ID'sini al
                var kullaniciId = User.FindFirst("KullanicilarId")?.Value;
                if (string.IsNullOrEmpty(kullaniciId))
                {
                    return BadRequest("Kullanıcı bilgisi bulunamadı");
                }

                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Include(t => t.musteri)
                    .FirstOrDefaultAsync(t => t.id == id);

                if (teklif == null)
                {
                    return NotFound("Poliçe teklifi bulunamadı");
                }

                // Müşterinin kendi teklifini reddettiğinden emin ol
                var musteri = await _context.MUSTERILERs
                    .FirstOrDefaultAsync(m => m.kullanici_id == int.Parse(kullaniciId));
                
                if (musteri == null || teklif.musteri_id != musteri.id)
                {
                    return Forbid("Bu teklifi reddetme yetkiniz yok");
                }

                // Reddedildi durum ID'si
                var reddedildiDurumId = _context.DURUM_TANIMLARIs
                    .FirstOrDefault(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.deger_kodu == "REDDEDILDI")?.id ?? 3;

                teklif.durum_id = reddedildiDurumId;
                teklif.red_nedeni = redNedeni;
                teklif.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();

                // Acente'ye bildirim gönder
                await SendNotificationToAcente(teklif.olusturan_kullanici_id, $"Müşteri {musteri.ad} {musteri.soyad} poliçe teklifi {teklif.teklif_no} reddetti. Nedeni: {redNedeni}");

                return Ok(new { message = "Poliçe teklifi reddedildi", teklif_no = teklif.teklif_no });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi reddedilirken hata oluştu: {ex.Message}");
            }
        }





        // Onaylanan teklifi poliçeye çevir
        [HttpPost("{id}/police-olustur")]
        public async Task<IActionResult> PoliceOlustur(int id)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Include(t => t.musteri)
                    .Include(t => t.police_turu)
                    .Include(t => t.sigorta_sirketi)
                    .Include(t => t.durum)
                    .FirstOrDefaultAsync(t => t.id == id);

                if (teklif == null)
                    return NotFound("Teklif bulunamadı");

                // Teklif onaylanmış mı kontrolü
                if (teklif.durum.deger_kodu != "ONAYLANDI")
                    return BadRequest("Sadece onaylanmış teklifler poliçeye çevrilebilir");

                // Aktif durum
                var aktifDurum = await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "POLISELER" && d.deger_kodu == "AKTIF");

                if (aktifDurum == null)
                    return StatusCode(500, "Aktif durumu bulunamadı");

                // Poliçe numarası oluştur
                var policeNo = await GeneratePoliceNo();

                // Poliçe oluştur
                var police = new POLISELER
                {
                    police_no = policeNo,
                    teklif_id = teklif.id,
                    musteri_id = teklif.musteri_id,
                    police_turu_id = teklif.police_turu_id,
                    sigorta_sirketi_id = teklif.sigorta_sirketi_id,
                    tanzim_eden_kullanici_id = teklif.olusturan_kullanici_id,
                    risk_bilgileri = teklif.risk_bilgileri,
                    teminat_bilgileri = teklif.teminat_bilgileri,
                    brut_prim = teklif.brut_prim,
                    net_prim = teklif.net_prim,
                    komisyon_tutari = teklif.komisyon_tutari,
                    vergi_tutari = teklif.vergi_tutari,
                    toplam_tutar = teklif.toplam_tutar,
                    taksit_sayisi = teklif.taksit_sayisi,
                    durum_id = aktifDurum.id,
                    baslangic_tarihi = DateTime.Now,
                    bitis_tarihi = DateTime.Now.AddYears(1), // Varsayılan 1 yıl
                    tanzim_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _context.POLISELERs.Add(police);
                await _context.SaveChangesAsync();

                // Müşteriye bildirim gönder
                await SendNotificationToCustomer(teklif.musteri_id, 
                    $"Poliçeniz oluşturuldu! Poliçe No: {police.police_no}");

                return Ok(new { 
                    message = "Poliçe başarıyla oluşturuldu",
                    police_no = police.police_no,
                    teklif_no = teklif.teklif_no
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe oluşturulurken hata oluştu: {ex.Message}");
            }
        }

        // PUT: api/PoliceTeklifleri/5
        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> UpdatePoliceTeklifi(int id, [FromBody] PoliceTeklifUpdateDto updateDto)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs.FindAsync(id);
                if (teklif == null)
                    return NotFound("Poliçe teklifi bulunamadı");

                // ACENTE sadece kendi tekliflerini güncelleyebilir
                if (User.IsInRole("ACENTE"))
                {
                    var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                    if (teklif.olusturan_kullanici_id != kullaniciId)
                        return Forbid("Bu teklifi güncelleme yetkiniz yok");
                }

                // İlişkili kayıt kontrolleri
                if (!await _context.MUSTERILERs.AnyAsync(m => m.id == updateDto.musteri_id))
                    return BadRequest("Müşteri bulunamadı");
                if (!await _context.POLICE_TURLERIs.AnyAsync(p => p.id == updateDto.police_turu_id))
                    return BadRequest("Poliçe türü bulunamadı");
                if (!await _context.SIGORTA_SIRKETLERIs.AnyAsync(s => s.id == updateDto.sigorta_sirketi_id))
                    return BadRequest("Sigorta şirketi bulunamadı");

                teklif.musteri_id = updateDto.musteri_id;
                teklif.police_turu_id = updateDto.police_turu_id;
                teklif.sigorta_sirketi_id = updateDto.sigorta_sirketi_id;
                teklif.risk_bilgileri = updateDto.risk_bilgileri;
                teklif.teminat_bilgileri = updateDto.teminat_bilgileri;
                teklif.brut_prim = updateDto.brut_prim;
                teklif.net_prim = updateDto.net_prim;
                teklif.komisyon_tutari = updateDto.komisyon_tutari;
                teklif.vergi_tutari = updateDto.vergi_tutari;
                teklif.toplam_tutar = updateDto.toplam_tutar;
                teklif.notlar = updateDto.notlar;
                teklif.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Teklif güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Poliçe teklifi güncellenirken hata oluştu: {ex.Message}");
            }
        }

        // DELETE: api/PoliceTeklifleri/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> DeletePoliceTeklifi(int id)
        {
            try
            {
                var teklif = await _context.POLICE_TEKLIFLERIs
                    .Include(t => t.POLISELERs)
                    .FirstOrDefaultAsync(t => t.id == id);
                if (teklif == null)
                    return NotFound(new { message = "Poliçe teklifi bulunamadı" });

                // ACENTE sadece kendi tekliflerini silebilir
                if (User.IsInRole("ACENTE"))
                {
                    var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                    if (teklif.olusturan_kullanici_id != kullaniciId)
                        return Forbid("Bu teklifi silme yetkiniz yok");
                }

                // Poliçeye dönüştürülmüş teklif silinemez
                if (teklif.POLISELERs != null && teklif.POLISELERs.Any())
                {
                    return BadRequest(new { message = "Poliçeye dönüştürülmüş teklifler silinemez" });
                }

                _context.POLICE_TEKLIFLERIs.Remove(teklif);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Teklif silindi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Poliçe teklifi silinirken hata oluştu: {ex.Message}" });
            }
        }

        // GET: api/PoliceTeklifleri/lookup-data
        [HttpGet("lookup-data")]
        public async Task<IActionResult> GetLookupData()
        {
            try
            {
                var policeTurleri = await _context.POLICE_TURLERIs
                    .Where(p => p.aktif_mi)
                    .OrderBy(p => p.urun_adi)
                    .Select(p => new { id = p.id, text = p.urun_adi })
                    .ToListAsync();

                var sigortaSirketleri = await _context.SIGORTA_SIRKETLERIs
                    .Where(s => s.aktif_mi)
                    .OrderBy(s => s.sirket_adi)
                    .Select(s => new { id = s.id, text = s.sirket_adi })
                    .ToListAsync();

                var durumlar = await _context.DURUM_TANIMLARIs
                    .Where(d => d.tablo_adi == "POLICE_TEKLIFLERI" && d.aktif_mi)
                    .OrderBy(d => d.siralama)
                    .Select(d => new { id = d.id, text = d.deger_aciklama, kod = d.deger_kodu })
                    .ToListAsync();

                return Ok(new
                {
                    police_turleri = policeTurleri,
                    sigorta_sirketleri = sigortaSirketleri,
                    durumlar = durumlar
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lookup verileri alınırken hata oluştu: {ex.Message}");
            }
        }

        // GET: api/PoliceTeklifleri/acente-istatistikler
        [HttpGet("acente-istatistikler")]
        [Authorize(Roles = "ACENTE")]
        public async Task<IActionResult> GetAcenteIstatistikleri()
        {
            try
            {
                var kullaniciId = int.Parse(User.FindFirst("KullanicilarId")?.Value ?? "0");
                if (kullaniciId == 0)
                {
                    return BadRequest("Kullanıcı bilgisi bulunamadı");
                }

                var bugun = DateTime.Today;
                var buAy = new DateTime(bugun.Year, bugun.Month, 1);

                var istatistikler = await _context.POLICE_TEKLIFLERIs
                    .Where(t => t.olusturan_kullanici_id == kullaniciId)
                    .GroupBy(t => 1)
                    .Select(g => new
                    {
                        toplam_teklif_sayisi = g.Count(),
                        bekleyen_teklif_sayisi = g.Count(t => t.durum.deger_kodu == "BEKLEMEDE"),
                        onaylanan_teklif_sayisi = g.Count(t => t.durum.deger_kodu == "ONAYLANDI"),
                        reddedilen_teklif_sayisi = g.Count(t => t.durum.deger_kodu == "REDDEDILDI"),
                        bu_ay_teklif_sayisi = g.Count(t => t.teklif_tarihi >= buAy),
                        toplam_prim_tutari = g.Sum(t => t.toplam_tutar ?? 0),
                        bu_ay_prim_tutari = g.Where(t => t.teklif_tarihi >= buAy).Sum(t => t.toplam_tutar ?? 0),
                        ortalama_teklif_tutari = g.Average(t => t.toplam_tutar ?? 0)
                    })
                    .FirstOrDefaultAsync();

                if (istatistikler == null)
                {
                    istatistikler = new
                    {
                        toplam_teklif_sayisi = 0,
                        bekleyen_teklif_sayisi = 0,
                        onaylanan_teklif_sayisi = 0,
                        reddedilen_teklif_sayisi = 0,
                        bu_ay_teklif_sayisi = 0,
                        toplam_prim_tutari = 0m,
                        bu_ay_prim_tutari = 0m,
                        ortalama_teklif_tutari = 0m
                    };
                }

                return Ok(istatistikler);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Acente istatistikleri alınırken hata oluştu: {ex.Message}");
            }
        }

        private async Task<string> GenerateTeklifNo()
        {
            var today = DateTime.Now.ToString("yyyyMMdd");
            var count = await _context.POLICE_TEKLIFLERIs
                .Where(t => t.teklif_no.StartsWith($"TKF{today}"))
                .CountAsync();
            
            return $"TKF{today}{(count + 1):D4}";
        }

        private async Task<string> GeneratePoliceNo()
        {
            var today = DateTime.Now.ToString("yyyyMMdd");
            var count = await _context.POLISELERs
                .Where(p => p.police_no.StartsWith($"PLC{today}"))
                .CountAsync();
            
            return $"PLC{today}{(count + 1):D4}";
        }

        private async Task SendNotificationToCustomer(int musteriId, string message)
        {
            try
            {
                var bildirim = new BILDIRIMLER
                {
                    musteri_id = musteriId,
                    baslik = "Poliçe Teklifi",
                    icerik = message,
                    okundu_mu = false,
                    gonderim_tarihi = DateTime.Now
                };

                _context.BILDIRIMLERs.Add(bildirim);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Bildirim gönderilemese bile işlem devam etsin
                Console.WriteLine($"Bildirim gönderilemedi: {ex.Message}");
            }
        }

        private async Task SendNotificationToAcente(int kullaniciId, string message)
        {
            try
            {
                var bildirim = new BILDIRIMLER
                {
                    alici_kullanici_id = kullaniciId,
                    baslik = "Poliçe Teklifi",
                    icerik = message,
                    okundu_mu = false,
                    gonderim_tarihi = DateTime.Now
                };

                _context.BILDIRIMLERs.Add(bildirim);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Bildirim gönderilemese bile işlem devam etsin
                Console.WriteLine($"Bildirim gönderilemedi: {ex.Message}");
            }
        }
    }
} 