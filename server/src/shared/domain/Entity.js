/**
 * Classe base simples para entidades de domínio.
 *
 * Uma entidade se distingue de um value object por possuir identidade
 * própria (`id`), independente dos valores dos seus demais atributos.
 * Duas entidades são consideradas iguais quando possuem o mesmo `id`,
 * mesmo que outros atributos divirjam.
 */
class Entity {
  /**
   * @param {Object} [props] - Propriedades da entidade.
   * @param {number|string} [props.id] - Identificador único da entidade (ex.: PK do banco).
   * @param {Date|string} [props.createdAt] - Data de criação, quando aplicável.
   * @param {Date|string} [props.updatedAt] - Data da última atualização, quando aplicável.
   */
  constructor({ id, createdAt, updatedAt } = {}) {
    this.id = id;
    if (createdAt !== undefined) this.createdAt = createdAt;
    if (updatedAt !== undefined) this.updatedAt = updatedAt;
  }

  /**
   * Compara esta entidade a outra pela identidade (`id`).
   *
   * @param {Entity} other - Outra entidade a comparar.
   * @returns {boolean} `true` se ambas possuem o mesmo `id` e não são `null`/`undefined`.
   */
  equals(other) {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    if (this.id === undefined || other.id === undefined) return false;
    return this.id === other.id;
  }
}

module.exports = Entity;
