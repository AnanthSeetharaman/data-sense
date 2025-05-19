
"use client";

import type { DataAsset, ColumnSchema } from '@/lib/types';
import { useState, useEffect }from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceIcon } from './SourceIcon';
import { BookmarkButton } from './BookmarkButton';
import { AITagSuggester } from './AITagSuggester';
import { AlertTriangle, ArrowLeft, Calendar, ClipboardCopy, Database, FileText, Layers, LinkIcon, Loader2, Lock, MapPin, MessageSquare, Share2, Tag, Users, Info, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

interface DatasetDetailViewProps {
  asset: DataAsset | null; // Allow null for loading/not found state
}

export function DatasetDetailView({ asset: initialAsset }: DatasetDetailViewProps) {
  const [asset, setAsset] = useState(initialAsset);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(!initialAsset); // True if initialAsset is null

  useEffect(() => {
    // This effect handles updates to the asset if props change, or initial loading
    if (initialAsset) {
        setAsset(initialAsset);
        setIsLoading(false);
    } else {
        // If initialAsset is null and stays null, it implies loading or not found.
        // A small delay to show loading, then switch to not found if still null.
        const timer = setTimeout(() => {
            if (!asset) setIsLoading(false); // Stop loading, will show "not found"
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [initialAsset, asset]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading dataset details...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Dataset Not Found</h2>
        <p className="text-muted-foreground">The requested data asset could not be found.</p>
        <Button variant="outline" className="mt-6" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const handleAddTag = (tagValue: string) => {
    const tagToAdd = tagValue.trim();
    if (tagToAdd && !asset.tags.map(t => t.toLowerCase()).includes(tagToAdd.toLowerCase())) {
      setAsset(prev => prev ? { ...prev, tags: [...prev.tags, tagToAdd] } : null);
      toast({ title: "Tag Added", description: `"${tagToAdd}" has been added.` });
    } else if (!tagToAdd) {
       toast({ variant: "destructive", title: "Invalid Tag", description: "Tag cannot be empty." });
    } else {
       toast({ variant: "default", title: "Tag Exists", description: `"${tagToAdd}" is already added.` });
    }
    setNewTag(''); // Clear input after adding
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setAsset(prev => prev ? { ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) } : null);
    toast({ title: "Tag Removed", description: `"${tagToRemove}" has been removed.` });
  };
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${type} Copied!`,
        description: `${text} copied to clipboard.`,
        action: <Check className="h-5 w-5 text-green-500" />,
      });
    }).catch(err => {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: `Could not copy ${type.toLowerCase()}: ${err.message}`,
      });
    });
  };


  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <SourceIcon source={asset.source} className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold">{asset.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5"/> {asset.location}
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(asset.location, "Location")}>
                      <ClipboardCopy className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                   </Button>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
                {/* Share button removed from here */}
                <BookmarkButton assetId={asset.id} size="default" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-foreground leading-relaxed mb-6">{asset.description}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
          <TabsTrigger value="overview"><Info className="mr-1 h-4 w-4 sm:mr-2"/>Overview</TabsTrigger>
          <TabsTrigger value="schema"><Layers className="mr-1 h-4 w-4 sm:mr-2"/>Schema</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="mr-1 h-4 w-4 sm:mr-2"/>Tags</TabsTrigger>
          <TabsTrigger value="sample"><Database className="mr-1 h-4 w-4 sm:mr-2"/>Sample Data</TabsTrigger>
          <TabsTrigger value="lineage"><FileText className="mr-1 h-4 w-4 sm:mr-2"/>Lineage & Query</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Key Information</h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                  <li><span className="font-medium">Columns:</span> {asset.columnCount}</li>
                  {asset.sampleRecordCount && <li><span className="font-medium">Sample Records:</span> {asset.sampleRecordCount.toLocaleString()}</li>}
                  {asset.owner && <li><span className="font-medium">Owner:</span> {asset.owner}</li>}
                  {asset.lastModified && <li><span className="font-medium">Last Modified:</span> {format(new Date(asset.lastModified), 'PPP p')}</li>}
                  {asset.isSensitive && <li className="flex items-center"><Lock className="h-4 w-4 mr-1 text-destructive" /> <span className="font-medium text-destructive">Contains Sensitive Data</span></li>}
                </ul>
              </div>
              {asset.businessGlossaryTerms && asset.businessGlossaryTerms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Business Glossary Terms</h3>
                  <div className="flex flex-wrap gap-2">
                    {asset.businessGlossaryTerms.map(term => <Badge key={term} variant="outline">{term}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema">
          <Card>
            <CardHeader><CardTitle>Schema Details</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column Name</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Nullable</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asset.schema.map((col: ColumnSchema) => (
                    <TableRow key={col.name}>
                      <TableCell className="font-medium">{col.name}</TableCell>
                      <TableCell>{col.type}</TableCell>
                      <TableCell>{col.nullable ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-muted-foreground">{col.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader><CardTitle>Tags Management</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Current Tags:</h4>
                {asset.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-sm py-1 px-2">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-muted-foreground hover:text-destructive">&times;</button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags yet.</p>
                )}
              </div>
              <div className="flex gap-2 items-center mb-4">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add new tag"
                  className="max-w-xs"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag(newTag)}
                />
                <Button onClick={() => handleAddTag(newTag)} size="sm">Add Tag</Button>
              </div>
              <AITagSuggester
                datasetName={asset.name}
                rawSchemaForAI={asset.rawSchemaForAI}
                currentTags={asset.tags}
                onAddTag={handleAddTag}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sample">
             <Card>
                <CardHeader><CardTitle>Sample Data</CardTitle></CardHeader>
                <CardContent>
                {asset.sampleData && asset.sampleData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                {Object.keys(asset.sampleData[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                                ))}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {asset.sampleData.slice(0, 5).map((row, rowIndex) => ( // Limit to 5 rows for preview
                                <TableRow key={rowIndex}>
                                {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex}>{String(value)}</TableCell>
                                ))}
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                         {asset.sampleData.length > 5 && <p className="text-sm text-muted-foreground mt-2">Showing 5 of {asset.sampleData.length} sample records.</p>}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Database className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Sample data is not available for this asset.</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="lineage">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Lineage</CardTitle></CardHeader>
                <CardContent>
                <div className="text-center py-6">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Lineage information is not yet available.</p>
                    <p className="text-xs text-muted-foreground">(Upstream/downstream datasets will be shown here)</p>
                </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Example Query</CardTitle></CardHeader>
                <CardContent>
                {asset.rawQuery ? (
                  <>
                    <Textarea readOnly value={asset.rawQuery} className="h-32 font-mono text-xs bg-muted/50" />
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(asset.rawQuery!, "Query")}>
                      <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Query
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                      <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No example query provided.</p>
                  </div>
                )}
                </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
