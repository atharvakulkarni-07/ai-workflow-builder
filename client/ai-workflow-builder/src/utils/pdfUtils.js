import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';


export async function extractTextFromPDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      return fullText.slice(0, 12000);
    } catch (err) {
      console.error('PDF extraction failed:', err);
      throw new Error('Failed to extract text from PDF');
    }
  }
  
  