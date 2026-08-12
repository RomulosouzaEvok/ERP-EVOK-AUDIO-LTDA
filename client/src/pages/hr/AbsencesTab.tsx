import * as React from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, CornerDownLeft, FileUp } from 'lucide-react';

import * as hrApi from '@/api/hr';
import { translateApiError, type DidacticError } from '@/lib/translateApiError';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useEmployeeOptions } from '@/components/hr/useEmployeeOptions';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableSkeletonRows } from '@/components/TableSkeletonRows';
import { Pagination } from '@/components/Pagination';
import { DidacticAlert } from '@/components/DidacticAlert';

const TYPE_LABEL: Record<hrApi.AbsenceType, string> = {
  doenca_ate_15d: 'Doença — até 15 dias',
  auxilio_doenca_inss: 'Auxílio-doença (INSS)',
  acidente_trabalho: 'Acidente de trabalho',
  maternidade: 'Licença-maternidade',
  paternidade: 'Licença-paternidade',
  licenca_outras: 'Outras licenças',
};

/** Código de erro que o backend retorna quando o retorno exige ASO (RF-RH-048). */
const RETURN_ASO_REQUIRED_CODE = 'RETURN_ASO_REQUIRED';

function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { code?: string } | string } | undefined;
    if (body?.error && typeof body.error === 'object') return body.error.code;
  }
  return undefined;
}

/**
 * Aba "Afastamentos" de `/hr` — UC-71 (RF-RH-044 a 049). `cid` é dado de
 * saúde: o backend OMITE a chave inteira da resposta (não `null`) quando o
 * usuário não tem interseção de módulos `rh`+`sst`/admin
 * (`rhSensitiveFields.sanitizeAbsence`) — a tela exibe "Restrito" nesse
 * caso, nunca quebra por chave ausente.
 *
 * O retorno de afastamento > 30 dias exige ASO de retorno válido
 * (`RETURN_ASO_REQUIRED`, 422) — o dialog de retorno detecta esse código e
 * oferece anexar o ASO via `FileUploadDialog` (mesmo padrão da Demissão),
 * repetindo o retorno em seguida.
 */
