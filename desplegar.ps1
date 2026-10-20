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

    $groups = @(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'abcdefghijklmnopqrstuvwxyz',
        '0123456789',
        '!@#%^&*()-_=+'
    )
    $chars = ($groups -join '').ToCharArray()
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)

    $builder = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $groups.Count; $i++) {
        $group = $groups[$i].ToCharArray()
        [void]$builder.Append($group[[int]($bytes[$i] % $group.Length)])
    }
    for ($i = $groups.Count; $i -lt $Length; $i++) {
        $index = [int]($bytes[$i] % $chars.Length)
        [void]$builder.Append($chars[$index])
    }

    return $builder.ToString()
}

function Test-EnlaceServidor {
    param([string]$Value)

    $address = $null
    if ([System.Net.IPAddress]::TryParse($Value, [ref]$address)) {
        return $address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork
    }

    if ($Value.Length -gt 253) { return $false }
    foreach ($label in $Value.Split('.')) {
        if ($label.Length -gt 63 -or $label -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$') {
            return $false
        }
    }
    return $true
}

if (-not (Test-Path $backendEnvPath)) {
    throw "No se encuentra backend/.env. Se cancela el despliegue para proteger la configuracion del proyecto."
}

$puertos = @{}
foreach ($nombrePuerto in @('PUERTO_API', 'PUERTO_BROKER', 'PUERTO_SOCKET')) {
    $valorPuerto = Get-EnvValue -FilePath $backendEnvPath -Key $nombrePuerto
    $numeroPuerto = 0
    if ([string]::IsNullOrWhiteSpace($valorPuerto) -or
        -not [int]::TryParse($valorPuerto, [ref]$numeroPuerto) -or
        $numeroPuerto -lt 1 -or $numeroPuerto -gt 65535) {
        throw "No existe un valor válido para $nombrePuerto en backend/.env; no se puede desplegar sin ese puerto."
    }
    $puertos[$nombrePuerto] = $numeroPuerto
}

$enlaceServidor = Read-Host 'Dominio o IPv4 para ENLACE_SERVIDOR'
if (-not (Test-EnlaceServidor -Value $enlaceServidor)) {
    throw 'El enlace debe ser un dominio o una dirección IPv4 válida.'
}

$directorioPredeterminado = Join-Path ([System.IO.Path]::GetPathRoot($root)) 'sgala-archivos'
$directorioSolicitado = Read-Host "Directorio persistente para certificados y archivos [$directorioPredeterminado]"
if ([string]::IsNullOrWhiteSpace($directorioSolicitado)) {
    $directorioSolicitado = $directorioPredeterminado
}
$directorioHost = [System.IO.Path]::GetFullPath($directorioSolicitado).Replace('\', '/')
New-Item -ItemType Directory -Path $directorioHost -Force | Out-Null

$saPassword = Get-EnvValue -FilePath $envPath -Key 'MSSQL_SA_PASSWORD'
if ([string]::IsNullOrWhiteSpace($saPassword)) { $saPassword = New-Password }

$redisPassword = Get-EnvValue -FilePath $envPath -Key 'REDIS_PASSWORD'
if ([string]::IsNullOrWhiteSpace($redisPassword)) { $redisPassword = New-Password }

$rootEnv = @()
if (Test-Path $envPath) { $rootEnv = Get-Content -Path $envPath }
$rootEnv = @($rootEnv | Where-Object { $_ -notmatch '^\s*(MSSQL_SA_PASSWORD|REDIS_PASSWORD|ENLACE_SERVIDOR|DIRECTORIO_HOST|DIRECTORIO|PUERTO_API|PUERTO_BROKER|PUERTO_SOCKET|VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY)\s*=' })
$rootEnv += "MSSQL_SA_PASSWORD=`"$saPassword`""
$rootEnv += "REDIS_PASSWORD=`"$redisPassword`""
$rootEnv += "ENLACE_SERVIDOR=`"$enlaceServidor`""
$rootEnv += "DIRECTORIO_HOST=`"$directorioHost`""
$rootEnv += 'DIRECTORIO="/archivos"'
$rootEnv += "PUERTO_API=`"$($puertos['PUERTO_API'])`""
$rootEnv += "PUERTO_BROKER=`"$($puertos['PUERTO_BROKER'])`""
$rootEnv += "PUERTO_SOCKET=`"$($puertos['PUERTO_SOCKET'])`""
$rootEnv += 'VAPID_PUBLIC_KEY="pendiente"'
$rootEnv += 'VAPID_PRIVATE_KEY="pendiente"'
Set-Content -Path $envPath -Value $rootEnv -Encoding UTF8

Write-Host 'Generando claves VAPID nuevas...'

Push-Location $root
try {
    & docker compose build backend
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $keyOutput = @(& docker compose run --rm --no-deps backend node -e 'const k=require(String.fromCharCode(119,101,98,45,112,117,115,104)).generateVAPIDKeys(); console.log(k.publicKey); console.log(k.privateKey);')
    if ($LASTEXITCODE -ne 0 -or $keyOutput.Count -lt 2) {
        throw 'No se pudieron generar las claves VAPID.'
    }
    $vapidPublicKey = $keyOutput[$keyOutput.Count - 2].Trim()
    $vapidPrivateKey = $keyOutput[$keyOutput.Count - 1].Trim()
    if ([string]::IsNullOrWhiteSpace($vapidPublicKey) -or [string]::IsNullOrWhiteSpace($vapidPrivateKey)) {
        throw 'No se pudieron generar las claves VAPID.'
    }

    $rootEnv = @(Get-Content -Path $envPath | Where-Object { $_ -notmatch '^\s*VAPID_(PUBLIC|PRIVATE)_KEY\s*=' })
    $rootEnv += "VAPID_PUBLIC_KEY=`"$vapidPublicKey`""
    $rootEnv += "VAPID_PRIVATE_KEY=`"$vapidPrivateKey`""
    Set-Content -Path $envPath -Value $rootEnv -Encoding UTF8

    Write-Host 'Generando certificados TLS en el volumen seleccionado...'
    $certificateCode = 'require(String.fromCharCode(46,47,115,114,99,47,115,101,114,118,105,99,105,111,115,47,99,101,114,116,105,102,105,99,97,100,111,115,46,115,101,114,118,105,99,105,111)).asegurarCertificadosServidor()'
    & docker compose run --rm --no-deps backend node -r ts-node/register -r tsconfig-paths/register -e $certificateCode
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron preparar los certificados TLS en el volumen.' }

    Write-Host 'Configuración de despliegue lista. backend/.env se conserva sin cambios.'
    Write-Host 'Recreando SQL Server para aplicar entrypoint.sh actualizado...'
    & docker compose up -d --force-recreate sqlserver
    if ($LASTEXITCODE -ne 0) {
        $composeExitCode = $LASTEXITCODE
        Write-Host 'No se pudo iniciar SQL Server. Logs recientes:'
        & docker compose logs --tail=100 sqlserver
        exit $composeExitCode
    }

    Write-Host 'Iniciando docker compose up --build -d...'
    & docker compose up --build -d
    if ($LASTEXITCODE -ne 0) {
        $composeExitCode = $LASTEXITCODE
        Write-Host 'El despliegue falló. Logs recientes de SQL Server:'
        & docker compose logs --tail=100 sqlserver
        exit $composeExitCode
    }
}
finally {
    Pop-Location
}
