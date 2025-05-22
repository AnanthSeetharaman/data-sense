
"use client";

import type { DataAsset, ColumnSchema, RawLineageEntry } from '@/lib/types';
import { useState, useEffect, useCallback }from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceIcon } from './SourceIcon';
import { BookmarkButton } from './BookmarkButton';
import { AITagSuggester } from './AITagSuggester';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowLeft, Calendar, ClipboardCopy, Database, FileText, Layers, LinkIcon, Loader2, Lock, MapPin, MessageSquare, Share2, Tag, Users, Info, Check, FileSpreadsheet, GitFork, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
// fetchAndParseCsv is for client-side public CSVs, not used for API calls here.
// import { fetchAndParseCsv } from '@/lib/csv-utils'; 
import { useDataSource } from '@/contexts/DataSourceContext'; 

interface DatasetDetailViewProps {
  initialAsset: DataAsset | null; // Asset data fetched server-side
  assetId: string; // The raw ID from URL, e.g. "db.schema.table"
}

export function DatasetDetailView({ initialAsset, assetId }: DatasetDetailViewProps) {
  const [asset, setAsset] = useState<DataAsset | null>(initialAsset);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(!initialAsset); // True if initialAsset is null
  
  // const { preferredSampleSource } = useDataSource(); // Not directly used here anymore for data source, but for warning
  
  const [sampleData, setSampleData] = useState<Record<string, any>[] | null>(null);
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataError, setSampleDataError] = useState<string | null>(null);

  const [lineageData, setLineageData] = useState<RawLineageEntry[] | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showSampleDataWarningDialog, setShowSampleDataWarningDialog] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);

  const apiAssetIdParts = assetId.split('.');
  const apiBaseUrl = `/api/snowflake-assets`;


  const fetchSampleData = useCallback(async () => {
    if (apiAssetIdParts.length < 3) {
      setSampleDataError("Invalid asset ID for fetching sample data.");
      return;
    }
    const [db, schema, table] = [apiAssetIdParts.slice(0,-2).join('.'), apiAssetIdParts[apiAssetIdParts.length-2], apiAssetIdParts[apiAssetIdParts.length-1]];


    setSampleDataLoading(true);
    setSampleDataError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/sample/${db}/${schema}/${table}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(err.error || `Failed to fetch sample data`);
      }
      const data = await response.json();
      setSampleData(data);
    } catch (error: any) {
      setSampleDataError(error.message || 'Failed to load sample data.');
      setSampleData(null);
    } finally {
      setSampleDataLoading(false);
    }
  }, [assetId, apiBaseUrl, apiAssetIdParts]);

  const fetchLineageData = useCallback(async () => {
     if (apiAssetIdParts.length < 3) {
      setLineageError("Invalid asset ID for fetching lineage data.");
      return;
    }
    const [db, schema, table] = [apiAssetIdParts.slice(0,-2).join('.'), apiAssetIdParts[apiAssetIdParts.length-2], apiAssetIdParts[apiAssetIdParts.length-1]];

    setLineageLoading(true);
    setLineageError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/lineage/${db}/${schema}/${table}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(err.error || `Failed to fetch lineage data`);
      }
      const data = await response.json();
      setLineageData(data);
    } catch (error: any) {
      setLineageError(error.message || 'Failed to load lineage data.');
      setLineageData(null);
    } finally {
      setLineageLoading(false);
    }
  }, [assetId, apiBaseUrl, apiAssetIdParts]);


  useEffect(() => {
    setAsset(initialAsset);
    setIsLoading(!initialAsset);
    // Reset tab-specific data if asset changes
    if (initialAsset && initialAsset.id !== asset?.id) {
      setSampleData(null);
      setSampleDataError(null);
      setLineageData(null);
      setLineageError(null);
      setActiveTab('overview'); 
    }
  }, [initialAsset, asset?.id]);

  useEffect(() => {
    if (activeTab === 'sample' && !sampleData && !sampleDataLoading && !sampleDataError && asset) {
      // fetchSampleData(); // Now called after warning confirmation
    }
    if (activeTab === 'lineage' && !lineageData && !lineageLoading && !lineageError && asset) {
      fetchLineageData();
    }
  }, [activeTab, sampleData, sampleDataLoading, sampleDataError, lineageData, lineageLoading, lineageError, asset, fetchSampleData, fetchLineageData]);


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
        <p className="text-muted-foreground">The requested data asset could not be found or loaded.</p>
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
      setAsset(prev => prev ? { ...prev, tags: [...prev.tags, tagToAdd] } : null);
      toast({ title: "Tag Added (Prototype)", description: `"${tagToAdd}" has been added locally. Persistence not implemented.` });
    } else if (!tagToAdd) {
       toast({ variant: "destructive", title: "Invalid Tag", description: "Tag cannot be empty." });
    } else {
       toast({ variant: "default", title: "Tag Exists", description: `"${tagToAdd}" is already added.` });
    }
    setNewTag(''); 
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setAsset(prev => prev ? { ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) } : null);
    toast({ title: "Tag Removed (Prototype)", description: `"${tagToRemove}" has been removed locally. Persistence not implemented.` });
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

  const handleTabChange = (newTabValue: string) => {
    if (newTabValue === 'sample' && !sampleData && !sampleDataLoading && !sampleDataError) {
        setPendingTabChange(newTabValue);
        setShowSampleDataWarningDialog(true);
    } else {
        setActiveTab(newTabValue);
    }
  };

  const handleProceedWithSampleData = () => {
    if (pendingTabChange === 'sample') {
        setActiveTab('sample');
        fetchSampleData(); // Fetch data after confirmation
    }
    setShowSampleDataWarningDialog(false);
    setPendingTabChange(null);
  };

  const handleCancelSampleData = () => {
    setShowSampleDataWarningDialog(false);
    setPendingTabChange(null);
  };
  
  const lineageTableHeaders: (keyof RawLineageEntry)[] = [
    "REFERENCED_OBJECT_ID", "REFERENCED_OBJECT_DOMAIN", "DEPENDENCY_TYPE",
    "REFERENCING_OBJECT_ID", "REFERENCING_OBJECT_DOMAIN"
  ];

  return (
    <div className="space-y-6">
      <AlertDialog open={showSampleDataWarningDialog} onOpenChange={setShowSampleDataWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-amber-500" />
              Confirm: Load Sample Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Loading sample data involves a live query to Snowflake which can be a costly and time-consuming process. 
              Are you sure you want to proceed? (Max 5 records will be fetched)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSampleData}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithSampleData} className="bg-primary hover:bg-primary/90">
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <p className="text-foreground leading-relaxed mb-6">{asset.description || "No description available."}</p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
          <TabsTrigger value="overview"><Info className="mr-1 h-4 w-4 sm:mr-2"/>Overview</TabsTrigger>
          <TabsTrigger value="schema"><Layers className="mr-1 h-4 w-4 sm:mr-2"/>Schema</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="mr-1 h-4 w-4 sm:mr-2"/>Tags</TabsTrigger>
          <TabsTrigger value="sample"><Database className="mr-1 h-4 w-4 sm:mr-2"/>Sample Data</TabsTrigger>
          <TabsTrigger value="lineage"><GitFork className="mr-1 h-4 w-4 sm:mr-2"/>Lineage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">Key Information</h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                  <li><span className="font-medium">Columns:</span> {asset.columnCount}</li>
                  {asset.sampleRecordCount != null && <li><span className="font-medium">Total Records (approx):</span> {asset.sampleRecordCount.toLocaleString()}</li>}
                  {asset.owner && <li><span className="font-medium">Owner:</span> {asset.owner}</li>}
                  {asset.lastModified && <li><span className="font-medium">Last Modified:</span> {format(new Date(asset.lastModified), 'PPP p')}</li>}
                  {asset.created_at && <li><span className="font-medium">Created At:</span> {format(new Date(asset.created_at), 'PPP p')}</li>}
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
              {asset.schema && asset.schema.length > 0 ? (
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
              ) : (
                 <p className="text-muted-foreground">Schema information is not available for this asset.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader><CardTitle>Tags Management</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Current Tags:</h4>
                {asset.tags && asset.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-sm py-1 px-2">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-muted-foreground hover:text-destructive">&times;</button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags applied. (Tags from Snowflake are not currently fetched).</p>
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
                rawSchemaForAI={asset.rawSchemaForAI || ""}
                currentTags={asset.tags || []}
                onAddTag={handleAddTag}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sample">
             <Card>
                <CardHeader>
                    <CardTitle>Sample Data (Live from Snowflake - Max 5 Records)</CardTitle>
                </CardHeader>
                <CardContent>
                {sampleDataLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                        <p className="text-muted-foreground">Loading sample data from Snowflake...</p>
                    </div>
                ) : sampleDataError ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error Loading Sample Data</AlertTitle>
                        <AlertDescription>{sampleDataError}</AlertDescription>
                    </Alert>
                ) : (sampleData && sampleData.length > 0) ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                {Object.keys(sampleData[0]).map(key => (
                                <TableHead key={key}>{key}</TableHead>
                                ))}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {sampleData.map((row, rowIndex) => ( 
                                <TableRow key={rowIndex}>
                                {Object.values(row).map((value, cellIndex) => (
                                    <TableCell key={cellIndex}>{String(value ?? '')}</TableCell>
                                ))}
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                         {sampleData.length >= 5 && <p className="text-sm text-muted-foreground mt-2">Showing first 5 sample records from Snowflake.</p>}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Database className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                           No sample data returned from Snowflake or tab not yet activated. Click "Get Samples" if warning was shown.
                        </p>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="lineage">
            <Card>
                <CardHeader><CardTitle>Lineage (from SNOWFLAKE.ACCOUNT_USAGE.OBJECT_DEPENDENCIES)</CardTitle></CardHeader>
                <CardContent>
                {lineageLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                        <p className="text-muted-foreground">Loading lineage data from Snowflake...</p>
                    </div>
                ) : lineageError ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error Loading Lineage Data</AlertTitle>
                        <AlertDescription>{lineageError}</AlertDescription>
                    </Alert>
                ) : (lineageData && lineageData.length > 0) ? (
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
                        {lineageData.map((entry, rowIndex) => (
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
                      <p className="text-muted-foreground">No lineage information found for this asset in Snowflake's OBJECT_DEPENDENCIES view, or the view is not accessible.</p>
                  </div>
                )}
                </CardContent>
            </Card>
             <Card className="mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
