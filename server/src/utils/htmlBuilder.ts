// Efficient HTML string builder to avoid repeated string concatenation
export class HtmlBuilder {
  private chunks: string[] = [];
  private estimatedSize: number = 0;

  append(html: string): this {
    if (html) {
      this.chunks.push(html);
      this.estimatedSize += html.length;
    }
    return this;
  }

  appendLine(html: string = ''): this {
    this.chunks.push(html + '\n');
    this.estimatedSize += html.length + 1;
    return this;
  }

  toString(): string {
    // Use join which is more efficient than repeated concatenation
    return this.chunks.join('');
  }

  clear(): void {
    this.chunks = [];
    this.estimatedSize = 0;
  }

  get size(): number {
    return this.estimatedSize;
  }
}

// Pre-compiled escape patterns for better performance
const escapeMap: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

const escapeRegex = /[&<>"']/g;

// Optimized HTML escape function
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  if (!unsafe) return '';
  
  // Quick check if escaping is needed
  if (!escapeRegex.test(unsafe)) {
    return unsafe;
  }
  
  // Reset regex lastIndex for reuse
  escapeRegex.lastIndex = 0;
  
  return unsafe.replace(escapeRegex, (match) => escapeMap[match]);
}