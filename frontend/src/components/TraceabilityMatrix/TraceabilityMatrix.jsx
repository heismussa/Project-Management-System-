import { Table, Segmented } from 'antd'
import { REQUIREMENT_STATUSES, TEST_RESULTS } from './status'
import ProgressGauge from './ProgressGauge'

function TraceabilityMatrix({ requirements, onChange }) {
  const updateRequirement = (id, patch) => {
    onChange(requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      fixed: 'left',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      key: 'status',
      width: 260,
      render: (_, record) => (
        <Segmented
          size="small"
          value={record.status}
          options={REQUIREMENT_STATUSES}
          onChange={(value) => updateRequirement(record.id, { status: value })}
        />
      ),
    },
    {
      title: 'Test result',
      key: 'testResult',
      width: 220,
      render: (_, record) => (
        <Segmented
          size="small"
          value={record.testResult}
          options={TEST_RESULTS}
          onChange={(value) => updateRequirement(record.id, { testResult: value })}
        />
      ),
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">SRS Traceability Matrix</h2>
      <div className="mb-6 flex justify-center">
        <ProgressGauge requirements={requirements} />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={requirements}
        scroll={{ x: 900 }}
        pagination={false}
      />
    </div>
  )
}

export default TraceabilityMatrix
