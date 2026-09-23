// Convierte un teléfono argentino cargado a mano ("011 15 4455-6677",
// "+54 9 11 4455 6677", "1144556677"...) al formato que usa wa.me: 549 + área + número.
export const telefonoWhatsApp = (tel?: string | null): string => {
  let n = (tel ?? '').replace(/\D/g, '');
  if (!n) return '';
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9')) n = n.slice(1);
  if (n.startsWith('0')) n = n.slice(1);
  // Quitar el "15" de celular que va después del código de área (2, 3 o 4 dígitos)
  if (n.length === 12) {
    for (const area of [2, 3, 4]) {
      if (n.slice(area, area + 2) === '15') { n = n.slice(0, area) + n.slice(area + 2); break; }
    }
  }
  return n.length === 10 ? `549${n}` : n;
};

export const linkWhatsApp = (tel: string | null | undefined, mensaje: string) => {
  const numero = telefonoWhatsApp(tel);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
};
