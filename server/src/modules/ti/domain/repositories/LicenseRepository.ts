/**
 * Contrato do repositório de ItSoftwareLicenseDetail/ItLicenseSeat (P3).
 *
 * @module modules/ti/domain/repositories/LicenseRepository
 */

class LicenseRepository {
  public async findAndCountLicenses(_filters: Record<string, unknown>, _pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    throw new Error('LicenseRepository.findAndCountLicenses não implementado.');
  }
  public async findByAssetId(_assetId: number | string): Promise<any | null> {
    throw new Error('LicenseRepository.findByAssetId não implementado.');
  }
  public async listExpiring(_windowDays: number[]): Promise<any[]> {
    throw new Error('LicenseRepository.listExpiring não implementado.');
  }
  public async createLicenseDetail(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LicenseRepository.createLicenseDetail não implementado.');
  }
  public async updateLicenseDetail(_assetId: number | string, _data: Record<string, unknown>): Promise<any | null> {
    throw new Error('LicenseRepository.updateLicenseDetail não implementado.');
  }
  public async countActiveSeats(_licenseDetailId: number | string): Promise<number> {
    throw new Error('LicenseRepository.countActiveSeats não implementado.');
  }
  public async listSeats(_licenseDetailId: number | string): Promise<any[]> {
    throw new Error('LicenseRepository.listSeats não implementado.');
  }
  public async createSeat(_data: Record<string, unknown>): Promise<any> {
    throw new Error('LicenseRepository.createSeat não implementado.');
  }
  public async findSeatById(_seatId: number | string): Promise<any | null> {
    throw new Error('LicenseRepository.findSeatById não implementado.');
  }
  public async revokeSeat(_seatId: number | string): Promise<any | null> {
    throw new Error('LicenseRepository.revokeSeat não implementado.');
  }
}

export = LicenseRepository;
