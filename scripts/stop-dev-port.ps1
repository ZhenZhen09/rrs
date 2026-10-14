param(
  [int]$Port = 3001
)

$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -eq 0) {
  Write-Output "No listener found on port $Port."
  exit 0
}

$pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($processId in $pids) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if (-not $process) { continue }
  Write-Output "Stopping PID $processId ($($process.Name)): $($process.CommandLine)"
  Stop-Process -Id $processId -Force -ErrorAction Stop
}

Write-Output "Port $Port is available."
