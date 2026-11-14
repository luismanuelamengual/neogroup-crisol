/**
 * Where the saved games are kept, chosen with the NEXT_PUBLIC_SAVE_STORAGE
 * environment variable (read when the app is built or `next dev` starts):
 *
 *   - `local` (default): only in this browser (localStorage). The server is
 *     never asked for the save, the game works without a database.
 *   - `db`: in the database (table `saves`), with a copy in the browser
 *     (IndexedDB) to play offline that is uploaded with /api/saveGame.
 */
export type SaveStorage = 'local' | 'db'

export const SAVE_STORAGE: SaveStorage = process.env.NEXT_PUBLIC_SAVE_STORAGE?.trim() === 'db' ? 'db' : 'local'

export const isLocalStorageMode = SAVE_STORAGE === 'local'
