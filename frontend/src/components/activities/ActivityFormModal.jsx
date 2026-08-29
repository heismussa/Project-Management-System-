import { useEffect, useState } from 'react'
import { Modal, Form, Input, DatePicker, Select, Divider, Upload, Typography, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

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

function ActivityFormModal({ open, activity, people, requiredProjectDocTypes = [], saving = false, onCancel, onSave }) {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState([])
  const [projectDocFiles, setProjectDocFiles] = useState({})
  const isCreate = activity?.id == null

  useEffect(() => {
    if (!open || !activity) return
    form.setFieldsValue({
      name: activity.name,
      expected_deliverable: activity.expected_deliverable,
      plannedRange: [
        activity.planned_start_date ? dayjs(activity.planned_start_date) : null,
        activity.planned_end_date ? dayjs(activity.planned_end_date) : null,
      ],
      responsible_person_id: activity.responsible_person_id,
      rtm_requirement: '',
      rtm_comment: '',
    })
  }, [open, activity, form])

  const handleOk = () => {
    form.validateFields().then((values) => {
      if (isCreate && fileList.length === 0) {
        message.error('Attach at least one supporting document before adding this activity.')
        return
      }

      const missingProjectDoc = requiredProjectDocTypes.find((type) => !(projectDocFiles[type]?.length > 0))
      if (isCreate && missingProjectDoc) {
        message.error(`Attach the required ${missingProjectDoc} document before adding this activity.`)
        return
      }

      const [plannedStart, plannedEnd] = values.plannedRange
      onSave({
        name: values.name,
        expected_deliverable: values.expected_deliverable,
        planned_start_date: plannedStart.format('YYYY-MM-DD'),
        planned_end_date: plannedEnd.format('YYYY-MM-DD'),
        responsible_person_id: values.responsible_person_id,
        rtm_requirement: values.rtm_requirement,
        rtm_comment: values.rtm_comment,
        documents: fileList.map((entry) => entry.originFileObj || entry),
        projectDocuments: Object.fromEntries(
          Object.entries(projectDocFiles).map(([type, list]) => [type, list.map((entry) => entry.originFileObj || entry)]),
        ),
      })
      // Don't reset here — onSave is async and only closes this modal (via
      // `open` going false, which unmounts it thanks to destroyOnHidden) on
      // success. Resetting immediately would wipe the form out from under
      // the user while a save is still in flight or has failed, forcing
      // them to redo everything including re-attaching every document.
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
      title={isCreate ? 'Add activity' : 'Edit planning details'}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={isCreate ? 'Add Activity' : 'Save'}
      cancelText="Close"
      confirmLoading={saving}
      destroyOnHidden
      width={720}
      centered
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

        {isCreate && (
          <>
            <Divider orientation="left" orientationMargin={0} style={{ color: '#800000', fontWeight: 700 }}>
              RTM Requirements
            </Divider>
            <Form.Item name="rtm_requirement" label="RTM Requirement">
              <Input.TextArea
                rows={2}
                placeholder="e.g. System shall validate user login credentials"
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item name="rtm_comment" label="Comment">
              <Input.TextArea rows={2} placeholder="Optional comment for this requirement" autoComplete="off" />
            </Form.Item>

            {requiredProjectDocTypes.length > 0 && (
              <>
                <Divider orientation="left" orientationMargin={0} style={{ color: '#800000', fontWeight: 700 }}>
                  Required Project Documents
                </Divider>
                <Text type="secondary" className="mb-2 block text-xs">
                  This project doesn't have these yet — attach them now, before the first activity can be added.
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
                      validateStatus={list.length === 0 ? 'error' : 'success'}
                    >
                      <Dragger
                        multiple
                        fileList={list}
                        beforeUpload={validateFile}
                        onChange={({ fileList: next }) =>
                          setProjectDocFiles((prev) => ({ ...prev, [type]: next }))
                        }
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
              Documents
            </Divider>
            <Form.Item
              label={
                <span>
                  Supporting documents <span style={{ color: '#ff4d4f' }}>*</span>
                </span>
              }
              extra="Required — attach whatever this activity needs before it can be added."
              validateStatus={fileList.length === 0 ? 'error' : 'success'}
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
                <p className="ant-upload-text">Click or drag files to this area to attach</p>
                <Text type="secondary">
                  Supports PDF, DOCX and XLSX files, up to {MAX_FILE_SIZE_MB}MB each. Uploaded once the activity is
                  added.
                </Text>
              </Dragger>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}

export default ActivityFormModal
