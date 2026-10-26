const fs = require('fs');

let content = fs.readFileSync('src/components/QuoteChart.tsx', 'utf8');
content = content.replace(/const formatDate = \(dateStr: any\) => \{\n    if \(!dateStr\) return '';\n    return new Intl\.DateTimeFormat\('pt-BR', \{ \n      day: 'numeric', \n      month: 'short', \n      year: 'numeric' \n    \}\)\.format\(new Date\(dateStr\)\)\n  \}\)\.format\(new Date\(dateStr\)\)\n  \}/g, `const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }).format(new Date(dateStr));
  }`);
fs.writeFileSync('src/components/QuoteChart.tsx', content);

let content2 = fs.readFileSync('src/components/Base100Comparator.tsx', 'utf8');
content2 = content2.replace(/const formatDate = \(dateStr: any\) => \{\n    if \(!dateStr\) return '';\n    return new Intl\.DateTimeFormat\('pt-BR', \{ \n      day: 'numeric', \n      month: 'short', \n      year: 'numeric' \n    \}\)\.format\(new Date\(dateStr\)\)\n  \}\)\.format\(new Date\(dateStr\)\)\n  \}/g, `const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }).format(new Date(dateStr));
  }`);
fs.writeFileSync('src/components/Base100Comparator.tsx', content2);
