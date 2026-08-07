/**
 * Use case: calcular o dimensionamento atual da CIPA (titulares/suplentes)
 * a partir do headcount ativo (RF-SST-028, UC-48).
 *
 * IMPLEMENTAÇÃO SIMPLIFICADA (documentada, não omissão): a NR-5 (Quadro I)
 * define faixas por CNAE/grau de risco — este bloco usa uma tabela
 * genérica por faixa de headcount, sem diferenciar grau de risco
 * (`[VERIFICAR COM TÉCNICO SST DA EMPRESA — CNAE/grau de risco exato]`,
 * mesmo padrão de "constante parametrizável, documentada como
 * simplificação" já usado em `legalDeadlineService`).
 *
 * @module modules/sst/application/use-cases/cipa/GetDimensioningUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import CipaRepository from '../../../domain/repositories/CipaRepository';

interface Faixa { min: number; max: number; titulares: number; suplentes: number }

const FAIXAS: Faixa[] = [
  { min: 0, max: 19, titulares: 0, suplentes: 0 },
  { min: 20, max: 49, titulares: 1, suplentes: 1 },
  { min: 50, max: 99, titulares: 2, suplentes: 2 },
  { min: 100, max: 250, titulares: 3, suplentes: 2 },
  { min: 251, max: 500, titulares: 4, suplentes: 3 },
  { min: 501, max: 1000, titulares: 5, suplentes: 4 },
  { min: 1001, max: Infinity, titulares: 6, suplentes: 5 }
];

class GetDimensioningUseCase extends UseCase<void, any> {
  private readonly cipaRepository: CipaRepository;

  public constructor(cipaRepository: CipaRepository) {
    super();
    this.cipaRepository = cipaRepository;
  }

  public async execute(): Promise<any> {
    const headcount = await this.cipaRepository.countHeadcount();
    const faixa = FAIXAS.find((f) => headcount >= f.min && headcount <= f.max) ?? FAIXAS[FAIXAS.length - 1];
    return {
      headcount,
      titulares_empregador: faixa.titulares,
      titulares_empregados: faixa.titulares,
      suplentes_empregador: faixa.suplentes,
      suplentes_empregados: faixa.suplentes,
      dispensado: faixa.titulares === 0,
      observacao: '[VERIFICAR COM TÉCNICO SST DA EMPRESA] Tabela genérica por faixa de headcount — NR-5 Quadro I diferencia por CNAE/grau de risco, não aplicado nesta passada.'
    };
  }
}

export = GetDimensioningUseCase;
