import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { classmateService } from '../../services/classmateService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import { escapeHtml } from '../../utils/escapeHtml'
import { YEARS } from '../../utils/constants'

const emptyForm = { name: '', graduationYear: '', personality: '', contact: '', description: '', photo: null }

export default function ClassmateManageTab() {
  const [classmates, setClassmates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    setLoading(true)
    try { setClassmates(await classmateService.getAll() || []) } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('graduationYear', form.graduationYear)
    fd.append('personality', form.personality)
    fd.append('contact', form.contact)
    fd.append('description', form.description)
    if (form.photo instanceof File) fd.append('photo', form.photo)

    try {
      if (editing) {
        await classmateService.update(editing.id, fd)
        toast.success('已更新')
      } else {
        await classmateService.add(fd)
        toast.success('已添加')
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      loadData()
    } catch (e) { toast.error(e.message) }
  }

  const handleEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name || '', graduationYear: c.graduationYear || '', personality: c.personality || '', contact: c.contact || '', description: c.description || '', photo: null })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此同学？')) return
    try { await classmateService.delete(id); loadData(); toast.success('已删除') } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">同学录管理</h1>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }}>
          <Icon icon="lucide:plus" width={18} height={18} /> 添加同学
        </Button>
      </div>

      {loading ? <LoadingSpinner /> : classmates.length === 0 ? (
        <div className="text-center py-16 text-dark-400"><p>暂无同学信息</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classmates.map((c) => (
            <div key={c.id} className="bg-dark-800 rounded-xl overflow-hidden">
              <div className="aspect-[2/1] bg-dark-700 flex items-center justify-center">
                {c.photo ? <img src={`/uploads/${c.photo}`} alt="" className="w-full h-full object-cover" /> : <Icon icon="lucide:user" width={48} height={48} className="text-dark-500" />}
              </div>
              <div className="p-4">
                <h3 className="text-white font-heading font-semibold">{escapeHtml(c.name)}</h3>
                {c.graduationYear && <p className="text-dark-400 text-sm">毕业：{c.graduationYear}年</p>}
                {c.description && <p className="text-dark-500 text-xs mt-2 line-clamp-2">{escapeHtml(c.description)}</p>}
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(c)}>编辑</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                    <Icon icon="lucide:trash" width={16} height={16} className="text-dark-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? '编辑同学' : '添加同学'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5">毕业年份</label>
            <select value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm">
              <option value="">选择年份</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <Input label="个性" value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} />
          <Input label="联系方式" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Textarea label="简介" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5">照片（可选）</label>
            <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] })} className="text-sm" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>取消</Button>
            <Button type="submit">{editing ? '保存' : '添加'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
