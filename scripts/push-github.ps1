# ============================================================
#  push-github.ps1 — 一键推送到 GitHub（本地优先）
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\push-github.ps1
#    powershell -ExecutionPolicy Bypass -File scripts\push-github.ps1 -Message "feat: 新增多日预报"
#
#  参数:
#    -Message <str>   提交说明（默认自动生成带时间戳的说明）
#    -Branch  <str>   目标分支（默认：当前分支。本仓库当前在 Linux 分支上）
#    -Remote  <url>   远程地址（默认沿用现有 origin）
#    -UseHttps        把 origin 从 SSH 换成 HTTPS
#    -UseSsh          把 origin 从 HTTPS 换成 SSH
#    -Force           无法自动合并时用本地强制覆盖远程
#    -DryRun          只演示不执行
#
#  ⚠ 两个修正（相对旧的 _github.bat / git-push.sh）:
#    1. 旧脚本用 `git pull --rebase -X ours` 声称"本地优先"，实际是远程优先——
#       rebase 时 ours 指的是上游。这里改用 merge 策略 -X ours，才是真本地优先。
#    2. 旧脚本每次 `git remote rm origin` 再 add，会丢掉已有的 upstream 配置；
#       且硬编码分支（一个写 main、一个写 Linux）容易推错分支。这里默认跟随当前分支。
# ============================================================

[CmdletBinding()]
param(
    [string]$Message,
    [string]$Branch,
    [string]$Remote,
    [switch]$UseHttps,
    [switch]$UseSsh,
    [switch]$Force,
    [switch]$DryRun
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$RepoHttps = 'https://github.com/wumierr/Farm-Cooling-Calculator.git'
$RepoSsh   = 'git@github.com:wumierr/Farm-Cooling-Calculator.git'

Write-Step '推送到 GitHub（本地优先）'

if (-not (Test-Cmd 'git')) { Write-Fail '未找到 git'; Wait-Exit 1 }

# ---------- 1. 仓库 ----------
if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
    Write-Note '初始化 git 仓库...'
    if (-not $DryRun) { git init | Out-Null; git branch -M main | Out-Null }
}

# ---------- 2. 检查全局 URL 重写规则（会让 SSH 静默变成 HTTPS）----------
$rewrites = git config --global --get-regexp '^url\.' 2>$null
if ($rewrites) {
    Write-Note '检测到全局 Git URL 重写规则，可能覆盖你设置的远程协议：'
    ($rewrites -split "`n") | Where-Object { $_ } | ForEach-Object { Write-Tip $_ }
    Write-Tip '如需移除: git config --global --unset-all url.https://github.com/.insteadof'
}

# ---------- 3. 远程 ----------
$currentRemote = (git remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $currentRemote) {
    if (-not $Remote) { if ($UseSsh) { $Remote = $RepoSsh } else { $Remote = $RepoHttps } }
    Write-Note "添加远程 origin -> $Remote"
    if (-not $DryRun) { git remote add origin $Remote | Out-Null }
} else {
    $currentRemote = $currentRemote.Trim()
    $want = $null
    if ($UseHttps) { $want = $RepoHttps }
    if ($UseSsh)   { $want = $RepoSsh }
    if ($Remote)   { $want = $Remote }

    if ($want -and $want -ne $currentRemote) {
        Write-Note "切换远程: $currentRemote  ->  $want"
        if (-not $DryRun) { git remote set-url origin $want | Out-Null }
        $Remote = $want
    } else {
        $Remote = $currentRemote
        Write-Ok "远程 origin: $Remote"
    }
}

# ---------- 3.5 代理 ----------
# SSH 远程（git@github.com:...）走的是 22/443 的 SSH 协议，完全不经过 HTTP 代理，
# 这时探测 HTTP 可达性没有意义，跳过即可。只有 HTTPS 远程才需要管代理。
if ($Remote -like 'http*') {
    Disable-ProxyForSession -TestUrl 'https://github.com'
} else {
    Write-Tip 'SSH 远程，不受 HTTP 代理影响'
}

# ---------- 4. 分支 ----------
if (-not $Branch) {
    $Branch = (git rev-parse --abbrev-ref HEAD 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $Branch -or $Branch.Trim() -eq 'HEAD') { $Branch = 'main' }
    $Branch = $Branch.Trim()
}
Write-Ok "目标分支: $Branch"
if ($Branch -eq 'Linux') {
    Write-Tip '当前在 Linux 分支。若想推到 main，加参数 -Branch main'
}

# ---------- 5. 提交 ----------
$status = git status --porcelain
if ($status) {
    $lines = ($status -split "`n") | Where-Object { $_ }
    Write-Note "检测到 $($lines.Count) 处改动"
    $lines | Select-Object -First 15 | ForEach-Object { Write-Tip $_ }
    if ($lines.Count -gt 15) { Write-Tip "... 其余 $($lines.Count - 15) 项" }

    if (-not $Message) { $Message = "chore: 更新项目 $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

    if ($DryRun) {
        Write-Note "[DryRun] git add -A; git commit -m `"$Message`""
    } else {
        git add -A
        git commit -m $Message | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Fail '提交失败'; Wait-Exit 1 }
        Write-Ok "已提交: $Message"
    }
} else {
    Write-Note '工作区干净，无新改动需要提交'
}

# ---------- 6. 同步远程（本地优先）----------
Write-Note '检查远程分支...'
$remoteHead = git ls-remote --heads origin $Branch 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Fail '无法连接远程仓库'
    Write-Tip 'SSH 方式需要本机已配好密钥: ssh -T git@github.com'
    Write-Tip '想改用 HTTPS: scripts\push-github.ps1 -UseHttps'
    Write-Tip '本机对 GitHub 的访问受限，失败属常见情况，先确认代理软件已启动'
    Wait-Exit 1
}

if ($remoteHead) {
    Write-Note "远程已有分支 $Branch，合并中（冲突保留本地版本）..."
    if (-not $DryRun) {
        git pull origin $Branch --no-rebase --no-edit -X ours
        if ($LASTEXITCODE -ne 0) {
            Write-Note '常规合并失败，尝试 --allow-unrelated-histories ...'
            git pull origin $Branch --no-rebase --no-edit -X ours --allow-unrelated-histories
            if ($LASTEXITCODE -ne 0 -and -not $Force) {
                Write-Fail '合并失败。确认要用本地覆盖远程，请重跑并加 -Force'
                Wait-Exit 1
            }
        }
    }
} else {
    Write-Note "远程还没有分支 $Branch，push 时会自动创建"
}

# ---------- 7. 推送 ----------
if ($DryRun) { Write-Note "[DryRun] git push -u origin $Branch"; Wait-Exit 0 }

Write-Note "推送到 origin/$Branch ..."
if ($Force) { git push -u origin $Branch --force-with-lease } else { git push -u origin $Branch }

if ($LASTEXITCODE -eq 0) {
    Write-Host ''
    Write-Ok '推送成功！'
    $webUrl = $Remote -replace '\.git$', '' -replace '^git@github\.com:', 'https://github.com/'
    Write-Host "         仓库: $webUrl" -ForegroundColor White
    Write-Host "         若已接 Cloudflare Pages，几分钟后自动上线" -ForegroundColor DarkGray
} else {
    Write-Fail '推送失败'
    Write-Tip '常见原因：网络/代理、SSH 密钥、远程有他人新提交（重跑一次即可）'
    Write-Tip '本地覆盖远程: scripts\push-github.ps1 -Force'
    Wait-Exit 1
}

Wait-Exit 0
