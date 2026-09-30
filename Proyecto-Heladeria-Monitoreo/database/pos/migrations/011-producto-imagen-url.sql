-- 011: foto de producto (bucket Storage 'productos' + columna imagen_url).
-- La URL completa se resuelve en frontend (utils/productoImagen.js).
-- Si es http(s) se usa tal cual; si es 'cono-simple.jpg' se resuelve a
-- /storage/v1/object/public/productos/<archivo>.
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS imagen_url TEXT NULL;

-- Bucket público para fotos (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "productos lectura publica" ON storage.objects;
CREATE POLICY "productos lectura publica" ON storage.objects
FOR SELECT USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos subida autenticados" ON storage.objects;
CREATE POLICY "productos subida autenticados" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'productos');

DROP POLICY IF EXISTS "productos update autenticados" ON storage.objects;
CREATE POLICY "productos update autenticados" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'productos');
