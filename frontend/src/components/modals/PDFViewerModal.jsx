import React, { useState } from 'react';
import { Modal } from '../ui';

// Get the best viewable URL for any file
const getViewableUrl = (url) => {
  if (!url) return { type: 'none', url: '' };

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  
  if (isImage) {
    return { type: 'image', url };
  }

  // For Cloudinary raw PDFs - use Google Docs viewer which handles them perfectly
  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  return { type: 'pdf', url, googleDocsUrl };
};

export default function PDFViewerModal({ open, onClose, pdfUrl, title }) {
  const [useGoogleDocs, setUseGoogleDocs] = useState(true);
  const { type, url, googleDocsUrl } = getViewableUrl(pdfUrl);

  // Reset when modal opens
  const handleOpen = () => {
    setUseGoogleDocs(true);
  };

  return (
    <Modal open={open} onClose={onClose} title={title || 'View Bill'} size="xl">
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {type === 'pdf' && (
              <>
                <button
                  onClick={() => setUseGoogleDocs(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${useGoogleDocs ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setUseGoogleDocs(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!useGoogleDocs ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                >
                  Direct
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors"
            >
              ↗ New Tab
            </a>
            <a
              href={url}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors"
            >
              ↓ Download
            </a>
          </div>
        </div>

        {/* Viewer */}
        <div
          className="w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          style={{ height: '72vh' }}
        >
          {type === 'image' && (
            <img
              src={url}
              alt="Bill"
              className="w-full h-full object-contain"
            />
          )}

          {type === 'pdf' && useGoogleDocs && (
            <iframe
              key="google-docs"
              src={googleDocsUrl}
              title="PDF Preview"
              className="w-full h-full border-0"
              allowFullScreen
            />
          )}

          {type === 'pdf' && !useGoogleDocs && (
            <iframe
              key="direct"
              src={url}
              title="PDF Direct"
              className="w-full h-full border-0"
              allowFullScreen
            />
          )}

          {type === 'none' && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
              No file attached
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          If preview doesn't load, click "New Tab" to view or "Download" to save
        </p>
      </div>
    </Modal>
  );
}