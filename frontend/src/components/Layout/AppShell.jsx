import { Outlet } from 'react-router-dom';

import { useUserStore } from '../../store/userStore';
import { DevBadge } from '../ui/DevBadge';
import { Toast } from '../ui/Toast';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const role = useUserStore((s) => s.role);

  return (
    <div className="atmosphere min-h-screen">
      <Toast />
      <DevBadge />
      <div className="container-app flex min-h-screen flex-col">
        <main className="flex-1 pb-2">
          <Outlet />
        </main>
        <BottomNav role={role} />
      </div>
    </div>
  );
}
