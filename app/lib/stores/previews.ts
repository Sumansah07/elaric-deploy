import { atom, type WritableAtom } from 'nanostores';

export interface Preview {
  id: string;
  url: string;
}

export class PreviewsStore {
  previews: WritableAtom<Preview[]> = atom([]);
}

// Hook for using preview store
export function usePreviewStore() {
  return new PreviewsStore();
}
