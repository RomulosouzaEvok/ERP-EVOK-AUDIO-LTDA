import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, AlertTriangle, Wallet } from 'lucide-react';

import * as financialApi from '@/api/financial';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const HORIZON_OPTIONS = [30, 60, 90] as const;
type HorizonDays = (typeof HORIZON_OPTIONS)[number];

function formatBRL(value: number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Aba "Projeção de Caixa" de `/financial` — série DIÁRIA de fluxo de caixa
 * (entradas/saídas previstas por vencimento + saldo acumulado a partir de um
 * saldo inicial informado pelo usuário), com destaque do menor saldo
 * projetado no horizonte — o dado de decisão do CFO para antecipar risco de
 * caixa negativo.
 */
export function DailyCashFlowProjectionTab() {
  const [days, setDays] = React.useState<HorizonDays>(30);
  const [openingBalanceInput, setOpeningBalanceInput] = React.useState('0');
  const openingBalance = Number(openingBalanceInput.replace(',', '.')) || 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cash-flow-daily-projection', days, openingBalance],
    queryFn: () => financialApi.getDailyCashFlowProjection({ days, opening_balance: openingBalance }),
  });

  const lowestIsNegative = (data?.summary.lowest_balance.balance ?? 0) < 0;

  return (
    <Card className="border-l-4 border-l-brand/40">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Projeção de caixa (série diária)</CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="daily-cf-opening-balance" className="text-xs text-muted-foreground">
              Saldo inicial
            </Label>
            <Input
              id="daily-cf-opening-balance"
              type="number"
              step="any"
              value={openingBalanceInput}
              onChange={(event) => setOpeningBalanceInput(event.target.value)}
              className="h-8 w-32"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="daily-cf-horizon" className="text-xs text-muted-foreground">
              Horizonte
            </Label>
            <SelectNative
              id="daily-cf-horizon"
              value={days}
              onChange={(event) => setDays(Number(event.target.value) as HorizonDays)}
              className="h-8 w-28"
            >
              {HORIZON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} dias
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando projeção diária...</p>}
        {isError && (
          <p className="text-sm text-destructive">Não foi possível carregar a projeção diária de caixa. Tente novamente.</p>
        )}

        {!isLoading && !isError && data && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Wallet className="size-7 text-brand" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saldo final projetado</p>
                    <p className={`text-lg font-semibold ${data.summary.final_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatBRL(data.summary.final_balance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className={lowestIsNegative ? 'border-destructive' : undefined}>
                <CardContent className="flex items-center gap-3 p-4">
                  {lowestIsNegative ? (
                    <AlertTriangle className="size-7 text-destructive" />
                  ) : (
                    <TrendingDown className="size-7 text-amber-500" />
                  )}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Menor saldo projetado</p>
                    <p className={`text-lg font-semibold ${lowestIsNegative ? 'text-destructive' : 'text-foreground'}`}>
                      {formatBRL(data.summary.lowest_balance.balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">em {formatDate(data.summary.lowest_balance.date)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className="size-7 text-destructive" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vencido (já deveria ter movimentado)</p>
                    <p className="text-lg font-semibold text-destructive">
                      +{formatBRL(data.overdue.receivable)} / -{formatBRL(data.overdue.payable)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {lowestIsNegative && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Atenção: o saldo projetado fica negativo em {formatDate(data.summary.lowest_balance.date)}
                {' '}({formatBRL(data.summary.lowest_balance.balance)}). Avalie antecipar recebíveis ou renegociar vencimentos antes dessa data.
              </p>
            )}

            <div className="max-h-[480px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Saldo do dia</TableHead>
                    <TableHead className="text-right">Saldo acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.series.map((point) => {
                    const isLowest = point.date === data.summary.lowest_balance.date && point.balance === data.summary.lowest_balance.balance;
                    return (
                      <TableRow key={point.date} className={isLowest ? 'bg-destructive/10' : undefined}>
                        <TableCell>
                          {formatDate(point.date)}
                          {point.day_index === 0 && <span className="ml-1 text-xs text-muted-foreground">(hoje)</span>}
                          {isLowest && <span className="ml-1 text-xs font-semibold text-destructive">menor saldo</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-success">{formatBRL(point.receivable)}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">{formatBRL(point.payable)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${point.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatBRL(point.net)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-bold ${point.balance >= 0 ? '' : 'text-destructive'}`}>
                          {formatBRL(point.balance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
