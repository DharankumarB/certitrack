/**
 * Minimal single-page PDF writer (Helvetica, text only). Used for prototype certificate downloads and
 * sample documents. Produces a valid file with a correct cross-reference table.
 */
export interface PdfLine {
  text: string;
  size?: number;
  x?: number;
  y: number;
  bold?: boolean;
  gray?: number;
}

function escapePdf(text: string): string {
  return text.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '?');
}

export function buildPdf(lines: PdfLine[], rects: Array<{ x: number; y: number; w: number; h: number; gray?: number; stroke?: boolean }> = [], width = 595, height = 842): Uint8Array {
  let content = '';
  for (const r of rects) {
    const g = (r.gray ?? 0.85).toFixed(2);
    content += r.stroke ? `${g} G ${r.x} ${r.y} ${r.w} ${r.h} re S\n` : `${g} g ${r.x} ${r.y} ${r.w} ${r.h} re f\n`;
  }
  for (const line of lines) {
    const font = line.bold ? '/F2' : '/F1';
    const size = line.size ?? 11;
    const gray = (line.gray ?? 0).toFixed(2);
    content += `BT ${font} ${size} Tf ${gray} g ${line.x ?? 56} ${line.y} Td (${escapePdf(line.text)}) Tj ET\n`;
  }
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
