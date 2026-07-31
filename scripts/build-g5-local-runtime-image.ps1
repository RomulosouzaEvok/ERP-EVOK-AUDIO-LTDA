param(
  [string]$ImageTag = "erp-evok-audio-server:g5-smoke"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ServerDir = Join-Path $RepoRoot "server"
$RuntimeDir = Join-Path $ServerDir "tmp\docker-runtime"

if (Test-Path $RuntimeDir) {
  Remove-Item -LiteralPath $RuntimeDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

Push-Location $ServerDir
try {
  npm ci
  npm run build
  npm prune --omit=dev

  Copy-Item -LiteralPath "package.json" -Destination $RuntimeDir
  Copy-Item -LiteralPath "package-lock.json" -Destination $RuntimeDir
  Copy-Item -LiteralPath "Dockerfile.local-runtime" -Destination (Join-Path $RuntimeDir "Dockerfile")
  Copy-Item -LiteralPath "dist" -Destination $RuntimeDir -Recurse
  Copy-Item -LiteralPath "config" -Destination $RuntimeDir -Recurse
  Copy-Item -LiteralPath "node_modules" -Destination $RuntimeDir -Recurse

  npm ci
}
finally {
  Pop-Location
}

docker build -t $ImageTag $RuntimeDir
