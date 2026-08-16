<#
.SYNOPSIS
    Exporta o log do container PostgreSQL para arquivo append-only no host,
    com retencao de 90 dias e replicacao para fora do host.

.DESCRIPTION
    Requisito de saida do criterio CE-06 da classe de risco RC-PROC-01
    (coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md).
    Aprovado em APR-2026-028 secao 3, texto do dono:

        "Aprovo a retencao proposta: copia diaria para arquivo append-only
         fora do container, 90 dias, replicado para fora do host."

    POR QUE ESTE JOB EXISTE. O rotation nativo do Docker configurado em
    docker-compose.yml (json-file, max-size 10m, max-file 5 = ate 50 MB) serve
    para disponibilidade operacional de curto prazo, mas NAO serve como
    evidencia de auditoria: roda por sobrescrita, nao tem copia externa, e o
    proprio container pode ser recriado levando o log junto. Evidencia que o
    auditado pode apagar nao e evidencia.

    ESCOPO. O fluxo de log e do CONTAINER, um so para o cluster inteiro. Nao ha
    separacao por banco: o mesmo arquivo cobre o banco de teste e o de
    producao. Isso e consequencia direta da topologia (uma instancia, dois
    bancos) registrada como PEND-2026-007, e nao um defeito deste job.

    NAO ABRE CONEXAO DE BANCO. Este script le `docker logs` e nada mais.
    Nenhum psql, nenhum pg_dump, nenhuma credencial de banco (APR-2026-016).

.PARAMETER LogDir
    Diretorio no host onde ficam os arquivos diarios. Fora do volume do
    container por definicao. Default: coretriad/evidence/postgres-connection-logs/
    dentro do proprio projeto, por decisao do dono em 2026-08-16, para que a
    evidencia fique a mao para copia manual (pendrive) sem depender de rede.

    ESTA PASTA ESTA NO .gitignore DE PROPOSITO. Log de conexao nomeia usuario,
    banco e host de producao: e evidencia operacional, nao artefato de codigo, e
    nao vai para o GitHub. O que e versionado e o job e a prova de que ele
    funciona -- nunca o conteudo capturado.

.PARAMETER ReplicaPath
    Destino da replicacao para FORA do host. Sem este parametro o job grava a
    copia local e termina com codigo 2 (falha ruidosa), nunca com sucesso
    silencioso: metade do requisito aprovado nao teria sido cumprida.

    ESTADO EM 2026-08-16: nao ha destino definido. A replicacao para fora do
    host permanece PENDENCIA ABERTA por decisao do dono -- a copia fica so nesta
    maquina por enquanto. O codigo 2 diario e deliberado: e o lembrete de que o
    requisito aprovado em APR-2026-028 secao 3 ainda nao esta inteiro. Nao
    silencie esse codigo sem antes resolver a replicacao ou registrar aceitacao
    do residuo em APPROVALS.md.

.PARAMETER RetentionDays
    Dias de retencao local. Default 90, conforme APR-2026-028 secao 3.

.PARAMETER SkipReplica
    Declara explicitamente que esta execucao nao replica. Use SOMENTE em teste.
    Torna a ausencia de replicacao uma decisao registrada em vez de um
    esquecimento silencioso.

.NOTES
    Limites declarados, para nao virarem descoberta de auditoria futura:

    1. Append-only vale contra a conta de servico, nao contra Administrador.
       Quem tem privilegio administrativo no host pode tomar posse do arquivo e
       reescreve-lo. A durabilidade real vem da replicacao para fora do host.
    2. A poda precisa de permissao de exclusao, entao o proprio job remove a
       ACE de negacao antes de apagar arquivo vencido. Um job que poda e um job
       que consegue apagar. Mitigacao: toda exclusao e registrada na saida, e a
       copia replicada nao e podada por este script.
    3. Janela entre execucoes: o que o Docker rotacionar antes da proxima
       execucao se perde. Com 50 MB de buffer e execucao diaria a margem e
       larga, mas nao e infinita.
#>
[CmdletBinding()]
param(
    [string]   $Container     = 'evok-postgres',
    [string]   $LogDir        = (Join-Path $PSScriptRoot '..\..\coretriad\evidence\postgres-connection-logs'),
    [string]   $ReplicaPath   = '',
    [int]      $RetentionDays = 90,
    [switch]   $SkipReplica,
    # Define as funcoes e retorna sem executar nada, para que a bateria de prova
    # exercite ESTAS funcoes e nao uma reimplementacao delas. Teste que
    # reimplementa a logica prova a si mesmo, nao o codigo.
    [switch]   $AsModule
)

$ErrorActionPreference = 'Stop'
$EXIT_OK              = 0
$EXIT_ERRO            = 1
$EXIT_SEM_REPLICACAO  = 2

$StateFile = Join-Path $LogDir '.last-export.state'

