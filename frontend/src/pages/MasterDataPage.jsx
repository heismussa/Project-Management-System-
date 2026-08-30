import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, message } from 'antd'
import DataTable from '../components/common/DataTable'
import {
  DEFAULT_ANNUAL_PLAN_REFERENCES,
  getAnnualPlanReferences,
  getExtraActivities,
  getStoredList,
  saveAnnualPlanReferences,
  saveExtraActivities,
} from '../lib/projectCatalog'

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
        <DataTable
          rowKey={(value) => value}
          data={apr}
          hideSearch
          columns={[
            {
              title: 'Reference',
              render: (_, record) => record,
            },
            {
              title: 'Source',
              width: 140,
              render: (_, record) => (DEFAULT_ANNUAL_PLAN_REFERENCES.includes(record) ? 'Default' : 'Custom'),
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
        <DataTable
          rowKey={(value) => value}
          data={activities}
          hideSearch
          emptyText="No extra activities yet."
          columns={[{ title: 'Activity', render: (_, record) => record }]}
        />
      </Card>
    </div>
  )
}
