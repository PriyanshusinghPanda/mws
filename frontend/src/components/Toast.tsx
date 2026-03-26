import { useState, useEffect } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [])

  const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600'

  return (
    <div className={`fixed top-4 right-4 ${bg} text-white px-4 py-2 rounded shadow-lg text-sm z-50`}>
      {message}
    </div>
  )
}
