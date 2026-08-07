/**
 * Use case: registrar um ASO realizado (RF-SST-012, BR-SST-010/011).
 *
 * Efeitos colaterais (mesma transação):
 * 1. Calcula `data_vencimento` a partir do `PlanoExames` aplicável à função
 *    do funcionário (RF-SST-016) — obrigatório para ASO `periodico`.
 * 2. Enfileira `EventoESocialSST` tipo `S-2220` em `pendente` (RF-SST-041).
 *
 * RF-SST-018 (bloqueio de apontamento em `resultado` inapto/restrição
 * incompatível) fica registrado como pendência para o próximo bloco — não
 * existe hoje uma tabela/flag dedicada consultada pelo módulo de
 * Apontamento; o `resultado` do ASO mais recente já é suficiente para uma
 * consulta direta futura, mas o mecanismo de bloqueio automático não foi
 * implementado nesta passada (ver handoff).
 *
 * @module modules/sst/application/use-cases/aso/CreateAsoUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AsoRepository from '../../../domain/repositories/AsoRepository';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../errors';
import { toAsoDetailDTO } from '../../../infrastructure/mappers/AsoMapper';

const { sequelize } = require('../../../../../config/database');

const TIPOS = ['admissional', 'periodico', 'retorno_trabalho', 'mudanca_riscos', 'demissional'];
const RESULTADOS = ['apto', 'inapto', 'apto_com_restricoes'];

interface CreateAsoInput {
  body: Record<string, any>;
  registradoPor: number;
}

class CreateAsoUseCase extends UseCase<CreateAsoInput, any> {
  private readonly asoRepository: AsoRepository;
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(asoRepository: AsoRepository, esocialEventRepository: EsocialEventRepository) {
    super();
    this.asoRepository = asoRepository;
    this.esocialEventRepository = esocialEventRepository;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes ou enum inválido (400).
   * @throws {NotFoundError} Funcionário informado não existe (404).
   * @throws {BusinessRuleError} ASO `periodico` sem `PlanoExames` aplicável (422).
   */
  public async execute({ body, registradoPor }: CreateAsoInput): Promise<any> {
    const { employee_id, tipo, data_realizacao, resultado, medico_examinador } = body;
    if (!employee_id || !tipo || !data_realizacao || !resultado || !medico_examinador) {
      throw new ValidationError('employee_id, tipo, data_realizacao, resultado e medico_examinador são obrigatórios.');
    }
    if (!TIPOS.includes(tipo)) throw new ValidationError(`tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.`);
    if (!RESULTADOS.includes(resultado)) throw new ValidationError(`resultado inválido. Valores aceitos: ${RESULTADOS.join(', ')}.`);

    const employee = await this.asoRepository.findEmployeeById(employee_id);
    if (!employee) throw new NotFoundError('Funcionário informado não existe.');

    let dataVencimento: string | null = null;
    if (tipo === 'periodico') {
      const plano = await this.asoRepository.findApplicableExamPlan(employee.position ?? null, null);
      if (!plano) {
        throw new BusinessRuleError('Não há PlanoExames cadastrado para a função/GES deste funcionário — cadastre o plano antes de registrar o ASO periódico (BR-SST-011).');
      }
      const venc = new Date(data_realizacao);
      venc.setMonth(venc.getMonth() + plano.periodicidade_meses);
      dataVencimento = venc.toISOString().slice(0, 10);
    }

    const t = await sequelize.transaction();
    try {
      const aso = await this.asoRepository.createAso({
        employee_id,
        tipo,
        data_realizacao,
        resultado,
        restricoes: body.restricoes ?? null,
        medico_examinador,
        medico_coordenador_pcmso: body.medico_coordenador_pcmso ?? null,
        data_vencimento: dataVencimento,
        arquivo_url: body.arquivo_url ?? null,
        registrado_por: registradoPor
      });

      await this.esocialEventRepository.create({
        tipo: 'S-2220',
        origem_tipo: 'aso',
        origem_id: aso.id,
        status: 'pendente'
      }, t);

      await t.commit();
      return toAsoDetailDTO(aso);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateAsoUseCase;
