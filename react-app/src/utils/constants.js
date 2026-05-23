export const CATEGORIES = ['活动', '学习', '生活', '体育', '文艺', '其他']

export const VIDEO_CATEGORIES = ['活动', '学习', '生活', '体育', '文艺', '其他']

export const PRIVACY_OPTIONS = [
  { value: 'public', label: '公开' },
  { value: 'private', label: '仅自己可见' },
]

export const SORT_OPTIONS = [
  { value: 'name', label: '按姓名' },
  { value: 'graduationYear', label: '按毕业年份' },
  { value: 'newest', label: '按添加时间' },
]

export const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))
