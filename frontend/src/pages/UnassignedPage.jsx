import { Button, Typography } from 'antd'
import { useAuth } from '../context/AuthContext'

const { Title, Paragraph } = Typography

export default function UnassignedPage() {
  const { logout, user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 text-white text-center" style={{ backgroundColor: '#962c30' }}>
          <img src="/nssf-logo.png" alt="NSSF Logo" className="mx-auto mb-3 h-20 w-auto rounded-lg" />
          <h1 className="text-2xl font-bold tracking-wide">National Social Security Fund</h1>
          <p className="text-xs mt-1 uppercase tracking-widest font-bold" style={{ color: '#ffc20a' }}>
            Project Management System
          </p>
        </div>
        <div className="p-8 space-y-4 text-center">
          <Title level={4} style={{ color: '#650018', marginBottom: 0 }}>
            No role assigned
          </Title>
          <Paragraph type="secondary">
            {user?.email || 'This account'} does not have a role yet. Contact ICT Support so they can assign one
            from User Management.
          </Paragraph>
          <Button type="primary" onClick={logout} block>
            Sign out
          </Button>
        </div>
        <div className="h-2 w-full" style={{ backgroundColor: '#ffc20a' }} />
      </div>
    </div>
  )
}
