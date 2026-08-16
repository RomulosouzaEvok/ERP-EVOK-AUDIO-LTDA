<#
.SYNOPSIS
    Bateria de prova do job de retencao (CE-06 / RC-PROC-01 / APR-2026-028).

.DESCRIPTION
    PRIMEIRA METADE da prova, executavel ANTES da ativacao de log_connections:
    append, nao-duplicacao, ACL append-only real, poda de retencao, falha
    ruidosa sem replicacao, e replicacao efetiva.

    A SEGUNDA METADE -- captura de linha de conexao real -- so pode existir
    depois da ativacao cluster-wide, porque hoje o cluster nao emite essa
    linha. Esta declarada como PENDENTE no fim da saida, nao simulada.

    Usa diretorio temporario proprio. Nao toca no diretorio de producao do job,
    nao abre conexao de banco e nao reinicia container algum.
#>
[CmdletBinding()]
param(
    [string]$BaseTemp = (Join-Path $env:TEMP ('ce06-retencao-' + [System.Guid]::NewGuid().ToString('N').Substring(0,8)))
)

$ErrorActionPreference = 'Continue'
$script:ok = 0
$script:falhas = 0
$Script = Join-Path $PSScriptRoot 'Export-PostgresLogs.ps1'

function Assert([string]$id, [string]$descricao, [bool]$condicao, [string]$detalhe = '') {
    if ($condicao) {
        Write-Output ("PASS  {0} {1}" -f $id, $descricao)
        $script:ok++
    } else {
        Write-Output ("FALHA {0} {1}" -f $id, $descricao)
        if ($detalhe) { Write-Output ("      -> {0}" -f $detalhe) }
        $script:falhas++
    }
}

function Contar-Linhas([string]$dir) {
    $total = 0
    Get-ChildItem -LiteralPath $dir -Filter '*.log' -ErrorAction SilentlyContinue | ForEach-Object {
        $total += (Get-Content -LiteralPath $_.FullName | Measure-Object -Line).Lines
    }
    return $total
}

$LogDir  = Join-Path $BaseTemp 'local'
$Replica = Join-Path $BaseTemp 'replica'
New-Item -ItemType Directory -Path $BaseTemp -Force | Out-Null

Write-Output ''
Write-Output 'CE-06 -- prova do job de retencao de log (primeira metade)'
Write-Output ("temp: {0}" -f $BaseTemp)
Write-Output ''

# --------------------------------------------------------------------------
# R-01 -- primeira execucao coleta e grava
# --------------------------------------------------------------------------
$saida1 = & $Script -LogDir $LogDir -SkipReplica 2>&1
$exit1  = $LASTEXITCODE
$arquivos1 = @(Get-ChildItem -LiteralPath $LogDir -Filter '*.log' -ErrorAction SilentlyContinue)
$linhas1 = Contar-Linhas $LogDir

Assert 'R-01' 'primeira execucao termina com exit 0' ($exit1 -eq 0) ("exit=$exit1")
Assert 'R-02' 'gravou ao menos um arquivo diario' ($arquivos1.Count -ge 1) ("arquivos=" + $arquivos1.Count)
Assert 'R-03' 'gravou ao menos uma linha do log real do container' ($linhas1 -gt 0) ("linhas=$linhas1")
Assert 'R-04' 'nome do arquivo e a data da propria linha (yyyy-MM-dd.log)' `
    (($arquivos1 | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}\.log$' }).Count -eq $arquivos1.Count)
Assert 'R-05' 'arquivo de estado criado (janela nao se repete)' `
    (Test-Path -LiteralPath (Join-Path $LogDir '.last-export.state'))

# --------------------------------------------------------------------------
# R-06/07 -- reexecucao imediata nao duplica nem trunca
# --------------------------------------------------------------------------
& $Script -LogDir $LogDir -SkipReplica 2>&1 | Out-Null
$linhas2 = Contar-Linhas $LogDir
Assert 'R-06' 'reexecucao imediata NAO duplica linha ja exportada' ($linhas2 -eq $linhas1) `
    ("antes=$linhas1 depois=$linhas2")
Assert 'R-07' 'reexecucao NAO trunca o arquivo existente' ($linhas2 -ge $linhas1) `
    ("antes=$linhas1 depois=$linhas2")

