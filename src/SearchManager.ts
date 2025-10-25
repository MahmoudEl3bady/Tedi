export class SearchManager {
  private query: string = "";
  private matches: Array<{ line: number; col: number }> = [];
  private currentMatch = -1;

  search(lines: string[], query: string) {
    this.query = query;
    this.matches = [];
    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line!.toLocaleLowerCase().includes(query.toLowerCase())) {
          const queryIndex = line!.indexOf(query.toLocaleLowerCase());
          this.matches.push({ line: i, col: queryIndex });
        }
      }
      this.currentMatch = this.matches.length > 0 ? 0 : -1;
    } catch (error: any) {
      console.error("Error in showing search results!", error.message);
    }
  }
  nextMatch(): { line: number; col: number } | null {
    if (this.matches.length === 0) return null;
    this.currentMatch = (this.currentMatch + 1) % this.matches.length;
    return this.matches[this.currentMatch]!;
  }

  prevMatch(): { line: number; col: number } | null {
    if (this.matches.length === 0) return null;
    this.currentMatch =
      (this.currentMatch - 1 + this.matches.length) % this.matches.length;
    return this.matches[this.currentMatch]!;
  }

  getMatches() {
    return this.matches;
  }
}
