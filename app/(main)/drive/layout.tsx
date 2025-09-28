import { FilesLeftSidebar } from "@/components/drive/FilesLeftSidebar"

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-screen">
      <FilesLeftSidebar />
      <main className="flex-1 mx-2 px-2.5 py-6 space-y-6">
        {children}
      </main>
    </div>
  )
}


