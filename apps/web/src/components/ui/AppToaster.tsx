'use client'

import { Toaster } from 'react-hot-toast'

export function AppToaster() {
  return <Toaster position="top-right" gutter={8} containerClassName="app-toast-container" />
}
