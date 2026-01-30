# SharePoint Token Issuance Script (Device Code Flow, with Refresh Token)
# - No Azure AD app registration required (uses Microsoft first-party client_id)
# - Prints Access Token + Refresh Token and copies them to clipboard
#
# Usage:
#   cd e:\hr-sample
#   powershell -ExecutionPolicy Bypass -File .\get-sharepoint-token.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "SharePoint Token Issuance (Auto Refresh)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Force TLS 1.2+ (helps in some enterprise environments)
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor 3072
} catch {
    # ignore
}

# 1) Request Device Code
Write-Host "[1/3] Requesting Device Code..." -ForegroundColor Yellow
$body = @{
    client_id = "00000003-0000-0000-c000-000000000000"
    scope     = "https://graph.microsoft.com/.default offline_access"
}

try {
    $deviceResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode" -Body $body -ContentType "application/x-www-form-urlencoded"
} catch {
    Write-Host "ERROR: Device Code request failed" -ForegroundColor Red
    Write-Host ($_.Exception.Message) -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Authentication Required" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1) Open this URL in your browser:" -ForegroundColor White
Write-Host ("   " + $deviceResponse.verification_uri) -ForegroundColor Cyan
Write-Host ""
Write-Host "2) Enter this code:" -ForegroundColor White
Write-Host ("   " + $deviceResponse.user_code) -ForegroundColor Yellow -BackgroundColor DarkGray
Write-Host ""
Write-Host ("Valid for: {0} minutes" -f [math]::Floor($deviceResponse.expires_in / 60)) -ForegroundColor Gray
Write-Host ""
Write-Host "Now login in the browser. This script will keep polling..." -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# 2) Token polling (NO Read-Host; polling runs while you login)
Write-Host "[2/3] Waiting for token issuance..." -ForegroundColor Yellow

$interval = 5
if ($deviceResponse.interval) { $interval = [int]$deviceResponse.interval }

$maxAttempts = [math]::Ceiling($deviceResponse.expires_in / $interval)
if ($maxAttempts -lt 30) { $maxAttempts = 30 }

# HttpClient (PowerShell 5.1 friendly) to always capture status/headers/body
$tokenUri = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
try {
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
    $http = New-Object System.Net.Http.HttpClient($handler)
    $http.Timeout = [TimeSpan]::FromSeconds(30)
} catch {
    $http = $null
}

for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds $interval

    $tokenBody = @{
        grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
        client_id   = "00000003-0000-0000-c000-000000000000"
        device_code = $deviceResponse.device_code
    }

    try {
        if ($null -eq $http) {
            # Fallback: Invoke-RestMethod (may lose body in some environments)
            $tokenResponse = Invoke-RestMethod `
                -Method Post `
                -Uri $tokenUri `
                -Body $tokenBody `
                -ContentType "application/x-www-form-urlencoded" `
                -ErrorAction Stop
        } else {
            $pairs = New-Object 'System.Collections.Generic.List[System.Collections.Generic.KeyValuePair[string,string]]'
            foreach ($k in $tokenBody.Keys) {
                $pairs.Add([System.Collections.Generic.KeyValuePair[string,string]]::new($k, [string]$tokenBody[$k]))
            }
            # IMPORTANT (PowerShell 5.1): use the comma operator to pass the list as a single argument
            # Otherwise PowerShell may "unroll" the list and break constructor binding.
            $content = New-Object System.Net.Http.FormUrlEncodedContent(, $pairs)
            $respMsg = $http.PostAsync($tokenUri, $content).GetAwaiter().GetResult()

            $status = [int]$respMsg.StatusCode
            $bodyText = $respMsg.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $ct = $null
            try { $ct = $respMsg.Content.Headers.ContentType.ToString() } catch { $ct = $null }

            $json = $null
            if ($bodyText) {
                try { $json = $bodyText | ConvertFrom-Json } catch { $json = $null }
            }

            if ($status -ge 200 -and $status -lt 300 -and $null -ne $json -and $json.access_token) {
                $tokenResponse = $json
            } else {
                # OAuth JSON errors
                if ($null -ne $json -and $json.error) {
                    if ($json.error -eq "authorization_pending") {
                        Write-Host "." -NoNewline -ForegroundColor Gray
                        continue
                    }
                    if ($json.error -eq "slow_down") {
                        $interval = $interval + 5
                        Write-Host "s" -NoNewline -ForegroundColor Gray
                        continue
                    }
                    if ($json.error -eq "expired_token") {
                        Write-Host ""
                        Write-Host "ERROR: Device code expired. Run the script again." -ForegroundColor Red
                        exit 2
                    }

                    Write-Host ""
                    Write-Host ("HTTP Status: " + $status) -ForegroundColor Red
                    if ($ct) { Write-Host ("Content-Type: " + $ct) -ForegroundColor DarkGray }
                    Write-Host ("ERROR: " + $json.error) -ForegroundColor Red
                    if ($json.error_description) { Write-Host ($json.error_description) -ForegroundColor Red }
                    exit 3
                }

                # Non-JSON / empty body: print headers + preview
                Write-Host ""
                Write-Host ("HTTP Status: " + $status) -ForegroundColor Red
                if ($ct) { Write-Host ("Content-Type: " + $ct) -ForegroundColor DarkGray }
                Write-Host "ERROR: Token endpoint returned non-JSON or empty response body." -ForegroundColor Red

                # dump some useful headers
                try {
                    $hdrLines = @()
                    foreach ($h in $respMsg.Headers) {
                        $hdrLines += ("{0}: {1}" -f $h.Key, ($h.Value -join ", "))
                    }
                    foreach ($h in $respMsg.Content.Headers) {
                        $hdrLines += ("{0}: {1}" -f $h.Key, ($h.Value -join ", "))
                    }
                    if ($hdrLines.Count -gt 0) {
                        Write-Host "---- response headers ----" -ForegroundColor DarkGray
                        $hdrLines | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
                        Write-Host "--------------------------" -ForegroundColor DarkGray
                    }
                } catch { }

                if ($bodyText) {
                    $preview = $bodyText
                    if ($preview.Length -gt 1500) { $preview = $preview.Substring(0, 1500) + "`n...[truncated]..." }
                    Write-Host "---- raw response body (preview) ----" -ForegroundColor DarkGray
                    Write-Host $preview -ForegroundColor DarkGray
                    Write-Host "-------------------------------------" -ForegroundColor DarkGray
                } else {
                    Write-Host "(empty body)" -ForegroundColor DarkGray
                }
                exit 4
            }
        }

        if ($null -eq $tokenResponse -or -not $tokenResponse.access_token) {
            Write-Host ""
            Write-Host "ERROR: Token endpoint returned success but missing access_token." -ForegroundColor Red
            exit 4
        }

        Write-Host ""
        Write-Host "[3/3] SUCCESS: Tokens issued!" -ForegroundColor Green
        Write-Host ""

        $envText = "SHAREPOINT_ACCESS_TOKEN=$($tokenResponse.access_token)`nSHAREPOINT_REFRESH_TOKEN=$($tokenResponse.refresh_token)"
        $envText | Set-Clipboard

        Write-Host "Add the following to backend/.env (also copied to clipboard):" -ForegroundColor White
        Write-Host ""
        Write-Host $envText -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Restart backend server after updating .env:" -ForegroundColor White
        Write-Host "  cd backend; npm run dev" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    } catch {
        Write-Host ""
        # Try to read HTTP response body (Windows PowerShell 5.1)
        $resp = $null
        try { $resp = $_.Exception.Response } catch { $resp = $null }

        if ($null -ne $resp) {
            $status = $null
            try { $status = [int]$resp.StatusCode.value__ } catch { $status = $null }
            if ($null -ne $status) {
                Write-Host ("HTTP Status: " + $status) -ForegroundColor Red
            }

            $bodyText = $null
            try {
                $stream = $resp.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                }
            } catch { $bodyText = $null }

            $errObj = $null
            if ($bodyText) {
                try { $errObj = $bodyText | ConvertFrom-Json } catch { $errObj = $null }
            }

            if ($null -ne $errObj -and $errObj.error) {
                if ($errObj.error -eq "authorization_pending") {
                    Write-Host "." -NoNewline -ForegroundColor Gray
                    continue
                }
                if ($errObj.error -eq "slow_down") {
                    $interval = $interval + 5
                    Write-Host "s" -NoNewline -ForegroundColor Gray
                    continue
                }
                if ($errObj.error -eq "expired_token") {
                    Write-Host ""
                    Write-Host "ERROR: Device code expired. Run the script again." -ForegroundColor Red
                    exit 2
                }

                Write-Host ("ERROR: " + $errObj.error) -ForegroundColor Red
                if ($errObj.error_description) {
                    Write-Host ($errObj.error_description) -ForegroundColor Red
                }
                exit 3
            }

            # Non-JSON (often HTML / proxy / policy block page)
            Write-Host "ERROR: Token endpoint returned non-JSON response." -ForegroundColor Red
            if ($bodyText) {
                $preview = $bodyText
                if ($preview.Length -gt 1200) { $preview = $preview.Substring(0, 1200) + "`n...[truncated]..." }
                Write-Host "---- raw response body (preview) ----" -ForegroundColor DarkGray
                Write-Host $preview -ForegroundColor DarkGray
                Write-Host "-------------------------------------" -ForegroundColor DarkGray
            } else {
                Write-Host "(empty body)" -ForegroundColor DarkGray
            }
            exit 4
        }

        # No HTTP response object (network/SSL/proxy or other PowerShell error)
        Write-Host "ERROR: Token request failed (no HTTP response)." -ForegroundColor Red
        Write-Host ("ExceptionType: " + $_.Exception.GetType().FullName) -ForegroundColor Red
        if ($_.Exception.Message) { Write-Host ("Message: " + $_.Exception.Message) -ForegroundColor Red }
        exit 4
    }
}

# Dispose HttpClient
try { if ($null -ne $http) { $http.Dispose() } } catch { }

Write-Host ""
Write-Host "ERROR: Timeout - login not completed in time. Run the script again." -ForegroundColor Red
exit 5
