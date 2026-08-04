import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router';
import { CheckCircle2, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';

import * as laboratoryApi from '@/api/laboratory';
import * as productsApi from '@/api/products';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectNative } from '@/components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DidacticAlert } from '@/components/DidacticAlert';

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

const testSchema = z.object({
  product_id: z.string().min(1, 'Selecione o produto.'),
  serial_number: z.string().optional(),
  lot_number: z.string().optional(),
  test_type: z.enum([
    'impedance',
    'frequency_response',
    'thd',
    'power_rms',
    'power_peak',
    'life',
    'polarity',
    'noise',
    'thiele_small',
  ]),
  result: z.string().optional(),
  unit: z.string().optional(),
  specification_min: z.string().optional(),
  specification_max: z.string().optional(),
  notes: z.string().optional(),
  create_rnc_on_fail: z.boolean(),
});

type TestFormData = z.infer<typeof testSchema>;

const EMPTY_DEFAULTS: TestFormData = {
  product_id: '',
  serial_number: '',
  lot_number: '',
  test_type: 'impedance',
  result: '',
  unit: '',
  specification_min: '',
  specification_max: '',
  notes: '',
  create_rnc_on_fail: true,
};

/** Aba A: registro de um novo teste de laboratório, com veredito destacado após salvar. */
export function RegisterTestTab() {
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [lastResult, setLastResult] = React.useState<laboratoryApi.AcousticTestResult | null>(null);

  const { data: products } = useQuery({
    queryKey: ['products-all-for-lab-test'],
    queryFn: () => productsApi.listProducts({ limit: 200 }),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const watchedResult = watch('result');
  const watchedMin = watch('specification_min');
  const watchedMax = watch('specification_max');
  // Preventivo (Regra 1, BUSINESS_RULES.md §13.1): o backend só consegue calcular
  // `passed` com "result" OU ao menos um limite de especificação — sem os dois,
  // `CreateAcousticTestUseCase` rejeita com 400. Avisa antes do envio (não bloqueante),
  // reaproveitando os próprios campos do formulário (sem endpoint de pré-checagem novo).
  const missingResultOrRange = !watchedResult && !watchedMin && !watchedMax;

  const createMutation = useMutation({
    mutationFn: (values: TestFormData) =>
      laboratoryApi.createAcousticTest({
        product_id: Number(values.product_id),
        serial_number: values.serial_number || undefined,
        lot_number: values.lot_number || undefined,
        test_type: values.test_type,
        result: values.result !== '' && values.result !== undefined ? Number(values.result) : undefined,
        unit: values.unit || undefined,
        specification_min:
          values.specification_min !== '' && values.specification_min !== undefined
            ? Number(values.specification_min)
            : undefined,
        specification_max:
          values.specification_max !== '' && values.specification_max !== undefined
            ? Number(values.specification_max)
            : undefined,
        notes: values.notes || undefined,
        create_rnc_on_fail: values.create_rnc_on_fail,
      }),
    onSuccess: (test) => {
      setLastResult(test);
      setFormError(null);
      reset(EMPTY_DEFAULTS);
    },
    onError: (error) =>
      setFormError(translateApiError(error, 'Não foi possível registrar o teste de laboratório', 'register-lab-test')),
  });

  return (
    <div className="flex flex-col gap-4">
      {lastResult && <VerdictBanner test={lastResult} onDismiss={() => setLastResult(null)} />}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 border-b pb-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <FlaskConical className="size-4" />
          </div>
          <CardTitle className="text-base">Novo teste de laboratório</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-3"
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product_id">Produto *</Label>
                <Controller
                  control={control}
                  name="product_id"
                  render={({ field }) => (
                    <SelectNative id="product_id" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                      <option value="">Selecione...</option>
                      {products?.data.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code} — {product.name}
                        </option>
                      ))}
                    </SelectNative>
                  )}
                />
                {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="test_type">Tipo de teste *</Label>
                <SelectNative id="test_type" {...register('test_type')}>
                  {Object.entries(TEST_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="serial_number">Nº de série (opcional)</Label>
                <Input id="serial_number" {...register('serial_number')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lot_number">Nº do lote (opcional)</Label>
                <Input id="lot_number" {...register('lot_number')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="result">Resultado medido</Label>
                <Input id="result" type="number" step="any" {...register('result')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unit">Unidade</Label>
                <Input id="unit" placeholder="Ex.: Hz, Ω, dB, W" {...register('unit')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="specification_min">Especificação mínima (opcional)</Label>
                <Input id="specification_min" type="number" step="any" {...register('specification_min')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="specification_max">Especificação máxima (opcional)</Label>
                <Input id="specification_max" type="number" step="any" {...register('specification_max')} />
              </div>
            </div>

            {missingResultOrRange && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Informe o resultado medido ou ao menos um limite de especificação (mínima/máxima) — sem isso, o
                  sistema não consegue calcular a aprovação/reprovação do teste.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('notes')}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="create_rnc_on_fail"
                type="checkbox"
                className="size-4"
                {...register('create_rnc_on_fail')}
              />
              <Label htmlFor="create_rnc_on_fail" className="font-normal">
                Abrir RNC automaticamente se o teste for reprovado
              </Label>
            </div>

            {formError && <DidacticAlert error={formError} />}

            <div>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting || createMutation.isPending ? 'Salvando...' : 'Registrar teste'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function VerdictBanner({
  test,
  onDismiss,
}: {
  test: laboratoryApi.AcousticTestResult;
  onDismiss: () => void;
}) {
  const passed = test.passed;
  const unknown = passed === null || passed === undefined;

  return (
    <Card
      className={
        unknown
          ? 'border-muted'
          : passed
            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
            : 'border-destructive bg-destructive/5'
      }
    >
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="flex items-center gap-3">
          {unknown ? null : passed ? (
            <CheckCircle2 className="size-10 text-emerald-600" />
          ) : (
            <XCircle className="size-10 text-destructive" />
          )}
          <div>
            <p
              className={
                unknown
                  ? 'text-xl font-bold text-foreground'
                  : passed
                    ? 'text-xl font-bold text-emerald-600'
                    : 'text-xl font-bold text-destructive'
              }
            >
              {unknown ? 'TESTE REGISTRADO' : passed ? 'APROVADO' : 'REPROVADO'}
            </p>
            <p className="text-sm text-muted-foreground">
              {TEST_TYPE_LABEL[test.test_type]}
              {test.result !== null && test.result !== undefined ? ` — resultado: ${test.result} ${test.unit ?? ''}` : ''}
            </p>
            {!passed && !unknown && test.non_conformity_id && (
              <p className="text-sm">
                RNC nº {test.non_conformity_id} aberta automaticamente.{' '}
                <Link to="/quality" className="font-medium underline">
                  Ver em Qualidade
                </Link>
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Fechar
        </Button>
      </CardContent>
    </Card>
  );
}
