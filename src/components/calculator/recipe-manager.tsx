'use client'

import * as React from 'react'
import { Save, FolderOpen, Trash2, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCalculatorStore } from './store'
import type { CalcParams, PresetKey } from '@/lib/calculator'

interface SavedRecipe {
  id: string
  name: string
  params: CalcParams
  preset: PresetKey
  savedAt: number
}

const RECIPES_KEY = 'gcc:recipes:v2'

function loadRecipes(): SavedRecipe[] {
  try {
    const raw = localStorage.getItem(RECIPES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveRecipes(recipes: SavedRecipe[]) {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes))
  } catch (e) {
    console.warn('save recipes failed', e)
  }
}

export function RecipeManager() {
  const { params, activePreset, loadParams } = useCalculatorStore()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [recipes, setRecipes] = React.useState<SavedRecipe[]>([])
  const [selectedId, setSelectedId] = React.useState('')

  React.useEffect(() => {
    if (open) setRecipes(loadRecipes())
  }, [open])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('请输入配方名称')
      return
    }
    const recipe: SavedRecipe = {
      id: `r_${Date.now()}`,
      name: name.trim(),
      params: JSON.parse(JSON.stringify(params)),
      preset: activePreset,
      savedAt: Date.now(),
    }
    const next = [recipe, ...recipes]
    saveRecipes(next)
    setRecipes(next)
    setName('')
    toast.success(`已保存配方「${recipe.name}」`)
  }

  const handleLoad = () => {
    if (!selectedId) {
      toast.error('请先选择配方')
      return
    }
    const recipe = recipes.find((r) => r.id === selectedId)
    if (!recipe) return
    loadParams(recipe.params, recipe.preset)
    toast.success(`已载入配方「${recipe.name}」`)
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    const next = recipes.filter((r) => r.id !== id)
    saveRecipes(next)
    setRecipes(next)
    if (selectedId === id) setSelectedId('')
    toast.success('已删除')
  }

  const handleExport = () => {
    const data = {
      params, activePreset, exportedAt: new Date().toISOString(),
      version: 'v2',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `降温剂配方_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('已导出 JSON')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.params) {
          loadParams(data.params, data.activePreset ?? 'custom')
          toast.success('已导入配方')
        } else {
          toast.error('文件格式不正确')
        }
      } catch {
        toast.error('解析失败')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={handleExport} title="导出当前参数为 JSON">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">导出</span>
      </Button>
      <Button variant="outline" size="sm" asChild title="导入 JSON 配方">
        <label className="cursor-pointer">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">导入</span>
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">配方</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>配方管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">保存当前参数</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入配方名称，如「克瑞森_夏季45度」"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <Button onClick={handleSave} size="icon">
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">已保存配方 ({recipes.length})</label>
              {recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">暂无保存的配方</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                  {recipes.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                        selectedId === r.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.savedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleLoad} disabled={!selectedId} className="flex-1">
                载入选中配方
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>关闭</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
