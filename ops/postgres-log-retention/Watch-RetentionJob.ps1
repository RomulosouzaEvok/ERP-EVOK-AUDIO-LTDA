<#
.SYNOPSIS
    Vigia o job diario de retencao (CE-06) e alerta quando ele falha ou nao roda.

.DESCRIPTION
    Aprovado em APR-2026-030, texto do dono:

        "Configure um alerta simples para falha do job diario de retencao --
         mesmo que seja so um e-mail ou notificacao local quando o exit code
         nao for 0, ou quando o job nao rodar no horario esperado. Nao precisa
         ser sofisticado; precisa existir, dado que a margem real do buffer e
         de 5-6 dias, nao 'indefinida' como se estimou antes."

    POR QUE EXISTE. A medicao real feita na ativacao (EXECUCAO_JANELA.md secao 5)
    mostrou ~55.400 linhas e ~8,7 MB por dia -- o healthcheck do container e o
    pool do evok-api abrem conexao a cada 10s. Com os 50 MB de rotation do
    Docker, a margem antes de PERDER log e de ~5-6 dias. Um job que falha em
    silencio por uma semana significa evidencia perdida, e a evidencia perdida
    so aparece quando alguem precisa dela -- ou seja, tarde demais.

    TRES CONDICOES DE ALERTA:
      1. o job rodou e devolveu codigo diferente de 0 (falha declarada);
      2. o job nao roda ha mais tempo que o tolerado (falha silenciosa);
      3. nao existe arquivo de log do dia (o job "rodou" mas nao produziu nada).

    O codigo 2 -- replicacao para fora do host ainda pendente -- E tratado como
    alerta, de proposito. Ele nao e ruido: e o lembrete diario de que o CE-06
    nao esta satisfeito. Silencia-lo seria voltar a fingir que esta.

.NOTES
    LIMITE DECLARADO, para nao virar descoberta de auditoria futura: este
    vigilante e ele proprio uma tarefa agendada. Se a maquina estiver desligada
    ou a tarefa for desabilitada, ninguem alerta sobre o alerta. Nao ha
    watchdog do watchdog aqui, e isso e escolha consciente de proporcao --
    o alerta cobre o modo de falha comum (job quebrou, job parou), nao
    sabotagem nem maquina desligada por semanas.
#>
[CmdletBinding()]
param(
    [string] $TarefaNome    = 'CE-06 Retencao Log PostgreSQL',
    [string] $TarefaCaminho = '\EvokAudio\',
    # Vazio de proposito -- ver a mesma nota em Export-PostgresLogs.ps1:
    # $PSScriptRoot nao existe na avaliacao do param() sob `powershell.exe -File`.
    [string] $LogDir        = '',
    # 26h: o job roda 1x/dia as 03h00. Uma execucao perdida ainda cabe na
    # margem de 5-6 dias do buffer; duas ja comecam a apertar.
    [int]    $HorasTolerancia = 26,
    [switch] $SomenteVerificar,
    [switch] $AsModule
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($LogDir)) {
    $raiz = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($raiz)) { $raiz = Split-Path -Parent $MyInvocation.MyCommand.Path }
    $LogDir = Join-Path $raiz '..\..\coretriad\evidence\postgres-connection-logs'
}
$ArquivoAlertas = Join-Path $LogDir 'ALERTAS.log'

# ---------------------------------------------------------------------------
# Avaliacao pura: sem I/O, sem agendador, sem efeito colateral. Recebe o estado
# e devolve o veredito. E esta funcao que a bateria de prova exercita -- teste
# que depende do agendador real so consegue provar o estado de hoje.
# ---------------------------------------------------------------------------
function Get-VeredictoRetencao {
    param(
        [datetime] $UltimaExecucao,
        [int]      $UltimoCodigo,
        [datetime] $Agora,
        [bool]     $ArquivoDoDiaExiste,
        [int]      $HorasTolerancia = 26
    )
    $motivos = New-Object System.Collections.ArrayList
    $horas = [math]::Round(($Agora - $UltimaExecucao).TotalHours, 1)

    # Codigos do Agendador de Tarefas do Windows, descobertos por execucao real
    # e nao por documentacao: tarefa registrada e nunca executada devolve
    # LastTaskResult = 267011 (SCHED_S_TASK_HAS_NOT_RUN) e LastRunTime =
    # 30/11/1999, NAO DateTime.MinValue. A primeira versao desta funcao tratava
    # so MinValue e por isso reportou "nao roda ha 234165h" e "o job FALHOU"
    # para uma tarefa recem-criada -- exatamente os dois enganos que os casos
    # W-11 e W-03 existiam para impedir.
    $NUNCA_EXECUTOU = 267011   # 0x00041303
    $EM_EXECUCAO    = 267009   # 0x00041301
    $nunca = ($UltimaExecucao -le (Get-Date '2000-01-01')) -or ($UltimoCodigo -eq $NUNCA_EXECUTOU)

    if ($nunca) {
        [void]$motivos.Add('O job NUNCA executou pelo agendador. Enquanto isso, nenhuma evidencia esta sendo retida.')
    } elseif ($UltimoCodigo -eq $EM_EXECUCAO) {
        # Em execucao no momento nao e falha nem sucesso: nao alerta por isso.
        $UltimoCodigo = 0
    } elseif ($horas -gt $HorasTolerancia) {
        [void]$motivos.Add(
            ("O job nao roda ha {0}h (tolerancia {1}h). Falha SILENCIOSA: o buffer do Docker segura ~5-6 dias." -f $horas, $HorasTolerancia))
    }

    if ($nunca) {
        # ja reportado acima; nao acumular "o job FALHOU" por cima
    } elseif ($UltimoCodigo -eq 2) {
        [void]$motivos.Add(
            'Codigo 2: replicacao para fora do host ainda PENDENTE. A copia existe so nesta maquina, entao CE-06 nao esta satisfeito.')
    } elseif ($UltimoCodigo -ne 0) {
        [void]$motivos.Add(("Codigo {0}: o job FALHOU. Log de conexao pode estar sendo perdido." -f $UltimoCodigo))
    }

    if (-not $ArquivoDoDiaExiste) {
        [void]$motivos.Add('Nao existe arquivo de log com a data de hoje: o job rodou sem produzir evidencia, ou nao rodou.')
    }

    return [pscustomobject]@{
        Alerta  = ($motivos.Count -gt 0)
        Motivos = $motivos.ToArray()
        Horas   = $horas
    }
}

