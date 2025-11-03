import { atom, map, type MapStore } from 'nanostores';
import { generatePreviewFromCode, revokePreviewUrl } from './preview-generator';

export interface PageInfo {
  id: string;
  name: string;
  path: string; // e.g., '/pages/home'
  previewUrl: string;
  html?: string;
  css?: string;
  js?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  createdAt: number;
}

export interface CanvasState {
  pages: PageInfo[];
  activePage: string | null;
  nextPosition: { x: number; y: number };
}

class CanvasStore {
  pages: MapStore<Record<string, PageInfo>> = map({});
  activePage = atom<string | null>(null);

  // Auto-layout: position new pages in a grid with dynamic heights
  #columnWidth = 420;
  #columns = 10; // Number of columns in the grid
  #horizontalSpacing = 60;
  #verticalSpacing = 80;
  #startX = 100;
  #startY = 100;

  // Track the bottom Y position of each column to prevent overlap
  #columnBottoms: number[] = Array(5).fill(100); // Dynamic based on #columns

  addPage(page: Omit<PageInfo, 'id' | 'position' | 'createdAt'>) {
    // Check if a page with the same path already exists
    const existingPages = this.getAllPages();
    const existingPage = existingPages.find((p) => p.path === page.path);

    if (existingPage) {
      // Update the existing page instead of creating a duplicate
      const updatedPage: PageInfo = {
        ...existingPage,
        ...page,
        previewUrl: page.html ? generatePreviewFromCode(page.html, page.css, page.js) : page.previewUrl,
      };
      this.pages.setKey(existingPage.id, updatedPage);

      return existingPage.id;
    }

    const id = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate preview URL from HTML/CSS/JS if provided
    let previewUrl = page.previewUrl;

    if (page.html) {
      previewUrl = generatePreviewFromCode(page.html, page.css, page.js);
    }

    // Find the best column (the one with the lowest bottom position)
    const position = this.#findOptimalPosition(page.size || { width: 400, height: 600 });

    const newPage: PageInfo = {
      ...page,
      id,
      previewUrl,
      position,
      createdAt: Date.now(),
      size: page.size || { width: 400, height: 600 }, // Use provided size or default
    };

    this.pages.setKey(id, newPage);

    // Update the column bottom position
    this.#updateColumnBottom(position, newPage.size);

    return id;
  }

  // Find the optimal position for a new card to avoid overlaps
  #findOptimalPosition(_size: { width: number; height: number }): { x: number; y: number } {
    // Find the column with the lowest bottom position
    let bestColumn = 0;
    let lowestBottom = this.#columnBottoms[0];

    for (let i = 1; i < this.#columns; i++) {
      if (this.#columnBottoms[i] < lowestBottom) {
        lowestBottom = this.#columnBottoms[i];
        bestColumn = i;
      }
    }

    const x = this.#startX + bestColumn * (this.#columnWidth + this.#horizontalSpacing);
    const y = this.#columnBottoms[bestColumn];

