import { Link } from 'react-router-dom'

export function GuestBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-rose-500 p-8 text-white text-center mb-8">
      <div className="absolute inset-0 bg-radial from-white/10 to-transparent" />
      <h3 className="relative text-2xl font-heading font-bold mb-2">欢迎来到 2302班回忆录</h3>
      <p className="relative text-white/80 mb-6">登录后即可上传视频和照片，记录美好时光</p>
      <div className="relative flex items-center justify-center gap-4">
        <Link to="/login" className="px-6 py-2.5 rounded-full bg-white text-primary-600 font-semibold hover:bg-white/90 transition">
          登录
        </Link>
        <Link to="/register" className="px-6 py-2.5 rounded-full border-2 border-white/50 text-white font-semibold hover:bg-white/10 transition">
          注册
        </Link>
      </div>
    </div>
  )
}
