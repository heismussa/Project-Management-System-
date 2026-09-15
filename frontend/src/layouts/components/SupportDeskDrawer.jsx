import { Drawer } from 'antd'
import { Building2, Home, Phone, Smartphone, X } from 'lucide-react'

const ICON_COLOR = '#650018'
const LINK_CLASS = 'text-[#1677ff] hover:underline'

const rows = [
  {
    key: 'hq',
    icon: Home,
    content: <span className="font-semibold text-gray-900 dark:text-gray-100">HQ</span>,
  },
  {
    key: 'address',
    icon: Building2,
    content: (
      <div className="space-y-0.5">
        <div className="font-semibold text-gray-900 dark:text-gray-100">National Social Security Fund</div>
        <div className="text-gray-600 dark:text-gray-300">P.O.Box 1322, Benjamin Mkapa Pension Towers,</div>
        <div className="text-gray-600 dark:text-gray-300">11104 Azikiwe St,</div>
        <div className="text-gray-600 dark:text-gray-300">Dar es Salaam, Tanzania</div>
        <a href="mailto:customercare@nssf.go.tz" className={LINK_CLASS}>
          customercare@nssf.go.tz
        </a>
      </div>
    ),
  },
  {
    key: 'mobile',
    icon: Smartphone,
    content: (
      <a href="tel:0800116773" className={`font-medium ${LINK_CLASS}`}>
        0800116773
      </a>
    ),
  },
  {
    key: 'landline',
    icon: Phone,
    content: (
      <a href="tel:+255222200037" className={`font-medium ${LINK_CLASS}`}>
        (255) (22) 2200037
      </a>
    ),
  },
]

export default function SupportDeskDrawer({ open, onClose }) {
  return (
    <Drawer
      open={open}
      width={420}
      onClose={onClose}
      closable={false}
      title={
        <div className="flex items-start justify-between gap-3 pr-1">
          <div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Support Desk</div>
            <p className="mt-1 text-sm font-normal leading-snug text-gray-500 dark:text-gray-400">
              Need help using the system? Reach out to our support team through any of the channels below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close support desk"
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <ul className="m-0 list-none space-y-5 p-0">
        {rows.map((row) => (
          <li key={row.key} className="flex gap-3">
            <row.icon className="mt-0.5 h-5 w-5 shrink-0" color={ICON_COLOR} strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 text-sm leading-relaxed">{row.content}</div>
          </li>
        ))}
      </ul>
    </Drawer>
  )
}
