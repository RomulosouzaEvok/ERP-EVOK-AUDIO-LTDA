/**
 * Importacao de cadastro por planilha (`/api/catalog-import`), contra
 * PostgreSQL real.
 *
 * ## Por que esta suite existe
 *
 * O modulo `spreadsheetImport` e o caminho pelo qual o cadastro inteiro da
 * fabrica entra no ERP de uma vez: uma unica requisicao grava `products`,
 * `items` e `bill_of_materials` **na mesma transacao**. Ate esta suite ele
 * nao tinha nenhum teste — nem unitario, nem de integracao. Pelo criterio de
 * aceite do proprio projeto
 * (`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`),
 * modulo sem uma escrita real bem-sucedida nao esta pronto: typecheck e
 * teste com dublê ja deixaram passar quatro rodadas de defeito silencioso
 * (coluna `NOT NULL` nunca preenchida, literal de ENUM inexistente, nome de
 * coluna errado que o Sequelize engole em silencio).
 *
 * ## O que e provado aqui
 *
 * | # | Pergunta | Onde |
 * |---|---|---|
 * | 1 | os modelos servidos batem com o contrato de colunas? | caso 1 |
 * | 2 | simular NAO grava nada? | caso 2 |
 * | 3 | importar grava produto, item E estrutura de verdade? | caso 3 |
 * | 4 | reimportar a mesma planilha ATUALIZA em vez de duplicar? | caso 4 |
 * | 5 | planilha com erro e recusada INTEIRA (nada gravado)? | caso 5 |
 * | 6 | quem nao tem o modulo `bom` consegue criar estrutura por aqui? | caso 6 |
 *
 * O caso 6 e o que justifica a exigencia dupla (`produtos` **e** `bom`) da
 * rota: sem ela, a importacao seria um caminho lateral para criar estrutura
 * de produto sem passar pelo modulo que a protege.
 *
 * @module tests/integration/catalog-spreadsheet-import
 */
import { api, authToken, hasIntegrationPrerequisites, mintToken } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo codigo criado por esta suite. */
const P = 'IMP';
const SUFFIX = String(Date.now()).slice(-8);

/** Codigos usados na planilha (o alto-falante e montado pelos outros dois). */
const COD_ACABADO = `${P}-AF-${SUFFIX}`;
const COD_COMPONENTE = `${P}-IMA-${SUFFIX}`;
const COD_MATERIA = `${P}-COBRE-${SUFFIX}`;

