import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAppState } from '../../hooks/useAppState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { resetDemoData, updateSettings } from '../../services/systemService';
import { errorMessage } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Forms';
import { Segmented } from '../../components/ui/Tabs';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Feedback';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { Table } from '../../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../../config/navigation';
import { clearBlobs } from '../../services/blobStore';

const INTEGRATIONS: Array<{ name: string; status: 'prototype' | 'simulated' | 'production'; note: string }> = [
  { name: 'Document storage', status: 'simulated', note: 'Files are kept in this browser (IndexedDB). Production uses encrypted object storage.' },
  { name: 'Document OCR and forensics', status: 'simulated', note: 'Rule-based AI pre-check. Advisory only. Production needs a licensed OCR service.' },
  { name: 'Digital signature (e-Sign)', status: 'simulated', note: 'Not legally binding. Production needs a licensed e-signature provider.' },
  { name: 'Courier and dispatch', status: 'simulated', note: 'Timed status steps. Production needs the courier partner API.' },
  { name: 'WhatsApp Business messaging', status: 'production', note: 'Preview only. Nothing is sent. Needs business account approval.' },
  { name: 'E-mail notifications', status: 'production', note: 'Preview only. Needs an SMTP or transactional e-mail provider.' },
  { name: 'DigiLocker-style record linking', status: 'production', note: 'Not connected. Needs government integration approval.' },
];

export default function AdminSettingsPage() {
  usePageTitle('Settings');
  const admin = useCurrentUser();
  const settings = useAppState((s) => s.settings);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'fast'>(settings.simulationSpeed);
  const [channels, setChannels] = useState(settings.channels);
  const dirty = speed !== settings.simulationSpeed || channels.whatsapp !== settings.channels.whatsapp || channels.email !== settings.channels.email;

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(admin, { simulationSpeed: speed, channels });
      toast({ title: 'Settings saved', description: 'Recorded in the audit log.' });
    } catch (err) {
      toast({ tone: 'danger', title: 'Not saved', description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await clearBlobs();
      await resetDemoData(admin);
      setConfirmReset(false);
      toast({ title: 'Sample data restored', description: 'Fictional sample records were restored; local accounts were kept.' });
      navigate(ROLE_HOME.admin);
    } catch (err) {
      toast({ tone: 'danger', title: 'Reset failed', description: errorMessage(err) });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Simulation speed, notification channels, integration status and local development controls." id="settings-title" actions={<IntegrationBadge kind="prototype" />} />
      <div className="grid gap-6 xl:grid-cols-2 grid-cols-1">
        <Card>
          <CardHeader title="Simulation" description="How fast the simulated e-sign and courier progress." />
          <CardBody className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Speed</p>
              <Segmented label="Simulation speed" value={speed} onChange={setSpeed} options={[{ value: 'normal', label: 'Normal (e-sign ~6 s, courier ~20 s per step)' }, { value: 'fast', label: 'Fast for demos (~2.5 s, ~8 s)' }]} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Notification channels" description="Global switches. Citizens still choose their own preferences in Profile." />
          <CardBody className="space-y-5">
            <Switch label="WhatsApp previews" description="Show WhatsApp as a channel. Nothing is sent." checked={channels.whatsapp} onChange={(v) => setChannels((c) => ({ ...c, whatsapp: v }))} />
            <Switch label="E-mail previews" description="Show e-mail as a channel. Nothing is sent." checked={channels.email} onChange={(v) => setChannels((c) => ({ ...c, email: v }))} />
          </CardBody>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button icon={Save} onClick={() => void save()} disabled={!dirty} loading={saving} loadingLabel="Saving…">
          Save settings
        </Button>
      </div>

      <Card>
        <CardHeader title="Integration status" description="What is simulated here and what needs a live integration before go-live." />
        <CardBody>
          <Table
            caption="Integration status"
            headers={['Capability', 'Status', 'Notes']}
            rows={INTEGRATIONS.map((i) => [i.name, <IntegrationBadge key={i.name} kind={i.status} />, i.note])}
          />
        </CardBody>
      </Card>

      <Card className="border-red-200">
        <CardHeader title="Reset fictional sample data" description="Restores the fictional sample applications and documents. Locally registered citizen, staff, and administrator accounts are preserved." />
        <CardBody className="space-y-4">
          <Alert tone="warning" title="This cannot be undone">Application changes, sample notifications, audit history, and uploaded files are cleared. Local-development accounts are kept.</Alert>
          <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
            Reset sample data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
        loading={resetting}
        title="Reset fictional sample data?"
        description="The sample application data will be restored in this browser. Local accounts remain available and other tabs update automatically."
        confirmLabel="Reset sample data"
        variant="danger"
      />
    </div>
  );
}
