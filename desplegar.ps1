$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$envPath = Join-Path $root '.env'
$backendEnvPath = Join-Path $root 'backend/.env'

function Get-EnvValue {
    param(
        [string]$FilePath,
        [string]$Key
    )

    if (-not (Test-Path $FilePath)) { return $null }

    foreach ($line in (Get-Content -Path $FilePath)) {
        if ($line -match "^\s*${Key}\s*=\s*(.*)$") {
            $value = $Matches[1].Trim()
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                return $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }

    return $null
}

function New-Password {
    param([int]$Length = 32)

    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*()-_=+'.ToCharArray()
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)

    $builder = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $Length; $i++) {
        $index = [int]($bytes[$i] % $chars.Length)
        [void]$builder.Append($chars[$index])
    }

    return $builder.ToString()
}

if (-not (Test-Path $backendEnvPath)) {
    throw "No se encuentra backend/.env. Se cancela el despliegue para proteger la configuracion del proyecto."
}

$saPassword = Get-EnvValue -FilePath $envPath -Key 'MSSQL_SA_PASSWORD'
if ([string]::IsNullOrWhiteSpace($saPassword)) { $saPassword = New-Password }

$redisPassword = Get-EnvValue -FilePath $envPath -Key 'REDIS_PASSWORD'
if ([string]::IsNullOrWhiteSpace($redisPassword)) { $redisPassword = New-Password }

$rootEnv = @()
if (Test-Path $envPath) { $rootEnv = Get-Content -Path $envPath }
$rootEnv = @($rootEnv | Where-Object { $_ -notmatch '^\s*(MSSQL_SA_PASSWORD|REDIS_PASSWORD)\s*=' })
$rootEnv += "MSSQL_SA_PASSWORD=`"$saPassword`""
$rootEnv += "REDIS_PASSWORD=`"$redisPassword`""
Set-Content -Path $envPath -Value $rootEnv -Encoding UTF8

Write-Host 'Secretos de contenedores listos. backend/.env se conserva sin cambios.'
Write-Host 'Iniciando docker compose up --build -d...'

Push-Location $root
try {
    & docker compose up --build -d
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
