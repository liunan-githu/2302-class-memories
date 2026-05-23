import { cn } from '../../utils/cn'

export function LoadingSpinner({ className, size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-16 h-16' }
  return (
    <div className="flex items-center justify-center p-8">
      <div className={cn('border-4 border-primary-200 dark:border-dark-600 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin', sizes[size], className)} />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
