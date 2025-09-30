import { FilesLeftSidebar } from "@/components/drive/FilesLeftSidebar"

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <FilesLeftSidebar />
      <main className="flex-1 px-2.5">
        {children}
      </main>
    </div>
  )
}


