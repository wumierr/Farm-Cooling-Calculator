'use client'

import * as React from 'react'
import { Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalculatorStore } from './store'
import { PRESETS } from '@/lib/calculator'
import type { PresetKey } from '@/lib/calculator'

/** 生成作业处方单 HTML 并在新窗口打印（可另存为 PDF） */
export function PrescriptionExport() {
  const {
    params, output, advice, strategies, costBenefit, activePreset,
  } = useCalculatorStore()

  const handlePrint = () => {
    if (!output?.optimum) return
    const opt = output.optimum
    const d = advice?.detail
    const bi = advice?.batchInfo
    const cb = costBenefit
    const presetName = activePreset !== 'custom'
      ? PRESETS[activePreset as Exclude<PresetKey, 'custom'>].name
      : '自定义'
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>葡萄大棚降温剂作业处方单 — ${dateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #1a1a2e; background: #fff; line-height: 1.6;
    padding: 24px; max-width: 720px; margin: 0 auto;
  }
  @page { margin: 12mm; size: A4; }
  .header {
    text-align: center; border-bottom: 3px solid #2d6a4f;
    padding-bottom: 12px; margin-bottom: 18px;
  }
  .header h1 { font-size: 20px; color: #1b4332; margin-bottom: 4px; }
  .header .sub { font-size: 12px; color: #555; }
  .meta {
    display: flex; justify-content: space-between;
    font-size: 11px; color: #555; margin-bottom: 16px;
    padding: 8px 12px; background: #f0f4f2; border-radius: 4px;
  }
  .section { margin-bottom: 16px; }
  .section h2 {
    font-size: 14px; color: #2d6a4f; border-left: 4px solid #2d6a4f;
    padding-left: 8px; margin-bottom: 8px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
  td.label { color: #555; width: 40%; }
  td.value { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  .opt-box {
    background: linear-gradient(135deg, #fff8e1, #fff3cd);
    border: 2px solid #ffc107; border-radius: 8px;
    padding: 16px; text-align: center; margin-bottom: 16px;
  }
  .opt-box .big { font-size: 36px; font-weight: 800; color: #1b4332; line-height: 1.1; }
  .opt-box .label { font-size: 12px; color: #555; margin-bottom: 8px; }
  .opt-box .row { display: flex; justify-content: center; gap: 24px; margin-top: 10px; }
  .opt-box .row .item { text-align: center; }
  .opt-box .row .v { font-size: 16px; font-weight: 700; color: #2d6a4f; }
  .opt-box .row .l { font-size: 10px; color: #555; }
  .advice {
    background: #e8f5e9; border: 1px solid #2d6a4f;
    border-radius: 4px; padding: 10px 14px; font-weight: 600;
    font-size: 13px; color: #1b4332; margin-top: 12px;
  }
  .strategy-table th {
    background: #f8faf9; font-size: 11px; color: #555;
    font-weight: 600; padding: 6px 8px; border-bottom: 2px solid #dee2e6; text-align: left;
  }
  .strategy-table td { font-size: 12px; }
  .strategy-table .right { text-align: right; }
  .warning { color: #c0392b; font-size: 11px; margin-top: 4px; }
  .benefit {
    background: #e8f5e9; border-radius: 6px; padding: 10px 14px;
    font-size: 12px; margin-top: 8px;
  }
  .benefit .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .benefit .net { font-weight: 700; border-top: 1px solid #2d6a4f; margin-top: 4px; padding-top: 4px; }
  .sign {
    margin-top: 32px; display: flex; justify-content: space-between;
    font-size: 12px; color: #555;
  }
  .sign .line { border-bottom: 1px solid #999; width: 160px; height: 24px; display: inline-block; }
  .footer {
    margin-top: 24px; padding-top: 12px; border-top: 1px dashed #ccc;
    font-size: 10px; color: #888; text-align: center;
  }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>🍇 葡萄大棚降温剂作业处方单</h1>
    <div class="sub">基于光合效益与有害积热（HHA）模型的遮阳率优化建议</div>
  </div>

  <div class="meta">
    <span>生成日期：${dateStr}</span>
    <span>品种：${presetName}</span>
    <span>大棚面积：${params.sprayArea} 亩</span>
  </div>

  <div class="opt-box">
    <div class="label">推荐遮阳率 S<sub>opt</sub></div>
    <div class="big">${(opt.R * 100).toFixed(0)}%</div>
    <div class="row">
      <div class="item"><div class="v">${opt.Y.toFixed(4)}</div><div class="l">综合效益 Y</div></div>
      <div class="item"><div class="v">${opt.Tmax_cooled}°C</div><div class="l">降温后棚温</div></div>
      <div class="item"><div class="v">−${opt.deltaT}°C</div><div class="l">降温幅度</div></div>
    </div>
    ${advice ? `<div class="advice">${advice.value}</div>` : ''}
  </div>

  <div class="section">
    <h2>作业参数</h2>
    <table>
      <tr><td class="label">建议兑水比</td><td class="value">${d?.ratio ?? '--'}</td></tr>
      <tr><td class="label">覆盖能力</td><td class="value">${d?.coverage ?? '--'}</td></tr>
      <tr><td class="label">总粉剂用量（${params.sprayArea} 亩）</td><td class="value">${d ? d.powderKg.toFixed(1) + ' kg' : '--'}</td></tr>
      <tr><td class="label">总用水量（${params.sprayArea} 亩）</td><td class="value">${d ? d.waterL.toFixed(0) + ' L' : '--'}</td></tr>
      ${bi ? `<tr><td class="label">分批次数（每桶 ${bi.safeCap.toFixed(0)}L）</td><td class="value">${bi.batches} 次</td></tr>
      <tr><td class="label">每批粉剂 / 水量</td><td class="value">${bi.powderPerBatch.toFixed(2)} kg / ${bi.waterPerBatch.toFixed(1)} L</td></tr>` : ''}
      <tr><td class="label">粉剂成本</td><td class="value">¥${d ? (d.powderKg * params.powderPrice).toFixed(2) : '--'}</td></tr>
    </table>
  </div>

  ${strategies.length > 1 ? `
  <div class="section">
    <h2>策略对比</h2>
    <table class="strategy-table">
      <thead><tr><th>策略</th><th class="right">遮阳率</th><th class="right">综合效益 Y</th><th class="right">棚温</th><th class="right">损失率</th></tr></thead>
      <tbody>
        ${strategies.map((s) => `<tr>
          <td>${s.name}</td>
          <td class="right">${(s.data.R * 100).toFixed(0)}%</td>
          <td class="right">${s.data.Y.toFixed(4)}</td>
          <td class="right${s.data.Tmax_cooled > params.T0 ? ' warning' : ''}">${s.data.Tmax_cooled}°C</td>
          <td class="right">${(s.data.L * 100).toFixed(1)}%</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${cb ? `
  <div class="section">
    <h2>净收益分析（相对不施用）</h2>
    <div class="benefit">
      <div class="row"><span>不施用时损失率</span><span>${(cb.baselineLoss * 100).toFixed(1)}%</span></div>
      <div class="row"><span>施用后损失率</span><span>${(cb.afterLoss * 100).toFixed(1)}%</span></div>
      <div class="row"><span>挽回产量</span><span>${cb.savedYieldKg.toFixed(1)} kg</span></div>
      <div class="row"><span>挽回收益</span><span>¥${cb.savedRevenue.toFixed(2)}</span></div>
      <div class="row"><span>粉剂成本</span><span>−¥${cb.powderCost.toFixed(2)}</span></div>
      <div class="row net"><span>净收益</span><span style="color:${cb.netBenefit >= 0 ? '#2d6a4f' : '#c0392b'}">${cb.netBenefit >= 0 ? '+' : ''}¥${cb.netBenefit.toFixed(2)}</span></div>
    </div>
  </div>` : ''}

  <div class="section">
    <h2>关键参数</h2>
    <table>
      <tr><td class="label">光饱和点 LSP / 补偿点 LCP</td><td class="value">${params.LSP} / ${params.LCP} μmol/m²/s</td></tr>
      <tr><td class="label">HHA 高温阈值 T₀</td><td class="value">${params.T0}°C</td></tr>
      <tr><td class="label">天气 Tmax / Tmin / 日长</td><td class="value">${params.Tmax} / ${params.Tmin}°C / ${params.D}h</td></tr>
      <tr><td class="label">PAR 峰值 / 湿度</td><td class="value">${params.Imax} μmol/m²/s / ${params.RH}%</td></tr>
      <tr><td class="label">有害积热 HHA</td><td class="value">${opt.HHA.toFixed(1)} °C²·h</td></tr>
      <tr><td class="label">光合保留率 A_rel</td><td class="value">${(opt.A_rel * 100).toFixed(2)}%</td></tr>
    </table>
  </div>

  <div class="sign">
    <span>技术人员签字：<span class="line"></span></span>
    <span>日期：<span class="line"></span></span>
  </div>

  <div class="footer">
    本处方单由葡萄大棚降温剂计算器自动生成 · 仅供决策参考 · 实际作业请结合田间观测<br/>
    模型：Y = A_rel × (1 − L) · HHA = Σ(T−T₀)² × 湿度系数 · 降温量日照加权
  </div>

  <script>
    window.onload = () => { window.print(); }
  </script>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) {
      alert('请允许弹出窗口以打印处方单')
      return
    }
    w.document.write(html)
    w.document.close()
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} disabled={!output?.optimum}>
      <Printer className="h-4 w-4" />
      <span className="hidden sm:inline ml-1">处方单</span>
    </Button>
  )
}
