/**
 * 🌱 Seeds (dados iniciais) do sistema.
 *
 * Popula o banco com registros essenciais na primeira execução:
 * - Usuário administrador padrão
 * - Departamentos da fábrica
 * - Categorias de produtos
 *
 * @module config/seeds
 */

import { ENV_PLACEHOLDER_PATTERN, loadRuntimeEnv } from './runtimeEnv';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User, Department, Directorate, Category } = require('../models/index');

/**
 * Diretorias do organograma — nível acima de `Department`.
 * Fonte: `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`.
 *
 * `code` é a chave natural usada pelo seed, pelas guardas e pelo frontend
 * (`client/src/lib/departments.ts`) — nunca o `id` serial.
 */
interface DirectorateData {
  code: string;
  name: string;
  position_title: string;
}

const DIRECTORATES: DirectorateData[] = [
  { code: 'CEO', name: 'Diretoria', position_title: 'CEO / Diretor Presidente' },
  { code: 'IND', name: 'Diretoria Industrial', position_title: 'Diretor Industrial' },
  // Criada em 2026-08-11 por decisão do dono: reúne Compras, Almoxarifado e
  // Expedição. Cargo previsto e ainda VAGO — `manager_id` nasce NULL.
  { code: 'SUP', name: 'Suprimentos & Logística', position_title: 'Diretor de Suprimentos & Logística' },
  { code: 'COM', name: 'Diretoria Comercial', position_title: 'Diretor Comercial' },
  { code: 'ADM', name: 'Administrativo-Financeiro', position_title: 'Diretor Administrativo-Financeiro' },
];

/**
 * Sigla do departamento → código da diretoria.
 *
 * Sigla ausente = **transversal**, `directorate_id` fica NULL. Hoje só `SST`,
 * que "reporta tipicamente à Diretoria/RH, varia por porte de empresa"
 * (organograma). NULL diz isso com honestidade; um valor inventado, não.
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
 * Lista de departamentos da fábrica EVOK ÁUDIO.
 */
const DEPARTMENTS: DepartmentData[] = [
  { code: '01', name: 'Diretoria', sigla: 'DIR', description: 'Gestão estratégica' },
  { code: '02', name: 'Recursos Humanos', sigla: 'RH', description: 'Administração de pessoal' },
  { code: '03', name: 'Engenharia do Produto', sigla: 'ENG', description: 'P&D de auto-falantes' },
  { code: '04', name: 'PCP', sigla: 'PCP', description: 'Planejamento e Controle da Produção' },
  { code: '05', name: 'Produção', sigla: 'PROD', description: 'Fabricação' },
  { code: '06', name: 'Almoxarifado', sigla: 'ALM', description: 'Estoque de insumos' },
  { code: '07', name: 'Compras', sigla: 'COMP', description: 'Suprimentos' },
  { code: '08', name: 'Vendas', sigla: 'VEND', description: 'Comercial' },
  { code: '09', name: 'Financeiro', sigla: 'FIN', description: 'Gestão financeira' },
  { code: '10', name: 'Qualidade', sigla: 'QUAL', description: 'Controle qualidade' },
  { code: '11', name: 'Expedição', sigla: 'EXP', description: 'Logística' },
  { code: '12', name: 'Manutenção', sigla: 'MANUT', description: 'Manutenção industrial' },
  { code: '13', name: 'TI', sigla: 'TI', description: 'Tecnologia da informação' },
  { code: '14', name: 'Marketing', sigla: 'MKT', description: 'Comunicação e branding' },
  { code: '15', name: 'Segurança do Trabalho', sigla: 'SST', description: 'Segurança ocupacional' },
  { code: '16', name: 'Jurídico', sigla: 'JUR', description: 'Assessoria jurídica' },
  { code: '17', name: 'Facilities', sigla: 'FAC', description: 'Serviços gerais' }
];

/**
 * Categorias de produtos.
 */
const CATEGORIES: CategoryData[] = [
  { name: 'Auto-Falantes', description: 'Produtos acabados' },
  { name: 'Componentes Mecânicos', description: 'Cones, surrounds, spiders' },
  { name: 'Componentes Elétricos', description: 'Voice coils, terminais' },
  { name: 'Componentes Magnéticos', description: 'Imãs, Ferrite, Neodímio' },
  { name: 'Matéria-Prima', description: 'Papel kraft, fio de cobre, borracha' },
  { name: 'Embalagem', description: 'Caixas, plásticos, espumas' },
  { name: 'Insumos', description: 'Colas, solventes, EPIs' }
];

/**
 * Popula o banco com dados iniciais se estiver vazio.
 * Executado automaticamente na inicialização pelo `config/db.ts`.
 * É idempotente: só insere se as tabelas estiverem vazias.
 */
async function seedDatabase(): Promise<void> {
  try {
    const runtimeEnv = loadRuntimeEnv();
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('📊 Banco já possui dados, seeds ignorados.');
      return;
    }

    console.log('🌱 Iniciando seeds...');    // Criar admin padrão.
    // Sem uma senha explícita e forte, o seed não cria o administrador inicial:
    // não existe fallback previsível nem placeholder aceitável.
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

    // Criar diretorias ANTES dos departamentos — `departments.directorate_id`
    // referencia esta tabela. Um banco novo precisa nascer já com a
    // hierarquia do organograma, não só com a lista plana de departamentos
    // (F-6 da auditoria de 2026-08-11).
    //
    // `ignoreDuplicates` é obrigatório nos três bulkCreate: as migrations
    // 20260811-000043 (directorates) e 20260806-000120 (departments) já
    // inserem essas linhas, e `code`/`name` são UNIQUE. Sem ele, um banco
    // recém-provisionado por migrations (users vazia → seed roda) explodia em
    // UniqueConstraintError: em produção o boot abortava; em dev o erro era
    // engolido antes de `Category.bulkCreate`, deixando o banco sem categorias
    // para sempre (V-1, VARREDURA_DUPLA_2026-08-11.md).
    await Directorate.bulkCreate(DIRECTORATES, { ignoreDuplicates: true });
    // Reler do banco: com ignoreDuplicates, instâncias retornadas de linhas
    // pré-existentes não trazem `id` — o Map sairia com undefined e os
    // departamentos nasceriam sem diretoria.
    const directorates = await Directorate.findAll({ attributes: ['id', 'code'] });
    const directorateIdByCode = new Map<string, number>(
      directorates.map((d: { code: string; id: number }) => [d.code, d.id]),
    );

    // Criar departamentos iniciais, já vinculados à diretoria
    await Department.bulkCreate(
      DEPARTMENTS.map((department) => ({
        ...department,
        directorate_id: directorateIdByCode.get(DEPARTMENT_DIRECTORATE[department.sigla]) ?? null,
      })),
      { ignoreDuplicates: true },
    );

    // Criar categorias de produto iniciais
    await Category.bulkCreate(CATEGORIES, { ignoreDuplicates: true });

    console.log('🌱 Seeds concluídos com sucesso!');
    console.log('   - Usuário admin: admin@evokaudio.com.br');
    console.log(`   - ${DIRECTORATES.length} diretorias`);
    console.log(`   - ${DEPARTMENTS.length} departamentos`);
    console.log(`   - ${CATEGORIES.length} categorias de produtos`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro nos seeds:', message);
    throw error;
  }
}

export { seedDatabase, DEPARTMENTS, DIRECTORATES, DEPARTMENT_DIRECTORATE, CATEGORIES };
export default seedDatabase;

