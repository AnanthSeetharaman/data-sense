
"use client";

import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBookmarks } from '@/hooks/useBookmarks';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  assetId: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function BookmarkButton({ assetId, className, size = 'icon' }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, isInitialized } = useBookmarks();
  const bookmarked = isBookmarked(assetId);

  if (!isInitialized) {
    // Render a placeholder or null until localStorage is loaded
    return (
        <Button variant="ghost" size={size} className={cn("text-muted-foreground", className)} disabled>
            <Bookmark className={cn("h-4 w-4", size === 'lg' && "h-5 w-5")} />
        </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click when clicking button
            e.preventDefault();
            toggleBookmark(assetId);
          }}
          className={cn(
            bookmarked ? 'text-primary hover:text-primary/90' : 'text-muted-foreground hover:text-foreground/80',
            className
          )}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Bookmark className={cn("h-4 w-4", size === 'lg' && "h-5 w-5", bookmarked && "fill-primary")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{bookmarked ? 'Remove from Bookmarks' : 'Add to Bookmarks'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
