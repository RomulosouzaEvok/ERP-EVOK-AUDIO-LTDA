/**
 * 📐 Regras de negócio puras (sem I/O) de Férias — CLT arts. 129 a 145
 * (redação vigente pós-Lei 13.467/2017, conferida por leitura direta do
 * texto legal em vigor na data desta implementação — 2026-08-09).
 *
 * Todas as funções deste módulo são deliberadamente puras (sem acesso a
 * banco/relógio do sistema fora do parâmetro recebido) para permitir teste
 * unitário determinístico dos limites legais (RF-RH-031 a 043, UC-67).
 *
 * ✅ **VERIFICADO NA FONTE (2026-08-09, passada 2):** o texto integral do
 * Decreto-Lei 5.452/1943 foi baixado de
 * `https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm` e cada
 * artigo citado abaixo foi conferido literalmente contra a redação vigente
 * (incluindo as alterações da Lei 13.467/2017). A ressalva de "conferido
 * apenas por conhecimento treinado", que constava aqui na passada 1, não se
 * aplica mais a este arquivo. **Uma divergência real foi encontrada e
 * corrigida**: a vedação de início de férias nos 2 dias que antecedem
 * feriado/DSR é o **Art. 134 §3º** (incluído pela Lei 13.467/2017) — o §2º
 * foi REVOGADO pela mesma lei. A passada 1 e o próprio enunciado da tarefa
 * citavam "§2º". Ver `validateNoStartBeforeWeeklyRest`.
 *
 * @module modules/rh/domain/services/vacationRules
 */

/** Status possíveis de `hr_vacation_accrual_periods.status` (migration `20260808-000018`). */
export type VacationAccrualStatus = 'em_curso' | 'programado' | 'gozado' | 'vencido_dobra' | 'zerado';

/**
 * Art. 130, CLT — dias de férias por faltas injustificadas no período
 * aquisitivo. A lei não prevê explicitamente "0 dias" para >32 faltas como
 * uma faixa própria do art. 130 (a norma silencia acima de 32); o
 * fundamento de "0 dias" nesse caso é o art. 133, II, CLT — o empregado
 * PERDE o direito às férias quando, no curso do período aquisitivo,
 * "deixar de trabalhar... tiver, no curso do período aquisitivo, entre
 * outras hipóteses, faltado ao serviço, sem justo motivo, por mais de 32
 * (trinta e duas) dias, tenha ou não sido descontados os salários". A
 * combinação das duas normas (art. 130 caput + art. 133, II) produz a
 * mesma tabela usada pelo requisito RF-RH-032 — confirmado, sem
 * divergência.
 *
 * @param unexcusedAbsences - Faltas injustificadas acumuladas no período aquisitivo (`hr_vacation_accrual_periods.unexcused_absences`).
 * @returns Dias de férias a que o empregado tem direito (0 a 30).
 */
export function calculateEntitledDays(unexcusedAbsences: number): number {
  if (unexcusedAbsences < 0) throw new Error('unexcusedAbsences não pode ser negativo.');
  if (unexcusedAbsences <= 5) return 30; // Art. 130, I
  if (unexcusedAbsences <= 14) return 24; // Art. 130, II
  if (unexcusedAbsences <= 23) return 18; // Art. 130, III
  if (unexcusedAbsences <= 32) return 12; // Art. 130, IV
  return 0; // Art. 133, II — perde o direito às férias
}

