import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  pagina: number;
  porPagina?: number;
  onCambiar: (p: number) => void;
  nombreItems?: string;
}

export default function Pagination({ total, pagina, porPagina = 10, onCambiar, nombreItems = 'registros' }: PaginationProps) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  // Calcular páginas visibles (max 5, centradas en la actual)
  const rango: (number | '...')[] = [];
  if (totalPaginas <= 7) {
    for (let i = 1; i <= totalPaginas; i++) rango.push(i);
  } else {
    rango.push(1);
    if (pagina > 3) rango.push('...');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(totalPaginas - 1, pagina + 1); i++) rango.push(i);
    if (pagina < totalPaginas - 2) rango.push('...');
    rango.push(totalPaginas);
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, border: '1px solid #E8E2DA',
    borderRadius: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer',
    background: '#fff', color: '#6B3A2A', transition: 'all 0.15s',
    fontWeight: 500,
  };

  const btnActivo: React.CSSProperties = {
    ...btnBase,
    background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
    color: '#fff',
    border: '1px solid #C4895A',
    fontWeight: 700,
    boxShadow: '0 2px 6px rgba(107,58,42,0.25)',
  };

  const btnDeshabilitado: React.CSSProperties = {
    ...btnBase,
    opacity: 0.3, cursor: 'not-allowed',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      borderTop: '1px solid #F0EBE4',
      background: '#FAFAF8',
    }}>
      <span style={{ fontSize: '0.78rem', color: '#9E8878' }}>
        Mostrando {desde} a {hasta} de {total} {nombreItems}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        {/* Anterior */}
        <button
          style={pagina === 1 ? btnDeshabilitado : btnBase}
          onClick={() => pagina > 1 && onCambiar(pagina - 1)}
          disabled={pagina === 1}
          onMouseEnter={e => { if (pagina > 1) { (e.currentTarget as HTMLElement).style.background = '#F5EFE8'; (e.currentTarget as HTMLElement).style.borderColor = '#C4895A'; }}}
          onMouseLeave={e => { if (pagina > 1) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E8E2DA'; }}}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Números */}
        {rango.map((item, i) =>
          item === '...' ? (
            <span key={`dots-${i}`} style={{ width: 34, textAlign: 'center', color: '#B8A89A', fontSize: '0.85rem' }}>…</span>
          ) : (
            <button
              key={item}
              style={pagina === item ? btnActivo : btnBase}
              onClick={() => onCambiar(item as number)}
              onMouseEnter={e => { if (pagina !== item) { (e.currentTarget as HTMLElement).style.background = '#F5EFE8'; (e.currentTarget as HTMLElement).style.borderColor = '#C4895A'; }}}
              onMouseLeave={e => { if (pagina !== item) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E8E2DA'; }}}
            >
              {item}
            </button>
          )
        )}

        {/* Siguiente */}
        <button
          style={pagina === totalPaginas ? btnDeshabilitado : btnBase}
          onClick={() => pagina < totalPaginas && onCambiar(pagina + 1)}
          disabled={pagina === totalPaginas}
          onMouseEnter={e => { if (pagina < totalPaginas) { (e.currentTarget as HTMLElement).style.background = '#F5EFE8'; (e.currentTarget as HTMLElement).style.borderColor = '#C4895A'; }}}
          onMouseLeave={e => { if (pagina < totalPaginas) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E8E2DA'; }}}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
