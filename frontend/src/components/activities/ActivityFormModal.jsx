import { useEffect, useState } from 'react'
import { Button, Divider, Form, Input, DatePicker, Select, Spin, Upload, Typography, message, Modal } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { extractUploadFile } from '../../lib/projectDocuments'

const { Dragger } = Upload
const { Text } = Typography

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx']
const MAX_FILE_SIZE_MB = 10

function validateFile(file) {
  const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  if (!extensionOk) {
    message.error(`${file.name} is not a supported file type`)
    return Upload.LIST_IGNORE
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    message.error(`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB limit`)
    return Upload.LIST_IGNORE
  }
  return false
}

function ActivityFormModal({
  open,
  activity,
  people,
  requiredProjectDocTypes = [],
  activityDocuments = [],
  activityDocumentsLoading = false,
  saving = false,
  onCancel,
  onSave,
  onViewDocument,
}) {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState([])
  const [projectDocFiles, setProjectDocFiles] = useState({})
  const isCreate = activity?.id == null

  useEffect(() => {
    if (!open) {
      setFileList([])
      setProjectDocFiles({})
      return
    }
    if (!activity) return
    form.setFieldsValue({
      name: activity.name,
      expected_deliverable: activity.expected_deliverable,
      plannedRange: [
        activity.planned_start_date ? dayjs(activity.planned_start_date) : null,
        activity.planned_end_date ? dayjs(activity.planned_end_date) : null,
      ],
      responsible_person_id: activity.responsible_person_id,
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      const newActivityFiles = fileList.map((entry) => extractUploadFile(entry)).filter(Boolean)
      const hasExistingActivityDocs = activityDocuments.length > 0

      if (isCreate && newActivityFiles.length === 0) {
        message.error('Attach at least one supporting document before adding this activity.')
        return
      }

      if (!isCreate && newActivityFiles.length === 0 && !hasExistingActivityDocs) {
        message.error('Attach at least one supporting document for this activity.')
        return
      }

      const missingProjectDoc = requiredProjectDocTypes.find(
        (type) => !(projectDocFiles[type] || []).some((entry) => extractUploadFile(entry)),
      )
      if (missingProjectDoc) {
        Modal.warning({
          title: 'Missing required project documents',
          content: `Attach ${missingProjectDoc} in the Required Project Documents section before saving.`,
        })
        return
      }

      const [plannedStart, plannedEnd] = values.plannedRange
      onSave({
        id: activity?.id ?? null,
        name: values.name,
        expected_deliverable: values.expected_deliverable,
        planned_start_date: plannedStart.format('YYYY-MM-DD'),
        planned_end_date: plannedEnd.format('YYYY-MM-DD'),
        responsible_person_id: values.responsible_person_id,
        documents: newActivityFiles,
        projectDocuments: Object.fromEntries(
          requiredProjectDocTypes.map((type) => [
            type,
            (projectDocFiles[type] || []).map(extractUploadFile).filter(Boolean),
          ]),
        ),
      })
    })
  }

  const handleCancel = () => {
    form.resetFields()
    setFileList([])
    setProjectDocFiles({})
    onCancel()
  }

  return (
    <Modal
      title={isCreate ? 'Add activity' : `Edit activity — ${activity?.name || ''}`}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={isCreate ? 'Add' : 'Save changes'}
      cancelText="Close"
      confirmLoading={saving}
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <OkBtn />
          <CancelBtn />
        </>
      )}
      destroyOnHidden
      width={720}
      centered
      zIndex={1100}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
    >
      <Form form={form} layout="vertical" className="mt-4" autoComplete="off">
        <Form.Item
          name="name"
          label="Activity name"
          rules={[{ required: true, message: 'Activity name is required' }]}
        >
          <Input placeholder="e.g. Foundation excavation" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="expected_deliverable"
          label="Expected Deliverable"
          rules={[{ required: true, message: 'Expected deliverable is required' }]}
        >
          <Input.TextArea rows={2} placeholder="e.g. Excavated foundation trench" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="plannedRange"
          label="Planned Start / Planned End"
          rules={[{ required: true, message: 'Planned start and end dates are required' }]}
        >
          <DatePicker.RangePicker className="w-full" />
        </Form.Item>
        <Form.Item
          name="responsible_person_id"
          label="Responsible Person"
          rules={[{ required: true, message: 'Responsible person is required' }]}
        >
          <Select
            placeholder="Select a team member"
            options={people.map((person) => ({ value: person.id, label: person.name }))}
          />
        </Form.Item>

        {requiredProjectDocTypes.length > 0 && (
          <>
            <Divider orientation="left" orientationMargin={0} style={{ color: '#800000', fontWeight: 700 }}>
              Required Project Documents
            </Divider>
            <Text type="secondary" className="mb-2 block text-xs">
              Attach any missing project-level documents here. Saving will upload them and submit the plan for
              review automatically.
            </Text>
            {requiredProjectDocTypes.map((type) => {
              const list = projectDocFiles[type] || []
              return (
                <Form.Item
                  key={type}
                  label={
                    <span>
                      {type} <span style={{ color: '#ff4d4f' }}>*</span>
                    </span>
                  }
                  validateStatus={!(list || []).some((entry) => extractUploadFile(entry)) ? 'error' : undefined}
                >
                  <Dragger
                    multiple={false}
                    fileList={list}
                    beforeUpload={validateFile}
                    onChange={({ fileList: next }) => setProjectDocFiles((prev) => ({ ...prev, [type]: next }))}
                    accept={ACCEPTED_EXTENSIONS.join(',')}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag the {type} document here</p>
                  </Dragger>
                </Form.Item>
              )
            })}
          </>
        )}

        <Divider orientation="left" orientationMargin={0} style={{ color: '#800000', fontWeight: 700 }}>
          Activity documents
        </Divider>

        {!isCreate && (
          <div className="mb-3">
            {activityDocumentsLoading ? (
              <Spin size="small" />
            ) : activityDocuments.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activityDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span>
                      {doc.file_name}{' '}
                      <span className="text-gray-400">({doc.document_type || 'Document'})</span>
                    </span>
                    {onViewDocument && (
                      <Button size="small" type="link" onClick={() => onViewDocument(doc)}>
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" className="text-xs">
                No documents attached to this activity yet.
              </Text>
            )}
          </div>
        )}

        <Form.Item
          label={
            <span>
              {isCreate ? 'Supporting documents' : 'Add or replace documents'}{' '}
              <span style={{ color: '#ff4d4f' }}>*</span>
            </span>
          }
          extra="Activity-specific files (evidence, deliverables). These do not count as Implementation Plan or SRS."
          validateStatus={
            (isCreate || activityDocuments.length === 0) && fileList.length === 0 ? 'error' : undefined
          }
        >
          <Dragger
            multiple
            fileList={fileList}
            beforeUpload={validateFile}
            onChange={({ fileList: next }) => setFileList(next)}
            accept={ACCEPTED_EXTENSIONS.join(',')}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              {isCreate ? 'Click or drag files to attach' : 'Upload additional or replacement files'}
            </p>
            <Text type="secondary">
              Supports PDF, DOCX and XLSX files, up to {MAX_FILE_SIZE_MB}MB each.
              {!isCreate && ' New files are added when you save.'}
            </Text>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ActivityFormModal
