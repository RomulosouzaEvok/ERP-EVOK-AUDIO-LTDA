import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEPARTMENTS, type DepartmentKey } from '@/lib/departments';
import { NAV_ITEMS_FOR_TEST } from '@/layouts/AppLayout';

/**
 * 🛡️ Guarda de coerência da navegação por departamento.
 *
 * Nasceu da auditoria de 2026-08-11
 * (`docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md`, achados
 * F1–F5). O menu tinha dois itens — "Relatórios de Logística" e
 * "Relatórios de Compras" — apontando para o **mesmo** destino
 * (`/reports?tab=purchasing`). Como o departamento ativo é resolvido pelo
 * primeiro item que casa com a URL, clicar em um levava a barra a acusar o
 * departamento do outro.
 *
 * Aquilo passou por typecheck e pelos 12 arquivos de teste do client sem
 * nenhum ruído, porque **nenhum teste olhava para a coerência do menu** —
 * só para fiação de rota. Este arquivo fecha essa lacuna.
 */
describe('navegação por departamento', () => {
  it('não tem dois itens com o mesmo destino (regressão do achado F1)', () => {
    const seen = new Map<string, string[]>();
    for (const item of NAV_ITEMS_FOR_TEST) {
      seen.set(item.to, [...(seen.get(item.to) ?? []), item.label]);
    }

    const duplicates = [...seen.entries()].filter(([, labels]) => labels.length > 1);

    expect(
      duplicates,
      `Destinos repetidos quebram a resolução do departamento ativo: ${duplicates
        .map(([to, labels]) => `${to} <- ${labels.join(' / ')}`)
        .join('; ')}`,
    ).toEqual([]);
  });

  it('todo item aponta para um departamento declarado em DEPARTMENTS', () => {
    const known = new Set<DepartmentKey>(DEPARTMENTS.map((department) => department.key));
    const orphans = NAV_ITEMS_FOR_TEST.filter((item) => !known.has(item.department)).map(
      (item) => `${item.label} -> ${item.department}`,
    );

    expect(orphans).toEqual([]);
  });

  it('todo departamento declarado tem ao menos uma página (nenhuma aba vazia)', () => {
    const used = new Set(NAV_ITEMS_FOR_TEST.map((item) => item.department));
    const empty = DEPARTMENTS.filter((department) => !used.has(department.key)).map(
      (department) => department.label,
    );

    expect(empty).toEqual([]);
  });

  it('itens do mesmo departamento ficam juntos na lista (leitura do arquivo)', () => {
    // Não é regra funcional — a seção é derivada por agrupamento e
    // funcionaria mesmo embaralhada. É higiene de leitura: quem edita o
    // arquivo precisa achar o bloco do departamento de uma vez.
    const firstIndex = new Map<DepartmentKey, number>();
    const lastIndex = new Map<DepartmentKey, number>();
    NAV_ITEMS_FOR_TEST.forEach((item, index) => {
      if (!firstIndex.has(item.department)) firstIndex.set(item.department, index);
      lastIndex.set(item.department, index);
    });

    const scattered = [...firstIndex.entries()]
      .filter(([department, start]) => {
        const end = lastIndex.get(department) ?? start;
        const count = NAV_ITEMS_FOR_TEST.filter((item) => item.department === department).length;
        return end - start + 1 !== count;
      })
      .map(([department]) => department);

    expect(scattered).toEqual([]);
  });

  it('o departamento do item bate com o dono do módulo no backend', () => {
    // Cruza o menu com `server/src/shared/domain/accessModules.ts`, onde
    // cada módulo RBAC declara o departamento dono (`owner`, por sigla do
    // seed). É a guarda que teria pego, em 2026-08-11, "Garantia /
    // Assistência Técnica" alocada em Qualidade quando os docs a atribuem
    // a Vendas (pós-venda) — o erro foi encontrado por leitura humana, não
    // por teste, porque este cruzamento não existia.
    const HERE = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(HERE, '../../../server/src/shared/domain/accessModules.ts'), 'utf8');

    const ownerByModule = new Map<string, string>();
    for (const match of source.matchAll(/\{\s*key:\s*'([^']+)',[\s\S]*?owner:\s*'([A-Z]+)'\s*\}/g)) {
      ownerByModule.set(match[1], match[2]);
    }

    // Sem esta âncora, uma mudança de formatação no catálogo esvaziaria o
    // mapa e o teste passaria sem cruzar nada.
    expect(ownerByModule.size).toBeGreaterThanOrEqual(39);

    const departmentBySigla = new Map<string, DepartmentKey>(
      DEPARTMENTS.filter((department) => department.sigla).map((department) => [
        department.sigla as string,
        department.key,
      ]),
    );
    // As duas siglas que não são departamento (ver `AccessModuleOwner`).
    departmentBySigla.set('PESSOAL', 'inicio');
    departmentBySigla.set('SISTEMA', 'sistema');

    const mismatched = NAV_ITEMS_FOR_TEST.filter((item) => item.module)
      .map((item) => {
        const owner = ownerByModule.get(item.module as string);
        const expected = owner ? departmentBySigla.get(owner) : undefined;
        return { item, owner, expected };
      })
      .filter(({ expected, item }) => expected !== undefined && expected !== item.department)
      .map(({ item, owner, expected }) => `${item.label}: está em "${item.department}", módulo ${item.module} é de ${owner} (${expected})`);

    expect(mismatched).toEqual([]);
  });

  it('destinos com querystring usam uma aba real do ReportsPage', () => {
    const validTabs = new Set(['production', 'oee', 'purchasing', 'costs', 'financial']);
    const bad = NAV_ITEMS_FOR_TEST.filter((item) => item.to.includes('?')).filter((item) => {
      const [path, query] = item.to.split('?');
      if (path !== '/reports') return true;
      return !validTabs.has(new URLSearchParams(query).get('tab') ?? '');
    });

    expect(bad.map((item) => `${item.label} -> ${item.to}`)).toEqual([]);
  });
});
