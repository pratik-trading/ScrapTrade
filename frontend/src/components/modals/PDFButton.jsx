import React, { useState } from 'react';
import PDFViewerModal from './PDFViewerModal';

export default function PDFButton({ pdfUrl, billNumber }) {
  const [open, setOpen] = useState(false);
  if (!pdfUrl) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(pdfUrl);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
      >
        {isImage ? '🖼 Image' : '📄 PDF'}
      </button>
      <PDFViewerModal
        open={open}
        onClose={() => setOpen(false)}
        pdfUrl={pdfUrl}
        title={`Bill: ${billNumber}`}
      />
    </>
  );
}