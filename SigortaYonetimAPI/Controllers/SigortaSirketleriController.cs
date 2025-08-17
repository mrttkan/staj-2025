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
    public class SigortaSirketleriController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;

        public SigortaSirketleriController(SigortaYonetimDbContext context)
        {
            _context = context;
        }

        // GET: api/SigortaSirketleri
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SigortaSirketiDto>>> GetSigortaSirketleri(
            [FromQuery] int sayfa = 1,
            [FromQuery] int sayfa_boyutu = 10,
            [FromQuery] string? arama_metni = null,
            [FromQuery] bool? aktif_mi = null)
        {
            try
            {
                var query = _context.SIGORTA_SIRKETLERIs.AsQueryable();

                // Arama filtresi
                if (!string.IsNullOrEmpty(arama_metni))
                {
                    query = query.Where(s => 
                        (s.sirket_adi != null && s.sirket_adi.Contains(arama_metni)) || 
                        (s.sirket_kodu != null && s.sirket_kodu.Contains(arama_metni)) ||
                        (s.vergi_no != null && s.vergi_no.Contains(arama_metni)));
                }

                // Aktiflik filtresi
                if (aktif_mi.HasValue)
                {
                    query = query.Where(s => s.aktif_mi == aktif_mi.Value);
                }

                var toplam_kayit = await query.CountAsync();
                var toplam_sayfa = (int)Math.Ceiling((double)toplam_kayit / sayfa_boyutu);

                var sigortaSirketleri = await query
                    .OrderBy(s => s.sirket_adi)
                    .Skip((sayfa - 1) * sayfa_boyutu)
                    .Take(sayfa_boyutu)
                    .Select(s => new SigortaSirketiDto
                    {
                        Id = s.id,
                        SirketAdi = s.sirket_adi,
                        SirketKodu = s.sirket_kodu,
                        VergiNo = s.vergi_no,
                        Telefon = s.telefon,
                        Eposta = s.eposta,
                        Adres = s.adres,
                        AktifMi = s.aktif_mi,
                        KomisyonOrani = s.komisyon_orani,
                        SozlesmeBaslangic = s.sozlesme_baslangic,
                        SozlesmeBitis = s.sozlesme_bitis
                    })
                    .ToListAsync();

                return Ok(new
                {
                    data = sigortaSirketleri,
                    totalRecords = toplam_kayit,
                    totalPages = toplam_sayfa,
                    currentPage = sayfa,
                    pageSize = sayfa_boyutu
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sigorta şirketleri listelenirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/SigortaSirketleri/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SigortaSirketiDto>> GetSigortaSirketi(int id)
        {
            try
            {
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs
                    .Where(s => s.id == id)
                    .Select(s => new SigortaSirketiDto
                    {
                        Id = s.id,
                        SirketAdi = s.sirket_adi,
                        SirketKodu = s.sirket_kodu,
                        VergiNo = s.vergi_no,
                        Telefon = s.telefon,
                        Eposta = s.eposta,
                        Adres = s.adres,
                        AktifMi = s.aktif_mi,
                        KomisyonOrani = s.komisyon_orani,
                        SozlesmeBaslangic = s.sozlesme_baslangic,
                        SozlesmeBitis = s.sozlesme_bitis
                    })
                    .FirstOrDefaultAsync();

                if (sigortaSirketi == null)
                {
                    return NotFound(new { message = "Sigorta şirketi bulunamadı" });
                }

                return Ok(sigortaSirketi);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sigorta şirketi getirilirken hata oluştu", error = ex.Message });
            }
        }

        // POST: api/SigortaSirketleri
        [HttpPost]
        public async Task<ActionResult<SigortaSirketiDto>> CreateSigortaSirketi(SigortaSirketiCreateDto createDto)
        {
            try
            {
                // Şirket kodu benzersizlik kontrolü
                if (await _context.SIGORTA_SIRKETLERIs.AnyAsync(s => s.sirket_kodu == createDto.SirketKodu))
                {
                    return BadRequest(new { message = "Bu şirket kodu zaten kullanılıyor" });
                }

                var sigortaSirketi = new SIGORTA_SIRKETLERI
                {
                    sirket_adi = createDto.SirketAdi,
                    sirket_kodu = createDto.SirketKodu,
                    vergi_no = createDto.VergiNo,
                    telefon = createDto.Telefon,
                    eposta = createDto.Eposta,
                    adres = createDto.Adres,
                    aktif_mi = createDto.AktifMi,
                    komisyon_orani = createDto.KomisyonOrani,
                    sozlesme_baslangic = createDto.SozlesmeBaslangic,
                    sozlesme_bitis = createDto.SozlesmeBitis
                };

                _context.SIGORTA_SIRKETLERIs.Add(sigortaSirketi);
                await _context.SaveChangesAsync();

                var result = new SigortaSirketiDto
                {
                    Id = sigortaSirketi.id,
                    SirketAdi = sigortaSirketi.sirket_adi,
                    SirketKodu = sigortaSirketi.sirket_kodu,
                    VergiNo = sigortaSirketi.vergi_no,
                    Telefon = sigortaSirketi.telefon,
                    Eposta = sigortaSirketi.eposta,
                    Adres = sigortaSirketi.adres,
                    AktifMi = sigortaSirketi.aktif_mi,
                    KomisyonOrani = sigortaSirketi.komisyon_orani,
                    SozlesmeBaslangic = sigortaSirketi.sozlesme_baslangic,
                    SozlesmeBitis = sigortaSirketi.sozlesme_bitis
                };

                return CreatedAtAction(nameof(GetSigortaSirketi), new { id = sigortaSirketi.id }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sigorta şirketi oluşturulurken hata oluştu", error = ex.Message });
            }
        }

        // PUT: api/SigortaSirketleri/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSigortaSirketi(int id, SigortaSirketiUpdateDto updateDto)
        {
            try
            {
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs.FindAsync(id);
                if (sigortaSirketi == null)
                {
                    return NotFound(new { message = "Sigorta şirketi bulunamadı" });
                }

                // Şirket kodu benzersizlik kontrolü (kendi ID'si hariç)
                if (await _context.SIGORTA_SIRKETLERIs.AnyAsync(s => s.sirket_kodu == updateDto.SirketKodu && s.id != id))
                {
                    return BadRequest(new { message = "Bu şirket kodu zaten kullanılıyor" });
                }

                sigortaSirketi.sirket_adi = updateDto.SirketAdi;
                sigortaSirketi.sirket_kodu = updateDto.SirketKodu;
                sigortaSirketi.vergi_no = updateDto.VergiNo;
                sigortaSirketi.telefon = updateDto.Telefon;
                sigortaSirketi.eposta = updateDto.Eposta;
                sigortaSirketi.adres = updateDto.Adres;
                sigortaSirketi.aktif_mi = updateDto.AktifMi;
                sigortaSirketi.komisyon_orani = updateDto.KomisyonOrani;
                sigortaSirketi.sozlesme_baslangic = updateDto.SozlesmeBaslangic;
                sigortaSirketi.sozlesme_bitis = updateDto.SozlesmeBitis;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Sigorta şirketi başarıyla güncellendi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sigorta şirketi güncellenirken hata oluştu", error = ex.Message });
            }
        }

        // DELETE: api/SigortaSirketleri/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSigortaSirketi(int id)
        {
            try
            {
                var sigortaSirketi = await _context.SIGORTA_SIRKETLERIs.FindAsync(id);
                if (sigortaSirketi == null)
                {
                    return NotFound(new { message = "Sigorta şirketi bulunamadı" });
                }

                // İlişkili poliçe kontrolü
                var hasPolicies = await _context.POLISELERs.AnyAsync(p => p.sigorta_sirketi_id == id);
                if (hasPolicies)
                {
                    return BadRequest(new { message = "Bu sigorta şirketine ait poliçeler bulunduğu için silinemez" });
                }

                // İlişkili teklif kontrolü
                var hasOffers = await _context.POLICE_TEKLIFLERIs.AnyAsync(t => t.sigorta_sirketi_id == id);
                if (hasOffers)
                {
                    return BadRequest(new { message = "Bu sigorta şirketine ait teklifler bulunduğu için silinemez" });
                }

                _context.SIGORTA_SIRKETLERIs.Remove(sigortaSirketi);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Sigorta şirketi başarıyla silindi" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sigorta şirketi silinirken hata oluştu", error = ex.Message });
            }
        }

        // GET: api/SigortaSirketleri/aktif
        [HttpGet("aktif")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<SigortaSirketiDto>>> GetAktifSigortaSirketleri()
        {
            try
            {
                var aktifSirketler = await _context.SIGORTA_SIRKETLERIs
                    .Where(s => s.aktif_mi)
                    .OrderBy(s => s.sirket_adi)
                    .Select(s => new SigortaSirketiDto
                    {
                        Id = s.id,
                        SirketAdi = s.sirket_adi,
                        SirketKodu = s.sirket_kodu,
                        VergiNo = s.vergi_no,
                        Telefon = s.telefon,
                        Eposta = s.eposta,
                        Adres = s.adres,
                        AktifMi = s.aktif_mi,
                        KomisyonOrani = s.komisyon_orani,
                        SozlesmeBaslangic = s.sozlesme_baslangic,
                        SozlesmeBitis = s.sozlesme_bitis
                    })
                    .ToListAsync();

                return Ok(aktifSirketler);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Aktif sigorta şirketleri listelenirken hata oluştu", error = ex.Message });
            }
        }
    }
} 