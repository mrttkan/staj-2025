using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs;

public class ResetPasswordRequestDto
{
    [Required(ErrorMessage = "Token gereklidir")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Yeni şifre gereklidir")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Şifre tekrarı gereklidir")]
    [Compare("NewPassword", ErrorMessage = "Şifreler eşleşmiyor")]
    public string ConfirmPassword { get; set; } = string.Empty;
} 