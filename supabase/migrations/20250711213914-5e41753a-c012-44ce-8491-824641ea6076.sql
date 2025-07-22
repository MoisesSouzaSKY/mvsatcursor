-- Adicionar trigger para definir user_id automaticamente na tabela tvbox_assinaturas
CREATE TRIGGER set_user_id_tvbox_assinaturas
    BEFORE INSERT ON public.tvbox_assinaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_id_client();

-- Adicionar trigger para definir user_id automaticamente na tabela tvbox_equipamentos  
CREATE TRIGGER set_user_id_tvbox_equipamentos
    BEFORE INSERT ON public.tvbox_equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_id_client();

-- Adicionar trigger para definir user_id automaticamente na tabela tvbox_pagamentos
CREATE TRIGGER set_user_id_tvbox_pagamentos
    BEFORE INSERT ON public.tvbox_pagamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_id_client();