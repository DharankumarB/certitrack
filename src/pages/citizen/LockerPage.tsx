import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ShieldCheck, Lock, Share2 } from 'lucide-react';
import { useCurrentUser } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useQuery } from '../../hooks/useQuery';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listCertificates, recordCertificateAction, getCertificate } from '../../services/certificateService';
import { errorMessage } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock, Alert } from '../../components/ui/Feedback';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { CertificateCard, CertificateDocument, ShareModal, VerifyModal } from '../../components/domain/Certificates';
import { buildPdf } from '../../utils/pdf';
import { downloadText } from '../../utils/csv';
import { CERTIFICATE_TYPES } from '../../config/certificateTypes';
import type { Certificate } from '../../types';
import { formatDate } from '../../utils/format';

export default function LockerPage() {
  usePageTitle('Certificate Locker');
  const user = useCurrentUser();
  const { toast } = useToast();
  const { data, error, loading, reload } = useQuery(() => listCertificates(user), [user.id]);
  const [params, setParams] = useSearchParams();
  const [viewing, setViewing] = useState<Certificate | null>(null);
  const [sharing, setSharing] = useState<Certificate | null>(null);
  const [verifying, setVerifying] = useState<Certificate | null>(null);
  const requested = params.get('cert');

  useEffect(() => {
    if (!requested) return;
    let active = true;
    getCertificate(user, requested)
      .then((c) => {
        if (!active) return;
        setViewing(c);
        void recordCertificateAction(user, c.id, 'certificate_viewed');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [requested, user]);

  const open = (c: Certificate) => {
    setViewing(c);
    void recordCertificateAction(user, c.id, 'certificate_viewed');
  };

  const closeView = () => {
    setViewing(null);
    if (params.get('cert')) {
      const next = new URLSearchParams(params);
      next.delete('cert');
      setParams(next, { replace: true });
    }
  };

  const download = async (c: Certificate) => {
    const def = CERTIFICATE_TYPES[c.certificateType];
    const bytes = buildPdf(
      [
        { text: 'CERTITRACK PROTOTYPE · NOT A LEGAL DOCUMENT', y: 800, size: 9, gray: 0.4 },
        { text: def.label.toUpperCase(), y: 752, size: 18, bold: true },
        { text: c.authority, y: 728, size: 10, gray: 0.3 },
        { text: `Certificate number: ${c.certificateNumber}`, y: 680, size: 12, bold: true },
        { text: `Applicant: ${c.applicantName}`, y: 656, size: 12 },
        { text: `Date of birth: ${formatDate(`${c.applicantDob}T00:00:00`)}`, y: 636, size: 11 },
        { text: `Father / spouse: ${c.parentOrSpouseName}`, y: 616, size: 11 },
        { text: `Address: ${c.address}, ${c.district}`, y: 596, size: 11 },
        { text: `Issued: ${formatDate(c.issuedAt)}`, y: 560, size: 11 },
        { text: `Valid until: ${c.validUntil ? formatDate(c.validUntil) : 'Until revoked'}`, y: 540, size: 11 },
        { text: `Verification code: ${c.verificationCode}`, y: 500, size: 11 },
        { text: `Digital signature (simulated): ${c.signatureAlgorithm}`, y: 480, size: 10, gray: 0.3 },
        { text: 'Prototype certificate for demonstration only. It has no legal validity.', y: 300, size: 11, bold: true },
      ],
      [{ x: 40, y: 260, w: 515, h: 540, gray: 0.92, stroke: true }],
    );
    downloadText(`${c.certificateNumber}-prototype.pdf`, bytes, 'application/pdf');
    await recordCertificateAction(user, c.id, 'certificate_downloaded', c.certificateNumber);
    toast({ title: 'Download started', description: 'This is a prototype copy for demonstration.' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Locker"
        description="Issued certificates, always available. View, download, share or verify any of them."
        actions={<IntegrationBadge kind="production" />}
        id="locker-title"
      />
      <Alert tone="warning" title="Prototype certificates — for demonstration only">
        These documents have no legal validity. Digital signing and DigiLocker-style record linking are simulated.
      </Alert>
      {error !== undefined && <ErrorState error={error} onRetry={reload} />}
      {loading && <LoadingBlock variant="cards" label="Opening your locker" />}
      {data && data.length === 0 && (
        <EmptyState icon={Lock} title="Your locker is empty" description="Certificates appear here once an officer approves your application and it is digitally signed." />
      )}
      {data && data.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Certificates">
          {data.map((c) => (
            <li key={c.id}>
              <CertificateCard cert={c} onView={() => open(c)} onDownload={() => void download(c)} onShare={() => setSharing(c)} onVerify={() => setVerifying(c)} />
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!viewing}
        onClose={closeView}
        title={viewing ? `${CERTIFICATE_TYPES[viewing.certificateType].label}` : 'Certificate'}
        description={viewing ? `${viewing.certificateNumber} · prototype preview` : undefined}
        size="xl"
        footer={
          viewing && (
            <>
              <Button variant="secondary" icon={Share2} onClick={() => { setSharing(viewing); }}>
                Share
              </Button>
              <Button variant="secondary" icon={ShieldCheck} onClick={() => setVerifying(viewing)}>
                Verify
              </Button>
              <Button icon={Download} onClick={() => void download(viewing)}>
                Download copy
              </Button>
            </>
          )
        }
      >
        {viewing && <CertificateDocument cert={viewing} />}
      </Modal>
      <ShareModal viewer={user} cert={sharing} open={!!sharing} onClose={() => setSharing(null)} />
      <VerifyModal open={!!verifying} onClose={() => setVerifying(null)} initialCode={verifying?.verificationCode ?? ''} />
      {error !== undefined && <p className="text-sm text-red-700">{errorMessage(error)}</p>}
    </div>
  );
}
