import { Tag } from 'antd'

const TEST_RESULT = {
  pass: { label: 'Pass', color: '#068737' },
  fail: { label: 'Fail', color: 'red' },
  not_tested: { label: 'Not Tested', color: 'default' },
}

function TestResultBadge({ result }) {
  const entry = TEST_RESULT[result]
  if (!entry) return null
  return <Tag color={entry.color}>{entry.label}</Tag>
}

export default TestResultBadge
