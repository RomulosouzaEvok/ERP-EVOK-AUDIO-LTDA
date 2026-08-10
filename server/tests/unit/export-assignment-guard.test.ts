/**
 * Guarda anti-regressão: nenhum arquivo de `src/` pode misturar
 * `export = X` com qualquer outro `export` de topo (`export interface`,
 * `export type`, `export const`, ...).
 *
 * ## Por que este teste existe (incidente de 2026-08-09)
 *
 * O projeto roda TypeScript direto via `tsx`/esbuild. Quando um arquivo usa
 * `export =` (convenção do projeto para classes/use cases/models) **e**
 * qualquer outro `export`, o esbuild transpila o módulo em modo ESM e o
 * `export =` vira uma referência a uma variável `<Nome>_module` que nunca é
 * declarada. O resultado é um `ReferenceError: <Nome>_module is not defined`
 * **em tempo de execução, no `require` do módulo**.
 *
 * O que torna isso perigoso é que NENHUMA das duas redes de segurança
 * existentes pega o problema:
 * - `tsc --noEmit` aceita `export =` ao lado de um `export interface`
 *   (interface é apagada na emissão, então não há conflito de tipo);
 * - a suíte Jest também passa, porque o transform de teste é CJS e resolve
 *   o `export =` corretamente.
 *
 * Na prática o efeito é o pior possível: como `app.ts` faz `require` de
 * todos os routers no boot, um único arquivo nessa condição derruba o
 * **servidor inteiro** — foi exatamente o que aconteceu com
 * `juridico/.../ApproveContractUseCase.ts` (já commitado) e
 * `employees/.../DeactivateEmployeeUseCase.ts`, ambos corrigidos em
 * 2026-08-09. A correção é sempre trivial: tornar a interface local, ou
 * movê-la para um `*Types.ts` dedicado (ver
 * `modules/rh/application/services/EmployeeDirectoryTypes.ts`).
 *
 * @module tests/unit/export-assignment-guard
 */

import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../src');

/** Lista recursiva de todos os `.ts` de `src/`. */
function listTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTypeScriptFiles(fullPath));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) files.push(fullPath);
  }
  return files;
}

/**
 * Remove comentários de bloco e de linha antes de procurar por `export`,
 * para não confundir prosa de JSDoc (que cita `export =` e
 * `export interface` justamente ao explicar esta armadilha) com código.
 */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('export-assignment-guard (armadilha ESM+CJS: `export =` não pode conviver com outro `export`)', () => {
  it('nenhum arquivo de src/ mistura `export =` com outro export de topo', () => {
    const offenders: string[] = [];

    for (const filePath of listTypeScriptFiles(SRC_ROOT)) {
      const code = stripComments(fs.readFileSync(filePath, 'utf-8'));
      const hasExportAssignment = /^export\s*=/m.test(code);
      if (!hasExportAssignment) continue;

      const otherExports = (code.match(/^export\s+(?!=)/gm) ?? []).length;
      if (otherExports > 0) {
        offenders.push(path.relative(SRC_ROOT, filePath).replace(/\\/g, '/'));
      }
    }

    expect(offenders).toEqual([]);
  });
});
