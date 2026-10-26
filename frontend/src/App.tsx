import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './Dashboard'
import { useTheme } from './hooks/useTheme'
import type { Theme } from './hooks/useTheme'
import { Monitor, Moon, Sun, Bell } from 'lucide-react'
import ConnectionBanner from './components/ConnectionBanner'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import ProjectInfoModal from './components/ProjectInfoModal'
import IntroModal from './components/IntroModal'
import { useState } from 'react'
import PrivacyInfo from './components/PrivacyInfo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
})

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {

  return (
    <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-subtle" role="group" aria-label="Seleção de tema">
      <button
        onClick={() => setTheme('light')}
        aria-label="Usar tema claro"
        aria-pressed={theme === 'light'}
        className={`p-2 rounded-md transition-colors ${theme === 'light' ? 'bg-bg-primary shadow-sm text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        title="Tema Claro"
      >
        <Sun size={18} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        aria-label="Usar tema escuro"
        aria-pressed={theme === 'dark'}
        className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-bg-primary shadow-sm text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        title="Tema Escuro"
      >
        <Moon size={18} />
      </button>
      <button
        onClick={() => setTheme('system')}
        aria-label="Usar tema do sistema"
        aria-pressed={theme === 'system'}
        className={`p-2 rounded-md transition-colors ${theme === 'system' ? 'bg-bg-primary shadow-sm text-accent' : 'text-text-secondary hover:text-text-primary'}`}
        title="Padrão do Sistema"
      >
        <Monitor size={18} />
      </button>
    </div>
  )
}

function AppContent() {
  const [triggerCompare, setTriggerCompare] = useState(0)
  const [triggerAdd, setTriggerAdd] = useState(0)
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const { theme, setTheme } = useTheme()
  const cycleTheme = () => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')

  return (
    <>
    <div id="app-shell" className="min-h-screen bg-bg-primary text-text-primary font-sans pb-10">
      <ConnectionBanner />
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      
      <div className="w-full p-4 md:p-6 lg:p-8">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
              <div className="w-[62px] h-[62px] flex items-center justify-center">
                <img src="/finandash-mascot.png" alt="" aria-hidden="true" className="w-full h-full object-cover rounded-2xl" />
              </div>
              FinanDash
            </h1>
            <p className="text-text-secondary mt-1">Acompanhamento de ativos do mercado global</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">

            <button 
              aria-label="Ativar notificações do navegador"
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then(perm => {
                    if (perm === 'granted') {
                      new Notification('Alertas ativados!', { body: 'Você receberá notificações de variação de preços.' })
                    } else {
                      alert('Permissão de notificações negada.')
                    }
                  })
                }
              }}
              className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary" 
              title="Alertas (Notifications API)"
            >
              <Bell size={20} />
            </button>
            <KeyboardShortcuts 
              onCompare={() => setTriggerCompare(prev => prev + 1)}
              onAdd={() => setTriggerAdd(prev => prev + 1)}
              onThemeToggle={cycleTheme}
            />
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button onClick={() => setShowProjectInfo(true)} className="min-h-11 px-3 text-sm text-text-secondary focus-visible:outline" aria-haspopup="dialog">Sobre</button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <Dashboard keyboardTriggers={{ triggerCompare, triggerAdd }} />
        </main>
        <PrivacyInfo />
      </div>
    </div>

      {showProjectInfo && <ProjectInfoModal onClose={() => setShowProjectInfo(false)} />}
      {showIntro && <IntroModal onClose={() => setShowIntro(false)} />}
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
