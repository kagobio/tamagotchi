// Lo que se compra con estrellas: sombreros, collares, decoración y el color de la cesta.
export const KINDS = [
  { id: "hat", name: "Sombreros" },
  { id: "collar", name: "Collares" },
  { id: "decor", name: "Decoración" },
  { id: "basket", name: "Cesta" },
];

export const ITEMS = [
  { id: "gorro", kind: "hat", name: "Gorro de lana", price: 15 },
  { id: "flor", kind: "hat", name: "Flor", price: 25 },
  { id: "copa", kind: "hat", name: "Sombrero de copa", price: 40 },
  { id: "vaquero", kind: "hat", name: "Sombrero vaquero", price: 50 },
  { id: "corona", kind: "hat", name: "Corona", price: 80 },
  { id: "cascabel", kind: "collar", name: "Cascabel", price: 10 },
  { id: "lazo", kind: "collar", name: "Lazo rojo", price: 20 },
  { id: "medalla", kind: "collar", name: "Medalla", price: 35 },
  { id: "bufanda", kind: "collar", name: "Bufanda", price: 45 },
  { id: "ovillo", kind: "decor", name: "Ovillo", price: 12 },
  { id: "planta", kind: "decor", name: "Planta", price: 20 },
  { id: "lampara", kind: "decor", name: "Lamparita", price: 30 },
  { id: "alfombra", kind: "decor", name: "Alfombra", price: 35 },
  { id: "pecera", kind: "decor", name: "Pecera", price: 60 },
  { id: "natural", kind: "basket", name: "Cesta natural", price: 0 },
  { id: "rosa", kind: "basket", name: "Cesta rosa", price: 30 },
  { id: "azul", kind: "basket", name: "Cesta azul", price: 30 },
  { id: "verde", kind: "basket", name: "Cesta verde", price: 30 },
];

export const itemById = (id) => ITEMS.find((item) => item.id === id);
export const itemsOf = (kind) => ITEMS.filter((item) => item.kind === kind);
