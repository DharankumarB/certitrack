import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { verifyCertificate, type VerificationResult } from '../../services/certificateService';
import { errorMessage } from '../../services/api';
import { VerificationOutcome } from '../../components/domain/Certificates';
import { LoadingBlock, Alert } from '../../components/ui/Feedback';
import { Card, CardBody } from '../../components/ui/Card';
import { IntegrationBadge } from '../../components/ui/IntegrationBadge';
import { PageHeader } from '../../components/layout/PageHeader';

export default function VerifyPage() {
  usePageTitle('Verify a certificate');
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const showName = params.get('name') === '1';
  const [state, setState] = useState<{ loading: boolean; result?: VerificationResult; error?: unknown }>({ loading: true });

  useEffect(() => {
    let active = true;
    verifyCertificate(code, showName)
      .then((result) => active && setState({ loading: false, result }))
      .catch((error: unknown) => active && setState({ loading: false, error }));
    return () => {
      active = false;
    };
  }, [code, showName]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      <PageHeader title="Certificate verification" description="Checks a verification code against the CertiTrack prototype registry." actions={<IntegrationBadge kind="prototype" />} id="verify-title" />
      <Card>
        <CardBody className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <ShieldCheck className="size-4 text-navy-700" aria-hidden="true" />
            Code: <span className="font-mono font-semibold">{code}</span>
          </p>
          {state.loading && <LoadingBlock variant="list" label="Checking the code" />}
          {state.error !== undefined && <Alert tone="danger" title="Check failed">{errorMessage(state.error)}</Alert>}
          {state.result && <VerificationOutcome result={state.result} />}
          <p className="text-xs text-slate-500">Prototype check only. A result here does not constitute legal verification.</p>
        </CardBody>
      </Card>
    </div>
  );
}