function Write-Etapa([string]$texto) {
    Write-Output ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texto)
}

# ---------------------------------------------------------------------------
# Append-only: nega sobrescrita (WriteData) e exclusao (Delete), permite
# acrescimo (AppendData). Herdanca desligada para que uma ACL permissiva no
# diretorio pai nao anule a protecao.
# ---------------------------------------------------------------------------
# Get-Acl traz tambem a secao de auditoria (SACL); devolver isso ao Set-Acl
# exige o privilegio SeSecurityPrivilege, que uma conta comum nao tem, e a
# operacao falha mesmo quando so a DACL mudou. Por isso as duas funcoes montam
# um FileSecurity novo e gravam apenas a secao de acesso.
function Set-AppendOnly([string]$path) {
    $identidade = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = New-Object System.Security.AccessControl.FileSecurity
    $acl.SetAccessRuleProtection($true, $false)

    # A negacao NAO inclui ChangePermissions nem TakeOwnership, e isso e
    # deliberado. Negar esses dois quebra a propria poda: o job perde o
    # privilegio de reverter a ACL e nao consegue apagar arquivo vencido --
    # descoberto pela bateria de prova, nao por raciocinio. E seria protecao
    # aparente de qualquer forma, porque o dono de um arquivo em NTFS sempre
    # pode retomar o controle da DACL. O que a ACL entrega de verdade e:
    # sobrescrita e exclusao acidentais ficam impossiveis sem um ato deliberado
    # e visivel de alterar permissao. Durabilidade contra ato deliberado vem da
    # replicacao para fora do host, nao daqui.
    $permitir = [System.Security.AccessControl.FileSystemRights]'ReadData, AppendData, ReadAttributes, ReadExtendedAttributes, ReadPermissions, ChangePermissions, Synchronize'
    $negar    = [System.Security.AccessControl.FileSystemRights]'WriteData, Delete'

    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identidade, $permitir, 'Allow')))
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identidade, $negar, 'Deny')))
    [System.IO.File]::SetAccessControl($path, $acl)
}

function Remove-AppendOnly([string]$path) {
    $identidade = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = New-Object System.Security.AccessControl.FileSecurity
    $acl.SetAccessRuleProtection($false, $false)
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identidade, 'FullControl', 'Allow')))
    [System.IO.File]::SetAccessControl($path, $acl)
}

# Acrescenta respeitando a ACL append-only: FileMode Append pede so AppendData.
function Add-LinhasAppendOnly([string]$path, [string[]]$linhas) {
    $novo = -not (Test-Path -LiteralPath $path)
    if ($novo) {
        [System.IO.File]::WriteAllText($path, '', [System.Text.Encoding]::UTF8)
        Set-AppendOnly $path
    }
    # FileAccess.Write pede WriteData, que a ACL nega de proposito. O acrescimo
    # tem de pedir exatamente AppendData -- e por isso usa o construtor que
    # recebe FileSystemRights em vez de FileAccess. Se este open passar a pedir
    # WriteData de novo, o job para de funcionar em vez de furar a protecao.
    $fs = New-Object System.IO.FileStream(
        $path,
        [System.IO.FileMode]::Append,
        [System.Security.AccessControl.FileSystemRights]::AppendData,
        [System.IO.FileShare]::Read,
        4096,
        [System.IO.FileOptions]::None)
    try {
        $sw = New-Object System.IO.StreamWriter($fs, (New-Object System.Text.UTF8Encoding($false)))
        try { foreach ($l in $linhas) { $sw.WriteLine($l) } }
        finally { $sw.Dispose() }
    } finally { $fs.Dispose() }
}

if ($AsModule) { return }

# ---------------------------------------------------------------------------
# 1. Diretorio local
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    Write-Etapa "diretorio criado: $LogDir"
}

# ---------------------------------------------------------------------------
# 2. Janela de coleta. O estado guarda o instante da ultima exportacao para que
#    reexecucao no mesmo dia nao duplique linha ja gravada.
# ---------------------------------------------------------------------------
$agora = (Get-Date).ToUniversalTime()
if (Test-Path -LiteralPath $StateFile) {
    $desde = (Get-Content -LiteralPath $StateFile -Raw).Trim()
} else {
    # Primeira execucao: pega tudo que o buffer do Docker ainda tem.
    $desde = '2000-01-01T00:00:00Z'
    Write-Etapa 'primeira execucao: coletando todo o buffer disponivel'
}
$ate = $agora.ToString("yyyy-MM-ddTHH:mm:ss.fffffff") + 'Z'
Write-Etapa "janela: $desde -> $ate"

