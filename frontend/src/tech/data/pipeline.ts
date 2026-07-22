export interface PipelineStage {
  id: string;
  index: string;
  name: string;
  description: string;
  statusLine: string;
}

/** Compilation stages act directly on the persistent product, not only on a progress indicator. */
export const TECH_PIPELINE: PipelineStage[] = [
  { id: 'estrutura', index: '01', name: 'VALIDANDO ESTRUTURA', description: 'Guias percorrem a interface, identificam regiões incompletas e corrigem o alinhamento final.', statusLine: 'VALIDANDO ESTRUTURA...' },
  { id: 'componentes', index: '02', name: 'VERIFICANDO COMPONENTES', description: 'Cada módulo instalado responde ao teste e confirma suas dependências.', statusLine: 'VERIFICANDO COMPONENTES...' },
  { id: 'dados', index: '03', name: 'CONECTANDO DADOS', description: 'Interface, API, serviços e banco ativam suas rotas de comunicação.', statusLine: 'CONECTANDO DADOS...' },
  { id: 'interacoes', index: '04', name: 'TESTANDO INTERAÇÕES', description: 'Navegação, filtros, formulários e ações executam testes automatizados.', statusLine: 'TESTANDO INTERAÇÕES...' },
  { id: 'otimizacao', index: '05', name: 'OTIMIZANDO INTERFACE', description: 'Espaçamento, densidade e adaptação por dispositivo recebem o ajuste final.', statusLine: 'OTIMIZANDO INTERFACE...' },
  { id: 'build', index: '06', name: 'GERANDO BUILD', description: 'Componentes e dados são organizados em um pacote de produção verificável.', statusLine: 'GERANDO BUILD...' },
  { id: 'deploy', index: '07', name: 'PREPARANDO DEPLOY', description: 'O produto retorna à forma completa e recebe sua rota para o ambiente de produção.', statusLine: 'PREPARANDO DEPLOY...' },
];