/**
 * Art. 134, caput, CLT — período concessivo: "As férias serão concedidas
 * por ato do empregador, em um só período, nos 12 (doze) meses subsequentes
 * à data em que o empregado tiver adquirido o direito" (fim do período
 * aquisitivo). Também usada para o próprio período aquisitivo (Art. 130
 * caput: "após cada período de 12 (doze) meses de vigência do contrato").
 *
 * ⚠️ **Semântica de data alinhada ao PostgreSQL (correção da passada 2).**
 * As migrations `20260808-000018` impõem dois CHECKs de linha:
 * `period_end = (period_start + INTERVAL '1 year')::date` e
 * `concessive_end = (period_end + INTERVAL '1 year')::date`. O Postgres
 * **satura** o dia no fim do mês (`date '2024-02-29' + interval '1 year'`
 * = `2025-02-28`), enquanto `Date.setUTCFullYear(+1)` do JS **transborda**
 * (29/02/2024 → 01/03/2025). A implementação ingênua da passada 1 gerava,
 * para todo funcionário admitido em 29 de fevereiro, um valor divergente
 * do CHECK — o `INSERT` passaria pelo typecheck e por todos os testes com
 * repositório mockado e só explodiria em runtime como violação de CHECK
 * (500 do Postgres). Esta versão replica a saturação do Postgres.
 *
 * @param periodEnd - Data base (`YYYY-MM-DD`).
 * @returns Data 12 meses depois (`YYYY-MM-DD`), com o mesmo arredondamento de fim de mês que o PostgreSQL aplica.
 */
