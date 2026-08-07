import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import * as facilitiesApi from '@/api/facilities';
import { WidgetCard } from '@/pages/home/WidgetCard';

/**
 * Widget `facilities-pendencias` — vencimentos próximos para quem tem o
 * módulo `facilities`: CNH de condutores (`cnh_expiring`), documentos de
 * veículo (`document_expiring`) e multas com prazo de indicação vencendo
 * (`deadline_expiring_days`). Usa `limit: 1` nas listagens (só precisamos
 * do total da paginação), exceto multas onde filtramos por janela de 7 dias
 * diretamente no backend.
 */
export function FacilitiesPendenciasWidget() {
  const {
    data: expiringVehicleDocs,
    isLoading: isVehiclesLoading,
    isError: isVehiclesError,
  } = useQuery({
    queryKey: ['facilities-widget-vehicles-document-expiring'],
    queryFn: () => facilitiesApi.listVehicles({ document_expiring: true, limit: 1 }),
  });

  const {
    data: expiringDrivers,
    isLoading: isDriversLoading,
    isError: isDriversError,
  } = useQuery({
    queryKey: ['facilities-widget-drivers-cnh-expiring'],
    queryFn: () => facilitiesApi.listDrivers({ cnh_expiring: true, limit: 1 }),
  });

  const {
    data: expiringFines,
    isLoading: isFinesLoading,
    isError: isFinesError,
  } = useQuery({
    queryKey: ['facilities-widget-fines-deadline-expiring'],
    queryFn: () => facilitiesApi.listFines({ indication_status: 'pending', deadline_expiring_days: 7, limit: 1 }),
  });

  const vehiclesCount = expiringVehicleDocs?.pagination.total ?? 0;
  const driversCount = expiringDrivers?.pagination.total ?? 0;
  const finesCount = expiringFines?.pagination.total ?? 0;
  const total = vehiclesCount + driversCount + finesCount;
  const isLoading = isVehiclesLoading || isDriversLoading || isFinesLoading;
  const isError = isVehiclesError || isDriversError || isFinesError;

  return (
    <WidgetCard
      icon={Building2}
      title="Vencimentos de Facilities"
      to="/facilities"
      actionLabel="Ir para Facilities"
      isLoading={isLoading}
      isError={isError}
      errorTitle='Não foi possível carregar o resumo de "Vencimentos de Facilities"'
    >
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-semibold tabular-nums ${total > 0 ? 'text-destructive' : ''}`}>{total}</p>
        <span className="text-xs text-muted-foreground">no total</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {vehiclesCount} documento(s) de veículo vencendo · {driversCount} CNH vencendo · {finesCount} multa(s) com prazo de indicação vencendo
      </p>
    </WidgetCard>
  );
}
