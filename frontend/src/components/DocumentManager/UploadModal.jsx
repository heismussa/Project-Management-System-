import { useState } from 'react'
import { Modal, Upload, Typography, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

const { Dragger } = Upload
const { Text } = Typography

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']

function UploadModal({ open, onCancel, onUpload }) {
  const [fileList, setFileList] = useState([])

  const handleBeforeUpload = (file) => {
    const isAccepted = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!isAccepted) {
      message.error(`${file.name} is not a supported file type`)
      return Upload.LIST_IGNORE
    }
    return false
  }

  const handleOk = () => {
    onUpload(fileList.map((item) => item.originFileObj))
    setFileList([])
  }

  const handleCancel = () => {
    setFileList([])
    onCancel()
  }

  return (
    <Modal
      title="Upload documents"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Add to library"
      okButtonProps={{ disabled: fileList.length === 0 }}
      destroyOnHidden
    >
      <Dragger
        multiple
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        onChange={({ fileList: next }) => setFileList(next)}
        accept={ACCEPTED_EXTENSIONS.join(',')}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag files to this area to upload</p>
        <Text type="secondary">Supports PDF, DOCX and XLSX files</Text>
      </Dragger>
    </Modal>
  )
}

export default UploadModal
