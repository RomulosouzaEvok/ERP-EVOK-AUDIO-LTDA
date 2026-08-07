/**
 * Implementação Sequelize do repositório de `JurIntellectualProperty`/
 * `JurIpContractLink` (Propriedade Intelectual — RF-JUR-031 a 034).
 *
 * @module modules/juridico/infrastructure/sequelize/SequelizeIpAssetRepository
 */

import IpAssetRepository from '../../domain/repositories/IpAssetRepository';

const { JurIntellectualProperty, JurIpContractLink, JurContract }: any = require('../../../../models/index');

class SequelizeIpAssetRepository extends IpAssetRepository {
  /**
   * `excludeTradeSecret=true` filtra `ip_type != 'trade_secret'` — regra de
   * acesso mais restritiva do módulo (§6.3, RF-JUR-033), aplicada aqui na
   * camada de persistência para que o ativo nem apareça na contagem/
   * paginação de quem não é `role==='admin'`.
   */
  public async findAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }, excludeTradeSecret: boolean): Promise<{ count: number; rows: any[] }> {
    const { Op } = require('sequelize');
    const where: Record<string, unknown> = {};
    if (filters.type) where.ip_type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.responsible_user_id) where.responsible_user_id = filters.responsible_user_id;
    if (filters.vencendo_em_dias !== undefined) {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() + Number(filters.vencendo_em_dias));
      where[Op.or] = [
        { expiration_date: { [Op.lte]: limitDate.toISOString().slice(0, 10), [Op.gte]: new Date().toISOString().slice(0, 10) } },
        { next_annuity_date: { [Op.lte]: limitDate.toISOString().slice(0, 10), [Op.gte]: new Date().toISOString().slice(0, 10) } },
      ];
    }
    if (excludeTradeSecret) {
      where.ip_type = where.ip_type ? where.ip_type : { [Op.ne]: 'trade_secret' };
      if (filters.type && filters.type === 'trade_secret') {
        // força resultado vazio: usuário não-admin nunca vê trade_secret, nem filtrando explicitamente.
        where.ip_type = '__none__';
      }
    }

    return JurIntellectualProperty.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['createdAt', 'DESC']],
    });
  }

  public async findById(id: number | string): Promise<any | null> {
    return JurIntellectualProperty.findByPk(id, {
      include: [{ model: JurIpContractLink, as: 'contractLinks', required: false, include: [{ model: JurContract, as: 'contract', attributes: ['id', 'contract_number'], required: false }] }],
    });
  }

  public async create(data: Record<string, unknown>): Promise<any> {
    return JurIntellectualProperty.create(data);
  }

  public async update(id: number | string, data: Record<string, unknown>): Promise<any | null> {
    const ipAsset = await JurIntellectualProperty.findByPk(id);
    if (!ipAsset) return null;
    await ipAsset.update(data);
    return ipAsset;
  }

  public async linkContract(data: Record<string, unknown>): Promise<any> {
    return JurIpContractLink.create(data);
  }

  public async listContractLinks(ipId: number | string): Promise<any[]> {
    return JurIpContractLink.findAll({
      where: { ip_id: ipId },
      include: [{ model: JurContract, as: 'contract', attributes: ['id', 'contract_number', 'contract_type', 'status'], required: false }],
    });
  }
}

export = SequelizeIpAssetRepository;
