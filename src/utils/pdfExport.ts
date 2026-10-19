import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Transaction, CreditCard } from '../types';
import {
  formatThaiCurrency,
  formatThaiDate,
  formatThaiMonth,
  CATEGORY_INFO,
  getTransactionBillingCycleMonth,
} from './cardUtils';
import { CsvExportFilterOptions, filterTransactionsForExport } from './csvExport';

export interface BrandInfo {
  name: string;
  logo: string | null;
  tagline: string;
}

/**
 * Downloads an HTML element as an A4 PDF document using html2canvas & jsPDF
 */
export const downloadElementAsPdf = async (
  element: HTMLElement,
  fileName: string = 'CardPulse_Expense_Report.pdf'
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2.0, // High-DPI crisp resolution for typography
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Subsequent pages if document height exceeds one A4 page
    while (heightLeft > 2) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Opens a print dialog for the target element using an isolated hidden iframe
 */
export const printElement = (element: HTMLElement, title: string = 'รายงานสรุปค่าบัตรเครดิต') => {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) return;

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          font-family: 'Prompt', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #1e293b;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      </style>
    </head>
    <body>
      ${element.outerHTML}
      <script>
        window.onload = function() {
          window.focus();
          window.print();
          setTimeout(function() {
            window.frameElement.parentNode.removeChild(window.frameElement);
          }, 1000);
        };
      </script>
    </body>
    </html>
  `);
  frameDoc.close();
};
