/**
 * Escapa un identificador de PostgreSQL y lo envuelve en comillas dobles.
 * Se mantiene local al adapter para construir el nombre totalmente calificado de la tabla.
 */
export function quoteIdent(ident: string): string {
  const safe = ident.replace(/"/g, '""');
  return `"${safe}"`;
}
