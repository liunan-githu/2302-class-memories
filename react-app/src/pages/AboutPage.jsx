import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { aboutService } from '../services/aboutService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import AnimatedContent from '../components/ui/AnimatedContent'
import SpotlightCard from '../components/ui/SpotlightCard'
import { escapeHtml } from '../utils/escapeHtml'

const defaults = {
  creatorName: '2302班',
  creatorRole: '青春记录者',
  projectDesc: '2302班回忆录，记录班级美好时光的视频分享平台',
  projectDesc2: '珍藏课堂、校园、活动中的每一个精彩瞬间',
  thanks: '感谢每一位同学的参与与分享',
  thanks2: '愿青春永驻，友谊长存',
}

const features = [
  { icon: 'lucide:video', title: '视频分享', desc: '上传和分享班级活动视频' },
  { icon: 'lucide:image', title: '照片墙', desc: '批量上传班级合影和活动照片' },
  { icon: 'lucide:users', title: '同学录', desc: '记录每一位同学的资料' },
  { icon: 'lucide:shield', title: '审核机制', desc: '保证内容质量和安全' },
]

const techs = ['React', 'Express.js', 'Tailwind CSS', 'FFmpeg', 'LowDB', 'JWT']

export default function AboutPage() {
  const [about, setAbout] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    aboutService.get()
      .then((data) => setAbout(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const a = about || defaults

  if (loading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Creator Card */}
      <AnimatedContent distance={30} duration={0.6}>
        <div className="glass rounded-2xl p-8 text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:graduation-cap" width={48} height={48} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-1">{escapeHtml(a.creatorName)}</h1>
          <p className="text-gray-500 dark:text-dark-400">{escapeHtml(a.creatorRole)}</p>
        </div>
      </AnimatedContent>

      {/* Description */}
      <AnimatedContent distance={30} duration={0.6} delay={0.1}>
        <SpotlightCard className="glass rounded-2xl p-8 mb-8" spotlightColor="rgba(255, 200, 150, 0.2)">
          <h2 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
            <Icon icon="lucide:heart" width={22} height={22} className="text-rose-500" /> 关于项目
          </h2>
          <p className="text-gray-600 dark:text-dark-300 leading-relaxed mb-4">{escapeHtml(a.projectDesc)}</p>
          <p className="text-gray-600 dark:text-dark-300 leading-relaxed">{escapeHtml(a.projectDesc2)}</p>
        </SpotlightCard>
      </AnimatedContent>

      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {features.map((f, i) => (
          <AnimatedContent key={f.title} distance={30} duration={0.5} delay={0.15 + i * 0.08}>
            <div className="glass rounded-2xl p-6 text-center hover-lift">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                <Icon icon={f.icon} width={24} height={24} className="text-primary-600" />
              </div>
              <h3 className="font-heading font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-400">{f.desc}</p>
            </div>
          </AnimatedContent>
        ))}
      </div>

      {/* Tech Stack */}
      <AnimatedContent distance={30} duration={0.6} delay={0.2}>
        <div className="glass rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
            <Icon icon="lucide:cpu" width={22} height={22} className="text-primary-600" /> 技术栈
          </h2>
          <div className="flex flex-wrap gap-2">
            {techs.map((t) => (
              <span key={t} className="px-4 py-2 rounded-full bg-gray-100 dark:bg-dark-800 text-sm font-medium text-gray-600 dark:text-dark-300">{t}</span>
            ))}
          </div>
        </div>
      </AnimatedContent>

      {/* Thanks */}
      <AnimatedContent distance={30} duration={0.6} delay={0.3}>
        <div className="glass rounded-2xl p-8 text-center">
          <h2 className="text-xl font-heading font-semibold mb-4">感谢</h2>
          <p className="text-gray-600 dark:text-dark-300 leading-relaxed mb-2">{escapeHtml(a.thanks)}</p>
          <p className="text-gray-600 dark:text-dark-300 leading-relaxed">{escapeHtml(a.thanks2)}</p>
        </div>
      </AnimatedContent>
    </div>
  )
}
