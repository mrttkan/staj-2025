using SigortaYonetimAPI.Models.DTOs;

namespace SigortaYonetimAPI.Services
{
    public interface IPricingCalculationService
    {
        Task<FiyatHesaplamaResponseDto> HesaplaFiyatAsync(FiyatHesaplamaRequestDto request);
        Task<List<TeminatListDto>> GetPoliceTuruTeminatlariAsync(int policeTuruId);
        Task<List<FiyatlandirmaKuralDto>> GetFiyatlandirmaKurallariAsync(int policeTuruId);
        Task<decimal> HesaplaTeminatPrimAsync(int teminatId, decimal teminatTutari, Dictionary<string, object> riskBilgileri);
    }
}













