import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import AnimatedContent from '../components/ui/AnimatedContent'
import Folder from '../components/ui/Folder'

const folders = [
  {
    path: '/upload/video',
    icon: <Icon icon="lucide:video-plus" width={20} height={20} />,
    title: '上传视频',
    color: '#D97706',
    papers: ['MP4 / MOV / AVI', '高清转码处理', '自动提取封面'],
  },
  {
    path: '/upload/photos',
    icon: <Icon icon="lucide:images" width={20} height={20} />,
    title: '上传照片',
    color: '#0D9488',
    papers: ['JPG / PNG / WebP', '批量上传 50 张', '即时预览管理'],
  },
  {
    path: '/upload/status',
    icon: <Icon icon="lucide:list-checks" width={20} height={20} />,
    title: '我的上传',
    color: '#E11D48',
    papers: ['查看上传进度', '视频转码状态', '审核结果通知'],
  },
]

export default function UploadCenterPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <AnimatedContent distance={30} duration={0.5}>
        <div className="text-center mb-12">
          <h1 className="text-3xl font-heading font-bold mb-2">上传中心</h1>
          <p className="text-gray-500 dark:text-dark-400">选择你想要上传的内容类型</p>
        </div>
      </AnimatedContent>

      <div className="flex flex-wrap justify-center gap-8 md:gap-12">
        {folders.map((f, i) => (
          <AnimatedContent key={f.path} distance={40} duration={0.5} delay={i * 0.12}>
            <Folder
              color={f.color}
              size={200}
              icon={f.icon}
              title={f.title}
              papers={f.papers}
              onClick={() => navigate(f.path)}
            />
          </AnimatedContent>
        ))}
      </div>
    </div>
  )
}
