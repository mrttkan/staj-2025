namespace SigortaYonetimAPI.Services
{
    public interface IPasswordValidationService
    {
        Task<PasswordValidationResult> ValidatePasswordAsync(string password, string email = "");
        bool IsPasswordCompromised(string password);
        bool IsPasswordStrong(string password);
        string GenerateSecurePassword(int length = 16);
    }

    public class PasswordValidationResult
    {
        public bool IsValid { get; set; }
        public bool IsCompromised { get; set; }
        public int StrengthScore { get; set; } // 0-100 arası
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> Suggestions { get; set; } = new List<string>();
    }
}












