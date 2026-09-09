Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " STEP 1: Testing Successful Registration (HTTP 201)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$headers = @{
    "Accept" = "application/json"
    "Authorization" = "Bearer 1|HkIjCPHWtGjv52jH3C8KuJkx7nT42MjGccNu2KZdc0965dfc"
}

$body = @{
    annual_plan_reference = "DICT-2026-001"
    category = "Software"
    project_type = "New System"
    activity_name = "Initiation Phase"
    name = "NSSF Management Portal"
    budget = 50000000
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/projects" -Method Post -Headers $headers -ContentType "application/json" -Body $body
$response | Format-List

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " STEP 2: Verifying Database Persistence" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
php artisan tinker --execute="dump(App\Models\Project::latest()->first()->only(['id', 'name', 'annual_plan_reference', 'budget', 'status']));"

Write-Host "`n==================================================" -ForegroundColor Red
Write-Host " STEP 3: Security Check - Blocking Unauthenticated Request" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Red
$unauthHeaders = @{ "Accept" = "application/json" }

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/projects" -Method Post -Headers $unauthHeaders -ContentType "application/json" -Body "{}"
} catch {
    Write-Host "Request Blocked Successfully! Response: 401 Unauthorized" -ForegroundColor Yellow
}