import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#f5f5f0] p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
