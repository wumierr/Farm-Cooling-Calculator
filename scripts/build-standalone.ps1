# ============================================================
#  build-standalone.ps1 — 构建 Node 独立服务器版（产物 .next/standalone）
#
#  什么时候用: 要部署到自己的 Linux 服务器 / Docker，而不是静态托管。
#              产物自带一个精简版 node_modules，扔到服务器上
#              `node server.js` 就能跑，不需要再 npm install。
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\build-standalone.ps1
#    powershell -ExecutionPolicy Bypass -File scripts\build-standalone.ps1 -Clean
#
#  ⚠ package.json 里的 build 脚本用了 `cp -r`（Unix 命令），Windows 上会失败。
#    本脚本直接调 next build，然后用 PowerShell 完成同样的拷贝，跨平台可靠。
# ============================================================

[CmdletBinding()]
param(
    [switch]$Clean,
    [switch]$NoPause
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$NextDir       = Join-Path $ProjectRoot '.next'
$StandaloneDir = Join-Path $NextDir 'standalone'

Write-Step 'Standalone 构建（Node 独立服务器版）'

if (-not (Install-Deps)) { if ($NoPause) { exit 1 } else { Wait-Exit 1 } }

if ($Clean) {
    foreach ($d in @('.next', 'out')) {
        $p = Join-Path $ProjectRoot $d
        if (Test-Path $p) { Remove-Item $p -Recurse -Force; Write-Ok "已清理 $d/" }
    }
}

# standalone 模式的判定条件：无 DEPLOY_TARGET / CAPACITOR_BUILD 且 NODE_ENV=production
$env:DEPLOY_TARGET   = $null
$env:CAPACITOR_BUILD = $null
$env:NODE_ENV        = 'production'

# layout.tsx 用了 next/font/google，构建期要能访问 Google Fonts
Disable-ProxyForSession -TestUrl 'https://fonts.googleapis.com/css2?family=Geist&display=swap'

Write-Note '执行 next build（standalone 模式）...'
$code = Invoke-Next @('build')
if ($code -ne 0) {
    Write-Fail "next build 失败（退出码 $code）"
    if ($NoPause) { exit 1 } else { Wait-Exit 1 }
}

if (-not (Test-Path $StandaloneDir)) {
    Write-Fail '.next/standalone 未生成'
    Write-Tip  'next.config.ts 里 standalone 模式要求 NODE_ENV=production 且未设置导出变量'
    if ($NoPause) { exit 1 } else { Wait-Exit 1 }
}

# ---------- 补齐静态资源（Next 不会自动放进 standalone）----------
Write-Note '复制 .next/static 和 public 到 standalone ...'

$srcStatic = Join-Path $NextDir 'static'
$dstStatic = Join-Path $StandaloneDir '.next\static'
if (Test-Path $srcStatic) {
    if (Test-Path $dstStatic) { Remove-Item $dstStatic -Recurse -Force }
    New-Item -ItemType Directory -Path (Split-Path -Parent $dstStatic) -Force | Out-Null
    Copy-Item $srcStatic -Destination $dstStatic -Recurse -Force
    Write-Ok '.next/static 已复制'
} else {
    Write-Fail '.next/static 不存在，构建可能不完整'
}

$srcPublic = Join-Path $ProjectRoot 'public'
$dstPublic = Join-Path $StandaloneDir 'public'
if (Test-Path $srcPublic) {
    if (Test-Path $dstPublic) { Remove-Item $dstPublic -Recurse -Force }
    Copy-Item $srcPublic -Destination $dstPublic -Recurse -Force
    Write-Ok 'public/ 已复制'
}

Write-Host ''
Write-Ok "构建完成：$StandaloneDir"
Write-Host "         体积：$(Get-DirSize $StandaloneDir)" -ForegroundColor DarkGray
Write-Host ''
Write-Tip '本机试跑：'
Write-Tip '  node .next\standalone\server.js          （默认 3000 端口）'
Write-Host ''
Write-Tip '部署到 Linux 服务器：'
Write-Tip '  1) 把 .next\standalone 整个目录传上去'
Write-Tip '  2) 用 deploy\farm-cooling.service 装成 systemd 服务'
Write-Tip '  或直接用 deploy\Dockerfile（多阶段构建，镜像约 180MB）'

if (-not $NoPause) { Wait-Exit 0 }
exit 0