    return { x, y };
  }

  // Update the bottom position of a column after adding or resizing a card
  #updateColumnBottom(position: { x: number; y: number }, size: { width: number; height: number }) {
    const columnIndex = Math.round((position.x - this.#startX) / (this.#columnWidth + this.#horizontalSpacing));

    if (columnIndex >= 0 && columnIndex < this.#columns) {
      this.#columnBottoms[columnIndex] = position.y + size.height + this.#verticalSpacing;
    }
  }

  // Recalculate all column bottoms based on existing pages
  #recalculateColumnBottoms() {
    // Reset all columns to start position
    this.#columnBottoms = new Array(this.#columns).fill(this.#startY);

    const pages = this.getAllPages();

    // Sort pages by position to process them in order
    const sortedPages = pages.sort((a, b) => {
      if (a.position.y === b.position.y) {
        return a.position.x - b.position.x;
      }

      return a.position.y - b.position.y;
    });

    // Update column bottoms based on existing pages
    for (const page of sortedPages) {
      const columnIndex = Math.round((page.position.x - this.#startX) / (this.#columnWidth + this.#horizontalSpacing));

      if (columnIndex >= 0 && columnIndex < this.#columns) {
        const pageBottom = page.position.y + page.size.height + this.#verticalSpacing;
        this.#columnBottoms[columnIndex] = Math.max(this.#columnBottoms[columnIndex], pageBottom);
      }
    }
  }

  removePage(id: string) {
    const pages = this.pages.get();
    const page = pages[id];

    // Revoke blob URL to free memory
    if (page?.previewUrl) {
      revokePreviewUrl(page.previewUrl);
    }

    const { [id]: removed, ...rest } = pages;
    this.pages.set(rest);

    if (this.activePage.get() === id) {
      this.activePage.set(null);
    }

    // Recalculate column bottoms after removing a page
    this.#recalculateColumnBottoms();
  }

  updatePagePosition(id: string, position: { x: number; y: number }) {
    const page = this.pages.get()[id];

    if (page) {
      this.pages.setKey(id, { ...page, position });

      // Recalculate after manual repositioning
      this.#recalculateColumnBottoms();
    }
  }

  updatePageSize(id: string, size: { width: number; height: number }) {
    const page = this.pages.get()[id];

    if (page) {
      this.pages.setKey(id, { ...page, size });

      // Check for overlaps and reposition affected cards
      this.#resolveOverlaps();
    }
  }

  // Check if two cards overlap
  #cardsOverlap(card1: PageInfo, card2: PageInfo): boolean {
    const card1Right = card1.position.x + card1.size.width;
    const card1Bottom = card1.position.y + card1.size.height;
    const card2Right = card2.position.x + card2.size.width;
    const card2Bottom = card2.position.y + card2.size.height;

    // Check if cards overlap in both X and Y axes
    const xOverlap = card1.position.x < card2Right && card1Right > card2.position.x;
    const yOverlap = card1.position.y < card2Bottom && card1Bottom > card2.position.y;

    return xOverlap && yOverlap;
  }

  // Resolve all overlaps by repositioning cards
  #resolveOverlaps() {
    const pages = this.getAllPages();

    if (pages.length === 0) {
      return;
    }

    // Sort by Y position (top to bottom), then by creation time
    const sortedPages = pages.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 10) {
        return a.createdAt - b.createdAt;
      }

      return a.position.y - b.position.y;
    });

    // Group pages by column
    const columnPages: PageInfo[][] = Array.from({ length: this.#columns }, () => []);

    for (const page of sortedPages) {
      const columnIndex = Math.round((page.position.x - this.#startX) / (this.#columnWidth + this.#horizontalSpacing));

      if (columnIndex >= 0 && columnIndex < this.#columns) {
        columnPages[columnIndex].push(page);
      }
    }

    // Process each column and fix overlaps
    for (let col = 0; col < this.#columns; col++) {
      const colPages = columnPages[col];

      if (colPages.length === 0) {
        continue;
      }

      // Start from the first card in this column
      let currentY = colPages[0].position.y;

      for (let i = 0; i < colPages.length; i++) {
        const page = colPages[i];

        // If this card would overlap with the previous one, move it down
        if (page.position.y < currentY) {
          const newPosition = {
            x: page.position.x,
            y: currentY,
          };
          this.pages.setKey(page.id, { ...page, position: newPosition });
          currentY = currentY + page.size.height + this.#verticalSpacing;
        } else {
          currentY = page.position.y + page.size.height + this.#verticalSpacing;
        }
      }
    }

    // Recalculate column bottoms after resolving overlaps
    this.#recalculateColumnBottoms();
  }

  updatePagePreviewUrl(id: string, previewUrl: string) {
    const page = this.pages.get()[id];

    if (page) {
      this.pages.setKey(id, { ...page, previewUrl });
    }
  }

  setActivePage(id: string | null) {
    this.activePage.set(id);
  }

  getPageById(id: string): PageInfo | undefined {
    return this.pages.get()[id];
  }

  getAllPages(): PageInfo[] {
    return Object.values(this.pages.get());
  }

  clearAll() {
    this.pages.set({});
    this.activePage.set(null);
    this.#columnBottoms = new Array(this.#columns).fill(this.#startY);
  }

  // Reorganize all pages to avoid overlaps (useful after bulk updates)
  reorganizePages() {
    const pages = this.getAllPages();

    if (pages.length === 0) {
      return;
    }

    // Reset column bottoms
    this.#columnBottoms = new Array(this.#columns).fill(this.#startY);

    // Sort pages by creation time to maintain order
    const sortedPages = pages.sort((a, b) => a.createdAt - b.createdAt);

    // Reposition each page
    for (const page of sortedPages) {
      const newPosition = this.#findOptimalPosition(page.size);
      this.pages.setKey(page.id, { ...page, position: newPosition });
      this.#updateColumnBottom(newPosition, page.size);
    }
  }
}

export const canvasStore = new CanvasStore();
