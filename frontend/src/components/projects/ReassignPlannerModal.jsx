import { Form, Modal, Select } from 'antd'

/**
 * Reviewer's "Reassign planner" popup on the Projects page — purely
 * presentational; ProjectsPage.jsx owns the form instance (so it can
 * reset it on submit) and the reassign request itself.
 */
function ReassignPlannerModal({ target, planners, saving, form, onCancel, onFinish }) {
  return (
    <Modal
      title={target ? `Reassign planner — ${target.name}` : 'Reassign planner'}
      open={Boolean(target)}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <OkBtn />
          <CancelBtn />
        </>
      )}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="pt-2">
        <Form.Item name="planner_id" label="Planner" rules={[{ required: true, message: 'Select a planner' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={planners.map((item) => ({
              value: item.id,
              label: `${item.name} (${item.email})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ReassignPlannerModal
