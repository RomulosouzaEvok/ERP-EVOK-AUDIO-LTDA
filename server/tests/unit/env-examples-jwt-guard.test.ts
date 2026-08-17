import fs from 'fs';
import path from 'path';

/**
 * AUD-AUTHN-01 / CASE-005 — guarda sobre os arquivos de exemplo de ambiente.
 *
 * Propriedade travada aqui: NENHUM `.env*.example` versionado pode entregar um
 * `JWT_SECRET` que suba o boot.
 *
 * O motivo não é estético. Um exemplo com segredo VÁLIDO faria toda instalação
 * que copiasse o arquivo compartilhar a mesma chave de assinatura — trocaria
 * "falha ruidosa no boot" por "chave conhecida rodando em produção", que é a
 * classe de defeito que este caso corrige.
 *
 * Também não serve deixar vazio: pela semântica implementada em
 * `runtimeEnv.ts`, a AUSÊNCIA de `JWT_SECRET` não reprova fora de produção — a
 * falha voltaria a ser tardia, no primeiro login, que é o comportamento
 * confuso que motivou a correção.
 *
 * Por isso o exemplo deve casar com `ENV_PLACEHOLDER_PATTERN`: falha no boot,
 * imediatamente, e pelo motivo certo.
 *
 * As asserções são BOOLEANAS de propósito. `expect(conteudo).toMatch(...)`
 * despejaria o arquivo inteiro no relatório de falha, e esses arquivos contêm
 * valores de exemplo de senha — o relatório de teste não é lugar para isso.
 */

// Espelha runtimeEnv.ts:12. Se lá mudar, este teste tem de mudar junto — e é
// bom que quebre, porque a propriedade depende dos dois estarem alinhados.
const ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME|dev-only-change-me)/i;
const COMPRIMENTO_MINIMO = 32;

const RAIZ = path.resolve(__dirname, '../../..');
const EXEMPLOS = ['.env.example', '.env.docker.example', 'server/.env.example'];

function lerJwtSecret(arquivoRelativo: string): string | null {
  const conteudo = fs.readFileSync(path.join(RAIZ, arquivoRelativo), 'utf8');
  const achado = conteudo.match(/^JWT_SECRET=(.*)$/m);
  return achado ? achado[1].trim() : null;
}

describe('.env*.example — JWT_SECRET nunca pode subir o boot', () => {
  it.each(EXEMPLOS)('%s existe e declara JWT_SECRET', (arquivo) => {
    expect(fs.existsSync(path.join(RAIZ, arquivo))).toBe(true);
    expect(lerJwtSecret(arquivo)).not.toBeNull();
  });

  it.each(EXEMPLOS)('%s NAO entrega um segredo utilizavel', (arquivo) => {
    const valor = lerJwtSecret(arquivo) as string;
    const subiriaOBoot = valor.length >= COMPRIMENTO_MINIMO && !ENV_PLACEHOLDER_PATTERN.test(valor);
    expect(subiriaOBoot).toBe(false);
  });

  it.each(EXEMPLOS)('%s reprova pela guarda de placeholder, nao so por comprimento', (arquivo) => {
    // Reprovar só por comprimento é frágil: basta alguém "melhorar" o exemplo
    // alongando a string para ele passar a subir com uma chave conhecida.
    expect(ENV_PLACEHOLDER_PATTERN.test(lerJwtSecret(arquivo) as string)).toBe(true);
  });

  it.each(EXEMPLOS)('%s instrui como gerar o valor real', (arquivo) => {
    const conteudo = fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');
    expect(conteudo.includes('openssl rand -hex 32')).toBe(true);
  });
});
