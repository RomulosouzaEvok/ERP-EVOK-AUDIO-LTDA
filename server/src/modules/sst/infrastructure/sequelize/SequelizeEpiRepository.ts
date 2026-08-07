/**
 * Implementação Sequelize do repositório do cluster EPI (NR-6).
 *
 * @module modules/sst/infrastructure/sequelize/SequelizeEpiRepository
 */

import EpiRepository from '../../domain/repositories/EpiRepository';

const {
  SstTipoEpi, SstMatrizEpi, SstEntregaEpi, SstDevolucaoEpi, Item, Employee, Department
}: any = require('../../../../models/index');
const { Op } = require('sequelize');

class SequelizeEpiRepository extends EpiRepository {
  /** @inheritdoc */
  public async findTiposAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.active !== undefined) where.ativo = filters.active === 'true' || filters.active === true;
    if (filters.item_id) where.item_id = filters.item_id;
    if (filters.ca_valido === 'true') where.ca_validade = { [Op.gte]: new Date() };
    return SstTipoEpi.findAndCountAll({ where, limit: pagination.limit, offset: pagination.offset, order: [['nome', 'ASC']] });
  }

  /** @inheritdoc */
  public async findTipoById(id: number | string): Promise<any | null> {
    return SstTipoEpi.findByPk(id);
  }

  /** @inheritdoc */
  public async findTipoActiveByCa(ca: string): Promise<any | null> {
    return SstTipoEpi.findOne({ where: { ca, ativo: true } });
  }

  /** @inheritdoc */
  public async createTipo(data: Record<string, unknown>): Promise<any> {
    return SstTipoEpi.create(data);
  }

  /** @inheritdoc */
  public async updateTipo(id: number | string, data: Record<string, unknown>): Promise<any> {
    const tipo = await SstTipoEpi.findByPk(id);
    if (!tipo) return null;
    await tipo.update(data);
    return tipo;
  }

  /** @inheritdoc */
  public async findItemById(itemId: string): Promise<any | null> {
    return Item.findByPk(itemId);
  }

  /** @inheritdoc */
  public async findMatrizAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.position) where.position = filters.position;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.epi_type_id) where.tipo_epi_id = filters.epi_type_id;
    return SstMatrizEpi.findAndCountAll({
      where,
      include: [{ model: SstTipoEpi, as: 'tipoEpi' }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['id', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findMatrizById(id: number | string): Promise<any | null> {
    return SstMatrizEpi.findByPk(id);
  }

  /** @inheritdoc */
  public async createMatriz(data: Record<string, unknown>): Promise<any> {
    return SstMatrizEpi.create(data);
  }

  /** @inheritdoc */
  public async updateMatriz(id: number | string, data: Record<string, unknown>): Promise<any> {
    const matriz = await SstMatrizEpi.findByPk(id);
    if (!matriz) return null;
    await matriz.update(data);
    return matriz;
  }

  /** @inheritdoc */
  public async deleteMatriz(id: number | string): Promise<number> {
    return SstMatrizEpi.destroy({ where: { id } });
  }

  /** @inheritdoc */
  public async findMatrizAtivaSemEntregaVigente(): Promise<any[]> {
    // RF-SST-008: ativos em função da MatrizEPI (com department_id ou
    // position) sem NENHUMA EntregaEPI confirmada vigente (data_prevista_troca
    // no futuro ou nula) para aquele TipoEPI. Implementação simplificada
    // (join em aplicação, volume baixo — dezenas/centenas de linhas, não
    // milhões): busca toda a matriz ativa + funcionários ativos do(s)
    // setor(es)/função(ões) e cruza com as entregas confirmadas vigentes.
    const matriz = await SstMatrizEpi.findAll({ where: { ativo: true }, include: [{ model: SstTipoEpi, as: 'tipoEpi' }] });
    const result: any[] = [];
    for (const item of matriz) {
      const employeeWhere: Record<string, unknown> = { status: 'active' };
      if (item.department_id) employeeWhere.department_id = item.department_id;
      if (item.position) employeeWhere.position = item.position;
      const employees = await Employee.findAll({ where: employeeWhere, include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }] });
      for (const employee of employees) {
        const entregaVigente = await SstEntregaEpi.findOne({
          where: {
            employee_id: employee.id,
            tipo_epi_id: item.tipo_epi_id,
            confirmada: true,
            [Op.or]: [{ data_prevista_troca: null }, { data_prevista_troca: { [Op.gte]: new Date() } }]
          }
        });
        if (!entregaVigente) {
          result.push({ employee, matriz: item });
        }
      }
    }
    return result;
  }

  /** @inheritdoc */
  public async findEntregasAndCount(filters: Record<string, any>, pagination: { limit: number; offset: number }): Promise<{ count: number; rows: any[] }> {
    const where: Record<string, unknown> = {};
    if (filters.employee_id) where.employee_id = filters.employee_id;
    if (filters.epi_type_id) where.tipo_epi_id = filters.epi_type_id;
    if (filters.motivo) where.motivo = filters.motivo;
    if (filters.status === 'rascunho') where.confirmada = false;
    if (filters.status === 'confirmada') where.confirmada = true;
    if (filters.vencendo_em_dias) {
      const limite = new Date();
      limite.setDate(limite.getDate() + Number(filters.vencendo_em_dias));
      where.data_prevista_troca = { [Op.lte]: limite };
    }
    return SstEntregaEpi.findAndCountAll({
      where,
      include: [{ model: SstTipoEpi, as: 'tipoEpi' }, { model: SstDevolucaoEpi, as: 'devolucoes' }],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['id', 'DESC']]
    });
  }

  /** @inheritdoc */
  public async findEntregaById(id: number | string, transaction?: any): Promise<any | null> {
    return SstEntregaEpi.findByPk(id, {
      include: [{ model: SstTipoEpi, as: 'tipoEpi' }, { model: SstDevolucaoEpi, as: 'devolucoes' }],
      ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {})
    });
  }

  /** @inheritdoc */
  public async createEntrega(data: Record<string, unknown>): Promise<any> {
    return SstEntregaEpi.create(data);
  }

  /** @inheritdoc */
  public async updateEntregaRascunho(id: number | string, data: Record<string, unknown>): Promise<any> {
    const entrega = await SstEntregaEpi.findByPk(id);
    if (!entrega) return null;
    await entrega.update(data);
    return entrega;
  }

  /** @inheritdoc */
  public async confirmEntrega(id: number | string, data: Record<string, unknown>, transaction: any): Promise<any> {
    const entrega = await SstEntregaEpi.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!entrega) return null;
    await entrega.update(data, { transaction });
    return entrega;
  }

  /** @inheritdoc */
  public async createDevolucao(data: Record<string, unknown>): Promise<any> {
    return SstDevolucaoEpi.create(data);
  }

  /** @inheritdoc */
  public async findFichaByEmployeeId(employeeId: number): Promise<any[]> {
    return SstEntregaEpi.findAll({
      where: { employee_id: employeeId },
      include: [{ model: SstTipoEpi, as: 'tipoEpi' }, { model: SstDevolucaoEpi, as: 'devolucoes' }],
      order: [['data_entrega', 'DESC']]
    });
  }
}

export = SequelizeEpiRepository;
