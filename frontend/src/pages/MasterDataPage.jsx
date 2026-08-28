import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Table, Typography, message } from 'antd'
import {
  DEFAULT_ANNUAL_PLAN_REFERENCES,
  getAnnualPlanReferences,
  getExtraActivities,
  getStoredList,
  saveAnnualPlanReferences,
  saveExtraActivities,
} from '../lib/projectCatalog'

const { Title, Paragraph } = Typography

const APR_STORAGE_KEY = 'pms-annual-plan-items'

export default function MasterDataPage() {
  const [aprForm] = Form.useForm()
  const [activityForm] = Form.useForm()
  const [apr, setApr] = useState(() => getAnnualPlanReferences())
  const [activities, setActivities] = useState(() => getExtraActivities())

  const customApr = useMemo(() => getStoredList(APR_STORAGE_KEY), [apr])

  const addApr = (values) => {
    const value = values.reference.trim()
    const next = [...new Set([...customApr, value])]
    saveAnnualPlanReferences(next)
    setApr(getAnnualPlanReferences())
    aprForm.resetFields()
    message.success('Annual plan reference added')
  }

  const addActivity = (values) => {
    const next = [...new Set([...activities, values.name.trim()])]
    saveExtraActivities(next)
    setActivities(next)
    activityForm.resetFields()
    message.success('Activity catalog item added')
  }

  return (
    <div>
      <Title level={4} className="!mb-1">
        Master data
      </Title>
      <Paragraph type="secondary">
        Annual Plan picklist and extra activity names used during registration. Values are stored in this browser until
        a central import endpoint is available.
      </Paragraph>

      <Card className="page-shell-card mb-4" title="Annual Plan references">
        <Form form={aprForm} layout="inline" className="mb-4" onFinish={addApr}>
          <Form.Item name="reference" rules={[{ required: true, message: 'Enter a reference' }]}>
            <Input placeholder="NSSF-2026-APR-010" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </Form.Item>
        </Form>
        <Table
          rowKey={(value) => value}
          pagination={false}
          dataSource={apr}
          columns={[
            {
              title: 'Reference',
              render: (value) => value,
            },
            {
              title: 'Source',
              render: (value) => (DEFAULT_ANNUAL_PLAN_REFERENCES.includes(value) ? 'Default' : 'Custom'),
            },
          ]}
        />
      </Card>

      <Card className="page-shell-card" title="Extra activity names">
        <Form form={activityForm} layout="inline" className="mb-4" onFinish={addActivity}>
          <Form.Item name="name" rules={[{ required: true, message: 'Enter an activity name' }]}>
            <Input placeholder="Go-Live rehearsal" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add
            </Button>
          </Form.Item>
        </Form>
        <Table
          rowKey={(value) => value}
          pagination={false}
          dataSource={activities}
          locale={{ emptyText: 'No extra activities yet.' }}
          columns={[{ title: 'Activity', render: (value) => value }]}
        />
      </Card>
    </div>
  )
}
