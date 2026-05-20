import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--light)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <footer className="shrink-0 px-6 py-2 text-center text-xs border-t" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
          Powered by <span className="font-medium" style={{ color: 'var(--navy)' }}>IT Soluclick SRL</span>
        </footer>
      </div>
    </div>
  );
}
