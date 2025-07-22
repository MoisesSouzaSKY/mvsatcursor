# Migração de Dados: Supabase para Firebase

Este documento descreve o processo de migração de dados do Supabase para o Firebase.

## Pré-requisitos

1. **Credenciais do Supabase**
   - URL do projeto Supabase
   - Chave de serviço do Supabase (Service Role Key)

2. **Credenciais do Firebase**
   - Arquivo de conta de serviço do Firebase (JSON)
   - Projeto Firebase configurado com Firestore

3. **Dependências**
   - Node.js instalado
   - NPM ou Yarn instalado

## Como obter as credenciais

### Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.io/)
2. Selecione seu projeto
3. Vá para Configurações > API
4. Copie a URL do projeto (`https://[seu-projeto].supabase.co`)
5. Copie a chave de serviço (`service_role key`)

### Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para Configurações do Projeto > Contas de serviço
4. Clique em "Gerar nova chave privada"
5. Salve o arquivo JSON como `service-account.json` na raiz do projeto

## Configuração

1. **Instalar dependências**

```bash
npm install @supabase/supabase-js firebase-admin
```

2. **Configurar credenciais**

- Salve o arquivo `service-account.json` na raiz do projeto
- Edite o arquivo `scripts/migrate-data.js` e atualize as variáveis:
  - `SUPABASE_URL`: URL do seu projeto Supabase
  - `SUPABASE_KEY`: Chave de serviço do Supabase

## Executar a Migração

```bash
node scripts/migrate-data.js
```

## Estrutura de Dados

A migração preservará a estrutura dos dados, com algumas adaptações:

- **IDs**: Serão mantidos os mesmos IDs para facilitar a migração
- **Timestamps**: Serão convertidos para o formato do Firestore
- **Relacionamentos**: Serão mantidos os mesmos relacionamentos por ID

## Tabelas Migradas

- `clientes`: Informações dos clientes
- `assinaturas`: Assinaturas dos clientes
- `equipamentos`: Equipamentos cadastrados
- `cobrancas`: Cobranças geradas
- `funcionarios`: Funcionários do sistema
- `funcionario_permissoes`: Permissões dos funcionários
- `tvbox_assinaturas`: Assinaturas de TV Box
- `faturas`: Faturas geradas
- `custos_mensais`: Custos mensais registrados

## Backup

Durante a migração, todos os dados serão salvos em arquivos JSON na pasta `scripts/backup/` como medida de segurança.

## Verificação

Após a migração, verifique os dados no Firebase:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Navegue até o Firestore Database
3. Verifique se todas as coleções foram criadas
4. Compare alguns registros para garantir que os dados foram migrados corretamente

## Resolução de Problemas

Se encontrar algum erro durante a migração:

1. Verifique as credenciais do Supabase e Firebase
2. Verifique se o Firestore está habilitado no projeto Firebase
3. Verifique se as regras de segurança do Firestore permitem escrita
4. Consulte os logs de erro para identificar problemas específicos

## Próximos Passos

Após a migração dos dados:

1. Atualize as regras de segurança do Firestore
2. Configure índices para consultas frequentes
3. Atualize a aplicação para usar o Firebase em vez do Supabase
4. Teste todas as funcionalidades para garantir que estão funcionando corretamente

## Suporte

Se precisar de ajuda, entre em contato com a equipe de desenvolvimento. 