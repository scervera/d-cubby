'use client'

import PageSpinner from '@/components/ui/PageSpinner'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** "/" — the guard sends visitors to /setup or /login; signed-in users go to the library. */
export default function HomePage() {
  const { ready } = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready) router.replace('/assets')
  }, [ready, router])

  return <PageSpinner />
}
