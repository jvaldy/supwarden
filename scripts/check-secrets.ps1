param(
  [string]$Root = "."
)

$patterns = @(
  "GOCSPX-",
  "AKIA[0-9A-Z]{16}",
  "-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----",
  "MERCURE_JWT_SECRET\\s*=\\s*[^_].+",
  "APP_SECRET\\s*=\\s*[^_].+"
)

$gitFiles = @()

try {
  Push-Location $Root
  $gitFiles = git ls-files 2>$null
  Pop-Location
} catch {
  if ((Get-Location).Path -ne (Resolve-Path $Root).Path) {
    Pop-Location
  }
}

if ($gitFiles.Count -gt 0) {
  $files = $gitFiles |
    ForEach-Object { Join-Path $Root $_ } |
    Where-Object { Test-Path $_ } |
    ForEach-Object { Get-Item $_ }
} else {
  $files = Get-ChildItem -Path $Root -Recurse -File |
    Where-Object {
      $_.FullName -notmatch "\\.git\\\\" -and
      $_.FullName -notmatch "node_modules\\\\" -and
      $_.FullName -notmatch "vendor\\\\" -and
      $_.FullName -notmatch "var\\\\cache\\\\"
    }
}

$matches = @()

foreach ($file in $files) {
  $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { continue }

  foreach ($pattern in $patterns) {
    if ($content -match $pattern) {
      $matches += [PSCustomObject]@{
        File = $file.FullName
        Pattern = $pattern
      }
    }
  }
}

if ($matches.Count -gt 0) {
  Write-Host "Secrets potentiels detectes :" -ForegroundColor Red
  $matches | Sort-Object File, Pattern | Format-Table -AutoSize
  exit 1
}

Write-Host "Aucune fuite evidente detectee." -ForegroundColor Green
exit 0
