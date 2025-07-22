-- Add policy to allow users to manage permissions for their own employees
CREATE POLICY "Users can manage permissions for their own employees" 
ON public.funcionario_permissoes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);