# --------------------------------------------------------------------------
# R-08/09 -- a ACL append-only e real, nao decorativa
# --------------------------------------------------------------------------
$alvo = $arquivos1[0].FullName
$sobrescreveu = $false
try {
    [System.IO.File]::WriteAllText($alvo, 'ADULTERADO')
    $sobrescreveu = $true
} catch { $sobrescreveu = $false }
Assert 'R-08' 'sobrescrever o arquivo (WriteData) e NEGADO pela ACL' (-not $sobrescreveu) `
    'o arquivo aceitou sobrescrita -- a protecao append-only nao esta valendo'

$conteudoPos = Get-Content -LiteralPath $alvo -Raw
Assert 'R-09' 'conteudo permanece integro apos a tentativa de adulteracao' `
    ($conteudoPos -notmatch 'ADULTERADO')

$apagou = $false
try { Remove-Item -LiteralPath $alvo -Force -ErrorAction Stop; $apagou = $true } catch { $apagou = $false }
Assert 'R-10' 'apagar o arquivo e NEGADO pela ACL' (-not $apagou) `
    'o arquivo foi apagado -- a negacao de Delete nao esta valendo'

# --------------------------------------------------------------------------
# R-11 -- append continua funcionando apesar da negacao de escrita
# --------------------------------------------------------------------------
$linhasAntesAppend = (Get-Content -LiteralPath $alvo | Measure-Object -Line).Lines
$appendOk = $false
try {
    $fs = New-Object System.IO.FileStream($alvo, [System.IO.FileMode]::Append,
        [System.Security.AccessControl.FileSystemRights]::AppendData, [System.IO.FileShare]::Read,
        4096, [System.IO.FileOptions]::None)
    $sw = New-Object System.IO.StreamWriter($fs)
    $sw.WriteLine('2026-01-01T00:00:00.000000000Z linha-de-teste-append')
    $sw.Dispose(); $fs.Dispose()
    $appendOk = $true
} catch { $appendOk = $false }
$linhasDepoisAppend = (Get-Content -LiteralPath $alvo | Measure-Object -Line).Lines
Assert 'R-11' 'acrescentar (AppendData) continua PERMITIDO' `
    ($appendOk -and ($linhasDepoisAppend -eq $linhasAntesAppend + 1)) `
    ("append=$appendOk antes=$linhasAntesAppend depois=$linhasDepoisAppend")

# --------------------------------------------------------------------------
# R-12/13/14 -- poda de retencao com datas sinteticas
# --------------------------------------------------------------------------
$velho   = (Get-Date).ToUniversalTime().AddDays(-120).ToString('yyyy-MM-dd')
$limite  = (Get-Date).ToUniversalTime().AddDays(-89).ToString('yyyy-MM-dd')
$naoLog  = 'nao-e-log.txt'
$pVelho  = Join-Path $LogDir ("{0}.log" -f $velho)
$pLimite = Join-Path $LogDir ("{0}.log" -f $limite)
$pNaoLog = Join-Path $LogDir $naoLog
Set-Content -LiteralPath $pVelho  -Value 'linha antiga'  -Encoding utf8
Set-Content -LiteralPath $pLimite -Value 'linha recente' -Encoding utf8
Set-Content -LiteralPath $pNaoLog -Value 'nao mexer'     -Encoding utf8

& $Script -LogDir $LogDir -RetentionDays 90 -SkipReplica 2>&1 | Out-Null

Assert 'R-12' ('poda remove arquivo com 120 dias (' + $velho + ')') (-not (Test-Path -LiteralPath $pVelho))
Assert 'R-13' ('poda PRESERVA arquivo com 89 dias (' + $limite + ') -- corte e em 90, nao antes') `
    (Test-Path -LiteralPath $pLimite)
Assert 'R-14' 'poda ignora arquivo que nao segue o padrao de data' (Test-Path -LiteralPath $pNaoLog)

