param(
  [switch]$KeepStack
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$localProjectRoot = Join-Path $PSScriptRoot "phase3c-local"
$localConfig = Join-Path $localProjectRoot "supabase/config.toml"
$disposableSentinel = Join-Path $localProjectRoot ".disposable-local-validation"
$fixturePath = Join-Path $PSScriptRoot "fixtures/pre_phase_3a_schema.sql"
$fixtureGrantsPath = Join-Path $PSScriptRoot "fixtures/pre_phase_3a_runtime_grants.sql"
$migrationPath = Join-Path $repositoryRoot "supabase/migrations/202607170001_add_safeguarding_privacy_foundations.sql"
$phase4aMigrationPath = Join-Path $repositoryRoot "supabase/migrations/202607180001_add_event_decision_information.sql"
$testPath = Join-Path $PSScriptRoot "phase3c-rls-rpc.sql"
$phase4aTestPath = Join-Path $PSScriptRoot "phase4a-event-decision-info.sql"
$catalogPath = Join-Path $PSScriptRoot "catalog-snapshot.sql"
$expectedAuthPath = Join-Path $PSScriptRoot "bootstrap-expected-auth.sql"
$currentSchemaPath = Join-Path $repositoryRoot "supabase/schema.sql"
$projectId = "phase3c-safeguarding-validation"
$expectedDatabase = "phase3c_expected"
$dbContainer = $null
$stackStarted = $false

function Assert-LastExitCode([string]$operation) {
  if ($LASTEXITCODE -ne 0) {
    throw "$operation failed with exit code $LASTEXITCODE."
  }
}

function Invoke-PsqlText(
  [string]$database,
  [string]$sql,
  [switch]$Capture
) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    if ($Capture) {
      $output = @(
        $sql | & docker exec -i $script:dbContainer psql -X -A -t -v ON_ERROR_STOP=1 -U postgres -d $database 2>&1 |
          ForEach-Object { $_.ToString() }
      )
      $exitCode = $LASTEXITCODE
    } else {
      $sql | & docker exec -i $script:dbContainer psql -X -q -v ON_ERROR_STOP=1 -U postgres -d $database *> $null
      $exitCode = $LASTEXITCODE
    }
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0) {
    if ($Capture) {
      $diagnostic = ($output | Out-String).Trim()
      throw "PostgreSQL command failed with exit code $exitCode.`n$diagnostic"
    }
    throw "PostgreSQL command failed with exit code $exitCode."
  }
  if ($Capture) {
    return @($output)
  }
}

function Invoke-PsqlFile(
  [string]$database,
  [string]$path,
  [switch]$Capture
) {
  $sql = Get-Content -Raw -LiteralPath $path
  return Invoke-PsqlText -database $database -sql $sql -Capture:$Capture
}

function Stop-DisposableStack {
  if (-not $script:stackStarted -or $KeepStack) {
    return
  }

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $stopOutput = & npm.cmd exec supabase -- --workdir $script:localProjectRoot stop --no-backup 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0) {
    Write-Warning "The disposable local stack did not stop cleanly. Run: npm.cmd exec supabase -- --workdir supabase/tests/phase3c-local stop --no-backup"
  }
}

