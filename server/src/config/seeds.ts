/**
 * ðŸŒ± Seeds (dados iniciais) do sistema.
 *
 * Popula o banco com registros essenciais na primeira execuÃ§Ã£o:
 * - UsuÃ¡rio administrador padrÃ£o
 * - Departamentos da fÃ¡brica
 * - Categorias de produtos
 *
 * @module config/seeds
 */

import { ENV_PLACEHOLDER_PATTERN, loadRuntimeEnv } from './runtimeEnv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User, Department, Directorate, Category } = require('../models/index');

/**
 * Diretorias do organograma â€” nÃ­vel acima de `Department`.
 * Fonte: `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`.
 *
 * `code` Ã© a chave natural usada pelo seed, pelas guardas e pelo frontend
 * (`client/src/lib/departments.ts`) â€” nunca o `id` serial.
 */
interface DirectorateData {
  code: string;
  name: string;
  position_title: string;
}

const DIRECTORATES: DirectorateData[] = [
  { code: 'CEO', name: 'Diretoria', position_title: 'CEO / Diretor Presidente' },
  { code: 'IND', name: 'Diretoria Industrial', position_title: 'Diretor Industrial' },
  // Criada em 2026-08-11 por decisÃ£o do dono: reÃºne Compras, Almoxarifado e
  // ExpediÃ§Ã£o. Cargo previsto e ainda VAGO â€” `manager_id` nasce NULL.
  { code: 'SUP', name: 'Suprimentos & LogÃ­stica', position_title: 'Diretor de Suprimentos & LogÃ­stica' },
  { code: 'COM', name: 'Diretoria Comercial', position_title: 'Diretor Comercial' },
  { code: 'ADM', name: 'Administrativo-Financeiro', position_title: 'Diretor Administrativo-Financeiro' },
];

/**
 * Sigla do departamento â†’ cÃ³digo da diretoria.
 *
 * Sigla ausente = **transversal**, `directorate_id` fica NULL. Hoje sÃ³ `SST`,
 * que "reporta tipicamente Ã  Diretoria/RH, varia por porte de empresa"
 * (organograma). NULL diz isso com honestidade; um valor inventado, nÃ£o.
 */
const DEPARTMENT_DIRECTORATE: Record<string, string> = {
  DIR: 'CEO',
  ENG: 'IND', PCP: 'IND', PROD: 'IND', QUAL: 'IND', MANUT: 'IND',
  COMP: 'SUP', ALM: 'SUP', EXP: 'SUP',
  VEND: 'COM', MKT: 'COM',
  RH: 'ADM', FIN: 'ADM', JUR: 'ADM', TI: 'ADM', FAC: 'ADM',
};

/**
 * Interface dos dados de departamento.
 */
interface DepartmentData {
  code: string;
  name: string;
  sigla: string;
  description: string;
}

/**
 * Interface dos dados de categoria.
 */
interface CategoryData {
  name: string;
  description: string;
}

/**
 * Lista de departamentos da fÃ¡brica EVOK ÃUDIO.
 */
const DEPARTMENTS: DepartmentData[] = [
  { code: '01', name: 'Diretoria', sigla: 'DIR', description: 'GestÃ£o estratÃ©gica' },
  { code: '02', name: 'Recursos Humanos', sigla: 'RH', description: 'AdministraÃ§Ã£o de pessoal' },
  { code: '03', name: 'Engenharia do Produto', sigla: 'ENG', description: 'P&D de auto-falantes' },
  { code: '04', name: 'PCP', sigla: 'PCP', description: 'Planejamento e Controle da ProduÃ§Ã£o' },
  { code: '05', name: 'ProduÃ§Ã£o', sigla: 'PROD', description: 'FabricaÃ§Ã£o' },
  { code: '06', name: 'Almoxarifado', sigla: 'ALM', description: 'Estoque de insumos' },
  { code: '07', name: 'Compras', sigla: 'COMP', description: 'Suprimentos' },
  { code: '08', name: 'Vendas', sigla: 'VEND', description: 'Comercial' },
  { code: '09', name: 'Financeiro', sigla: 'FIN', description: 'GestÃ£o financeira' },
  { code: '10', name: 'Qualidade', sigla: 'QUAL', description: 'Controle qualidade' },
  { code: '11', name: 'ExpediÃ§Ã£o', sigla: 'EXP', description: 'LogÃ­stica' },
  { code: '12', name: 'ManutenÃ§Ã£o', sigla: 'MANUT', description: 'ManutenÃ§Ã£o industrial' },
  { code: '13', name: 'TI', sigla: 'TI', description: 'Tecnologia da informaÃ§Ã£o' },
  { code: '14', name: 'Marketing', sigla: 'MKT', description: 'ComunicaÃ§Ã£o e branding' },
  { code: '15', name: 'SeguranÃ§a do Trabalho', sigla: 'SST', description: 'SeguranÃ§a ocupacional' },
  { code: '16', name: 'JurÃ­dico', sigla: 'JUR', description: 'Assessoria jurÃ­dica' },
  { code: '17', name: 'Facilities', sigla: 'FAC', description: 'ServiÃ§os gerais' }
];

