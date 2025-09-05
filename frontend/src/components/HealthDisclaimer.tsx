import { useState } from 'react'

interface HealthDisclaimerProps {
  variant?: 'banner' | 'modal' | 'inline'
  className?: string
}

export default function HealthDisclaimer({ variant = 'banner', className = '' }: HealthDisclaimerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false)

  if (!isVisible && variant === 'banner') return null

  const shortDisclaimer = "This content is for educational purposes only and is not medical advice."
  const fullDisclaimer = `
    IMPORTANT HEALTH DISCLAIMER:
    
    The information provided through this AI assistant is for educational and informational purposes only. 
    It is not intended as a substitute for professional medical advice, diagnosis, or treatment.
    
    • Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
    • Never disregard professional medical advice or delay in seeking it because of something you have read or heard through this service.
    • The content is based on Dr. Andrew Huberman's publicly available research and podcasts, but individual health needs vary significantly.
    • This AI system may not have access to the most current medical research or your personal health history.
    • If you think you may have a medical emergency, call your doctor or emergency services immediately.
    
    By using this service, you acknowledge that you understand these limitations and agree to use the information responsibly.
  `

  if (variant === 'banner') {
    return (
      <div className={`bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-amber-200 text-sm">
              {shortDisclaimer}
              <button
                onClick={() => setShowFullDisclaimer(true)}
                className="text-amber-400 hover:text-amber-300 underline ml-1"
              >
                Read full disclaimer
              </button>
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-amber-400 hover:text-amber-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`bg-slate-800/30 border border-slate-600 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-slate-300 text-sm">
            <p className="font-medium text-white mb-1">Health Information Notice</p>
            <p>{shortDisclaimer}</p>
          </div>
        </div>
      </div>
    )
  }

  // Modal variant
  if (showFullDisclaimer) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-600 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Health Disclaimer</h3>
              <button
                onClick={() => setShowFullDisclaimer(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">
              {fullDisclaimer}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFullDisclaimer(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
