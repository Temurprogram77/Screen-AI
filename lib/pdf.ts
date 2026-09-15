/**
 * Server-side only: extract plain text from a PDF buffer.
 * Uses unpdf as the primary parser (modern PDF.js, zero test-suite side effects)
 * with a fallback to pdf-parse/lib/pdf-parse.js (internal file) to prevent
 * the known ENOENT: no such file or directory './test/data/05-versions-space.pdf' bug.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // 1. Primary parser: unpdf
  try {
    const { extractText } = await import("unpdf");
    const uint8Array = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    const result = await extractText(uint8Array, { mergePages: true });
    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (text) {
      return text;
    }
  } catch (err) {
    console.warn(
      "[/lib/pdf] unpdf failed, attempting pdf-parse/lib/pdf-parse.js fallback:",
      err
    );
  }

  // 2. Fallback parser: pdf-parse internal file (bypasses index.js debug execution)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import("pdf-parse/lib/pdf-parse.js" as any);
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const data = await pdfParse(buffer);
    const text = data?.text?.trim();
    if (text) {
      return text;
    }
  } catch (err) {
    console.error("[/lib/pdf] pdf-parse fallback failed:", err);
  }

  throw new Error("PDF contained no extractable text. It may be image-only or password-protected.");
}
