using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;

namespace SigortaYonetimAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeminatlarController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public TeminatlarController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // GET: api/Teminatlar
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TeminatListDto>>> GetTeminatlar(
            [FromQuery] int? policeTuruId = null,
            [FromQuery] bool? aktifMi = null)
        {
            try
            {
                var query = _context.TEMINATLARs
                    .Include(t => t.police_turu)
                    .AsQueryable();

                if (policeTuruId.HasValue)
                    query = query.Where(t => t.police_turu_id == policeTuruId.Value);

                if (aktifMi.HasValue)
                    query = query.Where(t => t.aktif_mi == aktifMi.Value);

                var teminatlar = await query
                    .Select(t => new TeminatListDto
                    {
                        id = t.id,
                        police_turu_id = t.police_turu_id,
                        teminat_adi = t.teminat_adi,
                        teminat_kodu = t.teminat_kodu,
                        aciklama = t.aciklama,
                        zorunlu_mu = t.zorunlu_mu,
                        min_teminat_tutari = t.min_teminat_tutari,
                        max_teminat_tutari = t.max_teminat_tutari,
                        varsayilan_teminat_tutari = t.varsayilan_teminat_tutari,
                        hesaplama_turu = t.hesaplama_turu,
                        prim_orani = t.prim_orani,
                        sabit_prim = t.sabit_prim,
                        aktif_mi = t.aktif_mi,
                        police_turu_adi = t.police_turu.urun_adi
                    })
                    .OrderBy(t => t.teminat_adi)
                    .ToListAsync();

                return Ok(new { data = teminatlar });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teminatlar listelenirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/Teminatlar/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TeminatDetayDto>> GetTeminat(int id)
        {
            try
            {
                var teminat = await _context.TEMINATLARs
                    .Include(t => t.police_turu)
                    .Where(t => t.id == id)
                    .Select(t => new TeminatDetayDto
                    {
                        id = t.id,
                        police_turu_id = t.police_turu_id,
                        police_turu_adi = t.police_turu.urun_adi,
                        teminat_adi = t.teminat_adi,
                        teminat_kodu = t.teminat_kodu,
                        aciklama = t.aciklama,
                        zorunlu_mu = t.zorunlu_mu,
                        min_teminat_tutari = t.min_teminat_tutari,
                        max_teminat_tutari = t.max_teminat_tutari,
                        varsayilan_teminat_tutari = t.varsayilan_teminat_tutari,
                        hesaplama_turu = t.hesaplama_turu,
                        prim_orani = t.prim_orani,
                        sabit_prim = t.sabit_prim,
                        aktif_mi = t.aktif_mi,
                        olusturma_tarihi = t.olusturma_tarihi,
                        guncelleme_tarihi = t.guncelleme_tarihi
                    })
                    .FirstOrDefaultAsync();

                if (teminat == null)
                    return NotFound(new { message = "Teminat bulunamadı" });

                return Ok(teminat);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teminat detayı alınırken hata oluştu", error = ex.Message });
            }
        }

        // POST: api/Teminatlar
        [HttpPost]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<TeminatDetayDto>> CreateTeminat(TeminatCreateDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Teminat kodu benzersizlik kontrolü
                var mevcutKod = await _context.TEMINATLARs
                    .AnyAsync(t => t.teminat_kodu == createDto.teminat_kodu);
                if (mevcutKod)
                    return BadRequest(new { message = "Bu teminat kodu zaten kullanılıyor" });

                var teminat = new TEMINATLAR
                {
                    police_turu_id = createDto.police_turu_id,
                    teminat_adi = createDto.teminat_adi,
                    teminat_kodu = createDto.teminat_kodu,
                    aciklama = createDto.aciklama,
                    zorunlu_mu = createDto.zorunlu_mu,
                    min_teminat_tutari = createDto.min_teminat_tutari,
                    max_teminat_tutari = createDto.max_teminat_tutari,
                    varsayilan_teminat_tutari = createDto.varsayilan_teminat_tutari,
                    hesaplama_turu = createDto.hesaplama_turu,
                    prim_orani = createDto.prim_orani,
                    sabit_prim = createDto.sabit_prim,
                    aktif_mi = createDto.aktif_mi,
                    olusturma_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _context.TEMINATLARs.Add(teminat);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetTeminat), new { id = teminat.id }, 
                    new { id = teminat.id, message = "Teminat başarıyla oluşturuldu" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teminat oluşturulurken hata oluştu", error = ex.Message });
            }
        }

        // PUT: api/Teminatlar/5
        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateTeminat(int id, TeminatUpdateDto updateDto)
        {
            try
            {
                if (id != updateDto.id)
                    return BadRequest(new { message = "ID uyumsuzluğu" });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var teminat = await _context.TEMINATLARs.FindAsync(id);
                if (teminat == null)
                    return NotFound(new { message = "Teminat bulunamadı" });

                // Teminat kodu benzersizlik kontrolü (kendisi hariç)
                var mevcutKod = await _context.TEMINATLARs
                    .AnyAsync(t => t.teminat_kodu == updateDto.teminat_kodu && t.id != id);
                if (mevcutKod)
                    return BadRequest(new { message = "Bu teminat kodu zaten kullanılıyor" });

                teminat.police_turu_id = updateDto.police_turu_id;
                teminat.teminat_adi = updateDto.teminat_adi;
                teminat.teminat_kodu = updateDto.teminat_kodu;
                teminat.aciklama = updateDto.aciklama;
                teminat.zorunlu_mu = updateDto.zorunlu_mu;
                teminat.min_teminat_tutari = updateDto.min_teminat_tutari;
                teminat.max_teminat_tutari = updateDto.max_teminat_tutari;
                teminat.varsayilan_teminat_tutari = updateDto.varsayilan_teminat_tutari;
                teminat.hesaplama_turu = updateDto.hesaplama_turu;
                teminat.prim_orani = updateDto.prim_orani;
                teminat.sabit_prim = updateDto.sabit_prim;
                teminat.aktif_mi = updateDto.aktif_mi;
                teminat.guncelleme_tarihi = DateTime.Now;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Teminat başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teminat güncellenirken hata oluştu", error = ex.Message });
            }
        }

        // DELETE: api/Teminatlar/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteTeminat(int id)
        {
            try
            {
                var teminat = await _context.TEMINATLARs.FindAsync(id);
                if (teminat == null)
                    return NotFound(new { message = "Teminat bulunamadı" });

                // Kullanımda olup olmadığını kontrol et
                var kullaniliyorMu = await _context.POLICE_TEMINATLARs.AnyAsync(pt => pt.teminat_id == id) ||
                                    await _context.TEKLIF_TEMINATLARs.AnyAsync(tt => tt.teminat_id == id);

                if (kullaniliyorMu)
                    return BadRequest(new { message = "Bu teminat kullanımda olduğu için silinemez. Pasif hale getirebilirsiniz." });

                _context.TEMINATLARs.Remove(teminat);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Teminat başarıyla silindi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Teminat silinirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/Teminatlar/PoliceTuru/5
        [HttpGet("PoliceTuru/{policeTuruId}")]
        public async Task<ActionResult<IEnumerable<TeminatListDto>>> GetPoliceTuruTeminatlar(int policeTuruId)
        {
            try
            {
                var teminatlar = await _context.TEMINATLARs
                    .Where(t => t.police_turu_id == policeTuruId && t.aktif_mi)
                    .Include(t => t.police_turu)
                    .Select(t => new TeminatListDto
                    {
                        id = t.id,
                        teminat_adi = t.teminat_adi,
                        teminat_kodu = t.teminat_kodu,
                        aciklama = t.aciklama,
                        zorunlu_mu = t.zorunlu_mu,
                        min_teminat_tutari = t.min_teminat_tutari,
                        max_teminat_tutari = t.max_teminat_tutari,
                        varsayilan_teminat_tutari = t.varsayilan_teminat_tutari,
                        hesaplama_turu = t.hesaplama_turu,
                        prim_orani = t.prim_orani,
                        sabit_prim = t.sabit_prim,
                        aktif_mi = t.aktif_mi,
                        police_turu_adi = t.police_turu.urun_adi
                    })
                    .OrderByDescending(t => t.zorunlu_mu)
                    .ThenBy(t => t.teminat_adi)
                    .ToListAsync();

                return Ok(teminatlar);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Poliçe türü teminatları alınırken hata oluştu", error = ex.Message });
            }
        }
    }
}
