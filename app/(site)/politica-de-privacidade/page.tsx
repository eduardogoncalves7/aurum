import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Aurum Detailing",
  description: "Como a Aurum Detailing utiliza os dados informados em pedidos de orçamento e agendamento.",
};

const sections = [
  {
    title: "Quais dados são usados",
    content: "Quando você pede um orçamento ou agendamento, usamos seu nome e WhatsApp, o tipo e os detalhes do veículo informados, os serviços escolhidos e o valor estimado. Se você agenda, também usamos a data, o horário e a forma de entrega escolhidos.",
  },
  {
    title: "Para que usamos esses dados",
    content: "Esses dados são usados para preparar e responder ao orçamento, combinar e administrar o agendamento e o serviço solicitado, e permitir que você consulte seu histórico neste navegador. O nome e o WhatsApp podem ficar salvos no navegador para facilitar um próximo pedido.",
  },
  {
    title: "Onde os dados são enviados",
    content: "Os pedidos de orçamento e agendamento são registrados no sistema da Aurum para atendimento e gestão interna. Se você escolher enviar o orçamento ou iniciar uma conversa, os dados incluídos na mensagem serão encaminhados ao WhatsApp da Aurum. A Aurum não envia essa mensagem sem sua ação.",
  },
  {
    title: "Armazenamento e exclusão",
    content: "Mantemos os registros pelo tempo necessário para atender ao pedido, administrar o serviço e cumprir obrigações aplicáveis. Você pode solicitar acesso, correção ou exclusão pelo WhatsApp indicado no rodapé. Alguns registros podem precisar ser mantidos quando houver obrigação legal ou outra justificativa aplicável.",
  },
  {
    title: "Seus direitos e contato",
    content: "Você pode solicitar confirmação do uso dos dados, acesso, correção e, quando aplicável, anonimização ou exclusão. Para fazer uma solicitação ou tirar dúvidas sobre estes dados, fale com a Aurum pelo WhatsApp disponível no rodapé do site. Podemos pedir informações para confirmar que o pedido se refere aos seus dados.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Aurum Detailing</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
        Política de Privacidade
      </h1>
      <p className="mt-3 text-sm text-muted">Dados informados em pedidos de orçamento e agendamento.</p>
      <p className="mt-1 text-xs text-muted-dark">Atualizada em 12/10/2026.</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-muted">
        <p>
          A Aurum Detailing (CNPJ 51.455.279/0001-39) utiliza somente os dados que você informa neste fluxo para atender ao orçamento ou serviço solicitado, nos termos abaixo.
        </p>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-base font-bold text-foreground">{section.title}</h2>
            <p className="mt-2">{section.content}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
