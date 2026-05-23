import { useState, Children } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const variantStyles = {
  primary: {
    active: '#D97706',
    complete: '#F59E0B',
    bg: '#FFFBF0',
    border: 'border-amber-200 dark:border-amber-800',
    nextBtn: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white',
    connector: 'bg-amber-200 dark:bg-amber-800',
    connectorComplete: 'bg-primary-500',
    shadow: 'shadow-lg shadow-amber-500/10',
  },
  teal: {
    active: '#0D9488',
    complete: '#14B8A6',
    bg: '#F0FDFA',
    border: 'border-teal-200 dark:border-teal-800',
    nextBtn: 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white',
    connector: 'bg-teal-200 dark:bg-teal-800',
    connectorComplete: 'bg-teal-500',
    shadow: 'shadow-lg shadow-teal-500/10',
  },
  rose: {
    active: '#E11D48',
    complete: '#FB7185',
    bg: '#FFF5F5',
    border: 'border-rose-200 dark:border-rose-800',
    nextBtn: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white',
    connector: 'bg-rose-100 dark:bg-rose-800/60',
    connectorComplete: 'bg-rose-400',
    shadow: 'shadow-lg shadow-rose-500/10',
  },
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  beforeFinalStepCompleted = null,
  backButtonText = '上一步',
  nextButtonText = '下一步',
  completeButtonText = '完成',
  disableStepIndicators = false,
  variant = 'primary',
}) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [direction, setDirection] = useState(0)
  const [completing, setCompleting] = useState(false)
  const stepsArray = Children.toArray(children)
  const totalSteps = stepsArray.length
  const isCompleted = currentStep > totalSteps
  const isLastStep = currentStep === totalSteps
  const colors = variantStyles[variant] || variantStyles.primary

  const updateStep = (newStep) => {
    setCurrentStep(newStep)
    if (newStep > totalSteps) {
      onFinalStepCompleted()
    } else {
      onStepChange(newStep)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1)
      updateStep(currentStep - 1)
    }
  }

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1)
      updateStep(currentStep + 1)
    }
  }

  const handleComplete = async () => {
    if (beforeFinalStepCompleted) {
      setCompleting(true)
      try {
        await beforeFinalStepCompleted()
        setCompleting(false)
        setDirection(1)
        updateStep(totalSteps + 1)
      } catch {
        setCompleting(false)
      }
    } else {
      setDirection(1)
      updateStep(totalSteps + 1)
    }
  }

  return (
    <div className={`w-full max-w-xl mx-auto rounded-2xl bg-white dark:bg-dark-800 ${colors.border} border ${colors.shadow}`}>
      {/* Step indicators + labels */}
      <div className="flex w-full px-8 pt-8 pb-4">
        {stepsArray.map((_, index) => {
          const stepNumber = index + 1
          const isFirstStep = index === 0
          const isLastStep = index === totalSteps - 1
          const status = currentStep === stepNumber ? 'active' : currentStep < stepNumber ? 'inactive' : 'complete'
          const stepLabel = stepsArray[index]?.props?.label || `步骤 ${stepNumber}`
          return (
            <div key={stepNumber} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                <div className={`flex-1 h-0.5 rounded overflow-hidden ${isFirstStep ? 'invisible' : colors.connector}`}>
                  {!isFirstStep && (
                    <motion.div
                      className={`h-full ${colors.connectorComplete}`}
                      initial={false}
                      animate={{ width: currentStep > stepNumber ? '100%' : '0%' }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </div>
                <StepDot
                  step={stepNumber}
                  status={status}
                  onClick={() => {
                    if (!disableStepIndicators && !completing && stepNumber !== currentStep) {
                      setDirection(stepNumber > currentStep ? 1 : -1)
                      updateStep(stepNumber)
                    }
                  }}
                  disabled={disableStepIndicators || completing}
                  colors={colors}
                />
                <div className={`flex-1 h-0.5 rounded overflow-hidden ${isLastStep ? 'invisible' : colors.connector}`}>
                  {!isLastStep && (
                    <motion.div
                      className={`h-full ${colors.connectorComplete}`}
                      initial={false}
                      animate={{ width: currentStep > stepNumber ? '100%' : '0%' }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium mt-2 transition-colors whitespace-nowrap ${
                status === 'active' ? 'text-gray-800 dark:text-white font-semibold' :
                status === 'complete' ? 'text-gray-500 dark:text-dark-400' :
                'text-gray-400 dark:text-dark-500'
              }`}>
                {stepLabel}
              </span>
            </div>
          )
        })}
      </div>

      {/* Content */}
      <StepContentWrapper
        isCompleted={isCompleted}
        currentStep={currentStep}
        direction={direction}
      >
        {isCompleted ? (
          <div className="px-8 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">全部完成!</h3>
            <p className="text-sm text-gray-500 dark:text-dark-400">你已完成所有步骤</p>
          </div>
        ) : (
          stepsArray[currentStep - 1]
        )}

        {/* Footer */}
        {!isCompleted && (
          <div className="px-8 pb-8 mt-8">
            <div className={`flex ${currentStep !== 1 ? 'justify-between' : 'justify-end'}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  disabled={completing}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${completing ? 'text-gray-300 dark:text-dark-600 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800 dark:text-dark-400 dark:hover:text-white'}`}
                >
                  {backButtonText}
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                disabled={completing}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${completing ? 'opacity-60 cursor-not-allowed' : ''} ${colors.nextBtn}`}
              >
                {completing ? '处理中...' : isLastStep ? completeButtonText : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </StepContentWrapper>
    </div>
  )
}

function StepDot({ step, status, onClick, disabled, colors }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-full"
      style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.5 : 1 }}
      animate={status}
      initial={false}
    >
      <motion.div
        className="flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm"
        variants={{
          inactive: { scale: 1, backgroundColor: '#F3E8D6', color: '#C4B08A' },
          active: { scale: 1.1, backgroundColor: colors.active, color: '#fff' },
          complete: { scale: 1, backgroundColor: colors.complete, color: '#fff' },
        }}
        transition={{ duration: 0.3 }}
      >
        {status === 'complete' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : status === 'active' ? (
          <div className="w-3 h-3 rounded-full bg-white" />
        ) : (
          <span>{step}</span>
        )}
      </motion.div>
    </motion.button>
  )
}

function StepContentWrapper({ isCompleted, currentStep, direction, children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </div>
  )
}

function SlideTransition({ children, direction }) {
  return (
    <motion.div
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

const stepVariants = {
  enter: (dir) => ({
    x: dir >= 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir) => ({
    x: dir >= 0 ? '-50%' : '50%',
    opacity: 0,
  }),
}

export function Step({ children, label }) {
  return <div className="px-8">{children}</div>
}
