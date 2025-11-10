import { FileText, File as FileIcon, Image as ImageIcon, Video } from "lucide-react"
import { FaFilePdf, FaImage } from "react-icons/fa"
import { BsFileEarmarkSpreadsheetFill } from "react-icons/bs"
import { FaFilm } from "react-icons/fa6"
import { LuSquareMenu } from "react-icons/lu"
import { Table2 } from "lucide-react"

export function getFileIconComponent(fileName: string, item?: { meta?: any }) {
  // Check for Google Workspace files by MIME type
  if (item?.meta) {
    const meta = item.meta as any
    if (meta.mimeType) {
      if (meta.mimeType === "application/vnd.google-apps.document") {
        return <LuSquareMenu className="h-4 w-4 text-blue-500" />
      }
      if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
        return <Table2 className="h-4 w-4 text-green-500" />
      }
    }
  }

  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : ""
  
  // Image files
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "tiff",
      "tif",
      "heic",
      "heif",
      "avif",
    ].includes(ext)
  ) {
    return <FaImage className="h-4 w-4 text-red-400" />
  }
  
  // Video files
  if (["mp4", "webm", "ogg", "ogv", "mov", "m4v", "mkv"].includes(ext)) {
    return <FaFilm className="h-4 w-4 text-red-400" />
  }
  
  // PDF files
  if (ext === "pdf") {
    return <FaFilePdf className="text-red-400" />
  }
  
  // Spreadsheet files
  if (["xls", "xlsx", "xlsm", "csv", "tsv", "ods", "numbers"].includes(ext)) {
    return <BsFileEarmarkSpreadsheetFill className="h-4 w-4 text-green-400" />
  }
  
  // Document files
  if (["doc", "docx", "rtf", "odt"].includes(ext)) {
    return <FileText className="h-4 w-4 text-blue-400" />
  }
  
  // Default file icon
  return <FileText className="h-4 w-4 text-blue-400" />
}

// Smaller version for compact UIs (like mention dropdown)
export function getFileIconCompact(fileName: string, item?: { meta?: any }) {
  // Check for Google Workspace files by MIME type
  if (item?.meta) {
    const meta = item.meta as any
    if (meta.mimeType) {
      if (meta.mimeType === "application/vnd.google-apps.document") {
        return <LuSquareMenu className="h-3 w-3 text-blue-500" />
      }
      if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
        return <Table2 className="h-3 w-3 text-green-500" />
      }
    }
  }

  const ext = fileName.toLowerCase().split('.').pop() || ''
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif'].includes(ext)) {
    return <ImageIcon className="h-3 w-3 text-red-400" />
  }
  
  // Document files (PDF)
  if (ext === 'pdf') {
    return <FileText className="h-3 w-3 text-red-400" />
  }
  
  // Document files (Word, etc)
  if (['doc', 'docx', 'txt', 'md', 'rtf', 'odt'].includes(ext)) {
    return <FileText className="h-3 w-3 text-blue-400" />
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods', 'numbers'].includes(ext)) {
    return <FileText className="h-3 w-3 text-green-400" />
  }
  
  // Video files
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg', 'ogv', 'm4v'].includes(ext)) {
    return <Video className="h-3 w-3 text-red-400" />
  }
  
  // Default file icon
  return <FileIcon className="h-3 w-3 text-primary/60" />
}

