import { FlaskConical, PlugZap, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge, type BadgeTone } from './Badge';

type Kind = 'prototype' | 'simulated' | 'production' | 'demo-data' | 'ai';

const MAP: Record<Kind, { label: string; tone: BadgeTone; icon: typeof FlaskConical; title: string }> = {
  prototype: { label: 'Prototype / Demo', tone: 'demo', icon: FlaskConical, title: 'This screen runs on fictional demo data.' },
  simulated: { label: 'Simulated', tone: 'violet', icon: Sparkles, title: 'Behaviour is simulated in the browser for demonstration.' },
  production: { label: 'Production integration required', tone: 'warning', icon: PlugZap, title: 'This capability needs a live integration before go-live.' },
  'demo-data': { label: 'Demo Data', tone: 'neutral', icon: ShieldAlert, title: 'Values are illustrative demo data, not official statistics.' },
  ai: { label: 'AI-assisted (decision support)', tone: 'info', icon: Sparkles, title: 'AI gives advisory results. The authorized officer makes the final decision.' },
};

export function IntegrationBadge({ kind }: { kind: Kind }) {
  const { label, tone, icon, title } = MAP[kind];
  return (
    <Badge tone={tone} icon={icon} title={title}>
      {label}
    </Badge>
  );
}
