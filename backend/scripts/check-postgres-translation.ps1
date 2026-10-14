param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('climatic-pg-translation-' + [Guid]::NewGuid().ToString('N'))
$testData = Join-Path $testRoot 'data'
$pgCtl = Join-Path $PostgresBin 'pg_ctl.exe'
$initDb = Join-Path $PostgresBin 'initdb.exe'
if (!(Test-Path -LiteralPath $pgCtl) -or !(Test-Path -LiteralPath $initDb)) { throw 'PostgreSQL binaries not found.' }
$portProbe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$testPort = $portProbe.LocalEndpoint.Port
$portProbe.Stop()
try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    & $initDb -D $testData -U climatic_translation_test --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C *> (Join-Path $testRoot 'init.log')
    if ($LASTEXITCODE -ne 0) { throw ('initdb failed; inspect ' + $testRoot) }
    $startArgs = @('-D', ('"' + $testData + '"'), '-l', ('"' + (Join-Path $testRoot 'server.log') + '"'), '-o', ('"-h 127.0.0.1 -p ' + $testPort + ' -F"'), '-w', 'start')
    $start = Start-Process -FilePath $pgCtl -ArgumentList $startArgs -WindowStyle Hidden -PassThru
    $start.WaitForExit()
    if ($start.ExitCode -ne 0) { throw ('Temporary PostgreSQL startup failed; inspect ' + $testRoot) }
    & node (Join-Path $PSScriptRoot 'check-postgres-translation.js') --temporary-cluster $testPort
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL translation checks failed.' }
    & node (Join-Path $PSScriptRoot 'check-postgres-backend.js') --temporary-cluster $testPort
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backend checks failed.' }
} finally {
    if (Test-Path -LiteralPath (Join-Path $testData 'postmaster.pid')) {
        $stop = Start-Process -FilePath $pgCtl -ArgumentList @('-D', ('"' + $testData + '"'), '-m', 'fast', '-w', 'stop') -WindowStyle Hidden -PassThru
        $stop.WaitForExit()
        if ($stop.ExitCode -ne 0) { throw ('Could not stop temporary PostgreSQL: ' + $testRoot) }
    }
    # Verify the resolved target is our unique temporary directory before deletion.
    if (Test-Path -LiteralPath $testRoot) {
        $resolvedTestRoot = (Resolve-Path -LiteralPath $testRoot).Path
        $expectedParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
        if ([IO.Path]::GetDirectoryName($resolvedTestRoot) -ne $expectedParent -or [IO.Path]::GetFileName($resolvedTestRoot) -notmatch '^climatic-pg-translation-[a-f0-9]{32}$') {
            throw 'Temporary directory validation failed; nothing was deleted.'
        }
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    }
}
