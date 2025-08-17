using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;

namespace SigortaYonetimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ADMIN")]
    public class PoliceTurleriController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public PoliceTurleriController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // GET: api/PoliceTurleri
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PoliceTuruDto>>> GetPoliceTurleri(
            [FromQuery] int sayfa = 1,
            [FromQuery] int sayfa_boyutu = 10,
            [FromQuery] string? arama_metni = null,
            [FromQuery] bool? aktif_mi = null)
        {
            try
            {
                var query = _context.POLICE_TURLERIs
                    .AsQueryable();

                // Arama filtresi
                if (!string.IsNullOrEmpty(arama_metni))
                {
                    query = query.Where(p => 
                        (p.urun_adi != null && p.urun_adi.Contains(arama_metni)) || 
                        (p.urun_kodu != null && p.urun_kodu.Contains(arama_metni)) ||
                        (p.aciklama != null && p.aciklama.Contains(arama_metni)));
                }

                // Aktiflik filtresi
                if (aktif_mi.HasValue)
                {
                    query = query.Where(p => p.aktif_mi == aktif_mi.Value);
                }

                var toplam_kayit = await query.CountAsync();
                var toplam_sayfa = (int)Math.Ceiling((double)toplam_kayit / sayfa_boyutu);

                var policeTurleri = await query
                    .OrderBy(p => p.urun_adi)
                    .Skip((sayfa - 1) * sayfa_boyutu)
                    .Take(sayfa_boyutu)
                    .Select(p => new PoliceTuruDto
                    {
                        Id = p.id,
                        UrunAdi = p.urun_adi,
                        UrunKodu = p.urun_kodu,
                        Aciklama = p.aciklama,
                        ZorunluMi = p.zorunlu_mi,
                        MinTutar = p.min_tutar,
                        MaxTutar = p.max_tutar,
                        MinSureGun = p.min_sure_gun,
                        MaxSureGun = p.max_sure_gun,
                        RiskFaktorleri = p.risk_faktorleri,
                        AktifMi = p.aktif_mi,
                        OlusturmaTarihi = p.olusturma_tarihi
                    })
                    .ToListAsync();

                return Ok(new
                {
                    data = policeTurleri,
                    totalRecords = toplam_kayit,
                    totalPages = toplam_sayfa,
                    currentPage = sayfa,
                    pageSize = sayfa_boyutu
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türleri listelenirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/PoliceTurleri/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PoliceTuruDto>> GetPoliceTuru(int id)
        {
            try
            {
                var policeTuru = await _context.POLICE_TURLERIs
                    .Where(p => p.id == id)
                    .Select(p => new PoliceTuruDto
                    {
                        Id = p.id,
                        UrunAdi = p.urun_adi,
                        UrunKodu = p.urun_kodu,
                        Aciklama = p.aciklama,
                        ZorunluMi = p.zorunlu_mi,
                        MinTutar = p.min_tutar,
                        MaxTutar = p.max_tutar,
                        MinSureGun = p.min_sure_gun,
                        MaxSureGun = p.max_sure_gun,
                        RiskFaktorleri = p.risk_faktorleri,
                        AktifMi = p.aktif_mi,
                        OlusturmaTarihi = p.olusturma_tarihi
                    })
                    .FirstOrDefaultAsync();

                if (policeTuru == null)
                {
                    return NotFound(new { message = "Poliçe türü bulunamadı" });
                }

                return Ok(policeTuru);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türü getirilirken hata oluştu", error = ex.Message });
            }
        }

        // POST: api/PoliceTurleri
        [HttpPost]
        public async Task<ActionResult<PoliceTuruDto>> CreatePoliceTuru(PoliceTuruCreateDto createDto)
        {
            try
            {
                // Unique constraint kontrolü
                var mevcutKod = await _context.POLICE_TURLERIs
                    .AnyAsync(p => p.urun_kodu == createDto.UrunKodu);

                if (mevcutKod)
                {
                    return BadRequest(new { message = "Bu ürün kodu zaten mevcut" });
                }

                var yeniPoliceTuru = new POLICE_TURLERI
                {
                    urun_adi = createDto.UrunAdi,
                    urun_kodu = createDto.UrunKodu,
                    aciklama = createDto.Aciklama,
                    zorunlu_mi = createDto.ZorunluMi,
                    min_tutar = createDto.MinTutar,
                    max_tutar = createDto.MaxTutar,
                    min_sure_gun = createDto.MinSureGun,
                    max_sure_gun = createDto.MaxSureGun,
                    risk_faktorleri = createDto.RiskFaktorleri,
                    aktif_mi = createDto.AktifMi,
                    olusturma_tarihi = DateTime.Now
                };

                _context.POLICE_TURLERIs.Add(yeniPoliceTuru);
                await _context.SaveChangesAsync();

                var dto = new PoliceTuruDto
                {
                    Id = yeniPoliceTuru.id,
                    UrunAdi = yeniPoliceTuru.urun_adi,
                    UrunKodu = yeniPoliceTuru.urun_kodu,
                    Aciklama = yeniPoliceTuru.aciklama,
                    ZorunluMi = yeniPoliceTuru.zorunlu_mi,
                    MinTutar = yeniPoliceTuru.min_tutar,
                    MaxTutar = yeniPoliceTuru.max_tutar,
                    MinSureGun = yeniPoliceTuru.min_sure_gun,
                    MaxSureGun = yeniPoliceTuru.max_sure_gun,
                    RiskFaktorleri = yeniPoliceTuru.risk_faktorleri,
                    AktifMi = yeniPoliceTuru.aktif_mi,
                    OlusturmaTarihi = yeniPoliceTuru.olusturma_tarihi
                };

                return CreatedAtAction(nameof(GetPoliceTuru), new { id = dto.Id }, dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türü oluşturulurken hata oluştu", error = ex.Message });
            }
        }

        // PUT: api/PoliceTurleri/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePoliceTuru(int id, PoliceTuruUpdateDto updateDto)
        {
            try
            {
                var policeTuru = await _context.POLICE_TURLERIs.FindAsync(id);
                if (policeTuru == null)
                {
                    return NotFound(new { message = "Poliçe türü bulunamadı" });
                }

                // Unique constraint kontrolü
                var mevcutKod = await _context.POLICE_TURLERIs
                    .AnyAsync(p => p.urun_kodu == updateDto.UrunKodu && p.id != id);

                if (mevcutKod)
                {
                    return BadRequest(new { message = "Bu ürün kodu zaten mevcut" });
                }

                policeTuru.urun_adi = updateDto.UrunAdi;
                policeTuru.urun_kodu = updateDto.UrunKodu;
                policeTuru.aciklama = updateDto.Aciklama;
                policeTuru.zorunlu_mi = updateDto.ZorunluMi;
                policeTuru.min_tutar = updateDto.MinTutar;
                policeTuru.max_tutar = updateDto.MaxTutar;
                policeTuru.min_sure_gun = updateDto.MinSureGun;
                policeTuru.max_sure_gun = updateDto.MaxSureGun;
                policeTuru.risk_faktorleri = updateDto.RiskFaktorleri;
                policeTuru.aktif_mi = updateDto.AktifMi;

                await _context.SaveChangesAsync();
                return Ok(new { message = "Poliçe türü başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türü güncellenirken hata oluştu", error = ex.Message });
            }
        }

        // DELETE: api/PoliceTurleri/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePoliceTuru(int id)
        {
            try
            {
                var policeTuru = await _context.POLICE_TURLERIs.FindAsync(id);
                if (policeTuru == null)
                {
                    return NotFound(new { message = "Poliçe türü bulunamadı" });
                }

                // İlişkili kayıtları kontrol et
                var baglantiliPoliçeler = await _context.POLISELERs.AnyAsync(p => p.police_turu_id == id);
                if (baglantiliPoliçeler)
                {
                    return BadRequest(new { message = "Bu poliçe türüne bağlı aktif poliçeler var, silinemez" });
                }

                _context.POLICE_TURLERIs.Remove(policeTuru);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Poliçe türü başarıyla silindi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türü silinirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/PoliceTurleri/aktif - Sadece aktif türleri getir
        [HttpGet("aktif")]
        public async Task<ActionResult<IEnumerable<PoliceTuruDto>>> GetAktifPoliceTurleri()
        {
            try
            {
                var policeTurleri = await _context.POLICE_TURLERIs
                    .Where(p => p.aktif_mi == true)
                    .OrderBy(p => p.urun_adi)
                    .Select(p => new PoliceTuruDto
                    {
                        Id = p.id,
                        UrunAdi = p.urun_adi,
                        UrunKodu = p.urun_kodu,
                        Aciklama = p.aciklama,
                        ZorunluMi = p.zorunlu_mi,
                        MinTutar = p.min_tutar,
                        MaxTutar = p.max_tutar,
                        MinSureGun = p.min_sure_gun,
                        MaxSureGun = p.max_sure_gun,
                        RiskFaktorleri = p.risk_faktorleri,
                        AktifMi = p.aktif_mi,
                        OlusturmaTarihi = p.olusturma_tarihi
                    })
                    .ToListAsync();

                return Ok(new { data = policeTurleri });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Aktif poliçe türleri listelenirken hata oluştu", error = ex.Message });
            }
        }
    }
}