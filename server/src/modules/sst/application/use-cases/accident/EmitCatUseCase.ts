/**
 * Use case: emitir a primeira CAT vinculada a um acidente (RF-SST-024/025,
 * UC-46). Reabertura usa `ReopenCatUseCase` (endpoint separado).
 *
 * Efeitos, na mesma transação:
 * 1. Calcula `prazo_limite` (RNF-SST-04).
 * 2. Cria a CAT (`tipo: 'obito'` para acidente fatal; `inicial` nos demais).
 * 3. Enfileira `EventoESocialSST` tipo `S-2210` `pendente` (RF-SST-042).
 * 4. Marca `sst_acidentes.houve_cat = true` (única forma permitida de
 *    alterar essa coluna após confirmado — mesma trilha de auditoria de
 *    `CreateAccidentComplementUseCase`).
 *
 * Não bloqueia a criação se `prazo_limite` já estiver no passado (E1) — o
 * evento nasce como pendência crítica visível na fila, nunca descartado.
 *
 * @module modules/sst/application/use-cases/accident/EmitCatUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import AccidentRepository from '../../../domain/repositories/AccidentRepository';
import EsocialEventRepository from '../../../domain/repositories/EsocialEventRepository';
import { NotFoundError, BusinessRuleError } from '../../../../../errors';
import { calcularPrazoLimiteCat } from '../../../domain/services/legalDeadlineService';
import { toCatDTO } from '../../../infrastructure/mappers/AccidentMapper';

const { sequelize } = require('../../../../../config/database');

interface EmitCatInput {
  accidentId: string | number;
  emitenteId: number;
  body?: { tipo?: string };
}

class EmitCatUseCase extends UseCase<EmitCatInput, any> {
  private readonly accidentRepository: AccidentRepository;
  private readonly esocialEventRepository: EsocialEventRepository;

  public constructor(accidentRepository: AccidentRepository, esocialEventRepository: EsocialEventRepository) {
    super();
    this.accidentRepository = accidentRepository;
    this.esocialEventRepository = esocialEventRepository;
  }

  /**
   * @throws {NotFoundError} Se o acidente não existir (404).
   * @throws {BusinessRuleError} Se já existir a primeira CAT ou se um tipo explícito contrariar a gravidade (422).
   */
  public async execute({ accidentId, emitenteId, body = {} }: EmitCatInput): Promise<any> {
    const t = await sequelize.transaction();
    try {
      const acidente = await this.accidentRepository.findAccidentById(accidentId, t);
      if (!acidente) throw new NotFoundError('Acidente não encontrado.');

      const catsExistentes = await this.accidentRepository.findCatsByAccidentId(acidente.id);
      const jaTemComunicacaoInicial = catsExistentes.some((c: any) => c.tipo === 'inicial' || c.tipo === 'obito');
      if (jaTemComunicacaoInicial) {
        throw new BusinessRuleError('Já existe uma CAT inicial para este acidente — use POST /cat/:catId/reopen para reabertura.');
      }

      // APR-2026-056/D1: a gravidade registrada é a única fonte de verdade;
      // o request nunca decide se a comunicação é inicial ou de óbito.
      const tipo = acidente.gravidade === 'obito' ? 'obito' : 'inicial';
      if (body.tipo !== undefined && body.tipo !== tipo) {
        throw new BusinessRuleError(
          `O tipo de CAT informado (${body.tipo}) é incompatível com a gravidade do acidente; o tipo esperado é ${tipo}.`,
        );
      }
      const prazoLimite = calcularPrazoLimiteCat(acidente.data_hora, acidente.gravidade);

      const cat = await this.accidentRepository.createCat({
        acidente_id: acidente.id,
        tipo,
        data_emissao: new Date().toISOString().slice(0, 10),
        prazo_limite: prazoLimite,
        emitente_id: emitenteId,
        status_esocial_s2210: 'pendente'
      }, t);

      await this.esocialEventRepository.create({
        tipo: 'S-2210',
        origem_tipo: 'cat',
        origem_id: cat.id,
        prazo_legal: prazoLimite,
        status: 'pendente'
      }, t);

      if (!acidente.houve_cat) {
        await this.accidentRepository.createComplement({
          acidente_id: acidente.id,
          campo: 'houve_cat',
          valor_anterior: 'false',
          valor_novo: 'true',
          motivo: `CAT #${cat.id} emitida`,
          registrado_por: emitenteId
        }, t);
        await this.accidentRepository.updateAccidentConsolidated(acidente.id, { houve_cat: true }, t);
      }

      await t.commit();
      return { cat: toCatDTO(cat), prazo_limite: prazoLimite, esocial_event_tipo: 'S-2210' };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = EmitCatUseCase;
