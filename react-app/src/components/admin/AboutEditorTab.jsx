import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { aboutService } from '../../services/aboutService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { toast } from '../ui/Toast'

export default function AboutEditorTab() {
  const [about, setAbout] = useState({ creatorName: '', creatorRole: '', projectDesc: '', projectDesc2: '', thanks: '', thanks2: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    aboutService.get()
      .then((data) => { if (data) setAbout(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await aboutService.update(about)
      toast.success('已保存')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">关于页编辑</h1>
      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        <Input label="创作者名称" value={about.creatorName} onChange={(e) => setAbout({ ...about, creatorName: e.target.value })} />
        <Input label="创作者角色" value={about.creatorRole} onChange={(e) => setAbout({ ...about, creatorRole: e.target.value })} />
        <Textarea label="项目描述（第一部分）" value={about.projectDesc} onChange={(e) => setAbout({ ...about, projectDesc: e.target.value })} />
        <Textarea label="项目描述（第二部分）" value={about.projectDesc2} onChange={(e) => setAbout({ ...about, projectDesc2: e.target.value })} />
        <Textarea label="感谢语（第一部分）" value={about.thanks} onChange={(e) => setAbout({ ...about, thanks: e.target.value })} />
        <Textarea label="感谢语（第二部分）" value={about.thanks2} onChange={(e) => setAbout({ ...about, thanks2: e.target.value })} />
        <Button type="submit" loading={saving}>
          <Icon icon="lucide:save" width={18} height={18} /> 保存修改
        </Button>
      </form>
    </div>
  )
}
