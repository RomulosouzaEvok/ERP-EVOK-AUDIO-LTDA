/**
 * 🧱 Classe base para value objects imutáveis.
 *
 * Um value object **não possui identidade própria**: duas instâncias são
 * iguais quando todos os seus valores são iguais. Instâncias são congeladas
 * (`Object.freeze`) no construtor para reforçar imutabilidade.
 *
 * @module shared/domain/ValueObject
 */

export class ValueObject {
  /**
   * @param props - Conjunto de valores imutáveis que compõem o value object.
   */
  constructor(props: Record<string, unknown>) {
    Object.assign(this, props);
    Object.freeze(this);
  }

  /**
   * Compara este value object a outro por igualdade estrutural (por valor),
   * usando serialização JSON simples. Suficiente para value objects com
   * propriedades primitivas/planas.
   *
   * @param other - Outro value object a comparar.
   * @returns `true` se ambos possuem os mesmos valores.
   */
  public equals(other: ValueObject | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof ValueObject)) return false;
    return JSON.stringify(this) === JSON.stringify(other);
  }
}

export default ValueObject;
