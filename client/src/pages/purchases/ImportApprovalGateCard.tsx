import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';

import * as comexApi from '@/api/comex';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AmberNoticeBox } from '@/components/AmberNoticeBox';
import { DidacticAlert } from '@/components/DidacticAlert';
import type { DidacticError } from '@/lib/translateApiError';

import { approverRoleLabel, translateComexError } from './comexShared';

/**
 * Bloco "Aprovação da diretoria" de um processo de importação (G11-COMEX,
 * decisão D-G de 2026-08-10).
 *
 * A situação exibida vem **inteiramente** de
 * `GET /api/comex/import-processes/:id/approvals` (props `approvalStatus`) —
 * nunca é inferida a partir do status do processo nem de um efeito colateral
 * (tentar aprovar, ou tentar embarcar e ler o 422). Se essa leitura falhar, o
 * card diz explicitamente que não sabe, em vez de chutar.
 */
export function ImportApprovalGateCard({
  importProcessId,
  processNumber,
  approvalStatus,
  isLoading,
  isError,
  onApproved,
}: {
  importProcessId: number;
  processNumber: string;
  approvalStatus: comexApi.ImportProcessApprovalStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  onApproved: () => void;
}) {
  const { user, hasModuleAccess } = useAuth();
  const [error, setError] = React.useState<DidacticError | null>(null);

  const approveMutation = useMutation({
    mutationFn: () => comexApi.approveImportProcess(importProcessId),
    onSuccess: () => {
      setError(null);
      onApproved();
    },
    onError: (err) => setError(translateComexError(err, `Não foi possível registrar a aprovação do processo ${processNumber}.`)),
  });

  /** Só UX: a autorização real é do backend (`authorizeModule('diretor')`). */
  const userCanApprove = hasModuleAccess('diretor');

  const approvalsByRole = new Map(approvalStatus?.approvals.map((approval) => [approval.approver_role, approval]) ?? []);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-brand" />
        <p className="text-sm font-semibold">Aprovação da diretoria</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Todo processo de importação precisa da aprovação da diretoria antes do embarque — não há faixa de valor. Depois do
        embarque, câmbio e frete já estão comprometidos, por isso a aprovação não é retroativa.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Consultando a situação da alçada...</p>}

      {isError && (
        <AmberNoticeBox size="xs">
          Não foi possível consultar a situação da aprovação agora. Recarregue a página antes de tentar embarcar — a tela não
          assume que o processo está aprovado.
        </AmberNoticeBox>
      )}

      {approvalStatus && (
        <>
          <ul className="flex flex-col gap-1.5">
            {approvalStatus.required_roles.map((role) => {
              const approval = approvalsByRole.get(role);
              return (
                <li key={role} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{approverRoleLabel(role)}</span>
                  <div className="flex items-center gap-2">
                    {approval ? (
                      <>
                        <Badge variant="success">Aprovado</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(approval.approved_at)}
                          {user && approval.approver_user_id === user.id ? ' · por você' : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">Pendente</Badge>
                        {approvalStatus.can_register_approval && userCanApprove && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate()}
                          >
                            {approveMutation.isPending ? 'Registrando...' : `Aprovar como ${approverRoleLabel(role)}`}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {!approvalStatus.approval_complete && !userCanApprove && (
            <p className="text-xs text-muted-foreground">
              Só um usuário com o papel Diretoria pode registrar esta aprovação. Encaminhe o processo {processNumber} para a
              diretoria antes de registrar o embarque.
            </p>
          )}

          {!approvalStatus.approval_complete && !approvalStatus.can_register_approval && (
            <p className="text-xs text-muted-foreground">
              O processo está fora de "Rascunho": a aprovação não pode mais ser registrada (não existe aprovação retroativa).
            </p>
          )}

          {approvalStatus.approval_complete && approvalStatus.process_status === 'draft' && (
            <p className="text-xs text-muted-foreground">
              Alçada satisfeita — o processo já pode ser embarcado. O embarque não aceita alteração de câmbio, frete, seguro
              ou outras despesas: são os valores que a diretoria aprovou.
            </p>
          )}
        </>
      )}

      {error && <DidacticAlert error={error} />}
    </div>
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR');
}
