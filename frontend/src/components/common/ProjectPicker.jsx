import { Select } from 'antd'

function ProjectPicker({ projects, value, onChange, disabled }) {
  return (
    <Select
      showSearch
      placeholder="Select a project"
      optionFilterProp="label"
      style={{ minWidth: 280 }}
      disabled={disabled}
      value={value ?? undefined}
      onChange={onChange}
      options={projects.map((project) => ({
        value: project.id,
        label: project.name ?? `Project #${project.id}`,
      }))}
    />
  )
}

export default ProjectPicker
