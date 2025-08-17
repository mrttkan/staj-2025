using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;

namespace SigortaYonetimAPI.Services
{
    public class PasswordValidationService : IPasswordValidationService
    {
        // Bilinen zayıf şifreler listesi (Chrome'un kontrol ettiği şifreler)
        private static readonly HashSet<string> CommonPasswords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "123456", "password", "123456789", "12345678", "12345", "1234567", "1234567890",
            "qwerty", "abc123", "111111", "password1", "admin", "letmein", "welcome",
            "monkey", "dragon", "master", "123123", "login", "pass", "shadow",
            "Admin123!", "admin123", "Password123", "Password123!", "Test123!",
            "user123", "User123!", "demo123", "Demo123!", "test", "Test123",
            "password123", "Password1!", "123qwe", "qwe123", "asdf123", "zxcv123"
        };

        // Yaygın şifre pattern'leri
        private static readonly string[] WeakPatterns = 
        {
            @"^(.)\1+$", // Aynı karakterin tekrarı (111111, aaaa)
            @"^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)+",
            @"^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+",
            @"^(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)+",
            @"^\d{4,}$", // Sadece rakamlar
            @"^[a-zA-Z]+$" // Sadece harfler
        };

        public Task<PasswordValidationResult> ValidatePasswordAsync(string password, string email = "")
        {
            var result = new PasswordValidationResult();
            
            // Temel uzunluk kontrolü
            if (password.Length < 12)
            {
                result.Errors.Add("Şifre en az 12 karakter olmalıdır.");
            }

            if (password.Length > 128)
            {
                result.Errors.Add("Şifre en fazla 128 karakter olmalıdır.");
            }

            // Karakter çeşitliliği kontrolü
            bool hasLower = password.Any(char.IsLower);
            bool hasUpper = password.Any(char.IsUpper);
            bool hasDigit = password.Any(char.IsDigit);
            bool hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

            if (!hasLower) result.Errors.Add("Şifre en az bir küçük harf içermelidir.");
            if (!hasUpper) result.Errors.Add("Şifre en az bir büyük harf içermelidir.");
            if (!hasDigit) result.Errors.Add("Şifre en az bir rakam içermelidir.");
            if (!hasSpecial) result.Errors.Add("Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)");

            // Benzersiz karakter sayısı
            var uniqueChars = password.Distinct().Count();
            if (uniqueChars < 8)
            {
                result.Errors.Add("Şifre en az 8 farklı karakter içermelidir.");
            }

            // Yaygın şifre kontrolü
            if (IsPasswordCompromised(password))
            {
                result.IsCompromised = true;
                result.Errors.Add("Bu şifre çok yaygın kullanılan bir şifredir. Lütfen daha güvenli bir şifre seçin.");
            }

            // E-posta benzerlik kontrolü
            if (!string.IsNullOrEmpty(email))
            {
                var emailPart = email.Split('@')[0].ToLower();
                if (password.ToLower().Contains(emailPart) && emailPart.Length > 3)
                {
                    result.Errors.Add("Şifre e-posta adresinizle benzerlik göstermemelidir.");
                }
            }

            // Zayıf pattern kontrolü
            foreach (var pattern in WeakPatterns)
            {
                if (Regex.IsMatch(password, pattern, RegexOptions.IgnoreCase))
                {
                    result.Errors.Add("Şifre çok basit bir pattern içeriyor. Daha karmaşık bir kombinasyon kullanın.");
                    break;
                }
            }

            // Güç skoru hesaplama
            result.StrengthScore = CalculatePasswordStrength(password);

            // Öneriler
            if (result.StrengthScore < 70)
            {
                result.Suggestions.Add("Şifrenizi daha güçlü hale getirmek için:");
                result.Suggestions.Add("• Daha uzun yapın (en az 16 karakter önerilir)");
                result.Suggestions.Add("• Büyük-küçük harf, rakam ve özel karakterleri karıştırın");
                result.Suggestions.Add("• Rastgele kelimeler veya cümleler kullanın");
                result.Suggestions.Add("• Kişisel bilgilerinizi kullanmayın");
            }

            result.IsValid = result.Errors.Count == 0 && result.StrengthScore >= 80;

            return Task.FromResult(result);
        }

        public bool IsPasswordCompromised(string password)
        {
            // Yaygın şifreler listesinde var mı?
            if (CommonPasswords.Contains(password))
                return true;

            // Sadece rakam veya harf mu?
            if (Regex.IsMatch(password, @"^\d+$") || Regex.IsMatch(password, @"^[a-zA-Z]+$"))
                return true;

            // Basit pattern'ler
            foreach (var pattern in WeakPatterns)
            {
                if (Regex.IsMatch(password, pattern, RegexOptions.IgnoreCase))
                    return true;
            }

            return false;
        }

        public bool IsPasswordStrong(string password)
        {
            return CalculatePasswordStrength(password) >= 80;
        }

        private int CalculatePasswordStrength(string password)
        {
            int score = 0;

            // Uzunluk (maksimum 30 puan)
            score += Math.Min(password.Length * 2, 30);

            // Karakter çeşitliliği (her biri 15 puan)
            if (password.Any(char.IsLower)) score += 15;
            if (password.Any(char.IsUpper)) score += 15;
            if (password.Any(char.IsDigit)) score += 15;
            if (password.Any(c => !char.IsLetterOrDigit(c))) score += 15;

            // Benzersiz karakter oranı (maksimum 10 puan)
            var uniqueRatio = (double)password.Distinct().Count() / password.Length;
            score += (int)(uniqueRatio * 10);

            // Yaygın şifre kontrolü (- puan)
            if (IsPasswordCompromised(password))
                score -= 50;

            // Entropi kontrolü (bonus puan)
            var entropy = CalculateEntropy(password);
            if (entropy > 4.5) score += 10;

            return Math.Max(0, Math.Min(100, score));
        }

        private double CalculateEntropy(string password)
        {
            var frequencies = password.GroupBy(c => c)
                                    .ToDictionary(g => g.Key, g => (double)g.Count() / password.Length);
            
            return -frequencies.Values.Sum(p => p * Math.Log2(p));
        }

        public string GenerateSecurePassword(int length = 16)
        {
            const string lowercase = "abcdefghijklmnopqrstuvwxyz";
            const string uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const string digits = "0123456789";
            const string symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

            var random = RandomNumberGenerator.Create();
            var result = new StringBuilder();

            // Her kategoriden en az bir karakter garantile
            result.Append(GetRandomChar(lowercase, random));
            result.Append(GetRandomChar(uppercase, random));
            result.Append(GetRandomChar(digits, random));
            result.Append(GetRandomChar(symbols, random));

            // Kalan karakterleri rastgele ekle
            var allChars = lowercase + uppercase + digits + symbols;
            for (int i = 4; i < length; i++)
            {
                result.Append(GetRandomChar(allChars, random));
            }

            // Karakterleri karıştır
            return new string(result.ToString().OrderBy(x => GetRandomNumber(random)).ToArray());
        }

        private char GetRandomChar(string chars, RandomNumberGenerator random)
        {
            byte[] randomBytes = new byte[4];
            random.GetBytes(randomBytes);
            int randomIndex = Math.Abs(BitConverter.ToInt32(randomBytes, 0)) % chars.Length;
            return chars[randomIndex];
        }

        private int GetRandomNumber(RandomNumberGenerator random)
        {
            byte[] randomBytes = new byte[4];
            random.GetBytes(randomBytes);
            return BitConverter.ToInt32(randomBytes, 0);
        }
    }
}
