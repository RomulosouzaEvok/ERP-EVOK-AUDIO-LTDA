/**
 * Testes do parser AEJ (`aejParser.parseAej`) — Grupo 10 RH, Frequência/
 * Ponto (`docs/rh/04-FREQUENCIA.md`). Casos exigidos pela tarefa: arquivo
 * válido, linha malformada tolerada, tipo de registro desconhecido, e
 * (matrícula/CPF) sem funcionário correspondente é responsabilidade do use
 * case (`CreateTimeImportBatchUseCase`, coberto em teste de integração) —
 * aqui cobrimos apenas o que o parser em si decide.
 *
 * @module tests/unit/rh-aej-parser
 */
import { parseAej } from '../../src/modules/rh/domain/services/aejParser';

function toBuffer(lines: string[]): Buffer {
  return Buffer.from(lines.join('\n'), 'utf8');
}

describe('aejParser.parseAej', () => {
  it('arquivo válido: extrai registros tipo 2, ignora cabeçalho (1) e rodapé (9)', () => {
    const buffer = toBuffer([
      '1;12345678000199;2026-08-01;2026-08-31',
      '2;11144477735;MAT001;2026-08-03;08:00;01:30;00:00;00:00;N;',
      '2;22233344456;MAT002;2026-08-03;07:30;00:00;02:00;01:00;N;',
      '9;2',
    ]);

    const result = parseAej(buffer);

    expect(result.totalLines).toBe(4);
    expect(result.records).toHaveLength(2);
    expect(result.rejectedLines).toHaveLength(0);
    expect(result.unknownRecordTypes).toEqual({});

    expect(result.records[0]).toEqual({
      cpf: '11144477735',
      registration: 'MAT001',
      workDate: '2026-08-03',
      hoursWorked: 8,
      overtime50: 1.5,
      overtime100: 0,
      nightHours: 0,
      absence: false,
      absenceJustified: false,
      absenceReason: null,
    });
    expect(result.records[1].overtime100).toBe(2);
    expect(result.records[1].nightHours).toBe(1);
  });

  it('aceita horas em formato decimal além de HH:MM', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;2026-08-03;7.5;0;0;0;N;',
    ]);

    const result = parseAej(buffer);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].hoursWorked).toBe(7.5);
  });

  it('linha malformada (poucos campos) vira item rejeitado, sem abortar o arquivo', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;2026-08-03;08:00', // faltam campos
      '2;22233344456;MAT002;2026-08-04;08:00;00:00;00:00;00:00;N;',
    ]);

    const result = parseAej(buffer);

    expect(result.records).toHaveLength(1);
    expect(result.rejectedLines).toHaveLength(1);
    expect(result.rejectedLines[0].line).toBe(1);
    expect(result.rejectedLines[0].reason).toMatch(/10 campos/);
  });

  it('linha malformada (data inválida) vira item rejeitado com motivo específico', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;03/08/2026;08:00;00:00;00:00;00:00;N;',
    ]);

    const result = parseAej(buffer);

    expect(result.records).toHaveLength(0);
    expect(result.rejectedLines).toHaveLength(1);
    expect(result.rejectedLines[0].reason).toMatch(/Data inválida/);
  });

  it('tipo de registro desconhecido é ignorado e contado, não vira erro', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;2026-08-03;08:00;00:00;00:00;00:00;N;',
      '5;algum-dado-nao-mapeado',
      '5;outro',
      'X;linha-totalmente-fora-do-padrao',
    ]);

    const result = parseAej(buffer);

    expect(result.records).toHaveLength(1);
    expect(result.rejectedLines).toHaveLength(0);
    expect(result.unknownRecordTypes).toEqual({ '5': 2, X: 1 });
  });

  it('falta com abono: absence=true, absence_justified=true, motivo preservado', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;2026-08-05;00:00;00:00;00:00;00:00;S;Atestado médico',
    ]);

    const result = parseAej(buffer);

    expect(result.records[0].absence).toBe(true);
    expect(result.records[0].absenceJustified).toBe(true);
    expect(result.records[0].absenceReason).toBe('Atestado médico');
  });

  it('falta sem abono: absence=true, absence_justified=false', () => {
    const buffer = toBuffer([
      '2;11144477735;MAT001;2026-08-05;00:00;00:00;00:00;00:00;S;',
    ]);

    const result = parseAej(buffer);

    expect(result.records[0].absence).toBe(true);
    expect(result.records[0].absenceJustified).toBe(false);
    expect(result.records[0].absenceReason).toBeNull();
  });

  it('arquivo vazio (sem linhas não-vazias) resulta em zero registros', () => {
    const result = parseAej(Buffer.from('\n\n  \n', 'utf8'));
    expect(result.totalLines).toBe(0);
    expect(result.records).toHaveLength(0);
    expect(result.rejectedLines).toHaveLength(0);
  });

  it('arquivo sem nenhum registro tipo 2 reconhecido (só cabeçalho/rodapé/tipos desconhecidos)', () => {
    const buffer = toBuffer([
      '1;12345678000199;2026-08-01;2026-08-31',
      '9;0',
    ]);

    const result = parseAej(buffer);
    expect(result.records).toHaveLength(0);
  });
});
