CREATE TABLE public.feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    email text,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.feedback TO anon;
GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can view feedback" ON public.feedback FOR SELECT TO authenticated USING (true);