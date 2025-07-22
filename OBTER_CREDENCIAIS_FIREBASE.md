# Como obter as credenciais do Firebase

Este guia mostra como obter as credenciais necessárias para migrar dados do Supabase para o Firebase.

## 1. Obter credenciais do Firebase

### Passo 1: Acesse o Firebase Console
1. Vá para [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Faça login com sua conta Google
3. Selecione o projeto "mvsatimportado"

### Passo 2: Acesse as configurações do projeto
1. Clique no ícone de engrenagem ⚙️ (canto superior esquerdo)
2. Selecione "Configurações do projeto"

### Passo 3: Gere uma nova chave privada
1. Clique na aba "Contas de serviço"
2. Certifique-se de que "Firebase Admin SDK" esteja selecionado
3. Clique no botão "Gerar nova chave privada"
4. Confirme clicando em "Gerar chave"
5. Um arquivo JSON será baixado automaticamente

### Passo 4: Salve o arquivo de credenciais
1. Renomeie o arquivo baixado para `service-account.json`
2. Mova o arquivo para a raiz do seu projeto (C:\Users\MV\Documents\MV SAT)

## 2. Obter credenciais do Supabase

### Passo 1: Acesse o Dashboard do Supabase
1. Vá para [https://app.supabase.io/](https://app.supabase.io/)
2. Faça login com sua conta
3. Selecione seu projeto

### Passo 2: Obtenha a URL e a chave
1. Clique em "Configurações" (canto inferior esquerdo)
2. Clique em "API"
3. Na seção "Project URL", copie a URL do projeto (exemplo: https://abcdefghijklm.supabase.co)
4. Na seção "Project API keys", copie a chave "service_role" (NÃO a anon key)

### Passo 3: Atualize o script de migração
1. Abra o arquivo `scripts/migrate-data.js`
2. Atualize as variáveis:
   ```js
   const SUPABASE_URL = 'sua-url-do-supabase';
   const SUPABASE_KEY = 'sua-chave-service-role';
   ```

## 3. Execute o script de migração

```bash
node scripts/migrate-data.js
```

Se tudo estiver configurado corretamente, o script começará a migrar os dados do Supabase para o Firebase.

## Resolução de problemas

### Erro "Failed to parse private key"
- Verifique se o arquivo `service-account.json` está na raiz do projeto
- Certifique-se de que o arquivo não foi modificado após o download
- Baixe uma nova chave privada se necessário

### Erro "Invalid URL"
- Verifique se a URL do Supabase está correta
- Certifique-se de que não há uma barra (/) no final da URL
- Exemplo correto: `https://abcdefghijklm.supabase.co`

### Erro "Invalid API key"
- Verifique se você está usando a chave "service_role" e não a "anon key"
- Gere uma nova chave se necessário 