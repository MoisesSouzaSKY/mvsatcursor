-- Schema para Sistema de Funcionários com RBAC
-- Execute este script para criar as tabelas necessárias

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role_id UUID REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked', 'pending_invite')),
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  backup_codes TEXT[], -- Array de códigos de backup para 2FA
  last_access TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de perfis/roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de permissões por perfil
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, module, action)
);

-- Tabela de overrides de permissões por funcionário
CREATE TABLE IF NOT EXISTS employee_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, module, action)
);

-- Tabela de sessões ativas
CREATE TABLE IF NOT EXISTS employee_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Tabela de janelas de acesso (horários permitidos)
CREATE TABLE IF NOT EXISTS access_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  actor_id UUID REFERENCES employees(id),
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  details TEXT,
  diff_before JSONB,
  diff_after JSONB,
  ip_address INET,
  user_agent TEXT,
  is_critical BOOLEAN DEFAULT false
);

-- Tabela de tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_sessions_employee ON employee_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON employee_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON employee_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir perfis padrão
INSERT INTO roles (name, description, is_default) VALUES
('Admin', 'Acesso total ao sistema', true),
('Gestor', 'Acesso a quase tudo, exceto configurações de sistema', true),
('Financeiro', 'Acesso apenas a módulos financeiros', true),
('Atendimento', 'Acesso a clientes e serviços', true),
('Manutenção/Estoque', 'Acesso a manutenções e equipamentos', true),
('Leitor', 'Apenas visualização em todos os módulos', true)
ON CONFLICT (name) DO NOTHING;

-- Inserir permissões padrão para cada perfil
-- Admin - Acesso total
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, a.action, true
FROM roles r
CROSS JOIN (VALUES 
  ('clientes'), ('assinaturas'), ('equipamentos'), ('cobrancas'),
  ('despesas'), ('tvbox'), ('locacoes'), ('motos'), ('manutencoes'),
  ('multas'), ('contratos'), ('funcionarios'), ('dashboard')
) m(module)
CROSS JOIN (VALUES 
  ('view'), ('create'), ('update'), ('delete'), ('export'), ('approve'), ('manage_settings')
) a(action)
WHERE r.name = 'Admin'
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Gestor - Quase tudo exceto manage_settings em funcionarios
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, a.action, 
  CASE WHEN m.module = 'funcionarios' AND a.action = 'manage_settings' THEN false ELSE true END
FROM roles r
CROSS JOIN (VALUES 
  ('clientes'), ('assinaturas'), ('equipamentos'), ('cobrancas'),
  ('despesas'), ('tvbox'), ('locacoes'), ('motos'), ('manutencoes'),
  ('multas'), ('contratos'), ('funcionarios'), ('dashboard')
) m(module)
CROSS JOIN (VALUES 
  ('view'), ('create'), ('update'), ('delete'), ('export'), ('approve'), ('manage_settings')
) a(action)
WHERE r.name = 'Gestor'
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Financeiro - Apenas módulos financeiros
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, a.action, true
FROM roles r
CROSS JOIN (VALUES ('cobrancas'), ('despesas'), ('dashboard')) m(module)
CROSS JOIN (VALUES ('view'), ('create'), ('update'), ('delete'), ('export'), ('approve')) a(action)
WHERE r.name = 'Financeiro'
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Atendimento - Clientes, assinaturas e TV Box
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, a.action, true
FROM roles r
CROSS JOIN (VALUES ('clientes'), ('assinaturas'), ('tvbox'), ('dashboard')) m(module)
CROSS JOIN (VALUES ('view'), ('create'), ('update'), ('delete'), ('export')) a(action)
WHERE r.name = 'Atendimento'
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Manutenção/Estoque - Manutenções e equipamentos
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, a.action, true
FROM roles r
CROSS JOIN (VALUES ('manutencoes'), ('equipamentos'), ('dashboard')) m(module)
CROSS JOIN (VALUES ('view'), ('create'), ('update'), ('delete'), ('export')) a(action)
WHERE r.name = 'Manutenção/Estoque'
ON CONFLICT (role_id, module, action) DO NOTHING;

-- Leitor - Apenas visualização
INSERT INTO role_permissions (role_id, module, action, granted)
SELECT r.id, m.module, 'view', true
FROM roles r
CROSS JOIN (VALUES 
  ('clientes'), ('assinaturas'), ('equipamentos'), ('cobrancas'),
  ('despesas'), ('tvbox'), ('locacoes'), ('motos'), ('manutencoes'),
  ('multas'), ('contratos'), ('dashboard')
) m(module)
WHERE r.name = 'Leitor'
ON CONFLICT (role_id, module, action) DO NOTHING;