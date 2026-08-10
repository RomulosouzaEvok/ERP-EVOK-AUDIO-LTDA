import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDown, ArrowUp, CornerDownRight, Hash, Info, Plus, Save, Trash2 } from 'lucide-react';

import type { ProductionRouteDetail, ProductionRouteStepInput } from '@/api/productionRoutes';
import type { WorkCenter } from '@/api/workCenters';
import type { DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { DidacticAlert } from '@/components/DidacticAlert';
import { formatMinutes, toNumber } from './productionRouteShared';

/**
 * Editor das operações de um roteiro em rascunho (gap G5).
 *
 * Decisão central de UX: **o usuário nunca digita a sequência**. O ordinal
 * (1..N contíguo, exigência do backend porque é por ele que o apontamento casa
 * com a etapa) é derivado da posição na lista e recalculado a cada
 * reordenação. O número que o chão de fábrica conhece (10, 20, 30...) vai no
 * campo "código da operação", que é texto livre — assim inserir uma operação
 * no meio é arrastar/mover, não renumerar planilha na mão.
 */

const NUMBER_REQUIRED = 'Informe um número (use 0 quando não houver).';

const stepSchema = z.object({
  step_code: z
    .string()
    .trim()
    .min(1, 'Informe o código da operação (ex.: 20).')
    .max(50, 'Máximo de 50 caracteres.'),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da operação.')
    .max(120, 'Máximo de 120 caracteres.'),
  /** `''` = etapa sem centro de trabalho (permitido pelo backend). */
  work_center_id: z.string(),
  standard_time_minutes: z
    .number({ invalid_type_error: NUMBER_REQUIRED })
    .min(0, 'O tempo não pode ser negativo.')
    .max(99999999, 'Tempo acima do limite aceito.'),
  setup_time_minutes: z
    .number({ invalid_type_error: NUMBER_REQUIRED })
    .min(0, 'O tempo não pode ser negativo.')
    .max(99999999, 'Tempo acima do limite aceito.'),
  instructions: z.string().max(5000, 'Máximo de 5000 caracteres.'),
  quality_check_required: z.boolean(),
});

const stepsFormSchema = z
  .object({ steps: z.array(stepSchema) })
  .superRefine((values, ctx) => {
    // Mesma regra do backend (`G5-STEP-CODE-DUP`), antecipada aqui para o
    // usuário ver o erro na linha certa em vez de num alerta genérico.
    const seen = new Map<string, number>();
    values.steps.forEach((step, index) => {
      const code = step.step_code.trim().toUpperCase();
      if (!code) return;
      const first = seen.get(code);
      if (first !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index, 'step_code'],
          message: `Código repetido: já usado na etapa ${first + 1}.`,
        });
      } else {
        seen.set(code, index);
      }
    });
  });

type StepsFormInput = z.input<typeof stepsFormSchema>;
type StepsFormData = z.output<typeof stepsFormSchema>;
type StepRow = StepsFormInput['steps'][number];

const BLANK_STEP: StepRow = {
  step_code: '',
  name: '',
  work_center_id: '',
  standard_time_minutes: 0,
  setup_time_minutes: 0,
  instructions: '',
  quality_check_required: false,
};

/** Converte as etapas persistidas para o formato do formulário. */
function toFormSteps(route: ProductionRouteDetail | null): StepRow[] {
  return (route?.steps ?? []).map((step) => ({
    step_code: step.step_code,
    name: step.name,
    work_center_id: step.work_center_id === null || step.work_center_id === undefined ? '' : String(step.work_center_id),
    standard_time_minutes: toNumber(step.standard_time_minutes),
    setup_time_minutes: toNumber(step.setup_time_minutes),
    instructions: step.instructions ?? '',
    quality_check_required: Boolean(step.quality_check_required),
  }));
}

