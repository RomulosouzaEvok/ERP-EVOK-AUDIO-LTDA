import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ACCESS_MODULES } from '../../src/shared/domain/accessModules';

/**
 * 🛡️ Guarda de estrutura organizacional — catálogo de módulos × `seeds.ts`.
 *
 * **O buraco que ela fecha.** Em 2026-08-11 o dono do produto apontou que a
 * navegação do ERP agrupava departamentos inexistentes ("Logística",
 * "Gestão", "Qualidade & Engenharia"), fundindo áreas reais da fábrica. O
 * levantamento de impacto (§7 de
 * `docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md`) mostrou que a
 * causa não foi desatenção pontual: **nada ligava** a estrutura declarada em
 * `server/src/config/seeds.ts` e no organograma
 * (`docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`) ao código que a
 * consome. Documentação era lida por gente, o menu era escrito de memória, e
 * quando os dois discordavam typecheck, testes e build passavam iguais.
 *
 * Esta guarda cobre o lado do backend (achado F-8): cada módulo do catálogo
 * RBAC declara um `owner`, e o `owner` precisa ser uma sigla real do seed.
 * A contraparte no frontend é `client/src/lib/departments.seeds.test.ts`.
 *
 * O consumidor seguinte é o Bloco 7 (assistente WhatsApp), que roteia por
 * departamento (`whatsapp_contacts.department_id`) e precisa saber quais
 * módulos pertencem à área de quem pergunta.
 */

const SEEDS_PATH = resolve(__dirname, '../../src/config/seeds.ts');

/** Siglas que não são departamento — ver `AccessModuleOwner`. */
const NON_DEPARTMENT_OWNERS = new Set(['PESSOAL', 'SISTEMA']);

function readSeedSiglas(): string[] {
  const source = readFileSync(SEEDS_PATH, 'utf8');
  const pattern = /\{\s*code:\s*'(\d{2})',\s*name:\s*'([^']+)',\s*sigla:\s*'([^']+)'/g;
  return [...source.matchAll(pattern)].map((match) => match[3]);
}

describe('estrutura organizacional: catálogo de módulos × seeds.ts', () => {
  const siglas = readSeedSiglas();

  it('consegue ler as siglas do seed (a guarda não pode passar por vacuidade)', () => {
    // Sem isto, uma mudança de formatação em `seeds.ts` faria o regex não
    // casar com nada, a lista de siglas válidas ficaria vazia e os testes
    // abaixo ou passariam sem verificar nada, ou falhariam por motivo
    // errado. A guarda tem que provar que leu a fonte.
    expect(siglas.length).toBe(17);
    expect(siglas).toContain('ENG');
    expect(siglas).toContain('ALM');
  });

  it('todo módulo declara um dono que existe no seed', () => {
    const valid = new Set([...siglas, ...NON_DEPARTMENT_OWNERS]);
    const invalid = ACCESS_MODULES.filter((module) => !valid.has(module.owner)).map(
      (module) => `${module.key} -> owner="${module.owner}"`,
    );

    // Falhou aqui? O módulo aponta para um departamento que não existe em
    // `departments`. Se o departamento é novo, entre primeiro em seeds.ts.
    expect(invalid).toEqual([]);
  });

  it('nenhum módulo fica sem dono', () => {
    const orphans = ACCESS_MODULES.filter((module) => !module.owner).map((module) => module.key);
    expect(orphans).toEqual([]);
  });

  it('o seed de usuários de teste só grava departamentos que existem', () => {
    // `users.department` é **texto livre** (não há `users.department_id`),
    // então nada no banco impede gravar um departamento que não existe.
    // Em 2026-08-11 havia 5: o script escrevia sem acento — 'Producao',
    // 'Expedicao', 'Manutencao', 'Juridico', 'Seguranca do Trabalho' —
    // enquanto `departments.name` tem acento. Quem filtrasse usuários por
    // nome de departamento não achava ninguém dessas cinco áreas.
    const script = readFileSync(resolve(__dirname, '../../scripts/seed-usuarios-departamentos.cjs'), 'utf8');
    const names = [...script.matchAll(/dept:\s*'([^']+)'/g)].map((match) => match[1]);

    expect(names.length).toBeGreaterThan(0);

    const source = readFileSync(SEEDS_PATH, 'utf8');
    const seedNames = new Set(
      [...source.matchAll(/\{\s*code:\s*'\d{2}',\s*name:\s*'([^']+)'/g)].map((match) => match[1]),
    );

    const unknown = [...new Set(names)].filter((name) => !seedNames.has(name));
    expect(unknown).toEqual([]);
  });

  it('todo departamento operacional do seed é dono de pelo menos um módulo', () => {
    const owned = new Set(ACCESS_MODULES.map((module) => module.owner));
    const withoutModules = siglas.filter((sigla) => !owned.has(sigla));

    // Um departamento sem nenhum módulo RBAC não tem como aparecer na
    // navegação de ninguém — ou falta módulo, ou o departamento não deveria
    // existir. Em qualquer dos casos é uma decisão consciente, não um
    // esquecimento silencioso.
    // Falhou aqui? O departamento existe no seed mas nenhum módulo pertence
    // a ele — ninguém consegue enxergá-lo no sistema.
    expect(withoutModules).toEqual([]);
  });
});
