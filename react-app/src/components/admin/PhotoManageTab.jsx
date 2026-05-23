import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { photoService } from '../../services/photoService'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Tabs } from '../ui/Tabs'
import { Modal } from '../ui/Modal'
import { toast } from '../ui/Toast'
import { formatTimeAgo } from '../../utils/formatTime'
import { escapeHtml } from '../../utils/escapeHtml'
import { useAuth } from '../../context/AuthContext'
import { PERMISSIONS } from '../../utils/permissionMap'

export default function PhotoManageTab() {
  const { hasPermission } = useAuth()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = tab === 'pending' ? await photoService.getPending() : await photoService.getAll()
      setPhotos(data || [])
    } catch {} finally { setLoading(false) }
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  const filtered = photos.filter((p) => {
    if (tab === 'pending') return p.status === 'pending'
    if (tab === 'all') return true
    return false
  }).filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  })

  const handleApprove = async (id) => {
    try { await photoService.approve(id); loadData(); toast.success('已通过') } catch (e) { toast.error(e.message) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try { await photoService.reject(rejectModal, rejectReason); setRejectModal(null); setRejectReason(''); loadData(); toast.success('已拒绝') } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此照片集？')) return
    try { await photoService.delete(id); loadData(); toast.success('已删除') } catch (e) { toast.error(e.message) }
  }

  const statusVariant = (s) => s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : 'pending'

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">照片管理</h1>

      <div className="flex items-center justify-between gap-4 mb-6">
        <Tabs tabs={[{ value: 'pending', label: '待审核' }, { value: 'all', label: '全部' }]} active={tab} onChange={setTab} />
        <div className="relative">
          <Icon icon="lucide:search" width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input type="text" placeholder="搜索照片..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 rounded-xl border border-dark-600 bg-dark-800 text-white text-sm" />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <div className="text-center py-16 text-dark-400"><Icon icon="lucide:image" width={48} height={48} className="mx-auto mb-4 opacity-50" /><p>暂无照片</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-dark-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p.photos?.[0] ? <img src={`/uploads/${p.photos[0].filename}`} alt="" className="w-full h-full object-cover" /> : <Icon icon="lucide:image" width={24} height={24} className="text-dark-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium">{escapeHtml(p.title)}</h3>
                <p className="text-dark-400 text-sm">{p.photos?.length || 0} 张 · {formatTimeAgo(p.created_at)}</p>
              </div>
              <Badge variant={statusVariant(p.status)}>{p.status === 'approved' ? '已通过' : p.status === 'rejected' ? '已拒绝' : '待审核'}</Badge>
              <div className="flex items-center gap-2">
                {p.status === 'pending' && (
                  <>
                    <Button variant="success" size="sm" onClick={() => handleApprove(p.id)}>通过</Button>
                    <Button variant="danger" size="sm" onClick={() => setRejectModal(p.id)}>拒绝</Button>
                  </>
                )}
                {hasPermission(PERMISSIONS.PHOTO_DELETE) && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Icon icon="lucide:trash" width={16} height={16} className="text-dark-400" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="拒绝照片">
        <div className="space-y-4">
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm min-h-[80px]" placeholder="拒绝原因..." />
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setRejectModal(null)}>取消</Button>
            <Button variant="danger" onClick={handleReject}>确认拒绝</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
