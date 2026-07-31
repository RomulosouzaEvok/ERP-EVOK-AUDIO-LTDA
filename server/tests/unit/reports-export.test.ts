import { toCsv } from '../../src/modules/reports/infrastructure/export/csvExporter';
import { toPdf } from '../../src/modules/reports/infrastructure/export/pdfExporter';

describe('Exportacao de relatorios: CSV', () => {
  /**
   * Gera cabecalho + linhas na ordem das colunas definidas, sem depender
   * dos nomes de campo brutos do model.
   *
   * @returns Void.
   */
  it('gera CSV com cabecalho e linhas na ordem das colunas', () => {
    const rows = [
      { code: 'P-001', name: 'Produto A', quantity: 10 },
      { code: 'P-002', name: 'Produto B', quantity: 5 },
    ];

    const csv = toCsv(rows, [
      { header: 'Código', accessor: (row) => row.code },
      { header: 'Nome', accessor: (row) => row.name },
      { header: 'Quantidade', accessor: (row) => row.quantity },
    ]);

    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Código,Nome,Quantidade');
    expect(lines[1]).toBe('P-001,Produto A,10');
    expect(lines[2]).toBe('P-002,Produto B,5');
  });

  /**
   * Valores com vírgula, aspas ou quebra de linha devem ser escapados
   * corretamente (RFC 4180), senão o CSV fica corrompido no Excel.
   *
   * @returns Void.
   */
  it('escapa valores com virgula, aspas ou quebra de linha', () => {
    const rows = [{ name: 'Cliente, Sobrenome "Apelido"\nLinha2' }];

    const csv = toCsv(rows, [{ header: 'Nome', accessor: (row) => row.name }]);
    const lines = csv.split('\r\n');

    expect(lines[1]).toBe('"Cliente, Sobrenome ""Apelido""\nLinha2"');
  });

  /**
   * Lista vazia gera CSV só com o cabeçalho, sem quebrar.
   *
   * @returns Void.
   */
  it('gera apenas o cabecalho quando nao ha linhas', () => {
    const csv = toCsv([], [{ header: 'Nome', accessor: () => '' }]);
    expect(csv).toBe('Nome');
  });
});

describe('Exportacao de relatorios: PDF', () => {
  /**
   * O PDF gerado deve comecar com a assinatura binaria `%PDF-`, garantindo
   * que e um arquivo PDF valido e nao um erro/HTML disfarcado.
   *
   * @returns Promise resolvida apos gerar e validar o buffer do PDF.
   */
  it('gera um buffer PDF valido com resumo e tabela de detalhes', async () => {
    const buffer = await toPdf(
      'Relatório de Teste',
      { 'Total de itens': 2 },
      [{ code: 'P-001', name: 'Produto A' }],
      [
        { header: 'Código', accessor: (row: any) => row.code },
        { header: 'Nome', accessor: (row: any) => row.name },
      ],
    );

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  /**
   * Relatorio sem linhas de detalhe (ex.: fluxo de caixa vazio) ainda deve
   * gerar um PDF valido, com a mensagem de "nenhum registro".
   *
   * @returns Promise resolvida apos gerar e validar o buffer do PDF.
   */
  it('gera PDF valido mesmo sem linhas de detalhe', async () => {
    const buffer = await toPdf('Relatório Vazio', { Total: 0 }, [], []);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
