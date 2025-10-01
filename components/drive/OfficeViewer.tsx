"use client"
import { useState } from 'react'

interface OfficeViewerProps {
  fileUrl: string
  fileName: string
}

export function OfficeViewer({ fileUrl, fileName }: OfficeViewerProps) {
  const [error, setError] = useState(false)

  // Use Google Docs Viewer for Office documents
  // This works for public URLs or we can use Office Online
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
          <p className="mb-4">Unable to preview this document.</p>
          <p className="text-sm">
            The document viewer requires a publicly accessible URL. 
            Please download the file to view it.
          </p>
        </div>
      ) : (
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0"
          title={`Preview of ${fileName}`}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}

export default OfficeViewer

