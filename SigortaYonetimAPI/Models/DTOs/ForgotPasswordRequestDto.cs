using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs;

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "E-posta adresi gereklidir")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz")]
    public string Email { get; set; } = string.Empty;
} 