CREATE TABLE IF NOT EXISTS public.sales_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text,
  location text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales persons"
  ON public.sales_persons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view sales persons"
  ON public.sales_persons FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sales_persons_created_at ON public.sales_persons (created_at DESC);
