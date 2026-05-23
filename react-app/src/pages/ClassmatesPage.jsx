import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { classmateService } from '../services/classmateService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { escapeHtml } from '../utils/escapeHtml'
import { TiltCard } from '../components/ui/TiltCard'
import AnimatedContent from '../components/ui/AnimatedContent'
import { SORT_OPTIONS, YEARS } from '../utils/constants'

export default function ClassmatesPage() {
  const [classmates, setClassmates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('name')
  const [selected, setSelected] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await classmateService.getAll({ search, graduationYear: year, sort })
      setClassmates(data || [])
    } catch {} finally { setLoading(false) }
  }, [search, year, sort])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">同学录</h1>
        <p className="text-gray-500 dark:text-dark-400">我们的同窗时光</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 relative">
          <Icon icon="lucide:search" width={18} height={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索同学..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-sm"
          />
        </div>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-sm">
          <option value="">全部年份</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-sm">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : classmates.length === 0 ? (
        <EmptyState icon="lucide:users" title="暂无同学信息" description="还没有人添加同学录信息" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classmates.map((c, i) => (
            <AnimatedContent key={c.id} delay={i * 0.05} distance={30}>
              <TiltCard tiltAmount={5} glowColor="rgba(245, 158, 11, 0.06)">
                <div
                  className="glass rounded-2xl overflow-hidden cursor-pointer hover-lift"
                  onClick={() => setSelected(c)}
                >
              <div className="aspect-[3/4] bg-gray-100 dark:bg-dark-800 overflow-hidden">
                {c.photo ? (
                  <img src={`/uploads/${c.photo}`} alt={c.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon icon="lucide:user" width={64} height={64} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-heading font-semibold text-lg">{escapeHtml(c.name)}</h3>
                {c.graduationYear && <p className="text-sm text-gray-400">{c.graduationYear}年毕业</p>}
              </div>
            </div>
          </TiltCard>
        </AnimatedContent>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected.name} size="md">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-48 aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-800 flex-shrink-0">
              {selected.photo ? (
                <img src={`/uploads/${selected.photo}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="lucide:user" width={64} height={64} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              {selected.graduationYear && <p className="text-sm"><span className="text-gray-400">毕业年份：</span>{selected.graduationYear}</p>}
              {selected.personality && <p className="text-sm"><span className="text-gray-400">个性：</span>{selected.personality}</p>}
              {selected.contact && <p className="text-sm"><span className="text-gray-400">联系方式：</span>{selected.contact}</p>}
              {selected.description && <p className="text-sm text-gray-600 dark:text-dark-300 mt-4">{escapeHtml(selected.description)}</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
