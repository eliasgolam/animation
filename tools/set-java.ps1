$ErrorActionPreference = 'SilentlyContinue'

$found = @()
# 1) Bevorzugt: Android Studio JBR (JDK 17 kompatibel)
$studioJbr = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $studioJbr) { $found += $studioJbr }

# 2) Temurin (Adoptium)
if (Test-Path 'C:\Program Files\Eclipse Adoptium') {
  $found += (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory | Where-Object { $_.Name -match 'jdk-17' } | Select-Object -ExpandProperty FullName)
}

# 3) Microsoft Build of OpenJDK
if (Test-Path 'C:\Program Files\Microsoft') {
  $found += (Get-ChildItem 'C:\Program Files\Microsoft' -Directory | Where-Object { $_.Name -match 'jdk-17' } | Select-Object -ExpandProperty FullName)
}

# 4) Oracle/Allgemein
if (Test-Path 'C:\Program Files\Java') {
  $found += (Get-ChildItem 'C:\Program Files\Java' -Directory | Where-Object { $_.Name -match 'jdk-17' } | Select-Object -ExpandProperty FullName)
}

$found = $found | Sort-Object -Unique
if ($found.Count -eq 0) {
  Write-Host 'NO_JDK17_FOUND'
  Write-Host 'Installiere Temurin 17 (einmalig), dann starte diesen Prompt erneut:'
  Write-Host 'winget install --id EclipseAdoptium.Temurin.17.JDK -e --source winget'
  exit 1
}

$jdk = $found[0]
Write-Host "USING_JDK $jdk"

# Session + persistent setzen
$env:JAVA_HOME = $jdk
[Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk, 'User')
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

# Verifizieren
java -version
& .\android\gradlew.bat -version


