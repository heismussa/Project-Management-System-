import { useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Tag, message } from 'antd'
import DataTable from '../common/DataTable'
import RoleGuard, { useActiveRoleName } from '../common/RoleGuard'
import { ROLES } from '../../utility/Config.jsx'
import api from '../../lib/axios'

export default function ClosurePanel({ projectId, closure, workflow, onChanged }) {
  const roleName = useActiveRoleName()
  const [form] = Form.useForm()
  const [modal, setModal] = useState(null)
  const checks = closure?.checks || workflow?.closure?.checks || []
  const requested = Boolean(workflow?.closure_requested_at || closure?.closure_requested_at)
  const closed = Boolean(workflow?.closed_at || closure?.closed_at)
  const canRequest = Boolean(workflow?.can_request_closure)
  const canApprove = Boolean(workflow?.can_approve_closure)
  const isPlanner = roleName === ROLES.PPL || roleName === ROLES.PAD

  const run = async (path, payload, success) => {
    try {
      const response = await api.post(path, payload)
      message.success(success || response.data.message)
      setModal(null)
      form.resetFields()
      onChanged?.()
    } catch (err) {
      const closeErrors = err.response?.data?.errors?.close
      message.error(
        (Array.isArray(closeErrors) && closeErrors[0]) ||
          err.response?.data?.message ||
          'Action failed',
      )
    }
  }

  const submit = () => {
    form.validateFields().then((values) => {
      if (modal === 'request') {
        run(`/projects/${projectId}/closure/request`, { comment: values.comment }, 'Closure requested')
      } else if (modal === 'return') {
        run(`/projects/${projectId}/closure/return`, { comment: values.comment }, 'Returned to planner')
      } else if (modal === 'close') {
        run(`/projects/${projectId}/close`, { comment: values.comment }, 'Project closed')
      }
    })
  }

  return (
    <div className="space-y-3">
      {closed && <Alert type="success" showIcon message="This project is closed." />}
      {requested && !closed && (
        <Alert
          type="info"
          showIcon
          message="Planner requested closure"
          description={workflow?.closure_request_comment || closure?.closure_request_comment || 'Awaiting reviewer sign-off.'}
        />
      )}
      {workflow?.closure_return_comment && !requested && !closed && (
        <Alert type="warning" showIcon message="Closure returned" description={workflow.closure_return_comment} />
      )}

      <DataTable
        rowKey="key"
        data={checks}
        hideSearch
        columns={[
          { title: 'Gate', dataIndex: 'label' },
          {
            title: 'Result',
            dataIndex: 'passed',
            width: 140,
            render: (passed) => <Tag color={passed ? 'green' : 'red'}>{passed ? 'Passed' : 'Blocked'}</Tag>,
            searchValue: (record) => (record.passed ? 'Passed' : 'Blocked'),
          },
        ]}
      />

      <Space wrap>
        {isPlanner && (
          <Button type="primary" disabled={!canRequest || closed} onClick={() => setModal('request')}>
            Request closure
          </Button>
        )}
        <RoleGuard allow={[ROLES.PRV, ROLES.PAD]}>
          <Button disabled={!canApprove || closed} onClick={() => setModal('return')}>
            Return to planner
          </Button>
          <Button type="primary" danger disabled={!canApprove || closed} onClick={() => setModal('close')}>
            Sign off and close
          </Button>
        </RoleGuard>
      </Space>

      <Modal
        title={
          { request: 'Request closure', return: 'Return closure request', close: 'Sign off and close' }[modal] ||
          'Comment'
        }
        open={modal !== null}
        onOk={submit}
        onCancel={() => {
          setModal(null)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="comment"
            label="Comment"
            rules={modal === 'return' ? [{ required: true, message: 'A return comment is required' }] : []}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
