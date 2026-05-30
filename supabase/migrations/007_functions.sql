-- Auto updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Document number generator
CREATE OR REPLACE FUNCTION public.generate_doc_number(ws_id UUID, doc_type TEXT)
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := TO_CHAR(NOW(),'YYYY');
  cnt INTEGER;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM public.%I WHERE workspace_id=$1 AND %I LIKE $2',
    CASE doc_type WHEN 'QUO' THEN 'quotations' WHEN 'DEAL' THEN 'deals' ELSE 'invoices' END,
    CASE doc_type WHEN 'QUO' THEN 'quotation_number' WHEN 'DEAL' THEN 'deal_number' ELSE 'invoice_number' END
  ) INTO cnt USING ws_id, doc_type||'-'||year_str||'-%';
  RETURN doc_type||'-'||year_str||'-'||LPAD((cnt+1)::TEXT,3,'0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
