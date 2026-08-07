import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Plus, XCircle } from 'lucide-react';

import * as tiApi from '@/api/ti';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, toDateTimeInputValue } from './tiShared';

/** Backup e Continuidade (P5) — `/ti`, aba "Backup". */
export function BackupTab() {
  const [newLogOpen, setNewLogOpen] = React.useState(false);

  const { data: health } = useQuery({ queryKey: ['ti-backup-health'], queryFn: tiApi.getBackupHealth });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ti-backup-logs'],
    queryFn: () => tiApi.listBackupLogs({ limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      {health?.daily_alert && (
        <AmberNoticeBox icon={AlertTriangle}>
          <p className="font-semibold">Sem backup diário bem-sucedido há mais de 26h</p>
          <p className="text-xs">Último backup diário: {formatDateTime(health.last_daily_success_at)}</p>
        </AmberNoticeBox>
      )}
      {health?.restore_test_alert && (
        <AmberNoticeBox icon={AlertTriangle}>
          <p className="font-semibold">Teste de restore atrasado</p>
          <p className="text-xs">
            Último teste de restore: {formatDateTime(health.last_restore_test_at)} ({health.days_since_last_restore_test ?? '?'} dias atrás)
          </p>
        </AmberNoticeBox>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseBackup className="size-4" />
              Backup diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health?.daily_alert ? (
              <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                <XCircle className="size-4" /> Fora do prazo ({health.hours_since_last_daily ?? '?'}h desde o último)
              </p>
            ) : (
              <p className="flex items-center gap-1 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" /> Em dia
              </p>
            )}
            <p className="text-xs text-muted-foreground">Último sucesso: {formatDateTime(health?.last_daily_success_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teste de restore</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{health?.days_since_last_restore_test ?? '?'} dias desde o último teste</p>
            <p className="text-xs text-muted-foreground">Último teste: {formatDateTime(health?.last_restore_test_at)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setNewLogOpen(true)}>
          <Plus className="size-4" />
          Registrar backup/teste
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Execução</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Alvo</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-destructive">
                Não foi possível carregar o histórico de backup.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((log) => (
            <TableRow key={log.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{formatDateTime(log.executed_at)}</TableCell>
              <TableCell>{log.backup_type}</TableCell>
              <TableCell>{log.target}</TableCell>
              <TableCell className="font-mono text-xs">{log.destination}</TableCell>
              <TableCell>
                {log.success ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 className="size-3.5" /> Sucesso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive" title={log.error_message ?? undefined}>
                    <XCircle className="size-3.5" /> Falha{log.generated_ticket_id ? ` (chamado #${log.generated_ticket_id})` : ''}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <DatabaseBackup className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum registro de backup encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewBackupLogDialog open={newLogOpen} onClose={() => setNewLogOpen(false)} />
    </div>
  );
}

const newLogSchema = z.object({
  executed_at: z.string().min(1, 'Informe a data/hora da execução.'),
  backup_type: z.enum(['daily', 'weekly', 'monthly', 'restore_test']),
  target: z.enum(['database', 'uploads']),
  destination: z.string().min(1, 'Informe o destino.'),
  size_bytes: z.union([z.coerce.number().nonnegative(), z.literal('')]).optional(),
  success: z.enum(['true', 'false']),
  error_message: z.string().optional(),
  notes: z.string().optional(),
});

type NewLogFormData = z.infer<typeof newLogSchema>;

function NewBackupLogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [generatedTicketId, setGeneratedTicketId] = React.useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewLogFormData>({
    resolver: zodResolver(newLogSchema),
    defaultValues: { executed_at: toDateTimeInputValue(), backup_type: 'daily', target: 'database', success: 'true' },
  });

  const success = watch('success');

  const mutation = useMutation({
    mutationFn: (values: NewLogFormData) =>
      tiApi.createBackupLog({
        executed_at: new Date(values.executed_at).toISOString(),
        backup_type: values.backup_type,
        target: values.target,
        destination: values.destination,
        size_bytes: values.size_bytes ? Number(values.size_bytes) : undefined,
        success: values.success === 'true',
        error_message: values.success === 'false' ? values.error_message || null : null,
        notes: values.notes || null,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ti-backup-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ti-backup-health'] });
      setGeneratedTicketId(data.generated_ticket_id ?? null);
      setFormError(null);
      if (!data.generated_ticket_id) {
        reset({ executed_at: toDateTimeInputValue(), backup_type: 'daily', target: 'database', success: 'true' } as never);
        onClose();
      }
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o backup')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ executed_at: toDateTimeInputValue(), backup_type: 'daily', target: 'database', success: 'true' } as never);
      setFormError(null);
      setGeneratedTicketId(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar execução de backup</DialogTitle>
        </DialogHeader>
        {generatedTicketId != null ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              Backup registrado como falha — chamado urgente #{generatedTicketId} aberto automaticamente na categoria &quot;Sistema ERP&quot;.
            </p>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backup-executed-at">Data/hora da execução</Label>
                <Input id="backup-executed-at" type="datetime-local" {...register('executed_at')} />
                {errors.executed_at && <p className="text-sm text-destructive">{errors.executed_at.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backup-type">Tipo</Label>
                <SelectNative id="backup-type" {...register('backup_type')}>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="restore_test">Teste de restore</option>
                </SelectNative>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backup-target">Alvo</Label>
                <SelectNative id="backup-target" {...register('target')}>
                  <option value="database">Banco de dados</option>
                  <option value="uploads">Uploads</option>
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backup-size">Tamanho (bytes)</Label>
                <Input id="backup-size" type="number" {...register('size_bytes')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="backup-destination">Destino</Label>
              <Input id="backup-destination" placeholder="Ex.: s3://evok-backups/db/2026-08-07.dump" {...register('destination')} />
              {errors.destination && <p className="text-sm text-destructive">{errors.destination.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="backup-success">Resultado</Label>
              <SelectNative id="backup-success" {...register('success')}>
                <option value="true">Sucesso</option>
                <option value="false">Falha</option>
              </SelectNative>
            </div>
            {success === 'false' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backup-error">Mensagem de erro</Label>
                <Textarea id="backup-error" rows={2} {...register('error_message')} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="backup-notes">Observações</Label>
              <Textarea id="backup-notes" rows={2} {...register('notes')} />
            </div>
            {formError && <DidacticAlert error={formError} />}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
