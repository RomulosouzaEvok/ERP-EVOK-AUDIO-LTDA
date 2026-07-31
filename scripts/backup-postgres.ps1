# scripts/backup-postgres.ps1
# Backup automatizado do Postgres do container `evok-postgres` (Docker).
#
# Uso:
#   .\scripts\backup-postgres.ps1
#   .\scripts\backup-postgres.ps1 -Retention 10
#   .\scripts\backup-postgres.ps1 -Container evok-postgres -Db erp_evok_audio -User evok_admin -OutDir backups
#
# Politica de retencao: mantem os N backups mais recentes (default 14) do
# padrao `erp_evok_audio_*.dump` dentro de -OutDir e apaga os mais antigos.
# O diretorio de saida fica FORA do volume Docker (backups/ na raiz do repo,
# listado no .gitignore) para nao depender do ciclo de vida do container/volume.

param(
    [string]$Container = "evok-postgres",
    [string]$Db = "erp_evok_audio",
    [string]$User = "evok_admin",
    [string]$OutDir = "backups",
    [int]$Retention = 14,
    [int]$MaxAttempts = 3,
    [int]$RetryWaitSeconds = 30
)

$ErrorActionPreference = "Stop"

function Send-BackupFailureAlert {
    param([string]$Message)
    # Write-Warning (nao Write-Error): com $ErrorActionPreference="Stop"
    # ativo neste script, Write-Error se tornaria terminante e abortaria
    # esta funcao ANTES de notificar o webhook.
    Write-Warning "ERRO: $Message"
    $webhookUrl = $env:AUDIT_ALERT_WEBHOOK_URL
    if ($webhookUrl) {
        try {
            $body = @{ text = "[ERP EVOK AUDIO] Falha no backup do Postgres ($Db): $Message" } | ConvertTo-Json
            Invoke-RestMethod -Uri $webhookUrl -Method Post -ContentType 'application/json' -Body $body | Out-Null
        } catch {
            Write-Warning "Falha ao notificar webhook de alerta: $_"
        }
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $repoRoot $OutDir
if (-not (Test-Path $outPath)) {
    New-Item -ItemType Directory -Path $outPath | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fileName = "${Db}_${timestamp}.dump"
$hostFilePath = Join-Path $outPath $fileName
$containerTmpPath = "/tmp/$fileName"

Write-Host "Iniciando dump de '$Db' no container '$Container'..."

# Retry com backoff: uma falha pontual (ex.: container ainda subindo logo
# apos um reboot, quando o backup roda via Task Scheduler) nao deve
# desistir na primeira tentativa e so voltar a rodar no dia seguinte.
$dumpSucceeded = $false
for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
        docker exec $Container pg_dump -U $User -d $Db -Fc -Z 9 -f $containerTmpPath
        if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou com codigo $LASTEXITCODE" }

        docker cp "${Container}:${containerTmpPath}" $hostFilePath
        if ($LASTEXITCODE -ne 0) { throw "docker cp falhou com codigo $LASTEXITCODE" }

        docker exec $Container rm -f $containerTmpPath
        $dumpSucceeded = $true
        break
    } catch {
        Write-Warning "Tentativa $attempt/$MaxAttempts de backup falhou: $_"
        if ($attempt -lt $MaxAttempts) {
            Start-Sleep -Seconds $RetryWaitSeconds
        }
    }
}

if (-not $dumpSucceeded) {
    Send-BackupFailureAlert -Message "pg_dump/docker cp falharam apos $MaxAttempts tentativas."
    exit 1
}

$sizeKb = [Math]::Round((Get-Item $hostFilePath).Length / 1KB, 1)
Write-Host "Backup criado: $hostFilePath ($sizeKb KB)"

# Retencao: mantem apenas os $Retention arquivos mais recentes deste banco.
$allBackups = Get-ChildItem -Path $outPath -Filter "${Db}_*.dump" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt $Retention) {
    $toDelete = $allBackups | Select-Object -Skip $Retention
    foreach ($f in $toDelete) {
        Write-Host "Removendo backup antigo (retencao=$Retention): $($f.Name)"
        Remove-Item $f.FullName -Force
    }
}

Write-Host "Backups atuais mantidos: $([Math]::Min($allBackups.Count, $Retention)) de $($allBackups.Count) encontrados."
