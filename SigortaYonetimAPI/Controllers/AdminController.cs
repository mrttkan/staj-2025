using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using SigortaYonetimAPI.Services;
using System.Diagnostics;
using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly SigortaYonetimDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IPasswordValidationService _passwordValidationService;

        public AdminController(
            SigortaYonetimDbContext context,
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            IPasswordValidationService passwordValidationService)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
            _passwordValidationService = passwordValidationService;
        }

        // Müşteri kaydı olmayan KULLANICI rolündeki kullanıcıları getir
        [HttpGet("users/non-customers")]
        public async Task<ActionResult<object>> GetNonCustomerUsers()
        {
            try
            {
                // KULLANICI rolündeki kullanıcıları bul
                var kullaniciRoleId = await _context.Roles
                    .Where(r => r.Name == "KULLANICI")
                    .Select(r => r.Id)
                    .FirstOrDefaultAsync();

                if (string.IsNullOrEmpty(kullaniciRoleId))
                {
                    return Ok(new List<object>()); // KULLANICI rolü yoksa boş liste döndür
                }

                // KULLANICI rolüne sahip ApplicationUser'ları al
                var kullaniciRolundekiUserIds = await _context.UserRoles
                    .Where(ur => ur.RoleId == kullaniciRoleId)
                    .Select(ur => ur.UserId)
                    .ToListAsync();

                var nonCustomerUsers = await (from k in _context.KULLANICILARs
                                             join au in _context.ApplicationUsers on k.eposta equals au.Email
                                             where kullaniciRolundekiUserIds.Contains(au.Id) &&
                                                   !_context.MUSTERILERs.Any(m => m.kullanici_id == k.id || m.eposta == k.eposta)
                                             select new
                                             {
                                                 id = k.id.ToString(),
                                                 email = k.eposta,
                                                 ad = k.ad,
                                                 soyad = k.soyad,
                                                 telefon = k.telefon
                                             }).ToListAsync();

                return Ok(nonCustomerUsers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Müşteri olmayan KULLANICI rolündeki kullanıcılar alınırken hata oluştu.", error = ex.Message });
            }
        }

        // KULLANICILAR tablosundan kullanıcı listesi (Filtreleme ve sayfalama ile)
        [HttpGet("users")]
        public async Task<ActionResult<object>> GetUsers(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? role = null,
            [FromQuery] bool? active = null)
        {
            try
            {
                var query = _context.KULLANICILARs
                    .Include(k => k.durum)
                    .AsQueryable();

                // Arama filtresi
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(k => 
                        (k.ad ?? "").Contains(search) || 
                        (k.soyad ?? "").Contains(search) || 
                        (k.eposta ?? "").Contains(search) ||
                        (k.telefon ?? "").Contains(search));
                }

                // Aktiflik filtresi
                if (active.HasValue)
                {
                    if (active.Value)
                    {
                        query = query.Where(k => k.durum.deger_kodu == "AKTIF");
                    }
                    else
                    {
                        query = query.Where(k => k.durum.deger_kodu != "AKTIF");
                    }
                }

                var totalCount = await query.CountAsync();
                var users = await query
                    .OrderByDescending(k => k.kayit_tarihi)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var userList = new List<object>();
                foreach (var kullanici in users)
                {
                    // ApplicationUser tablosundan rol bilgisini al
                    var applicationUser = await _context.ApplicationUsers
                        .FirstOrDefaultAsync(u => u.Email == kullanici.eposta);
                    
                    var roles = new List<string>();
                    if (applicationUser != null)
                    {
                        roles = (await _userManager.GetRolesAsync(applicationUser)).ToList();
                    }
                    
                    // Rol filtresi uygula
                    if (!string.IsNullOrEmpty(role) && !roles.Contains(role))
                        continue;

                    userList.Add(new
                    {
                        id = kullanici.id.ToString(),
                        userName = kullanici.eposta,
                        email = kullanici.eposta,
                        tamAd = $"{kullanici.ad} {kullanici.soyad}",
                        roles = roles,
                        hesapKilitlenmeTarihi = kullanici.durum.deger_kodu == "KILITLI" ? (DateTime?)kullanici.guncelleme_tarihi : null,
                        emailDogrulandi = kullanici.email_dogrulandi,
                        sonGirisTarihi = applicationUser?.SonGirisTarihi,
                        aktifMi = kullanici.durum.deger_kodu == "AKTIF",
                        pozisyon = applicationUser?.Pozisyon,
                        departman = applicationUser?.Departman,
                        telefon = kullanici.telefon,
                        kayitTarihi = kullanici.kayit_tarihi,
                        guncellemeTarihi = kullanici.guncelleme_tarihi
                    });
                }

                return Ok(new
                {
                    users = userList,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    currentPage = page,
                    totalCount = totalCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Kullanıcılar yüklenirken hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcı detaylarını getir
        [HttpGet("users/{userId}")]
        public async Task<ActionResult<object>> GetUser(string userId)
        {
            // Hem Identity Id hem de KULLANICILAR.id destekle
            ApplicationUser? user = null;
            if (int.TryParse(userId, out int kullaniciId))
            {
                var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                if (kullanici == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }
                user = await _context.ApplicationUsers
                    .Include(u => u.Kullanici)
                    .Include(u => u.Yonetici)
                    .Include(u => u.AstKullanicilar)
                    .FirstOrDefaultAsync(u => u.Email == kullanici.eposta);
            }
            else
            {
                user = await _context.ApplicationUsers
                    .Include(u => u.Kullanici)
                    .Include(u => u.Yonetici)
                    .Include(u => u.AstKullanicilar)
                    .FirstOrDefaultAsync(u => u.Id == userId);
            }

            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var claims = await _userManager.GetClaimsAsync(user);

            return Ok(new
            {
                user.Id,
                user.UserName,
                user.Ad,
                user.Soyad,
                user.Email,
                user.Telefon,
                user.EmailDogrulandi,
                user.TelefonDogrulandi,
                user.KayitTarihi,
                user.GuncellemeTarihi,
                user.SonGirisTarihi,
                user.SonAktiviteTarihi,
                user.SonIpAdresi,
                user.BasarisizGirisSayisi,
                user.HesapKilitlenmeTarihi,
                user.AktifMi,
                user.Pozisyon,
                user.Departman,
                user.Notlar,
                KullanicilarId = user.KullanicilarId,
                KullanicilarDurum = user.Kullanici?.durum_id,
                YoneticiId = user.YoneticiId,
                YoneticiAdi = user.Yonetici != null ? $"{user.Yonetici.Ad} {user.Yonetici.Soyad}" : null,
                AstKullanicilar = user.AstKullanicilar.Select(a => new { a.Id, a.TamAd }).ToList(),
                Roller = roles.ToList(),
                Claims = claims.Select(c => new { c.Type, c.Value }).ToList(),
                HesapKilitliMi = user.HesapKilitliMi,
                TamAd = user.TamAd
            });
        }

        // Kullanıcı bilgilerini güncelle
        [HttpPut("users/{userId}")]
        public async Task<ActionResult<object>> UpdateUser(string userId, [FromBody] UpdateUserDto model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(new { message = "Validation hatası", errors = errors });
            }
            
            // Hem Identity Id hem de KULLANICILAR.id destekle
            ApplicationUser? user = null;
            if (int.TryParse(userId, out int kullaniciId))
            {
                var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                if (kullanici == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }
                user = await _userManager.FindByEmailAsync(kullanici.eposta);
            }
            else
            {
                user = await _userManager.FindByIdAsync(userId);
            }

            if (user == null)
            {
                return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
            }

            // Temel bilgileri güncelle
            user.Ad = model.Ad;
            user.Soyad = model.Soyad;
            user.Email = model.Email;
            user.UserName = model.Email; // Email'i UserName olarak da kullan
            user.Telefon = model.Telefon;
            user.Pozisyon = model.Pozisyon;
            user.Departman = model.Departman;
            user.YoneticiId = model.YoneticiId;
            user.Notlar = model.Notlar;
            user.AktifMi = model.AktifMi;
            user.GuncellemeTarihi = DateTime.Now;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Kullanıcı güncellenemedi.", errors = result.Errors });
            }

            // KULLANICILAR tablosunu da güncelle
            if (user.KullanicilarId.HasValue)
            {
                var kullanici = await _context.KULLANICILARs.FindAsync(user.KullanicilarId.Value);
                if (kullanici != null)
                {
                    kullanici.ad = user.Ad;
                    kullanici.soyad = user.Soyad;
                    kullanici.eposta = user.Email;
                    kullanici.telefon = user.Telefon;
                    kullanici.guncelleme_tarihi = DateTime.Now;
                    await _context.SaveChangesAsync();
                }
            }

            // Rol güncelleme - eğer Role alanı gönderilmişse
            if (!string.IsNullOrEmpty(model.Role))
            {
                try
                {
                    // Mevcut rolleri al
                    var currentRoles = await _userManager.GetRolesAsync(user);
                    
                    // Mevcut rolleri kaldır
                    if (currentRoles.Any())
                    {
                        await _userManager.RemoveFromRolesAsync(user, currentRoles);
                    }
                    
                    // Yeni rolü ekle
                    await _userManager.AddToRoleAsync(user, model.Role);
                }
                catch (Exception ex)
                {
                    // Rol güncelleme hatası olsa bile kullanıcı bilgileri güncellendi
                    return Ok(new { 
                        message = "Kullanıcı bilgileri güncellendi ancak rol güncelleme sırasında hata oluştu.", 
                        warning = ex.Message 
                    });
                }
            }

            return Ok(new { message = "Kullanıcı başarıyla güncellendi." });
        }

        // Kullanıcı aktivite geçmişi
        [HttpGet("users/{userId}/activity")]
        public async Task<ActionResult<object>> GetUserActivity(string userId, [FromQuery] int take = 50)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            // SISTEM_LOGLARI'ndan kullanıcı aktivitelerini getir
            var activities = await _context.SISTEM_LOGLARIs
                .Include(s => s.islem_tipi)
                .Where(s => s.kullanici_id == user.KullanicilarId)
                .OrderByDescending(s => s.islem_tarihi)
                .Take(take)
                .Select(s => new
                {
                    s.id,
                    s.islem_tarihi,
                    IslemTipi = s.islem_tipi != null ? s.islem_tipi.deger_aciklama : string.Empty,
                    s.tablo_adi,
                    s.ip_adresi,
                    s.tarayici_bilgisi,
                    s.aciklama
                })
                .ToListAsync();

            return Ok(new
            {
                UserId = userId,
                UserName = user.TamAd,
                Activities = activities,
                LastActivity = user.SonAktiviteTarihi,
                LastIpAddress = user.SonIpAdresi
            });
        }

        // Yeni kullanıcı oluştur (Admin)
        [HttpPost("users")]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateUserDto model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(new { message = "Validation hatası", errors = errors });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. KULLANICILAR tablosuna ekle
                var kullanici = new KULLANICILAR
                {
                    ad = model.Ad,
                    soyad = model.Soyad,
                    eposta = model.Email,
                    sifre_hash = "IDENTITY_MANAGED",
                    telefon = model.Telefon,
                    durum_id = 1, // Aktif
                    email_dogrulandi = false,
                    telefon_dogrulandi = false,
                    basarisiz_giris_sayisi = 0,
                    kayit_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _context.KULLANICILARs.Add(kullanici);
                await _context.SaveChangesAsync();

                // 2. Identity kullanıcısı oluştur
                var applicationUser = new ApplicationUser
                {
                    UserName = model.Email,
                    Email = model.Email,
                    Ad = model.Ad,
                    Soyad = model.Soyad,
                    Telefon = model.Telefon,
                    Pozisyon = model.Pozisyon,
                    Departman = model.Departman,
                    YoneticiId = model.YoneticiId,
                    Notlar = model.Notlar,
                    EmailDogrulandi = false,
                    TelefonDogrulandi = false,
                    AktifMi = true,
                    KayitTarihi = DateTime.Now,
                    GuncellemeTarihi = DateTime.Now,
                    KullanicilarId = kullanici.id
                };

                var result = await _userManager.CreateAsync(applicationUser, model.Password);
                if (!result.Succeeded)
                {
                    return BadRequest(new { message = "Identity kullanıcısı oluşturulamadı.", errors = result.Errors });
                }

                // 3. Rol ata
                if (!string.IsNullOrEmpty(model.Role))
                {
                    await _userManager.AddToRoleAsync(applicationUser, model.Role);
                }

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Kullanıcı başarıyla oluşturuldu.",
                    userId = applicationUser.Id,
                    kullanicilarId = kullanici.id
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = "Kullanıcı oluşturulurken hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcı rollerini güncelle
        [HttpPut("users/{userId}/roles")]
        public async Task<ActionResult<object>> UpdateUserRoles(string userId, [FromBody] UpdateUserRolesDto model)
        {
            try
            {
                // Hem Identity Id hem de KULLANICILAR.id destekle
                ApplicationUser? user = null;
                if (int.TryParse(userId, out int kullaniciId))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                    if (kullanici == null)
                    {
                        return NotFound(new { message = "Kullanıcı bulunamadı." });
                    }
                    user = await _userManager.FindByEmailAsync(kullanici.eposta);
                }
                else
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                if (user == null)
                {
                    return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
                }

                var currentRoles = await _userManager.GetRolesAsync(user);
                
                // Mevcut rolleri kaldır
                var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!removeResult.Succeeded)
                {
                    return BadRequest(new { message = "Mevcut roller kaldırılamadı.", errors = removeResult.Errors });
                }

                // Yeni rolleri ekle
                if (model.Roles != null && model.Roles.Any())
                {
                    var addResult = await _userManager.AddToRolesAsync(user, model.Roles);
                    if (!addResult.Succeeded)
                    {
                        return BadRequest(new { message = "Yeni roller eklenemedi.", errors = addResult.Errors });
                    }
                }

                return Ok(new { message = "Kullanıcı rolleri başarıyla güncellendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Rol güncelleme sırasında hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcı rollerini getir
        [HttpGet("users/{userId}/roles")]
        public async Task<ActionResult<object>> GetUserRoles(string userId)
        {
            try
            {
                // Hem Identity Id hem de KULLANICILAR.id destekle
                ApplicationUser? user = null;
                if (int.TryParse(userId, out int kullaniciId))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                    if (kullanici == null)
                    {
                        return NotFound(new { message = "Kullanıcı bulunamadı." });
                    }
                    user = await _userManager.FindByEmailAsync(kullanici.eposta);
                }
                else
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                if (user == null)
                {
                    return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
                }

                var roles = await _userManager.GetRolesAsync(user);
                var allRoles = await _roleManager.Roles.ToListAsync();

                return Ok(new
                {
                    userRoles = roles.ToList(),
                    availableRoles = allRoles.Select(r => new { r.Id, r.Name, r.Aciklama }).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Kullanıcı rolleri alınırken hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcıya rol ekle
        [HttpPost("users/{userId}/roles")]
        public async Task<ActionResult<object>> AddUserRole(string userId, [FromBody] AddUserRoleDto model)
        {
            try
            {
                // Hem Identity Id hem de KULLANICILAR.id destekle
                ApplicationUser? user = null;
                if (int.TryParse(userId, out int kullaniciId))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                    if (kullanici == null)
                    {
                        return NotFound(new { message = "Kullanıcı bulunamadı." });
                    }
                    user = await _userManager.FindByEmailAsync(kullanici.eposta);
                }
                else
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                if (user == null)
                {
                    return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
                }

                if (string.IsNullOrEmpty(model.Role))
                {
                    return BadRequest(new { message = "Rol adı belirtilmelidir." });
                }

                // Rol var mı kontrol et
                if (!await _roleManager.RoleExistsAsync(model.Role))
                {
                    return BadRequest(new { message = "Belirtilen rol bulunamadı." });
                }

                // Kullanıcının bu rolü zaten var mı kontrol et
                var userRoles = await _userManager.GetRolesAsync(user);
                if (userRoles.Contains(model.Role))
                {
                    return BadRequest(new { message = "Kullanıcının bu rolü zaten var." });
                }

                var result = await _userManager.AddToRoleAsync(user, model.Role);
                if (!result.Succeeded)
                {
                    return BadRequest(new { message = "Rol eklenemedi.", errors = result.Errors });
                }

                return Ok(new { message = "Rol başarıyla eklendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Rol ekleme sırasında hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcıdan rol kaldır
        [HttpDelete("users/{userId}/roles/{roleName}")]
        public async Task<ActionResult<object>> RemoveUserRole(string userId, string roleName)
        {
            try
            {
                // Hem Identity Id hem de KULLANICILAR.id destekle
                ApplicationUser? user = null;
                if (int.TryParse(userId, out int kullaniciId))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                    if (kullanici == null)
                    {
                        return NotFound(new { message = "Kullanıcı bulunamadı." });
                    }
                    user = await _userManager.FindByEmailAsync(kullanici.eposta);
                }
                else
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                if (user == null)
                {
                    return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
                }

                // Kullanıcının bu rolü var mı kontrol et
                var userRoles = await _userManager.GetRolesAsync(user);
                if (!userRoles.Contains(roleName))
                {
                    return BadRequest(new { message = "Kullanıcının bu rolü yok." });
                }

                var result = await _userManager.RemoveFromRoleAsync(user, roleName);
                if (!result.Succeeded)
                {
                    return BadRequest(new { message = "Rol kaldırılamadı.", errors = result.Errors });
                }

                return Ok(new { message = "Rol başarıyla kaldırıldı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Rol kaldırma sırasında hata oluştu.", error = ex.Message });
            }
        }



        // Kullanıcı şifresini sıfırla (Admin)
        [HttpPost("users/{userId}/reset-password")]
        public async Task<ActionResult<object>> ResetUserPassword(string userId, [FromBody] ResetPasswordDto model)
        {
            try
            {
                // Hem Identity Id hem de KULLANICILAR.id destekle
                ApplicationUser? user = null;
                if (int.TryParse(userId, out int kullaniciId))
                {
                    var kullanici = await _context.KULLANICILARs.FirstOrDefaultAsync(k => k.id == kullaniciId);
                    if (kullanici == null)
                    {
                        return NotFound(new { message = "Kullanıcı bulunamadı." });
                    }
                    user = await _userManager.FindByEmailAsync(kullanici.eposta);
                }
                else
                {
                    user = await _userManager.FindByIdAsync(userId);
                }

                if (user == null)
                {
                    return NotFound(new { message = "Identity kullanıcısı bulunamadı." });
                }

                // Şifre güvenlik kontrolü
                var passwordValidation = await _passwordValidationService.ValidatePasswordAsync(model.NewPassword, user.Email ?? "");
                if (!passwordValidation.IsValid)
                {
                    return BadRequest(new { 
                        message = "Şifre güvenlik gereksinimlerini karşılamıyor", 
                        errors = passwordValidation.Errors 
                    });
                }

                if (passwordValidation.IsCompromised)
                {
                    return BadRequest(new { 
                        message = "Bu şifre çok yaygın kullanılan bir şifredir. Güvenliğiniz için lütfen daha güçlü bir şifre seçin." 
                    });
                }

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var result = await _userManager.ResetPasswordAsync(user, token, model.NewPassword);

                if (!result.Succeeded)
                {
                    return BadRequest(new { message = "Şifre sıfırlanamadı.", errors = result.Errors });
                }

                user.GuncellemeTarihi = DateTime.Now;
                user.BasarisizGirisSayisi = 0;
                await _userManager.UpdateAsync(user);

                return Ok(new { message = "Kullanıcı şifresi başarıyla sıfırlandı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Şifre sıfırlama sırasında hata oluştu.", error = ex.Message });
            }
        }

        // Kullanıcıya not ekle
        [HttpPost("users/{userId}/notes")]
        public async Task<ActionResult<object>> AddUserNote(string userId, [FromBody] UserNoteDto model)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }

            var currentNote = user.Notlar ?? "";
            var newNote = $"[{DateTime.Now:dd.MM.yyyy HH:mm}] {model.Note}";
            
            user.Notlar = string.IsNullOrEmpty(currentNote) 
                ? newNote 
                : $"{currentNote}\n{newNote}";
            user.GuncellemeTarihi = DateTime.Now;

            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Not başarıyla eklendi." });
        }

        // Kullanıcı silme (KULLANICILAR tablosundan)
        [HttpDelete("users/{userId}")]
        public async Task<ActionResult<object>> DeleteUser(string userId)
        {
            try
            {
                // userId string'ini int'e çevir
                if (!int.TryParse(userId, out int kullaniciId))
                {
                    return BadRequest(new { message = "Geçersiz kullanıcı ID formatı." });
                }

                var kullanici = await _context.KULLANICILARs
                    .FirstOrDefaultAsync(k => k.id == kullaniciId);

                if (kullanici == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }

                // Test kullanıcılarını koruma
                var protectedEmails = new[] { "admin@test.com", "acente@test.com", "kullanici@test.com" };
                if (protectedEmails.Contains(kullanici.eposta?.ToLower()))
                {
                    return BadRequest(new { message = "Test kullanıcıları silinemez." });
                }

                // Önce MUSTERILER tablosundaki referansları sil
                var musteriReferanslari = await _context.MUSTERILERs
                    .Where(m => m.kullanici_id == kullaniciId)
                    .ToListAsync();

                if (musteriReferanslari.Any())
                {
                    // Önce bu müşterilere ait ödemeleri sil
                    var musteriIds = musteriReferanslari.Select(m => m.id).ToList();
                    var odemeler = await _context.ODEMELERs
                        .Where(o => musteriIds.Contains(o.musteri_id))
                        .ToListAsync();

                    if (odemeler.Any())
                    {
                        _context.ODEMELERs.RemoveRange(odemeler);
                        await _context.SaveChangesAsync();
                    }

                    _context.MUSTERILERs.RemoveRange(musteriReferanslari);
                    await _context.SaveChangesAsync();
                }

                // Sistem loglarını sil
                var sistemLoglari = await _context.SISTEM_LOGLARIs
                    .Where(sl => sl.kullanici_id == kullaniciId)
                    .ToListAsync();

                if (sistemLoglari.Any())
                {
                    _context.SISTEM_LOGLARIs.RemoveRange(sistemLoglari);
                    await _context.SaveChangesAsync();
                }

                // Bildirimleri sil (Geçici olarak devre dışı)
                // var bildirimler = await _context.BILDIRIMLERs
                //     .Where(b => b.alici_kullanici_id == kullaniciId)
                //     .ToListAsync();

                // if (bildirimler.Any())
                // {
                //     _context.BILDIRIMLERs.RemoveRange(bildirimler);
                //     await _context.SaveChangesAsync();
                // }

                // Doğrulama kodlarını sil
                var dogrulamaKodlari = await _context.DOGRULAMA_KODLARIs
                    .Where(dk => dk.kullanici_id == kullaniciId)
                    .ToListAsync();

                if (dogrulamaKodlari.Any())
                {
                    _context.DOGRULAMA_KODLARIs.RemoveRange(dogrulamaKodlari);
                    await _context.SaveChangesAsync();
                }

                // Şifre sıfırlama kodlarını sil
                var sifreSifirlama = await _context.SIFRE_SIFIRLAMAs
                    .Where(ss => ss.kullanici_id == kullaniciId)
                    .ToListAsync();

                if (sifreSifirlama.Any())
                {
                    _context.SIFRE_SIFIRLAMAs.RemoveRange(sifreSifirlama);
                    await _context.SaveChangesAsync();
                }

                // Hasar takip notlarını sil
                var hasarTakipNotlari = await _context.HASAR_TAKIP_NOTLARIs
                    .Where(htn => htn.kullanici_id == kullaniciId)
                    .ToListAsync();

                if (hasarTakipNotlari.Any())
                {
                    _context.HASAR_TAKIP_NOTLARIs.RemoveRange(hasarTakipNotlari);
                    await _context.SaveChangesAsync();
                }

                // Hasar dosya eklelerini sil (Bu tablo mevcut değil, kaldırıldı)
                // var hasarDosyaEkleleri = await _context.HASAR_DOSYA_EKLELERIs
                //     .Where(hde => hde.yukleyen_kullanici_id == kullaniciId)
                //     .ToListAsync();

                // if (hasarDosyaEkleleri.Any())
                // {
                //     _context.HASAR_DOSYA_EKLELERIs.RemoveRange(hasarDosyaEkleleri);
                //     await _context.SaveChangesAsync();
                // }

                // Hasar dosyalarını sil
                var hasarDosyalari = await _context.HASAR_DOSYALARs
                    .Where(hd => hd.bildiren_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (hasarDosyalari.Any())
                {
                    _context.HASAR_DOSYALARs.RemoveRange(hasarDosyalari);
                    await _context.SaveChangesAsync();
                }

                // Komisyon hesaplarını sil
                var komisyonHesaplari = await _context.KOMISYON_HESAPLARIs
                    .Where(kh => kh.acente_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (komisyonHesaplari.Any())
                {
                    _context.KOMISYON_HESAPLARIs.RemoveRange(komisyonHesaplari);
                    await _context.SaveChangesAsync();
                }

                // Dokümanları sil
                var dokumanlar = await _context.DOKUMANLARs
                    .Where(d => d.yukleyen_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (dokumanlar.Any())
                {
                    _context.DOKUMANLARs.RemoveRange(dokumanlar);
                    await _context.SaveChangesAsync();
                }

                // Rapor şablonlarını sil
                var raporSablonlari = await _context.RAPOR_SABLONLARIs
                    .Where(rs => rs.olusturan_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (raporSablonlari.Any())
                {
                    _context.RAPOR_SABLONLARIs.RemoveRange(raporSablonlari);
                    await _context.SaveChangesAsync();
                }

                // Poliçe tekliflerini sil
                var policeTeklifleri = await _context.POLICE_TEKLIFLERIs
                    .Where(pt => pt.olusturan_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (policeTeklifleri.Any())
                {
                    _context.POLICE_TEKLIFLERIs.RemoveRange(policeTeklifleri);
                    await _context.SaveChangesAsync();
                }

                // Poliçeleri sil
                var poliseler = await _context.POLISELERs
                    .Where(p => p.tanzim_eden_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (poliseler.Any())
                {
                    _context.POLISELERs.RemoveRange(poliseler);
                    await _context.SaveChangesAsync();
                }

                // Ödemelerde tahsilat yapan kullanıcı referanslarını temizle
                var tahsilatOdemeleri = await _context.ODEMELERs
                    .Where(o => o.tahsilat_yapan_kullanici_id == kullaniciId)
                    .ToListAsync();

                if (tahsilatOdemeleri.Any())
                {
                    foreach (var odeme in tahsilatOdemeleri)
                    {
                        odeme.tahsilat_yapan_kullanici_id = null;
                    }
                    await _context.SaveChangesAsync();
                }

                // Kullanıcının rollerini kaldır
                var user = await _userManager.FindByEmailAsync(kullanici.eposta ?? string.Empty);
                if (user != null)
                {
                    var userRoles = await _userManager.GetRolesAsync(user);
                    if (userRoles.Any())
                    {
                        await _userManager.RemoveFromRolesAsync(user, userRoles);
                    }

                    // Identity tablosundan kullanıcıyı sil
                    await _userManager.DeleteAsync(user);
                }

                // KULLANICILAR tablosundan kullanıcıyı sil
                _context.KULLANICILARs.Remove(kullanici);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Kullanıcı başarıyla silindi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Kullanıcı silinirken hata oluştu.", error = ex.Message });
            }
        }



        // Potansiyel yöneticiler listesi (Hiyerarşi için)
        [HttpGet("users/potential-managers")]
        public async Task<ActionResult<object>> GetPotentialManagers()
        {
            var managers = await _context.ApplicationUsers
                .Where(u => u.AktifMi)
                .Select(u => new
                {
                    u.Id,
                    u.TamAd,
                    u.Pozisyon,
                    u.Departman,
                    u.Email
                })
                .OrderBy(u => u.TamAd)
                .ToListAsync();

            return Ok(managers);
        }

        // Bulk kullanıcı işlemleri
        // Tek kullanıcı için kilitleme/açma işlemi
        [HttpPost("users/{userId}/lock")]
        public async Task<ActionResult<object>> LockUser(string userId)
        {
            try
            {
                // Önce KULLANICILAR tablosundan kullanıcıyı bul
                var kullanici = await _context.KULLANICILARs
                    .FirstOrDefaultAsync(k => k.id.ToString() == userId);
                
                if (kullanici == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }

                // Korumalı kullanıcıları kontrol et
                var protectedEmails = new[] { "admin@test.com", "acente@test.com", "kullanici@test.com" };
                if (protectedEmails.Contains(kullanici.eposta))
                {
                    return BadRequest(new { message = "Bu kullanıcı korumalıdır ve kilitleme işleminden hariç tutulmuştur." });
                }

                // ApplicationUser tablosundan kullanıcıyı bul
                var applicationUser = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(u => u.Email == kullanici.eposta);
                
                if (applicationUser == null)
                {
                    return NotFound(new { message = "Kullanıcı hesap bilgileri bulunamadı." });
                }

                // Kullanıcıyı kilitle
                applicationUser.HesapKilitlenmeTarihi = DateTime.Now.AddYears(1);
                applicationUser.GuncellemeTarihi = DateTime.Now;
                await _userManager.UpdateAsync(applicationUser);

                // KULLANICILAR tablosunda durumu güncelle
                var kilitliDurum = await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.deger_kodu == "KILITLI");
                
                if (kilitliDurum != null)
                {
                    kullanici.durum_id = kilitliDurum.id;
                    kullanici.guncelleme_tarihi = DateTime.Now;
                    await _context.SaveChangesAsync();
                }

                // Sistem loguna kilitleme kaydı ekle
                try
                {
                    // USER_LOCK işlem tipini bul veya oluştur
                    var lockIslemTipi = await _context.DURUM_TANIMLARIs
                        .FirstOrDefaultAsync(d => d.tablo_adi == "SISTEM_LOGLARI" && d.deger_kodu == "USER_LOCK");
                    
                    if (lockIslemTipi == null)
                    {
                        lockIslemTipi = new DURUM_TANIMLARI
                        {
                            tablo_adi = "SISTEM_LOGLARI",
                            alan_adi = "islem_tipi",
                            deger_kodu = "USER_LOCK",
                            deger_aciklama = "Kullanıcı Kilitleme - Kullanıcı hesabı kilitlendi"
                        };
                        _context.DURUM_TANIMLARIs.Add(lockIslemTipi);
                        await _context.SaveChangesAsync();
                    }

                    // Sistem logu oluştur
                    var sistemLogu = new SISTEM_LOGLARI
                    {
                        kullanici_id = kullanici.id,
                        islem_tipi_id = lockIslemTipi.id,
                        tablo_adi = "KULLANICILAR",
                        kayit_id = kullanici.id,
                        ip_adresi = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        tarayici_bilgisi = HttpContext.Request.Headers["User-Agent"].ToString(),
                        islem_tarihi = DateTime.Now,
                        aciklama = $"{kullanici.ad} {kullanici.soyad} kullanıcısı kilitlendi"
                    };
                    
                    _context.SISTEM_LOGLARIs.Add(sistemLogu);
                    await _context.SaveChangesAsync();
                }
                catch (Exception)
                {
                    // Log hatası kilitleme işlemini etkilemesin
                }

                return Ok(new { message = "Kullanıcı başarıyla kilitlendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Kilitleme işlemi sırasında hata oluştu.", error = ex.Message });
            }
        }

        [HttpPost("users/{userId}/unlock")]
        public async Task<ActionResult<object>> UnlockUser(string userId)
        {
            try
            {
                // Önce KULLANICILAR tablosundan kullanıcıyı bul
                var kullanici = await _context.KULLANICILARs
                    .FirstOrDefaultAsync(k => k.id.ToString() == userId);
                
                if (kullanici == null)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }

                // ApplicationUser tablosundan kullanıcıyı bul
                var applicationUser = await _context.ApplicationUsers
                    .FirstOrDefaultAsync(u => u.Email == kullanici.eposta);
                
                if (applicationUser == null)
                {
                    return NotFound(new { message = "Kullanıcı hesap bilgileri bulunamadı." });
                }

                // Kullanıcının kilidini aç
                applicationUser.HesapKilitlenmeTarihi = null;
                applicationUser.BasarisizGirisSayisi = 0;
                applicationUser.GuncellemeTarihi = DateTime.Now;
                await _userManager.UpdateAsync(applicationUser);

                // KULLANICILAR tablosunda durumu güncelle
                var aktifDurum = await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.deger_kodu == "AKTIF");
                
                if (aktifDurum != null)
                {
                    kullanici.durum_id = aktifDurum.id;
                    kullanici.guncelleme_tarihi = DateTime.Now;
                    await _context.SaveChangesAsync();
                }

                // Sistem loguna açma kaydı ekle
                try
                {
                    // USER_UNLOCK işlem tipini bul veya oluştur
                    var unlockIslemTipi = await _context.DURUM_TANIMLARIs
                        .FirstOrDefaultAsync(d => d.tablo_adi == "SISTEM_LOGLARI" && d.deger_kodu == "USER_UNLOCK");
                    
                    if (unlockIslemTipi == null)
                    {
                        unlockIslemTipi = new DURUM_TANIMLARI
                        {
                            tablo_adi = "SISTEM_LOGLARI",
                            alan_adi = "islem_tipi",
                            deger_kodu = "USER_UNLOCK",
                            deger_aciklama = "Kullanıcı Açma - Kullanıcı hesabı açıldı"
                        };
                        _context.DURUM_TANIMLARIs.Add(unlockIslemTipi);
                        await _context.SaveChangesAsync();
                    }

                    // Sistem logu oluştur
                    var sistemLogu = new SISTEM_LOGLARI
                    {
                        kullanici_id = kullanici.id,
                        islem_tipi_id = unlockIslemTipi.id,
                        tablo_adi = "KULLANICILAR",
                        kayit_id = kullanici.id,
                        ip_adresi = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        tarayici_bilgisi = HttpContext.Request.Headers["User-Agent"].ToString(),
                        islem_tarihi = DateTime.Now,
                        aciklama = $"{kullanici.ad} {kullanici.soyad} kullanıcısının kilidi açıldı"
                    };
                    
                    _context.SISTEM_LOGLARIs.Add(sistemLogu);
                    await _context.SaveChangesAsync();
                }
                catch (Exception)
                {
                    // Log hatası açma işlemini etkilemesin
                }

                return Ok(new { message = "Kullanıcı başarıyla açıldı." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Açma işlemi sırasında hata oluştu.", error = ex.Message });
            }
        }

        [HttpPost("users/bulk-action")]
        public async Task<ActionResult<object>> BulkUserAction([FromBody] BulkActionDto model)
        {
            if (!model.UserIds.Any())
            {
                return BadRequest(new { message = "En az bir kullanıcı seçilmelidir." });
            }

            // KULLANICILAR tablosundan kullanıcıları bul
            var kullanicilar = await _context.KULLANICILARs
                .Where(k => model.UserIds.Contains(k.id.ToString()))
                .ToListAsync();

            var results = new List<object>();
            var protectedEmails = new[] { "admin@test.com", "acente@test.com", "kullanici@test.com" };

            foreach (var kullanici in kullanicilar)
            {
                try
                {
                    // ApplicationUser tablosundan kullanıcıyı bul
                    var applicationUser = await _context.ApplicationUsers
                        .FirstOrDefaultAsync(u => u.Email == kullanici.eposta);
                    
                    if (applicationUser == null)
                    {
                        results.Add(new { 
                            UserId = kullanici.id.ToString(), 
                            Success = false, 
                            Message = "Kullanıcı hesap bilgileri bulunamadı." 
                        });
                        continue;
                    }

                    // Kilitleme işlemleri için korumalı kullanıcıları kontrol et
                    if ((model.Action.ToLower() == "lock" || model.Action.ToLower() == "unlock") && 
                        protectedEmails.Contains(kullanici.eposta))
                    {
                        results.Add(new { 
                            UserId = kullanici.id.ToString(), 
                            Success = false, 
                            Message = "Bu kullanıcı korumalıdır ve kilitleme işlemlerinden hariç tutulmuştur." 
                        });
                        continue;
                    }

                    switch (model.Action.ToLower())
                    {
                        case "activate":
                            applicationUser.AktifMi = true;
                            applicationUser.HesapKilitlenmeTarihi = null;
                            
                            // KULLANICILAR tablosunda durumu güncelle
                            var aktifDurum = await _context.DURUM_TANIMLARIs
                                .FirstOrDefaultAsync(d => d.deger_kodu == "AKTIF");
                            if (aktifDurum != null)
                            {
                                kullanici.durum_id = aktifDurum.id;
                            }
                            break;
                            
                        case "deactivate":
                            applicationUser.AktifMi = false;
                            
                            // KULLANICILAR tablosunda durumu güncelle
                            var pasifDurum = await _context.DURUM_TANIMLARIs
                                .FirstOrDefaultAsync(d => d.deger_kodu == "PASIF");
                            if (pasifDurum != null)
                            {
                                kullanici.durum_id = pasifDurum.id;
                            }
                            break;
                            
                        case "lock":
                            applicationUser.HesapKilitlenmeTarihi = DateTime.Now.AddYears(1);
                            
                            // KULLANICILAR tablosunda durumu güncelle
                            var kilitliDurum = await _context.DURUM_TANIMLARIs
                                .FirstOrDefaultAsync(d => d.deger_kodu == "KILITLI");
                            if (kilitliDurum != null)
                            {
                                kullanici.durum_id = kilitliDurum.id;
                            }
                            break;
                            
                        case "unlock":
                            applicationUser.HesapKilitlenmeTarihi = null;
                            applicationUser.BasarisizGirisSayisi = 0;
                            
                            // KULLANICILAR tablosunda durumu güncelle
                            var unlockAktifDurum = await _context.DURUM_TANIMLARIs
                                .FirstOrDefaultAsync(d => d.deger_kodu == "AKTIF");
                            if (unlockAktifDurum != null)
                            {
                                kullanici.durum_id = unlockAktifDurum.id;
                            }
                            break;
                            
                        default:
                            results.Add(new { UserId = kullanici.id.ToString(), Success = false, Message = "Geçersiz işlem" });
                            continue;
                    }

                    applicationUser.GuncellemeTarihi = DateTime.Now;
                    kullanici.guncelleme_tarihi = DateTime.Now;
                    
                    await _userManager.UpdateAsync(applicationUser);
                    await _context.SaveChangesAsync();
                    
                    results.Add(new { UserId = kullanici.id.ToString(), Success = true, Message = "Başarılı" });
                }
                catch (Exception ex)
                {
                    results.Add(new { UserId = kullanici.id.ToString(), Success = false, Message = ex.Message });
                }
            }

            return Ok(new
            {
                Message = "Bulk işlem tamamlandı.",
                Results = results,
                TotalProcessed = kullanicilar.Count,
                SuccessCount = results.Count(r => ((dynamic)r).Success),
                FailCount = results.Count(r => !((dynamic)r).Success)
            });
        }

        // Sistem rolleri listesi
        [HttpGet("roles")]
        public async Task<ActionResult<object>> GetRoles()
        {
            var roles = await _roleManager.Roles
                .Select(r => new
                {
                    r.Id,
                    r.Name,
                    r.Aciklama,
                    r.AktifMi,
                    r.OlusturmaTarihi
                })
                .ToListAsync();

            return Ok(roles);
        }

        // Sistem istatistikleri
        [HttpGet("dashboard-stats")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<ActionResult<object>> GetDashboardStats()
        {
            try
            {
                // KULLANICILAR tablosundan istatistikleri al
                var userStats = await _context.KULLANICILARs
                    .Include(k => k.durum)
                    .GroupBy(k => 1)
                    .Select(g => new
                    {
                        TotalUsers = g.Count(),
                        ActiveUsers = g.Count(k => k.durum.deger_kodu == "AKTIF"),
                        LockedUsers = g.Count(k => k.durum.deger_kodu == "KILITLI"),
                        VerifiedUsers = g.Count(k => k.email_dogrulandi)
                    })
                    .FirstOrDefaultAsync();

                // MUSTERILER tablosundan müşteri istatistikleri
                var customerStats = await _context.MUSTERILERs
                    .GroupBy(m => 1)
                    .Select(g => new
                    {
                        TotalCustomers = g.Count(),
                        BlacklistedCustomers = g.Count(m => m.blacklist_mi == true)
                    })
                    .FirstOrDefaultAsync();

                // POLISELER tablosundan poliçe istatistikleri
                var policyStats = await _context.POLISELERs
                    .GroupBy(p => 1)
                    .Select(g => new
                    {
                        TotalPolicies = g.Count(),
                        ActivePolicies = g.Count(p => p.durum.deger_kodu == "AKTIF")
                    })
                    .FirstOrDefaultAsync();

                // POLICE_TEKLIFLERI tablosundan teklif istatistikleri
                var offerStats = await _context.POLICE_TEKLIFLERIs
                    .GroupBy(pt => 1)
                    .Select(g => new
                    {
                        TotalOffers = g.Count(),
                        PendingOffers = g.Count(pt => pt.durum.deger_kodu == "BEKLEMEDE"),
                        // Teklif kabul durum kodunu sistem genelinde ONAYLANDI olarak sabitliyoruz
                        AcceptedOffers = g.Count(pt => pt.durum.deger_kodu == "ONAYLANDI")
                    })
                    .FirstOrDefaultAsync();

                // POLISELER tablosundan poliçe türü dağılımı (kesilmiş poliçelerin sayısı)
                var policyTypeDistribution = await _context.POLISELERs
                    .Include(p => p.police_turu)
                    .GroupBy(p => p.police_turu.urun_adi)
                    .Select(g => new { type = g.Key, count = g.Count() })
                    .ToListAsync();

                // Rol dağılımını al
                var roleStats = new List<object>();
                try
                {
                    var allUsers = await _context.ApplicationUsers.ToListAsync();
                    var roleCounts = new Dictionary<string, int>();
                    
                    foreach (var user in allUsers)
                    {
                        var roles = await _userManager.GetRolesAsync(user);
                        foreach (var role in roles)
                        {
                            if (roleCounts.ContainsKey(role))
                                roleCounts[role]++;
                            else
                                roleCounts[role] = 1;
                        }
                    }
                    
                    roleStats = roleCounts.Select(kvp => new { role = kvp.Key, count = kvp.Value }).ToList<object>();
                }
                catch (Exception)
                {
                    // Rol istatistikleri alınamazsa varsayılan değerler
                    roleStats = new List<object>
                    {
                        new { role = "ADMIN", count = 1 },
                        new { role = "ACENTE", count = 0 },
                        new { role = "KULLANICI", count = 0 }
                    };
                }

                // Son girişleri al
                var recentLogins = new List<object>();
                try
                {
                    recentLogins = await _context.ApplicationUsers
                        .Where(u => u.SonGirisTarihi.HasValue)
                        .OrderByDescending(u => u.SonGirisTarihi)
                        .Take(5)
                        .Select(u => new
                        {
                            ad = u.Ad ?? "Bilinmeyen",
                            soyad = u.Soyad ?? "Kullanıcı",
                            email = u.Email ?? "",
                            sonGirisTarihi = u.SonGirisTarihi
                        })
                        .ToListAsync<object>();
                }
                catch (Exception)
                {
                    // Son giriş bilgileri alınamazsa boş liste
                    recentLogins = new List<object>();
                }

                // Sistem performans metrikleri (gerçek sistem değişkenleri)
                var systemPerformance = new
                {
                    cpuUsage = OperatingSystem.IsWindows() ? GetCpuUsage() : 0,
                    memoryUsage = OperatingSystem.IsWindows() ? GetMemoryUsage() : 0,
                    diskUsage = OperatingSystem.IsWindows() ? GetDiskUsage() : 0,
                    activeConnections = GetActiveConnections()
                };

                // Son aktiviteler (sistem loglarından)
                var recentActivities = await GetRecentActivities();

                // Eğer hiç kullanıcı yoksa varsayılan değerler
                if (userStats == null)
                {
                    userStats = new
                    {
                        TotalUsers = 0,
                        ActiveUsers = 0,
                        LockedUsers = 0,
                        VerifiedUsers = 0
                    };
                }

                if (customerStats == null)
                {
                    customerStats = new
                    {
                        TotalCustomers = 0,
                        BlacklistedCustomers = 0
                    };
                }

                if (policyStats == null)
                {
                    policyStats = new
                    {
                        TotalPolicies = 0,
                        ActivePolicies = 0
                    };
                }

                if (offerStats == null)
                {
                    offerStats = new
                    {
                        TotalOffers = 0,
                        PendingOffers = 0,
                        AcceptedOffers = 0
                    };
                }

                return Ok(new
                {
                    totalUsers = userStats.TotalUsers,
                    activeUsers = userStats.ActiveUsers,
                    lockedUsers = userStats.LockedUsers,
                    verifiedUsers = userStats.VerifiedUsers,
                    totalCustomers = customerStats.TotalCustomers,
                    totalPolicies = policyStats.TotalPolicies,
                    totalOffers = offerStats.PendingOffers, // Bekleyen tekliflerin sayısını göster
                    roleDistribution = roleStats,
                    policyTypeDistribution = policyTypeDistribution,
                    recentLogins = recentLogins,
                    systemPerformance = systemPerformance,
                    recentActivities = recentActivities
                });
            }
            catch (Exception)
            {
                // Hata durumunda varsayılan değerler döndür
                return Ok(new
                {
                    totalUsers = 0,
                    activeUsers = 0,
                    lockedUsers = 0,
                    verifiedUsers = 0,
                    totalCustomers = 0,
                    totalPolicies = 0,
                    totalOffers = 0,
                    roleDistribution = new List<object>
                    {
                        new { role = "ADMIN", count = 1 },
                        new { role = "ACENTE", count = 0 },
                        new { role = "KULLANICI", count = 0 }
                    },
                    policyTypeDistribution = new List<object>(),
                    recentLogins = new List<object>(),
                    systemPerformance = new
                    {
                        cpuUsage = 0,
                        memoryUsage = 0,
                        diskUsage = 0,
                        activeConnections = 0
                    },
                    recentActivities = new List<object>()
                });
            }
        }

        // Sistem performans metrikleri için yardımcı metodlar
        private double GetCpuUsage()
        {
            if (!OperatingSystem.IsWindows())
                return 0.0;
                
            try
            {
                // Gerçek CPU kullanımını almak için System.Diagnostics kullan
                var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                cpuCounter.NextValue(); // İlk değeri atla
                System.Threading.Thread.Sleep(1000); // 1 saniye bekle
                return Math.Round(cpuCounter.NextValue(), 1);
            }
            catch
            {
                // Hata durumunda varsayılan değer
                return 25.0;
            }
        }

        private double GetMemoryUsage()
        {
            if (!OperatingSystem.IsWindows())
                return 0.0;
                
            try
            {
                // Gerçek bellek kullanımını al
                var memoryCounter = new PerformanceCounter("Memory", "% Committed Bytes In Use");
                return Math.Round(memoryCounter.NextValue(), 1);
            }
            catch
            {
                // Hata durumunda varsayılan değer
                return 45.0;
            }
        }

        private double GetDiskUsage()
        {
            if (!OperatingSystem.IsWindows())
                return 0.0;
                
            try
            {
                // C: sürücüsünün kullanımını al
                var diskCounter = new PerformanceCounter("LogicalDisk", "% Free Space", "C:");
                var freeSpace = diskCounter.NextValue();
                return Math.Round(100 - freeSpace, 1);
            }
            catch
            {
                // Hata durumunda varsayılan değer
                return 30.0;
            }
        }

        private int GetActiveConnections()
        {
            try
            {
                // Aktif TCP bağlantılarını say
                var connections = System.Net.NetworkInformation.IPGlobalProperties.GetIPGlobalProperties()
                    .GetActiveTcpConnections();
                return connections.Length;
            }
            catch
            {
                // Hata durumunda varsayılan değer
                return 12;
            }
        }

        private async Task<List<object>> GetRecentActivities()
        {
            try
            {
                // SISTEM_LOGLARI tablosundan son aktiviteleri al
                var activities = await _context.SISTEM_LOGLARIs
                    .OrderByDescending(sl => sl.islem_tarihi)
                    .Take(10)
                    .Select(sl => new
                    {
                        id = sl.id.ToString(),
                        type = sl.islem_tipi != null ? sl.islem_tipi.deger_kodu : "UNKNOWN",
                        description = sl.aciklama ?? "Aktivite",
                        timestamp = sl.islem_tarihi,
                        user = sl.kullanici != null ? (sl.kullanici.ad + " " + sl.kullanici.soyad) : "Sistem"
                    })
                    .ToListAsync<object>();

                return activities;
            }
            catch
            {
                // Sistem logları alınamazsa varsayılan aktiviteler
                return new List<object>
                {
                    new
                    {
                        id = "1",
                        type = "LOGIN",
                        description = "Sisteme giriş yapıldı",
                        timestamp = DateTime.Now,
                        user = "Admin Kullanıcı"
                    }
                };
            }
        }



        // Kullanıcıya rol atama endpoint'i
        [HttpPost("assign-role")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> AssignRole(string email, string roleName)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return NotFound($"Kullanıcı bulunamadı: {email}");
                }

                if (!await _roleManager.RoleExistsAsync(roleName))
                {
                    return BadRequest($"Rol bulunamadı: {roleName}");
                }

                var currentRoles = await _userManager.GetRolesAsync(user);
                if (currentRoles.Contains(roleName))
                {
                    return BadRequest($"Kullanıcı zaten {roleName} rolüne sahip");
                }

                var result = await _userManager.AddToRoleAsync(user, roleName);
                if (result.Succeeded)
                {
                    return Ok($"Rol başarıyla atandı: {email} -> {roleName}");
                }
                else
                {
                    return BadRequest($"Rol atama başarısız: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }
            catch (Exception)
            {
                // _logger.LogError(ex, "Rol atama hatası"); // _logger is not defined in this file
                return StatusCode(500, "Sunucu hatası");
            }
        }















    }

    // DTOs
    public class CreateUserDto
    {
        [Required(ErrorMessage = "Ad alanı zorunludur")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Ad 2-50 karakter arasında olmalıdır")]
        public string Ad { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Soyad alanı zorunludur")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Soyad 2-50 karakter arasında olmalıdır")]
        public string Soyad { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "E-posta alanı zorunludur")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz")]
        public string Email { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Şifre alanı zorunludur")]
        [StringLength(100, MinimumLength = 12, ErrorMessage = "Şifre en az 12 karakter olmalıdır")]
        public string Password { get; set; } = string.Empty;
        
        public string? Telefon { get; set; }
        public string? Role { get; set; }
        public string? Pozisyon { get; set; }
        public string? Departman { get; set; }
        public string? YoneticiId { get; set; }
        public string? Notlar { get; set; }
    }

    public class UpdateUserDto
    {
        [Required(ErrorMessage = "Ad alanı zorunludur")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Ad 2-50 karakter arasında olmalıdır")]
        public string Ad { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Soyad alanı zorunludur")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Soyad 2-50 karakter arasında olmalıdır")]
        public string Soyad { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "E-posta alanı zorunludur")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz")]
        public string Email { get; set; } = string.Empty;
        
        public string? Telefon { get; set; }
        public string? Pozisyon { get; set; }
        public string? Departman { get; set; }
        public string? YoneticiId { get; set; }
        public string? Notlar { get; set; }
        public bool AktifMi { get; set; } = true;
        public string? Role { get; set; } // Rol güncelleme için eklendi
    }

    public class UpdateUserRolesDto
    {
        public List<string> Roles { get; set; } = new List<string>();
    }

    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UserNoteDto
    {
        public string Note { get; set; } = string.Empty;
    }

    public class BulkActionDto
    {
        public List<string> UserIds { get; set; } = new List<string>();
        public string Action { get; set; } = string.Empty; // activate, deactivate, lock, unlock
    }



    public class AssignRoleDto
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // ADMIN, ACENTE, KULLANICI
    }

    public class AddUserRoleDto
    {
        public string Role { get; set; } = string.Empty;
    }


} 