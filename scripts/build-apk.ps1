# ============================================================
#  build-apk.ps1 — 打包安卓 APK（Capacitor + Next.js 静态导出）
#
#  用法:
#    powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
#    powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -InstallSdk -Mirror
#
#  参数:
#    -Type debug|release   构建类型（默认 debug）
#    -InstallSdk           缺 Android SDK 时自动下载安装（约 600MB）
#    -Mirror               Gradle 依赖走阿里云镜像（国内强烈建议）
#    -SkipWebBuild         跳过 next 静态导出，复用现有 out/
#    -Recreate             删掉 apk-build/android 重新生成 Android 工程
#
#  流程: next build(CAPACITOR_BUILD=1) -> out/ -> cap sync -> gradlew assembleDebug
#
#  ⚠ 装不了安卓环境？本项目自带 PWA（manifest + sw.js），
#    部署到公网后可用 PWABuilder 在线一键转 APK，见脚本末尾提示。
# ============================================================

[CmdletBinding()]
param(
    [ValidateSet('debug', 'release')]
    [string]$Type = 'debug',
    [switch]$InstallSdk,
    [switch]$Mirror,
    [switch]$SkipWebBuild,
    [switch]$Recreate
)

. (Join-Path $PSScriptRoot '_lib.ps1')
Set-Location $ProjectRoot

$ApkDir     = Join-Path $ProjectRoot 'apk-build'
$AndroidDir = Join-Path $ApkDir 'android'
$OutDir     = Join-Path $ProjectRoot 'out'
# SDK / 缓存都放 D 盘：C 盘长期紧张，且本机已有 D:\Android\Sdk
$SdkDefault = 'D:\Android\Sdk'
$CacheDir   = 'D:\Android\build-cache\farm'

Write-Step "葡萄大棚降温剂计算器 — APK 打包 ($Type)"

# apk-build/ 及其配置可能不在仓库里（clone 下来是空的），缺了就补上
if (-not (Test-Path $ApkDir)) {
    Write-Note '未找到 apk-build/，正在创建 ...'
    New-Item -ItemType Directory -Path $ApkDir -Force | Out-Null
}
$capConfig = Join-Path $ApkDir 'capacitor.config.json'
if (-not (Test-Path $capConfig)) {
    Write-Note '未找到 capacitor.config.json，正在生成默认配置 ...'
    $cfg = @'
{
  "appId": "com.grape.coolingcalc",
  "appName": "降温剂计算器",
  "webDir": "../out",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": true
  }
}
'@
    Set-Content -Path $capConfig -Value $cfg -Encoding utf8
    Write-Ok 'capacitor.config.json 已生成'
}

Disable-ProxyForSession
if (-not (Test-Path $CacheDir)) { New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null }

# ============================================================
#  Step 1/6  依赖
# ============================================================
Write-Step 'Step 1/6  检查依赖'
if (-not (Install-Deps)) { Wait-Exit 1 }

# ============================================================
#  Step 2/6  静态导出
# ============================================================
Write-Step 'Step 2/6  Next.js 静态导出（APK 模式）'
if ($SkipWebBuild -and (Test-Path $OutDir)) {
    Write-Note "复用现有 out/（$(Get-DirSize $OutDir)）"
} else {
    & (Join-Path $PSScriptRoot 'build-static.ps1') -Target capacitor -NoPause
    if (-not (Test-Path $OutDir)) { Write-Fail '静态导出失败'; Wait-Exit 1 }
}

# ============================================================
#  Step 3/6  JDK
# ============================================================
Write-Step 'Step 3/6  检查 JDK 21'
if (-not (Test-Cmd 'java')) {
    Write-Fail '未找到 Java'
    Write-Tip  'Capacitor 7 需要 JDK 21（不是 17）'
    Write-Tip  '下载 JDK 21: https://adoptium.net/temurin/releases/?version=21'
    Write-Tip  '（或直接用新版 Android Studio 附带的 JDK 21）；安装后设置 JAVA_HOME'
    Wait-Exit 1
}
$javaVer = (& java -version 2>&1 | Select-Object -First 1) -join ' '
Write-Ok "Java: $javaVer"
if ($javaVer -notmatch '"2[1-9]') {
    Write-Note 'Capacitor 7 Android 构建需要 JDK 21。当前 Java 似乎不是 21，构建可能报 "invalid source release: 21"。'
    Write-Tip  '装 JDK 21 后把 JAVA_HOME 指向它：https://adoptium.net/temurin/releases/?version=21'
}
if ($env:JAVA_HOME) { Write-Tip "JAVA_HOME = $env:JAVA_HOME" }

