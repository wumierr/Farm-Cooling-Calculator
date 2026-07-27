# ============================================================
#  serve.ps1 — 本地服务管理（启动 / 打开 / 停止 / 状态 / 重启）
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 start
#    powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 stop
#    powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 open
#    powershell -ExecutionPolicy Bypass -File scripts\serve.ps1 status
#
#  参数:
#    -Port 3000     指定端口
#    -Prod          生产模式（先 build 再 start，更接近线上表现）
#    -Static        静态导出模式（build 成 out/ 后用静态服务器托管，最贴近 Pages 部署）
#    -NoOpen        启动后不自动打开浏览器
#    -Lan           监听 0.0.0.0，手机连同一 WiFi 可访问
#
#  为什么不直接跑 `bun run dev`：package.json 里的 dev 脚本带 `| tee dev.log`，
#  Windows 上没有 tee 会报错。这里直接调 next，日志由脚本自己写进 logs\。
# ============================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'open')]
    [string]$Action = 'start',

    [int]$Port = 3000,
    [switch]$Prod,
    [switch]$Static,
    [switch]$NoOpen,
    [switch]$Lan
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$PidFile = Join-Path $ProjectRoot '.server.pid'
$LogDir  = Join-Path $ProjectRoot 'logs'
$LogOut  = Join-Path $LogDir 'server.out.log'
$LogErr  = Join-Path $LogDir 'server.err.log'
$Url     = "http://localhost:$Port"

function Get-ServerPid {
    if (Test-Path $PidFile) {
        $saved = (Get-Content $PidFile -Raw).Trim()
        if ($saved -match '^\d+$') {
            $p = Get-Process -Id ([int]$saved) -ErrorAction SilentlyContinue
            if ($p) { return [int]$saved }
        }
    }
    return (Get-ListenerPid -Port $Port)
}

function Get-LanAddress {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
              Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
              Select-Object -First 1 -ExpandProperty IPAddress
        if ($ip) { return $ip }
    } catch { }
    return $null
}

