import { describe, it, expect } from 'vitest';

/**
 * Teste de regressão (Bloco 6, `docs/governance/TODO.md` §6.3): garante que
 * nenhuma tela **nova** entregue pelos Blocos 1–5 (perfis de acesso,
 * depósitos, transferências entre depósitos, e as telas retrofitadas que
 * ganharam a coluna de semáforo de handoff — Bloco 3) usa `alert()`/
 * `window.alert()` genérico para reportar erro de mutation, e que toda tela
 * com `useMutation` de escrita usa `translateApiError`/`DidacticAlert` (o
 * padrão didático de 3 partes, `BUSINESS_RULES.md` §13).
 *
 * Abordagem: varredura estática do código-fonte via `import.meta.glob` com
 * `query: '?raw'` (lê o arquivo como texto puro, sem depender de `node:fs` —
 * este projeto de cliente não tem `@types/node` instalado, então builtins do
 * Node quebrariam o `tsc -b`). Mais barato e determinístico que um teste E2E
 * de UI para essa verificação, e falha com o nome do arquivo culpado se
 * alguém reintroduzir `window.alert` em vez do padrão.
 */

/** Telas novas dos Blocos 1–5 + telas retrofitadas com o semáforo de handoff (Bloco 3). */
const SCREENS_UNDER_REGRESSION = [
  '/src/pages/users/AccessProfilesPage.tsx',
  '/src/pages/logistics/WarehousesPage.tsx',
  '/src/pages/logistics/TransfersTab.tsx',
  '/src/pages/purchases/PurchasesPage.tsx',
  '/src/pages/purchases/RequisitionsPage.tsx',
  '/src/pages/logistics/ReceivingPage.tsx',
  '/src/pages/logistics/ShippingPage.tsx',
  '/src/pages/quality/InspectionTab.tsx',
  '/src/pages/quality/NonConformitiesTab.tsx',
  '/src/pages/products/InventoryCountsPage.tsx',
];

const rawSources = import.meta.glob('/src/pages/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

function readScreen(path: string): string {
  const source = rawSources[path];
  if (source === undefined) {
    throw new Error(`Arquivo não encontrado pelo glob de varredura: ${path}`);
  }
  return source;
}

describe('Regressão — nenhuma tela nova usa alert() genérico para erro de pré-requisito', () => {
  it.each(SCREENS_UNDER_REGRESSION)('%s não usa window.alert()/alert() para reportar erro de mutation', (path) => {
    const source = readScreen(path);

    // `alert(` cru (não `window.alert` também) é proibido nestas telas.
    const hasWindowAlert = /\bwindow\.alert\s*\(/.test(source);
    const hasBareAlert = /(?<!window\.)\balert\s*\(/.test(source);

    expect(hasWindowAlert, `${path} usa window.alert() — migre para translateApiError + DidacticAlert`).toBe(false);
    expect(hasBareAlert, `${path} usa alert() — migre para translateApiError + DidacticAlert`).toBe(false);
  });

  it.each(SCREENS_UNDER_REGRESSION)('%s importa translateApiError/DidacticAlert quando tem mutation de escrita', (path) => {
    const source = readScreen(path);

    const hasMutation = /useMutation\s*\(/.test(source);
    if (!hasMutation) {
      // Tela sem mutation própria (ex.: delega para um dialog filho) não
      // precisa importar o padrão diretamente.
      return;
    }

    const usesTranslateApiError = source.includes('translateApiError');
    const usesDidacticAlert = source.includes('DidacticAlert');

    expect(usesTranslateApiError, `${path} tem useMutation mas não usa translateApiError`).toBe(true);
    expect(usesDidacticAlert, `${path} tem useMutation mas não usa DidacticAlert`).toBe(true);
  });
});