# ============================================================
#  Step 4/6  Android SDK
# ============================================================
Write-Step 'Step 4/6  检查 Android SDK'

function Find-AndroidSdk {
    # D 盘优先：C 盘剩余空间长期紧张，SDK 又是 600MB 起步
    $candidates = @(
        $env:ANDROID_HOME, $env:ANDROID_SDK_ROOT,
        'D:\Android\Sdk',
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
        (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'),
        'C:\Android\Sdk'
    )
    foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
    return $null
}

function Install-AndroidSdk {
    param([string]$SdkRoot)
    Write-Note "安装 Android SDK 到 $SdkRoot（约 600MB）"
    $zipPath = Join-Path $CacheDir 'cmdline-tools.zip'
    if (-not (Test-Path $zipPath)) {
        try {
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' `
                -OutFile $zipPath -UseBasicParsing -TimeoutSec 600
        } catch { Write-Fail "下载失败: $($_.Exception.Message)"; return $false }
    }
    $ctRoot = Join-Path $SdkRoot 'cmdline-tools'
    $tmp = Join-Path $CacheDir 'ct-extract'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $tmp -Force

    $latestDir = Join-Path $ctRoot 'latest'
    if (Test-Path $latestDir) { Remove-Item $latestDir -Recurse -Force }
    New-Item -ItemType Directory -Path $ctRoot -Force | Out-Null
    Move-Item -Path (Join-Path $tmp 'cmdline-tools') -Destination $latestDir -Force
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

    $sdkmanager = Join-Path $latestDir 'bin\sdkmanager.bat'
    if (-not (Test-Path $sdkmanager)) { Write-Fail 'sdkmanager 解压异常'; return $false }

    Write-Note '接受许可协议 ...'
    (1..60 | ForEach-Object { 'y' }) | & $sdkmanager --sdk_root="$SdkRoot" --licenses 2>&1 | Out-Null

    Write-Note '安装 platform-tools / platforms;android-35 / build-tools;35.0.0 ...'
    & $sdkmanager --sdk_root="$SdkRoot" 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0' 2>&1 |
        Select-Object -Last 5 | ForEach-Object { Write-Tip $_ }

    return (Test-Path (Join-Path $SdkRoot 'platforms'))
}

$sdkRoot = Find-AndroidSdk
if (-not $sdkRoot) {
    if ($InstallSdk) {
        $sdkRoot = $SdkDefault
        New-Item -ItemType Directory -Path $sdkRoot -Force | Out-Null
        if (-not (Install-AndroidSdk -SdkRoot $sdkRoot)) { Write-Fail 'SDK 安装失败'; $sdkRoot = $null }
    } else {
        Write-Fail '未找到 Android SDK'
        Write-Host ''
        Write-Tip '三条路可选：'
        Write-Tip '  1) 自动装（推荐）: scripts\build-apk.ps1 -InstallSdk -Mirror'
        Write-Tip '  2) 装 Android Studio，打开 apk-build\android 目录构建'
        Write-Tip '  3) 不碰安卓环境：先部署公网，再用 PWABuilder 在线转 APK'
        Write-Tip '     https://www.pwabuilder.com/'
        Wait-Exit 1
    }
}
if (-not $sdkRoot) { Wait-Exit 1 }

$env:ANDROID_HOME     = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
Write-Ok "Android SDK: $sdkRoot"

# ============================================================
#  Step 5/6  Capacitor 同步
# ============================================================
Write-Step 'Step 5/6  Capacitor 同步'

if ($Recreate -and (Test-Path $AndroidDir)) {
    Write-Note '按 -Recreate 删除现有 android/ 工程'
    Remove-Item $AndroidDir -Recurse -Force
}

Push-Location $ApkDir
try {
    if (-not (Test-Path $AndroidDir)) {
        Write-Note '首次运行，生成 Android 平台工程 ...'
        & npx --yes cap add android
        if ($LASTEXITCODE -ne 0) {
            Write-Fail 'cap add android 失败'
            Write-Tip  '确认 @capacitor/cli 与 @capacitor/android 已安装（bun install）'
            Pop-Location; Wait-Exit 1
        }
        Write-Ok 'Android 工程已生成'
    } else {
        Write-Ok 'Android 工程已存在'
    }

    Write-Note '同步静态资源 ...'
    & npx --yes cap sync android
    if ($LASTEXITCODE -ne 0) { Write-Fail 'cap sync 失败'; Pop-Location; Wait-Exit 1 }
    Write-Ok '资源同步完成'
} finally {
    if ((Get-Location).Path -eq $ApkDir) { Pop-Location }
}

# SDK 路径写进 local.properties
$localProps = Join-Path $AndroidDir 'local.properties'
$sdkEscaped = $sdkRoot -replace '\\', '\\\\' -replace ':', '\:'
Set-Content -Path $localProps -Value "sdk.dir=$sdkEscaped" -Encoding ascii
Write-Ok 'local.properties 已写入'

# ============================================================
#  Step 6/6  Gradle 构建
# ============================================================
Write-Step 'Step 6/6  编译 APK（首次会下载依赖，请耐心等待）'

$gradlew = Join-Path $AndroidDir 'gradlew.bat'
if (-not (Test-Path $gradlew)) {
    Write-Fail "未找到 $gradlew"
    Write-Tip  '用 -Recreate 重新生成 Android 工程'
    Wait-Exit 1
}

$gradleArgs = @()
if ($Type -eq 'release') { $gradleArgs += 'assembleRelease' } else { $gradleArgs += 'assembleDebug' }
$gradleArgs += '--no-daemon'
$gradleArgs += '--warning-mode=none'

if ($Mirror) {
    $initScript = Join-Path $ProjectRoot 'deploy\gradle-mirror.init.gradle'
    if (Test-Path $initScript) {
        $gradleArgs += @('--init-script', $initScript)
        Write-Note '已启用阿里云 Maven 镜像'
    }
}

Push-Location $AndroidDir
Write-Tip "gradlew $($gradleArgs -join ' ')"
& $gradlew @gradleArgs
$buildCode = $LASTEXITCODE
Pop-Location

if ($buildCode -ne 0) {
    Write-Fail "Gradle 构建失败（退出码 $buildCode）"
    Write-Host ''
    Write-Tip '常见原因：'
    Write-Tip '  · 依赖下载超时  -> 加 -Mirror 重试'
    Write-Tip '  · SDK 组件缺失  -> 加 -InstallSdk 重试'
    Write-Tip '  · JDK 版本不对  -> Capacitor 7 需要 JDK 21（不是 17）'
    Write-Tip '  · 工程状态异常  -> 加 -Recreate 重新生成'
    Write-Host ''
    Write-Tip '实在装不起环境，用在线转换（零本地依赖）：'
    Write-Tip '  1) scripts\deploy-cloudflare.ps1 把站点发到公网'
    Write-Tip '  2) https://www.pwabuilder.com/ 输入网址 -> Package for stores -> Android'
    Wait-Exit 1
}

$apkDirPath = Join-Path $AndroidDir "app\build\outputs\apk\$Type"
$apk = Get-ChildItem -Path $apkDirPath -Filter '*.apk' -File -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $apk) { Write-Fail "未找到 APK，预期目录: $apkDirPath"; Wait-Exit 1 }

$outName = "farm-cooling-calculator-$Type-$(Get-Date -Format 'yyyyMMdd').apk"
$outPath = Join-Path $ProjectRoot $outName
Copy-Item $apk.FullName -Destination $outPath -Force

Write-Host ''
Write-Ok 'APK 打包成功！'
Write-Host "         文件: $outPath" -ForegroundColor White
Write-Host "         大小: $('{0:N1} MB' -f ($apk.Length / 1MB))" -ForegroundColor White
Write-Host ''
Write-Tip '安装：传到手机 -> 设置允许"安装未知来源应用" -> 点击安装'
Write-Tip 'APK 已内置全部网页资源，安装后完全离线可用'
if ($Type -eq 'release') {
    Write-Host ''
    Write-Note 'release 包未签名，无法直接安装。自用打 debug 包；上架需自行签名。'
}

Wait-Exit 0
