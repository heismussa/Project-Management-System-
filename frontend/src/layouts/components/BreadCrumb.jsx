import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function BreadCrumb({ crumbs = [], className = '' }) {
  return (
    <nav className={`flex min-w-0 items-stretch gap-[10px] ${className}`.trim()} aria-label="Breadcrumb">
      <ol
        role="list"
        className="flex h-9 min-w-0 flex-1 items-center space-x-4 overflow-x-auto rounded-md border border-gray-200 bg-white px-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <li className="flex">
          <div className="flex items-center">
            <Link to="/" className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
              <Home className="h-5 w-5 flex-shrink-0" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.link}-${index}`} className="flex">
            <div className="flex items-center">
              <svg
                className="h-full w-6 flex-shrink-0 text-gray-200 dark:text-gray-600"
                viewBox="0 0 24 44"
                preserveAspectRatio="none"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
              </svg>
              {crumb.link ? (
                <Link
                  to={crumb.link}
                  className={`ml-4 whitespace-nowrap text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 ${
                    crumb?.current ? 'font-bold text-primary' : ''
                  }`}
                  aria-current={crumb?.current ? 'page' : undefined}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`ml-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-300 ${
                    crumb?.current ? 'font-bold text-primary' : ''
                  }`}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
