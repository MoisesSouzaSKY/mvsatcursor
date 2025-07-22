import { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, functions } from '@/integrations/firebase/config';
import { httpsCallable } from 'firebase/functions';

interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
  type: 'employee';
  ownerId: string;
  login?: string;
  password?: string;
  lastUpdated?: string;
}

interface AuthContextType {
  user: User | null;
  employee: EmployeeUser | null;
  loading: boolean;
  isEmployee: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInEmployee: (login: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (module: string, permission: string) => boolean;
  revalidatePermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedEmployee = localStorage.getItem('employee_session');
    if (storedEmployee) {
      try {
        const employeeData = JSON.parse(storedEmployee);
        setEmployee(employeeData);
        console.log('Employee loaded from localStorage:', employeeData);
        // Não tentar revalidar automaticamente pois a senha não está disponível no localStorage por segurança
      } catch (error) {
        localStorage.removeItem('employee_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state change:', firebaseUser?.email || 'no user');
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const revalidateEmployeePermissions = async (employeeData: any) => {
    try {
      // Verificação extra para evitar chamadas com login/senha vazios
      if (!employeeData.login || !employeeData.password) {
        console.warn('⚠️ Dados de login ou senha ausentes na revalidação. Dados disponíveis:', Object.keys(employeeData));
        console.warn('⚠️ Employee data completo:', employeeData);
        return;
      }

      const validateEmployee = httpsCallable(functions, 'validateEmployeeLogin');
      const result = await validateEmployee({
        login: employeeData.login,
        password: employeeData.password,
      });

      const data = result.data as any;

      if (data?.success) {
        const updatedEmployee = {
          ...employeeData,
          permissions: data.employee.permissions || [],
          isAdmin: data.employee.isAdmin,
          lastUpdated: new Date().toISOString(),
        };
        setEmployee(updatedEmployee);

        // Salvar no localStorage (sem a senha!)
        const employeeForStorage = { ...updatedEmployee };
        delete employeeForStorage.password;
        localStorage.setItem('employee_session', JSON.stringify(employeeForStorage));
        console.log('✅ Permissões revalidadas com sucesso.');
      } else {
        console.warn('❌ Falha ao revalidar permissões:', data?.error);
        setEmployee(employeeData); // manter os dados existentes
      }
    } catch (error) {
      console.error('❌ Erro na revalidação de permissões:', error);
      setEmployee(employeeData);
    }
  };

  const signInUser = async (email: string, password: string) => {
    setEmployee(null);
    localStorage.removeItem('employee_session');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signInEmployee = async (login: string, password: string) => {
    try {
      console.log('🔄 [AuthContext] signInEmployee chamado:', {
        login: login || 'VAZIO',
        password: password || 'VAZIO',
        passwordLength: password?.length || 0
      });

      if (!login || !password) {
        console.error('❌ [AuthContext] Login ou senha vazios:', { login: !!login, password: !!password });
        return { error: 'Login e senha são obrigatórios' };
      }

      if (user) {
        await signOut(auth);
      }
      setUser(null);

      console.log('🔄 [AuthContext] Enviando para validateEmployeeLogin:', { login, passwordMasked: '***' });

      const validateEmployee = httpsCallable(functions, 'validateEmployeeLogin');
      const result = await validateEmployee({
        login,
        password,
      });

      const data = result.data as any;

      if (!data || !data.success) {
        return { error: data?.error || 'Login ou senha incorretos' };
      }

      const employeeData = data.employee;

      const employee = {
        id: employeeData.id,
        name: employeeData.name,
        email: employeeData.email || '',
        isAdmin: employeeData.isAdmin,
        permissions: employeeData.permissions || [],
        type: 'employee' as const,
        ownerId: employeeData.ownerId,
        login: login,
        password: password,
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ [AuthContext] Funcionário logado com sucesso:', employee);
      setEmployee(employee);

      const employeeForStorage = { ...employee };
      delete employeeForStorage.password;
      localStorage.setItem('employee_session', JSON.stringify(employeeForStorage));

      return { error: null };
    } catch (error) {
      console.error('❌ [AuthContext] Erro no login de funcionário:', error);
      return { error: 'Erro de conexão. Tente novamente.' };
    }
  };

  const signOutUser = async () => {
    if (employee) {
      setEmployee(null);
      localStorage.removeItem('employee_session');
    }

    if (user) {
      await signOut(auth);
    }

    setUser(null);
    setEmployee(null);
    localStorage.removeItem('employee_session');
  };

  const hasPermission = (module: string, permission: string) => {
    if (!employee) return false;
    if (employee.isAdmin) return true;

    const permissionKey = `${module}:${permission}`;
    return employee.permissions.includes(permissionKey);
  };

  const revalidatePermissions = async () => {
    if (!employee || !employee.login) return;

    try {
      const validateEmployee = httpsCallable(functions, 'validateEmployeeLogin');
      const result = await validateEmployee({
        login: employee.login,
        password: employee.password || '',
      });

      const data = result.data as any;

      if (data?.success) {
        const updatedEmployee = {
          ...employee,
          permissions: data.employee.permissions || [],
          isAdmin: data.employee.isAdmin,
          lastUpdated: new Date().toISOString()
        };
        setEmployee(updatedEmployee);

        const employeeForStorage = { ...updatedEmployee };
        delete employeeForStorage.password;
        localStorage.setItem('employee_session', JSON.stringify(employeeForStorage));

        console.log('Permissões revalidadas com sucesso:', updatedEmployee.permissions);
      }
    } catch (error) {
      console.error('Erro ao revalidar permissões:', error);
    }
  };

  const value = {
    user,
    employee,
    loading,
    isEmployee: !!employee,
    signIn: signInUser,
    signInEmployee,
    signOut: signOutUser,
    hasPermission,
    revalidatePermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};







