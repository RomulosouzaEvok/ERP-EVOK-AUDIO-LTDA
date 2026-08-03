import { httpClient } from './httpClient';
import type { ItemResponse, ListResponse } from './types';

/** Ver `server/src/modules/laboratory/presentation/validators/laboratoryValidators.ts`. */
export type AcousticTestType =
  | 'impedance'
  | 'frequency_response'
  | 'thd'
  | 'power_rms'
  | 'power_peak'
  | 'life'
  | 'polarity'
  | 'noise'
  | 'thiele_small';

export interface AcousticTestResult {
  id: number;
  product_id: number;
  serial_number: string | null;
  lot_number: string | null;
  production_order_id: number | null;
  test_type: AcousticTestType;
  parameters: Record<string, unknown> | null;
  result: string | number | null;
  unit: string | null;
  specification_min: string | number | null;
  specification_max: string | number | null;
  curve_data: unknown;
  passed: boolean | null;
  notes: string | null;
  test_date: string;
  tester_id: number;
  non_conformity_id?: number | null;
  createdAt: string;
  product?: { id: number; name: string; code: string };
  tester?: { id: number; name: string };
}

export interface AcousticTestListParams {
  page?: number;
  limit?: number;
  product_id?: number;
  test_type?: AcousticTestType;
  passed?: boolean;
  serial_number?: string;
  start_date?: string;
  end_date?: string;
}

export interface AcousticTestInput {
  product_id: number;
  serial_number?: string;
  lot_number?: string;
  production_order_id?: number;
  test_type: AcousticTestType;
  parameters?: Record<string, unknown>;
  result?: number;
  unit?: string;
  specification_min?: number;
  specification_max?: number;
  curve_data?: unknown;
  notes?: string;
  create_rnc_on_fail?: boolean;
}

export interface AcousticTestSummaryRow {
  test_type: AcousticTestType;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

export interface AcousticTestSummaryParams {
  product_id?: number;
  days?: number;
}

/** `GET /api/laboratory/tests` — lista paginada de testes de laboratório (filtros + product/tester). */
export async function listAcousticTests(params: AcousticTestListParams = {}) {
  const { data } = await httpClient.get<ListResponse<AcousticTestResult>>('/api/laboratory/tests', { params });
  return data;
}

/** `POST /api/laboratory/tests` — registra um resultado de teste de laboratório. */
export async function createAcousticTest(input: AcousticTestInput) {
  const { data } = await httpClient.post<ItemResponse<AcousticTestResult>>('/api/laboratory/tests', input);
  return data.data;
}

/** `GET /api/laboratory/tests/summary` — agregado total/aprovados/reprovados/pass rate por tipo de teste. */
export async function getAcousticTestsSummary(params: AcousticTestSummaryParams = {}) {
  const { data } = await httpClient.get<ItemResponse<AcousticTestSummaryRow[]>>('/api/laboratory/tests/summary', {
    params,
  });
  return data.data;
}
