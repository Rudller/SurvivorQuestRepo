<#
.SYNOPSIS
  Kompiluje szkic lampki i wgrywa go na płytkę XIAO ESP32-C6 po USB.

.EXAMPLE
  .\flash.ps1                      # led_matrix_ble (firmware lampki), port wykryty sam
  .\flash.ps1 led_test_256         # inny szkic z folderu sketches\
  .\flash.ps1 -Port COM7           # konkretny port
  .\flash.ps1 -CompileOnly         # tylko sprawdź, czy się kompiluje
  .\flash.ps1 -Monitor             # po wgraniu pokaż Serial (Ctrl+C kończy)
  .\flash.ps1 -List                # lista szkiców
#>
param(
  [Parameter(Position = 0)]
  [string]$Sketch = "led_matrix_ble",
  [string]$Port,
  [switch]$CompileOnly,
  [switch]$Monitor,
  [switch]$List
)

$ErrorActionPreference = "Stop"
$Fqbn = "esp32:esp32:XIAO_ESP32C6"
$SketchesDir = Join-Path $PSScriptRoot "sketches"

if ($List) {
  Get-ChildItem $SketchesDir -Directory | ForEach-Object { $_.Name }
  exit 0
}

# arduino-cli: z PATH albo ten dołączony do Arduino IDE.
$cli = (Get-Command arduino-cli -ErrorAction SilentlyContinue).Source
if (-not $cli) {
  $cli = "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
}
if (-not (Test-Path $cli)) {
  throw "Nie znalazłem arduino-cli. Zainstaluj Arduino IDE albo dodaj arduino-cli do PATH."
}

# Szkic: nazwa folderu z sketches\ albo pełna ścieżka do folderu szkicu.
$sketchPath = if (Test-Path $Sketch) { (Resolve-Path $Sketch).Path } else { Join-Path $SketchesDir $Sketch }
if (-not (Test-Path $sketchPath)) {
  $names = (Get-ChildItem $SketchesDir -Directory | ForEach-Object { $_.Name }) -join ", "
  throw "Nie ma szkicu '$Sketch'. Dostępne: $names"
}

# FastLED 3.10.7 nie kompiluje się na C6 z core 3.3.12 bez tej flagi
# (FL_NO_EXCEPT). Plik znika przy aktualizacji core esp32 — wtedy go odtwarzamy.
$coreDir = Get-ChildItem "$env:LOCALAPPDATA\Arduino15\packages\esp32\hardware\esp32" -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending | Select-Object -First 1
if ($coreDir) {
  $localTxt = Join-Path $coreDir.FullName "platform.local.txt"
  if (-not (Test-Path $localTxt)) {
    Write-Host "Dodaję poprawkę FastLED: $localTxt" -ForegroundColor Yellow
    Set-Content -Path $localTxt -Value "compiler.cpp.extra_flags=-DFL_NO_EXCEPT=" -Encoding ascii
  }
}

Write-Host "Kompiluję $(Split-Path $sketchPath -Leaf)..." -ForegroundColor Cyan
& $cli compile --fqbn $Fqbn $sketchPath
if ($LASTEXITCODE -ne 0) { throw "Kompilacja nie przeszła." }
if ($CompileOnly) { Write-Host "Kompilacja OK." -ForegroundColor Green; exit 0 }

# Port: pierwszy port USB, na którym arduino-cli widzi płytkę ESP32.
if (-not $Port) {
  $boards = (& $cli board list --format json | ConvertFrom-Json).detected_ports
  $esp = $boards | Where-Object {
    $_.port.protocol -eq "serial" -and ($_.matching_boards | Where-Object { $_.fqbn -like "esp32:*" })
  } | Select-Object -First 1
  if (-not $esp) {
    & $cli board list
    throw "Nie widzę lampki na USB. Podłącz ją kablem z danymi albo podaj -Port COMx."
  }
  $Port = $esp.port.address
}

Write-Host "Wgrywam na $Port..." -ForegroundColor Cyan
& $cli upload --fqbn $Fqbn -p $Port $sketchPath
if ($LASTEXITCODE -ne 0) {
  throw "Wgrywanie nie przeszło. Zamknij Serial Monitor w Arduino IDE (blokuje port) albo przytrzymaj BOOT przy podłączaniu płytki."
}
Write-Host "Gotowe — lampka ma nowy kod." -ForegroundColor Green

if ($Monitor) {
  & $cli monitor -p $Port --config baudrate=115200
}
