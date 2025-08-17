using System.ComponentModel.DataAnnotations;

namespace SigortaYonetimAPI.Validations
{
    public class TurkishTcKimlikAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
            {
                return ValidationResult.Success; // Boş değer kabul edilir (opsiyonel)
            }

            string tcKimlik = value.ToString()!;
            
            // Sadece rakamları al
            string digitsOnly = string.Join("", tcKimlik.Where(char.IsDigit));
            
            // 11 haneli olmalı
            if (digitsOnly.Length != 11)
            {
                return new ValidationResult("TC Kimlik numarası 11 haneli olmalıdır");
            }
            
            // Sadece rakam içermeli
            if (!digitsOnly.All(char.IsDigit))
            {
                return new ValidationResult("TC Kimlik numarası sadece rakam içermelidir");
            }
            
            // İlk hane 0 olamaz
            if (digitsOnly[0] == '0')
            {
                return new ValidationResult("TC Kimlik numarası 0 ile başlayamaz");
            }
            
            return ValidationResult.Success;
        }
    }
} 