import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { photoService } from '../services/photoService'
import { useUploadProgress } from '../hooks/useUploadProgress'
import { Input, Textarea } from '../components/ui/Input'
import { toast } from '../components/ui/Toast'
import Stepper, { Step } from '../components/ui/Stepper'
import { CATEGORIES } from '../utils/constants'

export default function PhotoUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const { upload, progress, speed, status } = useUploadProgress()

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    if (selected.length > 50) { toast.error('最多上传50张照片'); return }
    setFiles(selected)
    const readers = selected.map((f) => new Promise((resolve) => {
      const r = new FileReader()
      r.onload = (ev) => resolve(ev.target.result)
      r.readAsDataURL(f)
    }))
    Promise.all(readers).then(setPreviews)
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (files.length === 0) { toast.error('请选择照片'); return }
    if (!title.trim()) { toast.error('请输入标题'); return }

    const formData = new FormData()
    files.forEach((f) => formData.append('photos', f))
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('category', category || '其他')
    formData.append('tags', tags.trim())

    try {
      await upload('/api/photos/batch', formData)
      toast.success(`成功上传 ${files.length} 张照片，等待审核`)
    } catch (err) {
      toast.error(err.message || '上传失败')
      throw err
    }
  }

  const isUploading = status === 'uploading'

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition">
          <Icon icon="lucide:arrow-left" width={24} height={24} />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold">上传照片</h1>
          <p className="text-sm text-gray-400 mt-0.5">最多可选择 50 张</p>
        </div>
      </div>

      <Stepper
        variant="teal"
        nextButtonText="继续"
        backButtonText="返回"
        completeButtonText="开始上传"
        beforeFinalStepCompleted={handleSubmit}
        onFinalStepCompleted={() => navigate('/upload/status')}
      >
        {/* Step 1: Select Photos */}
        <Step label="选择照片">
          <div className="space-y-5">
            <h3 className="font-heading font-semibold text-lg">选择照片文件</h3>

            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`glass rounded-2xl p-10 text-center cursor-pointer transition-all border-2 border-dashed ${files.length > 0 ? 'border-teal-400 bg-teal-50/30 dark:bg-teal-900/10' : 'border-gray-200 dark:border-dark-600 hover:border-teal-400'}`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" disabled={isUploading} />
              <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                <Icon icon="lucide:images" width={32} height={32} className="text-teal-500" />
              </div>
              <p className="font-semibold text-lg">点击选择照片</p>
              <p className="text-sm text-gray-400 mt-1">
                {files.length > 0 ? `已选择 ${files.length} 张` : '支持 JPG、PNG、WebP 等格式'}
              </p>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {previews.slice(0, 10).map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-dark-800">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {previews.length > 10 && (
                  <div className="aspect-square rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500">+{previews.length - 10}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Step>

        {/* Step 2: Preview & Edit */}
        <Step label="管理预览">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">预览与管理</h3>
              <span className="text-sm text-gray-400">{files.length} 张照片</span>
            </div>

            {previews.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Icon icon="lucide:image-off" width={48} height={48} className="text-gray-300 dark:text-dark-500 mx-auto mb-4" />
                <p className="text-gray-400">还没有选择照片</p>
                <p className="text-sm text-gray-400 mt-1">请返回上一步选择照片</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {previews.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      <Icon icon="lucide:x" width={14} height={14} className="text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end px-2 pb-1">
                      <span className="text-white text-[10px]">{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Step>

        {/* Step 3: Metadata */}
        <Step label="填写信息">
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg">填写照片信息</h3>
            <Input label="照片标题" placeholder="给这组照片起个名字" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isUploading} />
            <Textarea label="照片描述" placeholder="介绍一下这些照片" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5">分类</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none" disabled={isUploading}>
                  <option value="">选择分类</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="标签" placeholder="用逗号分隔" value={tags} onChange={(e) => setTags(e.target.value)} disabled={isUploading} />
            </div>
          </div>
        </Step>

        {/* Step 4: Confirm */}
        <Step label="确认上传">
          <div className="space-y-5">
            <h3 className="font-heading font-semibold text-lg">确认上传信息</h3>

            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Preview strip */}
              {previews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {previews.slice(0, 6).map((p, i) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-dark-800 flex-shrink-0">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {previews.length > 6 && (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-500">+{previews.length - 6}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="font-semibold">{title || '(未填写标题)'}</p>
                <p className="text-sm text-gray-400">{files.length} 张照片</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">分类</p>
                  <p className="font-medium">{category || '其他'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">标签</p>
                  <p className="font-medium truncate">{tags || '无'}</p>
                </div>
              </div>

              {description && (
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">描述</p>
                  <p className="text-sm">{description}</p>
                </div>
              )}
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">上传中...</span>
                  <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                {speed > 0 && <p className="text-xs text-gray-400 mt-2">{speed.toFixed(1)} MB/s</p>}
              </div>
            )}
          </div>
        </Step>
      </Stepper>
    </div>
  )
}
