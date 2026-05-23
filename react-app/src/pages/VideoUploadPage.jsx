import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { videoService } from '../services/videoService'
import { useUploadProgress } from '../hooks/useUploadProgress'
import { Input, Textarea } from '../components/ui/Input'
import { toast } from '../components/ui/Toast'
import Stepper, { Step } from '../components/ui/Stepper'
import { CATEGORIES, PRIVACY_OPTIONS } from '../utils/constants'

export default function VideoUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [allowComments, setAllowComments] = useState(true)
  const { upload, progress, speed, status } = useUploadProgress()

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error('请选择视频文件')
      return
    }
    setFile(f)
  }

  const handleCoverChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const handleSubmit = async () => {
    if (!file) { toast.error('请选择视频文件'); return }
    if (!title.trim()) { toast.error('请输入视频标题'); return }

    const formData = new FormData()
    formData.append('video', file)
    if (coverFile) formData.append('cover', coverFile)
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('category', category || '其他')
    formData.append('tags', tags.trim())
    formData.append('privacy', privacy)
    formData.append('allowComments', String(allowComments))

    try {
      await upload('/api/upload', formData)
      toast.success('上传成功，等待审核')
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
          <h1 className="text-2xl font-heading font-bold">上传视频</h1>
          <p className="text-sm text-gray-400 mt-0.5">分享你的精彩瞬间</p>
        </div>
      </div>

      <Stepper
        variant="primary"
        nextButtonText="继续"
        backButtonText="返回"
        completeButtonText="开始上传"
        beforeFinalStepCompleted={handleSubmit}
        onFinalStepCompleted={() => {
          sessionStorage.setItem('uploadJustCompleted', 'true')
          navigate('/upload/status')
        }}
      >
        {/* Step 1: Select File */}
        <Step label="选择文件">
          <div className="space-y-5">
            <h3 className="font-heading font-semibold text-lg">选择视频文件</h3>

            {/* Video drop zone */}
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`glass rounded-2xl p-10 text-center cursor-pointer transition-all border-2 border-dashed ${file ? 'border-primary-400 bg-primary-50/30 dark:bg-primary-900/10' : 'border-gray-200 dark:border-dark-600 hover:border-primary-400'}`}
            >
              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              {file ? (
                <div>
                  <Icon icon="lucide:video" width={56} height={56} className="text-primary-500 mx-auto mb-4" />
                  <p className="font-semibold text-lg">{file.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  {!isUploading && <p className="text-sm text-primary-500 mt-3 font-medium">点击重新选择</p>}
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                    <Icon icon="lucide:film" width={32} height={32} className="text-primary-500" />
                  </div>
                  <p className="font-semibold text-lg">点击选择视频文件</p>
                  <p className="text-sm text-gray-400 mt-1">支持 MP4、MOV、AVI 等格式</p>
                </div>
              )}
            </div>

            {/* Cover upload */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-700/50">
              <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-dark-800 flex-shrink-0">
                {coverPreview && <img src={coverPreview} alt="" className="w-full h-full object-cover" />}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <Icon icon="lucide:camera" width={22} height={22} className="text-white" />
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">封面图片（可选）</p>
                <p className="text-xs text-gray-400">不上传将自动从视频中提取</p>
              </div>
            </div>
          </div>
        </Step>

        {/* Step 2: Metadata */}
        <Step label="填写信息">
          <div className="space-y-4">
            <h3 className="font-heading font-semibold text-lg">填写视频信息</h3>
            <Input label="视频标题" placeholder="给你的视频起个名字" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isUploading} />
            <Textarea label="视频描述" placeholder="介绍一下视频内容吧" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isUploading} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5">分类</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" disabled={isUploading}>
                  <option value="">选择分类</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="标签" placeholder="用逗号分隔" value={tags} onChange={(e) => setTags(e.target.value)} disabled={isUploading} />
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-200 mb-1.5">隐私</label>
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" disabled={isUploading}>
                  {PRIVACY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-5">
                <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="w-4 h-4 rounded accent-primary-600" disabled={isUploading} />
                <span className="text-sm">允许评论</span>
              </label>
            </div>
          </div>
        </Step>

        {/* Step 3: Confirm */}
        <Step label="确认上传">
          <div className="space-y-5">
            <h3 className="font-heading font-semibold text-lg">确认上传信息</h3>

            {/* Summary card */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-dark-800 flex-shrink-0">
                  {coverPreview && <img src={coverPreview} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{title || '(未填写标题)'}</p>
                  <p className="text-sm text-gray-400">{file?.name} · {(file?.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">分类</p>
                  <p className="font-medium">{category || '其他'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">隐私</p>
                  <p className="font-medium">{PRIVACY_OPTIONS.find((o) => o.value === privacy)?.label}</p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700/50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">评论</p>
                  <p className="font-medium">{allowComments ? '允许' : '禁止'}</p>
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
                  <div className="h-full bg-gradient-to-r from-primary-500 to-rose-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
