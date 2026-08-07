/**
 * Teste de guarda (anti-regressão) do retrofit `authorizeModule` (Bloco
 * 1.2, `docs/governance/TODO.md`): garante que todo arquivo de rota de
 * módulo de negócio em `src/modules/*​/presentation/routes/*.ts` usa o
 * middleware `authorizeModule` do novo modelo de Perfis de Acesso
 * (`docs/business/BUSINESS_RULES.md` §1/§4/§8 — decisão de SUBSTITUIR o
 * `authorize(role)` legado, não empilhar).
 *
 * Módulos EXCLUÍDOS deliberadamente desta checagem (continuam apenas com
 * `authenticate`/`authorize(role)` ou nem isso — ver enunciado da tarefa
 * de retrofit):
 * - `users`, `auditLogs`, `accessProfiles`: administração global,
 *   exclusivos do papel `admin` (`usuarios`/`audit_logs` não fazem parte
 *   do catálogo de módulos atribuíveis a perfil de área, ver
 *   `BUSINESS_RULES.md` §1).
 * - `auth`: rotas públicas de autenticação (login, register admin-only,
 *   forgot/reset password) — não pertencem a um módulo de área.
 * - `webhooks`: integrações de sistema externo (n8n, Focus NF-e), sem
 *   `authenticate` por natureza.
 * - `intelligentAuditor`: mantido `authorize('admin')` por decisão
 *   explícita do enunciado da tarefa de retrofit ("admin only, mantenha
 *   como está").
 * - Módulos ainda sem módulo de permissão correspondente na matriz de
 *   `BUSINESS_RULES.md` §1 (`categories`, `departments`, `employees`,
 *   `fiscal`, `maintenance`, `serviceOrders`): fora do escopo desta
 *   tarefa — ver pendência de RH/`rh` anotada em `BUSINESS_RULES.md` §1 e
 *   em `docs/governance/TODO.md`.
 *
 * Este teste é propositalmente simples (leitura de arquivo + regex/grep),
 * sem precisar montar o Express nem mockar controllers — serve apenas
 * como rede de segurança para que um novo endpoint de negócio não seja
 * adicionado (ou um existente não seja revertido) sem `authorizeModule`.
 *
 * @module tests/unit/module-authorization-map
 */

import fs from 'fs';
import path from 'path';

const ROUTES_ROOT = path.resolve(__dirname, '../../src/modules');

/**
 * Módulos (nome da pasta em `src/modules/`) que devem usar
 * `authorizeModule` em TODAS as rotas de negócio autenticadas.
 */
const MODULES_REQUIRING_AUTHORIZE_MODULE = [
  'products',
  'items',
  'inventory', // inventory.ts + inventoryCounts.ts
  'sales',
  'clients',
  'purchases',
  'purchaseRequisitions',
  'rfq',
  'comex',
  'suppliers',
  'production', // productionOrders.ts
  'bom',
  'mrp',
  'workCenters',
  'nonConformities',
  'assets',
  'traceability',
  'financial',
  'reports',
  'dashboard',
  'mobileInventory',
  'laboratory',
  'engineering',
  'sst',
];

/**
 * Módulos deliberadamente fora do escopo do retrofit (ver cabeçalho deste
 * arquivo). Listados explicitamente para que a lista acima + esta lista
 * cubram 100% de `src/modules/*`, evitando que um módulo novo passe
 * despercebido (nem testado, nem excluído conscientemente).
 */
const MODULES_EXCLUDED = [
  'accessProfiles',
  'auditLogs',
  'auth',
  'webhooks',
  'intelligentAuditor',
  'categories',
  'departments',
  'employees',
  'fiscal',
  'maintenance',
  'serviceOrders',
  'users',
];

function listRouteFiles(moduleDir: string): string[] {
  const routesDir = path.join(ROUTES_ROOT, moduleDir, 'presentation', 'routes');
  if (!fs.existsSync(routesDir)) {
    return [];
  }
  return fs
    .readdirSync(routesDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(routesDir, file));
}

describe('module-authorization-map (guarda anti-regressão authorizeModule)', () => {
  it('cobre 100% das pastas de src/modules com a lista de exigidos + excluídos', () => {
    const allModuleDirs = fs
      .readdirSync(ROUTES_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const covered = new Set([...MODULES_REQUIRING_AUTHORIZE_MODULE, ...MODULES_EXCLUDED]);
    const uncovered = allModuleDirs.filter((dir) => !covered.has(dir));

    expect(uncovered).toEqual([]);
  });

  it.each(MODULES_REQUIRING_AUTHORIZE_MODULE)(
    'modulo "%s": todo arquivo de rota importa e usa authorizeModule',
    (moduleDir) => {
      const routeFiles = listRouteFiles(moduleDir);

      expect(routeFiles.length).toBeGreaterThan(0);

      for (const filePath of routeFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Import (require ou destructuring) do middleware.
        expect(content).toMatch(/authorizeModule/);

        // Pelo menos uma chamada `authorizeModule(...)` de fato usada em
        // uma rota (não apenas importada e não utilizada).
        const usageMatches = content.match(/authorizeModule\(\s*['"][a-z_.]+['"]/g) ?? [];
        expect(usageMatches.length).toBeGreaterThan(0);
      }
    },
  );

  /**
   * `laboratory` e `engineering` são os PILOTOS originais (anteriores a
   * esta tarefa de retrofit) e adotaram deliberadamente o modo aditivo
   * (`authorizeModule(...)` + `authorize(role)` compostos, ver comentário
   * de cabeçalho de ambos os arquivos) — não fazem parte do escopo desta
   * tarefa (que só cobre os módulos listados no enunciado) e por isso são
   * excluídos apenas desta checagem específica de "substituir, não
   * empilhar". A checagem anterior (uso de `authorizeModule`) continua
   * valendo para os dois.
   */
  const MODULES_SUBSTITUTED_NOT_STACKED = MODULES_REQUIRING_AUTHORIZE_MODULE.filter(
    (moduleDir) => moduleDir !== 'laboratory' && moduleDir !== 'engineering',
  );

  it('nenhum arquivo de rota dos módulos migrados neste retrofit usa mais authorize(role) para escrita comum', () => {
    for (const moduleDir of MODULES_SUBSTITUTED_NOT_STACKED) {
      const routeFiles = listRouteFiles(moduleDir);

      for (const filePath of routeFiles) {
        const content = fs
          .readFileSync(filePath, 'utf-8')
          // Remove comentários de bloco JSDoc (`/** ... */`) antes de
          // procurar chamadas reais de codigo — os cabecalhos de retrofit
          // mencionam `authorize(role)` em prosa (dentro de backticks),
          // o que nao deve ser confundido com uma chamada de middleware.
          .replace(/\/\*[\s\S]*?\*\//g, '');

        // `authorize(` (chamada legada de role, fora de comentarios) não
        // deve mais aparecer nestes módulos — retrofit substitui, não
        // empilha (§8). O `[^.]` evita falso-positivo em
        // `authorizeModule(` (que termina em `...Module(`, nunca em
        // `.authorize(`).
        const legacyAuthorizeCalls = content.match(/(?<!Module)\bauthorize\(/g) ?? [];
        expect(legacyAuthorizeCalls).toEqual([]);
      }
    }
  });
});
