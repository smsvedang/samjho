import { FileAttachment, FileCategory } from '../types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function determineCategory(file: File): FileCategory {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(name)) {
    return 'image';
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    type.includes('json') ||
    type.includes('javascript') ||
    type.includes('typescript') ||
    type.includes('python') ||
    type.includes('html') ||
    type.includes('xml') ||
    type.includes('css') ||
    /\.(js|jsx|ts|tsx|py|java|cpp|c|h|cs|go|rs|php|rb|swift|kt|dart|html|css|scss|sass|less|json|yaml|yml|xml|sql|sh|bash|bat|ps1|vue|svelte)$/i.test(name)
  ) {
    return 'code';
  }

  if (
    type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|tsv|log|rtf|ini|env|conf|toml)$/i.test(name)
  ) {
    return 'document';
  }

  return 'other';
}

/**
 * Robust in-browser text extractor for PDF files
 */
async function extractTextFromPDF(
  file: File,
  onProgress?: (status: string) => void
): Promise<{ text: string; pages: number }> {
  onProgress?.('Processing...');
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set worker source gracefully
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const extractedChunks: string[] = [];

    const maxPagesToRead = Math.min(numPages, 30); // prevent freezing on huge 500-page textbooks
    for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
      onProgress?.('Processing...');
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');

      if (pageText.trim()) {
        extractedChunks.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
      }
    }

    if (numPages > maxPagesToRead) {
      extractedChunks.push(`\n[Note: Only first ${maxPagesToRead} of ${numPages} pages extracted for performance]`);
    }

    const fullText = extractedChunks.join('\n\n');
    if (fullText.trim().length > 0) {
      return { text: fullText, pages: numPages };
    }
  } catch (err: any) {
    console.warn('[Samjho] pdfjs-dist primary parse failed, using fallback stream extractor:', err);
  }

  // Fast fallback stream text extractor for pure client side without external workers
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(arrayBuffer);
    
    // Extract text strings inside PDF stream chunks
    const matches = raw.match(/\(([^()]{2,})\)\s*Tj/g) || [];
    const extracted = matches
      .map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim())
      .filter(m => m.length > 2)
      .join(' ');

    if (extracted.length > 50) {
      return { text: extracted, pages: 1 };
    }
  } catch (fallbackErr) {
    console.warn('[Samjho] Fallback PDF extractor failed:', fallbackErr);
  }

  return { text: '[PDF document attached. Text could not be automatically extracted, but the file is attached to your session.]', pages: 1 };
}

/**
 * Preprocesses an image on HTML5 Canvas to dramatically improve OCR accuracy for handwriting & photos:
 * 1. Rescales to optimal OCR DPI / resolution.
 * 2. Converts to high-contrast grayscale.
 * 3. Normalizes luminance & suppresses ruled notebook lines / background shadows.
 */
function preprocessImageForOCR(img: HTMLImageElement): string {
  if (typeof document === 'undefined') return img.src;

  try {
    const canvas = document.createElement('canvas');
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (!width || !height) return img.src;

    // Optimal scaling for OCR (aim for ~1800-2400px width/height for clear character strokes)
    const maxDim = Math.max(width, height);
    let scale = 1;
    if (maxDim < 1400) {
      scale = Math.min(2.5, 1800 / maxDim);
    } else if (maxDim > 3200) {
      scale = 2400 / maxDim;
    }

    width = Math.round(width * scale);
    height = Math.round(height * scale);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Calculate min & max luminance for contrast stretching
    let minLum = 255;
    let maxLum = 0;
    const grayBuffer = new Float32Array(data.length / 4);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      grayBuffer[j] = gray;
      if (gray < minLum) minLum = gray;
      if (gray > maxLum) maxLum = gray;
    }

    const range = Math.max(1, maxLum - minLum);

    // Apply adaptive contrast stretching & push light paper background to pure white
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      let norm = ((grayBuffer[j] - minLum) / range) * 255;

      // S-curve contrast boost:
      if (norm > 155) {
        // Boost light background/paper to pure white (#FFFFFF), eliminating ruled notebook lines & shadows
        norm = Math.min(255, norm * 1.3);
      } else if (norm < 115) {
        // Deepen handwritten strokes
        norm = norm * 0.7;
      }

      data[i] = norm;
      data[i + 1] = norm;
      data[i + 2] = norm;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[OCR Preprocess] Fallback to raw image:', err);
    return img.src;
  }
}

/**
 * Optical Character Recognition (OCR) & Visual metadata for uploaded images
 */
