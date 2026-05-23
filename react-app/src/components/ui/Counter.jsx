import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import './Counter.css'

function Number({ mv, number, height }) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let memo = offset * height
    if (offset > 5) {
      memo -= 10 * height
    }
    return memo
  })

  return (
    <motion.span className="counter-number" style={{ y }}>
      {number}
    </motion.span>
  )
}

function normalizeNearInteger(num) {
  const nearest = Math.round(num)
  const tolerance = 1e-9 * Math.max(1, Math.abs(num))
  return Math.abs(num - nearest) < tolerance ? nearest : num
}

function getValueRoundedToPlace(value, place) {
  const scaled = value / place
  return Math.floor(normalizeNearInteger(scaled))
}

function Digit({ place, value, height }) {
  const valueRoundedToPlace = getValueRoundedToPlace(value, place)
  const animatedValue = useSpring(valueRoundedToPlace)

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])

  return (
    <span className="counter-digit" style={{ height }}>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  )
}

export default function Counter({
  value,
  places,
  fontSize = 80,
  padding = 5,
  gap = 10,
  textColor = 'inherit',
  fontWeight = 900,
  borderRadius = 6,
  horizontalPadding = 8,
  gradientHeight = 16,
  gradientFrom = 'var(--color-bg, white)',
  gradientTo = 'transparent',
  containerStyle,
  counterStyle,
}) {
  const height = fontSize + padding

  return (
    <span className="counter-container" style={containerStyle}>
      <span
        className="counter-counter"
        style={{
          fontSize,
          gap,
          borderRadius,
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
          color: textColor,
          fontWeight,
          direction: 'ltr',
          ...counterStyle,
        }}
      >
        {places.map((place, i) => (
          <Digit key={i} place={place} value={value} height={height} />
        ))}
      </span>
      <span className="gradient-container">
        <span
          className="top-gradient"
          style={{ height: gradientHeight, background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
        />
        <span
          className="bottom-gradient"
          style={{ height: gradientHeight, background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})` }}
        />
      </span>
    </span>
  )
}
