import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

interface KeyboardShortcutsProps {
  onCompare: () => void;
  onAdd: () => void;
  onThemeToggle: () => void;
}

export default function KeyboardShortcuts({ onCompare, onAdd, onThemeToggle }: KeyboardShortcutsProps) {
  const [showHelper, setShowHelper] = useState(false);
  const dialogRef = useDialog(() => setShowHelper(false), showHelper);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if inside an input
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[role="dialog"]') || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;

      switch(e.key.toLowerCase()) {
        case '?':
          setShowHelper(prev => !prev);
          break;
        case 'c':
          onCompare();
          break;
        case 'a':
          onAdd();
          break;
        case 't':
          onThemeToggle();
          break;
        case 'escape':
          setShowHelper(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCompare, onAdd, onThemeToggle]);

  return (
    <>
      <button 
        onClick={() => setShowHelper(true)}
        aria-label="Abrir atalhos de teclado"
        aria-haspopup="dialog"
        className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary"
        title="Atalhos de Teclado (?)"
      >
        <Keyboard size={20} />
      </button>

      {showHelper && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className="bg-bg-secondary w-full max-w-md rounded-2xl shadow-2xl border border-border-subtle p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 id="shortcuts-title" className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Keyboard size={24} />
                Atalhos de Teclado
              </h2>
              <button aria-label="Fechar atalhos de teclado" onClick={() => setShowHelper(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Adicionar Ativo</span>
                <kbd className="bg-bg-primary border border-border-subtle px-2 py-1 rounded text-sm font-mono text-text-primary">A</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Comparador Base 100</span>
                <kbd className="bg-bg-primary border border-border-subtle px-2 py-1 rounded text-sm font-mono text-text-primary">C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Alternar Tema Escuro/Claro</span>
                <kbd className="bg-bg-primary border border-border-subtle px-2 py-1 rounded text-sm font-mono text-text-primary">T</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Mostrar esta ajuda</span>
                <kbd className="bg-bg-primary border border-border-subtle px-2 py-1 rounded text-sm font-mono text-text-primary">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
