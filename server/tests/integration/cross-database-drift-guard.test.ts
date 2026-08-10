/**
 * Guarda anti-regressão: os DOIS bancos do ERP precisam ser idênticos.
 *
 * ## O incidente que criou este teste (2026-08-10)
 *
 * A migration `20260810-000038-bom-phantom-explosion` (coluna
 * `bill_of_material_items.is_phantom`, do G18) foi aplicada **só no banco de
 * teste**. No `erp_evok_audio` — o banco com o dado real do dono — a coluna
 * não existia, embora a migration seguinte (`...-000039`) já constasse como
 * aplicada. O model `BillOfMaterialItem` declara a coluna, então qualquer
 * leitura de item de BOM quebraria em runtime no banco real.
 *
 * E **nada** apontou o problema: `tsc --noEmit` passou, os 1808 testes
 * unitários passaram (repositório dublê), e as 3 guardas de integração
 * passaram — porque **todas elas rodam contra `erp_evok_audio_test`**. A
 * rede de segurança inteira estava olhando para o banco onde a migration
 * tinha sido aplicada.
 *
 * É a mesma classe de defeito descrita em
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`,
 * um nível acima: não é "o código não bate com o banco", é "o banco testado
 * não é o banco usado".
 *
 * ## O que este teste faz
 *
 * Roda `scripts/comparar-bancos.cjs` — que já existia e já compara coluna,
 * tipo, default, índice e constraint — entre o banco de desenvolvimento e o
 * de teste, e falha quando há qualquer divergência. O script existia desde
 * `e2a8d7e`; o que faltava era **alguém executá-lo**.
 *
 * ## Quando ele se cala (e por quê)
 *
 * Pula quando o banco de desenvolvimento não está acessível — em CI, ou numa
 * máquina que só tem o banco de teste, a comparação não é possível e falhar
 * ali seria ruído. O valor está na máquina do desenvolvedor e no servidor de
 * destino, que são exatamente onde a divergência nasce.
 *
 * @module tests/integration/cross-database-drift-guard
 */

import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';

import { integrationEnabled } from '../helpers/testApi';

const execFileAsync = promisify(execFile);

const describeIntegration = integrationEnabled() ? describe : describe.skip;

const SERVER_DIR = path.resolve(__dirname, '../..');

/**
 * Resolve o par de bancos a comparar a partir do banco em uso.
 *
 * A suíte roda com `DB_NAME` apontando para o banco de teste (o runner exige
 * o sufixo `_test`/`_ci`); o par é o mesmo nome sem o sufixo.
 *
 * @returns Nome do banco de desenvolvimento e do de teste.
 */
function resolveDatabasePair(): { dev: string; test: string } {
  const current = process.env.DB_NAME || 'erp_evok_audio_test';
  const dev = current.replace(/_(test|ci)$/, '');
  return { dev, test: current };
}

describeIntegration('Guarda de drift entre os DOIS bancos', () => {
  it('o banco de desenvolvimento e o de teste sao identicos (coluna, tipo, default, indice, constraint)', async () => {
    const { dev, test } = resolveDatabasePair();

    if (dev === test) {
      // Sem par não há o que comparar (banco sem sufixo de teste).
      return;
    }

    let stdout = '';
    let failed = false;
    try {
      const result = await execFileAsync(
        process.execPath,
        [path.join('scripts', 'comparar-bancos.cjs'), dev, test],
        { cwd: SERVER_DIR, timeout: 120000, windowsHide: true },
      );
      stdout = result.stdout;
    } catch (error: any) {
      stdout = String(error?.stdout ?? '');
      // Exit 2 = divergiu (o script rodou e mediu). Qualquer outro código é
      // falha de execução: banco inacessível, credencial ausente etc.
      failed = error?.code === 2;
      if (!failed) {
        const motivo = String(error?.stderr ?? error?.message ?? '');
        // eslint-disable-next-line no-console
        console.warn(
          `[cross-database-drift-guard] comparacao pulada: nao foi possivel ler "${dev}". Motivo: ${motivo.trim()}`,
        );
        return;
      }
    }

    if (failed) {
      throw new Error(
        `Os bancos "${dev}" e "${test}" DIVERGEM. Toda guarda de integracao roda contra "${test}", `
        + `entao uma divergencia aqui significa que o banco realmente usado nao esta coberto por teste nenhum. `
        + `Rode "npx sequelize-cli db:migrate" nos dois antes de seguir.\n\n${stdout}`,
      );
    }

    expect(stdout).toContain('os dois bancos sao IDENTICOS');
  }, 130000);
});
