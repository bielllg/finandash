const fs = require('fs');
let code = fs.readFileSync('src/Dashboard.tsx', 'utf8');

const searchStr = `        <div className="flex flex-wrap gap-3 relative w-full sm:w-auto">
          <button 
            onClick={() => setShowComparator(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-base font-medium bg-bg-secondary border border-border-subtle hover:bg-bg-primary px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <BarChart2 size={18} />
            Comparar
          </button>

              <p className="text-xs text-text-secondary mb-2 px-2">Ativos disponíveis</p>`;

const replaceStr = `        <div className="flex flex-wrap gap-3 relative w-full sm:w-auto">
          <button 
            onClick={() => setShowComparator(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-base font-medium bg-bg-secondary border border-border-subtle hover:bg-bg-primary px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <BarChart2 size={18} />
            Comparar
          </button>
          
          <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="w-full flex items-center justify-center gap-2 text-base font-medium bg-accent text-white hover:bg-accent/90 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              {isAdding ? <X size={18} /> : <Plus size={18} />}
              {isAdding ? 'Fechar' : 'Adicionar Ativo'}
            </button>
            
            {isAdding && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-bg-secondary border border-border-subtle shadow-xl rounded-lg z-10 p-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-text-secondary mb-2 px-2">Ativos disponíveis</p>`;

code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/Dashboard.tsx', code);
