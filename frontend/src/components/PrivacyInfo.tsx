export default function PrivacyInfo() {
  return <footer className="mt-10 border-t border-border-subtle pt-6 text-sm text-text-secondary space-y-4">
    <p>FinanDash · Informações de mercado para consulta. Cotações podem estar atrasadas. Simulações são estimativas e não representam recomendação de investimento.</p>
    <details><summary className="cursor-pointer font-semibold">Privacidade e armazenamento local</summary>
      <div className="space-y-3 mt-3 max-w-3xl">
        <p>Este painel não inclui publicidade, analytics ou cookies de rastreamento. Tema e seleção de ativos são salvos no armazenamento local deste navegador até você apagar os dados do site.</p>
        <p>As consultas passam pelo servidor do FinanDash. Provedores de mercado fornecem as cotações. O link para o Telegram leva a um serviço com sua própria política de privacidade.</p>
        <p>Com o worker Telegram ativo, enviar /assinar em uma conversa privada guarda o identificador desse chat e a data do consentimento para entregar relatórios. /parar cancela a inscrição e exclui o cadastro; /dados consulta o registro. O painel não pede seu usuário Telegram.</p>
      </div>
    </details>
    <details><summary className="cursor-pointer font-semibold">Condições de uso</summary><p className="mt-3 max-w-3xl">Painel demonstrativo para acompanhamento de mercado. Não executa ordens ou movimentações financeiras. Confira valores e datas nas fontes oficiais antes de tomar decisões. Não envie senhas, documentos ou dados financeiros pelo bot.</p></details>
  </footer>
}
