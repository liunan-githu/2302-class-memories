import { useState, useEffect, useCallback } from 'react'
import Counter from './Counter'

function getRemaining(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  }
}

function placesFor(num, minDigits) {
  if (num >= 100) return [100, 10, 1]
  return Array.from({ length: minDigits }, (_, i) => 10 ** (minDigits - 1 - i))
}

export default function CountdownTimer({
  targetDate = '2026-06-20T09:00:00',
  title = '距离中考还有',
  fontSize = 64,
}) {
  const [{ days, hours, minutes, seconds, expired }, setRemaining] = useState(() =>
    getRemaining(targetDate)
  )

  const tick = useCallback(() => {
    setRemaining(getRemaining(targetDate))
  }, [targetDate])

  useEffect(() => {
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  if (expired) {
    return (
      <section className="py-12 text-center">
        <p className="text-3xl font-heading font-bold text-primary-600 dark:text-primary-400">
          中考加油！
        </p>
      </section>
    )
  }

  return (
    <section className="py-10 md:py-14">
      <p className="text-center text-lg md:text-xl font-semibold text-gray-600 dark:text-dark-300 mb-6 tracking-wide">
        {title}
      </p>

      <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
        <DigitGroup value={days} minDigits={2} fontSize={fontSize} label="天" />
        <Separator fontSize={fontSize} />
        <DigitGroup value={hours} minDigits={2} fontSize={fontSize} label="时" />
        <Separator fontSize={fontSize} />
        <DigitGroup value={minutes} minDigits={2} fontSize={fontSize} label="分" />
        <Separator fontSize={fontSize} />
        <DigitGroup value={seconds} minDigits={2} fontSize={fontSize} label="秒" />
      </div>
    </section>
  )
}

function DigitGroup({ value, minDigits, fontSize, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white dark:bg-dark-800 rounded-xl px-2 py-1 shadow-md border border-gray-200 dark:border-dark-600">
        <Counter
          value={value}
          places={placesFor(value, minDigits)}
          fontSize={fontSize}
          padding={4}
          gap={3}
          textColor="currentColor"
          fontWeight={900}
          gradientHeight={0}
          counterStyle={{ color: 'var(--color-primary-600)', background: 'transparent' }}
        />
      </div>
      <span className="text-sm font-medium text-gray-500 dark:text-dark-400">
        {label}
      </span>
    </div>
  )
}

function Separator({ fontSize }) {
  return (
    <span
      className="text-primary-300 dark:text-primary-600 font-extrabold self-start mt-2 select-none"
      style={{ fontSize: fontSize * 0.6 }}
    >
      :
    </span>
  )
}
