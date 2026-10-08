import type { User } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { unreadCountFor } from '../../services/notificationService';
import { docHasPotentialIssue, groupDocumentsByApp } from '../../utils/applicationRules';
import { useMemo } from 'react';

export interface NavCounts {
  unread: number;
  requiresAction: number;
  pendingReview: number;
  aiFlags: number;
}

/** Live counts shown as badges next to navigation items. */
export function useNavCounts(user: User): NavCounts {
  const notifications = useAppState((s) => s.notifications);
  const applications = useAppState((s) => s.applications);
  const documents = useAppState((s) => s.documents);
  return useMemo(() => {
    const unread = unreadCountFor(user.id, notifications);
    if (user.role === 'citizen') {
      return { unread, requiresAction: applications.filter((a) => a.citizenId === user.id && a.status === 'changes_requested').length, pendingReview: 0, aiFlags: 0 };
    }
    if (user.role === 'officer') {
      const mine = applications.filter((a) => a.departmentId === user.departmentId);
      const byApp = groupDocumentsByApp(documents.filter((d) => mine.some((a) => a.id === d.applicationId)));
      return {
        unread,
        requiresAction: 0,
        pendingReview: mine.filter((a) => a.status === 'in_review').length,
        aiFlags: mine.filter((a) => (byApp.get(a.id) ?? []).some((d) => docHasPotentialIssue(d.ai)) && a.status !== 'rejected' && a.status !== 'issued' && a.status !== 'delivered').length,
      };
    }
    return { unread, requiresAction: 0, pendingReview: 0, aiFlags: 0 };
  }, [user, notifications, applications, documents]);
}
