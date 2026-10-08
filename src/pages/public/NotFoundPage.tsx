import { FileQuestion } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Feedback';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../config/navigation';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={FileQuestion}
        title="We could not find that page"
        description="The link may be out of date, or the page may have moved. Use one of the options below."
        action={
          <>
            <ButtonLink to={user ? ROLE_HOME[user.role] : '/'}>{user ? 'Go to my dashboard' : 'Back to home'}</ButtonLink>
            <ButtonLink to="/help" variant="secondary">Help and FAQs</ButtonLink>
          </>
        }
      />
    </div>
  );
}
