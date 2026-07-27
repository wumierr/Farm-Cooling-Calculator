/**
 * （已停用）本项目为纯客户端计算器，所有计算都在浏览器完成，不需要数据库。
 *
 * 原先此文件基于 Prisma 创建数据库连接，但全项目从未 import 过它——属脚手架
 * 模板遗留。为消除 @prisma/client / prisma 这一重型且与本项目无关的依赖
 * （native 引擎、拖慢 install、增大版本冲突面），已移除依赖并将此文件留空占位。
 *
 * 将来若真要加"服务端持久化 / 跨设备同步"，再按 docs/DEPLOY.md 的 standalone
 * 方案重新引入 Prisma，并把 next.config 从静态导出切回 standalone。
 */

export {}
