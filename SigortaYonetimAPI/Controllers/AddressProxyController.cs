using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;

namespace SigortaYonetimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AddressProxyController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl = "https://tradres.com.tr/api";

        public AddressProxyController(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        [HttpGet("iller")]
        public async Task<IActionResult> GetIller()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/iller");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Ok(JsonSerializer.Deserialize<object>(content));
                }
                return BadRequest("İller yüklenirken hata oluştu");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Sunucu hatası: {ex.Message}");
            }
        }

        [HttpGet("ilceler")]
        public async Task<IActionResult> GetIlceler([FromQuery] string iladi)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/ilceler?iladi={Uri.EscapeDataString(iladi)}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Ok(JsonSerializer.Deserialize<object>(content));
                }
                return BadRequest("İlçeler yüklenirken hata oluştu");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Sunucu hatası: {ex.Message}");
            }
        }

        [HttpGet("mahalleler")]
        public async Task<IActionResult> GetMahalleler([FromQuery] string iladi, [FromQuery] string ilce)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/mahalleler?iladi={Uri.EscapeDataString(iladi)}&ilce={Uri.EscapeDataString(ilce)}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Ok(JsonSerializer.Deserialize<object>(content));
                }
                return BadRequest("Mahalleler yüklenirken hata oluştu");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Sunucu hatası: {ex.Message}");
            }
        }

        [HttpGet("sokaklar")]
        public async Task<IActionResult> GetSokaklar([FromQuery] string ilkod, [FromQuery] string mahalle)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/sokaklar?ilkod={ilkod}&mahalle={Uri.EscapeDataString(mahalle)}");
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Ok(JsonSerializer.Deserialize<object>(content));
                }
                return BadRequest("Sokaklar yüklenirken hata oluştu");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Sunucu hatası: {ex.Message}");
            }
        }
    }
}
