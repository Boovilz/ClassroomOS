import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * Detects {{placeholder}} tokens in a .docx template by reading the raw XML
 * text run by run. Uses docxtemplater's own text extraction so tokens split
 * across XML runs (a common Word quirk) are still detected correctly.
 */
export function extractPlaceholders(fileBuffer: Buffer): string[] {
  const zip = new PizZip(fileBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  const fullText = doc.getFullText();

  const tokens = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(fullText)) !== null) {
    tokens.add(match[1]);
  }
  return Array.from(tokens).sort();
}

/**
 * Renders a .docx template against a flat data object. Keys are the literal
 * dotted placeholder strings (e.g. "school.name") since docxtemplater's
 * default tag resolver does a direct data[tagName] lookup without splitting
 * on dots - this avoids needing the angular-parser module.
 */
export function renderTemplate(fileBuffer: Buffer, flatData: Record<string, string>): Buffer {
  const zip = new PizZip(fileBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(flatData);
  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}
