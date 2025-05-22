
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { mockDataAssets } from '@/lib/mock-data';
import type { DataAsset } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileCsv, UploadCloud, Download, AlertTriangle, Settings } from 'lucide-react';
import { fetchAndParseCsv, convertToCsvString, type ParseCsvResult } from '@/lib/csv-utils';
import { useToast } from "@/hooks/use-toast";

export default function AdminSampleViewerPage() {
  const [assetsWithCsv, setAssetsWithCsv] = useState<DataAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentSampleData, setCurrentSampleData] = useState<Record<string, any>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setAssetsWithCsv(mockDataAssets.filter(asset => !!asset.csvPath && !!asset.sampleData)); // Ensure it has sample data for headers if CSV is empty
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      const asset = assetsWithCsv.find(a => a.id === selectedAssetId);
      if (asset?.csvPath) {
        loadCsvData(asset.csvPath);
      } else {
        setCurrentSampleData(null);
      }
    }
  }, [selectedAssetId, assetsWithCsv]);

  const loadCsvData = async (csvPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAndParseCsv(csvPath);
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
        setError(`Encountered ${result.errors.length} parsing error(s). Some data might be incorrect. Check console.`);
      }
      setCurrentSampleData(result.data);
    } catch (err) {
      console.error('Failed to load or parse CSV data:', err);
      setError('Failed to load or parse CSV data. Ensure the file exists in /public' + csvPath + ' and is valid.');
      setCurrentSampleData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!currentSampleData || currentSampleData.length === 0) {
      toast({ title: "No Data", description: "No data to download.", variant: "destructive" });
      return;
    }
    const asset = assetsWithCsv.find(a => a.id === selectedAssetId);
    const fileName = asset ? `${asset.name}_sample.csv` : 'sample_data.csv';
    const csvString = convertToCsvString(currentSampleData);
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${fileName} is being downloaded.` });
    } else {
       toast({ title: "Download Failed", description: "Browser does not support this download method.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          // Simulating fetchAndParseCsv structure for consistency
          const Papa = (await import('papaparse')).default;
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              setCurrentSampleData(results.data as Record<string, any>[]);
              if (results.errors.length > 0) {
                 setError(`Uploaded CSV has ${results.errors.length} parsing error(s). Data displayed. Check console.`);
              }
              toast({ title: "CSV Processed", description: "Uploaded CSV data is now displayed. This is a temporary view and does not save the file on the server." });
              setIsLoading(false);
            },
            error: (error: Error) => {
              console.error('Error parsing uploaded CSV:', error);
              setError('Error parsing uploaded CSV.');
              setIsLoading(false);
            }
          });
        };
        reader.readAsText(file);
      } catch (err) {
        console.error('Failed to upload or parse CSV data:', err);
        setError('Failed to upload or parse CSV data.');
        setIsLoading(false);
      }
    }
     // Reset file input to allow uploading the same file again
    event.target.value = '';
  };

  const selectedAsset = assetsWithCsv.find(a => a.id === selectedAssetId);
  const headers = currentSampleData && currentSampleData.length > 0 
                  ? Object.keys(currentSampleData[0]) 
                  : selectedAsset?.schema.map(s => s.name) ?? [];


  return (
    <div className="container mx-auto py-8 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <Settings className="mr-3 h-8 w-8 text-primary" />
          Admin: Sample CSV Viewer & Manager
        </h1>
        <p className="text-muted-foreground">
          View, download, and (simulate) upload sample data CSVs for data assets.
        </p>
         <Alert variant="default" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Developer Note</AlertTitle>
            <AlertDescription>
              CSV uploads are client-side only for this prototype. Changes are not persisted to the server.
              Original CSVs are located in the `/public/sample_data/` directory.
            </AlertDescription>
          </Alert>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Select Data Asset (Table)</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-grow sm:max-w-md">
              <Select onValueChange={setSelectedAssetId} value={selectedAssetId || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assetsWithCsv.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.csvPath})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAssetId && (
              <>
                <Button onClick={handleDownloadCsv} disabled={isLoading || !currentSampleData || currentSampleData.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Download Displayed CSV
                </Button>
                <div className="relative">
                  <Button asChild variant="outline" disabled={isLoading}>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <UploadCloud className="mr-2 h-4 w-4" /> Upload & View New CSV
                    </label>
                  </Button>
                  <Input 
                    id="csv-upload" 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Loading data...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : selectedAssetId && currentSampleData ? (
            currentSampleData.length > 0 ? (
              <div className="overflow-x-auto">
                <h3 className="text-lg font-semibold mb-2">Displaying sample data for: {selectedAsset?.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSampleData.slice(0, 20).map((row, rowIndex) => ( // Show up to 20 rows
                      <TableRow key={rowIndex}>
                        {headers.map(header => (
                          <TableCell key={`${rowIndex}-${header}`}>{String(row[header] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {currentSampleData.length > 20 && <p className="text-sm text-muted-foreground mt-2">Showing 20 of {currentSampleData.length} sample records.</p>}
              </div>
            ) : (
                <div className="text-center py-10">
                    <FileCsv className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No sample data found in the CSV or the CSV is empty for {selectedAsset?.name}.</p>
                </div>
            )
          ) : selectedAssetId ? (
             <div className="text-center py-10">
                <FileCsv className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Could not load data for {selectedAsset?.name}.</p>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileCsv className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a data asset to view its sample CSV data.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
