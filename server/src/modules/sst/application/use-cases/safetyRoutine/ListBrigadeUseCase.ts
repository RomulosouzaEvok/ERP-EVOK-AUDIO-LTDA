/**
 * Use case: listar brigadistas, com `efetivo_ativo` calculado vs. mínimo
 * configurado (RF-SST-052).
 *
 * MÍNIMO CONFIGURADO (simplificação documentada): não há, nesta passada,
 * uma tela/tabela de parametrização do mínimo de brigadistas por norma
 * técnica (NBR 14276) — usa uma constante fixa
 * `[VERIFICAR COM TÉCNICO SST DA EMPRESA]`, mesmo padrão de
 * "constante configurável, não hard-code" documentado no bloco de dados.
 *
 * @module modules/sst/application/use-cases/safetyRoutine/ListBrigadeUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import SafetyRoutineRepository from '../../../domain/repositories/SafetyRoutineRepository';
import { toBrigadeMemberDTO } from '../../../infrastructure/mappers/SafetyRoutineMapper';

const MINIMO_CONFIGURADO_PLACEHOLDER = 4;

class ListBrigadeUseCase extends UseCase<Record<string, any>, any> {
  private readonly repository: SafetyRoutineRepository;

  public constructor(repository: SafetyRoutineRepository) {
    super();
    this.repository = repository;
  }

  public async execute(input: Record<string, any>) {
    const { page = '1', limit = '20', ...filters } = input;
    const p = parseInt(String(page), 10);
    const l = parseInt(String(limit), 10);
    const { count, rows } = await this.repository.findBrigadeAndCount(filters, { limit: l, offset: (p - 1) * l });
    const efetivoAtivo = rows.filter((r: any) => r.ativo).length;
    return {
      rows: rows.map((r: any) => toBrigadeMemberDTO(r, efetivoAtivo, MINIMO_CONFIGURADO_PLACEHOLDER)),
      total: count, page: p, limit: l, totalPages: Math.ceil(count / l)
    };
  }
}

export = ListBrigadeUseCase;
