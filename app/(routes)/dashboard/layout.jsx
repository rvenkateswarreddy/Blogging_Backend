import DashHeader from "./_components/DashHeader";
import SideNav from "./_components/SideNav";

export default function DashboardLayout({ children }) {
  return (
    <>
      {/* DashHeader */}
      <header className="bg-blue-600 text-white p-4 text-xl font-semibold">
        <DashHeader />
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Static Side Navigation */}
        <div className="max-w-1/4 bg-gray-100">
          <SideNav />
        </div>

        {/* Main Content (scrollable) */}
        <main className="flex-1 overflow-y-scroll scrollbar-hide bg-white p-4">
          {children}
        </main>

       
      </div>
    </>
  );
}
