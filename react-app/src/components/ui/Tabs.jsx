import { cn } from '../../utils/cn'

export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 p-1 bg-gray-100 dark:bg-dark-800 rounded-full', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            active === tab.value
              ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
              active === tab.value ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-200 dark:bg-dark-600',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
