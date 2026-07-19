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
./app/build-apk.sh
```

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

1. 首次打包会自动下载 JDK 和 Android SDK（约 500MB），需要网络
2. 生成的 APK 使用 Debug 证书，适合内部分发
3. 如需正式签名，准备 `.jks` 密钥库并修改构建参数为 `assembleRelease`
4. APK 中已包含所有网页资源，安装后**离线可用**，无需网络
