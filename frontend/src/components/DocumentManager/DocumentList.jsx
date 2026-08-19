{/*
import { List, Button, Typography, Popconfirm } from 'antd'
import {
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

function iconForName(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return <FilePdfOutlined className="text-lg text-red-500" />
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return <FileWordOutlined className="text-lg text-blue-500" />
  }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
    return <FileExcelOutlined className="text-lg text-green" />
  }
  return <FileOutlined className="text-lg" />
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentList({ documents, onDelete }) {
  if (documents.length === 0) {
    return <Text type="secondary">No documents uploaded yet.</Text>
  }

  return (
    <List
      itemLayout="horizontal"
      dataSource={documents}
      renderItem={(doc) => {
        const actions = [
          doc.name.toLowerCase().endsWith('.pdf') && (
            <Button key="preview" type="link" icon={<EyeOutlined />} href={doc.url} target="_blank" rel="noreferrer">
              Preview
            </Button>
          ),
          <Button key="download" type="link" icon={<DownloadOutlined />} href={doc.url} download={doc.name}>
            Download
          </Button>,
          <Popconfirm key="delete" title="Remove this document?" onConfirm={() => onDelete(doc.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ].filter(Boolean)

        return (
          <List.Item actions={actions}>
            <List.Item.Meta
              avatar={iconForName(doc.name)}
              title={doc.name}
              description={`${formatSize(doc.size)} · uploaded ${dayjs(doc.uploadedAt).format('MMM D, YYYY h:mm A')}`}
            />
          </List.Item>
        )
      }}
    />
  )
}

export default DocumentList
}