import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg',
  secondary: 'border-2 border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20',
  ghost: 'text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-md',
  success: 'bg-success-500 text-white hover:bg-success-600 shadow-md',
  outline: 'border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ children, variant = 'primary', size = 'md', className, disabled, loading, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
