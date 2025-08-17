using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Models.DTOs;

public class VerifyResetTokenRequestDto
{
    [Required(ErrorMessage = "Token gereklidir")]
    public string Token { get; set; } = string.Empty;
} 