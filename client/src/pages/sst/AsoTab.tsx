import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Plus, Stethoscope } from 'lucide-react';

import * as sstApi from '@/api/sst';
import * as employeesApi from '@/api/employees';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/Textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { cn } from '@/lib/utils';
import { ASO_TIPO_LABELS, AsoResultadoBadge, formatDate, toDateInputValue } from './sstShared';

export function AsoTab() {
  const [newAsoOpen, setNewAsoOpen] = React.useState(false);
  const [tipoFilter, setTipoFilter] = React.useState<sstApi.AsoTipo | ''>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sst-aso', tipoFilter],
    queryFn: () => sstApi.listAso({ tipo: tipoFilter || undefined, limit: 50 }),
  });

  const { data: upcoming } = useQuery({
    queryKey: ['sst-aso-upcoming'],
    queryFn: sstApi.listAsoUpcoming,
  });

  const dueIn30 = upcoming?.filter((entry) => entry.dias_restantes <= 30).length ?? 0;
  const dueIn60 = upcoming?.filter((entry) => entry.dias_restantes > 30 && entry.dias_restantes <= 60).length ?? 0;
  const dueIn90 = upcoming?.filter((entry) => entry.dias_restantes > 60 && entry.dias_restantes <= 90).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500/70 transition-shadow hover:shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 30 dias</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className={cn('text-2xl font-semibold tabular-nums', dueIn30 > 0 && 'text-amber-700 dark:text-amber-400')}>
              {dueIn30}
            </p>
            <CardDescription>ASOs a vencer no próximo mês — ação prioritária</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-brand/50 transition-shadow hover:shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 60 dias</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">{dueIn60}</p>
            <CardDescription>ASOs a vencer entre 31 e 60 dias</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground/30 transition-shadow hover:shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo em 90 dias</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-semibold tabular-nums">{dueIn90}</p>
            <CardDescription>ASOs a vencer entre 61 e 90 dias</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aso-tipo-filter" className="text-sm text-muted-foreground">
            Tipo
          </Label>
          <SelectNative
            id="aso-tipo-filter"
            className="max-w-56"
            value={tipoFilter}
            onChange={(event) => setTipoFilter(event.target.value as sstApi.AsoTipo | '')}
          >
            <option value="">Todos</option>
            {Object.entries(ASO_TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>
        <Button type="button" onClick={() => setNewAsoOpen(true)}>
          <Plus className="size-4" />
          Novo ASO
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Realização</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={5} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-destructive">
                Não foi possível carregar os ASOs. Verifique se você tem acesso ao módulo SST.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((aso) => (
            <TableRow key={aso.id} className="border-l-4 border-l-transparent transition-colors hover:border-l-brand hover:bg-brand/5">
              <TableCell>{aso.employee?.name ?? `#${aso.employee_id}`}</TableCell>
              <TableCell>{ASO_TIPO_LABELS[aso.tipo] ?? aso.tipo}</TableCell>
              <TableCell>{formatDate(aso.data_realizacao)}</TableCell>
              <TableCell>
                <AsoResultadoBadge resultado={aso.resultado} />
              </TableCell>
              <TableCell>{formatDate(aso.data_vencimento)}</TableCell>
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Stethoscope className="size-8 text-muted-foreground/50" />
                  <p className="text-sm">Nenhum ASO registrado.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <NewAsoDialog open={newAsoOpen} onClose={() => setNewAsoOpen(false)} />
    </div>
  );
}

const newAsoSchema = z.object({
  employee_id: z.coerce.number().int().positive('Selecione o funcionário.'),
  tipo: z.enum(['admissional', 'periodico', 'retorno_trabalho', 'mudanca_riscos', 'demissional']),
  data_realizacao: z.string().min(1, 'Informe a data de realização.'),
  resultado: z.enum(['apto', 'inapto', 'apto_com_restricoes']),
  restricoes: z.string().optional(),
  medico_examinador: z.string().min(1, 'Informe o médico examinador.'),
  medico_coordenador_pcmso: z.string().min(1, 'Informe o médico coordenador do PCMSO.'),
  arquivo_url: z.string().optional(),
});

type NewAsoFormData = z.infer<typeof newAsoSchema>;

function NewAsoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees-active-select'],
    queryFn: () => employeesApi.listEmployees({ limit: 200, status: 'active' }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewAsoFormData>({
    resolver: zodResolver(newAsoSchema),
    defaultValues: { tipo: 'periodico', resultado: 'apto', data_realizacao: toDateInputValue() },
  });

  const resultado = watch('resultado');

  const mutation = useMutation({
    mutationFn: (values: NewAsoFormData) =>
      sstApi.createAso({
        ...values,
        restricoes: values.restricoes?.trim() || null,
        arquivo_url: values.arquivo_url?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sst-aso'] });
      queryClient.invalidateQueries({ queryKey: ['sst-aso-upcoming'] });
      reset({ tipo: 'periodico', resultado: 'apto', data_realizacao: toDateInputValue() } as never);
      setFormError(null);
      onClose();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível registrar o ASO')),
  });

  React.useEffect(() => {
    if (open) {
      reset({ tipo: 'periodico', resultado: 'apto', data_realizacao: toDateInputValue() } as never);
      setFormError(null);
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar ASO</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aso-employee">Funcionário</Label>
            <SelectNative id="aso-employee" {...register('employee_id')}>
              <option value="">Selecione...</option>
              {(employees?.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aso-tipo">Tipo</Label>
              <SelectNative id="aso-tipo" {...register('tipo')}>
                {Object.entries(ASO_TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aso-data">Data de realização</Label>
              <Input id="aso-data" type="date" {...register('data_realizacao')} />
              {errors.data_realizacao && <p className="text-sm text-destructive">{errors.data_realizacao.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aso-resultado">Resultado</Label>
            <SelectNative id="aso-resultado" {...register('resultado')}>
              <option value="apto">Apto</option>
              <option value="inapto">Inapto</option>
              <option value="apto_com_restricoes">Apto com restrições</option>
            </SelectNative>
          </div>
          {(resultado === 'apto_com_restricoes' || resultado === 'inapto') && (
            <AmberNoticeBox
              icon={AlertTriangle}
              size="xs"
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
            >
              Este resultado bloqueia automaticamente o apontamento do funcionário na função de origem até novo ASO apto, e
              notifica SST/RH/liderança.
            </AmberNoticeBox>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aso-restricoes">Restrições (se houver)</Label>
            <Textarea id="aso-restricoes" rows={2} {...register('restricoes')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aso-medico-examinador">Médico examinador</Label>
              <Input id="aso-medico-examinador" placeholder="Nome - CRM" {...register('medico_examinador')} />
              {errors.medico_examinador && <p className="text-sm text-destructive">{errors.medico_examinador.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aso-medico-coordenador">Médico coordenador PCMSO</Label>
              <Input id="aso-medico-coordenador" placeholder="Nome - CRM" {...register('medico_coordenador_pcmso')} />
              {errors.medico_coordenador_pcmso && (
                <p className="text-sm text-destructive">{errors.medico_coordenador_pcmso.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aso-arquivo">URL do arquivo (laudo/PDF)</Label>
            <Input id="aso-arquivo" placeholder="https://..." {...register('arquivo_url')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Registrar ASO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
