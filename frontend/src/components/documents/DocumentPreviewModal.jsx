import { Button, Modal, Spin } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

// mammoth (docx) and the xlsx-to-table converter both produce plain,
// unstyled HTML — a bare <table> renders with no borders or padding at all
// in a browser, which is what made a converted document look like its
// tables had been stripped out and left as loose text. This is what
// actually gives that HTML the visual structure (borders, header shading,
// heading sizes, spacing) back, scoped to just this preview.
const PREVIEW_STYLES = `
  .doc-preview table { border-collapse: collapse; width: 100%; margin: 4px 0 14px; }
  .doc-preview th, .doc-preview td { border: 1px solid #d9d9d9; padding: 6px 10px; font-size: 13px; text-align: left; vertical-align: top; }
  .doc-preview th { background: #962c30; color: #fff; font-weight: 600; }
  .doc-preview tr:nth-child(even) td { background: #faf7f2; }
  .doc-preview h1, .doc-preview h2, .doc-preview h3 { color: #1F2937; font-weight: 700; margin: 18px 0 8px; line-height: 1.3; }
  .doc-preview h1 { font-size: 20px; }
  .doc-preview h2 { font-size: 17px; }
  .doc-preview h3 { font-size: 15px; }
  .doc-preview p { margin: 0 0 10px; line-height: 1.6; font-size: 13.5px; color: #1F2937; }
  .doc-preview ul, .doc-preview ol { margin: 0 0 10px 22px; padding: 0; font-size: 13.5px; line-height: 1.6; }
  .doc-preview li { margin-bottom: 4px; }
  .doc-preview img { max-width: 100%; height: auto; }
  .doc-preview strong { font-weight: 700; }
  .doc-preview a { color: #962c30; }
`

/** Pair with useDocumentPreview() — renders whatever that hook is holding.
 * PDFs render in an iframe; docx/xlsx are pre-converted to plain HTML by
 * the hook (mammoth / ExcelJS) and rendered directly — both are trusted,
 * already-authenticated content the viewer just downloaded, same as the
 * PDF blob is. */
export default function DocumentPreviewModal({
  doc,
  url,
  html,
  kind,
  loading,
  downloading,
  onClose,
  onDownload,
  zIndex,
}) {
  return (
    <Modal
      title={doc?.file_name}
      open={doc !== null}
      onCancel={onClose}
      destroyOnHidden
      width={kind === 'html' ? 960 : 860}
      zIndex={zIndex}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button icon={<DownloadOutlined />} loading={downloading} onClick={() => doc && onDownload(doc)}>
            Download
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : kind === 'pdf' && url ? (
        <iframe src={url} title={doc.file_name} style={{ width: '100%', height: '70vh', border: 'none' }} />
      ) : kind === 'html' && html ? (
        <>
          <style>{PREVIEW_STYLES}</style>
          <div
            className="doc-preview"
            style={{ maxHeight: '70vh', overflow: 'auto', padding: '4px 12px' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </>
      ) : (
        <div className="py-16 text-center text-sm text-gray-500">
          Preview isn't available for this file type — use Download to view it.
        </div>
      )}
    </Modal>
  )
}
