# Requirements Document

## Introduction

Este documento especifica os requisitos para corrigir dois problemas críticos no sistema de cobranças: o ajuste automático de dias de vencimento e a funcionalidade dos botões de editar e pagar cobranças.

## Glossary

- **Sistema de Cobranças**: O módulo responsável por gerenciar cobranças de clientes
- **Data de Vencimento**: A data em que uma cobrança deve ser paga
- **Ajuste de Dias**: Processo automático que incrementa dias específicos de vencimento
- **Botões de Ação**: Controles de interface para editar e pagar cobranças
- **Modal de Edição**: Interface para modificar dados de uma cobrança
- **Modal de Pagamento**: Interface para registrar o pagamento de uma cobrança

## Requirements

### Requirement 1

**User Story:** Como administrador do sistema, eu quero que os dias de vencimento sejam automaticamente ajustados conforme regras específicas, para que as cobranças sigam o padrão correto de datas.

#### Acceptance Criteria

1. WHEN o sistema processa uma data de vencimento com dia 4 THEN o sistema SHALL alterar automaticamente para dia 5
2. WHEN o sistema processa uma data de vencimento com dia 29 THEN o sistema SHALL alterar automaticamente para dia 30  
3. WHEN o sistema processa uma data de vencimento com dia 9 THEN o sistema SHALL alterar automaticamente para dia 10
4. WHEN o sistema processa uma data de vencimento com dia 14 THEN o sistema SHALL alterar automaticamente para dia 15
5. WHEN o sistema processa uma data de vencimento com dia 19 THEN o sistema SHALL alterar automaticamente para dia 20

### Requirement 2

**User Story:** Como usuário do sistema, eu quero que os botões de editar e pagar cobranças funcionem corretamente, para que eu possa gerenciar as cobranças adequadamente.

#### Acceptance Criteria

1. WHEN um usuário clica no botão "Editar" de uma cobrança THEN o sistema SHALL abrir o modal de edição com os dados da cobrança preenchidos
2. WHEN um usuário clica no botão "Pagar" de uma cobrança não paga THEN o sistema SHALL abrir o modal de pagamento
3. WHEN um usuário submete o formulário de edição THEN o sistema SHALL atualizar a cobrança e fechar o modal
4. WHEN um usuário submete o formulário de pagamento THEN o sistema SHALL marcar a cobrança como paga e fechar o modal
5. WHEN uma cobrança já está paga THEN o sistema SHALL mostrar apenas o botão "Visualizar" ao invés de "Editar"