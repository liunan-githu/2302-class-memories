import { Icon } from '@iconify/react'

export function EmptyState({ icon = 'lucide:inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center mb-4">
        <Icon icon={icon} width={36} height={36} className="text-gray-400 dark:text-dark-500" />
      </div>
      {title && <h3 className="text-lg font-heading font-semibold text-gray-700 dark:text-dark-300 mb-1">{title}</h3>}
      {description && <p className="text-sm text-gray-400 dark:text-dark-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
