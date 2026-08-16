import { useState } from 'react'
import { Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import UploadModal from './UploadModal'
import DocumentList from './DocumentList'

function DocumentManager() {
  const [documents, setDocuments] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleUpload = (files) => {
    const newDocs = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    }))
    setDocuments((prev) => [...newDocs, ...prev])
    setUploadOpen(false)
  }

  const handleDelete = (id) => {
    setDocuments((prev) => {
      const target = prev.find((doc) => doc.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((doc) => doc.id !== id)
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Project Documents</h2>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
          Upload documents
        </Button>
      </div>
      <DocumentList documents={documents} onDelete={handleDelete} />
      <UploadModal open={uploadOpen} onCancel={() => setUploadOpen(false)} onUpload={handleUpload} />
    </div>
  )
}

export default DocumentManager
