import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAuth } from '../context/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { toast } from '../components/ui/Toast'
import Stepper, { Step } from '../components/ui/Stepper'

export default function AuthPage({ tab: initialTab }) {
  const [tab, setTab] = useState(initialTab || 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const validateUsername = () => {
    const errs = {}
    if (username.length < 3 || username.length > 20) errs.username = '用户名需要3-20个字符'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validatePassword = () => {
    const errs = {}
    if (password.length < 6) errs.password = '密码至少需要6位'
    if (confirmPassword && password !== confirmPassword) errs.confirmPassword = '两次密码不一致'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username, password)
      toast.success('登录成功')
      navigate('/')
    } catch (err) {
      toast.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      toast.error('请填写所有必填项')
      return
    }
    if (username.length < 3 || username.length > 20) {
      toast.error('用户名需要3-20个字符')
      return
    }
    if (password.length < 6) {
      toast.error('密码至少需要6位')
      return
    }
    if (password !== confirmPassword) {
      toast.error('两次密码不一致')
      return
    }

    setLoading(true)
    try {
      await register(username, password)
      toast.success('注册成功，欢迎加入2302班！')
      navigate('/')
    } catch (err) {
      toast.error(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="glass rounded-2xl w-full max-w-[440px] p-8 shadow-xl animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Icon icon="lucide:graduation-cap" width={36} height={36} className="text-primary-600" />
            <h1 className="text-2xl font-heading font-bold">2302班回忆录</h1>
          </div>
          <p className="text-gray-500 dark:text-dark-400">记录我们的美好时光</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-dark-800 rounded-full p-1 mb-6">
          <button
            onClick={() => { setTab('login'); setErrors({}) }}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === 'login' ? 'bg-white dark:bg-dark-700 text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            登录
          </button>
          <button
            onClick={() => { setTab('register'); setErrors({}) }}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === 'register' ? 'bg-white dark:bg-dark-700 text-rose-600 shadow-sm' : 'text-gray-500'}`}
          >
            注册
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <Input
                label="用户名"
                icon={<Icon icon="lucide:user" width={16} height={16} />}
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <Input
                label="密码"
                type="password"
                icon={<Icon icon="lucide:lock" width={16} height={16} />}
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                <Icon icon="lucide:log-in" width={18} height={18} />
                登录
              </Button>
            </div>
          </form>
        ) : (
          <Stepper
            variant="rose"
            nextButtonText="继续"
            backButtonText="返回"
            completeButtonText="注册"
            onFinalStepCompleted={handleRegister}
            onStepChange={(step) => {
              setErrors({})
              if (step === 2) validateUsername()
              if (step === 3) validatePassword()
            }}
          >
            {/* Step 1: Username */}
            <Step label="创建账号">
              <div className="space-y-4">
                <h3 className="font-heading font-semibold text-lg">选择你的用户名</h3>
                <p className="text-sm text-gray-500 dark:text-dark-400">这是你在班级回忆录里的名字，同学们会通过它认识你。</p>
                <Input
                  label="用户名"
                  icon={<Icon icon="lucide:user-plus" width={16} height={16} />}
                  placeholder="3-20个字符"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrors({}) }}
                  error={errors.username}
                  required
                  autoComplete="username"
                />
                {username.length >= 3 && !errors.username && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <Icon icon="lucide:check-circle" width={16} height={16} />
                    用户名可用
                  </div>
                )}
              </div>
            </Step>

            {/* Step 2: Password */}
            <Step label="设置密码">
              <div className="space-y-4">
                <h3 className="font-heading font-semibold text-lg">设置安全密码</h3>
                <p className="text-sm text-gray-500 dark:text-dark-400">保护你的账号和回忆。</p>
                <Input
                  label="密码"
                  type="password"
                  icon={<Icon icon="lucide:lock" width={16} height={16} />}
                  placeholder="至少6位"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}) }}
                  error={errors.password}
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="确认密码"
                  type="password"
                  icon={<Icon icon="lucide:shield-check" width={16} height={16} />}
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}) }}
                  error={errors.confirmPassword}
                  required
                  autoComplete="new-password"
                />
              </div>
            </Step>

            {/* Step 3: Review */}
            <Step label="确认信息">
              <div className="space-y-5">
                <h3 className="font-heading font-semibold text-lg">确认你的信息</h3>
                <p className="text-sm text-gray-500 dark:text-dark-400">确认无误后点击注册，马上加入2302班！</p>

                <div className="glass rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <Icon icon="lucide:user" width={18} height={18} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">用户名</p>
                      <p className="font-semibold">{username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <Icon icon="lucide:key-round" width={18} height={18} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">密码</p>
                      <p className="font-semibold">{password}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-400 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
                  <Icon icon="lucide:info" width={14} height={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  注册即表示你同意遵守班级社区的规范，友善分享，尊重他人隐私。
                </div>
              </div>
            </Step>
          </Stepper>
        )}
      </div>
    </div>
  )
}
