## MV SAT Multiempresa (SaaS) no Firebase — Como usar

### Links de deploy
- **Preview (seguro, não altera o site principal)**: `https://mvsat-428a2--multitenant-preview-eyc5hhiy.web.app`
- **Produção (site principal, já existia)**: `https://mvsat-428a2.web.app`

> Observação: o preview expira automaticamente em 7 dias. Dá para redeployar quando quiser.

---

## 1) Estrutura de dados (Firestore)

### Coleções principais

#### `empresas/{empresaId}`
Campos esperados (exemplo):
```js
{
  nomeEmpresa,
  responsavel,
  email,
  telefone,
  plano,
  status,
  criadoEm,
  limiteClientes,
  limiteFuncionarios,
  limiteEquipamentos,
  ativo
}
```

#### Subcoleções por empresa (sempre isoladas)
- `empresas/{empresaId}/clientes`
- `empresas/{empresaId}/assinaturas`
- `empresas/{empresaId}/equipamentos`
- `empresas/{empresaId}/cobrancas`
- `empresas/{empresaId}/cobrancas_arquivadas` (histórico)
- `empresas/{empresaId}/despesas`
- `empresas/{empresaId}/tvbox`
- `empresas/{empresaId}/tvbox_assinaturas`
- `empresas/{empresaId}/funcionarios`
- `empresas/{empresaId}/roles`
- `empresas/{empresaId}/employee_permissions`
- `empresas/{empresaId}/audit_logs`
- `empresas/{empresaId}/config` (ex.: `creditos_tvbox`)

### Usuários (mapeia Auth → tenant)
#### `usuarios/{uid}`
```js
{
  nome,
  email,
  empresaId,
  tipo,      // admin | gerente | funcionario
  ativo,
  criadoEm
}
```

---

## 2) Fluxo de login (o que acontece ao entrar)
1. Usuário faz login no **Firebase Authentication**
2. O app lê `usuarios/{uid}`
3. Pega `empresaId` e `tipo`
4. Salva em sessão local (`localStorage`)
5. Todas as consultas passam a usar **apenas** `empresas/{empresaId}/...`

Se `usuarios/{uid}` não existir, se `empresaId` estiver vazio, ou `ativo=false`, o app **nega o acesso** e volta para o login.

---

## 3) Como cadastrar uma empresa e o primeiro usuário (admin)

### 3.1 Criar usuário no Firebase Authentication
No Console do Firebase:
- Authentication → Users → Add user
- Use o e-mail/senha do admin

### 3.2 Criar empresa + vincular usuário (script seguro)

Pré-requisito: ter um **service account JSON** no seu PC.

No PowerShell:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT="C:\caminho\serviceAccount.json"
node scripts/saas-bootstrap.cjs --empresaId="empresa01" --nomeEmpresa="MV SAT (Empresa 01)" --email="admin@exemplo.com" --tipo="admin"
```

Isso cria/atualiza:
- `empresas/empresa01`
- `usuarios/{uidDoAuth}` com `empresaId=empresa01`

---

## 4) Migração dos dados atuais (sem apagar nada)

Se seus dados hoje estão em coleções globais (`clientes`, `equipamentos`, etc.), o app multiempresa vai buscar em `empresas/{empresaId}/...`.

Para **copiar** (sem deletar) os dados globais para dentro de uma empresa:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT="C:\caminho\serviceAccount.json"
node scripts/saas-bootstrap.cjs --empresaId="empresa01" --nomeEmpresa="MV SAT (Empresa 01)" --email="admin@exemplo.com" --tipo="admin" --migrarDados
```

Modo simulação (não grava nada, só mostra o que faria):
```powershell
node scripts/saas-bootstrap.cjs --empresaId="empresa01" --nomeEmpresa="MV SAT (Empresa 01)" --email="admin@exemplo.com" --tipo="admin" --migrarDados --dryRun
```

---

## 5) Regras de segurança (Firestore Rules)
- Usuário só acessa dados de `empresas/{empresaId}` quando `usuarios/{uid}.empresaId == empresaId`
- Apenas autenticado
- `tipo` controla permissões (admin/gerente/funcionario)

Há compatibilidade temporária para coleções legadas, para evitar quebra durante transição.

---

## 6) Storage (uploads)
- Novos uploads de documentos de cliente passam a ir para:
  - `empresas/{empresaId}/documentos_clientes/...`

---

## 7) Deploy

### Preview (recomendado para validar)
```bash
npm run build
firebase hosting:channel:deploy multitenant-preview --expires 7d
```

### Produção (quando validar)
```bash
npm run build
firebase deploy --only hosting
```

