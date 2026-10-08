import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { SessionLayout } from './layouts/SessionLayout';
import { AppShell } from './layouts/AppShell';
import { RequireRole, RequireSession } from './components/layout/Guards';
import { startSimulationLoop } from './services/simulation';

const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const SignupPage = lazy(() => import('./pages/public/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));
const HelpPage = lazy(() => import('./pages/public/HelpPage'));
const PublicTrackPage = lazy(() => import('./pages/public/PublicTrackPage'));
const VerifyPage = lazy(() => import('./pages/public/VerifyPage'));
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'));

const CitizenDashboardPage = lazy(() => import('./pages/citizen/CitizenDashboardPage'));
const ApplyPage = lazy(() => import('./pages/citizen/ApplyPage'));
const CitizenApplicationsPage = lazy(() => import('./pages/citizen/CitizenApplicationsPage'));
const CitizenApplicationDetailPage = lazy(() => import('./pages/citizen/CitizenApplicationDetailPage'));
const CitizenTrackPage = lazy(() => import('./pages/citizen/CitizenTrackPage'));
const LockerPage = lazy(() => import('./pages/citizen/LockerPage'));

const OfficerDashboardPage = lazy(() => import('./pages/officer/OfficerDashboardPage'));
const OfficerQueuePage = lazy(() => import('./pages/officer/OfficerQueuePage'));
const OfficerReviewPage = lazy(() => import('./pages/officer/OfficerReviewPage'));
const AIVerificationPage = lazy(() => import('./pages/officer/AIVerificationPage'));
const ProcessedPage = lazy(() => import('./pages/officer/ProcessedPage'));
const OfficerAnalyticsPage = lazy(() => import('./pages/officer/OfficerAnalyticsPage'));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminApplicationsPage = lazy(() => import('./pages/admin/AdminApplicationsPage'));
const DepartmentsPage = lazy(() => import('./pages/admin/DepartmentsPage'));
const DepartmentDetailPage = lazy(() => import('./pages/admin/DepartmentDetailPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const SystemActivityPage = lazy(() => import('./pages/admin/SystemActivityPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));

/** Keeps simulated e-sign and courier progress moving while the app is open. */
function SimulationRunner() {
  useEffect(() => startSimulationLoop(4000), []);
  return null;
}

export function App() {
  return (
    <>
      <SimulationRunner />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<SessionLayout />}>
          <Route path="help" element={<HelpPage />} />
          <Route path="track" element={<PublicTrackPage />} />
          <Route path="verify/:code" element={<VerifyPage />} />
        </Route>

        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route element={<RequireRole roles={['citizen']} />}>
              <Route path="citizen/dashboard" element={<CitizenDashboardPage />} />
              <Route path="citizen/apply" element={<ApplyPage />} />
              <Route path="citizen/applications" element={<CitizenApplicationsPage />} />
              <Route path="citizen/applications/:id" element={<CitizenApplicationDetailPage />} />
              <Route path="citizen/track" element={<CitizenTrackPage />} />
              <Route path="citizen/locker" element={<LockerPage />} />
              <Route path="citizen/notifications" element={<NotificationsPage />} />
              <Route path="citizen/profile" element={<ProfilePage />} />
            </Route>
            <Route element={<RequireRole roles={['officer']} />}>
              <Route path="officer/dashboard" element={<OfficerDashboardPage />} />
              <Route path="officer/applications" element={<OfficerQueuePage />} />
              <Route path="officer/applications/:id" element={<OfficerReviewPage />} />
              <Route path="officer/ai-verification" element={<AIVerificationPage />} />
              <Route path="officer/processed" element={<ProcessedPage />} />
              <Route path="officer/analytics" element={<OfficerAnalyticsPage />} />
              <Route path="officer/notifications" element={<NotificationsPage />} />
              <Route path="officer/profile" element={<ProfilePage />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="admin/applications" element={<AdminApplicationsPage />} />
              <Route path="admin/departments" element={<DepartmentsPage />} />
              <Route path="admin/departments/:id" element={<DepartmentDetailPage />} />
              <Route path="admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="admin/system-activity" element={<SystemActivityPage />} />
              <Route path="admin/settings" element={<AdminSettingsPage />} />
              <Route path="admin/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<SessionLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
