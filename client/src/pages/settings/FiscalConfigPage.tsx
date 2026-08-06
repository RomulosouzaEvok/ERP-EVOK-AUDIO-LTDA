import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Landmark } from 'lucide-react';

import * as fiscalApi from '@/api/fiscal';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { useAuth } from '@/context/AuthContext';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DidacticAlert } from '@/components/DidacticAlert';
import { Skeleton } from '@/components/ui/skeleton';

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

const CRT_LABEL: Record<string, string> = {
  '1': '1 — Simples Nacional',
  '2': '2 — Simples Nacional, excesso de sublimite',
  '3': '3 — Regime Normal',
};

const NFE_ENVIRONMENT_LABEL: Record<string, string> = {
  homologacao: 'Homologação (testes)',
  producao: 'Produção',
};

const NFE_PROVIDER_LABEL: Record<string, string> = {
  mock: 'Mock (sem integração real)',
  focus_nfe: 'Focus NF-e',
  enotas: 'eNotas',
};

const fiscalConfigSchema = z.object({
  legal_name: z.string().trim().min(1, 'Informe a razão social.').max(200, 'Máximo de 200 caracteres.'),
  trade_name: z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  cnpj: z.string().trim().min(11, 'CNPJ inválido.').max(18, 'CNPJ inválido.'),
  ie: z.string().trim().max(20).optional(),
  im: z.string().trim().max(20).optional(),
  crt: z.enum(['1', '2', '3'], { message: 'Selecione o regime tributário.' }),
  cnae: z.string().trim().max(10).optional(),
  cep: z.string().trim().max(10).optional(),
  street: z.string().trim().max(200).optional(),
  number: z.string().trim().max(20).optional(),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  city_ibge_code: z.string().trim().max(7).optional(),
  state: z.string().trim().length(2, 'Use a sigla com 2 letras (ex.: SP).').optional().or(z.literal('')),
  nfe_series: z.coerce.number().int('Deve ser um número inteiro.').positive('Deve ser maior que zero.').optional(),
  nfe_environment: z.enum(['homologacao', 'producao']),
  nfe_provider: z.enum(['mock', 'focus_nfe', 'enotas']),
});

type FiscalConfigFormData = z.infer<typeof fiscalConfigSchema>;

const EMPTY_FORM: FiscalConfigFormData = {
  legal_name: '',
  trade_name: '',
  cnpj: '',
  ie: '',
  im: '',
  crt: '3',
  cnae: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  city_ibge_code: '',
  state: '',
  nfe_series: 1,
  nfe_environment: 'homologacao',
  nfe_provider: 'mock',
};

function toFormValues(config: fiscalApi.CompanyFiscalConfig | null | undefined): FiscalConfigFormData {
  if (!config) return EMPTY_FORM;
  return {
    legal_name: config.legal_name,
    trade_name: config.trade_name ?? '',
    cnpj: config.cnpj,
    ie: config.ie ?? '',
    im: config.im ?? '',
    crt: config.crt,
    cnae: config.cnae ?? '',
    cep: config.cep ?? '',
    street: config.street ?? '',
    number: config.number ?? '',
    complement: config.complement ?? '',
    neighborhood: config.neighborhood ?? '',
    city: config.city ?? '',
    city_ibge_code: config.city_ibge_code ?? '',
    state: config.state ?? '',
    nfe_series: config.nfe_series,
    nfe_environment: config.nfe_environment,
    nfe_provider: config.nfe_provider,
  };
}

/**
 * `/settings/fiscal` — Configuração fiscal do emitente (registro único,
 * singleton `id=1`), usada na emissão de NF-e em Vendas (`SalesPage.tsx`).
 * Espelha o padrão de formulário de `WarehousesPage.tsx`, mas sem tabela —
 * é sempre "criar se não existir, senão editar" (`GetCompanyFiscalConfigUseCase`
 * retorna `null` no primeiro acesso, `UpsertCompanyFiscalConfigUseCase` faz
 * upsert em ambos os casos via `PUT /api/fiscal/config`).
 *
 * Restrito a `admin` no backend — dado sensível (CNPJ, IE, credenciais de
 * emissão de NF-e). Não há nível de módulo (`AccessModuleKey`) próprio.
 */