describeIntegration('Importacao de cadastro por planilha (/api/catalog-import)', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do administrador da suite. */
  function token(): string {
    return authToken();
  }

  /**
   * Afirma o status HTTP mostrando o CORPO quando falha.
   *
   * @param response - Resposta Supertest.
   * @param expected - Status esperado.
   * @param label - Descricao curta da chamada.
   * @returns A propria resposta, para encadear.
   */
  function expectStatus<T extends { status: number; body: any }>(response: T, expected: number, label: string): T {
    if (response.status !== expected) {
      throw new Error(
        `[${label}] esperado HTTP ${expected}, recebido ${response.status}. Corpo: ${JSON.stringify(response.body)}`,
      );
    }
    return response;
  }

  /**
   * Monta o CSV de produtos.
   *
   * Separador `;` e numero com virgula decimal de proposito: e exatamente o
   * que o Excel em portugues do Brasil grava, e o parser precisa aguentar os
   * dois (`parseDelimitedFile` / `parseNumeroPtBr`).
   *
   * @param precoAcabado - Preco de venda do alto-falante (varia entre casos
   * para provar a ATUALIZACAO da reimportacao).
   * @returns Conteudo do arquivo `produtos.csv`.
   */
  function csvProdutos(precoAcabado: string): string {
    return [
      'codigo;descricao;tipo;unidade;preco_venda;custo_padrao;estoque_minimo;lote_minimo;lead_time_dias;ncm;cest;peso_kg;localizacao;desenho;revisao;observacao',
      `${COD_ACABADO};Alto-falante 12 polegadas importado;PRODUTO ACABADO;un;${precoAcabado};180,00;2;1;5;85182100;2106400;4,250;RUA A - PRAT 3;DES-001;00;Cadastro por planilha`,
      `${COD_COMPONENTE};Ima de ferrite 120mm;COMPONENTE;un;;45,90;10;5;15;85182100;;1,100;RUA B - PRAT 1;;00;`,
      `${COD_MATERIA};Fio de cobre esmaltado 0,50mm;MATERIA-PRIMA;kg;;62,00;20;10;20;;;1,000;RUA C - PRAT 2;;00;`,
    ].join('\r\n');
  }

  /**
   * Monta o CSV de estrutura (o alto-falante e feito dos outros dois).
   *
   * @returns Conteudo do arquivo `estrutura.csv`.
   */
  function csvEstrutura(): string {
    return [
      'codigo_produto;codigo_componente;quantidade;unidade;perda_percentual;critico;revisao;observacao',
      `${COD_ACABADO};${COD_COMPONENTE};1;un;0;sim;00;Ima do conjunto magnetico`,
      `${COD_ACABADO};${COD_MATERIA};0,350;kg;2,5;nao;00;Fio da bobina movel`,
    ].join('\r\n');
  }

  /**
   * Envia os dois arquivos para uma das duas rotas de importacao.
   *
   * @param rota - `/simulacao` (nao grava) ou `''` (grava).
   * @param produtos - Conteudo de `produtos.csv`.
   * @param estrutura - Conteudo de `estrutura.csv`.
   * @param bearer - Token a usar (default: o administrador da suite).
   * @returns Resposta Supertest.
   */
  async function enviar(rota: string, produtos: string, estrutura: string, bearer = token()) {
    return api()
      .post(`/api/catalog-import${rota}`)
      .set('Authorization', `Bearer ${bearer}`)
      .attach('produtos', Buffer.from(produtos, 'utf8'), 'produtos.csv')
      .attach('estrutura', Buffer.from(estrutura, 'utf8'), 'estrutura.csv');
  }

  /**
   * Procura um produto pelo codigo.
   *
   * @param codigo - `products.code`.
   * @returns O produto, ou `undefined` se nao existir.
   */
  async function buscarProduto(codigo: string): Promise<any | undefined> {
    const response = await api()
      .get('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .query({ search: codigo, limit: 50 });
    expectStatus(response, 200, `buscarProduto:${codigo}`);
    return (response.body.data ?? []).find((row: any) => row.code === codigo);
  }

  // ====================================================================
  // CASO 1 — Os modelos servidos sao os que a validacao exige
  // ====================================================================
  it('caso 1: serve o contrato de colunas e os dois CSVs modelo', async () => {
    const modelos = await api()
      .get('/api/catalog-import/modelos')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(modelos, 200, 'modelos');

    const nomesProdutos = modelos.body.data.produtos.map((coluna: any) => coluna.coluna);
    const nomesEstrutura = modelos.body.data.estrutura.map((coluna: any) => coluna.coluna);
    expect(nomesProdutos).toEqual(expect.arrayContaining(['codigo', 'descricao', 'tipo', 'unidade']));
    expect(nomesEstrutura).toEqual(expect.arrayContaining(['codigo_produto', 'codigo_componente', 'quantidade']));

    // Um modelo que nao traz as colunas obrigatorias faz o usuario preencher
    // um arquivo que sera recusado — o modelo e parte do contrato.
    const modeloProdutos = await api()
      .get('/api/catalog-import/modelos/produtos.csv')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(modeloProdutos, 200, 'modelo:produtos');
    expect(modeloProdutos.headers['content-type']).toContain('text/csv');
    for (const coluna of ['codigo', 'descricao', 'tipo', 'unidade']) {
      expect(modeloProdutos.text).toContain(coluna);
    }

    const modeloEstrutura = await api()
      .get('/api/catalog-import/modelos/estrutura.csv')
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(modeloEstrutura, 200, 'modelo:estrutura');
    expect(modeloEstrutura.text).toContain('codigo_componente');
  });

  // ====================================================================
  // CASO 2 — Simular nao pode gravar
  // ====================================================================
  it('caso 2: a simulacao devolve o relatorio completo e NAO grava nada', async () => {
    const simulacao = await enviar('/simulacao', csvProdutos('1.250,00'), csvEstrutura());
    expectStatus(simulacao, 200, 'simulacao');

    expect(simulacao.body.data.modo).toBe('simulacao');
    expect(simulacao.body.data.gravado).toBe(false);
    expect(simulacao.body.data.erros).toHaveLength(0);
    expect(simulacao.body.data.resumo.produtos_criados).toBe(3);
    expect(simulacao.body.data.resumo.estruturas_criadas).toBe(1);

    // A prova que interessa nao e o relatorio dizer `gravado: false` — e o
    // banco nao ter o produto.
    expect(await buscarProduto(COD_ACABADO)).toBeUndefined();
  });

  // ====================================================================
  // CASO 3 — A escrita real: produto, item e estrutura
  // ====================================================================
  it('caso 3: a importacao grava produto, item e estrutura de verdade', async () => {
    const importacao = await enviar('', csvProdutos('1.250,00'), csvEstrutura());
    expectStatus(importacao, 200, 'importacao');
    expect(importacao.body.data.gravado).toBe(true);
    expect(importacao.body.data.resumo.produtos_criados).toBe(3);
    expect(importacao.body.data.resumo.estruturas_criadas).toBe(1);

    // 3.1 — os tres produtos existem, com o tipo traduzido do rotulo em
    // portugues para o ENUM do banco.
    const acabado = await buscarProduto(COD_ACABADO);
    const componente = await buscarProduto(COD_COMPONENTE);
    const materia = await buscarProduto(COD_MATERIA);
    expect(acabado).toBeDefined();
    expect(acabado.product_type).toBe('finished');
    expect(componente.product_type).toBe('component');
    expect(materia.product_type).toBe('raw_material');
    // Numero em formato brasileiro ("1.250,00") tem de chegar como 1250.
    expect(Number(acabado.price)).toBeCloseTo(1250, 2);
    expect(Number(componente.cost_price)).toBeCloseTo(45.9, 2);
    ctx.acabadoId = acabado.id;

    // 3.2 — o cadastro NOVO (items) nasceu junto e com o mesmo codigo: sem
    // esse par o MRP perde a aresta (crosswalk `products.code = items.codigo`).
    const item = await api()
      .get('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .query({ search: COD_ACABADO, limit: 20 });
    expectStatus(item, 200, 'items');
    const itemAcabado = (item.body.data ?? []).find((row: any) => row.codigo === COD_ACABADO);
    expect(itemAcabado).toBeDefined();
    expect(itemAcabado.tipo).toBe('PRODUTO_ACABADO');

    // 3.3 — a estrutura existe na FONTE UNICA (G1: `bill_of_materials`), com
    // os dois componentes, a quantidade decimal e a perda percentual.
    const bom = await api()
      .get(`/api/engineering/bom/product/${ctx.acabadoId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(bom, 200, 'bom');
    expect(bom.body.data.status).toBe('active');

    const componentes = bom.body.data.items ?? bom.body.data.components ?? [];
    expect(componentes).toHaveLength(2);
    const porProduto = new Map<number, any>(
      componentes.map((linha: any) => [Number(linha.component_product_id ?? linha.component_id), linha]),
    );
    const linhaIma = porProduto.get(Number(componente.id));
    const linhaCobre = porProduto.get(Number(materia.id));
    expect(linhaIma).toBeDefined();
    expect(Number(linhaIma.quantity)).toBeCloseTo(1, 4);
    expect(Number(linhaCobre.quantity)).toBeCloseTo(0.35, 4);
    expect(Number(linhaCobre.scrap_percentage ?? linhaCobre.loss_percentage ?? 0)).toBeCloseTo(2.5, 2);
  });

  // ====================================================================
  // CASO 4 — Reimportar atualiza, nao duplica
  // ====================================================================
  it('caso 4: reimportar a mesma planilha ATUALIZA o cadastro e nao duplica nada', async () => {
    const reimportacao = await enviar('', csvProdutos('1.390,00'), csvEstrutura());
    expectStatus(reimportacao, 200, 'reimportacao');
    expect(reimportacao.body.data.gravado).toBe(true);

    // Nenhum produto novo: o codigo e a chave.
    expect(reimportacao.body.data.resumo.produtos_criados).toBe(0);
    expect(
      reimportacao.body.data.resumo.produtos_atualizados + reimportacao.body.data.resumo.produtos_sem_alteracao,
    ).toBe(3);
    // Estrutura identica (mesma revisao) nao gera uma segunda versao ativa.
    expect(reimportacao.body.data.resumo.estruturas_criadas).toBe(0);

    const acabado = await buscarProduto(COD_ACABADO);
    expect(Number(acabado.price)).toBeCloseTo(1390, 2);
    expect(acabado.id).toBe(ctx.acabadoId);

    // E, de fato, ha UM produto com esse codigo — nao dois.
    const busca = await api()
      .get('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .query({ search: COD_ACABADO, limit: 50 });
    expectStatus(busca, 200, 'busca:duplicidade');
    expect((busca.body.data ?? []).filter((row: any) => row.code === COD_ACABADO)).toHaveLength(1);
  });

  // ====================================================================
  // CASO 5 — Uma linha ruim recusa a planilha inteira
  // ====================================================================
  it('caso 5: planilha com erro e recusada INTEIRA, sem gravar meio cadastro', async () => {
    const codigoNovo = `${P}-NOVO-${SUFFIX}`;
    const produtosComErro = [
      'codigo;descricao;tipo;unidade;preco_venda;custo_padrao',
      // Linha 2 valida — e justamente ela que NAO pode entrar.
      `${codigoNovo};Produto valido que nao deve entrar;COMPONENTE;un;;10,00`,
      // Linha 3 com tipo inexistente.
      `${P}-RUIM-${SUFFIX};Produto de tipo desconhecido;GELATINA;un;;10,00`,
    ].join('\r\n');

    const estruturaComErro = [
      'codigo_produto;codigo_componente;quantidade',
      // Componente que nao existe em lugar nenhum.
      `${COD_ACABADO};${P}-FANTASMA-${SUFFIX};2`,
    ].join('\r\n');

    const recusada = await enviar('', produtosComErro, estruturaComErro);
    expectStatus(recusada, 422, 'recusada');
    expect(recusada.body.data.gravado).toBe(false);
    expect(recusada.body.data.erros.length).toBeGreaterThanOrEqual(1);

    // Toda recusa aponta arquivo + linha (numeracao do Excel: dados comecam
    // em 2) — sem isso quem preencheu a planilha nao sabe onde mexer.
    for (const erro of recusada.body.data.erros) {
      expect(['produtos', 'estrutura']).toContain(erro.arquivo);
      expect(erro.linha).toBeGreaterThanOrEqual(2);
      expect(typeof erro.mensagem).toBe('string');
      expect(erro.mensagem.length).toBeGreaterThan(10);
    }

    // O tipo desconhecido e apontado na linha 3 do arquivo de produtos.
    const erroDeTipo = recusada.body.data.erros.find(
      (erro: any) => erro.arquivo === 'produtos' && erro.linha === 3,
    );
    expect(erroDeTipo).toBeDefined();
    expect(erroDeTipo.coluna).toBe('tipo');

    // A prova de "tudo ou nada": a linha boa da mesma planilha tambem ficou
    // de fora.
    expect(await buscarProduto(codigoNovo)).toBeUndefined();
  });

  // ====================================================================
  // CASO 5b — O arquivo de estrutura tambem e conferido
  // ====================================================================
  it('caso 5b: componente inexistente na estrutura recusa a planilha e aponta a linha', async () => {
    const estruturaFantasma = [
      'codigo_produto;codigo_componente;quantidade',
      `${COD_ACABADO};${P}-FANTASMA-${SUFFIX};2`,
    ].join('\r\n');

    // Produtos identicos aos ja cadastrados (nao ha nada a corrigir la), para
    // que o UNICO problema esteja no arquivo de estrutura.
    const recusada = await enviar('', csvProdutos('1.390,00'), estruturaFantasma);
    expectStatus(recusada, 422, 'recusada:estrutura');
    expect(recusada.body.data.gravado).toBe(false);

    const erro = recusada.body.data.erros.find((linha: any) => linha.arquivo === 'estrutura');
    expect(erro).toBeDefined();
    expect(erro.linha).toBe(2);
    expect(erro.mensagem).toContain(`${P}-FANTASMA-${SUFFIX}`);

    // A recusa da estrutura NAO pode deixar passar a gravacao dos produtos —
    // e a mesma transacao.
    expect(recusada.body.data.resumo.produtos_atualizados).toBe(0);
    expect(recusada.body.data.resumo.produtos_criados).toBe(0);
  });

  // ====================================================================
  // CASO 6 — A exigencia dupla de permissao nao e decorativa
  // ====================================================================
  it('caso 6: quem tem `produtos` mas nao tem `bom` nao importa (nao ha atalho para criar estrutura)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const profile = await AccessProfile.create({ nome: `Cadastro sem BOM ${SUFFIX}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'produtos', level: 'operate' });

    const usuario = await User.create({
      name: 'Usuario de cadastro sem BOM',
      email: `cadastro-sem-bom-${SUFFIX}@evok.local`,
      password: 'SenhaCadastro123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });
    const semBom = mintToken(usuario);

    // Ler o modelo ele pode — e cadastro de produto.
    const modelos = await api()
      .get('/api/catalog-import/modelos')
      .set('Authorization', `Bearer ${semBom}`);
    expectStatus(modelos, 200, 'modelos:semBom');

    // Importar, nao: a mesma operacao criaria estrutura de produto.
    const bloqueado = await enviar('', csvProdutos('1.250,00'), csvEstrutura(), semBom);
    expectStatus(bloqueado, 403, 'importacao:semBom');
    expect(bloqueado.body.error.code).toBe('MODULE_ACCESS_DENIED');
  });
});