function Start-Server {
    $existing = Get-ServerPid
    if ($existing -ne 0) {
        Write-Note "服务已在运行 (PID: $existing, 端口 $Port)"
        if (-not $NoOpen) { Open-Browser $Url | Out-Null }
        return $true
    }

    if (-not (Install-Deps)) { return $false }
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

    $bindHost = '127.0.0.1'
    if ($Lan) { $bindHost = '0.0.0.0' }
    $proc = $null

    if ($Static) {
        # ---------- 静态导出模式 ----------
        Write-Note '静态导出模式：先构建 out/ ...'
        & (Join-Path $PSScriptRoot 'build-static.ps1') -Target cloudflare -NoPause
        if (-not (Test-Path (Join-Path $ProjectRoot 'out'))) { Write-Fail '静态构建失败，out/ 不存在'; return $false }

        $env:BIND_HOST = $bindHost
        # 项目路径可能含空格（如 D:\agent work\...），参数必须自己加引号
        $staticSrv = Join-Path $PSScriptRoot 'static-server.cjs'
        $outPath   = Join-Path $ProjectRoot 'out'
        $proc = Start-Process -FilePath 'node' `
            -ArgumentList @("`"$staticSrv`"", $Port, "`"$outPath`"") `
            -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr
    }
    elseif ($Prod) {
        # ---------- 生产模式 ----------
        Write-Note '生产模式：先 next build ...'
        $code = Invoke-Next @('build')
        if ($code -ne 0) { Write-Fail "构建失败（退出码 $code）"; return $false }

        $nextBin = Get-NextBin
        if (-not $nextBin) { Write-Fail '找不到 next 可执行文件'; return $false }
        Write-Note "启动生产服务器，端口 $Port ..."
        $proc = Start-Process -FilePath $nextBin `
            -ArgumentList @('start', '-p', $Port, '-H', $bindHost) `
            -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr
    }
    else {
        # ---------- 开发模式（默认）----------
        $nextBin = Get-NextBin
        if (-not $nextBin) {
            Write-Fail '找不到 next 可执行文件，依赖可能没装好'
            Write-Tip  '试试删掉 node_modules 后重跑，或手动执行 bun install'
            return $false
        }
        Write-Note "开发模式启动，端口 $Port（首次编译约 20~60 秒）..."
        $proc = Start-Process -FilePath $nextBin `
            -ArgumentList @('dev', '-p', $Port, '-H', $bindHost) `
            -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr
    }

    if ($null -eq $proc) { Write-Fail '进程启动失败'; return $false }
    Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii

    Write-Note '等待服务就绪（Next.js 首次编译较慢，最多等 3 分钟）...'
    if (Wait-HttpReady -Url $Url -TimeoutSec 180) {
        Write-Ok "服务已启动 (PID: $($proc.Id))"
        Write-Host ''
        Write-Host "    本机访问 : $Url" -ForegroundColor White
        if ($Lan) {
            $lanIp = Get-LanAddress
            if ($lanIp) { Write-Host "    局域网   : http://${lanIp}:$Port   (手机连同一 WiFi 可访问)" -ForegroundColor White }
        }
        Write-Host "    日志     : logs\server.out.log" -ForegroundColor DarkGray
        Write-Host ''
        if (-not $NoOpen) { Open-Browser $Url | Out-Null }
        return $true
    }

    Write-Fail '服务启动超时'
    foreach ($f in @($LogErr, $LogOut)) {
        if (Test-Path $f) {
            Write-Tip "$(Split-Path -Leaf $f) 尾部："
            Get-Content $f -Tail 15 | ForEach-Object { Write-Tip $_ }
        }
    }
    return $false
}

function Stop-Server {
    $target = Get-ServerPid
    if ($target -eq 0) {
        Write-Note '服务未在运行'
        if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
        return $true
    }
    Write-Note "正在停止服务 (PID: $target)..."
    Stop-ProcTree -ProcId $target
    Start-Sleep -Milliseconds 1000

    # next dev 会派生子进程，父进程死了端口可能还占着
    $again = Get-ListenerPid -Port $Port
    if ($again -ne 0) { Stop-ProcTree -ProcId $again; Start-Sleep -Milliseconds 800 }

    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

    if (Test-PortBusy -Port $Port) {
        Write-Fail "端口 $Port 仍被占用"
        Write-Tip  "手动查看占用: Get-NetTCPConnection -LocalPort $Port"
        return $false
    }
    Write-Ok '服务已停止'
    return $true
}

function Show-Status {
    $target = Get-ServerPid
    if ($target -eq 0) { Write-Note "服务未在运行（端口 $Port 空闲）"; return }
    Write-Ok "服务运行中 (PID: $target, 端口 $Port)"
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
        Write-Ok "HTTP 响应正常 ($($r.StatusCode))  ->  $Url"
    } catch {
        Write-Fail 'HTTP 无响应（可能还在编译，或进程僵死）'
        if (Test-Path $LogOut) { Get-Content $LogOut -Tail 8 | ForEach-Object { Write-Tip $_ } }
    }
}

$modeLabel = 'dev'
if ($Prod)   { $modeLabel = 'prod' }
if ($Static) { $modeLabel = 'static' }
Write-Step "葡萄大棚降温剂计算器 — 本地服务 [$Action / $modeLabel]"

switch ($Action) {
    'start'   { if (-not (Start-Server)) { Wait-Exit 1 } }
    'stop'    { if (-not (Stop-Server))  { Wait-Exit 1 } }
    'restart' { Stop-Server | Out-Null; Start-Sleep -Seconds 1; if (-not (Start-Server)) { Wait-Exit 1 } }
    'status'  { Show-Status }
    'open'    {
        if ((Get-ServerPid) -eq 0) {
            Write-Note '服务未运行，正在自动启动...'
            if (-not (Start-Server)) { Wait-Exit 1 }
        } else {
            Open-Browser $Url | Out-Null
            Write-Ok "已打开 $Url"
        }
    }
}

if ($env:NO_PAUSE -eq '1') { exit 0 }
if ($Action -eq 'status') { Wait-Exit 0 }
Start-Sleep -Seconds 2
