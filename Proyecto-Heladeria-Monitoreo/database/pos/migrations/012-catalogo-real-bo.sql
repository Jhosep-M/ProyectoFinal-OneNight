-- 012: catálogo real Bolivia en Bs (precios con IVA 13% incluido).
-- Ejecutar DESPUÉS de subir las fotos al bucket 'productos'.
-- imagen_url guarda el objeto (ej. 'cono-simple.jpg'); el frontend lo
-- resuelve a la URL pública. Si aún no subiste fotos, la card muestra placeholder.
INSERT INTO public.categoria (nombre, estado) VALUES
  ('Conos', 'activo'),
  ('Sundaes y Copas', 'activo'),
  ('Batidos', 'activo'),
  ('Para llevar', 'activo')
ON CONFLICT (nombre) DO NOTHING;

UPDATE public.producto SET estado = 'inactivo' WHERE nombre ILIKE '%PRUEBA%';

WITH cats AS (SELECT id_categoria, nombre FROM public.categoria)
INSERT INTO public.producto (categoria_id, nombre, precio, stock, stock_minimo, estado, imagen_url)
SELECT c.id_categoria, v.nombre, v.precio, 100, 10, 'activo', v.img
FROM cats c JOIN (VALUES
  ('Conos', 'Cono Simple', 12.00, 'cono-simple.jpg'),
  ('Conos', 'Cono Doble', 18.00, 'cono-doble.jpg'),
  ('Conos', 'Cono Triple', 25.00, 'cono-triple.jpg'),
  ('Sundaes y Copas', 'Sundae Clásico', 22.00, 'sundae.jpg'),
  ('Sundaes y Copas', 'Banana Split', 30.00, 'banana-split.jpg'),
  ('Batidos', 'Milkshake', 20.00, 'milkshake.jpg'),
  ('Conos', 'Picolé', 8.00, 'picole.jpg'),
  ('Para llevar', 'Familiar 1 Litro', 60.00, 'familiar-1l.jpg')
) AS v(cat, nombre, precio, img) ON c.nombre = v.cat
ON CONFLICT DO NOTHING;