/** Tabela somente-leitura das operações (roteiro liberado/aposentado/substituído). */
export function RouteStepsTable({ route }: { route: ProductionRouteDetail }) {
  if (route.steps.length === 0) {
    return <p className="text-sm text-muted-foreground">Este roteiro não tem nenhuma operação cadastrada.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead className="w-24">Código</TableHead>
          <TableHead>Operação</TableHead>
          <TableHead>Centro de trabalho</TableHead>
          <TableHead className="text-right">Tempo padrão</TableHead>
          <TableHead className="text-right">Setup</TableHead>
          <TableHead>Qualidade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {route.steps.map((step) => (
          <TableRow key={step.id} className="hover:bg-accent/50">
            <TableCell className="font-medium tabular-nums">{step.sequence}</TableCell>
            <TableCell className="font-mono text-xs">{step.step_code}</TableCell>
            <TableCell>
              <p className="font-medium">{step.name}</p>
              {step.instructions && <p className="mt-0.5 text-xs text-muted-foreground">{step.instructions}</p>}
            </TableCell>
            <TableCell className="text-sm">
              {step.workCenter ? (
                <span className={step.workCenter.active ? '' : 'text-destructive'}>
                  {step.workCenter.code} — {step.workCenter.name}
                  {!step.workCenter.active && ' (desativado)'}
                </span>
              ) : (
                <span className="text-muted-foreground">Sem centro definido</span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMinutes(step.standard_time_minutes)}/un</TableCell>
            <TableCell className="text-right tabular-nums">{formatMinutes(step.setup_time_minutes)}/lote</TableCell>
            <TableCell>
              {step.quality_check_required ? <Badge variant="secondary">Inspeção</Badge> : <span className="text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Editor de etapas de um roteiro em rascunho — substituição total ao salvar. */
export function RouteStepsEditor({
  route,
  workCenters,
  onSave,
  isSaving,
  saveError,
  onDirtyChange,
}: {
  route: ProductionRouteDetail;
  workCenters: WorkCenter[];
  onSave: (steps: ProductionRouteStepInput[]) => void;
  isSaving: boolean;
  saveError: DidacticError | null;
  /** Avisa a página quando há alteração não salva (usada no checklist de liberação). */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StepsFormInput, unknown, StepsFormData>({
    resolver: zodResolver(stepsFormSchema),
    defaultValues: { steps: toFormSteps(route) },
  });

  const { fields, append, insert, remove, move } = useFieldArray({ control, name: 'steps' });

  // Recarrega o formulário sempre que o roteiro exibido muda (troca de
  // seleção na lista, criação de revisão, ou salvamento bem-sucedido).
  React.useEffect(() => {
    reset({ steps: toFormSteps(route) });
  }, [route, reset]);

  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const watchedSteps = watch('steps');
  const workCenterById = React.useMemo(
    () => new Map(workCenters.map((center) => [String(center.id), center])),
    [workCenters],
  );

  const totals = React.useMemo(() => {
    const list = watchedSteps ?? [];
    const standard = list.reduce((sum, step) => sum + toNumber(step?.standard_time_minutes), 0);
    const setup = list.reduce((sum, step) => sum + toNumber(step?.setup_time_minutes), 0);
    return { standard, setup };
  }, [watchedSteps]);

  /** Preenche com 10, 20, 30... apenas os códigos ainda em branco (prática de chão de fábrica). */
  function fillEmptyCodes() {
    const current = getValues('steps') ?? [];
    current.forEach((step, index) => {
      if (!String(step?.step_code ?? '').trim()) {
        setValue(`steps.${index}.step_code`, String((index + 1) * 10), { shouldDirty: true });
      }
    });
  }

  function submit(values: StepsFormData) {
    onSave(
      values.steps.map((step, index) => ({
        // Ordinal derivado da posição: é isto que torna o "inserir no meio"
        // indolor e impede por construção os erros G5-SEQ-GAP / G5-SEQ-DUP.
        sequence: index + 1,
        step_code: step.step_code.trim(),
        name: step.name.trim(),
        work_center_id: step.work_center_id === '' ? null : Number(step.work_center_id),
        standard_time_minutes: step.standard_time_minutes,
        setup_time_minutes: step.setup_time_minutes,
        instructions: step.instructions.trim() === '' ? null : step.instructions.trim(),
        quality_check_required: step.quality_check_required,
        is_active: true,
      })),
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit(submit)} noValidate>
      <AmberNoticeBox icon={Info} size="xs">
        A <strong>ordem</strong> das operações (1, 2, 3...) é dada pela posição na lista — use as setas ↑ ↓ para mover e o
        botão <strong>Inserir abaixo</strong> para encaixar uma operação no meio; a numeração se refaz sozinha. O número que a
        fábrica conhece (10, 20, 30...) vai em <strong>Código da operação</strong>, que é texto livre.
      </AmberNoticeBox>

      {fields.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhuma operação neste rascunho ainda. Adicione a primeira para poder liberar o roteiro.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const stepErrors = errors.steps?.[index];
          const selectedId = watchedSteps?.[index]?.work_center_id ?? '';
          const selectedCenter = selectedId === '' ? undefined : workCenterById.get(String(selectedId));
          const centerIsInactive = Boolean(selectedCenter && !selectedCenter.active);

          return (
            <div key={field.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Mover para cima"
                      aria-label={`Mover operação ${index + 1} para cima`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Mover para baixo"
                      aria-label={`Mover operação ${index + 1} para baixo`}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="grid gap-3 md:grid-cols-[7rem_1fr_14rem]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`step-code-${field.id}`} className="text-xs">
                        Código da operação
                      </Label>
                      <Input
                        id={`step-code-${field.id}`}
                        placeholder="10"
                        className="font-mono"
                        {...register(`steps.${index}.step_code`)}
                      />
                      {stepErrors?.step_code && (
                        <p className="text-xs text-destructive">{stepErrors.step_code.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`step-name-${field.id}`} className="text-xs">
                        Operação
                      </Label>
                      <Input
                        id={`step-name-${field.id}`}
                        placeholder="Ex.: Bobinar voice coil"
                        {...register(`steps.${index}.name`)}
                      />
                      {stepErrors?.name && <p className="text-xs text-destructive">{stepErrors.name.message}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`step-wc-${field.id}`} className="text-xs">
                        Centro de trabalho (opcional)
                      </Label>
                      <SelectNative id={`step-wc-${field.id}`} {...register(`steps.${index}.work_center_id`)}>
                        <option value="">Sem centro definido</option>
                        {workCenters.map((center) => (
                          <option key={String(center.id)} value={String(center.id)}>
                            {center.code} — {center.name}
                            {center.active ? '' : ' (desativado)'}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[10rem_10rem_1fr_auto]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`step-std-${field.id}`} className="text-xs">
                        Tempo padrão (min/peça)
                      </Label>
                      <Input
                        id={`step-std-${field.id}`}
                        type="number"
                        step="any"
                        min="0"
                        className="tabular-nums"
                        {...register(`steps.${index}.standard_time_minutes`, { valueAsNumber: true })}
                      />
                      {stepErrors?.standard_time_minutes && (
                        <p className="text-xs text-destructive">{stepErrors.standard_time_minutes.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`step-setup-${field.id}`} className="text-xs">
                        Setup (min/lote)
                      </Label>
                      <Input
                        id={`step-setup-${field.id}`}
                        type="number"
                        step="any"
                        min="0"
                        className="tabular-nums"
                        {...register(`steps.${index}.setup_time_minutes`, { valueAsNumber: true })}
                      />
                      {stepErrors?.setup_time_minutes && (
                        <p className="text-xs text-destructive">{stepErrors.setup_time_minutes.message}</p>
                      )}
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm" htmlFor={`step-qc-${field.id}`}>
                        <input
                          id={`step-qc-${field.id}`}
                          type="checkbox"
                          className="size-4"
                          {...register(`steps.${index}.quality_check_required`)}
                        />
                        Exige inspeção de qualidade nesta operação
                      </label>
                    </div>

                    <div className="flex items-end justify-end gap-1 pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="Inserir uma operação logo abaixo desta"
                        onClick={() => insert(index + 1, { ...BLANK_STEP })}
                      >
                        <CornerDownRight className="size-4" /> Inserir abaixo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Remover operação"
                        aria-label={`Remover operação ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`step-inst-${field.id}`} className="text-xs">
                      Instruções para o operador (opcional)
                    </Label>
                    <Textarea
                      id={`step-inst-${field.id}`}
                      rows={2}
                      placeholder="Ex.: fio 0,25 mm, 42 espiras, cura 150 °C por 60 min."
                      {...register(`steps.${index}.instructions`)}
                    />
                    {stepErrors?.instructions && (
                      <p className="text-xs text-destructive">{stepErrors.instructions.message}</p>
                    )}
                  </div>

                  {centerIsInactive && (
                    <AmberNoticeBox size="xs">
                      O centro <strong>{selectedCenter?.code}</strong> está desativado no cadastro. Enquanto esta operação
                      apontar para ele, a <strong>liberação do roteiro vai ser recusada</strong> — reative o centro em
                      Produção → Centros de Trabalho ou escolha outro aqui.
                    </AmberNoticeBox>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append({ ...BLANK_STEP })}>
          <Plus className="size-4" /> Adicionar operação no fim
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={fillEmptyCodes} disabled={fields.length === 0}>
          <Hash className="size-4" /> Preencher códigos vazios de 10 em 10
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>
            <span className="text-muted-foreground">Operações: </span>
            <strong className="tabular-nums">{fields.length}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Tempo padrão total: </span>
            <strong className="tabular-nums">{formatMinutes(totals.standard)}</strong>
            <span className="text-muted-foreground"> por peça</span>
          </span>
          <span>
            <span className="text-muted-foreground">Setup total: </span>
            <strong className="tabular-nums">{formatMinutes(totals.setup)}</strong>
            <span className="text-muted-foreground"> por lote (não entra no tempo padrão)</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && <span className="text-xs font-medium text-amber-700">Alterações não salvas</span>}
          <Button type="submit" disabled={isSaving}>
            <Save className="size-4" /> {isSaving ? 'Salvando...' : 'Salvar operações'}
          </Button>
        </div>
      </div>

      {saveError && <DidacticAlert error={saveError} />}
    </form>
  );
}
