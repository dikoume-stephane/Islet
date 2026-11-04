# Lance Islet en mode developpement avec des reglages Cargo qui menagent la RAM.
#
# Un `tauri dev` a froid compile ~600 crates. Avec le reglage par defaut
# ("un job rustc par coeur"), la machine peut manquer de memoire ; rustc est
# alors tue en plein vol, laisse des fichiers tronques derriere lui et la
# compilation echoue sur des erreurs trompeuses du genre
# "only metadata stub found for rlib dependency `core`".
#
# Usage :
#   .\scripts\dev.ps1              # 2 jobs en parallele (sans risque par defaut)
#   .\scripts\dev.ps1 -Jobs 4      # plus rapide si vous avez 16 Go ou plus
#   .\scripts\dev.ps1 -Clean       # vide target/ avant de relancer (apres un echec)

param(
    [int]$Jobs = 2,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot/.."
Set-Location $root

Write-Host "`n==> Etat de la machine" -ForegroundColor Cyan

$ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
Write-Host "    RAM totale      : $ramGb Go"
Write-Host "    C: libre        : $freeGb Go (il en faut ~15 pour un build a froid)"

$host1 = (rustc -vV | Select-String "^host:").ToString().Trim()
Write-Host "    Cible Rust      : $host1"
if ($host1 -notmatch "x86_64") {
    Write-Host "    ATTENTION : toolchain 32 bits. Un rustc 32 bits plafonne a ~3 Go" -ForegroundColor Yellow
    Write-Host "    de RAM et provoque des 'LLVM ERROR: out of memory' meme avec de la" -ForegroundColor Yellow
    Write-Host "    memoire libre. Corrigez avec : rustup default stable-x86_64-pc-windows-msvc" -ForegroundColor Yellow
}

if ($freeGb -lt 10) {
    Write-Host "    ATTENTION : peu d'espace disque. Lancez 'cargo clean' dans src-tauri." -ForegroundColor Yellow
}

if ($Clean) {
    Write-Host "`n==> Nettoyage de src-tauri/target" -ForegroundColor Cyan
    Push-Location src-tauri
    try { cargo clean } finally { Pop-Location }
}

$env:CARGO_BUILD_JOBS = "$Jobs"
Write-Host "`n==> Compilation avec $Jobs job(s) en parallele" -ForegroundColor Cyan
Write-Host "    (le premier build prend 10-20 min, les suivants quelques secondes)`n" -ForegroundColor DarkGray

bun run tauri dev
