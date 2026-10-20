/**
 * Cuidado personal del Supermercado Hazorex (20/10/2026).
 * Precio regular de la tienda Food Bazaar (si hay oferta, el precio de antes), 0 % sobreprecio, venta por unidad/paquete.
 * Fila: [subcategoría, nombre ES, nombre EN, tamaño, precio, peso aprox. lb]
 */
export type PersonalCareRow = readonly [string, string, string, string, number, number];

const S = "Champú y acondicionador";
const J = "Jabón y gel de baño";
const C = "Cuidado del cabello y peinado";
const P = "Pasta y cepillos de dientes";
const E = "Enjuague bucal e hilo dental";
const D = "Desodorantes";
const A = "Afeitado";
const L = "Cuidado de la piel y lociones";
const F = "Higiene femenina";
const H = "Algodón, hisopos y pañuelos";
const V = "Vitaminas y primeros auxilios";
const X = "Productos para el cabello latino y afro";

export const HOUSE_PERSONAL_CARE_CATALOG: readonly PersonalCareRow[] = [
  [S, "Pantene champú y acondicionador 2 en 1 Classic Clean", "Pantene Classic Clean 2in1 shampoo + conditioner", "12 fl oz", 9.99, 0.9],
  [S, "Pantene champú Curl Perfection", "Pantene Curl Perfection shampoo", "12 oz", 9.99, 0.9],
  [S, "Pantene acondicionador Curl Perfection", "Pantene Curl Perfection conditioner", "10.4 fl oz", 9.99, 0.8],
  [S, "Dove champú Intensive Repair", "Dove Intensive Repair shampoo", "12 fl oz", 7.99, 0.9],
  [S, "Dove acondicionador Intensive Repair", "Dove Intensive Repair conditioner", "12 fl oz", 7.99, 0.9],
  [S, "Garnier Fructis champú Purifying", "Garnier Fructis Purifying shampoo", "12.5 fl oz", 7.99, 0.9],
  [S, "Garnier acondicionador para cabello seco", "Garnier conditioner for dry to very dry hair", "12 fl oz", 7.99, 0.9],
  [S, "Head & Shoulders champú anticaspa Classic Clean", "Head & Shoulders Classic Clean shampoo", "400 ml", 8.99, 1.0],
  [S, "Head & Shoulders champú anticaspa Apple Fresh", "Head & Shoulders Apple Fresh anti-dandruff shampoo", "13.5 fl oz", 8.99, 1.0],
  [S, "TRESemmé acondicionador Rich Moisture", "TRESemmé Rich Moisture hydrating conditioner", "28 fl oz", 9.99, 2.0],
  [S, "L'Oréal champú Volume Filler", "L'Oreal Volume Filler volumizing shampoo", "12.6 fl oz", 8.99, 0.9],
  [S, "Alberto VO5 acondicionador Kiwi Lime", "Alberto VO5 Kiwi Lime Squeeze conditioner", "15 fl oz", 2.59, 1.1],
  [S, "Johnson's champú para bebé Calming", "Johnson's Calming baby shampoo", "13.6 fl oz", 8.49, 1.0],

  [J, "Dove gel de baño Deep Moisture", "Dove Deep Moisture body wash", "11 fl oz", 9.89, 0.8],
  [J, "Dove gel de baño Sensitive Skin", "Dove Sensitive Skin body wash", "11 fl oz", 9.89, 0.8],
  [J, "Irish Spring gel de baño Original", "Irish Spring Original body wash for men", "20 fl oz", 7.99, 1.4],
  [J, "Softsoap gel exfoliante Coconut Butter", "Softsoap Coconut Butter exfoliating body wash", "20 fl oz", 9.49, 1.4],
  [J, "Old Spice gel de baño Pure Sport", "Old Spice Pure Sport body wash", "21 fl oz", 8.99, 1.5],
  [J, "AXE gel de baño Phoenix", "AXE Phoenix body wash", "16 fl oz", 7.99, 1.1],
  [J, "Suave gel de baño manteca de cacao y karité", "Suave Cocoa Butter & Shea body wash", "15 fl oz", 2.99, 1.0],
  [J, "Dial gel de baño Calm & Soothe lavanda", "Dial Calm & Soothe lavender body wash", "16 fl oz", 8.99, 1.1],
  [J, "Dove jabón en barra Original", "Dove Original beauty bar", "135 g", 1.99, 0.3],
  [J, "Palmolive jabón en barra", "Palmolive bar soap", "16.93 oz", 6.99, 1.1],
  [J, "Caress jabón en barra Daily Silk", "Caress Daily Silk beauty bar", "3.16 oz", 1.99, 0.2],
  [J, "Grisi jabón Ricitos de Oro manzanilla", "Grisi Ricitos de Oro chamomile baby soap", "3.5 oz", 1.79, 0.3],
  [J, "Dr. Bronner's jabón líquido de Castilla árbol de té", "Dr. Bronner's Tea Tree pure-castile soap", "32 fl oz", 21.99, 2.2],

  [C, "Xtreme gel para peinar Pro-Expert", "Xtreme Pro-Expert styling gel", "8.81 oz", 2.59, 0.6],
  [C, "Xtreme gel para peinar Pro-Expert grande", "Xtreme Pro-Expert styling gel, large", "35.27 oz", 8.59, 2.3],
  [C, "TRESemmé gel Mega Control", "TRESemmé Mega Control hair gel", "9 oz", 10.99, 0.7],
  [C, "TRESemmé laca fijación flexible", "TRESemmé flexible hold hairspray", "11 oz", 12.99, 0.8],
  [C, "Johnson's aceite para bebé Original", "Johnson's Original baby oil", "3 fl oz", 4.79, 0.3],
  [C, "Revlon Colorsilk tinte permanente 10 Negro", "Revlon Colorsilk permanent hair color, 10 Black", "1 kit", 4.99, 0.4],
  [C, "Revlon Colorsilk tinte permanente 11 Negro suave", "Revlon Colorsilk permanent hair color, 11 Soft Black", "1 kit", 4.99, 0.4],
  [C, "Revlon tinte permanente 20 Negro castaño", "Revlon permanent haircolor, 20 Brown Black", "1 kit", 4.99, 0.4],
  [C, "Garnier Nutrisse tinte 20 Negro suave", "Garnier Nourishing hair color creme, 20 Soft Black", "1 kit", 14.99, 0.5],

  [P, "Colgate pasta dental Cavity Protection", "Colgate Cavity Protection toothpaste", "4 oz", 2.99, 0.3],
  [P, "Colgate pasta dental Triple Action", "Colgate Triple Action whitening toothpaste", "8 oz", 4.49, 0.6],
  [P, "Colgate pasta dental Sensitive Complete Protection", "Colgate Sensitive Complete Protection toothpaste", "6 oz", 8.99, 0.5],
  [P, "Crest pasta dental Cavity Protection", "Crest Cavity Protection toothpaste", "8.2 oz", 4.99, 0.6],
  [P, "Crest pasta dental Complete + Scope blanqueadora", "Crest Complete + Scope whitening toothpaste", "5.4 oz", 6.99, 0.4],
  [P, "Crest Kids pasta dental Sparkle Fun", "Crest Kids Sparkle Fun cavity protection toothpaste", "4.6 oz", 4.69, 0.4],
  [P, "Sensodyne pasta dental Extra Whitening", "Sensodyne Extra Whitening sensitive toothpaste", "4 oz", 11.99, 0.3],
  [P, "Colgate cepillo de dientes Extra Clean suave", "Colgate Extra Clean soft toothbrush", "1 unidad", 1.29, 0.1],
  [P, "Colgate cepillo de dientes Extra Clean mediano", "Colgate Extra Clean medium toothbrush", "1 unidad", 1.29, 0.1],
  [P, "Colgate cepillo 360 carbón mediano", "Colgate 360 Charcoal medium toothbrush", "1 unidad", 3.69, 0.1],
  [P, "Reach cepillo de dientes mediano", "Reach medium toothbrush", "1 unidad", 2.49, 0.1],
  [P, "Colgate cepillo para niños 2+ extra suave", "Colgate Kids 2+ extra soft toothbrush", "1 unidad", 1.79, 0.1],

  [E, "Listerine enjuague bucal Original", "Listerine Original mouthwash", "500 ml", 7.59, 1.2],
  [E, "Listerine enjuague bucal Fresh Burst", "Listerine Fresh Burst mouthwash", "500 ml", 7.59, 1.2],
  [E, "Listerine enjuague Cool Mint tamaño viaje", "Listerine Cool Mint mouthwash, travel size", "95 ml", 2.69, 0.3],
  [E, "Colgate enjuague bucal sin alcohol Peppermint", "Colgate alcohol-free peppermint mouthwash", "500 ml", 8.99, 1.2],
  [E, "Colgate Total enjuague Gum Health sin alcohol", "Colgate Total Gum Health alcohol-free mouthwash", "33.8 fl oz", 9.99, 2.3],
  [E, "TheraBreath enjuague Fresh Breath", "TheraBreath Fresh Breath oral rinse", "16 fl oz", 12.99, 1.1],
  [E, "Oral-B hilo dental Essential menta", "Oral-B Essential mint waxed dental floss", "50 m", 2.49, 0.1],
  [E, "Oral-B Glide palillos de hilo dental", "Oral-B Glide Gum Care floss picks", "30 ct", 7.79, 0.1],
  [E, "DenTek palillos de hilo dental Comfort Clean", "DenTek Comfort Clean floss picks", "150 ct", 5.99, 0.3],

  [D, "Dove desodorante en barra Original Clean", "Dove Original Clean antiperspirant stick", "2.6 oz", 6.99, 0.2],
  [D, "Dove desodorante en barra Sensitive", "Dove Sensitive antiperspirant stick", "2.6 oz", 6.99, 0.2],
  [D, "Dove desodorante en spray Original", "Dove Original antiperspirant spray", "150 ml", 4.99, 0.3],
  [D, "Secret desodorante Invisible Powder Fresh", "Secret Invisible Powder Fresh antiperspirant", "2.6 oz", 6.99, 0.2],
  [D, "Degree desodorante Cool Rush", "Degree Cool Rush antiperspirant", "2.7 oz", 5.99, 0.2],
  [D, "Degree desodorante Shower Clean", "Degree Shower Clean antiperspirant", "2.6 oz", 5.79, 0.2],
  [D, "Lady Speed Stick desodorante Shower Fresh", "Lady Speed Stick Invisible Dry Shower Fresh", "2.3 oz", 4.99, 0.2],
  [D, "Gillette desodorante en gel Cool Wave", "Gillette Clear Gel Cool Wave antiperspirant", "70 ml", 6.99, 0.3],
  [D, "Arm & Hammer desodorante Ultra Max Powder Fresh", "Arm & Hammer Ultra Max Powder Fresh deodorant", "2.6 oz", 5.59, 0.2],

  [A, "Gillette rastrillos Blue II Plus", "Gillette Blue II Plus razors", "2 ct", 2.19, 0.1],
  [A, "Gillette rastrillos Blue 2 Plus Ultragrip", "Gillette Blue 2 Plus Ultragrip disposable razors", "6 ct", 4.99, 0.2],
  [A, "Gillette máquina de afeitar", "Gillette razor", "1 unidad", 7.49, 0.2],
  [A, "BIC rastrillos desechables", "BIC shavers", "10 ct", 5.99, 0.2],
  [A, "BIC rastrillos Sensitive de una hoja", "BIC Sensitive single-blade shavers", "5 ct", 2.49, 0.1],
  [A, "BIC rastrillos de 4 hojas", "BIC 4-blade razors", "3 ct", 10.99, 0.2],
  [A, "Barbasol crema de afeitar Original", "Barbasol Thick & Rich Original shaving cream", "10 oz", 5.19, 0.7],
  [A, "Gillette Series gel de afeitar con aloe", "Gillette Series soothing shave gel with aloe", "2.5 oz", 2.39, 0.2],
  [A, "Brut loción para después de afeitar", "Brut after shave with aloe", "5 fl oz", 7.49, 0.5],

  [L, "NIVEA loción manteca de cacao", "NIVEA Cocoa Butter lotion", "16.9 fl oz", 12.99, 1.2],
  [L, "NIVEA loción Aloe Vera", "NIVEA Aloe Vera lotion", "16.9 fl oz", 12.99, 1.2],
  [L, "NIVEA crema Creme", "NIVEA Creme skin cream", "13.5 oz", 10.99, 1.0],
  [L, "Aveeno loción hidratante diaria", "Aveeno Daily Moisturizing body lotion", "18 fl oz", 16.99, 1.3],
  [L, "Jergens loción Daily Moisture", "Jergens Daily Moisture hand & body lotion", "21 fl oz", 13.49, 1.5],
  [L, "Lubriderm loción Advanced Therapy sin fragancia", "Lubriderm Advanced Therapy fragrance-free lotion", "6 fl oz", 6.99, 0.5],
  [L, "Johnson's loción para bebé con aloe", "Johnson's baby lotion with aloe", "13.6 fl oz", 8.99, 1.0],
  [L, "Vaseline vaselina manteca de cacao", "Vaseline Cocoa Butter petroleum jelly", "1.75 oz", 2.19, 0.2],
  [L, "Pond's crema para piel seca", "POND'S dry skin cream", "6.5 oz", 12.99, 0.6],
  [L, "Banana Boat protector solar Sport", "Banana Boat Sport Performance sunscreen lotion", "3 fl oz", 6.99, 0.3],
  [L, "Blistex bálsamo labial SPF 15", "Blistex medicated SPF 15 lip balm", "0.15 oz", 4.19, 0.1],

  [F, "Always toallas Ultra Thin talla 4", "Always Ultra Thin pads, size 4", "16 ct", 6.99, 0.4],
  [F, "Always toallas Ultra Thin con alas talla 2", "Always Ultra Thin pads with wings, size 2", "20 ct", 6.99, 0.4],
  [F, "Always toallas Maxi con alas talla 2", "Always Maxi pads with wings, size 2", "18 ct", 7.39, 0.5],
  [F, "Always toallas Maxi nocturnas talla 4", "Always Maxi overnight pads with wings, size 4", "26 ct", 10.39, 0.8],
  [F, "Always Infinity toallas nocturnas talla 4", "Always Infinity overnight pads, size 4", "26 ct", 13.49, 0.7],
  [F, "Always protectores diarios Daily Fresh", "Always Daily Fresh thin liners", "20 ct", 1.59, 0.1],
  [F, "Tampax Pearl tampones Regular", "Tampax Pearl Regular tampons", "18 ct", 7.99, 0.3],
  [F, "Tampax tampones de cartón Super", "Tampax Cardboard Super tampons", "20 ct", 5.99, 0.3],
  [F, "U by Kotex Click tampones Super", "U by Kotex Click Super tampons", "16 ct", 8.59, 0.3],
  [F, "Summer's Eve jabón íntimo Simply Sensitive", "Summer's Eve Simply Sensitive cleansing wash", "15 fl oz", 8.99, 1.1],

  [H, "Simply bolitas de algodón", "Simply cotton balls", "100 ct", 1.19, 0.1],
  [H, "Simply discos de algodón", "Simply cotton pads", "100 ct", 1.29, 0.1],
  [H, "Q-tips hisopos de algodón Original", "Q-tips Original cotton swabs", "170 ct", 4.99, 0.2],
  [H, "Q-tips hisopos de algodón Original grande", "Q-tips Original cotton swabs, large", "500 ct", 7.99, 0.4],
  [H, "Cottonelle toallitas húmedas desechables sin fragancia", "Cottonelle flushable fragrance-free wipes", "4 x 42 ct", 10.69, 1.5],
  [H, "Purell gel desinfectante de manos", "PURELL Advanced hand sanitizer gel", "8 fl oz", 4.99, 0.6],
  [H, "Cutex quitaesmalte", "Cutex nail polish remover", "6.7 fl oz", 4.99, 0.5],
  [H, "Trim cortaúñas para pies con lima", "TRIM deluxe toenail clipper with file", "1 unidad", 1.99, 0.1],

  [V, "Band-Aid curitas de tela flexible", "BAND-AID Flexible Fabric bandages", "30 ct", 7.99, 0.2],
  [V, "Band-Aid curitas Water Block Flex", "BAND-AID Water Block Flex bandages", "20 ct", 6.99, 0.1],
  [V, "Band-Aid curitas de tela extra grandes", "BAND-AID Flexible Fabric bandages, extra large", "10 ct", 7.99, 0.1],
  [V, "Band-Aid gasas Cushion Care pequeñas", "BAND-AID Cushion Care gauze pads, small", "10 ct", 2.89, 0.1],
  [V, "Neosporin ungüento Dual Action", "NEOSPORIN Dual Action ointment", "0.5 oz", 10.99, 0.1],
  [V, "Vicks VapoRub ungüento", "Vicks VapoRub ointment", "1.76 oz", 11.49, 0.2],
  [V, "Vaseline Healing Jelly Original", "Vaseline Original healing jelly", "1.75 oz", 2.79, 0.2],
  [V, "Camco multivitaminas en gomitas", "Camco Multi-Vitamin gummies", "70 ct", 7.49, 0.4],
  [V, "Emergen-C vitamina C Super Orange", "Emergen-C Super Orange vitamin C drink mix", "30 x 0.32 oz", 21.99, 0.8],
  [V, "Tarrito Rojo Kola Granulada", "Tarrito Rojo Kola Granulada multivitamin supplement", "11.64 oz", 6.59, 0.9],
  [V, "Handi Works guantes de nitrilo", "Handi Works nitrile gloves", "30 ct", 12.49, 0.3],

  [X, "Eco Style gel Olive Oil fijación máxima", "Eco Style Max Hold Olive Oil styling gel", "32 oz", 10.49, 2.2],
  [X, "Eco Style gel Krystal fijación máxima", "Eco Style Max Hold Krystal styling gel", "16 fl oz", 6.99, 1.1],
  [X, "Let's Jam gel Condition & Shine", "Let's Jam Condition & Shine hair gel, regular hold", "4.4 oz", 5.99, 0.3],
  [X, "Moco de Gorila gel Punk", "Moco de Gorila Punk hair gel", "11.99 oz", 5.79, 0.8],
  [X, "Moco de Gorila gel Punk Beast Hold", "Moco de Gorila Punk Beast Hold hair gel", "9.52 oz", 4.79, 0.7],
  [X, "Miss Key acondicionador 10 en 1", "Miss Key 10 in 1 super conditioner", "16 fl oz", 10.19, 1.1],
  [X, "Flor de Man acondicionador Silk Protein Plus", "Flor de Man Silk Protein Plus conditioner", "33.8 fl oz", 10.99, 2.3],
  [X, "Grisi champú Aloe Vera", "Grisi Aloe Vera shampoo", "13.5 fl oz", 6.29, 1.0],
  [X, "Grisi champú Vitagloss Manzanilla", "Grisi Vitagloss chamomile shampoo", "13.5 fl oz", 6.29, 1.0],
  [X, "TRESemmé champú Bouncy Curls para rizos", "TRESemmé Bouncy Curls shampoo", "28 fl oz", 9.99, 2.0],
];
