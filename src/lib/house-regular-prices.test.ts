import { describe, expect, it } from "vitest";
import { HOUSE_FRUIT_CATALOG, HOUSE_INITIAL_FRUIT_REGULAR_PRICES } from "./house-fruit-catalog";
import { HOUSE_VEGETABLE_CATALOG } from "./house-vegetable-catalog";
import { HOUSE_PRODUCE_OCT18_CATALOG } from "./house-produce-oct18-catalog";
const expected = [["Aguacate Hass grande", 3.49, false], ["Aguacate Florida grande", 3.49, false], ["Guineo verde", 0.31, false], ["Manzana Gala", 1.49, true], ["Manzana Pink Lady", 1.5, false], ["Manzana Honeycrisp", 1.99, true], ["Manzana Granny Smith", 1.49, false], ["Manzana Fuji orgánica", 1.9, false], ["Limón verde", 0.59, false], ["Pera Bosc", 2.29, true], ["Pera roja", 2.29, true], ["Uvas Red Globe", 2.99, true], ["Naranja grande", 1.49, false], ["Naranja Cara Cara", 1.29, false], ["Toronja roja", 1.99, false], ["Fresas Driscoll's", 6.29, false], ["Driscoll's frambuesas 6 oz", 6.99, false], ["Driscoll's moras 6 oz", 5.69, false], ["Caqui Fuyu", 1.99, false], ["Nectarina blanca", 3.99, true], ["Piña entera", 6.49, false], ["Coco", 2.49, false], ["Brócoli", 3.29, true], ["Pimiento rojo", 4.99, true], ["Pimiento naranja", 4.99, true], ["Mini pimientos dulces", 3.99, true], ["Clementinas bolsa 3 lb", 5.99, false], ["Naranja Navel", 1.69, false], ["Mandarina Sunburst", 0.99, false], ["Driscoll's arándanos 11 oz", 5.99, false], ["Driscoll's fresas orgánicas 16 oz", 11.99, false], ["Natural Delights dátiles Medjool orgánicos 12 oz", 11.99, false], ["Dole dátiles sin semilla 8 oz", 4.19, false], ["Melocotón plano (donut)", 5.99, true], ["Mango Francis", 2.99, false], ["Mango Ataulfo", 1.49, false], ["Dole trozos de piña 20 oz", 2.89, false], ["Pitahaya roja", 6.59, true], ["Zespri kiwi verde orgánico 1 lb", 7.99, false], ["Guineos orgánicos", 1.99, true], ["Manzanas Gala bolsa 3 lb", 5.99, false], ["Sundance limones orgánicos 2 lb", 5.99, false], ["Pimientos mixtos (rojo, amarillo, naranja)", 4.99, true]] as const;
describe("Precios regulares confirmados 18 octubre 18:05 UTC", () => {
  it.each(expected)("%s: precio regular %s, conserva modalidad %s", (name, price, perLb) => {
    const refs = [
      ...[...HOUSE_FRUIT_CATALOG, ...HOUSE_VEGETABLE_CATALOG].filter(p => p[0] === name).map(p => ({price:p[2], perLb:p[3]})),
      ...HOUSE_INITIAL_FRUIT_REGULAR_PRICES.filter(p => p[0] === name).map(p => ({price:p[1], perLb:p[2]})),
      ...HOUSE_PRODUCE_OCT18_CATALOG.filter(p => p.nombre === name).map(p => ({price:p.precio, perLb:p.vendido_por_lb})),
    ];
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) { expect(ref.price).toBe(price); expect(ref.perLb).toBe(perLb); }
  });
});
