# ============================================================
#  build-static.ps1 — 静态导出（产物 out/），可丢到任何静态托管
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\build-static.ps1
#    powershell -ExecutionPolicy Bypass -File scripts\build-static.ps1 -Target capacitor
#
#  参数:
#    -Target cloudflare | capacitor
#        cloudflare（默认）: 绝对路径资源，适合 Pages / nginx / Netlify / Vercel
#        capacitor        : 相对路径 + trailingSlash，适合打进 APK（file:// 加载）
#    -Clean      构建前删掉 .next 和 out
#    -NoPause    结束不暂停（供其它脚本调用）
#
#  这两种模式由 next.config.ts 里的 DEPLOY_TARGET / CAPACITOR_BUILD 环境变量控制，
#  本脚本只负责把变量设对、把产物校验好。
# ============================================================

[CmdletBinding()]
param(
    [ValidateSet('cloudflare', 'capacitor')]
    [string]$Target = 'cloudflare',
    [switch]$Clean,
    [switch]$NoPause
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$OutDir = Join-Path $ProjectRoot 'out'

Write-Step "静态导出构建（模式: $Target）"

if (-not (Install-Deps)) { if ($NoPause) { exit 1 } else { Wait-Exit 1 } }

# ---------- 清理 ----------
if ($Clean) {
    foreach ($d in @('.next', 'out')) {
        $p = Join-Path $ProjectRoot $d
        if (Test-Path $p) { Remove-Item $p -Recurse -Force; Write-Ok "已清理 $d/" }
    }
} else {
    if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
}

# ---------- 设置构建模式 ----------
# 每次都先清空另一个变量，避免上一次运行残留导致模式串台
$env:DEPLOY_TARGET   = $null
$env:CAPACITOR_BUILD = $null
if ($Target -eq 'capacitor') {
    $env:CAPACITOR_BUILD = '1'
    Write-Note 'CAPACITOR_BUILD=1  ->  相对路径 + trailingSlash（APK 用）'
} else {
    $env:DEPLOY_TARGET = 'cloudflare'
    Write-Note 'DEPLOY_TARGET=cloudflare  ->  绝对路径（网站用）'
}

# src/app/layout.tsx 用了 next/font/google，构建时必须能访问 Google Fonts。
# 用它做探测目标，代理转不到就自动改走直连。
Disable-ProxyForSession -TestUrl 'https://fonts.googleapis.com/css2?family=Geist&display=swap'

# ---------- 构建 ----------
Write-Note '执行 next build ...（首次约 1~3 分钟）'
$code = Invoke-Next @('build')

if ($code -ne 0) {
    Write-Fail "next build 失败（退出码 $code）"
    Write-Host ''
    Write-Tip '常见原因：'
    Write-Tip '  · next/font/google 需要联网下载字体 —— 断网或代理失效会卡在这里'
    Write-Tip '  · 依赖不完整 —— 删掉 node_modules 重装：bun install'
    Write-Tip '  · 内存不足 —— 关掉别的程序再试'
    if ($NoPause) { exit 1 } else { Wait-Exit 1 }
}

if (-not (Test-Path $OutDir)) {
    Write-Fail 'out/ 未生成'
    Write-Tip  '检查 next.config.ts 是否正确读到了环境变量（output 应为 export）'
    if ($NoPause) { exit 1 } else { Wait-Exit 1 }
}

# ---------- 附加文件 ----------
# GitHub Pages 需要，否则 _next 目录会被 Jekyll 吞掉
Set-Content -Path (Join-Path $OutDir '.nojekyll') -Value '' -NoNewline -Encoding ascii

if ($Target -eq 'cloudflare') {
    $headers = @'
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/icon-192.png
  Cache-Control: public, max-age=604800

/icon-512.png
  Cache-Control: public, max-age=604800

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/index.html
  Cache-Control: no-cache

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
'@
    Set-Content -Path (Join-Path $OutDir '_headers') -Value $headers -Encoding utf8
    Write-Ok '已写入 _headers（Cloudflare Pages / Netlify 缓存与安全头）'
}

Write-Host ''
Write-Ok "构建完成：$OutDir"
Write-Host "         体积  ：$(Get-DirSize $OutDir)" -ForegroundColor DarkGray
Write-Host "         文件数：$((Get-ChildItem $OutDir -Recurse -File).Count)" -ForegroundColor DarkGray
Write-Host ''
if ($Target -eq 'cloudflare') {
    Write-Tip '接下来可以：'
    Write-Tip '  scripts\deploy-cloudflare.ps1                部署到 Cloudflare Pages'
    Write-Tip '  scripts\serve.ps1 start -Static              本地预览静态版'
    Write-Tip '  把 out\ 整个丢到 nginx / OSS / 任意静态托管'
} else {
    Write-Tip '接下来执行 scripts\build-apk.ps1 把 out/ 打进 APK'
}

if (-not $NoPause) { Wait-Exit 0 }
exit 0
