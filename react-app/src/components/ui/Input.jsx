import { cn } from '../../utils/cn'

export function Input({ label, error, hint, className, icon, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-200">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-dark-800 px-4 py-2.5 text-sm transition-all duration-200',
            'border-gray-200 dark:border-dark-600',
            'focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20',
            'placeholder:text-gray-400 dark:placeholder:text-dark-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon && 'pl-10',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
            className,
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-200">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-xl border bg-white dark:bg-dark-800 px-4 py-2.5 text-sm transition-all duration-200 resize-y min-h-[80px]',
          'border-gray-200 dark:border-dark-600',
          'focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20',
          'placeholder:text-gray-400 dark:placeholder:text-dark-500',
          error && 'border-danger-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  )
}
