import Productos, { Categorias } from '../pages/catalogo/Productos.jsx';
import Inventario from '../pages/catalogo/Inventario.jsx';
import Proveedores from '../pages/catalogo/Proveedores.jsx';
import RecetasPage from '../pages/catalogo/RecetasPage.jsx';
import { Clientes, Promociones } from '../pages/catalogo/RecetasClientesPromos.jsx';

const Recetas = RecetasPage;

// Rutas P2 (carpeta catalogo/). P1 usa carpeta ventas/.
// Para montar: importar este arreglo en AppRoutes.jsx sin tocar rutas de ventas.
// P1 coordina el merge (anti-choque: no editar archivos del otro bloque).
export const catalogoRoutes = [
  { path: '/catalogo/productos', element: <Productos /> },
  { path: '/catalogo/categorias', element: <Categorias /> },
  { path: '/catalogo/inventario', element: <Inventario /> },
  { path: '/catalogo/proveedores', element: <Proveedores /> },
  { path: '/catalogo/recetas', element: <Recetas /> },
  { path: '/catalogo/clientes', element: <Clientes /> },
  { path: '/catalogo/promociones', element: <Promociones /> },
];
