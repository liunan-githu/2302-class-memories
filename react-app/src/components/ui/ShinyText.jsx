export function ShinyText({ children, as: Tag = 'span', className, speed = 3 }) {
  return (
    <Tag
      className={className}
      style={{
        background: 'linear-gradient(90deg, #D97706 0%, #F59E0B 25%, #FFF 50%, #F59E0B 75%, #D97706 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `shiny-text ${speed}s linear infinite`,
      }}
    >
      <style>{`
        @keyframes shiny-text {
          to { background-position: 200% center; }
        }
      `}</style>
      {children}
    </Tag>
  )
}

export function DecryptedText({ text, className }) {
  return (
    <span className={className}>
      <style>{`
        @keyframes decrypt {
          0% { opacity: 0; filter: blur(8px); transform: translateY(4px); }
          100% { opacity: 1; filter: blur(0); transform: translateY(0); }
        }
        .decrypt-char {
          display: inline-block;
          opacity: 0;
          animation: decrypt 0.4s ease forwards;
        }
      `}</style>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="decrypt-char"
          style={{ animationDelay: `${i * 0.03}s` }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  )
}
