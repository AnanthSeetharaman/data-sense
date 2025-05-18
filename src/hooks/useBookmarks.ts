
"use client";

import { useState, useEffect, useCallback } from 'react';

const BOOKMARKS_STORAGE_KEY = 'datalens-bookmarks';

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedBookmarks = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (storedBookmarks) {
          setBookmarkedIds(new Set(JSON.parse(storedBookmarks)));
        }
      } catch (error) {
        console.error("Error loading bookmarks from localStorage:", error);
        // Initialize with empty set if parsing fails
        setBookmarkedIds(new Set());
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarkedIds)));
      } catch (error) {
        console.error("Error saving bookmarks to localStorage:", error);
      }
    }
  }, [bookmarkedIds, isInitialized]);

  const addBookmark = useCallback((id: string) => {
    setBookmarkedIds(prevIds => {
      const newIds = new Set(prevIds);
      newIds.add(id);
      return newIds;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarkedIds(prevIds => {
      const newIds = new Set(prevIds);
      newIds.delete(id);
      return newIds;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return bookmarkedIds.has(id);
  }, [bookmarkedIds]);

  const toggleBookmark = useCallback((id: string) => {
    if (isBookmarked(id)) {
      removeBookmark(id);
    } else {
      addBookmark(id);
    }
  }, [isBookmarked, addBookmark, removeBookmark]);

  return { bookmarkedIds, addBookmark, removeBookmark, isBookmarked, toggleBookmark, isInitialized };
}
