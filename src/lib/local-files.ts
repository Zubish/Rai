export type LibraryFile = { id: string; name: string; size: number; createdAt: string; blob: Blob };

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("rai-local-library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Local file storage is unavailable."));
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("files", mode);
      const request = operation(tx.objectStore("files"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error("Could not update the local file library."));
    });
  } finally { db.close(); }
}

export const listFiles = () => transaction<LibraryFile[]>("readonly", store => store.getAll());
export const saveFile = (file: LibraryFile) => transaction("readwrite", store => store.put(file));
export const deleteFile = (id: string) => transaction("readwrite", store => store.delete(id));

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
