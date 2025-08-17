// Türkiye Adres API servisi
// https://tradres.com.tr/ API'sini kullanarak adres bilgilerini çeker

export interface Il {
  ilId: number;
  ilAdi: string;
}

export interface Ilce {
  ilAdi: string;
  ilceAdi: string;
}

export interface Mahalle {
  ilAdi: string;
  ilceAdi: string;
  mahalleAdi: string;
}

export interface Sokak {
  ilKod: string;
  mahalleAdi: string;
  sokakAdi: string;
}

class AddressApiService {
  private baseUrl = '/api/AddressProxy';

  // Tüm illeri getir
  async getIller(): Promise<Il[]> {
    try {
      const response = await fetch(`${this.baseUrl}/iller`);
      if (!response.ok) {
        throw new Error('İller yüklenirken hata oluştu');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('İller yüklenirken hata:', error);
      return [];
    }
  }

  // Belirli bir ile ait ilçeleri getir
  async getIlceler(ilAdi: string): Promise<Ilce[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ilceler?iladi=${encodeURIComponent(ilAdi)}`);
      if (!response.ok) {
        throw new Error('İlçeler yüklenirken hata oluştu');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('İlçeler yüklenirken hata:', error);
      return [];
    }
  }

  // Belirli bir ilçeye ait mahalleleri getir
  async getMahalleler(ilAdi: string, ilceAdi: string): Promise<Mahalle[]> {
    try {
      const response = await fetch(`${this.baseUrl}/mahalleler?iladi=${encodeURIComponent(ilAdi)}&ilce=${encodeURIComponent(ilceAdi)}`);
      if (!response.ok) {
        throw new Error('Mahalleler yüklenirken hata oluştu');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Mahalleler yüklenirken hata:', error);
      return [];
    }
  }

  // Belirli bir mahalleye ait sokakları getir
  async getSokaklar(ilKodu: string, mahalleAdi: string): Promise<Sokak[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sokaklar?ilkod=${ilKodu}&mahalle=${encodeURIComponent(mahalleAdi)}`);
      if (!response.ok) {
        throw new Error('Sokaklar yüklenirken hata oluştu');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Sokaklar yüklenirken hata:', error);
      return [];
    }
  }

  // İl adından il kodunu bul
  async getIlKodu(ilAdi: string): Promise<string | null> {
    const iller = await this.getIller();
    const il = iller.find(i => i.ilAdi.toLowerCase() === ilAdi.toLowerCase());
    return il ? il.ilId.toString() : null;
  }

  // İlçe adından ilçe kodunu bul
  async getIlceKodu(ilAdi: string, ilceAdi: string): Promise<string | null> {
    const ilceler = await this.getIlceler(ilAdi);
    const ilce = ilceler.find(i => i.ilceAdi.toLowerCase() === ilceAdi.toLowerCase());
    return ilce ? ilce.ilceAdi : null;
  }
}

export const addressApiService = new AddressApiService();
