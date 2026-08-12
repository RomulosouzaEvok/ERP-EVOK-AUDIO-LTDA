import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, CheckCircle2, Eye } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { FileUploadDialog } from '@/components/hr/FileUploadDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';

const STATUS_LABEL: Record<hrApi.TimeImportBatchStatus, string> = {
  uploaded: 'Recebido',
  validated: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  rejected: 'Rejeitado (erro estrutural)',
};

const STATUS_BADGE_VARIANT: Record<hrApi.TimeImportBatchStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  uploaded: 'default',
  validated: 'warning',
  confirmed: 'success',
  rejected: 'destructive',
};

function currentCompetence(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Aba "Frequência" de `/hr` — Grupo 10 RH (importação do AEJ, Arquivo
 * Eletrônico de Jornada, exportado pela administradora dos REPs RWTech/
 * Pointline). O ERP não trata ponto — só importa o resultado já tratado
 * (`docs/rh/04-FREQUENCIA.md`).
 *
 * Fluxo: upload do arquivo → relatório de não-casados (matrícula/CPF do
 * AEJ sem funcionário correspondente) → confirmação manual pelo RH →
 * resumo mensal por funcionário (cruzado com afastamentos).
 */
export function AttendanceTab() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<hrApi.TimeImportBatchStatus | ''>('');
  const [competenciaFilter, setCompetenciaFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [detailBatchId, setDetailBatchId] = React.useState<number | null>(null);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-time-imports', statusFilter, competenciaFilter, page],
    queryFn: () =>
      hrApi.listTimeImportBatches({
        status: statusFilter || undefined,
        competencia: competenciaFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hr-time-imports'] });

  const confirmMutation = useMutation({
    mutationFn: hrApi.confirmTimeImportBatch,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['hr-time-import-detail'] });
    },
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível confirmar o lote de ponto')),
  });

  const colSpan = canWrite ? 8 : 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-brand/30 bg-brand/5 p-3 text-sm text-muted-foreground">
        A Evok Áudio possui os relógios de ponto (RWTech/Pointline), mas quem trata a jornada é a
        administradora externa. Esta tela só <strong>importa</strong> o AEJ (Arquivo Eletrônico de Jornada) já
        tratado por ela — nenhuma marcação bruta é processada aqui.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time-import-status-filter">Status</Label>
            <SelectNative
              id="time-import-status-filter"
              className="w-56"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as hrApi.TimeImportBatchStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time-import-competencia-filter">Competência</Label>
            <Input
              id="time-import-competencia-filter"
              type="month"
              className="w-40"
              value={competenciaFilter}
              onChange={(event) => {
                setCompetenciaFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setSummaryOpen(true)}>
            <Eye className="size-4" /> Resumo mensal
          </Button>
          {canWrite && (
            <Button type="button" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" /> Importar AEJ
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Competência</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Casados / Não-casados / Rejeitados</TableHead>
            <TableHead>Importado por</TableHead>
            <TableHead>Importado em</TableHead>
            <TableHead>Confirmado em</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os lotes de ponto. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.filename}</TableCell>
              <TableCell>
                {formatDate(batch.competencia_inicio)} a {formatDate(batch.competencia_fim)}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE_VARIANT[batch.status]}>{STATUS_LABEL[batch.status]}</Badge>
              </TableCell>
              <TableCell>
                {batch.matched_count} / {batch.unmatched_count} / {batch.rejected_count}
              </TableCell>
              <TableCell>{batch.importedBy?.name ?? `#${batch.imported_by}`}</TableCell>
              <TableCell>{formatDateTime(batch.imported_at)}</TableCell>
              <TableCell>{batch.confirmed_at ? formatDateTime(batch.confirmed_at) : '-'}</TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setDetailBatchId(batch.id)}>
                    <Eye className="size-4" /> Detalhe
                  </Button>
                  {batch.status === 'validated' && (
                    <Button
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        confirmMutation.mutate(batch.id);
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Confirmar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum lote de ponto importado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {actionError && <DidacticAlert error={actionError} />}

      <UploadTimeImportDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <TimeImportDetailDialog batchId={detailBatchId} onClose={() => setDetailBatchId(null)} />
      <MonthlyAttendanceSummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}

function UploadTimeImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [competenciaInicio, setCompetenciaInicio] = React.useState('');
  const [competenciaFim, setCompetenciaFim] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [resultNotice, setResultNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setCompetenciaInicio('');
      setCompetenciaFim('');
      setError(null);
      setResultNotice(null);
    }
  }, [open]);

  const handleSubmit = async (file: File | null) => {
    if (!file) return;
    if (!competenciaInicio || !competenciaFim) {
      setError({ title: 'Informe o período de competência', reasons: ['Início e fim da competência são obrigatórios.'] });
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const result = await hrApi.createTimeImportBatch({
        competencia_inicio: competenciaInicio,
        competencia_fim: competenciaFim,
        file,
      });
      queryClient.invalidateQueries({ queryKey: ['hr-time-imports'] });
      if (result.batch.status === 'rejected') {
        setResultNotice(
          `Lote rejeitado: ${result.batch.rejection_reason ?? 'nenhum registro de jornada reconhecido no arquivo.'}`,
        );
        return;
      }
      setResultNotice(
        `Importado: ${result.matched_count} linha(s) casada(s) por CPF, ${result.unmatched_count} não-casada(s) `
        + `(sem funcionário correspondente) e ${result.rejected_count} linha(s) rejeitada(s) por formato inválido. `
        + 'Revise o detalhe do lote antes de confirmar.',
      );
    } catch (err) {
      setError(translateApiError(err, 'Não foi possível importar o arquivo de ponto'));
    } finally {
      setIsPending(false);
    }
  };

  if (resultNotice) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importação processada</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-amber-700/40 bg-amber-700/10 p-3 text-sm text-amber-900">
            {resultNotice}
          </div>
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <FileUploadDialog
      open={open}
      title="Importar AEJ (ponto eletrônico)"
      description="Arquivo texto exportado pela administradora dos REPs (RWTech/Pointline) — jornada já tratada (extras, faltas, abonos)."
      accept=".txt,.aej,.rem"
      fileRequired
      error={error}
      isPending={isPending}
      submitLabel="Importar"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time-import-competencia-inicio">Competência (início) *</Label>
          <Input
            id="time-import-competencia-inicio"
            type="date"
            value={competenciaInicio}
            onChange={(event) => setCompetenciaInicio(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time-import-competencia-fim">Competência (fim) *</Label>
          <Input
            id="time-import-competencia-fim"
            type="date"
            value={competenciaFim}
            onChange={(event) => setCompetenciaFim(event.target.value)}
          />
        </div>
      </div>
    </FileUploadDialog>
  );
}