function Send-Notificacao([string]$titulo, [string]$texto) {
    # Balao da area de notificacao: nao exige privilegio administrativo nem
    # dependencia externa. Se nao houver sessao interativa, falha em silencio --
    # por isso o registro em arquivo abaixo e a fonte de verdade, e a
    # notificacao e so a camada que chama a atencao.
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        $icone = New-Object System.Windows.Forms.NotifyIcon
        $icone.Icon = [System.Drawing.SystemIcons]::Warning
        $icone.BalloonTipIcon  = [System.Windows.Forms.ToolTipIcon]::Warning
        $icone.BalloonTipTitle = $titulo
        $icone.BalloonTipText  = $texto
        $icone.Visible = $true
        $icone.ShowBalloonTip(20000)
        Start-Sleep -Seconds 8
        $icone.Dispose()
        return $true
    } catch {
        return $false
    }
}

if ($AsModule) { return }

# ---------------------------------------------------------------------------
# Coleta do estado real
# ---------------------------------------------------------------------------
$agora = Get-Date
$ultimaExecucao = [datetime]::MinValue
$ultimoCodigo = -1
$erroAgendador = ''
try {
    $info = Get-ScheduledTaskInfo -TaskName $TarefaNome -TaskPath $TarefaCaminho -ErrorAction Stop
    if ($null -ne $info.LastRunTime) { $ultimaExecucao = $info.LastRunTime }
    $ultimoCodigo = $info.LastTaskResult
} catch {
    $erroAgendador = $_.Exception.Message
}

$arquivoHoje = Join-Path $LogDir ((Get-Date -Format 'yyyy-MM-dd') + '.log')
$existeHoje = Test-Path -LiteralPath $arquivoHoje

$v = Get-VeredictoRetencao -UltimaExecucao $ultimaExecucao -UltimoCodigo $ultimoCodigo `
        -Agora $agora -ArquivoDoDiaExiste $existeHoje -HorasTolerancia $HorasTolerancia

# A propria ausencia da tarefa no agendador e alerta: significa que o controle
# foi removido, que e pior do que ele ter falhado.
if ($erroAgendador) {
    $v = [pscustomobject]@{
        Alerta  = $true
        Motivos = @(("A tarefa agendada nao foi encontrada: {0}. O controle do CE-06 deixou de existir." -f $erroAgendador))
        Horas   = 0
    }
}

Write-Output ("[{0}] verificacao do job de retencao (CE-06)" -f $agora.ToString('yyyy-MM-dd HH:mm:ss'))
Write-Output ("  ultima execucao : {0}" -f $ultimaExecucao)
Write-Output ("  ultimo codigo   : {0}" -f $ultimoCodigo)
Write-Output ("  arquivo de hoje : {0}" -f $existeHoje)

if (-not $v.Alerta) {
    Write-Output '  VEREDITO: OK'
    exit 0
}

$texto = ($v.Motivos -join [Environment]::NewLine)
Write-Output '  VEREDITO: ALERTA'
foreach ($m in $v.Motivos) { Write-Output ("    - {0}" -f $m) }

if ($SomenteVerificar) { exit 1 }

# Registro em arquivo: fonte de verdade do alerta, independe de haver alguem
# olhando a tela no momento.
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$bloco = @()
$bloco += ("=== {0} ALERTA -- job de retencao CE-06" -f $agora.ToString('yyyy-MM-dd HH:mm:ss'))
$bloco += ("    ultima execucao: {0} | codigo: {1} | arquivo de hoje: {2}" -f $ultimaExecucao, $ultimoCodigo, $existeHoje)
foreach ($m in $v.Motivos) { $bloco += ("    - {0}" -f $m) }
Add-Content -LiteralPath $ArquivoAlertas -Value $bloco -Encoding utf8

$notificou = Send-Notificacao 'CE-06 -- job de retencao de log' $texto
Write-Output ("  registrado em   : {0}" -f $ArquivoAlertas)
Write-Output ("  notificacao     : {0}" -f $notificou)
exit 1