export default function FiscalConfigPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fiscal-config'],
    queryFn: fiscalApi.getCompanyFiscalConfig,
    enabled: isAdmin,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FiscalConfigFormData>({
    resolver: zodResolver(fiscalConfigSchema),
    defaultValues: EMPTY_FORM,
  });

  React.useEffect(() => {
    if (!isLoading && !isError) {
      reset(toFormValues(data));
    }
  }, [data, isLoading, isError, reset]);

  const mutation = useMutation({
    mutationFn: (values: FiscalConfigFormData) =>
      fiscalApi.upsertCompanyFiscalConfig({
        legal_name: values.legal_name.trim(),
        trade_name: values.trade_name?.trim() || undefined,
        cnpj: values.cnpj.trim(),
        ie: values.ie?.trim() || undefined,
        im: values.im?.trim() || undefined,
        crt: values.crt,
        cnae: values.cnae?.trim() || undefined,
        cep: values.cep?.trim() || undefined,
        street: values.street?.trim() || undefined,
        number: values.number?.trim() || undefined,
        complement: values.complement?.trim() || undefined,
        neighborhood: values.neighborhood?.trim() || undefined,
        city: values.city?.trim() || undefined,
        city_ibge_code: values.city_ibge_code?.trim() || undefined,
        state: values.state?.trim().toUpperCase() || undefined,
        nfe_series: values.nfe_series,
        nfe_environment: values.nfe_environment,
        nfe_provider: values.nfe_provider,
      }),
    onSuccess: (config) => {
      queryClient.setQueryData(['fiscal-config'], config);
      setFormError(null);
      setSuccessMessage('Configuração fiscal salva com sucesso.');
    },
    onError: (mutationError) => {
      setSuccessMessage(null);
      setFormError(translateApiError(mutationError, 'Não foi possível salvar a configuração fiscal'));
    },
  });

  if (!isAdmin) {
    return <AccessDeniedPage variant="accessDenied" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Landmark className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Configuração Fiscal</h1>
          <p className="text-sm text-muted-foreground">
            Dados do emitente usados na emissão de NF-e das vendas — razão social, CNPJ, regime tributário e provedor de
            emissão.
          </p>
        </div>
      </div>

      {isError && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <span>Não foi possível carregar a configuração fiscal atual.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </CardContent>
        </Card>
      ) : (
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => {
            setSuccessMessage(null);
            mutation.mutate(values);
          })}
        >
          {!data && (
            <p className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-800">
              Nenhuma configuração fiscal cadastrada ainda. Preencha os dados abaixo para habilitar a emissão de NF-e.
            </p>
          )}

          <Card>
            <CardHeader><CardTitle>Identificação do emitente</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="legal_name">Razão social *</Label>
                <Input id="legal_name" {...register('legal_name')} />
                {errors.legal_name && <p className="text-sm text-destructive">{errors.legal_name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="trade_name">Nome fantasia</Label>
                <Input id="trade_name" {...register('trade_name')} />
                {errors.trade_name && <p className="text-sm text-destructive">{errors.trade_name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input id="cnpj" placeholder="00.000.000/0000-00" {...register('cnpj')} />
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ie">Inscrição estadual</Label>
                <Input id="ie" {...register('ie')} />
                {errors.ie && <p className="text-sm text-destructive">{errors.ie.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="im">Inscrição municipal</Label>
                <Input id="im" {...register('im')} />
                {errors.im && <p className="text-sm text-destructive">{errors.im.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="crt">Regime tributário (CRT) *</Label>
                <select id="crt" className={SELECT_CLASS} {...register('crt')}>
                  {Object.entries(CRT_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.crt && <p className="text-sm text-destructive">{errors.crt.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cnae">CNAE</Label>
                <Input id="cnae" {...register('cnae')} />
                {errors.cnae && <p className="text-sm text-destructive">{errors.cnae.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" {...register('cep')} />
                {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input id="street" {...register('street')} />
                {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="number">Número</Label>
                <Input id="number" {...register('number')} />
                {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" {...register('complement')} />
                {errors.complement && <p className="text-sm text-destructive">{errors.complement.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" {...register('neighborhood')} />
                {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city_ibge_code">Código IBGE do município</Label>
                <Input id="city_ibge_code" {...register('city_ibge_code')} />
                {errors.city_ibge_code && <p className="text-sm text-destructive">{errors.city_ibge_code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">UF</Label>
                <Input id="state" maxLength={2} placeholder="SP" {...register('state')} />
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Emissão de NF-e</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nfe_series">Série da NF-e</Label>
                <Input id="nfe_series" type="number" min={1} step={1} {...register('nfe_series')} />
                {errors.nfe_series && <p className="text-sm text-destructive">{errors.nfe_series.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nfe_environment">Ambiente</Label>
                <select id="nfe_environment" className={SELECT_CLASS} {...register('nfe_environment')}>
                  {Object.entries(NFE_ENVIRONMENT_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nfe_provider">Provedor de emissão</Label>
                <select id="nfe_provider" className={SELECT_CLASS} {...register('nfe_provider')}>
                  {Object.entries(NFE_PROVIDER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {data && (
                <div className="flex flex-col gap-1.5 sm:col-span-3">
                  <Label>Próximo número de NF-e</Label>
                  <p className="text-sm text-muted-foreground">
                    {data.nfe_next_number} — controlado automaticamente pela emissão de NF-e, não é editável aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {formError && <DidacticAlert error={formError} />}
          {successMessage && (
            <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
              {successMessage}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar configuração'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
