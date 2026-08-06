import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import * as engineeringApi from '@/api/engineering';
import * as itemsApi from '@/api/items';
import { extractApiErrorMessage } from '@/api/httpClient';
import { useAuth } from '@/context/AuthContext';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Os 13 parâmetros Thiele-Small, com rótulo e unidade — ordem e nomes
 * alinhados a `thieleSmallParamsSchema` em
 * `server/src/modules/engineering/presentation/validators/engineeringValidators.ts`.
 */
const TS_FIELDS: Array<{ key: keyof ThieleSmallFormFields; label: string }> = [
  { key: 'fs_hz', label: 'Fs (Hz)' },
  { key: 'qms', label: 'Qms' },
  { key: 'qes', label: 'Qes' },
  { key: 'qts', label: 'Qts' },
  { key: 'vas_l', label: 'Vas (L)' },
  { key: 'sd_cm2', label: 'Sd (cm²)' },
  { key: 'xmax_mm', label: 'Xmax (mm)' },
  { key: 're_ohms', label: 'Re (Ω)' },
  { key: 'le_mh', label: 'Le (mH)' },
  { key: 'bl_tm', label: 'BL (Tm)' },
  { key: 'mms_g', label: 'Mms (g)' },
  { key: 'cms_mm_n', label: 'Cms (mm/N)' },
  { key: 'spl_db', label: 'SPL (dB)' },
];

const numericField = z
  .union([z.string(), z.undefined()])
  .transform((value) => (value === undefined || value.trim() === '' ? undefined : value));

const technicalSpecSchema = z.object({
  familia_tecnica: z.string().optional(),
  fs_hz: numericField,
  qms: numericField,
  qes: numericField,
  qts: numericField,
  vas_l: numericField,
  sd_cm2: numericField,
  xmax_mm: numericField,
  re_ohms: numericField,
  le_mh: numericField,
  bl_tm: numericField,
  mms_g: numericField,
  cms_mm_n: numericField,
  spl_db: numericField,
});

type TechnicalSpecFormData = z.infer<typeof technicalSpecSchema>;
type ThieleSmallFormFields = Omit<TechnicalSpecFormData, 'familia_tecnica'>;

const EMPTY_DEFAULTS: TechnicalSpecFormData = {
  familia_tecnica: '',
  fs_hz: undefined,
  qms: undefined,
  qes: undefined,
  qts: undefined,
  vas_l: undefined,
  sd_cm2: undefined,
  xmax_mm: undefined,
  re_ohms: undefined,
  le_mh: undefined,
  bl_tm: undefined,
  mms_g: undefined,
  cms_mm_n: undefined,
  spl_db: undefined,
};

/** Aba C: Ficha técnica Thiele-Small de um item (matéria-prima/subconjunto/produto acabado). */
export function TechnicalSpecTab() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = React.useState<itemsApi.Item | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const { data: spec, isLoading, isError } = useQuery({
    queryKey: ['item-technical-spec', selectedItem?.id],
    queryFn: () => engineeringApi.getItemTechnicalSpec(selectedItem!.id),
    enabled: Boolean(selectedItem),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TechnicalSpecFormData>({
    resolver: zodResolver(technicalSpecSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  React.useEffect(() => {
    setSaved(false);
    setFormError(null);
    if (!selectedItem) {
      reset(EMPTY_DEFAULTS);
      return;
    }
    if (spec) {
      const atributos = spec.atributos ?? {};
      reset({
        familia_tecnica: spec.familia_tecnica ?? '',
        fs_hz: atributos.fs_hz !== undefined ? String(atributos.fs_hz) : undefined,
        qms: atributos.qms !== undefined ? String(atributos.qms) : undefined,
        qes: atributos.qes !== undefined ? String(atributos.qes) : undefined,
        qts: atributos.qts !== undefined ? String(atributos.qts) : undefined,
        vas_l: atributos.vas_l !== undefined ? String(atributos.vas_l) : undefined,
        sd_cm2: atributos.sd_cm2 !== undefined ? String(atributos.sd_cm2) : undefined,
        xmax_mm: atributos.xmax_mm !== undefined ? String(atributos.xmax_mm) : undefined,
        re_ohms: atributos.re_ohms !== undefined ? String(atributos.re_ohms) : undefined,
        le_mh: atributos.le_mh !== undefined ? String(atributos.le_mh) : undefined,
        bl_tm: atributos.bl_tm !== undefined ? String(atributos.bl_tm) : undefined,
        mms_g: atributos.mms_g !== undefined ? String(atributos.mms_g) : undefined,
        cms_mm_n: atributos.cms_mm_n !== undefined ? String(atributos.cms_mm_n) : undefined,
        spl_db: atributos.spl_db !== undefined ? String(atributos.spl_db) : undefined,
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, spec]);

  const saveMutation = useMutation({
    mutationFn: (values: TechnicalSpecFormData) => {
      const atributos: engineeringApi.ThieleSmallParams = {};
      for (const { key } of TS_FIELDS) {
        const raw = values[key];
        if (raw !== undefined) atributos[key] = Number(raw);
      }
      return engineeringApi.upsertItemTechnicalSpec(selectedItem!.id, {
        familia_tecnica: values.familia_tecnica || undefined,
        atributos,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['item-technical-spec', selectedItem?.id] });
    },
    onError: (error) => setFormError(extractApiErrorMessage(error, 'Não foi possível salvar a ficha técnica.')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 max-w-lg">
        <Label htmlFor="ts-item-select">Item</Label>
        <ItemSearchSelect
          value={selectedItem}
          onChange={(item) => {
            setSelectedItem(item);
            setSaved(false);
          }}
        />
      </div>

      {!selectedItem && (
        <p className="text-sm text-muted-foreground">Selecione um item para ver/editar sua ficha técnica.</p>
      )}

      {selectedItem && isLoading && <p className="text-sm text-muted-foreground">Carregando ficha técnica...</p>}

      {selectedItem && isError && (
        <p className="text-sm text-destructive">Não foi possível carregar a ficha técnica deste item.</p>
      )}

      {selectedItem && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
              noValidate
            >
              <div className="flex flex-col gap-1.5 max-w-sm">
                <Label htmlFor="familia_tecnica">Família técnica</Label>
                <Input
                  id="familia_tecnica"
                  placeholder="Ex.: woofer_10pol, tweeter_dome"
                  disabled={!canWrite}
                  {...register('familia_tecnica')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {TS_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} type="number" step="any" disabled={!canWrite} {...register(key)} />
                  </div>
                ))}
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              {saved && !formError && (
                <p className="text-sm font-medium text-success">Ficha técnica salva com sucesso.</p>
              )}

              {canWrite && (
                <div>
                  <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                    {isSubmitting || saveMutation.isPending ? 'Salvando...' : 'Salvar ficha técnica'}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
