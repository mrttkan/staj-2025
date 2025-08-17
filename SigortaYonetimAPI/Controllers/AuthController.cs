using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SigortaYonetimAPI.Models;
using SigortaYonetimAPI.Models.DTOs;
using SigortaYonetimAPI.Services;
using System.Security.Claims;

namespace SigortaYonetimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly ITokenService _tokenService;
        private readonly ILogger<AuthController> _logger;
        private readonly SigortaYonetimDbContext _context;
        private readonly IPasswordValidationService _passwordValidationService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<ApplicationRole> roleManager,
            ITokenService tokenService,
            ILogger<AuthController> logger,
            SigortaYonetimDbContext context,
            IPasswordValidationService passwordValidationService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _tokenService = tokenService;
            _logger = logger;
            _context = context;
            _passwordValidationService = passwordValidationService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto request)
        {
            try
            {
                _logger.LogInformation("Register işlemi başladı. Email: {Email}", request.Email);

                if (!ModelState.IsValid)
                {
                    var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    _logger.LogWarning("ModelState geçersiz: {Errors}", errors);
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = $"Geçersiz veri gönderildi: {errors}",
                    });
                }

                // Ek validation kontrolleri
                if (request.DogumTarihi.HasValue)
                {
                    if (request.DogumTarihi.Value.Year < 1900 || request.DogumTarihi.Value.Year > DateTime.Now.Year)
                        return BadRequest(new AuthResponseDto
                        {
                            Success = false,
                            Message = "Geçersiz doğum tarihi.",
                        });
                }

                if (request.AylikGelir.HasValue && request.AylikGelir < 0)
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Aylık gelir negatif olamaz.",
                    });

                // Artık müşteri tipi ayrımı yok, tüm alanlar opsiyonel

                // Boşluk ve özel karakterleri temizle
                var temizlenmisTelefon = new string((request.Telefon ?? "").Where(char.IsDigit).ToArray());
                var temizlenmisTcKimlik = string.IsNullOrWhiteSpace(request.TcKimlikNo) ? null : new string(request.TcKimlikNo.Where(char.IsDigit).ToArray());

                _logger.LogInformation("Veri temizlendi. Telefon: {Telefon}, TC: {TC}", 
                    temizlenmisTelefon, temizlenmisTcKimlik);

                // E-posta kontrolü
                var existingUser = await _userManager.FindByEmailAsync(request.Email);
                if (existingUser != null)
                {
                    _logger.LogWarning("E-posta zaten kayıtlı: {Email}", request.Email);
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Bu e-posta adresi zaten kayıtlı.",
                    });
                }

                _logger.LogInformation("KULLANICILAR tablosu için durum tanımı aranıyor...");
                // Önce KULLANICILAR tablosuna ekle
                var aktifDurum = await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "KULLANICILAR" && d.deger_kodu == "AKTIF");
                
                if (aktifDurum == null)
                {
                    _logger.LogInformation("AKTIF durum tanımı bulunamadı, oluşturuluyor...");
                    // Eğer durum tanımı yoksa oluştur
                    aktifDurum = new DURUM_TANIMLARI
                    {
                        tablo_adi = "KULLANICILAR",
                        alan_adi = "durum",
                        deger_kodu = "AKTIF",
                        deger_aciklama = "Aktif",
                        siralama = 1,
                        aktif_mi = true,
                        olusturma_tarihi = DateTime.Now
                    };
                    _context.DURUM_TANIMLARIs.Add(aktifDurum);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("AKTIF durum tanımı oluşturuldu. ID: {Id}", aktifDurum.id);
                }
                else
                {
                    _logger.LogInformation("AKTIF durum tanımı bulundu. ID: {Id}", aktifDurum.id);
                }

                var kullanici = new KULLANICILAR
                {
                    ad = request.Ad,
                    soyad = request.Soyad,
                    eposta = request.Email,
                    telefon = temizlenmisTelefon,
                    durum_id = aktifDurum.id,
                    email_dogrulandi = true,
                    telefon_dogrulandi = false,
                    sifre_hash = "IDENTITY_MANAGED", // Identity tarafından yönetiliyor
                    kayit_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now
                };

                _logger.LogInformation("KULLANICILAR kaydı oluşturuluyor...");
                _context.KULLANICILARs.Add(kullanici);
                await _context.SaveChangesAsync();
                _logger.LogInformation("KULLANICILAR kaydı oluşturuldu. ID: {Id}", kullanici.id);

                // Şimdi Identity kullanıcısı oluştur ve KULLANICILAR'a bağla
                var user = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    Ad = request.Ad,
                    Soyad = request.Soyad,
                    Telefon = temizlenmisTelefon,
                    EmailConfirmed = true,
                    KullanicilarId = kullanici.id, // 🔗 BAĞLANTI KURULDU!
                    KayitTarihi = DateTime.Now,
                    GuncellemeTarihi = DateTime.Now
                };

                // Şifre güvenlik kontrolü - Chrome uyarısını önlemek için
                _logger.LogInformation("Şifre güvenlik kontrolü yapılıyor...");
                var passwordValidation = await _passwordValidationService.ValidatePasswordAsync(request.Password, request.Email);
                
                if (!passwordValidation.IsValid)
                {
                    _logger.LogWarning("Şifre güvenlik kontrolünden geçemedi: {Errors}", 
                        string.Join(", ", passwordValidation.Errors));
                    
                    // KULLANICILAR kaydını sil
                    _context.KULLANICILARs.Remove(kullanici);
                    await _context.SaveChangesAsync();
                    
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = $"Şifre güvenlik gereksinimlerini karşılamıyor: {string.Join(" ", passwordValidation.Errors)}"
                    });
                }

                if (passwordValidation.IsCompromised)
                {
                    _logger.LogWarning("Şifre bilinen zayıf şifreler listesinde: {Email}", request.Email);
                    
                    // KULLANICILAR kaydını sil
                    _context.KULLANICILARs.Remove(kullanici);
                    await _context.SaveChangesAsync();
                    
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Bu şifre çok yaygın kullanılan bir şifredir. Güvenliğiniz için lütfen daha güçlü bir şifre seçin."
                    });
                }

                _logger.LogInformation("Şifre güvenlik kontrolü başarılı. Güç skoru: {Score}", passwordValidation.StrengthScore);
                _logger.LogInformation("Identity kullanıcısı oluşturuluyor...");
                var result = await _userManager.CreateAsync(user, request.Password);

                if (!result.Succeeded)
                {
                    _logger.LogError("Identity kullanıcısı oluşturulamadı: {Errors}", 
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                    // Identity kullanıcısı oluşturulamazsa KULLANICILAR kaydını da sil
                    _context.KULLANICILARs.Remove(kullanici);
                    await _context.SaveChangesAsync();
                    
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                    });
                }

                _logger.LogInformation("Identity kullanıcısı oluşturuldu. ID: {Id}", user.Id);

                // KULLANICI rolünün var olup olmadığını kontrol et
                if (!await _roleManager.RoleExistsAsync("KULLANICI"))
                {
                    _logger.LogWarning("KULLANICI rolü bulunamadı, oluşturuluyor...");
                    await _roleManager.CreateAsync(new ApplicationRole 
                    { 
                        Name = "KULLANICI",
                        Aciklama = "Normal Kullanıcı"
                    });
                    _logger.LogInformation("KULLANICI rolü oluşturuldu.");
                }

                // Varsayılan rol ata (KULLANICI)
                var roleResult = await _userManager.AddToRoleAsync(user, "KULLANICI");
                if (roleResult.Succeeded)
                {
                    _logger.LogInformation("KULLANICI rolü başarıyla atandı");
                }
                else
                {
                    _logger.LogWarning("KULLANICI rolü atanamadı: {Errors}", string.Join(", ", roleResult.Errors.Select(e => e.Description)));
                }

                _logger.LogInformation("Müşteri tipi tanımı aranıyor...");
                // Müşteri tipi artık kullanılmıyor, tüm müşteriler ortak form kullanıyor

                // Cinsiyet, medeni durum ve eğitim durumu tanımlarını al/oluştur
                var cinsiyetDurum = request.Cinsiyet.HasValue ? await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "MUSTERILER" && d.alan_adi == "cinsiyet_id" && 
                    d.deger_kodu == (request.Cinsiyet == 1 ? "ERKEK" : "KADIN")) : null;

                var medeniDurum = request.MedeniDurum.HasValue ? await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "MUSTERILER" && d.alan_adi == "medeni_durum_id" && 
                    d.deger_kodu == (request.MedeniDurum == 1 ? "BEKAR" : request.MedeniDurum == 2 ? "EVLI" : "BOSANMIŞ")) : null;

                var egitimDurum = request.EgitimDurumu.HasValue ? await _context.DURUM_TANIMLARIs
                    .FirstOrDefaultAsync(d => d.tablo_adi == "MUSTERILER" && d.alan_adi == "egitim_durumu_id" && 
                    d.deger_kodu == (request.EgitimDurumu == 1 ? "ILKOKUL" : request.EgitimDurumu == 2 ? "ORTAOKUL" : 
                    request.EgitimDurumu == 3 ? "LISE" : request.EgitimDurumu == 4 ? "UNIVERSITE" : 
                    request.EgitimDurumu == 5 ? "YUKSEKLISANS" : "DOKTORA")) : null;

                // Müşteri numarası oluştur (MUSTERI + YIL + SIRA)
                var yil = DateTime.Now.Year;
                var musteriSayisi = await _context.MUSTERILERs
                    .Where(m => m.kayit_tarihi.Year == yil)
                    .CountAsync();
                var musteriNo = $"MUSTERI{yil}{(musteriSayisi + 1):D4}";

                _logger.LogInformation("Müşteri kaydı oluşturuluyor. Müşteri No: {MusteriNo}", musteriNo);
                var musteri = new MUSTERILER
                {
                    kullanici_id = kullanici.id, // 🔗 KULLANICILAR ile bağlantı
                    musteri_no = musteriNo,
                    ad = request.Ad,
                    soyad = request.Soyad,
                    sirket_adi = request.SirketAdi,
                    tc_kimlik_no = temizlenmisTcKimlik, // Artık tüm müşteriler için TC
                    vergi_no = request.VergiNo,
                    eposta = request.Email,
                    telefon = temizlenmisTelefon,
                    dogum_tarihi = request.DogumTarihi.HasValue ? DateOnly.FromDateTime(request.DogumTarihi.Value) : null,
                    cinsiyet_id = cinsiyetDurum?.id, // Artık tüm müşteriler için cinsiyet
                    medeni_durum_id = medeniDurum?.id, // Artık tüm müşteriler için medeni durum
                    meslek = request.Meslek, // Artık tüm müşteriler için meslek
                    egitim_durumu_id = egitimDurum?.id, // Artık tüm müşteriler için eğitim
                    aylik_gelir = request.AylikGelir, // Artık tüm müşteriler için gelir
                    adres_il = request.AdresIl,
                    adres_ilce = request.AdresIlce,
                    adres_mahalle = request.AdresMahalle,
                    adres_detay = request.AdresDetay,
                    posta_kodu = request.PostaKodu,
                    not_bilgileri = request.NotBilgileri,
                    kayit_tarihi = DateTime.Now,
                    guncelleme_tarihi = DateTime.Now,
                    kaydeden_kullanici = "Sistem",
                    blacklist_mi = false
                };

                _context.MUSTERILERs.Add(musteri);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Müşteri kaydı oluşturuldu. ID: {Id}", musteri.id);

                // Token oluştur
                var token = await _tokenService.GenerateJwtTokenAsync(user);
                var roles = await _userManager.GetRolesAsync(user);

                _logger.LogInformation("Register işlemi başarıyla tamamlandı. Kullanıcı ID: {UserId}, Müşteri ID: {MusteriId}", 
                    user.Id, musteri.id);

                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = "Kayıt başarılı.",
                    Token = token,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                    User = new UserInfoDto
                    {
                        Id = user.Id,
                        Ad = user.Ad,
                        Soyad = user.Soyad,
                        Email = user.Email!,
                        Telefon = user.Telefon,
                        Roles = roles.ToList(),
                        // KULLANICILAR tablosundan ek bilgiler
                        KullanicilarId = kullanici.id,
                        KayitTarihi = kullanici.kayit_tarihi,
                        EmailDogrulandi = kullanici.email_dogrulandi,
                        // MUSTERILER tablosundan bilgiler
                        MusteriId = musteri.id
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Register işleminde hata oluştu. Email: {Email}", request.Email);
                return StatusCode(500, new AuthResponseDto
                {
                    Success = false,
                    Message = $"Sunucu hatası oluştu: {ex.Message}",
                });
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Geçersiz veri gönderildi.",
                    });
                }

                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return Unauthorized(new AuthResponseDto
                    {
                        Success = false,
                        Message = "E-posta veya şifre hatalı.",
                    });
                }

                // Hesap kilitleme kontrolü
                if (user.HesapKilitliMi)
                {
                    return Unauthorized(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Hesabınız kilitlenmiştir. Lütfen yönetici ile iletişime geçin.",
                    });
                }

                // Hesap aktiflik kontrolü
                if (!user.AktifMi)
                {
                    return Unauthorized(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Hesabınız pasif durumdadır. Lütfen yönetici ile iletişime geçin.",
                    });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
                if (!result.Succeeded)
                {
                    // Başarısız giriş sayısını artır
                    user.BasarisizGirisSayisi++;
                    
                    // 5 başarısız girişten sonra hesabı kilitle
                    if (user.BasarisizGirisSayisi >= 5)
                    {
                        user.HesapKilitlenmeTarihi = DateTime.Now.AddHours(1); // 1 saat kilit
                        await _userManager.UpdateAsync(user);
                        
                        return Unauthorized(new AuthResponseDto
                        {
                            Success = false,
                            Message = "Çok fazla başarısız giriş denemesi. Hesabınız 1 saat süreyle kilitlenmiştir.",
                        });
                    }
                    
                    await _userManager.UpdateAsync(user);
                    
                    return Unauthorized(new AuthResponseDto
                    {
                        Success = false,
                        Message = "E-posta veya şifre hatalı.",
                    });
                }

                // Son giriş tarihini güncelle
                user.SonGirisTarihi = DateTime.Now;
                user.BasarisizGirisSayisi = 0;
                await _userManager.UpdateAsync(user);

                // KULLANICILAR tablosundaki son giriş tarihini de güncelle
                if (user.KullanicilarId.HasValue)
                {
                    var kullanici = await _context.KULLANICILARs
                        .FirstOrDefaultAsync(k => k.id == user.KullanicilarId.Value);
                    if (kullanici != null)
                    {
                        kullanici.son_giris_tarihi = DateTime.Now;
                        kullanici.basarisiz_giris_sayisi = 0;
                        await _context.SaveChangesAsync();
                    }
                }

                // Sistem loguna giriş kaydı ekle
                try
                {
                    // LOGIN işlem tipini bul veya oluştur
                    var loginIslemTipi = await _context.DURUM_TANIMLARIs
                        .FirstOrDefaultAsync(d => d.tablo_adi == "SISTEM_LOGLARI" && d.deger_kodu == "LOGIN");
                    
                    if (loginIslemTipi == null)
                    {
                        loginIslemTipi = new DURUM_TANIMLARI
                        {
                            tablo_adi = "SISTEM_LOGLARI",
                            alan_adi = "islem_tipi",
                            deger_kodu = "LOGIN",
                            deger_aciklama = "Sisteme Giriş - Kullanıcı sisteme giriş yaptı"
                        };
                        _context.DURUM_TANIMLARIs.Add(loginIslemTipi);
                        await _context.SaveChangesAsync();
                    }

                    // Sistem logu oluştur
                    var sistemLogu = new SISTEM_LOGLARI
                    {
                        kullanici_id = user.KullanicilarId,
                        islem_tipi_id = loginIslemTipi.id,
                        tablo_adi = "KULLANICILAR",
                        kayit_id = user.KullanicilarId,
                        ip_adresi = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        tarayici_bilgisi = HttpContext.Request.Headers["User-Agent"].ToString(),
                        islem_tarihi = DateTime.Now,
                        aciklama = $"{user.Ad} {user.Soyad} sisteme giriş yaptı"
                    };
                    
                    _context.SISTEM_LOGLARIs.Add(sistemLogu);
                    await _context.SaveChangesAsync();
                }
                catch (Exception logEx)
                {
                    _logger.LogWarning(logEx, "Sistem logu eklenirken hata oluştu");
                    // Log hatası login işlemini etkilemesin
                }

                // Token oluştur
                var token = await _tokenService.GenerateJwtTokenAsync(user);
                var roles = await _userManager.GetRolesAsync(user);

                // KULLANICILAR tablosundan ek bilgileri al
                KULLANICILAR? kullaniciDetay = null;
                MUSTERILER? musteriDetay = null;
                if (user.KullanicilarId.HasValue)
                {
                    kullaniciDetay = await _context.KULLANICILARs
                        .FirstOrDefaultAsync(k => k.id == user.KullanicilarId.Value);
                    
                    // KULLANICI rolü için MUSTERILER tablosundan bilgileri al
                    if (roles.Contains("KULLANICI"))
                    {
                        musteriDetay = await _context.MUSTERILERs
                            .FirstOrDefaultAsync(m => m.kullanici_id == user.KullanicilarId.Value);
                    }
                }

                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = "Giriş başarılı.",
                    Token = token,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                    User = new UserInfoDto
                    {
                        Id = user.Id,
                        Ad = user.Ad,
                        Soyad = user.Soyad,
                        Email = user.Email!,
                        Telefon = user.Telefon,
                        Roles = roles.ToList(),
                        // KULLANICILAR tablosundan ek bilgiler
                        KullanicilarId = user.KullanicilarId,
                        KayitTarihi = kullaniciDetay?.kayit_tarihi,
                        EmailDogrulandi = kullaniciDetay?.email_dogrulandi ?? false,
                        // MUSTERILER tablosundan bilgiler (KULLANICI rolü için)
                        MusteriId = musteriDetay?.id,
                        // Müşteri bilgileri
                        TcKimlikNo = musteriDetay?.tc_kimlik_no,
                        DogumTarihi = musteriDetay?.dogum_tarihi?.ToString("yyyy-MM-dd"),
                        Cinsiyet = musteriDetay?.cinsiyet_id,
                        MedeniDurum = musteriDetay?.medeni_durum_id,
                        Meslek = musteriDetay?.meslek,
                        EgitimDurumu = musteriDetay?.egitim_durumu_id,
                        AylikGelir = musteriDetay?.aylik_gelir,
                        AdresIl = musteriDetay?.adres_il,
                        AdresIlce = musteriDetay?.adres_ilce,
                        AdresMahalle = musteriDetay?.adres_mahalle,
                        AdresDetay = musteriDetay?.adres_detay,
                        PostaKodu = musteriDetay?.posta_kodu
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login işleminde hata oluştu");
                return StatusCode(500, new AuthResponseDto
                {
                    Success = false,
                    Message = "Sunucu hatası oluştu.",
                });
            }
        }

        [HttpPost("logout")]
        public async Task<ActionResult<AuthResponseDto>> Logout()
        {
            try
            {
                // Kullanıcı bilgilerini al (token'dan)
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                if (!string.IsNullOrEmpty(userEmail))
                {
                    var user = await _userManager.FindByEmailAsync(userEmail);
                    if (user != null)
                    {
                        // Sistem loguna çıkış kaydı ekle
                        try
                        {
                            // LOGOUT işlem tipini bul veya oluştur
                            var logoutIslemTipi = await _context.DURUM_TANIMLARIs
                                .FirstOrDefaultAsync(d => d.tablo_adi == "SISTEM_LOGLARI" && d.deger_kodu == "LOGOUT");
                            
                            if (logoutIslemTipi == null)
                            {
                                                            logoutIslemTipi = new DURUM_TANIMLARI
                            {
                                tablo_adi = "SISTEM_LOGLARI",
                                alan_adi = "islem_tipi",
                                deger_kodu = "LOGOUT",
                                deger_aciklama = "Sistemden Çıkış - Kullanıcı sistemden çıkış yaptı"
                            };
                                _context.DURUM_TANIMLARIs.Add(logoutIslemTipi);
                                await _context.SaveChangesAsync();
                            }

                            // Sistem logu oluştur
                            var sistemLogu = new SISTEM_LOGLARI
                            {
                                kullanici_id = user.KullanicilarId,
                                islem_tipi_id = logoutIslemTipi.id,
                                tablo_adi = "KULLANICILAR",
                                kayit_id = user.KullanicilarId,
                                ip_adresi = HttpContext.Connection.RemoteIpAddress?.ToString(),
                                tarayici_bilgisi = HttpContext.Request.Headers["User-Agent"].ToString(),
                                islem_tarihi = DateTime.Now,
                                aciklama = $"{user.Ad} {user.Soyad} sistemden çıkış yaptı"
                            };
                            
                            _context.SISTEM_LOGLARIs.Add(sistemLogu);
                            await _context.SaveChangesAsync();
                        }
                        catch (Exception logEx)
                        {
                            _logger.LogWarning(logEx, "Sistem logu eklenirken hata oluştu");
                            // Log hatası logout işlemini etkilemesin
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Logout sırasında kullanıcı bilgileri alınamadı");
            }

            await _signInManager.SignOutAsync();
            return Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Çıkış başarılı.",
            });
        }

        [HttpGet("check-roles")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckRoles()
        {
            try
            {
                var roles = await _roleManager.Roles.ToListAsync();
                var roleList = roles.Select(r => new { r.Id, r.Name, r.Aciklama }).ToList();
                
                return Ok(new { 
                    message = "Mevcut roller",
                    roles = roleList,
                    count = roleList.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rol kontrolü hatası");
                return StatusCode(500, "Sunucu hatası");
            }
        }

        [HttpPost("assign-role")]
        [AllowAnonymous]
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rol atama hatası");
                return StatusCode(500, "Sunucu hatası");
            }
        }

        [HttpGet("check-user-roles")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckUserRoles(string email)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(email);
                if (user == null)
                {
                    return NotFound($"Kullanıcı bulunamadı: {email}");
                }

                var roles = await _userManager.GetRolesAsync(user);
                
                return Ok(new { 
                    email = email,
                    roles = roles.ToList(),
                    count = roles.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullanıcı rol kontrolü hatası");
                return StatusCode(500, "Sunucu hatası");
            }
        }

        [HttpPost("create-role")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateRole(string roleName, string description = "")
        {
            try
            {
                if (await _roleManager.RoleExistsAsync(roleName))
                {
                    return BadRequest($"Rol zaten mevcut: {roleName}");
                }

                var role = new ApplicationRole 
                { 
                    Name = roleName,
                    Aciklama = description
                };

                var result = await _roleManager.CreateAsync(role);
                if (result.Succeeded)
                {
                    return Ok($"Rol başarıyla oluşturuldu: {roleName}");
                }
                else
                {
                    return BadRequest($"Rol oluşturma başarısız: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rol oluşturma hatası");
                return StatusCode(500, "Sunucu hatası");
            }
        }

        [HttpPost("setup-default-roles")]
        [AllowAnonymous]
        public async Task<IActionResult> SetupDefaultRoles()
        {
            try
            {
                var results = new List<string>();
                
                // Rolleri oluştur
                var roles = new[] { "ADMIN", "ACENTE", "KULLANICI" };
                
                foreach (var role in roles)
                {
                    if (!await _roleManager.RoleExistsAsync(role))
                    {
                        var roleResult = await _roleManager.CreateAsync(new ApplicationRole 
                        { 
                            Name = role,
                            Aciklama = role switch
                            {
                                "ADMIN" => "Sistem Yöneticisi",
                                "ACENTE" => "Acente Kullanıcısı", 
                                "KULLANICI" => "Normal Kullanıcı",
                                _ => ""
                            }
                        });
                        
                        if (roleResult.Succeeded)
                        {
                            results.Add($"✅ {role} rolü oluşturuldu");
                        }
                        else
                        {
                            results.Add($"❌ {role} rolü oluşturulamadı: {string.Join(", ", roleResult.Errors.Select(e => e.Description))}");
                        }
                    }
                    else
                    {
                        results.Add($"ℹ️ {role} rolü zaten mevcut");
                    }
                }
                
                // Kullanıcılara roller ata
                var adminUser = await _userManager.FindByEmailAsync("admin@test.com");
                if (adminUser != null)
                {
                    if (!await _userManager.IsInRoleAsync(adminUser, "ADMIN"))
                    {
                        var result = await _userManager.AddToRoleAsync(adminUser, "ADMIN");
                        if (result.Succeeded)
                        {
                            results.Add("✅ admin@test.com -> ADMIN rolü atandı");
                        }
                        else
                        {
                            results.Add($"❌ admin@test.com -> ADMIN rolü atanamadı: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                        }
                    }
                    else
                    {
                        results.Add("ℹ️ admin@test.com zaten ADMIN rolüne sahip");
                    }
                }
                else
                {
                    results.Add("❌ admin@test.com kullanıcısı bulunamadı");
                }
                
                var acenteUser = await _userManager.FindByEmailAsync("acente@test.com");
                if (acenteUser != null)
                {
                    if (!await _userManager.IsInRoleAsync(acenteUser, "ACENTE"))
                    {
                        var result = await _userManager.AddToRoleAsync(acenteUser, "ACENTE");
                        if (result.Succeeded)
                        {
                            results.Add("✅ acente@test.com -> ACENTE rolü atandı");
                        }
                        else
                        {
                            results.Add($"❌ acente@test.com -> ACENTE rolü atanamadı: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                        }
                    }
                    else
                    {
                        results.Add("ℹ️ acente@test.com zaten ACENTE rolüne sahip");
                    }
                }
                else
                {
                    results.Add("❌ acente@test.com kullanıcısı bulunamadı");
                }
                
                return Ok(new { 
                    message = "Rol kurulumu tamamlandı",
                    results = results
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Rol kurulumu hatası");
                return StatusCode(500, "Sunucu hatası");
            }
        }

        // Test endpoint'i - kullanıcıları listele
        [HttpGet("test-users")]
        [AllowAnonymous]
        public async Task<IActionResult> TestUsers()
        {
            try
            {
                var identityUsers = await _userManager.Users.ToListAsync();
                var kullanicilar = await _context.KULLANICILARs.ToListAsync();
                var durumlar = await _context.DURUM_TANIMLARIs.Where(d => d.tablo_adi == "KULLANICILAR").ToListAsync();
                
                return Ok(new
                {
                    IdentityUsers = identityUsers.Select(u => new { u.Id, u.Email, u.Ad, u.Soyad, u.KullanicilarId }),
                    Kullanicilar = kullanicilar.Select(k => new { k.id, k.eposta, k.ad, k.soyad, k.durum_id }),
                    Durumlar = durumlar.Select(d => new { d.id, d.tablo_adi, d.deger_kodu, d.deger_aciklama })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        // Şifre Sıfırlama İstek Gönderme
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            try
            {
                _logger.LogInformation("Şifre sıfırlama isteği başladı. Email: {Email}", request.Email);

                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "E-posta adresi gereklidir."
                    });
                }

                // Kullanıcıyı bul
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    // Güvenlik için kullanıcı bulunamasa da başarılı mesajı döndür
                    _logger.LogWarning("Şifre sıfırlama isteği: Kullanıcı bulunamadı. Email: {Email}", request.Email);
                    return Ok(new AuthResponseDto
                    {
                        Success = true,
                        Message = "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
                    });
                }

                // Önceki aktif token'ları iptal et
                var existingTokens = await _context.SIFRE_SIFIRLAMAs
                    .Where(s => s.kullanici_id == int.Parse(user.Id) && !s.kullanildi_mi && s.son_kullanma_tarihi > DateTime.Now)
                    .ToListAsync();

                foreach (var token in existingTokens)
                {
                    token.kullanildi_mi = true;
                }

                // Yeni token oluştur
                var resetToken = Guid.NewGuid().ToString("N");
                var expiryDate = DateTime.Now.AddHours(24); // 24 saat geçerli

                var passwordReset = new SIFRE_SIFIRLAMA
                {
                    kullanici_id = int.Parse(user.Id),
                    token = resetToken,
                    son_kullanma_tarihi = expiryDate,
                    kullanildi_mi = false,
                    ip_adresi = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    olusturma_tarihi = DateTime.Now
                };

                _context.SIFRE_SIFIRLAMAs.Add(passwordReset);
                await _context.SaveChangesAsync();

                // E-posta gönderme simülasyonu (gerçek uygulamada e-posta servisi kullanılır)
                _logger.LogInformation("Şifre sıfırlama token'ı oluşturuldu. Token: {Token}, Kullanıcı: {Email}", 
                    resetToken, request.Email);

                // TODO: Gerçek e-posta gönderme işlemi burada yapılacak
                // var resetLink = $"{Request.Scheme}://{Request.Host}/reset-password?token={resetToken}";

                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Şifre sıfırlama isteği işlenirken hata oluştu. Email: {Email}", request.Email);
                return StatusCode(500, new AuthResponseDto
                {
                    Success = false,
                    Message = "Şifre sıfırlama işlemi sırasında bir hata oluştu."
                });
            }
        }

        // Şifre Sıfırlama Token Doğrulama
        [HttpPost("verify-reset-token")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> VerifyResetToken([FromBody] VerifyResetTokenRequestDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Token gereklidir."
                    });
                }

                var resetRecord = await _context.SIFRE_SIFIRLAMAs
                    .Include(s => s.kullanici)
                    .FirstOrDefaultAsync(s => s.token == request.Token && !s.kullanildi_mi && s.son_kullanma_tarihi > DateTime.Now);

                if (resetRecord == null)
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Geçersiz veya süresi dolmuş token."
                    });
                }

                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = "Token geçerli.",
                    Data = new { UserId = resetRecord.kullanici_id, Email = resetRecord.kullanici.eposta }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token doğrulama sırasında hata oluştu. Token: {Token}", request.Token);
                return StatusCode(500, new AuthResponseDto
                {
                    Success = false,
                    Message = "Token doğrulama sırasında bir hata oluştu."
                });
            }
        }

        // Şifre Sıfırlama
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Token ve yeni şifre gereklidir."
                    });
                }

                if (request.NewPassword.Length < 6)
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Şifre en az 6 karakter olmalıdır."
                    });
                }

                var resetRecord = await _context.SIFRE_SIFIRLAMAs
                    .Include(s => s.kullanici)
                    .FirstOrDefaultAsync(s => s.token == request.Token && !s.kullanildi_mi && s.son_kullanma_tarihi > DateTime.Now);

                if (resetRecord == null)
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Geçersiz veya süresi dolmuş token."
                    });
                }

                // Şifreyi güncelle
                var user = await _userManager.FindByIdAsync(resetRecord.kullanici_id.ToString());
                if (user == null)
                {
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = "Kullanıcı bulunamadı."
                    });
                }

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    return BadRequest(new AuthResponseDto
                    {
                        Success = false,
                        Message = $"Şifre güncellenemedi: {errors}"
                    });
                }

                // Token'ı kullanıldı olarak işaretle
                resetRecord.kullanildi_mi = true;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Şifre başarıyla sıfırlandı. Kullanıcı: {Email}", user.Email);

                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = "Şifreniz başarıyla güncellendi."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Şifre sıfırlama sırasında hata oluştu. Token: {Token}", request.Token);
                return StatusCode(500, new AuthResponseDto
                {
                    Success = false,
                    Message = "Şifre sıfırlama sırasında bir hata oluştu."
                });
            }
        }

        // POST: api/Auth/refresh
        [HttpPost("refresh")]
        [Authorize]
        public async Task<IActionResult> RefreshToken()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "Geçersiz token" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "Kullanıcı bulunamadı" });
                }

                // Yeni token oluştur
                var newToken = await _tokenService.GenerateJwtTokenAsync(user);
                
                // Kullanıcı bilgilerini hazırla
                var roles = await _userManager.GetRolesAsync(user);
                var userDto = new
                {
                    id = user.Id,
                    ad = user.Ad,
                    soyad = user.Soyad,
                    email = user.Email,
                    telefon = user.PhoneNumber,
                    roles = roles.ToArray(),
                    kullanicilarId = user.KullanicilarId,
                    kayitTarihi = user.KayitTarihi.ToString("yyyy-MM-dd"),
                    emailDogrulandi = user.EmailConfirmed
                };

                return Ok(new
                {
                    success = true,
                    message = "Token başarıyla yenilendi",
                    token = newToken,
                    user = userDto
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Token yenilenirken hata oluştu: {ex.Message}" });
            }
        }
    }
} 