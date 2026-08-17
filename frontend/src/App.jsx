import Sidebar from './components/layout/Sidebar'
import ImplementationPlanPage from './pages/ImplementationPlanPage'

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-background p-6 lg:p-8">
        <ImplementationPlanPage />
      </main>
    </div>
  )
}

export default App
