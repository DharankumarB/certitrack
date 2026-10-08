import type { Application, ApplicationStage, Delivery, TimelineEvent } from '../types';
import { WORKFLOW_STAGES } from '../config/workflow';

export type StepState = 'complete' | 'current' | 'upcoming' | 'blocked' | 'skipped';

export interface StageStep {
  id: ApplicationStage;
  label: string;
  description: string;
  state: StepState;
  at: string | null;
  events: TimelineEvent[];
}

/**
 * Derives the six-stage progress from the application status and delivery record.
 * "blocked" means the file is waiting on the citizen (needs changes or rejected).
 */
export function computeSteps(app: Application, delivery: Delivery | null): StageStep[] {
  const states: Record<ApplicationStage, StepState> = {
    apply: 'complete',
    ai_check: 'upcoming',
    review: 'upcoming',
    esign: 'upcoming',
    issued: 'upcoming',
    delivered: 'upcoming',
  };
  switch (app.status) {
    case 'ai_checking':
      states.ai_check = 'current';
      break;
    case 'in_review':
      states.ai_check = 'complete';
      states.review = 'current';
      break;
    case 'changes_requested':
      states.ai_check = 'complete';
      states.review = 'blocked';
      break;
    case 'rejected':
      states.ai_check = 'complete';
      states.review = 'blocked';
      states.esign = 'skipped';
      states.issued = 'skipped';
      states.delivered = 'skipped';
      break;
    case 'esign_pending':
      states.ai_check = 'complete';
      states.review = 'complete';
      states.esign = 'current';
      break;
    case 'issued':
      states.ai_check = 'complete';
      states.review = 'complete';
      states.esign = 'complete';
      states.issued = 'complete';
      if (delivery) states.delivered = delivery.status === 'delivered' ? 'complete' : 'current';
      else if (app.deliveryRequested) states.delivered = 'current';
      else states.delivered = 'skipped';
      break;
    case 'delivered':
      states.ai_check = 'complete';
      states.review = 'complete';
      states.esign = 'complete';
      states.issued = 'complete';
      states.delivered = 'complete';
      break;
  }
  return WORKFLOW_STAGES.map((stage) => {
    const events = app.timeline.filter((e) => e.stage === stage.id);
    return {
      id: stage.id,
      label: stage.label,
      description: stage.description,
      state: states[stage.id],
      at: stage.id === 'apply' ? app.submittedAt : events[0]?.at ?? null,
      events,
    };
  });
}

/** The stage the file is currently in (for "You are here"). */
export function currentStage(steps: StageStep[]): StageStep {
  return steps.find((s) => s.state === 'current' || s.state === 'blocked') ?? [...steps].reverse().find((s) => s.state === 'complete') ?? steps[0]!;
}

/** Plain-language "what happens next" for the citizen view. */
export function nextStepText(app: Application, delivery: Delivery | null, departmentName: string): string {
  switch (app.status) {
    case 'ai_checking':
      return 'AI is re-checking the document you uploaded. This usually takes under two minutes, then the file returns to the officer queue.';
    case 'in_review':
      return `A ${departmentName.replace(' Department', '')} officer will verify your documents. Expected decision by the service date shown above.`;
    case 'changes_requested':
      return 'Upload the corrected document listed below. Your other documents stay as they are, and the file returns to the officer queue automatically.';
    case 'rejected':
      return 'This application is closed. You can apply again with corrected information, and the reason above explains what to change.';
    case 'esign_pending':
      return 'The competent authority is digitally signing your certificate. It will appear in your Certificate Locker automatically.';
    case 'issued':
      if (delivery && delivery.status !== 'delivered') return 'Your certificate is in your Certificate Locker. The physical copy is on its way to your registered address.';
      return 'Your certificate is ready in your Certificate Locker. You can view, download or share it.';
    case 'delivered':
      return 'Completed. Keep the certificate number for future reference.';
  }
}

export function eventAt(app: Application, key: string): number | null {
  const event = app.timeline.find((e) => e.key === key);
  return event ? Date.parse(event.at) : null;
}
