# APK 打包环境（apk-build/）

此文件夹存放 Capacitor APK 打包相关的配置和脚本。

> **注意**：文件夹名为 `apk-build` 而非 `app`，因为 Next.js App Router 会将根目录的 `app/` 识别为路由目录，与 `src/app/` 冲突。

## 文件说明

| 文件 | 用途 |
|------|------|
| `capacitor.config.json` | Capacitor 配置（appId、应用名、webDir 指向静态导出目录） |
| `build-apk.sh` | 一键 APK 打包脚本 |
| `README.md` | 本说明文件 |

## 打包流程

在项目根目录执行：

```bash
./apk-build/build-apk.sh
```

> Windows 用户请改用 `scripts\build-apk.ps1 -InstallSdk -Mirror`（可自动装 SDK）。

脚本会自动完成：
1. 设置 `CAPACITOR_BUILD=1` 环境变量
2. 执行 `next build`（静态导出到 `out/` 目录）
3. 初始化 Capacitor（首次）
4. 添加 Android 平台（首次）
5. 同步静态资源到 Android 工程
6. 编译生成 APK

## 产物位置

```
apk-build/android/app/build/outputs/apk/debug/app-debug.apk
```

## 应用信息

- **应用 ID**: `com.grape.coolingcalc`
- **应用名**: 降温剂计算器
- **包名**: 可在 `capacitor.config.json` 中修改

## 注意事项

1. **JDK 21 是硬要求**：Capacitor 7 打 Android 包强制 Java 21（不是 17），否则报
   `invalid source release: 21`。装 [JDK 21](https://adoptium.net/temurin/releases/?version=21)
   并设好 `JAVA_HOME`。
2. **Android SDK**：需要 `platforms;android-35` + `build-tools;35.0.0`（Capacitor 7 对应 API 35）。
   Windows 用 `build-apk.ps1 -InstallSdk` 可自动装；Linux/macOS 用 Android Studio 或 sdkmanager 装。
3. 生成的 APK 使用 Debug 证书，适合内部分发。
4. 如需正式签名，准备 `.jks` 密钥库并把 Gradle 任务改为 `assembleRelease`。
5. APK 中已包含所有网页资源，安装后**离线可用**，无需网络。

> 版本对照：Capacitor **7** → JDK 21 / SDK 35 / AGP 8.7.2 / Gradle 8.11.1（本项目当前）。
> 若升级到 Capacitor **8** → 需 JDK 21 / **SDK 36** / AGP 8.13 / Gradle 8.14.3 / **Node 22+**。
