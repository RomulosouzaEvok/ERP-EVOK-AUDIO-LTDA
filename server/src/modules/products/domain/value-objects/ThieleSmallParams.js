const ValueObject = require('../../../../shared/domain/ValueObject');
const { ValidationError } = require('../../../../errors');

/** Nomes dos parâmetros Thiele-Small suportados pelo produto (alto-falante). */
const TS_FIELDS = ['fs', 'qms', 'qes', 'qts', 'vas', 'sd', 'xmax', 're', 'le', 'bl', 'mms', 'cms', 'spl'];

/**
 * Value object que representa o conjunto de parâmetros Thiele-Small de um
 * alto-falante (Fs, Qms, Qes, Qts, Vas, Sd, Xmax, Re, Le, BL, Mms, Cms, SPL).
 *
 * Não valida fisicamente os parâmetros (ex.: relação entre Qts e Vas), apenas
 * garante que, quando informados, sejam numéricos e não-negativos — a mesma
 * regra já aplicada no controller legado.
 */
class ThieleSmallParams extends ValueObject {
  /**
   * @param {Object} [props] - Parâmetros Thiele-Small, todos opcionais.
   * @throws {ValidationError} Se algum parâmetro informado não for numérico ou for negativo.
   */
  constructor(props = {}) {
    const normalized = {};
    for (const field of TS_FIELDS) {
      const raw = props[field];
      if (raw === undefined || raw === null || raw === '') continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new ValidationError(`Parâmetro Thiele-Small "${field}" deve ser numérico.`);
      }
      if (value < 0) {
        throw new ValidationError(`Parâmetro Thiele-Small "${field}" não pode ser negativo.`);
      }
      normalized[field] = value;
    }
    super(normalized);
  }

  /**
   * Converte os parâmetros para o formato de colunas do model Sequelize
   * (`ts_params_<campo>`).
   *
   * @returns {Object} Mapa `{ ts_params_fs, ts_params_qms, ... }` apenas com os campos informados.
   */
  toPersistence() {
    const out = {};
    for (const field of TS_FIELDS) {
      if (this[field] !== undefined) out[`ts_params_${field}`] = this[field];
    }
    return out;
  }
}

module.exports = ThieleSmallParams;
module.exports.TS_FIELDS = TS_FIELDS;
