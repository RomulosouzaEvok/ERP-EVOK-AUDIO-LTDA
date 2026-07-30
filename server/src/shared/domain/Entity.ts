/**
 * 🧱 Classe base para entidades de domínio.
 *
 * Uma entidade se distingue de um value object por possuir **identidade
 * própria** (`id`), independente dos valores dos seus demais atributos.
 * Duas entidades são consideradas iguais quando possuem o mesmo `id`,
 * mesmo que outros atributos divirjam.
 *
 * @module shared/domain/Entity
 */

export interface EntityProps {
  id?: number | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export class Entity {
  public readonly id?: number | string | null;
  public readonly createdAt?: Date | string | null;
  public readonly updatedAt?: Date | string | null;

  /**
   * @param props - Propriedades base da entidade.
   */
  constructor(props: EntityProps = {}) {
    this.id = props.id;
    if (props.createdAt !== undefined && props.createdAt !== null) {
      this.createdAt = props.createdAt;
    }
    if (props.updatedAt !== undefined && props.updatedAt !== null) {
      this.updatedAt = props.updatedAt;
    }
  }

  /**
   * Compara esta entidade a outra pela identidade (`id`).
   *
   * @param other - Outra entidade a comparar.
   * @returns `true` se ambas possuem o mesmo `id` e não são `null`/`undefined`.
   */
  public equals(other: Entity | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    if (this.id === undefined || other.id === undefined) return false;
    return this.id === other.id;
  }
}

export default Entity;

// Compatibilidade com imports CommonJS legados (`require(...)`) usados no projeto.
module.exports = Entity;
module.exports.Entity = Entity;
module.exports.default = Entity;
