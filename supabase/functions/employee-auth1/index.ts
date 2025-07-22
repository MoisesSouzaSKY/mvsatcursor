import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      'https://egshoetebauoxyeklfqi.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log('🔄 [employee-auth] Body recebido:', {
      login: requestBody.login || 'VAZIO',
      password: requestBody.password ? '***' : 'VAZIO',
      passwordLength: requestBody.password?.length || 0,
      bodyKeys: Object.keys(requestBody || {})
    })

    const { login, password } = requestBody

    if (!login || !password) {
      console.error('❌ [employee-auth] Campos obrigatórios vazios:', { 
        hasLogin: !!login, 
        hasPassword: !!password,
        loginValue: login,
        passwordValue: password ? '***' : 'VAZIO'
      })
      return new Response(
        JSON.stringify({ error: 'Login e senha são obrigatórios' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Configurar o contexto do funcionário para as políticas RLS
    try {
      await supabase.rpc('set_employee_context', {
        employee_login: login
      });
      console.log('✅ [employee-auth] Contexto do funcionário configurado para RLS');
    } catch (configError) {
      console.warn('⚠️ [employee-auth] Erro ao configurar contexto:', configError);
    }

    // Validar login do funcionário
    const { data: employeeData, error: employeeError } = await supabase
      .rpc('validate_employee_login', {
        login_input: login,
        password_input: password
      })

    if (employeeError) {
      console.error('Erro ao validar funcionário:', employeeError)
      return new Response(
        JSON.stringify({ error: 'Erro interno do servidor' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    if (!employeeData || employeeData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Login ou senha inválidos' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    const employee = employeeData[0]

    // Retornar dados do funcionário autenticado
    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          id: employee.employee_id,
          name: employee.employee_name,
          email: employee.employee_email,
          isAdmin: employee.is_admin,
          permissions: employee.permissions || [],
          type: 'employee',
          ownerId: employee.owner_id
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro na edge function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})