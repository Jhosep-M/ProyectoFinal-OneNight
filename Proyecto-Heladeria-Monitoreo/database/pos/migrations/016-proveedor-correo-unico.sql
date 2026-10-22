UPDATE public.proveedor
SET correo = lower(trim(correo))
WHERE correo IS NOT NULL
  AND correo <> lower(trim(correo));

DELETE FROM public.proveedor
WHERE lower(trim(correo)) = 'chipilo@gmail.com'
  AND nit IN ('10', '7854976');

WITH duplicados AS (
  SELECT lower(trim(correo)) AS correo_norm
  FROM public.proveedor
  WHERE correo IS NOT NULL AND trim(correo) <> ''
  GROUP BY 1
  HAVING count(*) > 1
)
UPDATE public.proveedor p
SET correo = NULL
FROM duplicados d
WHERE lower(trim(p.correo)) = d.correo_norm;

UPDATE public.proveedor
SET correo = NULL
WHERE correo IS NOT NULL AND trim(correo) = '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedor_correo_lower
  ON public.proveedor (lower(correo))
  WHERE correo IS NOT NULL;
