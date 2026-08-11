/**
 * 🏛️ Model: Directorate (Diretorias)
 *
 * @module models/Directorate
 *
 * Nível organizacional **acima** de `Department`, espelhando
 * `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`: CEO/Diretoria (`CEO`),
 * Industrial (`IND`), Suprimentos & Logística (`SUP`), Comercial (`COM`) e
 * Administrativo-Financeiro (`ADM`).
 *
 * ## Por que uma tabela própria, e não `departments.parent_id`
 *
 * A modelagem clássica de árvore em SQL é a *adjacency list*
 * (auto-referência), e ela seria certa se pai e filho fossem a mesma
 * entidade. **Não são.** `Diretoria (01)` é UM departamento no seed, e os
 * quatro diretores são *cargos dentro dele*
 * (`docs/administrativo/01-DIRETORIA.md`). Usar `parent_id` exigiria criar
 * linhas falsas em `departments` — "Diretoria Industrial", "Diretoria
 * Comercial" — que não existem na empresa e serviriam só de nó de árvore.
 * Hierarquia fixa de dois níveis → uma tabela por nível.
 *
 * ## `manager_id` NULL = cargo vago
 *
 * É o caso de `SUP` desde a criação (2026-08-11): a diretoria foi decidida
 * pelo dono, o ocupante não. O banco não inventa diretor.
 *
 * Criado pela migration `20260811-000043-create-directorates-hierarchy.cjs`
 * (achado F-6 de `docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md`).
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface DirectorateAttributes {
  id: number;
  code: string;
  name: string;
  position_title: string;
  manager_id: number | null;
  active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Directorate = sequelize.define(
  'Directorate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Chave natural (CEO, IND, SUP, COM, ADM) — referência estável, nunca o id serial',
    },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: 'Nome da diretoria' },
    position_title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      comment: 'Cargo do responsável (ex.: Diretor Industrial)',
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'FK → employees.id (diretor). NULL = cargo vago',
    },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'directorates',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['code'] }],
  },
);

// `export =` não pode conviver com nenhum outro export de topo neste projeto
// (armadilha ESM+CJS, guardada por `tests/unit/export-assignment-guard.test.ts`)
// — por isso `DirectorateAttributes` fica só como tipo interno, igual aos
// demais models.
export = Directorate;
