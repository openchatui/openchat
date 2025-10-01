"use client"
import { useState, useEffect } from 'react'
import { Loader } from '@/components/ui/loader'

interface CsvViewerProps {
  fileUrl: string
}

export function CsvViewer({ fileUrl }: CsvViewerProps) {
  const [data, setData] = useState<string[][] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    async function loadCsv() {
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Failed to load CSV')
        
        const text = await response.text()
        const rows = parseCsv(text)
        setData(rows)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CSV')
      } finally {
        setLoading(false)
      }
    }

    loadCsv()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader className="h-6 w-6" message="Loading CSV" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Empty CSV file
      </div>
    )
  }

  const headers = data[0]
  const rows = data.slice(1)

  // Fixed small cell width
  const cellWidth = 100

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Spreadsheet container */}
      <div className="flex-1 min-h-0 h-full overflow-auto border rounded-lg" onWheelCapture={(e) => { e.stopPropagation() }}>
        <div className="inline-block min-w-full">
          {/* Header row - sticky */}
          <div className="sticky top-0 z-10 bg-muted border-b-2 border-border">
            <div className="flex">
              {/* Row number column header */}
              <div className="flex-shrink-0 w-12 border-r border-border bg-muted flex items-center justify-center font-semibold text-xs text-muted-foreground">
                #
              </div>
              {/* Column headers */}
              {headers.map((header, colIndex) => (
                <div
                  key={colIndex}
                  className="flex-shrink-0 border-r border-border px-2 py-2 font-semibold text-xs bg-muted flex items-center"
                  style={{ width: `${cellWidth}px` }}
                >
                  <span className="break-words" title={header}>
                    {header || String.fromCharCode(65 + colIndex)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data rows */}
          <div>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex border-b border-border hover:bg-muted/50">
                {/* Row number */}
                <div className="flex-shrink-0 w-12 border-r border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground font-mono">
                  {rowIndex + 1}
                </div>
                {/* Cells */}
                {row.map((cell, cellIndex) => {
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === cellIndex
                  return (
                    <div
                      key={cellIndex}
                      className={`flex-shrink-0 border-r border-border px-2 py-1.5 text-xs cursor-cell transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-inset' 
                          : 'hover:bg-accent/50'
                      }`}
                      style={{ width: `${cellWidth}px` }}
                      onClick={() => setSelectedCell({ row: rowIndex, col: cellIndex })}
                      title={cell}
                    >
                      <span className="block break-words">{cell}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          {rows.length.toLocaleString()} rows × {headers.length} columns
        </div>
        {selectedCell && (
          <div className="font-mono">
            Cell: {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
          </div>
        )}
      </div>
    </div>
  )
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      currentRow.push(currentCell)
      currentCell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \n in \r\n
      }
      currentRow.push(currentCell)
      if (currentRow.some(cell => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  // Handle last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell)
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

export default CsvViewer

