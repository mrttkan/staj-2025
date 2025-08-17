using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using System.Security.Claims;

namespace SigortaYonetimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HasarController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public HasarController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // GET: api/Hasar
        [HttpGet]
        public async Task<IActionResult> GetHasarDosyalari([FromQuery] int? musteriId = null, [FromQuery] int? policeId = null)
        {
            var query = _context.HASAR_DOSYALARs
                .Include(h => h.police)
                .Include(h => h.musteri)
                .Include(h => h.durum)
                .AsQueryable();

            if (musteriId.HasValue)
                query = query.Where(h => h.musteri_id == musteriId.Value);
            if (policeId.HasValue)
                query = query.Where(h => h.police_id == policeId.Value);

            // KULLANICI rolü için sadece kendi hasarlarını göster
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole == "KULLANICI")
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userIdString))
                {
                    var musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.kullanici_id.ToString() == userIdString);
                    if (musteri != null)
                    {
                        query = query.Where(h => h.musteri_id == musteri.id);
                    }
                }
            }

            var hasarListRaw = await query
                .OrderByDescending(h => h.olusturma_tarihi)
                .Select(h => new {
                    h.id,
                    hasar_no = h.hasar_no,
                    police_no = h.police!.police_no,
                    musteri = h.musteri,
                    durum_adi = h.durum!.deger_aciklama,
                    h.olusturma_tarihi,
                    h.talep_edilen_tutar,
                    h.onaylanan_tutar
                })
                .ToListAsync();

            var hasarlar = hasarListRaw.Select(h => new HasarListDto
            {
                id = h.id,
                dosya_no = h.hasar_no ?? string.Empty,
                police_no = h.police_no ?? string.Empty,
                musteri_adi = h.musteri != null ?
                    ($"{h.musteri.ad} {h.musteri.soyad}").Trim()
                    : "",
                durum_adi = h.durum_adi ?? string.Empty,
                olusturma_tarihi = h.olusturma_tarihi,
                talep_edilen_tutar = h.talep_edilen_tutar,
                onaylanan_tutar = h.onaylanan_tutar
            }).ToList();

            return Ok(hasarlar);
        }

        // GET: api/Hasar/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetHasarDetay(int id)
        {
            var hasar = await _context.HASAR_DOSYALARs
                .Include(h => h.police)
                .Include(h => h.musteri)
                .Include(h => h.durum)
                .FirstOrDefaultAsync(h => h.id == id);
            
            if (hasar == null) return NotFound("Hasar dosyası bulunamadı");

            // Hasar takip notlarını ayrı sorgu ile al
            var notlar = await _context.HASAR_TAKIP_NOTLARIs
                .Where(n => n.hasar_id == id)
                .OrderByDescending(n => n.olusturma_tarihi)
                .ToListAsync();
            
            if (hasar == null) return NotFound("Hasar dosyası bulunamadı");

            // KULLANICI rolü için sadece kendi hasarlarını göster
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole == "KULLANICI")
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdString))
                {
                    return Forbid();
                }
                
                var musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.kullanici_id.ToString() == userIdString);
                if (musteri == null || hasar.musteri_id != musteri.id)
                {
                    return Forbid();
                }
            }

            var notlarDto = new List<HasarNotDto>();
            foreach (var not in notlar)
            {
                var kullanici = await _context.KULLANICILARs.FindAsync(not.kullanici_id);
                notlarDto.Add(new HasarNotDto
                {
                    id = not.id,
                    not_metni = not.not_metni,
                    kullanici_adi = kullanici != null ? $"{kullanici.ad} {kullanici.soyad}".Trim() : "Bilinmeyen Kullanıcı",
                    olusturma_tarihi = not.olusturma_tarihi
                });
            }

            var detay = new HasarDetayDto
            {
                id = hasar.id,
                dosya_no = hasar.hasar_no ?? string.Empty,
                police_id = hasar.police_id,
                police_no = hasar.police?.police_no ?? string.Empty,
                musteri_id = hasar.musteri_id,
                musteri_adi = hasar.musteri != null ? string.Join(" ", new[] { hasar.musteri.ad, hasar.musteri.soyad }.Where(x => !string.IsNullOrEmpty(x))) : string.Empty,
                durum_id = hasar.durum_id,
                durum_adi = hasar.durum?.deger_aciklama ?? string.Empty,
                olay_tarihi = hasar.olay_tarihi,
                olay_yeri_il = hasar.olay_yeri_il,
                olay_yeri_ilce = hasar.olay_yeri_ilce,
                olay_yeri_detay = hasar.olay_yeri_detay,
                olay_aciklamasi = hasar.olay_aciklamasi,
                talep_edilen_tutar = hasar.talep_edilen_tutar,
                onaylanan_tutar = hasar.onaylanan_tutar,
                red_nedeni = hasar.red_nedeni,
                notlar = hasar.notlar,
                olusturma_tarihi = hasar.olusturma_tarihi,
                guncelleme_tarihi = hasar.guncelleme_tarihi,
                notlar_listesi = notlarDto
            };
            return Ok(detay);
        }

        // POST: api/Hasar
        [HttpPost]
        public async Task<IActionResult> CreateHasar([FromBody] HasarCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (dto.talep_edilen_tutar.HasValue && dto.talep_edilen_tutar < 0)
                return BadRequest("Talep edilen tutar negatif olamaz.");

            var police = await _context.POLISELERs.FindAsync(dto.police_id);
            if (police == null) return BadRequest("Poliçe bulunamadı");

            // KULLANICI rolü için sadece kendi poliçelerine hasar bildirebilir
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole == "KULLANICI")
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdString))
                {
                    return BadRequest("Kullanıcı kimliği bulunamadı.");
                }
                
                // KullanicilarId claim'ini kontrol et (JWT'de mevcut)
                MUSTERILER? musteri = null;
                var kullanicilarIdClaim4 = User.FindFirst("KullanicilarId")?.Value;
                if (int.TryParse(kullanicilarIdClaim4, out int kullanicilarId4))
                {
                    Console.WriteLine($"Debug - KullanicilarId claim'den: {kullanicilarId4}");
                    musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.kullanici_id == kullanicilarId4);
                    if (musteri != null)
                    {
                        Console.WriteLine($"Debug - Müşteri bulundu (KullanicilarId ile): {musteri.id}");
                    }
                }
                
                // Eğer KullanicilarId ile bulunamazsa, email ile dene
                if (musteri == null)
                {
                    var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                    if (!string.IsNullOrEmpty(userEmail))
                    {
                        Console.WriteLine($"Debug - Email ile aranıyor: {userEmail}");
                        musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.eposta == userEmail);
                        if (musteri != null)
                        {
                            Console.WriteLine($"Debug - Müşteri bulundu (email ile): {musteri.id}");
                        }
                    }
                }
                
                if (musteri == null)
                {
                    return BadRequest($"Müşteri bulunamadı. Kullanıcı ID: {userIdString}");
                }
                
                if (police.musteri_id != musteri.id)
                {
                    return BadRequest($"Bu poliçeye hasar bildiremezsiniz. Poliçe müşteri ID: {police.musteri_id}, Sizin müşteri ID: {musteri.id}");
                }
            }

            var bekleyenDurumId = _context.DURUM_TANIMLARIs.FirstOrDefault(d => d.tablo_adi == "HASAR_DOSYALAR" && d.deger_kodu == "BEKLEMEDE")?.id ?? 1;
            var hasarNo = await GenerateHasarNo();

            // Kullanıcı ID'sini al
            int bildirenKullaniciId = 0;
            var kullanicilarIdClaim = User.FindFirst("KullanicilarId")?.Value;
            if (int.TryParse(kullanicilarIdClaim, out int kullanicilarId))
            {
                bildirenKullaniciId = kullanicilarId;
            }
            else
            {
                // Eğer KullanicilarId yoksa, email ile kullanıcıyı bul
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                if (!string.IsNullOrEmpty(userEmail))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.eposta == userEmail);
                    if (kullanici != null)
                    {
                        bildirenKullaniciId = kullanici.id;
                    }
                }
            }

            var hasar = new HASAR_DOSYALAR
            {
                hasar_no = hasarNo,
                police_id = dto.police_id,
                musteri_id = police.musteri_id,
                bildiren_kullanici_id = bildirenKullaniciId,
                olay_tarihi = dto.olay_tarihi,
                olay_yeri_detay = dto.olay_yeri,
                olay_aciklamasi = dto.olay_aciklamasi,
                durum_id = bekleyenDurumId,
                talep_edilen_tutar = dto.talep_edilen_tutar,
                notlar = dto.notlar,
                bildirim_tarihi = DateTime.Now,
                olusturma_tarihi = DateTime.Now,
                guncelleme_tarihi = DateTime.Now
            };
            
            _context.HASAR_DOSYALARs.Add(hasar);
            await _context.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetHasarDetay), new { id = hasar.id }, new { id = hasar.id, hasar_no = hasar.hasar_no });
        }

        // PUT: api/Hasar/5/durum
        [HttpPut("{id}/durum")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> UpdateHasarDurum(int id, [FromBody] HasarDurumUpdateDto dto)
        {
            var hasar = await _context.HASAR_DOSYALARs.FindAsync(id);
            if (hasar == null) return NotFound("Hasar dosyası bulunamadı");
            
            hasar.durum_id = dto.durum_id;
            hasar.onaylanan_tutar = dto.onaylanan_tutar;
            hasar.red_nedeni = dto.red_nedeni;
            hasar.notlar = dto.notlar;
            hasar.guncelleme_tarihi = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Hasar durumu güncellendi" });
        }

        // POST: api/Hasar/5/not
        [HttpPost("{id}/not")]
        public async Task<IActionResult> AddHasarNot(int id, [FromBody] HasarNotCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var hasar = await _context.HASAR_DOSYALARs.FindAsync(id);
            if (hasar == null) return NotFound("Hasar dosyası bulunamadı");

            // KULLANICI rolü için sadece kendi hasarlarına not ekleyebilir
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole == "KULLANICI")
            {
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdString))
                {
                    return Forbid();
                }
                
                var musteri = await _context.MUSTERILERs.FirstOrDefaultAsync(m => m.kullanici_id.ToString() == userIdString);
                if (musteri == null || hasar.musteri_id != musteri.id)
                {
                    return Forbid();
                }
            }

            // Kullanıcı ID'sini al
            int kullaniciId = 0;
            var kullanicilarIdClaim2 = User.FindFirst("KullanicilarId")?.Value;
            if (int.TryParse(kullanicilarIdClaim2, out int kullanicilarId2))
            {
                kullaniciId = kullanicilarId2;
            }
            else
            {
                // Eğer KullanicilarId yoksa, email ile kullanıcıyı bul
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                if (!string.IsNullOrEmpty(userEmail))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.eposta == userEmail);
                    if (kullanici != null)
                    {
                        kullaniciId = kullanici.id;
                    }
                }
            }

            var not = new HASAR_TAKIP_NOTLARI
            {
                hasar_id = id,
                kullanici_id = kullaniciId,
                not_metni = dto.not_metni,
                olusturma_tarihi = DateTime.Now
            };

            _context.HASAR_TAKIP_NOTLARIs.Add(not);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Not eklendi" });
        }

        // GET: api/Hasar/5/dosyalar
        [HttpGet("{id}/dosyalar")]
        public IActionResult GetHasarDosyalari(int id)
        {
            return Ok(new List<object>());
        }

        // POST: api/Hasar/5/dosya-yukle
        [HttpPost("{id}/dosya-yukle")]
        public IActionResult UploadHasarDosyasi(int id, [FromForm] IFormFile dosya, [FromForm] string? aciklama = null)
        {
            return BadRequest("Dosya yükleme özelliği şu anda kullanılamıyor.");
        }

        // DELETE: api/Hasar/dosya/5
        [HttpDelete("dosya/{dosyaId}")]
        public IActionResult DeleteHasarDosyasi(int dosyaId)
        {
            return BadRequest("Dosya silme özelliği şu anda kullanılamıyor.");
        }

        // DELETE: api/Hasar/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN,ACENTE")]
        public async Task<IActionResult> DeleteHasar(int id)
        {
            var hasar = await _context.HASAR_DOSYALARs.FindAsync(id);

            if (hasar == null) return NotFound("Hasar dosyası bulunamadı");

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                
                try
                {
                    // Önce ilişkili notları sil
                    var notlar = await _context.HASAR_TAKIP_NOTLARIs
                        .Where(n => n.hasar_id == id)
                        .ToListAsync();
                    
                    if (notlar.Any())
                    {
                        _context.HASAR_TAKIP_NOTLARIs.RemoveRange(notlar);
                        await _context.SaveChangesAsync();
                    }

                    // Sonra hasar kaydını sil
                    _context.HASAR_DOSYALARs.Remove(hasar);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    return Ok(new { message = "Hasar dosyası başarıyla silindi" });
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Hasar silinirken hata oluştu", error = ex.Message });
            }
        }

        private async Task<string> GenerateHasarNo()
        {
            var yil = DateTime.Now.Year.ToString();
            var prefix = $"HSR{yil}";
            var sonNo = await _context.HASAR_DOSYALARs
                .Where(h => !string.IsNullOrEmpty(h.hasar_no) && h.hasar_no.StartsWith(prefix))
                .Select(h => h.hasar_no)
                .OrderByDescending(h => h)
                .FirstOrDefaultAsync();
            int siradakiNo = 1;
            if (!string.IsNullOrEmpty(sonNo))
            {
                var noKismi = sonNo.Substring(prefix.Length);
                if (int.TryParse(noKismi, out int mevcutNo))
                {
                    siradakiNo = mevcutNo + 1;
                }
            }
            return $"{prefix}{siradakiNo:D6}";
        }
    }
} 