async function processImage(
  file: File,
  onProgress?: (status: string) => void
): Promise<{
  dataUrl: string;
  extractedText?: string;
  dimensions?: { width: number; height: number };
}> {
  onProgress?.('Loading image...');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Get dimensions via an Image object
  const { dimensions, img } = await new Promise<{
    dimensions: { width: number; height: number };
    img: HTMLImageElement;
  }>((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        dimensions: { width: image.naturalWidth, height: image.naturalHeight },
        img: image,
      });
    image.onerror = () =>
      resolve({
        dimensions: { width: 0, height: 0 },
        img: image,
      });
    image.src = dataUrl;
  });

  let extractedText: string | undefined = undefined;

  try {
    onProgress?.('Enhancing image clarity...');
    const preprocessedDataUrl = preprocessImageForOCR(img);

    onProgress?.('Extracting text & handwriting...');
    const { recognize } = await import('tesseract.js');

    // Set a timeout so processing never hangs indefinitely
    const ocrPromise = recognize(preprocessedDataUrl, 'eng', {
      logger: (_m) => {
        onProgress?.('Recognizing text...');
      },
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
    const result = await Promise.race([ocrPromise, timeoutPromise]);

    if (result && result.data && result.data.text) {
      // Clean up lines that are only random noise or punctuation
      const rawLines = result.data.text.split('\n');
      const cleanLines = rawLines
        .map((l) => l.trim())
        .filter((l) => {
          // Keep line if it has at least some alphanumeric characters
          const alnumCount = (l.match(/[a-zA-Z0-9]/g) || []).length;
          return alnumCount >= 2;
        });

      if (cleanLines.length > 0) {
        extractedText = cleanLines.join('\n');
      }
    }
  } catch (err: any) {
    console.warn('[Samjho] Image text notice:', err?.message || err);
  }

  return { dataUrl, extractedText, dimensions };
}

/**
 * Main function to process any uploaded file completely on client-side
 */
export async function processUploadedFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<FileAttachment> {
  const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const category = determineCategory(file);

  const attachment: FileAttachment = {
    id,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    category,
    status: 'reading',
    statusText: 'Processing...',
  };

  try {
    if (category === 'image') {
      const { dataUrl, extractedText, dimensions } = await processImage(file, onProgress);
      attachment.dataUrl = dataUrl;
      attachment.extractedText = extractedText;
      attachment.imageDimensions = dimensions;

      const words = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;
      attachment.wordCount = words;
      attachment.summary = 'Image';
      attachment.status = 'ready';
      attachment.statusText = 'Ready';
      return attachment;
    }

    if (category === 'pdf') {
      const { text, pages } = await extractTextFromPDF(file, onProgress);
      attachment.extractedText = text;
      const words = text.split(/\s+/).filter(Boolean).length;
      attachment.wordCount = words;
      attachment.summary = `PDF Document • ${pages} ${pages === 1 ? 'page' : 'pages'} • ${words} words`;
      attachment.status = 'ready';
      attachment.statusText = 'Ready';
      return attachment;
    }

    if (category === 'code' || category === 'document') {
      onProgress?.('Reading text content...');
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Cap text to 100,000 chars to avoid memory overload
      const maxLen = 100000;
      const truncatedText = text.length > maxLen
        ? text.substring(0, maxLen) + `\n\n[Content truncated — showing first ${maxLen} characters]`
        : text;

      attachment.extractedText = truncatedText;
      const lines = truncatedText.split('\n').length;
      const words = truncatedText.split(/\s+/).filter(Boolean).length;
      attachment.lineCount = lines;
      attachment.wordCount = words;

      const catLabel = category === 'code' ? 'Code File' : 'Text Document';
      attachment.summary = `${catLabel} • ${lines} lines • ${words} words`;
      attachment.status = 'ready';
      attachment.statusText = 'Ready';
      return attachment;
    }

    // Generic / other file
    attachment.summary = `Attachment (${formatFileSize(file.size)})`;
    attachment.status = 'ready';
    attachment.statusText = 'Ready';
    return attachment;
  } catch (err: any) {
    console.error('[Samjho] Error processing file:', err);
    attachment.status = 'error';
    attachment.error = err?.message || 'Failed to read file';
    attachment.statusText = 'Read Error';
    return attachment;
  }
}

/**
 * Builds formatted attachment context for AI comprehension
 */
export function buildAttachmentPromptContext(attachments?: FileAttachment[]): string {
  if (!attachments || attachments.length === 0) return '';

  const blocks = attachments.map((att, idx) => {
    let block = `\n--- ATTACHED FILE #${idx + 1}: "${att.name}" (${att.category.toUpperCase()}, ${formatFileSize(att.size)}) ---`;
    
    if (att.imageDimensions) {
      block += `\nImage Dimensions: ${att.imageDimensions.width}x${att.imageDimensions.height}px`;
    }

    if (att.extractedText && att.extractedText.trim().length > 0) {
      block += `\nExtracted Content / Text from ${att.name}:\n"""\n${att.extractedText.trim()}\n"""`;
    } else if (att.category === 'image') {
      block += `\n[Image contains no prominent readable text or is a diagram/photo]`;
    }

    return block;
  });

  return `\n\n[USER ATTACHMENTS FOR THIS CONVERSATION]\n${blocks.join('\n')}\n[END OF USER ATTACHMENTS]\n`;
}
