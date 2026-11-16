# Lee de Outlook clásico los eventos entre dos fechas y los imprime como JSON.
# Lo lanza outlook.mjs; sale con código 2 si Outlook clásico no está disponible.
param(
  [Parameter(Mandatory = $true)][string]$From,
  [Parameter(Mandatory = $true)][string]$To
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $outlook = New-Object -ComObject Outlook.Application
} catch {
  [Console]::Error.WriteLine("OUTLOOK_NO_COM")
  exit 2
}
$folder = $outlook.GetNamespace("MAPI").GetDefaultFolder(9)
$items = $folder.Items
$items.IncludeRecurrences = $true
$items.Sort("[Start]")
$fromDate = [DateTimeOffset]::Parse($From).LocalDateTime
$toDate = [DateTimeOffset]::Parse($To).LocalDateTime
$filter = "[Start] <= '" + $toDate.ToString("g") + "' AND [End] >= '" + $fromDate.ToString("g") + "'"
$out = @()
foreach ($item in $items.Restrict($filter)) {
  if ($item.Start -gt $toDate) { break }
  $out += [pscustomobject]@{
    id     = [string]$item.EntryID
    title  = [string]$item.Subject
    start  = $item.Start.ToUniversalTime().ToString("o")
    end    = $item.End.ToUniversalTime().ToString("o")
    allDay = [bool]$item.AllDayEvent
    busy   = [int]$item.BusyStatus
  }
}
ConvertTo-Json -InputObject @($out) -Compress
