'use client'

import hotToast, { type ToastOptions } from 'react-hot-toast'

import { AppToast, type AppToastVariant } from '@/components/ui/AppToast'

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 5000

function showToast(message: string, variant: AppToastVariant, options?: ToastOptions) {
  const { duration, id } = options ?? {}

  return hotToast.custom(
    (t) => <AppToast t={t} variant={variant} message={message} />,
    {
      id,
      duration:
        duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
    },
  )
}

function toast(message: string, options?: ToastOptions) {
  return showToast(message, 'info', options)
}

toast.success = (message: string, options?: ToastOptions) =>
  showToast(message, 'success', options)

toast.error = (message: string, options?: ToastOptions) =>
  showToast(message, 'error', options)

toast.warning = (message: string, options?: ToastOptions) =>
  showToast(message, 'warning', options)

toast.info = (message: string, options?: ToastOptions) =>
  showToast(message, 'info', options)

toast.dismiss = hotToast.dismiss
toast.remove = hotToast.remove

export { toast }
export default toast