function TimeImportDetailDialog({ batchId, onClose }: { batchId: number | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['hr-time-import-detail', batchId],
    queryFn: () => hrApi.getTimeImportBatch(batchId as number),
    enabled: batchId !== null,
  });

  return (
    <Dialog open={batchId !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhe do lote de ponto</DialogTitle>
          {data?.batch && (
            <DialogDescription>
              {data.batch.filename} — {STATUS_LABEL[data.batch.status]}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {data && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {data.unmatched.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-700/40 bg-amber-700/10 p-3">
                <p className="text-sm font-semibold text-amber-900">
                  {data.unmatched.length} linha(s) não-casada(s) — matrícula/CPF sem funcionário correspondente
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula (arquivo)</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.unmatched.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.original_registration ?? '-'}</TableCell>
                        <TableCell>{item.cpf ?? '-'}</TableCell>
                        <TableCell>{formatDate(item.work_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-amber-900">
                  Cadastre o funcionário, corrija o CPF no arquivo original ou confirme mesmo assim — linhas
                  não-casadas não entram no resumo mensal.
                </p>
              </div>
            )}

            {(data.batch.rejected_lines?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm font-semibold text-destructive">
                  {data.batch.rejected_lines?.length} linha(s) rejeitada(s) (formato inválido)
                </p>
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {data.batch.rejected_lines?.map((rejected) => (
                    <li key={rejected.line}>
                      Linha {rejected.line}: {rejected.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">Linhas importadas ({data.batch.items?.length ?? 0})</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Trabalhadas</TableHead>
                    <TableHead>HE 50%</TableHead>
                    <TableHead>HE 100%</TableHead>
                    <TableHead>Noturno</TableHead>
                    <TableHead>Falta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.batch.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.employee?.name ?? <span className="italic text-amber-700">não-casado</span>}</TableCell>
                      <TableCell>{formatDate(item.work_date)}</TableCell>
                      <TableCell>{item.hours_worked}</TableCell>
                      <TableCell>{item.overtime_50}</TableCell>
                      <TableCell>{item.overtime_100}</TableCell>
                      <TableCell>{item.night_hours}</TableCell>
                      <TableCell>
                        {item.absence ? (
                          <Badge variant={item.absence_justified ? 'warning' : 'destructive'}>
                            {item.absence_justified ? `Abonada (${item.absence_reason ?? '-'})` : 'Não abonada'}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MonthlyAttendanceSummaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [competencia, setCompetencia] = React.useState(currentCompetence());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-attendance-monthly-summary', competencia],
    queryFn: () => hrApi.getMonthlyAttendanceSummary({ competencia }),
    enabled: open && Boolean(competencia),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resumo mensal de frequência</DialogTitle>
          <DialogDescription>
            Soma dos lotes de ponto CONFIRMADOS da competência, cruzada com afastamentos (`hr_absences`) que se
            sobrepõem ao mês.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendance-summary-competencia">Competência</Label>
          <Input
            id="attendance-summary-competencia"
            type="month"
            className="w-40"
            value={competencia}
            onChange={(event) => setCompetenciaSafe(event.target.value, setCompetencia)}
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Trabalhadas</TableHead>
                <TableHead>HE 50%</TableHead>
                <TableHead>HE 100%</TableHead>
                <TableHead>Noturno</TableHead>
                <TableHead>Faltas (importadas)</TableHead>
                <TableHead>Dias de afastamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows columns={7} />}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Não foi possível carregar o resumo mensal.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((row) => (
                <TableRow key={row.employee_id}>
                  <TableCell className="font-medium">{row.employee_name}</TableCell>
                  <TableCell>{row.hours_worked}h</TableCell>
                  <TableCell>{row.overtime_50}h</TableCell>
                  <TableCell>{row.overtime_100}h</TableCell>
                  <TableCell>{row.night_hours}h</TableCell>
                  <TableCell>
                    {row.absences_from_import} ({row.absences_justified} abonada{row.absences_justified === 1 ? '' : 's'})
                  </TableCell>
                  <TableCell>{row.absence_days_from_hr_absences}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum lote confirmado nesta competência.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** `<input type="month">` só dispara `onChange` com valor válido (`YYYY-MM`) ou vazio — nunca parcial. */
function setCompetenciaSafe(value: string, setter: (value: string) => void): void {
  if (value) setter(value);
}
