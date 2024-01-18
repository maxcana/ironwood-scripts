(Promise) => {

    const exports = {
        getAllEntries,
        saveEntry,
        removeEntry
    }

    const initialised = new Promise.Expiring(2000);
    let database = null;

    const databaseName = 'PancakeScripts';

    function initialise() {
        const request = window.indexedDB.open(databaseName, 3);
        request.onsuccess = function(event) {
            database = this.result;
            initialised.resolve(exports);
        };
        request.onerror = function(event) {
            console.error(`Failed creating IndexedDB : ${event.target.errorCode}`);
        };
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if(event.oldVersion <= 0) {
                console.debug('Creating IndexedDB');
                db
                    .createObjectStore('settings', { keyPath: 'key' })
                    .createIndex('key', 'key', { unique: true });
            }
            if(event.oldVersion <= 1) {
                db
                    .createObjectStore('sync-tracking', { keyPath: 'key' })
                    .createIndex('key', 'key', { unique: true });
            }
            if(event.oldVersion <= 2) {
                db
                    .createObjectStore('market-filters', { keyPath: 'key' })
                    .createIndex('key', 'key', { unique: true });
            }
        };
    }

    async function getAllEntries(storeName) {
        const result = new Promise.Expiring(1000);
        const entries = [];
        const store = database.transaction(storeName, 'readonly').objectStore(storeName);
        const request = store.openCursor();
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if(cursor) {
                entries.push(cursor.value);
                cursor.continue();
            } else {
                result.resolve(entries);
            }
        };
        request.onerror = function(event) {
            result.reject(event.error);
        };
        return result;
    }

    async function saveEntry(storeName, entry) {
        const result = new Promise.Expiring(1000);
        const store = database.transaction(storeName, 'readwrite').objectStore(storeName);
        const request = store.put(entry);
        request.onsuccess = function(event) {
            result.resolve();
        };
        request.onerror = function(event) {
            result.reject(event.error);
        };
        return result;
    }

    async function removeEntry(storeName, key) {
        const result = new Promise.Expiring(1000);
        const store = database.transaction(storeName, 'readwrite').objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = function(event) {
            result.resolve();
        };
        request.onerror = function(event) {
            result.reject(event.error);
        };
        return result;
    }

    initialise();

    return initialised;

}
