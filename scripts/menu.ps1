# ============================================================
#  menu.ps1 — 一键菜单（不想记命令就用这个）
# ============================================================

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$Port = 3000

function Show-Menu {
    Clear-Host
    Write-Host ''
    Write-Host '  ╔══════════════════════════════════════════════════════╗' -ForegroundColor Cyan
    Write-Host '  ║      葡萄大棚降温剂计算器 — 一键操作菜单             ║' -ForegroundColor Cyan
    Write-Host '  ╚══════════════════════════════════════════════════════╝' -ForegroundColor Cyan
    Write-Host ''

    $running = (Get-ListenerPid -Port $Port)
    if ($running -ne 0) {
        Write-Host "   服务状态: 运行中 (PID $running)  http://localhost:$Port" -ForegroundColor Green
    } else {
        Write-Host '   服务状态: 未运行' -ForegroundColor DarkGray
    }
    $nm = Join-Path $ProjectRoot 'node_modules'
    if (Test-Path $nm) {
        Write-Host "   依赖    : 已安装" -ForegroundColor Green
    } else {
        Write-Host '   依赖    : 未安装（首次启动会自动装，约 1~3 分钟）' -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host '   ── 本地 ──────────────────────────────────────────────' -ForegroundColor DarkCyan
    Write-Host '    1  启动服务并打开网页（开发模式，改代码即时生效）'
    Write-Host '    2  只打开网页'
    Write-Host '    3  停止服务'
    Write-Host '    4  查看服务状态'
    Write-Host '    5  启动服务（局域网可访问，手机同 WiFi 能打开）'
    Write-Host '    6  静态模式预览（和线上表现一致）'
    Write-Host ''
    Write-Host '   ── 构建 ──────────────────────────────────────────────' -ForegroundColor DarkCyan
    Write-Host '    7  静态导出 out/（给静态托管用）'
    Write-Host '    8  Standalone 构建（给自有服务器 / Docker 用）'
    Write-Host '    9  打包安卓 APK'
    Write-Host ''
    Write-Host '   ── 发布 ──────────────────────────────────────────────' -ForegroundColor DarkCyan
    Write-Host '    G  推送到 GitHub（本地优先）'
    Write-Host '    C  部署到 Cloudflare Pages'
    Write-Host ''
    Write-Host '   ── 其它 ──────────────────────────────────────────────' -ForegroundColor DarkCyan
    Write-Host '    D  查看公网部署说明（docs\DEPLOY.md）'
    Write-Host '    Q  退出'
    Write-Host ''
}

function Invoke-Script {
    param([string]$Name, [string[]]$Arguments = @())
    $path = Join-Path $PSScriptRoot $Name
    $env:NO_PAUSE = '1'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $path @Arguments
    $env:NO_PAUSE = $null
    Write-Host ''
    Write-Host '  按任意键返回菜单...' -ForegroundColor DarkGray
    try { $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') } catch { Start-Sleep -Seconds 2 }
}

while ($true) {
    Show-Menu
    $choice = Read-Host '   请选择'
    switch ($choice.Trim().ToUpper()) {
        '1' { Invoke-Script 'serve.ps1' @('start') }
        '2' { Invoke-Script 'serve.ps1' @('open') }
        '3' { Invoke-Script 'serve.ps1' @('stop') }
        '4' { Invoke-Script 'serve.ps1' @('status') }
        '5' { Invoke-Script 'serve.ps1' @('start', '-Lan') }
        '6' { Invoke-Script 'serve.ps1' @('start', '-Static') }
        '7' { Invoke-Script 'build-static.ps1' }
        '8' { Invoke-Script 'build-standalone.ps1' }
        '9' {
            Write-Host ''
            Write-Host '   首次打包建议自动装 SDK + 国内镜像（约 600MB 下载）' -ForegroundColor Yellow
            $auto = Read-Host '   自动安装 Android SDK 并使用国内镜像？(Y/n)'
            if ($auto.Trim().ToLower() -eq 'n') { Invoke-Script 'build-apk.ps1' }
            else { Invoke-Script 'build-apk.ps1' @('-InstallSdk', '-Mirror') }
        }
        'G' {
            $msg = Read-Host '   提交说明（直接回车用默认）'
            if ($msg.Trim()) { Invoke-Script 'push-github.ps1' @('-Message', $msg) }
            else { Invoke-Script 'push-github.ps1' }
        }
        'C' { Invoke-Script 'deploy-cloudflare.ps1' }
        'D' {
            $doc = Join-Path $ProjectRoot 'docs\DEPLOY.md'
            if (Test-Path $doc) { Start-Process $doc } else { Write-Fail '未找到 docs\DEPLOY.md'; Start-Sleep -Seconds 2 }
        }
        'Q' { exit 0 }
        default { }
    }
}
