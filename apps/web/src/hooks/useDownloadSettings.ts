'use client'

/**
 * Downloads an asset file. Files are served from the app's own origin (Active Storage
 * proxy URLs under /rails/active_storage, signed, no auth header needed), so a link with
 * disposition=attachment is enough.
 */
export function useDownloadSettings() {
  const downloadFile = async (fileUrl: string, fileName: string): Promise<boolean> => {
    const url = new URL(fileUrl, window.location.origin)
    if (url.pathname.startsWith('/rails/active_storage/')) url.searchParams.set('disposition', 'attachment')

    const link = document.createElement('a')
    link.href = url.toString()
    link.download = fileName
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => link.remove(), 100)
    return true
  }

  return { downloadFile }
}
