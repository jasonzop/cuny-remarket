$ports = @(3001, 5173)
$stopped = $false

foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port"

  foreach ($line in $lines) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }

    if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
      $pidToStop = [int]$parts[4]

      try {
        Stop-Process -Id $pidToStop -Force -ErrorAction Stop
        Write-Output "Stopped process $pidToStop on port $port"
        $stopped = $true
      } catch {
        Write-Output "Could not stop process $pidToStop on port $port"
      }
    }
  }
}

if (-not $stopped) {
  Write-Output "No dev servers were running on ports 3001 or 5173."
}
