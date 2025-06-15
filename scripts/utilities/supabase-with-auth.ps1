param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

Write-Host "🔑 Loading environment variables..." -ForegroundColor Green

$envVars = @{}
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
        }
    }
}

if ($envVars.ContainsKey("SUPABASE_DATABASE_PASSWORD")) {
    $env:PGPASSWORD = $envVars["SUPABASE_DATABASE_PASSWORD"]
    Write-Host "✅ Database password configured" -ForegroundColor Green
    
    if (!$Command.Contains("--password")) {
        $password = $envVars["SUPABASE_DATABASE_PASSWORD"]
        $Command = "$Command --password `"$password`""
    }
}

Write-Host "🔄 Executing: npx supabase $Command" -ForegroundColor Cyan
Invoke-Expression "npx supabase $Command" 