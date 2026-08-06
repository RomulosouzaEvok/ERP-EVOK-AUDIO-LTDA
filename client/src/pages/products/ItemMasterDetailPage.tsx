import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus } from 'lucide-react';

import * as itemsApi from '@/api/items';
import * as itemSuppliersApi from '@/api/itemSuppliers';
import * as suppliersApi from '@/api/suppliers';
import * as engineeringApi from '@/api/engineering';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { DidacticAlert } from '@/components/DidacticAlert';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { ITEM_TYPE_LABEL } from '@/pages/products/ItemMasterPage';

type DetailTab = 'geral' | 'tecnica' | 'fornecedores' | 'estrutura';

const TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'geral', label: 'Dados gerais' },
  { key: 'tecnica', label: 'Ficha técnica (Thiele-Small)' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'estrutura', label: 'Estrutura (BOM)' },
];

/**
 * `/products/items/:codigo` — detalhe do Item Mestre.
 *
 * Não existe `GET /api/items/:id` no backend (ver `docs/API.md` §31) —
 * resolve o item pelo `codigo` (único) via `GET /api/items?search=codigo`
 * seguido de um match exato, mesmo padrão já usado em
 * `ProductsPage.tsx`/`ProductSuppliersDialog`. Isso também torna a rota
 * estável para acesso direto por URL (o `id` UUID não precisa ser
 * conhecido de antemão).
 */
export default function ItemMasterDetailPage() {
  const { codigo = '' } = useParams();
  const [tab, setTab] = React.useState<DetailTab>('geral');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['item-by-code', codigo],
    queryFn: () => itemsApi.listItems({ search: codigo, limit: 100 }),
    enabled: Boolean(codigo),
  });

  const item = data?.data.find((candidate) => candidate.codigo === codigo) ?? null;
  const notFound = Boolean(codigo) && !isLoading && !isError && !item;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/products/items">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando item...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar o item. Tente novamente.</p>}
      {notFound && (
        <p className="text-sm text-destructive">
          Item de código <strong>{codigo}</strong> não encontrado.
        </p>
      )}

      {item && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {item.codigo} — {item.descricao}
            </h1>
            <Badge variant="outline">{ITEM_TYPE_LABEL[item.tipo] ?? item.tipo}</Badge>
            <Badge variant={item.status === 'ATIVO' ? 'success' : item.status === 'BLOQUEADO' ? 'warning' : 'secondary'}>
              {item.status}
            </Badge>
          </div>

          <div className="flex gap-2 border-b overflow-x-auto">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === key ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'geral' && <GeneralTab item={item} />}
          {tab === 'tecnica' && <TechnicalSpecSection item={item} />}
          {tab === 'fornecedores' && <SuppliersSection item={item} />}
          {tab === 'estrutura' && <StructureSection item={item} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Aba: Dados gerais (edição + inativação)
// ---------------------------------------------------------------------

const generalSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  status: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']),
  estoque_seguranca: z.string().optional(),
  lote_minimo: z.string().optional(),
  lead_time_dias: z.string().optional(),
  custo_padrao: z.string().optional(),
});

type GeneralFormData = z.infer<typeof generalSchema>;

function toOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function GeneralTab({ item }: { item: itemsApi.Item }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saveError, setSaveError] = React.useState<DidacticError | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [deactivateError, setDeactivateError] = React.useState<DidacticError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      descricao: item.descricao,
      status: item.status as GeneralFormData['status'],
      estoque_seguranca: item.estoque_seguranca != null ? String(item.estoque_seguranca) : '',
      lote_minimo: item.lote_minimo != null ? String(item.lote_minimo) : '',
      lead_time_dias: item.lead_time_dias != null ? String(item.lead_time_dias) : '',
      custo_padrao: item.custo_padrao != null ? String(item.custo_padrao) : '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: GeneralFormData) =>
      itemsApi.updateItem(item.id, {
        descricao: values.descricao,
        status: values.status,
        estoque_seguranca: toOptionalNumber(values.estoque_seguranca),
        lote_minimo: toOptionalNumber(values.lote_minimo),
        lead_time_dias: toOptionalNumber(values.lead_time_dias),
        custo_padrao: toOptionalNumber(values.custo_padrao),
      }),
    onSuccess: () => {
      setSaved(true);
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['item-by-code', item.codigo] });
    },
    onError: (error) => setSaveError(translateApiError(error, `Não foi possível salvar o item ${item.codigo}`)),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => itemsApi.deactivateItem(item.id),
    onSuccess: () => {
      setDeactivateError(null);
      queryClient.invalidateQueries({ queryKey: ['item-by-code', item.codigo] });
    },
    onError: (error) =>
      setDeactivateError(translateApiError(error, `Não foi possível inativar o item ${item.codigo}`)),
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ReadOnlyField label="Código" value={item.codigo} />
          <ReadOnlyField label="Tipo" value={ITEM_TYPE_LABEL[item.tipo] ?? item.tipo} />
          <ReadOnlyField label="Unidade" value={item.unidade} />
          <ReadOnlyField label="Estoque atual" value={String(Number(item.estoque_atual))} />
          <ReadOnlyField label="Estoque reservado" value={item.estoque_reservado != null ? String(Number(item.estoque_reservado)) : '-'} />
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" disabled={!canWrite} {...register('descricao')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <SelectNative id="status" disabled={!canWrite} {...register('status')}>
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </SelectNative>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estoque_seguranca">Estoque de segurança</Label>
              <Input id="estoque_seguranca" type="number" step="any" disabled={!canWrite} {...register('estoque_seguranca')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lote_minimo">Lote mínimo</Label>
              <Input id="lote_minimo" type="number" step="any" disabled={!canWrite} {...register('lote_minimo')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead_time_dias">Lead time (dias)</Label>
              <Input id="lead_time_dias" type="number" disabled={!canWrite} {...register('lead_time_dias')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custo_padrao">Custo padrão</Label>
              <Input id="custo_padrao" type="number" step="any" disabled={!canWrite} {...register('custo_padrao')} />
            </div>
          </div>

          {saveError && <DidacticAlert error={saveError} />}
          {saved && !saveError && <p className="text-sm font-medium text-success">Item salvo com sucesso.</p>}

          {canWrite && (
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {isSubmitting || saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              {item.status !== 'INATIVO' && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={deactivateMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Inativar o item "${item.codigo}"? Esta ação verifica vínculos ativos (BOM/OP/lotes/MRP).`)) {
                      deactivateMutation.mutate(undefined, {
                        onSuccess: () => navigate('/products/items'),
                      });
                    }
                  }}
                >
                  Inativar item
                </Button>
              )}
            </div>
          )}
        </form>

        {deactivateError && <DidacticAlert error={deactivateError} />}
      </CardContent>
    </Card>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Aba: Ficha técnica Thiele-Small (`ItemEspecificacaoTecnica`)
// ---------------------------------------------------------------------

const TS_FIELDS: Array<{ key: keyof engineeringApi.ThieleSmallParams; label: string }> = [
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

const technicalSpecSchema = z.object({
  familia_tecnica: z.string().optional(),
  fs_hz: z.string().optional(),
  qms: z.string().optional(),
  qes: z.string().optional(),
  qts: z.string().optional(),
  vas_l: z.string().optional(),
  sd_cm2: z.string().optional(),
  xmax_mm: z.string().optional(),
  re_ohms: z.string().optional(),
  le_mh: z.string().optional(),
  bl_tm: z.string().optional(),
  mms_g: z.string().optional(),
  cms_mm_n: z.string().optional(),
  spl_db: z.string().optional(),
});

type TechnicalSpecFormData = z.infer<typeof technicalSpecSchema>;

function TechnicalSpecSection({ item }: { item: itemsApi.Item }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [saved, setSaved] = React.useState(false);

  const { data: spec, isLoading, isError } = useQuery({
    queryKey: ['item-technical-spec', item.id],
    queryFn: () => engineeringApi.getItemTechnicalSpec(item.id),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TechnicalSpecFormData>({
    resolver: zodResolver(technicalSpecSchema),
  });

  React.useEffect(() => {
    const atributos = spec?.atributos ?? {};
    reset({
      familia_tecnica: spec?.familia_tecnica ?? '',
      ...Object.fromEntries(TS_FIELDS.map(({ key }) => [key, atributos[key] !== undefined ? String(atributos[key]) : ''])),
    } as TechnicalSpecFormData);
  }, [spec, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: TechnicalSpecFormData) => {
      const atributos: engineeringApi.ThieleSmallParams = {};
      for (const { key } of TS_FIELDS) {
        const raw = values[key];
        if (raw !== undefined && raw.trim() !== '') atributos[key] = Number(raw);
      }
      return engineeringApi.upsertItemTechnicalSpec(item.id, {
        familia_tecnica: values.familia_tecnica || undefined,
        atributos,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['item-technical-spec', item.id] });
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível salvar a ficha técnica')),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando ficha técnica...</p>;
  if (isError) return <p className="text-sm text-destructive">Não foi possível carregar a ficha técnica deste item.</p>;

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate>
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

          {formError && <DidacticAlert error={formError} />}
          {saved && !formError && <p className="text-sm font-medium text-success">Ficha técnica salva com sucesso.</p>}

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
  );
}

// ---------------------------------------------------------------------
// Aba: Fornecedores (catálogo item × fornecedor + histórico de compras)
// ---------------------------------------------------------------------

const itemSupplierSchema = z.object({
  supplier_id: z.coerce.number().int().positive('Selecione um fornecedor.'),
  unit_price: z.string().optional(),
  currency: z.string().optional(),
  lead_time_days: z.string().optional(),
  moq: z.string().optional(),
  supplier_item_code: z.string().optional(),
  preferred: z.boolean().optional(),
  notes: z.string().optional(),
});

type ItemSupplierFormData = z.infer<typeof itemSupplierSchema>;

function SuppliersSection({ item }: { item: itemsApi.Item }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const queryClient = useQueryClient();
  const [editingLink, setEditingLink] = React.useState<itemSuppliersApi.ItemSupplierLink | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [formError, setFormError] = React.useState<DidacticError | null>(null);
  const [deactivateError, setDeactivateError] = React.useState<DidacticError | null>(null);
  const [defaultSupplierError, setDefaultSupplierError] = React.useState<DidacticError | null>(null);

  const { data: links, isLoading: isLoadingLinks } = useQuery({
    queryKey: ['item-suppliers', item.id],
    queryFn: () => itemSuppliersApi.listItemSuppliers(item.id),
  });

  const { data: history } = useQuery({
    queryKey: ['item-purchase-history', item.id],
    queryFn: () => itemSuppliersApi.getItemPurchaseHistory(item.id),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.listSuppliers({ limit: 200 }),
  });

  const activeSuppliers = React.useMemo(
    () => suppliers?.data.filter((supplier) => supplier.status === 'active') ?? [],
    [suppliers],
  );

  const setDefaultSupplierMutation = useMutation({
    mutationFn: (fornecedor_padrao_id: number | null) => itemsApi.updateItem(item.id, { fornecedor_padrao_id }),
    onSuccess: () => {
      setDefaultSupplierError(null);
      queryClient.invalidateQueries({ queryKey: ['item-by-code', item.codigo] });
    },
    onError: (error) =>
      setDefaultSupplierError(translateApiError(error, 'Não foi possível atualizar o fornecedor padrão do item')),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemSupplierFormData>({
    resolver: zodResolver(itemSupplierSchema),
  });

  React.useEffect(() => {
    if (editingLink) {
      reset({
        supplier_id: editingLink.supplier_id,
        unit_price: editingLink.unit_price != null ? String(editingLink.unit_price) : '',
        currency: editingLink.currency ?? '',
        lead_time_days: editingLink.lead_time_days != null ? String(editingLink.lead_time_days) : '',
        moq: editingLink.moq != null ? String(editingLink.moq) : '',
        supplier_item_code: editingLink.supplier_item_code ?? '',
        preferred: editingLink.preferred,
        notes: editingLink.notes ?? '',
      });
      setShowForm(true);
    } else {
      reset({ supplier_id: undefined, unit_price: '', currency: '', lead_time_days: '', moq: '', supplier_item_code: '', preferred: false, notes: '' } as never);
    }
  }, [editingLink, reset]);

  const invalidateLinks = () => queryClient.invalidateQueries({ queryKey: ['item-suppliers', item.id] });

  const toLinkInput = (values: ItemSupplierFormData): itemSuppliersApi.ItemSupplierInput => ({
    supplier_id: values.supplier_id,
    unit_price: toOptionalNumber(values.unit_price),
    currency: values.currency || undefined,
    lead_time_days: toOptionalNumber(values.lead_time_days),
    moq: toOptionalNumber(values.moq),
    supplier_item_code: values.supplier_item_code || undefined,
    preferred: values.preferred,
    notes: values.notes || undefined,
  });

  const createMutation = useMutation({
    mutationFn: (values: ItemSupplierFormData) => itemSuppliersApi.createItemSupplier(item.id, toLinkInput(values)),
    onSuccess: () => {
      invalidateLinks();
      setShowForm(false);
      setFormError(null);
      reset();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível criar o vínculo com o fornecedor')),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ItemSupplierFormData) => itemSuppliersApi.updateItemSupplier(item.id, editingLink!.id, toLinkInput(values)),
    onSuccess: () => {
      invalidateLinks();
      setShowForm(false);
      setEditingLink(null);
      setFormError(null);
      reset();
    },
    onError: (error) => setFormError(translateApiError(error, 'Não foi possível atualizar o vínculo com o fornecedor')),
  });

  const deactivateMutation = useMutation({
    mutationFn: (linkId: number) => itemSuppliersApi.deactivateItemSupplier(item.id, linkId),
    onSuccess: invalidateLinks,
    onError: (error) => setDeactivateError(translateApiError(error, 'Não foi possível desativar o vínculo com o fornecedor')),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <Label htmlFor="fornecedor-padrao">Fornecedor padrão</Label>
        <SelectNative
          id="fornecedor-padrao"
          value={item.fornecedor_padrao_id ?? ''}
          disabled={!canWrite || setDefaultSupplierMutation.isPending}
          onChange={(event) => setDefaultSupplierMutation.mutate(event.target.value === '' ? null : Number(event.target.value))}
        >
          <option value="">Nenhum fornecedor padrão definido</option>
          {activeSuppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.company_name}
            </option>
          ))}
        </SelectNative>
        <p className="text-sm text-muted-foreground">
          O MRP usa este fornecedor para sugerir automaticamente quem cotar/comprar quando gerar uma requisição de
          compra para este item.
        </p>
        {defaultSupplierError && <DidacticAlert error={defaultSupplierError} />}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Vínculos de fornecimento</p>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => {
              setEditingLink(null);
              setShowForm((prev) => !prev);
            }}
          >
            <Plus className="size-3" /> Novo vínculo
          </Button>
        )}
      </div>

      {showForm && (
        <form
          className="flex flex-col gap-3 rounded-lg border p-3"
          onSubmit={handleSubmit((values) => (editingLink ? updateMutation.mutate(values) : createMutation.mutate(values)))}
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier_id">Fornecedor</Label>
              <SelectNative id="supplier_id" {...register('supplier_id')} defaultValue="">
                <option value="" disabled>
                  Selecione...
                </option>
                {suppliers?.data.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </option>
                ))}
              </SelectNative>
              {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier_item_code">Código do item no fornecedor</Label>
              <Input id="supplier_item_code" {...register('supplier_item_code')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit_price">Preço unitário</Label>
              <Input id="unit_price" type="number" step="any" {...register('unit_price')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Moeda</Label>
              <Input id="currency" placeholder="BRL" {...register('currency')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead_time_days">Lead time (dias)</Label>
              <Input id="lead_time_days" type="number" {...register('lead_time_days')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="moq">MOQ</Label>
              <Input id="moq" type="number" step="any" {...register('moq')} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="preferred" type="checkbox" className="size-4" {...register('preferred')} />
              <Label htmlFor="preferred">Fornecedor preferencial</Label>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" {...register('notes')} />
          </div>
          {formError && <DidacticAlert error={formError} />}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setEditingLink(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {isSubmitting ? 'Salvando...' : editingLink ? 'Salvar alterações' : 'Adicionar vínculo'}
            </Button>
          </div>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Lead time</TableHead>
            <TableHead>MOQ</TableHead>
            <TableHead>Preferencial</TableHead>
            <TableHead>Status</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingLinks && <TableSkeletonRows columns={canWrite ? 7 : 6} />}
          {links?.data.map((link) => (
            <TableRow key={link.id}>
              <TableCell>{link.supplier?.company_name ?? link.supplier_id}</TableCell>
              <TableCell>{link.unit_price != null ? `${link.currency ?? 'BRL'} ${Number(link.unit_price).toFixed(2)}` : '-'}</TableCell>
              <TableCell>{link.lead_time_days != null ? `${link.lead_time_days}d` : '-'}</TableCell>
              <TableCell>{link.moq != null ? Number(link.moq) : '-'}</TableCell>
              <TableCell>{link.preferred && <Badge variant="success">Preferencial</Badge>}</TableCell>
              <TableCell>
                <Badge variant={link.active ? 'success' : 'secondary'}>{link.active ? 'Ativo' : 'Inativo'}</Badge>
              </TableCell>
              {canWrite && (
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingLink(link)}>
                    Editar
                  </Button>
                  {link.active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Desativar o vínculo com "${link.supplier?.company_name}"?`)) {
                          deactivateMutation.mutate(link.id);
                        }
                      }}
                    >
                      Desativar
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoadingLinks && links?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground">
                Nenhum fornecedor vinculado a este item.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {deactivateError && <DidacticAlert error={deactivateError} />}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Histórico de compras</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Qtd. total</TableHead>
              <TableHead>Preço mín.</TableHead>
              <TableHead>Preço médio</TableHead>
              <TableHead>Preço máx.</TableHead>
              <TableHead>Última compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history?.map((entry) => (
              <TableRow key={entry.supplier_id}>
                <TableCell>{entry.company_name}</TableCell>
                <TableCell>{entry.orders_count}</TableCell>
                <TableCell>{Number(entry.total_quantity)}</TableCell>
                <TableCell>R$ {Number(entry.min_price).toFixed(2)}</TableCell>
                <TableCell>R$ {Number(entry.avg_price).toFixed(2)}</TableCell>
                <TableCell>R$ {Number(entry.max_price).toFixed(2)}</TableCell>
                <TableCell>{entry.last_order_date ? new Date(entry.last_order_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
              </TableRow>
            ))}
            {(!history || history.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma compra registrada para este item.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Aba: Estrutura (BOM do item mestre)
// ---------------------------------------------------------------------

function StructureSection({ item }: { item: itemsApi.Item }) {
  const { hasRole } = useAuth();
  const canWrite = hasRole('admin', 'operator');
  const [component, setComponent] = React.useState<itemsApi.Item | null>(null);
  const [quantidade, setQuantidade] = React.useState('1');
  const [perda, setPerda] = React.useState('');
  const [createError, setCreateError] = React.useState<DidacticError | null>(null);
  const [created, setCreated] = React.useState(false);

  const [explodeQty, setExplodeQty] = React.useState('1');

  const {
    data: exploded,
    isLoading: isExploding,
    isError: isExplodeError,
    refetch: refetchExplode,
  } = useQuery({
    queryKey: ['item-structure-explode', item.id, explodeQty],
    queryFn: () => itemsApi.explodeItemStructure(item.id, { quantity: Number(explodeQty) || 1 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      itemsApi.createItemStructure(item.id, {
        item_componente_id: component!.id,
        quantidade: Number(quantidade),
        perda_percentual: perda ? Number(perda) : undefined,
      }),
    onSuccess: () => {
      setCreated(true);
      setCreateError(null);
      setComponent(null);
      setQuantidade('1');
      setPerda('');
      refetchExplode();
    },
    onError: (error) => setCreateError(translateApiError(error, 'Não foi possível adicionar o componente à estrutura')),
  });

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm font-semibold">Adicionar componente à estrutura</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Item componente</Label>
                <ItemSearchSelect value={component} onChange={setComponent} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quantidade">Quantidade por unidade</Label>
                <Input id="quantidade" type="number" step="any" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 max-w-xs">
              <Label htmlFor="perda">Perda (%)</Label>
              <Input id="perda" type="number" step="any" value={perda} onChange={(event) => setPerda(event.target.value)} />
            </div>
            {createError && <DidacticAlert error={createError} />}
            {created && !createError && <p className="text-sm font-medium text-success">Componente adicionado com sucesso.</p>}
            <div>
              <Button
                type="button"
                disabled={!component || !quantidade || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Adicionando...' : 'Adicionar componente'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Explosão da estrutura</p>
          <Label htmlFor="explode-qty" className="text-sm text-muted-foreground">
            Quantidade
          </Label>
          <Input
            id="explode-qty"
            type="number"
            step="any"
            className="w-28"
            value={explodeQty}
            onChange={(event) => setExplodeQty(event.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Não há um endpoint de listagem "rasa" da estrutura — esta tabela mostra a explosão agregada por nível
          (mesmo cálculo usado pelo MRP), que é hoje a única forma de visualizar os componentes já cadastrados.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nível</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Quantidade bruta</TableHead>
              <TableHead>Data de necessidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isExploding && <TableSkeletonRows columns={5} />}
            {isExplodeError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Não foi possível explodir a estrutura deste item.
                </TableCell>
              </TableRow>
            )}
            {exploded?.map((entry, index) => (
              <TableRow key={`${entry.item_id}-${index}`}>
                <TableCell>{entry.nivel}</TableCell>
                <TableCell>{entry.codigo ?? '-'}</TableCell>
                <TableCell>{entry.descricao ?? '-'}</TableCell>
                <TableCell>{Number(entry.quantidade_bruta)}</TableCell>
                <TableCell>{entry.data_necessidade ? new Date(entry.data_necessidade).toLocaleDateString('pt-BR') : '-'}</TableCell>
              </TableRow>
            ))}
            {!isExploding && !isExplodeError && (exploded?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Este item não tem estrutura/componentes cadastrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