# ---------------------------------------------------------------------------
# 3. Coleta. --timestamps garante prefixo RFC3339 em cada linha, o que permite
#    arquivar no dia correto mesmo quando o job roda atrasado.
# ---------------------------------------------------------------------------
# O PostgreSQL escreve seu log em stderr. Em Windows PowerShell 5.1, redirecionar
# stderr de executavel nativo com 2>&1 transforma cada linha em ErrorRecord e faz
# $? virar $false mesmo com exit 0. Por isso a redirecao e feita pelo cmd.exe, e
# a saida chega como texto puro.
$bruto = Join-Path $env:TEMP ("pglogs-" + [System.Guid]::NewGuid().ToString('N') + ".tmp")
$cmd = 'docker logs {0} --timestamps --since {1} --until {2} > "{3}" 2>&1' -f $Container, $desde, $ate, $bruto
& cmd.exe /c $cmd
$codigoDocker = $LASTEXITCODE
if ($codigoDocker -ne 0) {
    $detalhe = ''
    if (Test-Path -LiteralPath $bruto) { $detalhe = Get-Content -LiteralPath $bruto -Raw }
    Remove-Item -LiteralPath $bruto -Force -ErrorAction SilentlyContinue
    Write-Error "docker logs falhou (exit $codigoDocker): $detalhe"
    exit $EXIT_ERRO
}
$linhas = @()
if (Test-Path -LiteralPath $bruto) {
    $linhas = @(Get-Content -LiteralPath $bruto | Where-Object { $_.Length -gt 0 })
    Remove-Item -LiteralPath $bruto -Force -ErrorAction SilentlyContinue
}
Write-Etapa ("linhas coletadas: {0}" -f $linhas.Count)

# ---------------------------------------------------------------------------
# 4. Arquivamento por dia, pela data da PROPRIA linha
# ---------------------------------------------------------------------------
$porDia = @{}
$diaFallback = $agora.ToString('yyyy-MM-dd')
foreach ($linha in $linhas) {
    $dia = $diaFallback
    if ($linha -match '^(\d{4}-\d{2}-\d{2})T') { $dia = $Matches[1] }
    if (-not $porDia.ContainsKey($dia)) { $porDia[$dia] = New-Object System.Collections.ArrayList }
    [void]$porDia[$dia].Add($linha)
}

foreach ($dia in ($porDia.Keys | Sort-Object)) {
    $arquivo = Join-Path $LogDir ("{0}.log" -f $dia)
    Add-LinhasAppendOnly $arquivo $porDia[$dia].ToArray()
    Write-Etapa ("gravado append: {0} (+{1} linhas)" -f $arquivo, $porDia[$dia].Count)
}

# Estado so avanca depois da gravacao: se a gravacao falhar, a proxima execucao
# recoleta a mesma janela em vez de pular o intervalo.
Set-Content -LiteralPath $StateFile -Value $ate -Encoding utf8

# ---------------------------------------------------------------------------
# 5. Poda de retencao
# ---------------------------------------------------------------------------
$corte = $agora.Date.AddDays(-$RetentionDays)
$podados = 0
Get-ChildItem -LiteralPath $LogDir -Filter '*.log' | ForEach-Object {
    $nome = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $dataArquivo = [datetime]::MinValue
    if ([datetime]::TryParseExact($nome, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::None, [ref]$dataArquivo)) {
        if ($dataArquivo -lt $corte) {
            Remove-AppendOnly $_.FullName
            Remove-Item -LiteralPath $_.FullName -Force
            Write-Etapa ("podado (>{0} dias): {1}" -f $RetentionDays, $_.Name)
            $podados++
        }
    }
}
Write-Etapa ("podados: {0}" -f $podados)

# ---------------------------------------------------------------------------
# 6. Replicacao para fora do host
# ---------------------------------------------------------------------------
if ($SkipReplica) {
    Write-Etapa 'REPLICACAO PULADA por -SkipReplica (uso de teste, decisao explicita)'
    exit $EXIT_OK
}

if ([string]::IsNullOrWhiteSpace($ReplicaPath)) {
    Write-Warning @'
REPLICACAO NAO CONFIGURADA. A copia local foi gravada, mas o requisito
aprovado em APR-2026-028 secao 3 exige replicacao para FORA do host. Enquanto
-ReplicaPath nao for definido, o CE-06 NAO pode ser considerado satisfeito:
log que vive so na maquina auditada nao sobrevive ao incidente que deveria
documentar. Saindo com codigo 2 de proposito, para que o agendador registre
falha em vez de sucesso.
'@
    exit $EXIT_SEM_REPLICACAO
}

if (-not (Test-Path -LiteralPath $ReplicaPath)) {
    New-Item -ItemType Directory -Path $ReplicaPath -Force | Out-Null
}
$copiados = 0
Get-ChildItem -LiteralPath $LogDir -Filter '*.log' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $ReplicaPath $_.Name) -Force
    $copiados++
}
Write-Etapa ("replicados para {0}: {1} arquivos" -f $ReplicaPath, $copiados)
exit $EXIT_OK