Push-Location $repositoryRoot
try {
  if (-not (Test-Path -LiteralPath $disposableSentinel)) {
    throw "Disposable validation sentinel is missing. Refusing database operations."
  }
  if (-not (Test-Path -LiteralPath $localConfig)) {
    throw "Isolated Supabase config is missing."
  }

  $remoteMarkers = @(
    "supabase/.temp/project-ref",
    ".supabase/project-ref",
    "supabase/tests/phase3c-local/supabase/.temp/project-ref",
    "supabase/tests/phase3c-local/.supabase/project-ref"
  )
  foreach ($marker in $remoteMarkers) {
    if (Test-Path -LiteralPath (Join-Path $repositoryRoot $marker)) {
      throw "Remote-link marker detected at $marker. Refusing database operations."
    }
  }
  $localBranchMarker = Join-Path $localProjectRoot "supabase/.branches/_current_branch"
  if (
    (Test-Path -LiteralPath $localBranchMarker) -and
    (Get-Content -Raw -LiteralPath $localBranchMarker).Trim() -ne "main"
  ) {
    throw "Unexpected branch state in the isolated local project. Refusing database operations."
  }

  $config = Get-Content -Raw -LiteralPath $localConfig
  if ($config -notmatch 'project_id\s*=\s*"phase3c-safeguarding-validation"') {
    throw "Unexpected isolated project ID."
  }
  if ($config -notmatch '(?ms)^\[db\]\s*.*?^port\s*=\s*55322\s*$') {
    throw "The isolated database port is not the approved localhost port 55322."
  }
  if ($config -notmatch 'site_url\s*=\s*"http://127\.0\.0\.1:3000"') {
    throw "The isolated Auth site URL is not loopback-only."
  }
  if ($config -notmatch '(?ms)^\[db\.migrations\]\s*.*?^enabled\s*=\s*false\s*$') {
    throw "Automatic migrations must remain disabled in the isolated project."
  }
  if ($config -notmatch '(?ms)^\[db\.seed\]\s*.*?^enabled\s*=\s*false\s*$') {
    throw "Automatic seeding must remain disabled in the isolated project."
  }

  & docker version --format "{{.Server.Version}}" *> $null
  Assert-LastExitCode "Docker server preflight"
  $supabaseVersion = (& npm.cmd exec supabase -- --version 2>&1 | Select-Object -Last 1).ToString().Trim()
  Assert-LastExitCode "Supabase CLI preflight"

  $fixture = Get-Content -Raw -LiteralPath $fixturePath
  if ($fixture -match '(?im)^\s*insert\s+into\s+' -or $fixture -match 'safeguarding_staff_designations|safety_reports|data_rights_requests|restricted_workflow_audit_events') {
    throw "The pre-Phase-3A fixture contains seed data or Phase 3A objects."
  }

  $phase3aCommit = (& git log -1 --format=%H -- "supabase/migrations/202607170001_add_safeguarding_privacy_foundations.sql").ToString().Trim()
  Assert-LastExitCode "Phase 3A migration commit lookup"
  if (-not $phase3aCommit) {
    throw "The commit that introduced the Phase 3A migration was not found."
  }
  $committedSchema = @(
    & git show "${phase3aCommit}^:supabase/schema.sql"
  )
  Assert-LastExitCode "Pre-Phase-3A historical schema read"
  $seedMarker = [Array]::IndexOf(
    $committedSchema,
    "-- Fake seed data only. These rows are for local/demo development and should be"
  )
  if ($seedMarker -lt 0) {
    throw "The committed schema seed marker was not found."
  }
  $fixtureBody = (
    ($fixture -split "`r?`n") |
      Select-Object -Skip 4 |
      Where-Object { $_.Trim().Length -gt 0 } |
      ForEach-Object { $_.TrimEnd() }
  ) -join "`n"
  $historicalBody = (
    $committedSchema[0..($seedMarker - 1)] |
      Where-Object { $_.Trim().Length -gt 0 } |
      ForEach-Object { $_.TrimEnd() }
  ) -join "`n"
  if ($fixtureBody -ne $historicalBody) {
    throw "The test fixture no longer matches the committed pre-Phase-3A schema snapshot."
  }

  $existingContainers = @(& docker ps -a --filter "label=com.supabase.cli.project=$projectId" --format "{{.Names}}")
  Assert-LastExitCode "Disposable container inspection"
  if ($existingContainers.Count -gt 0 -and ($existingContainers -join "").Trim().Length -gt 0) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $cleanupOutput = & npm.cmd exec supabase -- --workdir $localProjectRoot stop --no-backup 2>&1
      $cleanupExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousPreference
    }
    if ($cleanupExitCode -ne 0) {
      throw "Disposable stack cleanup failed with exit code $cleanupExitCode."
    }
  }

  Write-Output "Starting isolated local Supabase stack (startup credentials suppressed)."
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $startOutput = & npm.cmd exec supabase -- --workdir $localProjectRoot start 2>&1
    $startExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($startExitCode -ne 0) {
    throw "Isolated Supabase startup failed with exit code $startExitCode."
  }
  $stackStarted = $true

  $dbContainers = @(
    @(& docker ps --filter "label=com.supabase.cli.project=$projectId" --format "{{.Names}}") |
      Where-Object { $_ -like "supabase_db_*" }
  )
  Assert-LastExitCode "Local database container discovery"
  if ($dbContainers.Count -ne 1) {
    throw "Expected exactly one isolated local database container, found $($dbContainers.Count)."
  }
  $dbContainer = $dbContainers[0].Trim()

  $publishedPorts = @(& docker port $dbContainer 5432/tcp 2>&1)
  Assert-LastExitCode "Local database port inspection"
  if (-not ($publishedPorts -match ':55322$')) {
    throw "The isolated database container is not published on the approved local port 55322."
  }

  $postgresVersion = (Invoke-PsqlText -database "postgres" -sql "show server_version;" -Capture | Select-Object -First 1).ToString().Trim()
  Write-Output "local_database_host=127.0.0.1"
  Write-Output "local_database_port=55322"
  Write-Output "docker_database_container=$dbContainer"
  Write-Output "supabase_cli_version=$supabaseVersion"
  Write-Output "postgres_version=$postgresVersion"

  Invoke-PsqlText -database "postgres" -sql @"
