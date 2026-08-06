import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, CheckCircle2, XCircle, Undo2 } from 'lucide-react';

import * as financialApi from '@/api/financial';
import { extractApiErrorMessage } from '@/api/httpClient';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { DidacticAlert } from '@/components/DidacticAlert';

function formatBRL(value: number | string): string {
  return `R$ ${Number(value).toFixed(2)}`;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

const STATUS_VARIANT: Record<financialApi.BankStatementEntryStatus, 'secondary' | 'success' | 'default'> = {
  pending: 'secondary',
  matched: 'success',
  ignored: 'default',
};

const STATUS_LABEL: Record<financialApi.BankStatementEntryStatus, string> = {
  pending: 'Pendente',
  matched: 'Conciliado',
  ignored: 'Ignorado',
};

/**
 * Aba "Conciliação" de `/financial` — Conciliação Bancária v1 (importação
 * OFX): upload do extrato, lista de extratos importados, lançamentos com
 * status colorido, painel de sugestões automáticas de match (nunca
 * vincula sozinho — sempre exige confirmação humana) e ações de
 * ignorar/desfazer.
 *
 * CNAB fica fora desta v1 (registrado como etapa futura em
 * `docs/governance/TODO.md`).
 */
export function ReconciliationTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = React.useState<DidacticError | null>(null);
  const [selectedStatementId, setSelectedStatementId] = React.useState<number | null>(null);
  const [entryStatusFilter, setEntryStatusFilter] = React.useState<financialApi.BankStatementEntryStatus | undefined>(undefined);

  const { data: statements, isLoading: loadingStatements, isError: errorStatements } = useQuery({
    queryKey: ['bank-statements'],
    queryFn: () => financialApi.listBankStatements({ limit: 50 }),
  });

  const importMutation = useMutation({
    mutationFn: financialApi.importBankStatement,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      setSelectedStatementId(result.statement.id);
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => setUploadError(translateApiError(error, 'Não foi possível importar o extrato OFX')),
  });

  const activeStatementId = selectedStatementId ?? statements?.data[0]?.id ?? null;

  const { data: entries, isLoading: loadingEntries, isError: errorEntries } = useQuery({
    queryKey: ['bank-statement-entries', activeStatementId, entryStatusFilter],
    queryFn: () => financialApi.listBankStatementEntries(activeStatementId as number, entryStatusFilter),
    enabled: activeStatementId !== null,
  });

  const { data: suggestionGroups, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['bank-statement-suggestions', activeStatementId],
    queryFn: () => financialApi.getReconciliationSuggestions(activeStatementId as number),
    enabled: activeStatementId !== null,
  });

  const suggestionsByEntryId = React.useMemo(() => {
    const map = new Map<number, financialApi.MatchSuggestionCandidate[]>();
    suggestionGroups?.forEach((group) => map.set(group.entry.id, group.suggestions));
    return map;
  }, [suggestionGroups]);

  const invalidateEntryQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['bank-statement-entries', activeStatementId] });
    queryClient.invalidateQueries({ queryKey: ['bank-statement-suggestions', activeStatementId] });
  };

  const matchMutation = useMutation({
    mutationFn: ({ entryId, candidate }: { entryId: number; candidate: financialApi.MatchSuggestionCandidate }) =>
      financialApi.matchBankStatementEntry(entryId, candidate.type === 'payable' ? { payableId: candidate.id } : { receivableId: candidate.id }),
    onSuccess: invalidateEntryQueries,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível conciliar o lançamento.')),
  });

  const ignoreMutation = useMutation({
    mutationFn: (entryId: number) => financialApi.ignoreBankStatementEntry(entryId),
    onSuccess: invalidateEntryQueries,
    onError: () => window.alert('Não foi possível ignorar o lançamento.'),
  });

  const unmatchMutation = useMutation({
    mutationFn: (entryId: number) => financialApi.unmatchBankStatementEntry(entryId),
    onSuccess: invalidateEntryQueries,
    onError: (error) => window.alert(extractApiErrorMessage(error, 'Não foi possível desfazer a conciliação.')),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-l-4 border-l-brand/40">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Extratos importados (OFX)</CardTitle>
          {canWrite && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importMutation.mutate(file);
                }}
              />
              <Button size="sm" disabled={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
                <Upload /> {importMutation.isPending ? 'Importando...' : 'Importar extrato .ofx'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {uploadError && <DidacticAlert error={uploadError} />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStatements && <TableSkeletonRows columns={5} />}
              {errorStatements && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Não foi possível carregar os extratos importados. Tente novamente.
                  </TableCell>
                </TableRow>
              )}
              {statements?.data.map((statement) => (
                <TableRow key={statement.id} className={statement.id === activeStatementId ? 'bg-brand/5' : undefined}>
                  <TableCell>{statement.filename}</TableCell>
                  <TableCell>{statement.bank_name ?? '—'}</TableCell>
                  <TableCell>{statement.account_number ?? '—'}</TableCell>
                  <TableCell>
                    {statement.period_start && statement.period_end
                      ? `${formatDate(statement.period_start)} – ${formatDate(statement.period_end)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={statement.id === activeStatementId ? 'default' : 'outline'}
                      onClick={() => setSelectedStatementId(statement.id)}
                    >
                      Ver lançamentos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loadingStatements && !errorStatements && statements?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum extrato importado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeStatementId !== null && (
        <Card className="border-l-4 border-l-brand/40">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Lançamentos do extrato</CardTitle>
            <div className="flex gap-1">
              {(['pending', 'matched', 'ignored'] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={entryStatusFilter === status ? 'default' : 'outline'}
                  onClick={() => setEntryStatusFilter(entryStatusFilter === status ? undefined : status)}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sugestões de conciliação</TableHead>
                  {canWrite && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loadingEntries || loadingSuggestions) && <TableSkeletonRows columns={canWrite ? 6 : 5} />}
                {errorEntries && (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-destructive">
                      Não foi possível carregar os lançamentos. Tente novamente.
                    </TableCell>
                  </TableRow>
                )}
                {entries?.map((entry) => {
                  const amount = Number(entry.amount);
                  const suggestions = suggestionsByEntryId.get(entry.id) ?? [];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.entry_date)}</TableCell>
                      <TableCell className="max-w-64 truncate" title={entry.description ?? undefined}>
                        {entry.description || '—'}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${amount < 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatBRL(amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.status === 'pending' && suggestions.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {suggestions.slice(0, 3).map((candidate) => (
                              <div key={`${candidate.type}-${candidate.id}`} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  {candidate.type === 'payable' ? 'Pagar' : 'Receber'} #{candidate.id} — {formatBRL(candidate.remaining_amount)}
                                  {' '}(venc. {formatDate(candidate.due_date)}, {candidate.date_diff_days}d)
                                </span>
                                {canWrite && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-xs"
                                    disabled={matchMutation.isPending}
                                    onClick={() => matchMutation.mutate({ entryId: entry.id, candidate })}
                                  >
                                    Conciliar
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {entry.status === 'pending' && suggestions.length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem candidato automático</span>
                        )}
                        {entry.status === 'matched' && (
                          <span className="text-xs text-muted-foreground">
                            {entry.matched_payable_id ? `Conta a pagar #${entry.matched_payable_id}` : `Conta a receber #${entry.matched_receivable_id}`}
                          </span>
                        )}
                      </TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex gap-1">
                            {entry.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={ignoreMutation.isPending}
                                onClick={() => ignoreMutation.mutate(entry.id)}
                                title="Ignorar (nada a conciliar)"
                              >
                                <XCircle className="size-4" />
                              </Button>
                            )}
                            {entry.status === 'matched' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={unmatchMutation.isPending}
                                onClick={() => unmatchMutation.mutate(entry.id)}
                                title="Desfazer conciliação"
                              >
                                <Undo2 className="size-4" />
                              </Button>
                            )}
                            {entry.status === 'matched' && <CheckCircle2 className="size-4 self-center text-success" />}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {!loadingEntries && !errorEntries && entries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground">
                      Nenhum lançamento para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
