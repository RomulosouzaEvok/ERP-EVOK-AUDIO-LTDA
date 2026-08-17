/**
 * Guarda anti-regressão: módulo com rota de ESCRITA precisa registrar
 * auditoria (`logAction`) em pelo menos um de seus controllers.
 *
 * ## Por que este teste existe (incidente de 2026-08-10)
 *
 * A carga inicial real de cadastro — 327 itens criados por `POST /api/items`,
 * com usuário autenticado e RBAC ativo — terminou com a tabela `audit_logs`
 * contendo **2 linhas: os dois logins**. Nenhuma das 327 escritas deixou
 * rastro. `itemController` simplesmente não chama `logAction`, e nada no
 * projeto reclamava disso: o typecheck passa, a suíte unitária passa, a
 * integração passa — auditoria ausente não falha nada, só silencia.
 *
 * A varredura que se seguiu encontrou **14 módulos com rotas de escrita e
 * zero chamadas de auditoria** (48 endpoints), entre eles `users` e
 * `accessProfiles` — ou seja, era possível criar usuário e trocar permissões
 * sem rastro. É a mesma família dos incidentes anteriores do projeto: a
 * lacuna que nenhuma rede existente cobre porque a ausência não produz erro.
 *
 * ## O que este teste afirma
 *
 * Para cada `src/modules/<mod>/presentation/routes/*.ts` com
 * `router.post|put|patch|delete`, o módulo deve ter `logAction` em algum
 * controller — **exceto** os listados em `DEBITO_CONHECIDO`, o retrato do
 * estado em 2026-08-10.
 *
 * A lista de débito é uma **catraca**: pode encolher (cobriu um módulo?
 * remova-o daqui — o teste passa a exigi-lo para sempre), nunca crescer.
 * Módulo NOVO com rota de escrita já nasce obrigado a auditar, porque não
 * está na lista. Se este teste reprovou seu módulo novo: chame `logAction`
 * nos handlers de escrita, no padrão de
 * `src/modules/products/presentation/controllers/productController.ts`.
 *
 * O débito em si está registrado em
 * `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §3.2.
 *
 * @module tests/unit/audit-coverage-guard
 */

import * as fs from 'fs';
import * as path from 'path';

const MODULES_DIR = path.resolve(__dirname, '../../src/modules');

/**
 * Módulos que JÁ ESTAVAM sem auditoria quando a guarda nasceu (2026-08-10).
 * Só é permitido REMOVER entradas. Adicionar = reprovar em code review.
 */
const DEBITO_CONHECIDO = new Set([
  'accessProfiles',
  'assets',
  'categories',
  'clients',
  'departments',
  // 'employees' SAIU em 2026-08-17 (SanaCore `ERP-LEGACY-001-CASE-004`
  // estágio 1, `AUD-ALOG-01` item A, `APR-2026-033`): `DELETE
  // /api/employees/:id` passou a chamar `logAction`. A catraca agora EXIGE
  // auditoria em `employees` para sempre — remover a chamada reprova aqui.
  'items',
  'mobileInventory',
  'nonConformities',
  'serviceOrders',
  'suppliers',
  'users',
  'webhooks',
]);

/** Lê recursivamente os arquivos `.ts` de um diretório (se existir). */
function lerArquivosTs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const cheio = path.join(dir, e.name);
    if (e.isDirectory()) return lerArquivosTs(cheio);
    return e.name.endsWith('.ts') ? [cheio] : [];
  });
}

/** Verdadeiro se algum arquivo de rotas do módulo declara rota de escrita. */
function temRotaDeEscrita(mod: string): boolean {
  const rotas = lerArquivosTs(path.join(MODULES_DIR, mod, 'presentation', 'routes'));
  return rotas.some((f) => /router\.(post|put|patch|delete)\s*\(/.test(fs.readFileSync(f, 'utf8')));
}

/** Verdadeiro se algum controller do módulo chama `logAction`. */
function temAuditoria(mod: string): boolean {
  const controllers = lerArquivosTs(path.join(MODULES_DIR, mod, 'presentation', 'controllers'));
  return controllers.some((f) => fs.readFileSync(f, 'utf8').includes('logAction'));
}

describe('cobertura de auditoria nos módulos de escrita', () => {
  const modulos = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const comEscrita = modulos.filter(temRotaDeEscrita);

  it('encontra módulos com rota de escrita (sanidade do próprio teste)', () => {
    // Se o layout de pastas mudar e a varredura parar de enxergar rotas, o
    // teste viraria um "passa sempre". Este assert transforma isso em falha.
    expect(comEscrita.length).toBeGreaterThan(20);
  });

  it('todo módulo de escrita fora do débito conhecido chama logAction', () => {
    const violacoes = comEscrita.filter((m) => !DEBITO_CONHECIDO.has(m) && !temAuditoria(m));
    expect(violacoes).toEqual([]);
  });

  it('a lista de débito é uma catraca: não lista módulo que já audita nem módulo inexistente', () => {
    // Entrada resolvida (ou módulo renomeado/apagado) deve SAIR da lista —
    // mantê-la esconderia uma regressão futura naquele módulo.
    const obsoletas = [...DEBITO_CONHECIDO].filter(
      (m) => !comEscrita.includes(m) || temAuditoria(m),
    );
    expect(obsoletas).toEqual([]);
  });
});
