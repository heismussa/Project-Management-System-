import { Button, Space } from 'antd'

function StyleTestPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-primary">
        Tailwind + AntD style check
      </h1>
      <p className="mt-2 text-base text-gray-500">
        This text is styled with Tailwind utility classes. The button below
        is an untouched AntD <code>Button</code> — if the layer setup is
        correct it keeps its rounded, filled AntD look instead of falling
        back to a plain reset <code>&lt;button&gt;</code>.
      </p>
      <Space className="mt-6">
        <Button type="primary">AntD primary button</Button>
        <Button>Default button</Button>
      </Space>
    </div>
  )
}

export default StyleTestPage
