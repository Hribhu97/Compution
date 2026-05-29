import { onSnapshot, getDoc, getDocs } from 'firebase/firestore';

class FirestoreQueryManager {
  constructor() {
    this.docCache = new Map();
    this.queryCache = new Map();
    this.listeners = new Map(); // key -> { unsubscribe, subscribers: Set<Function> }
  }

  // Generate a unique string key for a query or reference
  getQueryKey(queryOrRef) {
    if (!queryOrRef) return '';
    // Use Firestore's internal path or query identifier
    if (queryOrRef.path) return queryOrRef.path;
    if (queryOrRef._query) {
      // Stringify query parameters for uniqueness
      return JSON.stringify(queryOrRef._query);
    }
    return String(queryOrRef);
  }

  // Stale-While-Revalidate getDoc wrapper
  async getCachedDoc(docRef, forceRefresh = false) {
    const key = this.getQueryKey(docRef);
    const cached = this.docCache.get(key);

    if (cached && !forceRefresh) {
      // Revalidate in background
      getDoc(docRef).then((freshSnap) => {
        if (freshSnap.exists()) {
          this.docCache.set(key, freshSnap.data());
        }
      }).catch(console.warn);

      return cached;
    }

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      this.docCache.set(key, data);
      return data;
    }
    return null;
  }

  // Listener Pooling for onSnapshot
  subscribeToQuery(queryRef, callback, errorCallback = console.error) {
    const key = this.getQueryKey(queryRef);
    let activeListener = this.listeners.get(key);

    if (!activeListener) {
      const subscribers = new Set();
      subscribers.add(callback);

      // Start the actual Firestore listener
      const unsubscribe = onSnapshot(queryRef, (snapshot) => {
        let result;
        if (snapshot.forEach && typeof snapshot.forEach === 'function') {
          result = [];
          snapshot.forEach((doc) => {
            result.push({ id: doc.id, ...doc.data() });
          });
        } else {
          result = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
        }
        
        // Cache the result
        this.queryCache.set(key, result);

        // Notify all subscribers
        subscribers.forEach((sub) => {
          try {
            sub(result, snapshot);
          } catch (e) {
            console.error('Subscriber callback failed:', e);
          }
        });
      }, (error) => {
        if (errorCallback) errorCallback(error);
      });

      activeListener = { unsubscribe, subscribers };
      this.listeners.set(key, activeListener);
    } else {
      // Reuse existing active listener
      activeListener.subscribers.add(callback);
      
      // If we have cached data, immediately deliver it to prevent loading lag
      const cachedData = this.queryCache.get(key);
      if (cachedData) {
        callback(cachedData);
      }
    }

    // Return the custom unsubscribe handler
    return () => {
      const listener = this.listeners.get(key);
      if (!listener) return;

      listener.subscribers.delete(callback);

      // If no components are listening, tear down the listener to save costs
      if (listener.subscribers.size === 0) {
        listener.unsubscribe();
        this.listeners.delete(key);
        this.queryCache.delete(key);
      }
    };
  }

  // Clear cache manually (e.g. on logout)
  clearCache() {
    this.docCache.clear();
    this.queryCache.clear();
    this.listeners.forEach((listener) => listener.unsubscribe());
    this.listeners.clear();
  }
}

export const queryManager = new FirestoreQueryManager();
