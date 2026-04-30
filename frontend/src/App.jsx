import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/Layout/AppShell';
import { bootstrap } from './lib/telegram';
import Onboarding from './routes/Onboarding';
import CaseDetail from './routes/student/CaseDetail';
import Cases from './routes/student/Cases';
import Home from './routes/student/Home';
import Profile from './routes/student/Profile';
import Broadcast from './routes/teacher/Broadcast';
import CaseEditor from './routes/teacher/CaseEditor';
import CasesIndex from './routes/teacher/CasesIndex';
import Dashboard from './routes/teacher/Dashboard';
import GroupMatrix from './routes/teacher/GroupMatrix';
import Groups from './routes/teacher/Groups';
import StudentDetail from './routes/teacher/StudentDetail';
import SubmissionDetail from './routes/teacher/SubmissionDetail';
import { useUserStore } from './store/userStore';

export default function App() {
  const role = useUserStore((s) => s.role);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const authError = useUserStore((s) => s.authError);
  const authenticate = useUserStore((s) => s.authenticate);
  const isAuthenticating = useUserStore((s) => s.isAuthenticating);

  useEffect(() => {
    bootstrap();
    authenticate();
  }, [authenticate]);

  const onboarded = typeof window !== 'undefined' && localStorage.getItem('onboarding_completed');

  if (isAuthenticating || (!isAuthenticated && !authError)) {
    return (
      <div className="atmosphere flex min-h-screen items-center justify-center text-ink-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="atmosphere flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="label-eyebrow mb-2">кіру қатесі</p>
          <p className="font-display text-[18px] text-ink">{authError}</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            Қолданбаны Telegram арқылы аш — initData қажет.
          </p>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Student */}
        <Route index element={<Navigate to={role === 'teacher' ? '/teacher/dashboard' : '/home'} replace />} />
        <Route path="home" element={<Home />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="me" element={<Profile />} />

        {/* Teacher */}
        <Route path="teacher">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupMatrix />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
          <Route path="cases" element={<CasesIndex />} />
          <Route path="cases/new" element={<CaseEditor />} />
          <Route path="cases/:id/edit" element={<CaseEditor />} />
          <Route path="broadcast" element={<Broadcast />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
