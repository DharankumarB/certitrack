import { buildPdf } from './pdf';
import type { RequirementId } from '../types';

/**
 * Generates small sample documents in the browser so reviewers can test uploads without real files.
 * Samples are clearly labelled "SAMPLE" and contain fictional data only.
 */
const SAMPLE_NAMES: Record<RequirementId, { file: string; title: string; kind: 'pdf' | 'jpg' }> = {
  identity: { file: 'aadhaar-sample.pdf', title: 'GOVERNMENT PHOTO ID (SAMPLE)', kind: 'pdf' },
  address: { file: 'electricity-bill-sample.pdf', title: 'ELECTRICITY BILL (SAMPLE)', kind: 'pdf' },
  caste_evidence: { file: 'caste-certificate-sample.pdf', title: 'CASTE EVIDENCE (SAMPLE)', kind: 'pdf' },
  income_proof: { file: 'salary-slip-sample.pdf', title: 'SALARY SLIP (SAMPLE)', kind: 'pdf' },
  residence_proof: { file: 'ration-card-sample.pdf', title: 'RESIDENCE PROOF (SAMPLE)', kind: 'pdf' },
  photo: { file: 'passport-photo-sample.jpg', title: 'PASSPORT PHOTO (SAMPLE)', kind: 'jpg' },
};

export function sampleFileName(requirementId: RequirementId): string {
  return SAMPLE_NAMES[requirementId].file;
}

async function photoBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#e4ebf5';
  ctx.fillRect(0, 0, 420, 540);
  ctx.fillStyle = '#9fb3cf';
  ctx.beginPath();
  ctx.arc(210, 205, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(90, 320, 240, 220);
  ctx.fillStyle = '#0b1f3a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SAMPLE PHOTO', 118, 500);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.9));
}

export async function createSampleFile(requirementId: RequirementId, applicantName: string): Promise<File> {
  const spec = SAMPLE_NAMES[requirementId];
  if (spec.kind === 'jpg') {
    const blob = await photoBlob();
    return new File([blob], spec.file, { type: 'image/jpeg' });
  }
  const bytes = buildPdf(
    [
      { text: 'SAMPLE DOCUMENT · FICTIONAL DATA · CERTITRACK PROTOTYPE', y: 790, size: 9, gray: 0.4 },
      { text: spec.title, y: 740, size: 16, bold: true },
      { text: `Name: ${applicantName}`, y: 690, size: 12 },
      { text: 'Issued by: Demo issuing office (not an official record)', y: 664, size: 11 },
      { text: 'Reference: SAMPLE-' + requirementId.toUpperCase().slice(0, 6), y: 640, size: 11 },
      { text: 'This page exists only to test the upload and AI pre-check flow.', y: 560, size: 10, gray: 0.35 },
    ],
    [{ x: 40, y: 530, w: 515, h: 260, gray: 0.6, stroke: true }],
  );
  return new File([bytes as BlobPart], spec.file, { type: 'application/pdf' });
}
