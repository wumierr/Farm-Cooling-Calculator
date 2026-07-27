import { NextResponse } from "next/server";

// output: "export"（静态导出）下，路由处理器必须显式声明为静态，
// 否则 next build 会报：
//   export const dynamic = "force-static"/export const revalidate
//   not configured on route "/api" with "output: export"
// 这个接口只返回固定 JSON，本来就是静态的，声明一下即可。
// 将来要加真正的动态接口，就得改用 standalone 模式部署（见 docs/DEPLOY.md 第 2 节）。
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}
