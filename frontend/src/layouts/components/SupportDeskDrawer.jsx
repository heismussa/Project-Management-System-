import { Button, Drawer } from 'antd'

export default function SupportDeskDrawer({ open, onClose }) {
  return (
    <Drawer
      open={open}
      width={500}
      onClose={onClose}
      title={<div className="w-full text-center font-semibold">Request Support</div>}
    >
      <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <p>
          For ICT support, contact the NSSF Support Desk or raise a ticket through ICTMS. Include the project name,
          page you were using, and a short description of the issue.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Drawer>
  )
}
