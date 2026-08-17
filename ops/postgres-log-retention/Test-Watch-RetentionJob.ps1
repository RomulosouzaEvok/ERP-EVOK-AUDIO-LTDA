<#
.SYNOPSIS
    Bateria de prova do vigilante do job de retencao (CE-06 / APR-2026-030).

.DESCRIPTION
    Exercita a funcao real Get-VeredictoRetencao carregada por -AsModule, nao
    uma reimplementacao. Estados sao injetados como parametro, entao os casos
    de falha (job parado ha dias, codigo de erro, arquivo ausente) sao provados
    de verdade em vez de aguardados.
#>
$ErrorActionPreference = 'Continue'
$ok = 0; $falhas = 0
$Alvo = Join-Path $PSScriptRoot 'Watch-RetentionJob.ps1'
. $Alvo -AsModule

function Assert([string]$id, [string]$desc, [bool]$cond, [string]$det = '') {
    if ($cond) { Write-Output ("PASS  {0} {1}" -f $id, $desc); $script:ok++ }
    else {
        Write-Output ("FALHA {0} {1}" -f $id, $desc)
        if ($det) { Write-Output ("      -> {0}" -f $det) }
        $script:falhas++
    }
}

$agora = Get-Date '2026-08-17 04:00:00'
$hoje  = $agora.AddHours(-1)     # rodou as 03h, dentro do esperado

Write-Output ''
Write-Output 'CE-06 -- prova do vigilante do job de retencao'
Write-Output ''

# --- caminho feliz -------------------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $hoje -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-01' 'rodou ha 1h, codigo 0, arquivo presente -> SEM alerta' (-not $v.Alerta) `
    ("motivos: " + ($v.Motivos -join '; '))

# --- falha declarada -----------------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $hoje -UltimoCodigo 1 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-02' 'codigo 1 (falha) -> ALERTA' $v.Alerta
Assert 'W-03' 'a mensagem de codigo 1 fala em perda de log, nao em pendencia' `
    (($v.Motivos -join ' ') -match 'FALHOU')

# --- o codigo 2 alerta de proposito --------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $hoje -UltimoCodigo 2 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-04' 'codigo 2 (replicacao pendente) -> ALERTA, nao silencio' $v.Alerta
Assert 'W-05' 'a mensagem do codigo 2 nomeia a pendencia, nao alega quebra' `
    (($v.Motivos -join ' ') -match 'replicacao para fora do host ainda PENDENTE') `
    ("motivos: " + ($v.Motivos -join '; '))

# --- falha silenciosa: o job parou de rodar ------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $agora.AddHours(-25) -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-06' '25h sem rodar (dentro da tolerancia de 26h) -> SEM alerta' (-not $v.Alerta) `
    ("motivos: " + ($v.Motivos -join '; '))

$v = Get-VeredictoRetencao -UltimaExecucao $agora.AddHours(-27) -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-07' '27h sem rodar (fora da tolerancia) -> ALERTA' $v.Alerta

$v = Get-VeredictoRetencao -UltimaExecucao $agora.AddDays(-6) -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-08' '6 dias sem rodar -> ALERTA (ja passou da margem do buffer)' $v.Alerta
Assert 'W-09' 'a mensagem de job parado explica a margem de 5-6 dias' `
    (($v.Motivos -join ' ') -match '5-6 dias')

# --- nunca executou ------------------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao ([datetime]::MinValue) -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-10' 'nunca executou -> ALERTA' $v.Alerta
Assert 'W-11' 'nunca executou NAO e reportado como "nao roda ha 800 mil horas"' `
    (($v.Motivos -join ' ') -match 'NUNCA executou') ("motivos: " + ($v.Motivos -join '; '))

# --- sentinelas REAIS do Agendador do Windows ----------------------------
# Estes tres casos nao existiam na primeira versao. Foram acrescentados depois
# que a execucao real contra a tarefa recem-criada reportou "nao roda ha
# 234165,3h" e "o job FALHOU" -- os dois enganos que W-11 e W-03 deveriam ter
# impedido. O teste usava um sentinela (DateTime.MinValue) que o Windows nao
# usa. Prova de que caso sintetico so vale se o valor sintetico for o real.
$nuncaRodou = Get-Date '1999-11-30 00:00:00'
$v = Get-VeredictoRetencao -UltimaExecucao $nuncaRodou -UltimoCodigo 267011 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-16' 'sentinela real do Windows (30/11/1999 + codigo 267011) -> "NUNCA executou"' `
    (($v.Motivos -join ' ') -match 'NUNCA executou') ("motivos: " + ($v.Motivos -join '; '))
Assert 'W-17' 'tarefa nunca executada NAO acumula tambem "o job FALHOU"' `
    (($v.Motivos -join ' ') -notmatch 'FALHOU') ("motivos: " + ($v.Motivos -join '; '))

$v = Get-VeredictoRetencao -UltimaExecucao $hoje -UltimoCodigo 267009 -Agora $agora -ArquivoDoDiaExiste $true
Assert 'W-18' 'codigo 267009 (em execucao agora) NAO e tratado como falha' (-not $v.Alerta) `
    ("motivos: " + ($v.Motivos -join '; '))

# --- rodou mas nao produziu ----------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $hoje -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $false
Assert 'W-12' 'codigo 0 mas sem arquivo do dia -> ALERTA (sucesso vazio)' $v.Alerta

# --- acumulo de motivos --------------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $agora.AddDays(-3) -UltimoCodigo 1 -Agora $agora -ArquivoDoDiaExiste $false
Assert 'W-13' 'tres problemas simultaneos geram tres motivos, nao um so' ($v.Motivos.Count -eq 3) `
    ("motivos=" + $v.Motivos.Count + ": " + ($v.Motivos -join '; '))

# --- tolerancia parametrizavel -------------------------------------------
$v = Get-VeredictoRetencao -UltimaExecucao $agora.AddHours(-27) -UltimoCodigo 0 -Agora $agora -ArquivoDoDiaExiste $true -HorasTolerancia 48
Assert 'W-14' 'tolerancia e respeitada quando aumentada para 48h' (-not $v.Alerta)

Write-Output ''
Write-Output '--- LIMITE DECLARADO, nao testavel aqui ---'
Write-Output 'W-15  Nao ha watchdog do watchdog: se a propria tarefa de vigilancia for'
Write-Output '      desabilitada ou a maquina ficar desligada, ninguem alerta. Escolha'
Write-Output '      consciente de proporcao, registrada em vez de silenciada.'
Write-Output ''
Write-Output ("{0} PASS, {1} FALHA de {2} casos." -f $ok, $falhas, ($ok + $falhas))
if ($falhas -gt 0) { exit 1 }
exit 0
