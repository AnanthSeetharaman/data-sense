
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SourceIcon } from './SourceIcon';
import { BookmarkButton } from './BookmarkButton';
import type { DataAsset } from '@/lib/types';
import { Users, Tag, Calendar, Database, Layers, Share2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DataAssetCardProps {
  asset: DataAsset;
}

export function DataAssetCard({ asset }: DataAssetCardProps) {
  const { id, source, name, location, columnCount, description, tags, lastModified, owner } = asset;

  const formattedLastModified = lastModified
    ? formatDistanceToNow(new Date(lastModified), { addSuffix: true })
    : 'N/A';

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 mb-2">
            <SourceIcon source={source} className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg font-semibold leading-tight break-all">{name}</CardTitle>
          </div>
          <BookmarkButton assetId={id} />
        </div>
        <CardDescription className="text-xs text-muted-foreground break-all">{location}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-2 pb-3">
        <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
          {description || 'No description available.'}
        </p>
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
          {tags.length > 3 && <Badge variant="outline" className="text-xs">+{tags.length - 3} more</Badge>}
        </div>
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>{columnCount} columns</span>
          </div>
          {owner && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Owner: {owner}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last modified: {formattedLastModified}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t">
        <div className="flex w-full justify-between items-center gap-2">
          <Link href={`/datasets/${id}`} passHref legacyBehavior>
            <Button variant="default" size="sm" className="flex-1">
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Button>
          </Link>
          {/* Share button removed from here */}
        </div>
      </CardFooter>
    </Card>
  );
}