drop schema if exists public cascade;
create schema public authorization postgres;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
"@
  Write-Output "Cleared only the sentinel-protected disposable public schema."

  Invoke-PsqlFile -database "postgres" -path $fixturePath
  Write-Output "Applied historically recovered pre-Phase-3A fixture."

  Invoke-PsqlFile -database "postgres" -path $fixtureGrantsPath
  Write-Output "Applied documented test-only reconstruction of the pre-existing profiles read grant."

  Invoke-PsqlFile -database "postgres" -path $migrationPath
  Write-Output "Applied only 202607170001_add_safeguarding_privacy_foundations.sql."

  Invoke-PsqlFile -database "postgres" -path $phase4aMigrationPath
  Write-Output "Applied only 202607180001_add_event_decision_information.sql."

  $testOutput = Invoke-PsqlFile -database "postgres" -path $testPath -Capture
  $testText = $testOutput -join "`n"
  if ($testText -notmatch 'PHASE3C_DATABASE_TESTS_PASSED') {
    throw "Database test suite did not emit its success marker."
  }
  $testOutput | Where-Object { $_ -match 'ok - |PHASE3C_DATABASE_TESTS_PASSED' } | Write-Output

  $phase4aTestOutput = Invoke-PsqlFile -database "postgres" -path $phase4aTestPath -Capture
  $phase4aTestText = $phase4aTestOutput -join "`n"
  if ($phase4aTestText -notmatch 'PHASE4A_EVENT_INFO_TESTS_PASSED') {
    throw "Phase 4A database test suite did not emit its success marker."
  }
  $phase4aTestOutput |
    Where-Object { $_ -match 'ok - |PHASE4A_EVENT_INFO_TESTS_PASSED' } |
    Write-Output

  Invoke-PsqlText -database "postgres" -sql "drop database if exists $expectedDatabase with (force); create database $expectedDatabase;"
  Invoke-PsqlFile -database $expectedDatabase -path $expectedAuthPath

  $currentSchema = @(Get-Content -LiteralPath $currentSchemaPath)
  $currentSeedMarker = [Array]::IndexOf(
    $currentSchema,
    "-- Fake seed data only. These rows are for local/demo development and should be"
  )
  if ($currentSeedMarker -lt 0) {
    throw "The current schema seed marker was not found."
  }
  $currentSchemaWithoutSeed = $currentSchema[0..($currentSeedMarker - 1)] -join "`n"
  Invoke-PsqlText -database $expectedDatabase -sql $currentSchemaWithoutSeed
  Invoke-PsqlFile -database $expectedDatabase -path $fixtureGrantsPath

  $actualCatalog = Invoke-PsqlFile -database "postgres" -path $catalogPath -Capture
  $expectedCatalog = Invoke-PsqlFile -database $expectedDatabase -path $catalogPath -Capture
  $catalogDifference = @(Compare-Object -ReferenceObject $expectedCatalog -DifferenceObject $actualCatalog)
  if ($catalogDifference.Count -gt 0) {
    Write-Output "Schema catalog differences:"
    $catalogDifference | Format-Table -AutoSize | Out-String | Write-Output
    throw "The migrated local catalog differs from current supabase/schema.sql."
  }
  Write-Output "Schema catalog comparison passed for tables, columns, constraints, indexes, functions, triggers, RLS, policies, and grants."

  Invoke-PsqlText -database "postgres" -sql "drop database if exists $expectedDatabase with (force);"
  Write-Output "PHASE3C_LOCAL_VALIDATION_PASSED"
}
finally {
  Stop-DisposableStack
  Pop-Location
}
