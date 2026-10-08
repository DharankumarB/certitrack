import type { Application, Delivery } from '../../types';
import { computeSteps, currentStage } from '../../utils/stages';

/** Plain text for the current stage, including the courier stage when shipping. */
export function ChangeStageNote({ app, delivery }: { app: Application; delivery: Delivery | null }) {
  const stage = currentStage(computeSteps(app, delivery));
  return <span className="font-semibold text-slate-900">{stage.label}</span>;
}