export function AbsencesTab() {
  const { hasModuleAccess } = useAuth();
  const canWrite = hasModuleAccess('rh');
  const queryClient = useQueryClient();
  const { employees, employeeName } = useEmployeeOptions();

  const [employeeFilter, setEmployeeFilter] = React.useState<number | ''>('');
  const [typeFilter, setTypeFilter] = React.useState<hrApi.AbsenceType | ''>('');
  const [openFilter, setOpenFilter] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [returnAbsence, setReturnAbsence] = React.useState<hrApi.Absence | null>(null);
  const [actionError, setActionError] = React.useState<DidacticError | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hr-absences', employeeFilter, typeFilter, openFilter, page],
    queryFn: () =>
      hrApi.listAbsences({
        employee_id: employeeFilter || undefined,
        type: typeFilter || undefined,
        open: openFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hr-absences'] });

  const esocialMutation = useMutation({
    mutationFn: hrApi.confirmAbsenceEsocial,
    onSuccess: invalidate,
    onError: (error) => setActionError(translateApiError(error, 'Não foi possível confirmar a transmissão do eSocial (S-2230)')),
  });

  const colSpan = canWrite ? 7 : 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="absence-employee-filter">Funcionário</Label>
            <SelectNative
              id="absence-employee-filter"
              className="w-52"
              value={employeeFilter}
              onChange={(event) => {
                setEmployeeFilter(event.target.value ? Number(event.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="absence-type-filter">Tipo</Label>
            <SelectNative
              id="absence-type-filter"
              className="w-56"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as hrApi.AbsenceType | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={openFilter}
              onChange={(event) => {
                setOpenFilter(event.target.checked);
                setPage(1);
              }}
            />
            Só em aberto
          </label>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Novo afastamento
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Fim previsto</TableHead>
            <TableHead>Fim real</TableHead>
            <TableHead>CID</TableHead>
            {canWrite && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeletonRows columns={colSpan} />}
          {isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-destructive">
                Não foi possível carregar os afastamentos. Tente novamente.
              </TableCell>
            </TableRow>
          )}
          {data?.data.map((absence) => (
            <TableRow key={absence.id}>
              <TableCell className="font-medium">{employeeName(absence.employee_id)}</TableCell>
              <TableCell>{TYPE_LABEL[absence.type]}</TableCell>
              <TableCell>{formatDate(absence.start_date)}</TableCell>
              <TableCell>{formatDate(absence.expected_end_date)}</TableCell>
              <TableCell>
                {absence.actual_end_date ? (
                  <Badge variant="success">{formatDate(absence.actual_end_date)}</Badge>
                ) : (
                  <Badge variant="warning">Em aberto</Badge>
                )}
              </TableCell>
              <TableCell>
                {absence.cid === undefined ? (
                  <span className="text-xs text-muted-foreground italic">Restrito</span>
                ) : (
                  absence.cid || <span className="text-xs text-muted-foreground">Não informado</span>
                )}
              </TableCell>
              {canWrite && (
                <TableCell className="flex flex-wrap gap-1.5">
                  {!absence.actual_end_date && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        setReturnAbsence(absence);
                      }}
                    >
                      <CornerDownLeft className="size-4" /> Registrar retorno
                    </Button>
                  )}
                  {!absence.s2230_confirmed_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={esocialMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        esocialMutation.mutate(absence.id);
                      }}
                    >
                      <Send className="size-4" /> eSocial S-2230
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {!isLoading && !isError && data?.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                Nenhum afastamento encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {actionError && <DidacticAlert error={actionError} />}

      <CreateAbsenceDialog open={createOpen} employees={employees} onClose={() => setCreateOpen(false)} />
      <ReturnAbsenceDialog absence={returnAbsence} onClose={() => setReturnAbsence(null)} />
    </div>
  );
}

function CreateAbsenceDialog({
  open,
  employees,
  onClose,
}: {
  open: boolean;
  employees: { id: number; name: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = React.useState<number | ''>('');
  const [type, setType] = React.useState<hrApi.AbsenceType>('doenca_ate_15d');
  const [startDate, setStartDate] = React.useState('');
  const [expectedEndDate, setExpectedEndDate] = React.useState('');
  const [extendedProgram, setExtendedProgram] = React.useState(false);
  const [cid, setCid] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEmployeeId('');
      setType('doenca_ate_15d');
      setStartDate('');
      setExpectedEndDate('');
      setExtendedProgram(false);
      setCid('');
      setError(null);
      setValidationError(null);
      setSuccessNotice(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      hrApi.createAbsence({
        employee_id: Number(employeeId),
        type,
        start_date: startDate,
        expected_end_date: expectedEndDate || undefined,
        extended_program: type === 'maternidade' ? extendedProgram : undefined,
        cid: cid.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hr-absences'] });
      const notices: string[] = [];
      if (result.accrual_period_zeroed) {
        notices.push('O período aquisitivo de férias em curso foi zerado (mais de 6 meses de afastamento previdenciário — Art. 133, IV, CLT).');
      }
      if (result.warning) notices.push(result.warning);
      if (notices.length > 0) {
        setSuccessNotice(notices.join(' '));
        return;
      }
      onClose();
    },
    onError: (err) => setError(translateApiError(err, 'Não foi possível registrar o afastamento')),
  });

  const handleConfirm = () => {
    if (!employeeId || !startDate) {
      setValidationError('Selecione o funcionário e informe a data de início.');
      return;
    }
    setValidationError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo afastamento</DialogTitle>
          <DialogDescription>
            O CID é opcional no cadastro, mas fica restrito na listagem a quem tem RH + SST (dado de saúde, LGPD art. 5º II).
          </DialogDescription>
        </DialogHeader>
        {successNotice ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-md border border-amber-700/40 bg-amber-700/10 p-3 text-sm text-amber-900">
              <p className="font-semibold">Afastamento registrado</p>
              <p>{successNotice}</p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="absence-employee">Funcionário *</Label>
                <SelectNative
                  id="absence-employee"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value ? Number(event.target.value) : '')}
                >
                  <option value="">Selecione...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="absence-type">Tipo *</Label>
                <SelectNative id="absence-type" value={type} onChange={(event) => setType(event.target.value as hrApi.AbsenceType)}>
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="absence-start-date">Início *</Label>
                  <Input id="absence-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="absence-expected-end-date">Fim previsto</Label>
                  <Input
                    id="absence-expected-end-date"
                    type="date"
                    value={expectedEndDate}
                    onChange={(event) => setExpectedEndDate(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Vazio calcula automaticamente pelo tipo de afastamento.</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="absence-cid">CID</Label>
                <Input id="absence-cid" value={cid} onChange={(event) => setCid(event.target.value)} maxLength={10} placeholder="Ex.: M54" />
              </div>
              {type === 'maternidade' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4" checked={extendedProgram} onChange={(event) => setExtendedProgram(event.target.checked)} />
                  Adesão ao programa Empresa Cidadã (licença estendida a 180 dias)
                </label>
              )}
              {validationError && <p className="text-sm text-destructive">{validationError}</p>}
            </div>
            {error && <DidacticAlert error={error} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={mutation.isPending}>
                {mutation.isPending ? 'Registrando...' : 'Registrar afastamento'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReturnAbsenceDialog({ absence, onClose }: { absence: hrApi.Absence | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [actualEndDate, setActualEndDate] = React.useState('');
  const [error, setError] = React.useState<DidacticError | null>(null);
  const [needsAso, setNeedsAso] = React.useState(false);
  const [asoDialogOpen, setAsoDialogOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (absence) {
      setActualEndDate('');
      setError(null);
      setNeedsAso(false);
      setAsoDialogOpen(false);
      setSuccessNotice(null);
    }
  }, [absence]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hr-absences'] });

  const attemptReturn = async (endDate: string) => {
    if (!absence) return;
    setIsPending(true);
    setError(null);
    try {
      const result = await hrApi.returnFromAbsence(absence.id, endDate);
      invalidate();
      // RF-RH-047-A (2026-08-12): informa o RH quais benefícios VT/VR foram
      // religados automaticamente — mesmo padrão visual do aviso de período
      // aquisitivo zerado usado no diálogo de criação de afastamento.
      if (result.reactivated_benefits && result.reactivated_benefits.length > 0) {
        const names = result.reactivated_benefits.map((b) => b.category.toUpperCase()).join(', ');
        setSuccessNotice(
          `Retorno registrado. ${result.reactivated_benefits.length === 1 ? 'O benefício' : 'Os benefícios'} ${names} ${result.reactivated_benefits.length === 1 ? 'foi religado automaticamente' : 'foram religados automaticamente'} (suspensão de VT/VR encerrada).`,
        );
        return;
      }
      onClose();
    } catch (err) {
      if (getErrorCode(err) === RETURN_ASO_REQUIRED_CODE) {
        setNeedsAso(true);
        setError(
          translateApiError(
            err,
            'O retorno exige ASO de retorno válido',
            undefined,
            'Este afastamento passou de 30 dias — anexe o ASO de retorno para liberar o encerramento.',
          ),
        );
      } else {
        setError(translateApiError(err, 'Não foi possível registrar o retorno'));
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleAsoSubmit = async (file: File | null) => {
    if (!absence || !file) return;
    setIsPending(true);
    setError(null);
    try {
      await hrApi.createEmployeeDocument({
        employee_id: absence.employee_id,
        doc_type: 'aso_retorno',
        fitness_result: 'apto',
        file,
      });
      setAsoDialogOpen(false);
      setNeedsAso(false);
      await attemptReturn(actualEndDate);
    } catch (err) {
      setError(translateApiError(err, 'Não foi possível anexar o ASO de retorno'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Dialog open={Boolean(absence) && !asoDialogOpen} onOpenChange={(next) => !next && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar retorno de afastamento</DialogTitle>
            <DialogDescription>
              Afastamentos com mais de 30 dias exigem ASO de retorno válido (RF-RH-048) antes de encerrar.
            </DialogDescription>
          </DialogHeader>
          {successNotice ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-md border border-amber-700/40 bg-amber-700/10 p-3 text-sm text-amber-900">
                <p className="font-semibold">Retorno registrado</p>
                <p>{successNotice}</p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={onClose}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="absence-return-date">Data de retorno *</Label>
                  <Input id="absence-return-date" type="date" value={actualEndDate} onChange={(event) => setActualEndDate(event.target.value)} />
                </div>
              </div>
              {error && <DidacticAlert error={error} />}
              {needsAso && (
                <Button type="button" variant="outline" onClick={() => setAsoDialogOpen(true)}>
                  <FileUp className="size-4" /> Anexar ASO de retorno
                </Button>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!actualEndDate) {
                      setError({ title: 'Informe a data de retorno', reasons: ['A data de retorno é obrigatória.'] });
                      return;
                    }
                    attemptReturn(actualEndDate);
                  }}
                  disabled={isPending}
                >
                  {isPending ? 'Registrando...' : 'Confirmar retorno'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FileUploadDialog
        open={asoDialogOpen}
        title="Anexar ASO de retorno"
        description="Anexe o laudo de aptidão (PDF/imagem) — é o que libera o encerramento do afastamento (RF-RH-048)."
        fileRequired
        error={error}
        isPending={isPending}
        submitLabel="Anexar e confirmar retorno"
        onClose={() => setAsoDialogOpen(false)}
        onSubmit={handleAsoSubmit}
      />
    </>
  );
}
