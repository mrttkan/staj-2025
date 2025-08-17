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
    public class OdemelerController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public OdemelerController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // Tüm ödemeleri getir (pagination ve arama ile)
        [HttpGet]
        public async Task<ActionResult<object>> GetOdemeler(
            [FromQuery] int sayfa = 1,
            [FromQuery] int sayfa_boyutu = 10,
            [FromQuery] string? arama_metni = null)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.ODEMELERs
                .Include(o => o.police)
                .Include(o => o.musteri)
                .Include(o => o.durum)
                .Include(o => o.taksit)
                .AsQueryable();

            if (userRole == "USER")
            {
                var user = await _context.Users.FindAsync(int.Parse(userId ?? "0"));
                if (user?.KullanicilarId != null)
                {
                    query = query.Where(o => o.musteri.kullanici_id == user.KullanicilarId);
                }
            }

            // Arama filtresi
            if (!string.IsNullOrEmpty(arama_metni))
            {
                query = query.Where(o => 
                    (o.odeme_no ?? "").Contains(arama_metni) ||
                    (o.police != null && o.police.police_no != null && o.police.police_no.Contains(arama_metni)) ||
                    (o.musteri != null && ((o.musteri.ad ?? "") + " " + (o.musteri.soyad ?? "")).Contains(arama_metni))
                );
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / sayfa_boyutu);

            var odemeListRaw = await query
                .Skip((sayfa - 1) * sayfa_boyutu)
                .Take(sayfa_boyutu)
                .Select(o => new {
                    o.id,
                    o.odeme_no,
                    o.police_id,
                    police_no = o.police != null ? (o.police.police_no ?? string.Empty) : string.Empty,
                    o.musteri_id,
                    musteri = o.musteri,
                    o.odeme_turu,
                    o.odeme_yontemi_detay,
                    o.tutar,
                    o.durum_id,
                    durum_adi = o.durum.deger_aciklama,
                    o.odeme_tarihi,
                    o.vade_tarihi,
                    o.aciklama,
                    o.tahsilat_yapan_kullanici
                })
                .ToListAsync();

            var odemeler = odemeListRaw.Select(o => new {
                id = o.id,
                odeme_no = o.odeme_no,
                police_no = o.police_no,
                musteri_adi = o.musteri != null ? ((o.musteri.ad ?? "") + " " + (o.musteri.soyad ?? "")).Trim() : string.Empty,
                odeme_turu = o.odeme_turu,
                odeme_yontemi_detay = o.odeme_yontemi_detay,
                tutar = o.tutar,
                durum_adi = o.durum_adi,
                odeme_tarihi = o.odeme_tarihi,
                vade_tarihi = o.vade_tarihi,
                aciklama = o.aciklama,
                tahsilat_yapan_kullanici = o.tahsilat_yapan_kullanici
            }).ToList();

            return Ok(new {
                odemeler,
                toplam_kayit = totalCount,
                toplam_sayfa = totalPages,
                mevcut_sayfa = sayfa
            });
        }

        // Belirli bir ödemeyi getir
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetOdeme(int id)
        {
            var odeme = await _context.ODEMELERs
                .Include(o => o.police)
                .Include(o => o.musteri)
                .Include(o => o.durum)
                .Include(o => o.taksit)
                .FirstOrDefaultAsync(o => o.id == id);

            if (odeme == null)
            {
                return NotFound("Ödeme bulunamadı");
            }

            return Ok(new {
                id = odeme.id,
                odeme_no = odeme.odeme_no,
                police_id = odeme.police_id,
                police_no = odeme.police?.police_no,
                musteri_id = odeme.musteri_id,
                musteri_adi = odeme.musteri != null ? ((odeme.musteri.ad ?? "") + " " + (odeme.musteri.soyad ?? "")).Trim() : string.Empty,
                odeme_turu = odeme.odeme_turu,
                odeme_yontemi_detay = odeme.odeme_yontemi_detay,
                tutar = odeme.tutar,
                durum_id = odeme.durum_id,
                durum_adi = odeme.durum?.deger_aciklama,
                odeme_tarihi = odeme.odeme_tarihi,
                vade_tarihi = odeme.vade_tarihi,
                aciklama = odeme.aciklama,
                tahsilat_yapan_kullanici = odeme.tahsilat_yapan_kullanici
            });
        }

        // Yeni ödeme oluştur
        [HttpPost]
        public async Task<ActionResult<object>> CreateOdeme([FromBody] OdemeDto odemeDto)
        {
            try
            {
                // Müşteri kontrolü
                var musteri = await _context.MUSTERILERs.FindAsync(odemeDto.MusteriId);
                if (musteri == null)
                {
                    return BadRequest("Müşteri bulunamadı");
                }

                // Poliçe kontrolü (eğer poliçe no verilmişse)
                int? policeId = null;
                if (!string.IsNullOrEmpty(odemeDto.PoliceNo))
                {
                    var police = await _context.POLISELERs.FirstOrDefaultAsync(p => p.police_no == odemeDto.PoliceNo);
                    if (police != null)
                    {
                        policeId = police.id;
                    }
                }

                var odeme = new ODEMELER
                {
                    odeme_no = GenerateOdemeNo(),
                    police_id = policeId,
                    musteri_id = odemeDto.MusteriId,
                    odeme_turu = odemeDto.OdemeTuru ?? "MANUEL",
                    odeme_yontemi_detay = odemeDto.OdemeTuru ?? "NAKIT",
                    tutar = odemeDto.Tutar,
                    durum_id = 1, // Varsayılan: Beklemede
                    odeme_tarihi = odemeDto.OdemeTarihi,
                    vade_tarihi = odemeDto.VadeTarihi,
                    aciklama = odemeDto.Aciklama,
                    tahsilat_yapan_kullanici_id = null,
                    olusturma_tarihi = DateTime.Now
                };

                _context.ODEMELERs.Add(odeme);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Ödeme başarıyla oluşturuldu",
                    odeme_no = odeme.odeme_no,
                    id = odeme.id
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Ödeme oluşturulurken hata oluştu: {ex.Message}");
            }
        }

        // Ödeme güncelle
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateOdeme(int id, [FromBody] OdemeDto odemeDto)
        {
            try
            {
                var odeme = await _context.ODEMELERs.FindAsync(id);
                if (odeme == null)
                {
                    return NotFound("Ödeme bulunamadı");
                }

                // Müşteri kontrolü
                var musteri = await _context.MUSTERILERs.FindAsync(odemeDto.MusteriId);
                if (musteri == null)
                {
                    return BadRequest("Müşteri bulunamadı");
                }

                // Poliçe kontrolü (eğer poliçe no verilmişse)
                int? policeId = null;
                if (!string.IsNullOrEmpty(odemeDto.PoliceNo))
                {
                    var police = await _context.POLISELERs.FirstOrDefaultAsync(p => p.police_no == odemeDto.PoliceNo);
                    if (police != null)
                    {
                        policeId = police.id;
                    }
                }

                odeme.police_id = policeId;
                odeme.musteri_id = odemeDto.MusteriId;
                odeme.odeme_turu = odemeDto.OdemeTuru ?? odeme.odeme_turu;
                odeme.odeme_yontemi_detay = odemeDto.OdemeTuru ?? odeme.odeme_yontemi_detay;
                odeme.tutar = odemeDto.Tutar;
                odeme.odeme_tarihi = odemeDto.OdemeTarihi;
                odeme.vade_tarihi = odemeDto.VadeTarihi;
                odeme.aciklama = odemeDto.Aciklama;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Ödeme başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Ödeme güncellenirken hata oluştu: {ex.Message}");
            }
        }

        // Ödeme durumunu güncelle
        [HttpPatch("{id}/durum")]
        public async Task<ActionResult<object>> UpdateOdemeDurum(int id, [FromBody] int yeniDurumId)
        {
            try
            {
                var odeme = await _context.ODEMELERs.FindAsync(id);
                if (odeme == null)
                {
                    return NotFound("Ödeme bulunamadı");
                }

                odeme.durum_id = yeniDurumId;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Ödeme durumu başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Ödeme durumu güncellenirken hata oluştu: {ex.Message}");
            }
        }

        // Ödeme sil
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteOdeme(int id)
        {
            try
            {
                var odeme = await _context.ODEMELERs.FindAsync(id);
                if (odeme == null)
                {
                    return NotFound("Ödeme bulunamadı");
                }

                _context.ODEMELERs.Remove(odeme);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Ödeme başarıyla silindi" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Ödeme silinirken hata oluştu: {ex.Message}");
            }
        }

        // Ödeme numarası oluştur
        private string GenerateOdemeNo()
        {
            var date = DateTime.Now.ToString("yyyyMMdd");
            var random = new Random();
            var randomPart = random.Next(1000, 9999).ToString();
            return $"ODM{date}{randomPart}";
        }
    }
}
