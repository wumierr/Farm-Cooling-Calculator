'use client'

import * as React from 'react'
import { Download, WifiOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** PWA 注册 + 安装提示 + 离线状态指示 */
export function PWARegister() {
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = React.useState(true)
  const [swRegistered, setSwRegistered] = React.useState(false)

  // 注册 Service Worker（仅生产环境）
  // dev 模式不注册 SW，因为 skipWaiting()+clients.claim() 会导致：
  // 1. Turbopack 重编译时自动刷新页面
  // 2. 浏览器底部闪烁提醒
  // 如果浏览器之前注册过 SW 需要手动在 DevTools -> Application -> Service Workers 中 Unregister
  React.useEffect(() => {
    if (window.location.protocol === 'file:') return // APK 环境
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then(() => {
        setSwRegistered(true)
      }).catch((err) => {
        console.warn('[PWA] SW registration failed:', err)
      })
    } else if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'production') {
      // 开发模式：主动注销之前可能注册的 SW（治本）
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      })
    }
  }, [])

  // 监听安装提示
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // 监听在线/离线状态
  React.useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      toast.success('已安装到桌面，可离线使用')
    }
    setInstallEvent(null)
  }

  return (
    <>
      {/* 安装提示按钮（仅可安装时显示） */}
      {installEvent && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in no-print">
          <Button size="sm" onClick={handleInstall} className="shadow-lg">
            <Download className="h-4 w-4 mr-1" />
            安装到桌面
          </Button>
        </div>
      )}

      {/* 离线指示器（仅离线时显示） */}
      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in no-print">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400 backdrop-blur-md">
            <WifiOff className="h-3.5 w-3.5" />
            离线模式 · 缓存数据可用
          </div>
        </div>
      )}

      {/* SW 就绪指示（底部小角标，仅生产环境且已注册时短暂显示） */}
      {swRegistered && process.env.NODE_ENV === 'production' && (
        <div className="fixed bottom-1 right-1 z-40 no-print opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
            离线就绪
          </div>
        </div>
      )}
    </>
  )
}
