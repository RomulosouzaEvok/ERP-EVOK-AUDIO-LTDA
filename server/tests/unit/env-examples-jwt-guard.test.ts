import fs from 'fs';
import path from 'path';

/**
 * AUD-AUTHN-01 / CASE-005 — guarda sobre os arquivos de exemplo de ambiente.
 *
 * Propriedade travada aqui: quem copiar um `.env*.example` versionado e subir a
 * API com ele **nao consegue subir** — o boot reprova, em QUALQUER `NODE_ENV`, e
 * reprova por uma razao que nao seja apenas o comprimento da string.
 *
 * ------------------------------------------------------------------------
 * POR QUE ESTE ARQUIVO FOI REESCRITO (reteste VeriCore, RETEST_EVIDENCE §5)
 * ------------------------------------------------------------------------
 * A versao anterior deste teste reimplementava a regra do `runtimeEnv.ts` como
 * uma expressao de string (`length >= 32 && !PADRAO.test(valor)`) e a aplicava
 * ao conteudo dos arquivos. Isso a tornava **verdadeira por acaso**: a assercao
 * central ja passava nos tres arquivos no AUDIT_COMMIT, porque media a regra
 * NOVA contra os arquivos VELHOS — e a regra nova nao existia no codigo velho.
 * Poder discriminante zero, com aparencia de protecao.
 *
 * A correcao de metodo: o teste passa a executar a guarda REAL
 * (`loadRuntimeEnv`) alimentada com o valor REAL do arquivo versionado. A
 * propriedade protegida e a composicao arquivo x codigo, que e a unica que
 * importa para quem copia o exemplo. No estado auditado essa composicao
 * reprovava: fora de producao o `superRefine` retornava cedo, `loadRuntimeEnv`
 * nao lancava, e a falha so aparecia no primeiro token emitido.
 *
 * ------------------------------------------------------------------------
 * POR QUE O EXEMPLO TEM DE SER PLACEHOLDER, E NAO SEGREDO VALIDO NEM VAZIO
 * ------------------------------------------------------------------------
 * Um exemplo com segredo VALIDO faria toda instalacao que copiasse o arquivo
 * compartilhar a mesma chave de assinatura — trocaria "falha ruidosa no boot"
 * por "chave conhecida rodando em producao", que e a classe de defeito que este
 * caso corrige. Um exemplo VAZIO tambem nao serve: pela semantica implementada
 * em `runtimeEnv.ts`, a AUSENCIA de `JWT_SECRET` nao reprova o boot fora de
 * producao — a falha voltaria a ser tardia, no primeiro login.
 *
 * ------------------------------------------------------------------------
 * SEGREDOS
 * ------------------------------------------------------------------------
 * Nenhuma assercao imprime conteudo de arquivo. Tudo e booleano ou
 * `toThrow('JWT_SECRET')` — e a mensagem lancada por `loadRuntimeEnv` transporta
 * nome de variavel e texto fixo, nunca valor. `expect(conteudo).toMatch(...)`
 * despejaria o arquivo inteiro no relatorio de falha, e esses arquivos contem
 * valores de exemplo de senha.
 */

// `runtimeEnv.ts` chama `dotenv.config()` no carregamento do modulo. Sem
// neutralizar isso, o `.env` local (nao versionado) reinjetaria variaveis e o
// resultado do teste passaria a depender da maquina de cada desenvolvedor.
jest.mock('dotenv', () => ({
  __esModule: true,
  default: { config: jest.fn() },
  config: jest.fn(),
}));

const RAIZ = path.resolve(__dirname, '../../..');
const EXEMPLOS = ['.env.example', '.env.docker.example', 'server/.env.example'];

// Os quatro regimes de ambiente em que um clone novo pode subir: sem declarar
// nada (o default do schema), e os tres valores validos declarados. O estado
// auditado reprovava so no ultimo.
const REGIMES: Array<string | undefined> = [undefined, 'development', 'test', 'production'];

function lerConteudo(arquivoRelativo: string): string {
  return fs.readFileSync(path.join(RAIZ, arquivoRelativo), 'utf8');
}

function lerJwtSecret(arquivoRelativo: string): string | null {
  const achado = lerConteudo(arquivoRelativo).match(/^JWT_SECRET=(.*)$/m);
  return achado ? achado[1].trim() : null;
}

/**
 * Carrega `runtimeEnv` do zero com o `JWT_SECRET` informado e o regime pedido.
 * Retorna o modulo para que a assercao de `toThrow` fique visivel no teste.
 */
function carregarRuntimeEnvCom(jwtSecret: string, nodeEnv: string | undefined) {
  jest.resetModules();

  delete process.env.NODE_ENV;
  if (nodeEnv !== undefined) {
    process.env.NODE_ENV = nodeEnv;
  }
  process.env.JWT_SECRET = jwtSecret;

  const runtimeEnv = require('../../src/config/runtimeEnv');
  runtimeEnv.clearRuntimeEnvCache();

  return runtimeEnv;
}

describe('.env*.example — copiar o exemplo nao sobe a API (AUD-AUTHN-01)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it.each(EXEMPLOS)('%s existe e declara JWT_SECRET', (arquivo) => {
    expect(fs.existsSync(path.join(RAIZ, arquivo))).toBe(true);
    expect(lerJwtSecret(arquivo)).not.toBeNull();
  });

  // ASSERCAO CENTRAL. Executa a guarda real com o valor real do arquivo real.
  // No AUDIT_COMMIT reprova nos tres regimes que nao sao 'production', para os
  // tres arquivos: `loadRuntimeEnv` simplesmente nao lancava.
  describe.each(EXEMPLOS)('%s', (arquivo) => {
    it.each(REGIMES)(
      'reprova o boot com NODE_ENV=%s',
      (nodeEnv) => {
        const runtimeEnv = carregarRuntimeEnvCom(lerJwtSecret(arquivo) as string, nodeEnv);

        expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
      },
    );
  });

  // A reprovacao nao pode depender SO do comprimento. Este era o estado de
  // `.env.docker.example` no AUDIT_COMMIT (26 caracteres, sem prefixo de
  // placeholder): bastava alguem "melhorar" o exemplo alongando a string para
  // ele voltar a subir o boot com uma chave conhecida por todo mundo que le o
  // repositorio. Teste metamorfico: alongo o valor e a reprovacao tem de ficar
  // de pe.
  it.each(EXEMPLOS)('%s continua reprovando se alguem alongar o valor do exemplo', (arquivo) => {
    const alongado = `${lerJwtSecret(arquivo) as string}${'0'.repeat(64)}`;
    const runtimeEnv = carregarRuntimeEnvCom(alongado, 'development');

    expect(alongado.length).toBeGreaterThanOrEqual(32);
    expect(() => runtimeEnv.loadRuntimeEnv()).toThrow('JWT_SECRET');
  });

  it.each(EXEMPLOS)('%s instrui como gerar o valor real', (arquivo) => {
    expect(lerConteudo(arquivo).includes('openssl rand -hex 32')).toBe(true);
  });
});
