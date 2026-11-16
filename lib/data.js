// Carga de datos externos con SharedArray.
// SharedArray lee y parsea el archivo UNA sola vez y comparte la misma copia
// (solo lectura) entre todos los VUs, en lugar de que cada VU tenga la suya.
import { SharedArray } from 'k6/data';

// Parser CSV simple (separador ";"). Sin dependencias externas.
function parseCsv(texto) {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const cabecera = lineas[0].split(';');
  return lineas.slice(1).map((linea, i) => {
    const valores = linea.split(';');
    if (valores.length !== cabecera.length) {
      throw new Error(`CSV: la fila ${i + 2} tiene ${valores.length} columnas, se esperaban ${cabecera.length}`);
    }
    const fila = {};
    cabecera.forEach((col, idx) => (fila[col] = valores[idx]));
    return fila;
  });
}

// Las rutas son relativas a este archivo y también a /scenarios, porque ambas
// carpetas están al mismo nivel; así funciona en cualquier versión de k6.
export const usuarios = new SharedArray('usuarios', () => {
  const filas = parseCsv(open('../data/usuarios.csv'));
  if (filas.length === 0) throw new Error('usuarios.csv está vacío');
  return filas;
});

export const restricciones = new SharedArray('restricciones', () => {
  const filas = parseCsv(open('../data/restricciones.csv')).map((f) => ({
    perfil: f.perfil,
    maxCaloriesPerSlice: Number(f.maxCaloriesPerSlice),
    mustBeVegetarian: f.mustBeVegetarian === 'true',
    excludedIngredients: f.excludedIngredients ? f.excludedIngredients.split('|') : [],
    excludedTools: f.excludedTools ? f.excludedTools.split('|') : [],
    minNumberOfToppings: Number(f.minNumberOfToppings),
    maxNumberOfToppings: Number(f.maxNumberOfToppings),
    stars: Number(f.stars),
    pizzaCalificar: Number(f.pizzaCalificar),
  }));
  if (filas.length === 0) throw new Error('restricciones.csv está vacío');
  return filas;
});

// Cada VU usa siempre el mismo usuario (VU 1 → fila 1, VU 2 → fila 2, ...).
export function usuarioDelVU(vu) {
  return usuarios[(vu - 1) % usuarios.length];
}

// Las restricciones rotan en cada iteración para variar los datos enviados.
export function restriccionPara(iteracion) {
  return restricciones[iteracion % restricciones.length];
}