/**
 * Categorias de produtos.
 */
const CATEGORIES: CategoryData[] = [
  { name: 'Auto-Falantes', description: 'Produtos acabados' },
  { name: 'Componentes MecÃ¢nicos', description: 'Cones, surrounds, spiders' },
  { name: 'Componentes ElÃ©tricos', description: 'Voice coils, terminais' },
  { name: 'Componentes MagnÃ©ticos', description: 'ImÃ£s, Ferrite, NeodÃ­mio' },
  { name: 'MatÃ©ria-Prima', description: 'Papel kraft, fio de cobre, borracha' },
  { name: 'Embalagem', description: 'Caixas, plÃ¡sticos, espumas' },
  { name: 'Insumos', description: 'Colas, solventes, EPIs' }
];

/**
 * Popula o banco com dados iniciais se estiver vazio.
 * Executado automaticamente na inicializaÃ§Ã£o pelo `config/db.ts`.
 * Ã‰ idempotente: sÃ³ insere se as tabelas estiverem vazias.
 */
async function seedDatabase(): Promise<void> {
  try {
    const runtimeEnv = loadRuntimeEnv();
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('ðŸ“Š Banco jÃ¡ possui dados, seeds ignorados.');
      return;
    }

    console.log('ðŸŒ± Iniciando seeds...');    // Criar admin padrÃ£o.
    // Sem uma senha explÃ­cita e forte, o seed nÃ£o cria o administrador inicial:
    // nÃ£o existe fallback previsÃ­vel nem placeholder aceitÃ¡vel.
    const adminPassword = runtimeEnv.adminSeedPassword;
    if (!adminPassword) {
      throw new Error(
        'ADMIN_SEED_PASSWORD é obrigatória para criar o administrador inicial. '
        + 'Defina a variável de ambiente antes de inicializar o seed.',
      );
    }
    if (ENV_PLACEHOLDER_PATTERN.test(adminPassword)) {
      throw new Error(
        'ADMIN_SEED_PASSWORD não pode usar placeholder. Defina um valor real antes de inicializar o seed.',
      );
    }
    if (adminPassword.length < 8) {
      throw new Error('ADMIN_SEED_PASSWORD deve ter ao menos 8 caracteres.');
    }
    await User.create({
      name: 'Administrador',
      email: 'admin@evokaudio.com.br',
      password: adminPassword,
      role: 'admin',
      active: true
    });

    // Criar diretorias ANTES dos departamentos â€” `departments.directorate_id`
    // referencia esta tabela. Um banco novo precisa nascer jÃ¡ com a
    // hierarquia do organograma, nÃ£o sÃ³ com a lista plana de departamentos
    // (F-6 da auditoria de 2026-08-11).
    //
    // `ignoreDuplicates` Ã© obrigatÃ³rio nos trÃªs bulkCreate: as migrations
    // 20260811-000043 (directorates) e 20260806-000120 (departments) jÃ¡
    // inserem essas linhas, e `code`/`name` sÃ£o UNIQUE. Sem ele, um banco
    // recÃ©m-provisionado por migrations (users vazia â†’ seed roda) explodia em
    // UniqueConstraintError: em produÃ§Ã£o o boot abortava; em dev o erro era
    // engolido antes de `Category.bulkCreate`, deixando o banco sem categorias
    // para sempre (V-1, VARREDURA_DUPLA_2026-08-11.md).
    await Directorate.bulkCreate(DIRECTORATES, { ignoreDuplicates: true });
    // Reler do banco: com ignoreDuplicates, instÃ¢ncias retornadas de linhas
    // prÃ©-existentes nÃ£o trazem `id` â€” o Map sairia com undefined e os
    // departamentos nasceriam sem diretoria.
    const directorates = await Directorate.findAll({ attributes: ['id', 'code'] });
    const directorateIdByCode = new Map<string, number>(
      directorates.map((d: { code: string; id: number }) => [d.code, d.id]),
    );

    // Criar departamentos iniciais, jÃ¡ vinculados Ã  diretoria
    await Department.bulkCreate(
      DEPARTMENTS.map((department) => ({
        ...department,
        directorate_id: directorateIdByCode.get(DEPARTMENT_DIRECTORATE[department.sigla]) ?? null,
      })),
      { ignoreDuplicates: true },
    );

    // Criar categorias de produto iniciais
    await Category.bulkCreate(CATEGORIES, { ignoreDuplicates: true });

    console.log('ðŸŒ± Seeds concluÃ­dos com sucesso!');
    console.log('   - UsuÃ¡rio admin: admin@evokaudio.com.br');
    console.log(`   - ${DIRECTORATES.length} diretorias`);
    console.log(`   - ${DEPARTMENTS.length} departamentos`);
    console.log(`   - ${CATEGORIES.length} categorias de produtos`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('âŒ Erro nos seeds:', message);
    throw error;
  }
}

export { seedDatabase, DEPARTMENTS, DIRECTORATES, DEPARTMENT_DIRECTORATE, CATEGORIES };
export default seedDatabase;