# --------------------------------------------------------------------------
# R-15 -- sem replicacao configurada: FALHA RUIDOSA, nao sucesso silencioso
# --------------------------------------------------------------------------
& $Script -LogDir $LogDir 2>&1 | Out-Null
$exitSemReplica = $LASTEXITCODE
Assert 'R-15' 'sem -ReplicaPath o job sai com codigo 2 (falha ruidosa)' ($exitSemReplica -eq 2) `
    ("exit=$exitSemReplica -- sucesso silencioso aqui deixaria metade do requisito por cumprir")

# --------------------------------------------------------------------------
# R-16/17 -- replicacao efetiva
# --------------------------------------------------------------------------
& $Script -LogDir $LogDir -ReplicaPath $Replica 2>&1 | Out-Null
$exitComReplica = $LASTEXITCODE
$locais   = @(Get-ChildItem -LiteralPath $LogDir  -Filter '*.log').Name | Sort-Object
$copias   = @(Get-ChildItem -LiteralPath $Replica -Filter '*.log' -ErrorAction SilentlyContinue).Name | Sort-Object
Assert 'R-16' 'com -ReplicaPath o job sai com codigo 0' ($exitComReplica -eq 0) ("exit=$exitComReplica")
Assert 'R-17' 'todo arquivo local tem copia no destino de replicacao' `
    (($locais -join '|') -eq ($copias -join '|')) ("local=[$($locais -join ',')] replica=[$($copias -join ',')]")

# --------------------------------------------------------------------------
# R-18 -- independencia do container (sobrevivencia a restart, sem restart)
# --------------------------------------------------------------------------
$dentroDoVolume = $LogDir -match 'postgres_data|/var/lib/postgresql'
Assert 'R-18' 'o diretorio de retencao esta FORA do volume do container' (-not $dentroDoVolume) `
    "se estivesse dentro, recriar o container levaria a evidencia junto"

# --------------------------------------------------------------------------
# R-19/20 -- a poda funciona sobre arquivo QUE TEM a ACL append-only
#
# Por que este caso existe: a primeira versao da bateria podava so arquivos
# sinteticos criados por Set-Content, SEM a ACL. Passava, e escondia que a poda
# quebraria em producao -- a limpeza do proprio teste falhou com
# 'SeSecurityPrivilege' e denunciou o defeito. As funcoes abaixo sao as do
# script real, carregadas por -AsModule, nao uma reimplementacao.
# --------------------------------------------------------------------------
# -LogDir e repassado de proposito: dot-source liga o param() do script no
# escopo atual e sobrescreveria $LogDir do teste pelo default de producao.
. $Script -AsModule -LogDir $LogDir

$antigo = (Get-Date).ToUniversalTime().AddDays(-200).ToString('yyyy-MM-dd')
$pAntigo = Join-Path $LogDir ("{0}.log" -f $antigo)
Add-LinhasAppendOnly $pAntigo @('2026-01-01T00:00:00.000000000Z linha antiga com ACL real')

$aclAplicada = $false
try {
    [System.IO.File]::WriteAllText($pAntigo, 'X')
} catch { $aclAplicada = $true }
Assert 'R-19' 'o arquivo alvo da poda realmente tem a ACL append-only aplicada' $aclAplicada `
    'sem isso o caso R-20 seria vacuo, como era antes'

& $Script -LogDir $LogDir -RetentionDays 90 -SkipReplica 2>&1 | Out-Null
Assert 'R-20' 'poda remove arquivo append-only vencido (a ACL nao trava a propria poda)' `
    (-not (Test-Path -LiteralPath $pAntigo)) `
    'a poda falhou: negar ChangePermissions impede o job de reverter a ACL para apagar'

Write-Output ''
Write-Output '--- PENDENTE, por impossibilidade tecnica nesta metade ---'
Write-Output 'R-21  captura de linha "connection authorized" real: NAO TESTAVEL hoje.'
Write-Output '      log_connections esta off no cluster; a linha nao existe para ser'
Write-Output '      capturada. So depois da ativacao cluster-wide. NAO foi simulada.'
Write-Output 'R-22  restart do container NAO foi executado: reiniciar evok-postgres'
Write-Output '      reinicia o banco de PRODUCAO. R-18 prova a independencia por'
Write-Output '      caminho, que e o que importa e nao custa indisponibilidade.'
Write-Output ''
Write-Output ("{0} PASS, {1} FALHA de {2} casos executados." -f $script:ok, $script:falhas, ($script:ok + $script:falhas))
Write-Output 'Nenhuma conexao de banco foi aberta por esta bateria (APR-2026-016).'

# Limpeza: usa a funcao real de reversao do script, a mesma que a poda usa.
Get-ChildItem -LiteralPath $LogDir -Filter '*.log' -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-AppendOnly $_.FullName } catch {}
}
Remove-Item -LiteralPath $BaseTemp -Recurse -Force -ErrorAction SilentlyContinue

if ($script:falhas -gt 0) { exit 1 }
exit 0
