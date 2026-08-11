import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEPARTMENTS, DIRECTORATES } from '@/lib/departments';

/**
 * 🛡️ Guarda de estrutura organizacional — frontend × `seeds.ts`.
 *
 * **O buraco que ela fecha.** Em 2026-08-11 o dono apontou que o menu do
 * ERP agrupava departamentos que não existiam na empresa. A causa raiz não
 * foi desatenção de quem escreveu a tela: é que **nada ligava** a estrutura
 * documentada (`docs/00-ESTRUTURA_ORGANIZACIONAL.md`,
 * `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`) ao código do
 * frontend. Os docs eram lidos por gente; o menu era escrito de memória; e
 * quando os dois discordavam, typecheck passava, teste passava, build
 * passava. O erro só aparecia quando alguém abria a tela e estranhava.
 *
 * Este projeto já trata essa classe de defeito com guardas em outros
 * domínios — `schema-model-drift-guard`, `column-name-drift-guard`,
 * `docs-reality-drift-guard`, `audit-coverage-guard`. Estrutura
 * organizacional era o único domínio crítico sem nenhuma.
 *
 * **Como funciona.** Lê `server/src/config/seeds.ts` como texto (o client
 * não importa código do server) e extrai `code`/`name`/`sigla` de cada
 * departamento. Qualquer divergência — departamento novo no seed sem aba,
 * aba apontando para código inexistente, nome ou sigla trocados — reprova
 * com a lista do que está fora de lugar.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SEEDS_PATH = resolve(HERE, '../../../server/src/config/seeds.ts');

interface SeedDepartment {
  code: string;
  name: string;
  sigla: string;
}

function readSeedDepartments(): SeedDepartment[] {
  const source = readFileSync(SEEDS_PATH, 'utf8');
  const pattern = /\{\s*code:\s*'(\d{2})',\s*name:\s*'([^']+)',\s*sigla:\s*'([^']+)'/g;

  const found: SeedDepartment[] = [];
  for (const match of source.matchAll(pattern)) {
    found.push({ code: match[1], name: match[2], sigla: match[3] });
  }
  return found;
}

describe('estrutura organizacional: frontend × seeds.ts', () => {
  const seeded = readSeedDepartments();
  const real = DEPARTMENTS.filter((department) => !department.synthetic);

  it('consegue ler os departamentos do seed (a guarda não pode passar por vacuidade)', () => {
    // Sem esta asserção, uma mudança de formatação em `seeds.ts` faria o
    // regex não casar com nada e TODOS os testes abaixo passariam contra
    // uma lista vazia — a guarda viraria decoração.
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded).toHaveLength(17);
  });

  it('todo departamento do seed tem um departamento na navegação', () => {
    const byCode = new Map(real.map((department) => [department.code, department]));
    const missing = seeded
      .filter((seed) => !byCode.has(seed.code))
      .map((seed) => `${seed.code} ${seed.sigla} ${seed.name}`);

    expect(
      missing,
      'Departamento existe no banco mas não aparece na navegação — usuários dessa área ficariam sem menu.',
    ).toEqual([]);
  });

  it('todo departamento da navegação existe no seed', () => {
    const seedCodes = new Set(seeded.map((seed) => seed.code));
    const invented = real
      .filter((department) => !department.code || !seedCodes.has(department.code))
      .map((department) => `${department.label} (code=${department.code ?? 'ausente'})`);

    expect(
      invented,
      'Aba de departamento que não corresponde a nenhuma linha de `departments` — foi exatamente o defeito de 2026-08-11.',
    ).toEqual([]);
  });

  it('nome e sigla batem com o seed', () => {
    const byCode = new Map(seeded.map((seed) => [seed.code, seed]));
    const divergent: string[] = [];

    for (const department of real) {
      const seed = department.code ? byCode.get(department.code) : undefined;
      if (!seed) continue;
      if (seed.name !== department.label) {
        divergent.push(`${seed.code}: nome "${department.label}" ≠ seed "${seed.name}"`);
      }
      if (seed.sigla !== department.sigla) {
        divergent.push(`${seed.code}: sigla "${department.sigla}" ≠ seed "${seed.sigla}"`);
      }
    }

    expect(divergent).toEqual([]);
  });

  it('nenhum código de departamento se repete na navegação', () => {
    const seen = new Map<string, string[]>();
    for (const department of real) {
      const code = department.code ?? '(sem código)';
      seen.set(code, [...(seen.get(code) ?? []), department.label]);
    }
    const duplicated = [...seen.entries()]
      .filter(([, labels]) => labels.length > 1)
      .map(([code, labels]) => `${code} <- ${labels.join(' / ')}`);

    expect(duplicated).toEqual([]);
  });

  it('as diretorias batem com as do seed, por código', () => {
    const source = readFileSync(SEEDS_PATH, 'utf8');
    const seedDirectorates = [
      ...source.matchAll(/\{\s*code:\s*'([A-Z]{3})',\s*name:\s*'([^']+)',\s*position_title:/g),
    ].map((match) => ({ code: match[1], name: match[2] }));

    // Âncora: sem isto, uma mudança de formatação esvaziaria a lista e o
    // teste passaria comparando nada com nada.
    expect(seedDirectorates).toHaveLength(5);

    const front = DIRECTORATES.filter((directorate) => directorate.code);
    const seedByCode = new Map(seedDirectorates.map((directorate) => [directorate.code, directorate.name]));

    const divergent: string[] = [];
    for (const directorate of front) {
      const seedName = seedByCode.get(directorate.code as string);
      if (!seedName) {
        divergent.push(`${directorate.code}: não existe no seed`);
      } else if (seedName !== directorate.label) {
        divergent.push(`${directorate.code}: "${directorate.label}" ≠ seed "${seedName}"`);
      }
    }
    const missing = seedDirectorates
      .filter((directorate) => !front.some((f) => f.code === directorate.code))
      .map((directorate) => `${directorate.code} sem aba no frontend`);

    expect([...divergent, ...missing]).toEqual([]);
  });

  it('cada departamento está na mesma diretoria que o seed declara', () => {
    const source = readFileSync(SEEDS_PATH, 'utf8');

    // `DEPARTMENT_DIRECTORATE` no seed: sigla → código da diretoria.
    // Sigla ausente = transversal (`directorate_id` NULL no banco).
    const block = source.match(/DEPARTMENT_DIRECTORATE:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/);
    expect(block).not.toBeNull();

    const seedMap = new Map<string, string>(
      [...(block?.[1] ?? '').matchAll(/(\w+):\s*'([A-Z]{3})'/g)].map((match) => [match[1], match[2]]),
    );
    expect(seedMap.size).toBe(16); // 17 departamentos menos SST, que é transversal

    const codeByKey = new Map(DIRECTORATES.map((directorate) => [directorate.key, directorate.code]));

    const divergent = real
      .filter((department) => department.sigla)
      .map((department) => {
        const expected = seedMap.get(department.sigla as string); // undefined = transversal
        const actual = codeByKey.get(department.directorate); // undefined = 'transversal'
        return { department, expected, actual };
      })
      .filter(({ expected, actual }) => expected !== actual)
      .map(
        ({ department, expected, actual }) =>
          `${department.sigla}: frontend diz ${actual ?? 'transversal'}, seed diz ${expected ?? 'transversal'}`,
      );

    expect(divergent).toEqual([]);
  });

  it('toda diretoria declarada é usada, e todo departamento aponta para uma existente', () => {
    const known = new Set(DIRECTORATES.map((directorate) => directorate.key));
    const used = new Set(DEPARTMENTS.map((department) => department.directorate));

    const orphans = DEPARTMENTS.filter((department) => !known.has(department.directorate)).map(
      (department) => `${department.label} -> ${department.directorate}`,
    );
    const unused = DIRECTORATES.filter((directorate) => !used.has(directorate.key)).map(
      (directorate) => directorate.label,
    );

    expect(orphans).toEqual([]);
    expect(unused).toEqual([]);
  });
});
