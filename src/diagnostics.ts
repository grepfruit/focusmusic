/**
 * Diagnostics - Track audio node creation/cleanup for debugging
 */

class NodeCounter {
  private created = 0;
  private cleaned = 0;
  
  create(count: number = 1) {
    this.created += count;
  }
  
  cleanup(count: number = 1) {
    this.cleaned += count;
  }
  
  getActive(): number {
    return this.created - this.cleaned;
  }
  
  getStats() {
    return {
      created: this.created,
      cleaned: this.cleaned,
      active: this.created - this.cleaned,
    };
  }
  
  reset() {
    this.created = 0;
    this.cleaned = 0;
  }
}

// Global singleton
export const nodeCounter = new NodeCounter();

// Memory helper
export function getMemoryMB(): number {
  const mem = process.memoryUsage();
  return Math.round(mem.heapUsed / 1024 / 1024);
}

// Diagnostic logging
export function logDiagnostics(elapsed: number) {
  const stats = nodeCounter.getStats();
  const mem = getMemoryMB();
  console.log(
    `  [${elapsed}s] Nodes: ${stats.active} active (${stats.created} created, ${stats.cleaned} cleaned) | Memory: ${mem}MB`
  );
}