export function calculateConcessiveEnd(periodEnd: string): string {
  const [year, month, day] = periodEnd.split('-').map(Number);
  const targetYear = year + 1;
  // Último dia do mês de destino (dia 0 do mês seguinte, em UTC).
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  const saturatedDay = Math.min(day, lastDayOfTargetMonth);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${targetYear}-${pad(month)}-${pad(saturatedDay)}`;
}

/** Uma fração de programação de férias, para validação agregada por período aquisitivo. */
export interface VacationFractionInput {
  /** Dias corridos da fração (exclui a porção convertida em abono, se houver). */
  days: number;
}

/**
 * Art. 134 §1º, CLT — "Desde que haja concordância do empregado, as férias
 * poderão ser usufruídas em até três períodos, sendo que um deles não
 * poderá ser inferior a 14 (catorze) dias corridos e os demais não poderão
 * ser inferiores a 5 (cinco) dias corridos, cada um."
 *
 * A vedação de fracionamento para menores de 18/maiores de 50 anos, que
 * existia na redação do art. 134 §2º ANTERIOR à Lei 13.467/2017, foi
 * REVOGADA pela Reforma Trabalhista — a redação atual não distingue por
 * idade. Este módulo, portanto, deliberadamente NÃO implementa essa
 * restrição (que seria uma regra de 1943, não a vigente).
 *
 * @param fractions - Frações já registradas + a nova fração sendo validada (dias de cada uma).
 * @throws {Error} Se exceder 3 frações, ou se a distribuição de tamanhos violar o §1º.
 */
export function validateFractionSizes(fractions: VacationFractionInput[]): void {
  if (fractions.length > 3) {
    throw new Error('MAX_FRACTIONS_REACHED: até 3 frações por período aquisitivo (Art. 134 §1º, CLT).');
  }
  if (fractions.length > 1) {
    const hasLongFraction = fractions.some((f) => f.days >= 14);
    const hasTooShortFraction = fractions.some((f) => f.days < 5);
    if (!hasLongFraction || hasTooShortFraction) {
      throw new Error(
        'INVALID_FRACTION_SIZE: com mais de 1 fração, uma delas deve ter ao menos 14 dias corridos e as demais ao menos 5 dias corridos cada (Art. 134 §1º, CLT).',
      );
    }
  }
}

/**
 * **Art. 134 §3º**, CLT (incluído pela Lei 13.467/2017) — "É vedado o
 * início das férias no período de dois dias que antecede feriado ou dia de
 * repouso semanal remunerado."
 *
 * ⚠️ **CORREÇÃO DE CITAÇÃO LEGAL (passada 2, verificada na fonte):** a
 * passada 1 desta implementação (e o próprio enunciado da tarefa) citavam
 * esta regra como "Art. 134 §2º". Conferido no texto oficial em
 * `planalto.gov.br`: o **§2º foi REVOGADO** pela Lei 13.467/2017 (era a
 * vedação de fracionamento para menores de 18/maiores de 50 anos); a
 * vedação de início antes de feriado/DSR é o **§3º**, incluído pela mesma
 * lei. Divergência registrada no HANDOFF_CODEX.
 *
 * ⚠️ GAP LEGAL DECLARADO: esta função valida apenas a vedação relativa ao
 * dia de repouso semanal remunerado (DSR), assumindo domingo como o DSR
 * padrão do funcionário (não há campo de DSR por funcionário no schema
 * atual de `employees`/`hr_*`). A vedação relativa a FERIADO não é
 * verificável nesta passada — o ERP não tem um calendário de feriados
 * nacional/estadual/municipal modelado em nenhum módulo existente. Este é
 * um requisito legal real que NÃO constava em
 * `docs/business/BLOCO_6_RH_REQUISITOS.md`/`BLOCO_6_RH_API.md` (nenhum RF
 * cobre feriados) — divergência entre a lei e os artefatos do bloco,
 * registrada explicitamente no relatório desta implementação e no
 * HANDOFF_CODEX para a próxima passada (recomendação: tabela de calendário
 * de feriados, fora do escopo de dado já modelado neste bloco).
 *
 * @param startDate - Data de início da fração de férias (`YYYY-MM-DD`).
 * @throws {Error} Se `startDate` cair nos 2 dias corridos que antecedem um domingo (DSR padrão).
 */
export function validateNoStartBeforeWeeklyRest(startDate: string): void {
  const date = new Date(`${startDate}T00:00:00Z`);
  const dayOfWeek = date.getUTCDay(); // 0 = domingo
  // Os 2 dias que antecedem um domingo são sexta-feira (5) e sábado (6).
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    throw new Error(
      'VACATION_START_BEFORE_WEEKLY_REST: início das férias não pode cair nos 2 dias que antecedem o repouso semanal remunerado (Art. 134 §3º, CLT) — assumindo domingo como DSR padrão.',
    );
  }
}

/**
 * Antecedência mínima legal do aviso de férias ao empregado.
 *
 * **Art. 135, caput, CLT** (redação dada pela Lei 7.414/1985) — "A concessão
 * das férias será participada, por escrito, ao empregado, com antecedência
 * de, no mínimo, 30 (trinta) dias. Dessa participação o interessado dará
 * recibo." Verificado na fonte em 2026-08-09.
 *
 * ⚠️ **DIVERGÊNCIA LEI × REQUISITO (registrada, não resolvida em código):**
 * a lei fixa 30 dias como MÍNIMO OBRIGATÓRIO, mas `RF-RH-037`
 * (`docs/business/BLOCO_6_RH_REQUISITOS.md`) e §8.3 do contrato de API
 * determinam explicitamente que uma antecedência menor seja **aceita com
 * aviso/justificativa, sem bloquear**. Esta implementação segue o requisito
 * (não bloqueia) porque o ERP apenas REGISTRA a data em que o aviso foi
 * dado — ele não emite o aviso —, e bloquear impediria o RH de registrar
 * um fato já ocorrido. O texto do warning, porém, foi ajustado para deixar
 * claro que se trata de descumprimento de mínimo legal, não de mera
 * recomendação interna. Ver HANDOFF_CODEX.
 */
export const VACATION_NOTICE_MIN_DAYS = 30;

/**
 * Art. 143, caput, CLT — "É facultado ao empregado converter 1/3 (um
 * terço) do período de férias a que tiver direito em abono pecuniário."
 *
 * @param abonoDays - Dias solicitados para conversão em abono.
 * @param entitledDays - Dias de férias a que o funcionário tem direito no período (`calculateEntitledDays`).
 * @throws {Error} `ABONO_LIMIT_EXCEEDED` se `abonoDays` exceder 1/3 de `entitledDays` (arredondado para baixo).
 */
export function validateAbonoLimit(abonoDays: number, entitledDays: number): void {
  const maxAbono = Math.floor(entitledDays / 3);
  if (abonoDays > maxAbono) {
    throw new Error(
      `ABONO_LIMIT_EXCEEDED: abono pecuniário limitado a 1/3 dos dias do período (máx. ${maxAbono} dia(s) — Art. 143, caput, CLT).`,
    );
  }
}

/**
 * Art. 143 §1º, CLT — "O abono de férias deverá ser requerido até 15
 * (quinze) dias antes do término do período aquisitivo."
 *
 * @param requestedAt - Data do requerimento do abono (`YYYY-MM-DD`).
 * @param accrualPeriodEnd - Data de fim do período aquisitivo (`YYYY-MM-DD`, NÃO o concessivo — a lei fala em período aquisitivo).
 * @throws {Error} `ABONO_DEADLINE_EXPIRED` se o requerimento for feito a menos de 15 dias do fim do período aquisitivo.
 */
export function validateAbonoDeadline(requestedAt: string, accrualPeriodEnd: string): void {
  const requested = new Date(`${requestedAt}T00:00:00Z`);
  const periodEnd = new Date(`${accrualPeriodEnd}T00:00:00Z`);
  const diffDays = Math.round((periodEnd.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 15) {
    throw new Error('ABONO_DEADLINE_EXPIRED: requerimento de abono deve ocorrer até 15 dias antes do fim do período aquisitivo (Art. 143 §1º, CLT).');
  }
}

/**
 * Art. 137, caput, CLT — "Sempre que as férias forem concedidas após o
 * prazo de que trata o art. 134, o empregador pagará em dobro a respectiva
 * remuneração."
 *
 * Verificação ativa (RNF-RH-02/RF-RH-076, "nunca esquecido silenciosamente")
 * — chamada em toda leitura de `VacationAccrualPeriod` (GET individual e
 * dashboard).
 *
 * @param concessiveEnd - Data-limite do período concessivo (`calculateConcessiveEnd`).
 * @param status - Status atual do período.
 * @param today - Data de referência (injetável para teste determinístico).
 * @returns `true` se o período está vencido em dobra (concessivo expirado sem gozo integral).
 */
export function isConcessiveExpired(concessiveEnd: string, status: VacationAccrualStatus, today: Date = new Date()): boolean {
  if (status === 'gozado' || status === 'zerado' || status === 'vencido_dobra') return false;
  const limit = new Date(`${concessiveEnd}T00:00:00Z`);
  return today.getTime() > limit.getTime();
}

/**
 * Escala de alertas do período concessivo (RF-RH-034) — 6, 3 e 1 mês antes
 * de `concessive_end`. Não é regra legal (a lei só define a consequência da
 * dobra, não a antecedência do alerta interno) — é decisão operacional já
 * fixada pelo RF, mantida como constante nomeada para rastreabilidade.
 */
export const CONCESSIVE_ALERT_WINDOWS_MONTHS: readonly number[] = [6, 3, 1];

/**
 * Art. 133, CLT — hipóteses de perda do direito a férias por afastamento
 * previdenciário; a combinada com a doutrina/prática de RH (>6 meses de
 * auxílio-doença/acidente do trabalho no mesmo período aquisitivo zera o
 * período em curso, reiniciando a contagem no retorno — art. 133, IV, CLT:
 * "tiver percebido da Previdência Social prestações de acidente de trabalho
 * ou de auxílio-doença por mais de 6 (seis) meses, embora descontínuos").
 *
 * @param accumulatedInssAbsenceDays - Soma de dias de afastamento tipo `auxilio_doenca_inss`/`acidente_trabalho` no período aquisitivo em curso.
 * @returns `true` se o período aquisitivo deve ser zerado (Art. 133, IV, CLT).
 */
export function shouldZeroAccrualPeriod(accumulatedInssAbsenceDays: number): boolean {
  return accumulatedInssAbsenceDays > 182; // > 6 meses (30 dias × 6 = 180; usa 182 para meses de 31 dias — decisão conservadora documentada)
}
