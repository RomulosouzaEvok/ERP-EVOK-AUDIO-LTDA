import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ClipboardList, CheckCircle2, XCircle, Percent } from 'lucide-react';

import * as laboratoryApi from '@/api/laboratory';
import * as productsApi from '@/api/products';
import { extractApiErrorMessage } from '@/api/httpClient';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';

const TEST_TYPE_LABEL: Record<laboratoryApi.AcousticTestType, string> = {
  impedance: 'Impedância',
  frequency_response: 'Resposta de frequência',
  thd: 'Distorção harmônica (THD)',
  power_rms: 'Potência RMS',
  power_peak: 'Potência de pico',
  life: 'Vida útil',
  polarity: 'Polaridade',
  noise: 'Ruído',
  thiele_small: 'Thiele-Small',
};

function formatSpecRange(min: string | number | null, max: string | number | null): string {
  if (min === null && max === null) return '-';
  if (min !== null && max !== null) return `${min} a ${max}`;
  if (min !== null) return `≥ ${min}`;
  return `≤ ${max}`;
}

function VerdictBadge({ passed }: { passed: boolean | null }) {
  if (passed === null || passed === undefined) return <Badge variant="secondary">Sem veredito</Badge>;
  const variant: BadgeProps['variant'] = passed ? 'success' : 'destructive';
  return <Badge variant={variant}>{passed ? 'Aprovado' : 'Reprovado'}</Badge>;
}

/** Aba B: histórico de testes de laboratório com filtros e tiles de resumo. */
export function TestHistoryTab() {
  const [productFilter, setProductFilter] = React.useState('');
  const [testTypeFilter, setTestTypeFilter] = React.useState<laboratoryApi.AcousticTestType | ''>('');
  const [passedFilter, setPassedFilter] = React.useState<'' | 'true' | 'false'>('');
  const [serialFilter, setSerialFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const { data: products } = useQuery({
    queryKey: ['products-all-for-lab-history'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['acoustic-tests', page, productFilter, testTypeFilter, passedFilter, serialFilter],
    queryFn: () =>
      laboratoryApi.listAcousticTests({
        page,
        limit: 20,
        product_id: productFilter ? Number(productFilter) : undefined,
        test_type: testTypeFilter || undefined,
        passed: passedFilter === '' ? undefined : passedFilter === 'true',
        serial_number: serialFilter || undefined,
      }),
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['acoustic-tests-summary', productFilter],
    queryFn: () => laboratoryApi.getAcousticTestsSummary({ product_id: productFilter ? Number(productFilter) : undefined }),
  });

  const totals = React.useMemo(() => {
    if (!summary) return { total: 0, passed: 0, failed: 0, passRate: 0 };
    const total = summary.reduce((acc, row) => acc + row.total, 0);
    const passed = summary.reduce((acc, row) => acc + row.passed, 0);
    const failed = summary.reduce((acc, row) => acc + row.failed, 0);
    const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0;
    return { total, passed, failed, passRate };
  }, [summary]);

  return (
    <div className="flex flex-col gap-4">
      {summaryError && (
        <p className="text-sm text-destructive">Não foi possível carregar o resumo de testes.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          icon={ClipboardList}
          label="Total de testes (30 dias)"
          value={summaryLoading ? '...' : String(totals.total)}
        />
        <SummaryTile
          icon={CheckCircle2}
          label="Aprovados"
          value={summaryLoading ? '...' : String(totals.passed)}
          tone="good"
        />
        <SummaryTile
          icon={XCircle}
          label="Reprovados"
          value={summaryLoading ? '...' : String(totals.failed)}
          tone={totals.failed > 0 ? 'bad' : undefined}
        />
        <SummaryTile
          icon={Percent}
          label="Taxa de aprovação geral"
          value={summaryLoading ? '...' : `${totals.passRate.toFixed(2)}%`}
          tone={totals.passRate >= 90 ? 'good' : totals.passRate > 0 ? 'bad' : undefined}
        />
      </div>

      {summary && summary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de aprovação por tipo de teste</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Aprovados</TableHead>
                  <TableHead>Reprovados</TableHead>
                  <TableHead>Pass rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.test_type}>
                    <TableCell>{TEST_TYPE_LABEL[row.test_type]}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.passed}</TableCell>
                    <TableCell>{row.failed}</TableCell>
                    <TableCell>{Number(row.pass_rate).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lab-product-filter" className="text-sm text-muted-foreground">
            Produto
          </Label>
          <SelectNative
            id="lab-product-filter"
            className="max-w-56"
            value={productFilter}
            onChange={(event) => {
              setProductFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {products?.data.map((product) => (
              <option key={product.id} value={product.id}>
                {product.code} — {product.name}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lab-type-filter" className="text-sm text-muted-foreground">
            Tipo de teste
          </Label>
          <SelectNative
            id="lab-type-filter"
            className="max-w-52"
            value={testTypeFilter}
            onChange={(event) => {
              setTestTypeFilter(event.target.value as laboratoryApi.AcousticTestType | '');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(TEST_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lab-verdict-filter" className="text-sm text-muted-foreground">
            Veredito
          </Label>
          <SelectNative
            id="lab-verdict-filter"
            className="max-w-40"
            value={passedFilter}
            onChange={(event) => {
              setPassedFilter(event.target.value as '' | 'true' | 'false');
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Aprovado</option>
            <option value="false">Reprovado</option>
          </SelectNative>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lab-serial-filter" className="text-sm text-muted-foreground">
            Nº de série
          </Label>
          <Input
            id="lab-serial-filter"
            className="max-w-40"
            value={serialFilter}
            onChange={(event) => {
              setSerialFilter(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Série/Lote</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Medido</TableHead>
            <TableHead>Faixa</TableHead>
            <TableHead>Veredito</TableHead>
            <TableHead>RNC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={8} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                {extractApiErrorMessage(error, 'Não foi possível carregar o histórico de testes.')}
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((test) => (
            <TableRow key={test.id}>
              <TableCell>{new Date(test.test_date ?? test.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>{test.product ? `${test.product.code} — ${test.product.name}` : test.product_id}</TableCell>
              <TableCell>{test.serial_number ?? test.lot_number ?? '-'}</TableCell>
              <TableCell>{TEST_TYPE_LABEL[test.test_type]}</TableCell>
              <TableCell>
                {test.result !== null && test.result !== undefined ? `${test.result} ${test.unit ?? ''}` : '-'}
              </TableCell>
              <TableCell>{formatSpecRange(test.specification_min, test.specification_max)}</TableCell>
              <TableCell>
                <VerdictBadge passed={test.passed} />
              </TableCell>
              <TableCell>
                {test.non_conformity_id ? (
                  <Link to="/quality" className="text-sm font-medium underline">
                    RNC #{test.non_conformity_id}
                  </Link>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Nenhum teste encontrado para os filtros selecionados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  const toneClass = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : '';
  const badgeToneClass =
    tone === 'good'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
      : tone === 'bad'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-brand/10 text-brand';
  return (
    <Card className="border-l-4 border-l-transparent transition-colors hover:border-l-brand">
      <CardContent className="flex items-center gap-3 pt-6">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${badgeToneClass}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className={`text-2xl font-semibold leading-tight ${toneClass}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
