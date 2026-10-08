import type { UserRole } from '../types';

export interface FaqItem {
  id: string;
  category: 'Applying' | 'Tracking' | 'AI checks' | 'Decisions' | 'Certificates' | 'Notifications' | 'Privacy & demo';
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'how-to-apply',
    category: 'Applying',
    question: 'How do I apply for a certificate?',
    answer: 'Sign in as a citizen, choose “Apply for Certificate”, and follow the six steps: choose the certificate, enter personal details, add certificate-specific fields, upload your documents (PDF, JPG or PNG, up to 5 MB each), review the AI pre-check, then declare and submit. You receive an Application ID once it is submitted.',
  },
  {
    id: 'documents',
    category: 'Applying',
    question: 'Which documents do I need?',
    answer: 'Every certificate asks for a government photo ID, an address proof and a passport-size photo. The Caste Certificate also needs caste evidence, the Income Certificate needs income proof, and the Domicile Certificate needs residence proof. The apply wizard lists the exact requirements for the certificate you choose.',
  },
  {
    id: 'track',
    category: 'Tracking',
    question: 'How do I track my application?',
    answer: 'Open “Track Application” to see where your file is, what happened, and what happens next. Each stage (Apply, AI Check, Review, e-Sign, Issued, Delivered) shows its timestamp, department, action and description. Anyone with an Application ID and the registered mobile digits can also use the public Track page.',
  },
  {
    id: 'ai-failure',
    category: 'AI checks',
    question: 'What happens if the AI check fails?',
    answer: 'The AI pre-check flags problems such as an unreadable scan, a wrong document type, or a name that does not match. You see “Application needs changes” with the exact document and reason, then you can fix the document, upload it again, or continue with warnings. A flagged file goes back to the officer queue once it is re-uploaded.',
  },
  {
    id: 'ai-role',
    category: 'AI checks',
    question: 'What does the AI do, and what does it not do?',
    answer: 'The AI performs AI-assisted pre-verification: it checks document type, readability, OCR, name and date matching, completeness, duplicates and edit indicators. It never approves or rejects an application. The final decision is made by the authorized department officer.',
  },
  {
    id: 'who-decides',
    category: 'Decisions',
    question: 'Who decides whether my certificate is approved?',
    answer: 'A department officer reviews each application in their own department and approves, requests changes, or rejects it. Officers must give reasons for change requests and rejections. A confirmation step appears before each final action.',
  },
  {
    id: 'where-certificate',
    category: 'Certificates',
    question: 'Where is my certificate once it is issued?',
    answer: 'Issued certificates appear in your Certificate Locker, where you can view, download, share or verify them. Physical copies, where requested, are tracked from dispatch to delivery. Locker certificates are prototype documents for demonstration and carry no legal validity.',
  },
  {
    id: 'notifications',
    category: 'Notifications',
    question: 'How will I hear about updates?',
    answer: 'The Notifications centre lists every update with unread counts and filters. In this prototype, WhatsApp and e-mail are shown as previews only. Nothing is sent to a real phone or inbox, and the preview is labelled as a WhatsApp integration preview.',
  },
  {
    id: 'esign',
    category: 'Certificates',
    question: 'Is the digital signature legally valid?',
    answer: 'No. In this prototype the e-sign step is simulated so the workflow can be demonstrated. Production use requires integration with a licensed e-signature provider and the relevant government systems.',
  },
  {
    id: 'privacy',
    category: 'Privacy & demo',
    question: 'Who can see my application?',
    answer: 'You see only your own applications. Department officers see only files from their own department, and every attempt to open another department’s file is blocked and audit-logged. Super Admins can see all records and the audit trail for oversight.',
  },
  {
    id: 'demo-data',
    category: 'Privacy & demo',
    question: 'Is this real data?',
    answer: 'No. CertiTrack is a prototype with fictional people, fictional documents and simulated AI, e-sign and courier services. Demo accounts use a shared demo password shown on the sign-in page. Use “Reset demo data” in Settings to restore the starting state.',
  },
];

export interface WalkthroughStep {
  role: UserRole;
  title: string;
  detail: string;
  to: string;
}

export const DEMO_WALKTHROUGH: WalkthroughStep[] = [
  { role: 'citizen', title: 'Open the citizen dashboard', detail: 'Live status of your active application and certificate summary.', to: '/citizen/dashboard' },
  { role: 'citizen', title: 'Open APP-10294 and follow the timeline', detail: 'Stage details, the courier in transit, and the issued certificate.', to: '/citizen/applications/APP-10294' },
  { role: 'citizen', title: 'Fix the flagged domicile file (APP-10329)', detail: 'See “Needs changes”, then re-upload the address proof.', to: '/citizen/applications/APP-10329' },
  { role: 'citizen', title: 'Open the Certificate Locker', detail: 'View, download, share and verify issued certificates.', to: '/citizen/locker' },
  { role: 'officer', title: 'Review APP-10388 in the caste queue', detail: 'Split-screen review with AI warnings and decision actions.', to: '/officer/applications/APP-10388' },
  { role: 'officer', title: 'Try an income file (APP-10421)', detail: 'Department isolation blocks it and records the attempt in the audit log.', to: '/officer/applications/APP-10421' },
  { role: 'officer', title: 'Check the AI verification queue', detail: 'Filter documents by confidence and issue type.', to: '/officer/ai-verification' },
  { role: 'admin', title: 'Review the portfolio dashboard', detail: 'Statuses, processing time and bottleneck charts (Demo Data).', to: '/admin/dashboard' },
  { role: 'admin', title: 'Inspect the audit trail', detail: 'Filter by role, action and department. Access denials are visible here.', to: '/admin/audit-logs' },
];
