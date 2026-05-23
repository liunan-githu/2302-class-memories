import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../context/AuthContext'
import { videoService } from '../services/videoService'
import { photoService } from '../services/photoService'
import { GuestBanner } from '../components/layout/GuestBanner'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { VideoCard } from '../components/video/VideoCard'
import { PhotoCard } from '../components/photo/PhotoCard'
import { Tabs } from '../components/ui/Tabs'
import SplitText from '../components/ui/SplitText'
import Magnet from '../components/ui/Magnet'
import { ParticlesBackground } from '../components/ui/ParticlesBackground'
import AnimatedContent from '../components/ui/AnimatedContent'
import CountdownTimer from '../components/ui/CountdownTimer'
import { CATEGORIES } from '../utils/constants'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [contentTab, setContentTab] = useState('videos')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [videoData, photoData] = await Promise.all([
        videoService.getApproved(),
        photoService.getApproved(),
      ])
      setVideos(videoData || [])
      setPhotos(photoData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredVideos = category === 'all' ? videos : videos.filter((v) => v.category === category)
  const filteredPhotos = category === 'all' ? photos : photos.filter((p) => p.category === category)

  const scrollToContent = () => {
    document.getElementById('content-area')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <ParticlesBackground count={25} />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary-400/20 to-rose-400/20 blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-teal-400/20 to-primary-400/20 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 flex flex-col-reverse md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <p className="text-primary-600 dark:text-primary-400 font-semibold mb-3 text-lg">
              <SplitText text="记录美好时光" delay={40} duration={0.5} splitType="chars" />
            </p>
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold mb-4">
              <SplitText text="2302班回忆录" delay={60} duration={0.7} splitType="chars" gradient />
            </h1>
            <p className="text-lg text-gray-500 dark:text-dark-400 mb-8 leading-relaxed">
              <SplitText text="珍藏我们在一起的每一刻" delay={30} duration={0.5} splitType="words" />
              <br />
              <SplitText text="从课堂到校园，从欢笑到成长" delay={30} duration={0.5} splitType="words" />
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Magnet padding={50} magnetStrength={9}>
                <button
                  onClick={() => navigate('/upload/video')}
                  className="px-6 py-3 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg flex items-center gap-2"
                >
                  上传回忆 <Icon icon="lucide:arrow-right" width={18} height={18} />
                </button>
              </Magnet>
              <button
                onClick={scrollToContent}
                className="px-6 py-3 rounded-full border-2 border-primary-600 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center gap-2"
              >
                <Icon icon="lucide:video" width={18} height={18} /> 浏览视频
              </button>
              <button
                onClick={() => navigate('/classmates')}
                className="px-6 py-3 rounded-full border-2 border-gray-300 dark:border-dark-600 text-gray-600 dark:text-dark-300 font-semibold hover:bg-gray-50 dark:hover:bg-dark-700 transition-all flex items-center gap-2"
              >
                <Icon icon="lucide:users" width={18} height={18} /> 同学录
              </button>
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="w-52 h-52 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center shadow-2xl animate-float">
              <Icon icon="lucide:graduation-cap" width={120} height={120} className="text-white" />
            </div>
          </div>
        </div>

        <button onClick={scrollToContent} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 hover:text-primary-600 transition-colors">
          <Icon icon="lucide:chevrons-down" width={28} height={28} className="animate-bounce" />
          <span className="text-xs">向下滚动</span>
        </button>
      </section>

      {/* Countdown Timer */}
      <CountdownTimer
        targetDate="2026-06-18T09:00:00+08:00"
        title="距离中考还有"
        fontSize={56}
      />

      {/* Content Area */}
      <div id="content-area" className="mx-auto max-w-[1440px] px-4 py-12">
        {!isAuthenticated && <GuestBanner />}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Category Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-[84px]">
              <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                <Icon icon="lucide:filter" width={18} height={18} className="text-primary-600" />
                分类筛选
              </h3>
              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                <button
                  onClick={() => setCategory('all')}
                  className={`px-4 py-2.5 rounded-full lg:rounded-xl text-sm font-medium whitespace-nowrap transition-all ${category === 'all' ? 'bg-primary-600 text-white shadow-md' : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-700'}`}
                >
                  全部
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2.5 rounded-full lg:rounded-xl text-sm font-medium whitespace-nowrap transition-all ${category === cat ? 'bg-primary-600 text-white shadow-md' : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <Icon icon={contentTab === 'videos' ? 'lucide:video' : 'lucide:image'} width={24} height={24} className="text-primary-600" />
                {contentTab === 'videos' ? '视频' : '照片'}
              </h2>
              <Tabs
                tabs={[
                  { value: 'videos', label: '视频' },
                  { value: 'photos', label: '照片' },
                ]}
                active={contentTab}
                onChange={setContentTab}
              />
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <EmptyState icon="lucide:alert-circle" title="加载失败" description={error} />
            ) : contentTab === 'videos' ? (
              filteredVideos.length === 0 ? (
                <EmptyState icon="lucide:video" title="暂无视频" description="还没有人上传视频，快来分享第一个吧！" action={
                  <button onClick={() => navigate('/upload/video')} className="px-5 py-2.5 rounded-full bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition">
                    上传视频
                  </button>
                } />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {filteredVideos.map((video, i) => (
                    <AnimatedContent key={video.id} delay={i * 0.05} distance={40}>
                      <VideoCard video={video} />
                    </AnimatedContent>
                  ))}
                </div>
              )
            ) : (
              filteredPhotos.length === 0 ? (
                <EmptyState icon="lucide:image" title="暂无照片" description="还没有人上传照片，快来分享吧！" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredPhotos.map((photo, i) => (
                    <AnimatedContent key={photo.id} delay={i * 0.05} distance={40}>
                      <PhotoCard photo={photo} />
                    </AnimatedContent>
                  ))}
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
