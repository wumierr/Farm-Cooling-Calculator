# ============================================================
#  deploy-cloudflare.ps1 — 一键部署到 Cloudflare Pages
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudflare.ps1
#
#  参数:
#    -ProjectName <str>  Pages 项目名（默认 farm-cooling-calculator）
#    -Branch      <str>  部署分支标签（默认 main）
#    -SkipBuild          跳过构建，直接上传现有 out/
#
#  认证二选一:
#    A. 交互式登录：首次自动弹浏览器授权（个人使用推荐）
#    B. 环境变量  ：CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID（CI / 无浏览器）
#       令牌权限: 账户 -> Cloudflare Pages -> 编辑
# ============================================================

[CmdletBinding()]
param(
    [string]$ProjectName = 'farm-cooling-calculator',
    [string]$Branch = 'main',
    [switch]$SkipBuild
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$OutDir = Join-Path $ProjectRoot 'out'

Write-Step 'Cloudflare Pages 部署'

if (-not (Test-Cmd 'npx')) {
    Write-Fail '未找到 npx（Node.js 自带），请先安装 Node.js 18+'
    Wait-Exit 1
}
Disable-ProxyForSession

# ---------- 1. 静态构建 ----------
if (-not $SkipBuild) {
    & (Join-Path $PSScriptRoot 'build-static.ps1') -Target cloudflare -NoPause
    if (-not (Test-Path $OutDir)) { Write-Fail '构建失败，out/ 不存在'; Wait-Exit 1 }
} else {
    Write-Note '跳过构建，使用现有 out/'
    if (-not (Test-Path $OutDir)) {
        Write-Fail 'out/ 不存在，请先执行 scripts\build-static.ps1'
        Wait-Exit 1
    }
}

# ---------- 2. 认证 ----------
Write-Step '检查 Cloudflare 登录状态'

if ($env:CLOUDFLARE_API_TOKEN -and $env:CLOUDFLARE_ACCOUNT_ID) {
    Write-Ok '检测到 API 令牌环境变量，使用令牌认证'
} else {
    Write-Note '未设置 API 令牌，使用交互式登录'
    $who = & npx --yes wrangler@latest whoami 2>&1 | Out-String
    if ($who -match 'not authenticated|You are not logged in|Unable to retrieve') {
        Write-Note '尚未登录，即将打开浏览器授权（授权后回到本窗口）...'
        & npx --yes wrangler@latest login
        if ($LASTEXITCODE -ne 0) {
            Write-Fail '登录失败'
            Write-Tip '无浏览器环境请改用令牌：'
            Write-Tip '  $env:CLOUDFLARE_API_TOKEN  = "你的令牌"'
            Write-Tip '  $env:CLOUDFLARE_ACCOUNT_ID = "你的账号ID"'
            Wait-Exit 1
        }
    } else {
        Write-Ok '已登录 Cloudflare'
    }
}

# ---------- 3. 部署 ----------
Write-Step "上传 out/ 到 Cloudflare Pages（项目：$ProjectName）"
Write-Note "文件数 $((Get-ChildItem $OutDir -Recurse -File).Count)，体积 $(Get-DirSize $OutDir)"

& npx --yes wrangler@latest pages deploy $OutDir `
    --project-name=$ProjectName `
    --branch=$Branch `
    --commit-dirty=true

if ($LASTEXITCODE -ne 0) {
    Write-Fail '部署失败'
    Write-Host ''
    Write-Tip '排查顺序：'
    Write-Tip '  1) 项目不存在 -> dash.cloudflare.com -> Workers & Pages -> Create -> Pages'
    Write-Tip '  2) 网络问题   -> 确认没挂着失效代理'
    Write-Tip '  3) 权限不足   -> 令牌需要「账户 -> Cloudflare Pages -> 编辑」'
    Write-Tip '  4) 文件过多   -> Pages 单次上传上限 20000 个文件 / 单文件 25MB'
    Write-Host ''
    Write-Tip '备选路线（不用命令行）：把仓库推到 GitHub 后，在 Cloudflare Pages'
    Write-Tip '控制台选 Connect to Git，构建命令填:'
    Write-Tip '  DEPLOY_TARGET=cloudflare npx next build'
    Write-Tip '输出目录填: out'
    Wait-Exit 1
}

Write-Host ''
Write-Ok '部署完成！'
Write-Host "         预览域名: https://$ProjectName.pages.dev" -ForegroundColor White
Write-Host ''
Write-Tip '绑定自有域名：Pages 项目 -> Custom domains -> Set up a custom domain'
Write-Tip 'HTTPS 证书由 Cloudflare 自动签发续期'

Wait-Exit 0
