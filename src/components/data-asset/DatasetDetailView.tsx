
"use client";

import type { DataAsset, ColumnSchema, RawLineageEntry } from '@/lib/types';
import { useState, useEffect }from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceIcon } from './SourceIcon';
import { BookmarkButton } from './BookmarkButton';
import { AITagSuggester } from './AITagSuggester';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowLeft, Calendar, ClipboardCopy, Database, FileText, Layers, LinkIcon, Loader2, Lock, MapPin, MessageSquare, Share2, Tag, Users, Info, Check, FileSpreadsheet, GitFork } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { fetchAndParseCsv, type ParseCsvResult } from '@/lib/csv-utils';


interface DatasetDetailViewProps {
  asset: DataAsset | null; 
}

type SampleDataSource = 'pg' | 'csv';

export function DatasetDetailView({ asset: initialAsset }: DatasetDetailViewProps) {
  const [asset, setAsset] = useState(initialAsset);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(!initialAsset); // True if no initial asset
  const [sampleDataSource, setSampleDataSource] = useState<SampleDataSource>('pg');
  const [csvSampleData, setCsvSampleData] = useState<Record<string, any>[] | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAsset) {
        setAsset(initialAsset);
        setIsLoading(false);
        // Reset CSV specific states if asset changes
        if (initialAsset.id !== asset?.id) {
            setCsvSampleData(null);
            setCsvError(null);
            setSampleDataSource('pg'); // Default back to PG
        }
    } else {
        // If initialAsset is null (e.g. not found), keep loading true for a bit then show error
        const timer = setTimeout(() => {
             setIsLoading(false); 
        }, 1000); // Give a small delay before showing "Not Found"
        return () => clearTimeout(timer);
    }
  }, [initialAsset, asset?.id]);

  useEffect(() => {
    if (sampleDataSource === 'csv' && asset?.csvPath && !csvSampleData && !csvLoading && !csvError) {
      const loadCsvData = async () => {
        setCsvLoading(true);
        setCsvError(null);
        try {
          const result = await fetchAndParseCsv(asset.csvPath!);
          if (result.errors.length > 0) {
            console.warn('CSV parsing errors:', result.errors);
            setCsvError(`Encountered ${result.errors.length} parsing error(s). Check console for details.`);
          }
          setCsvSampleData(result.data);
        } catch (error) {
          console.error('Failed to load or parse CSV data:', error);
          setCsvError('Failed to load or parse CSV data. See console for details.');
          setCsvSampleData(null);
        } finally {
          setCsvLoading(false);
        }
      };
      loadCsvData();
    }
  }, [sampleDataSource, asset, csvSampleData, csvLoading, csvError]);


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
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Discover
          </Link>
        </Button>
      </div>
    );
  }

  const handleAddTag = (tagValue: string) => {
    const tagToAdd = tagValue.trim();
    if (tagToAdd && !asset.tags.map(t => t.toLowerCase()).includes(tagToAdd.toLowerCase())) {
      // In a real app, this would be an API call. For now, update local state.
      setAsset(prev => prev ? { ...prev, tags: [...prev.tags, tagToAdd] } : null);
      toast({ title: "Tag Added (Prototype)", description: `"${tagToAdd}" has been added locally.` });
    } else if (!tagToAdd) {
       toast({ variant: "destructive", title: "Invalid Tag", description: "Tag cannot be empty." });
    } else {
       toast({ variant: "default", title: "Tag Exists", description: `"${tagToAdd}" is already added.` });
    }
    setNewTag(''); 
  };

  const handleRemoveTag = (tagToRemove: string) => {
    // In a real app, this would be an API call.
    setAsset(prev => prev ? { ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) } : null);
    toast({ title: "Tag Removed (Prototype)", description: `"${tagToRemove}" has been removed locally.` });
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

  const currentDisplaySampleData = sampleDataSource === 'csv' ? csvSampleData : asset.pgMockedSampleData;

  const lineageTableHeaders: (keyof RawLineageEntry)[] = [
    "REFERENCED_OBJECT_NAME", "REFERENCED_DATABASE", "REFERENCED_SCHEMA", "REFERENCED_OBJECT_DOMAIN", "DEPENDENCY_TYPE",
    "REFERENCING_OBJECT_NAME", "REFERENCING_DATABASE", "REFERENCING_SCHEMA", "REFERENCING_OBJECT_DOMAIN"
  ];


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
          <TabsTrigger value="lineage"><GitFork className="mr-1 h-4 w-4 sm:mr-2"/>Lineage & Query</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Key Information</h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                  <li><span className="font-medium">Columns:</span> {asset.columnCount}</li>
                  {asset.sampleRecordCount != null && <li><span className="font-medium">Total Sample Records (approx):</span> {asset.sampleRecordCount.toLocaleString()}</li>}
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
                    <TableRow key={col.column_name}>
                      <TableCell className="font-medium">{col.column_name}</TableCell>
                      <TableCell>{col.data_type}</TableCell>
                      <TableCell>{col.is_nullable ? 'Yes' : 'No'}</TableCell>
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
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Sample Data</CardTitle>
                        <div className="w-[220px]">
                            <Select value={sampleDataSource} onValueChange={(value) => setSampleDataSource(value as SampleDataSource)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select sample source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pg">
                                  <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4" /> PostgreSQL (Mocked)
                                  </div>
                                </SelectItem>
                                {asset.csvPath && ( // Only show CSV option if path exists
                                  <SelectItem value="csv">
                                    <div className="flex items-center gap-2">
                                      <FileSpreadsheet className="h-4 w-4" /> Local CSV
                                    </div>
                                  </SelectItem>
                                )}
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                {(sampleDataSource === 'csv' && csvLoading) ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                        <p className="text-muted-foreground">Loading CSV data...</p>
                    </div>
                ) : (sampleDataSource === 'csv' && csvError) ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error Loading CSV</AlertTitle>
                        <AlertDescription>{csvError}</AlertDescription>
                    </Alert>
                ) : (currentDisplaySampleData && currentDisplaySampleData.length > 0) ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                {Object.keys(currentDisplaySampleData[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                                ))}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {currentDisplaySampleData.slice(0, 10).map((row, rowIndex) => ( 
                                <TableRow key={rowIndex}>
                                {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex}>{String(value ?? '')}</TableCell>
                                ))}
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                         {currentDisplaySampleData.length > 10 && <p className="text-sm text-muted-foreground mt-2">Showing 10 of {currentDisplaySampleData.length} sample records from {sampleDataSource === 'csv' ? 'CSV' : 'PG (Mocked)'}.</p>}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Database className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            {sampleDataSource === 'csv' && !asset.csvPath 
                                ? "No CSV file associated with this asset for sample data."
                                : `Sample data is not available for this asset from the selected source (${sampleDataSource === 'csv' ? 'CSV' : 'PG (Mocked)'}).`
                            }
                        </p>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="lineage">
          <div className="grid md:grid-cols-1 gap-6"> {/* Changed to 1 column for better lineage display */}
            <Card>
                <CardHeader><CardTitle>Lineage</CardTitle></CardHeader>
                <CardContent>
                {(asset.lineage && asset.lineage.length > 0) ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {lineageTableHeaders.map(header => (
                            <TableHead key={header}>{header.replace(/_/g, ' ')}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {asset.lineage.map((entry, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {lineageTableHeaders.map(header => (
                              <TableCell key={`${rowIndex}-${header}`}>{String(entry[header] ?? '-')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                      <GitFork className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Lineage information is not available for this asset.</p>
                  </div>
                )}
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
