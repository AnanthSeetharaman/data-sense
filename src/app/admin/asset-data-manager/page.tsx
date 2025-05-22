
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import type { DataAsset } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileSpreadsheet, UploadCloud, Download, AlertTriangle, DatabaseZap } from 'lucide-react';
import { fetchAndParseCsv, convertToCsvString } from '@/lib/csv-utils';
import { useToast } from "@/hooks/use-toast";
import { getAllDataAssets } from '@/lib/csv-data-loader'; // Use new data loader


export default function AssetDataManagerPage() {
  const [allAvailableAssets, setAllAvailableAssets] = useState<DataAsset[]>([]);
  const [assetsWithCsvPath, setAssetsWithCsvPath] = useState<DataAsset[]>([]); // Assets that have a csvPath
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentCsvData, setCurrentCsvData] = useState<Record<string, any>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false); // General loading for assets list + CSV data
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadAssets() {
      setIsLoading(true);
      try {
        const assets = await getAllDataAssets();
        setAllAvailableAssets(assets);
        // For this "Asset Data Manager", we assume the 'csvPath' points to a full representation.
        // In a real scenario, this might be a different path or logic.
        setAssetsWithCsvPath(assets.filter(asset => !!asset.csvPath)); 
      } catch (e) {
        setError("Failed to load asset list.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      const asset = allAvailableAssets.find(a => a.id === selectedAssetId);
      // Use the asset.csvPath which currently points to sample data CSVs.
      // For this prototype, we're re-purposing it.
      if (asset?.csvPath) {
        loadFullCsvData(asset.csvPath); 
      } else {
        setCurrentCsvData(null);
        if (asset && !asset.csvPath) {
          setError(`Asset "${asset.name}" does not have a CSV path defined for its full data representation.`);
        }
      }
    } else {
        setCurrentCsvData(null); // Clear data if no asset is selected
    }
  }, [selectedAssetId, allAvailableAssets]);

  const loadFullCsvData = async (csvPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // fetchAndParseCsv fetches from /public, based on the path given
      const result = await fetchAndParseCsv(csvPath); 
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
        setError(`Encountered ${result.errors.length} parsing error(s). Some data might be incorrect. Check console.`);
      }
      setCurrentCsvData(result.data);
    } catch (err) {
      console.error('Failed to load or parse CSV data:', err);
      setError('Failed to load or parse CSV data. Ensure the file exists at ' + csvPath + ' in /public and is valid.');
      setCurrentCsvData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!currentCsvData || currentCsvData.length === 0) {
      toast({ title: "No Data", description: "No data to download.", variant: "destructive" });
      return;
    }
    const asset = allAvailableAssets.find(a => a.id === selectedAssetId);
    const fileName = asset ? `${asset.name}_full_data.csv` : 'full_data.csv';
    const csvString = convertToCsvString(currentCsvData);
    
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
          const Papa = (await import('papaparse')).default;
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              setCurrentCsvData(results.data as Record<string, any>[]);
              if (results.errors.length > 0) {
                 setError(`Uploaded CSV has ${results.errors.length} parsing error(s). Data displayed. Check console.`);
              }
              toast({ title: "CSV Processed", description: "Uploaded CSV data is now displayed. This is a temporary view and does not save the file on the server." });
              setIsLoading(false);
            },
            error: (parseError: Error) => {
              console.error('Error parsing uploaded CSV:', parseError);
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
    event.target.value = ''; 
  };

  const selectedAsset = allAvailableAssets.find(a => a.id === selectedAssetId);
  const headers = currentCsvData && currentCsvData.length > 0 
                  ? Object.keys(currentCsvData[0]) 
                  : selectedAsset?.schema.map(s => s.column_name) ?? [];


  return (
    <div className="container mx-auto py-8 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <DatabaseZap className="mr-3 h-8 w-8 text-primary" />
          Admin: Asset Data Manager (CSV)
        </h1>
        <p className="text-muted-foreground">
          Manage CSV representations of full data assets. (Using sample CSVs for prototype)
        </p>
         <Alert variant="default" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Developer Note</AlertTitle>
            <AlertDescription>
              This page demonstrates managing CSVs that would represent your full datasets.
              For this prototype, it uses the same sample CSVs (referenced by `csvPath`) located in `/public/sample_data/`.
              CSV uploads are client-side only and are not persisted to the server.
            </AlertDescription>
          </Alert>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Select Data Asset (Table) to Manage its Full CSV</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-grow sm:max-w-md">
              <Select onValueChange={setSelectedAssetId} value={selectedAssetId || ""} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a data asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assetsWithCsvPath.length > 0 ? assetsWithCsvPath.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} {asset.csvPath ? `(CSV: ${asset.csvPath})` : '(No CSV path)'}
                    </SelectItem>
                  )) : <SelectItem value="no-assets-csv" disabled>No assets with CSV paths found</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {selectedAssetId && selectedAsset?.csvPath && (
              <>
                <Button onClick={handleDownloadCsv} disabled={isLoading || !currentCsvData || currentCsvData.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Download Displayed CSV
                </Button>
                <div className="relative">
                  <Button asChild variant="outline" disabled={isLoading}>
                    <label htmlFor="csv-upload-asset" className="cursor-pointer">
                      <UploadCloud className="mr-2 h-4 w-4" /> Upload & View New CSV
                    </label>
                  </Button>
                  <Input 
                    id="csv-upload-asset" 
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
          {isLoading && !currentCsvData ? ( // Show main loading indicator
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
          ) : selectedAssetId && currentCsvData ? (
            currentCsvData.length > 0 ? (
              <div className="overflow-x-auto">
                <h3 className="text-lg font-semibold mb-2">Displaying CSV data for: {selectedAsset?.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCsvData.slice(0, 20).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {headers.map(header => (
                          <TableCell key={`${rowIndex}-${header}`}>{String(row[header] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {currentCsvData.length > 20 && <p className="text-sm text-muted-foreground mt-2">Showing first 20 of {currentCsvData.length} records from CSV.</p>}
              </div>
            ) : ( // CSV loaded but is empty
                <div className="text-center py-10">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No data found in the CSV or the CSV is empty for {selectedAsset?.name}.</p>
                </div>
            )
          ) : selectedAssetId ? ( // Asset selected, but CSV path might be missing or data not loaded
             <div className="text-center py-10">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                 <p className="text-muted-foreground">
                  {selectedAsset?.csvPath ? `Could not load CSV data for ${selectedAsset.name}.` : `No CSV path defined for ${selectedAsset.name} to manage its full data.`}
                </p>
            </div>
          ) : ( // No asset selected
            <div className="text-center py-10">
              <DatabaseZap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a data asset to manage its CSV representation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
