# scripts/schedule-backup-task.ps1
# Registra o backup automatico diario do Postgres (scripts/backup-postgres.ps1)
# no Agendador de Tarefas do Windows. Uso pontual, uma vez por ambiente
# (dev, homologacao ou producao Windows) — nao precisa rodar de novo a cada
# deploy, apenas quando o horario/retencao mudar.
#
# Uso:
#   .\scripts\schedule-backup-task.ps1
#   .\scripts\schedule-backup-task.ps1 -Time "03:00" -Retention 14
#
# Requer sessao PowerShell com privilegio de administrador (Register-ScheduledTask
# grava no Agendador de Tarefas do Windows, escopo de maquina).

param(
    [string]$TaskName = "EvokAudioPostgresBackup",
    [string]$Time = "03:00",
    [int]$Retention = 14
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "scripts\backup-postgres.ps1"

if (-not (Test-Path $scriptPath)) {
    throw "Script de backup nao encontrado em $scriptPath"
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Retention $Retention" `
    -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force `
    -Description "Backup diario do PostgreSQL do ERP EVOK AUDIO (evok-postgres), com retencao de $Retention dumps."

Write-Host "Tarefa '$TaskName' registrada: roda todo dia as $Time, retencao de $Retention backups."
Write-Host "Para verificar: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "Para remover:   Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
