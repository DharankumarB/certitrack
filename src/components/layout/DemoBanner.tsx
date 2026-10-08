import { useState } from 'react';
import { RotateCcw, Info } from 'lucide-react';
import { ConfirmDialog } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { resetDemoData } from '../../services/systemService';
import { errorMessage } from '../../services/api';
import type { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../../config/navigation';

/** Always-visible reminder that this is a prototype with fictional data. Also offers demo reset. */
export function DemoBanner({ user }: { user: User }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const reset = async () => {
    setBusy(true);
    try {
      await resetDemoData(user);
      setConfirming(false);
      toast({ title: 'Demo data restored', description: 'Every account, application and log is back to the starting state.' });
      navigate(ROLE_HOME[user.role]);
    } catch (error) {
      toast({ tone: 'danger', title: 'Reset failed', description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
        <p className="flex min-w-0 flex-1 items-center gap-2">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <strong className="font-semibold">Prototype / Demo.</strong> Fictional people and documents. AI, e-sign and courier steps are simulated, and WhatsApp is a preview only.
          </span>
        </p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setConfirming(true)} className="bg-white">
          Reset demo data
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={reset}
        loading={busy}
        title="Reset all demo data?"
        description="This restores the starting dataset and removes anything you created in this browser. Your session ends if your account was created during the demo."
        confirmLabel="Reset demo data"
        variant="danger"
      />
    </div>
  );
}
