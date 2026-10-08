import type { CertificateTypeId } from '../types';
import { CERTIFICATE_TYPES } from '../config/certificateTypes';

/**
 * Plain-language message templates. The same wording is used for in-app notifications and for the
 * WhatsApp / e-mail previews. Those channels are previews only in this prototype; nothing is sent.
 */
export const MSG = {
  submitted: (appId: string) => ({
    title: 'Application received',
    body: `Application received. Track it in CertiTrack. (${appId})`,
  }),
  aiWarning: (appId: string, label: string) => ({
    title: 'Document needs a second look',
    body: `Your ${label.toLowerCase()} passed most checks. An officer will double-check one detail. (${appId})`,
  }),
  changes: (label: string, reason: string, appId: string) => ({
    title: 'Needs changes',
    body: `Needs changes: ${label.toLowerCase()}. ${reason} Your other documents are accepted. (${appId})`,
  }),
  approved: (type: CertificateTypeId, appId: string) => ({
    title: 'Application approved',
    body: `Your ${CERTIFICATE_TYPES[type].label.toLowerCase()} has been approved. Digital signing is in progress. (${appId})`,
  }),
  issued: (type: CertificateTypeId, appId: string) => ({
    title: 'Certificate issued',
    body: `Your ${CERTIFICATE_TYPES[type].label.toLowerCase()} has been issued. Download it from your locker. (${appId})`,
  }),
  rejected: (appId: string, reason: string) => ({
    title: 'Application rejected',
    body: `Application ${appId} was rejected: ${reason}`,
  }),
  dispatched: (trackingId: string, appId: string) => ({
    title: 'Dispatched for delivery',
    body: `Your physical certificate is on its way. Tracking ID ${trackingId}. (${appId})`,
  }),
  delivered: (appId: string) => ({
    title: 'Delivered',
    body: `Your physical certificate was delivered to your registered address. (${appId})`,
  }),
  officerNewApplication: (appId: string, applicant: string, type: CertificateTypeId) => ({
    title: 'New application in your queue',
    body: `${applicant} submitted a ${CERTIFICATE_TYPES[type].label.toLowerCase()} (${appId}). AI pre-check is complete.`,
  }),
  officerResubmitted: (appId: string, applicant: string, label: string) => ({
    title: 'Document resubmitted',
    body: `${applicant} re-uploaded the ${label.toLowerCase()} for ${appId}. It is back in your queue.`,
  }),
  officerApproved: (appId: string) => ({
    title: 'Sent for e-sign',
    body: `${appId} was approved and queued for digital signing.`,
  }),
};
