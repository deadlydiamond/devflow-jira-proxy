import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly PREFIX = 'devflow_';

  /**
   * Get a value from localStorage with type safety
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage for key: ${key}`, error);
      return defaultValue || null;
    }
  }

  /**
   * Set a value in localStorage with type safety
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key: ${key}`, error);
    }
  }

  /**
   * Remove a value from localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.error(`Error removing from localStorage for key: ${key}`, error);
    }
  }

  /**
   * Check if a key exists in localStorage
   */
  has(key: string): boolean {
    try {
      return localStorage.getItem(this.PREFIX + key) !== null;
    } catch (error) {
      console.error(`Error checking localStorage for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all devflow-related items from localStorage
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage', error);
    }
  }

  /**
   * Get all keys that start with the devflow prefix
   */
  getKeys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(this.PREFIX))
        .map(key => key.replace(this.PREFIX, ''));
    } catch (error) {
      console.error('Error getting localStorage keys', error);
      return [];
    }
  }

  /**
   * Get the size of stored data in bytes
   */
  getSize(): number {
    try {
      const keys = this.getKeys();
      return keys.reduce((size, key) => {
        const item = localStorage.getItem(this.PREFIX + key);
        return size + (item ? new Blob([item]).size : 0);
      }, 0);
    } catch (error) {
      console.error('Error calculating localStorage size', error);
      return 0;
    }
  }
}
