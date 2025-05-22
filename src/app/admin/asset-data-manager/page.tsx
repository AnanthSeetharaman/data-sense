
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, FileSpreadsheet, UploadCloud, Download, AlertTriangle, DatabaseZap, List } from 'lucide-react';
import { fetchAndParseCsv, convertToCsvString } from '@/lib/csv-utils';
import { useToast } from "@/hooks/use-toast";

const DB_MOCK_CSV_FILES = [
  { name: 'Users (users.csv)', path: '/db_mock_data/users.csv' },
  { name: 'Data Assets (data_assets.csv)', path: '/db_mock_data/data_assets.csv' },
  { name: 'Column Schemas (column_schemas.csv)', path: '/db_mock_data/column_schemas.csv' },
  { name: 'Tags (tags.csv)', path: '/db_mock_data/tags.csv' },
  { name: 'Data Asset Tags (data_asset_tags.csv)', path: '/db_mock_data/data_asset_tags.csv' },
  { name: 'Business Glossary Terms (business_glossary_terms.csv)', path: '/db_mock_data/business_glossary_terms.csv' },
  { name: 'Data Asset Business Glossary Terms (data_asset_business_glossary_terms.csv)', path: '/db_mock_data/data_asset_business_glossary_terms.csv' },
  { name: 'Data Asset Lineage (data_asset_lineage_raw.csv)', path: '/db_mock_data/data_asset_lineage_raw.csv' },
  { name: 'Bookmarked Data Assets (bookmarked_data_assets.csv)', path: '/db_mock_data/bookmarked_data_assets.csv' },
];


export default function AssetDataManagerPage() {
  const [selectedCsvPath, setSelectedCsvPath] = useState<string | null>(null);
  const [currentCsvData, setCurrentCsvData] = useState<Record<string, any>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();


  useEffect(() => {
    if (selectedCsvPath) {
      loadDbMockCsvData(selectedCsvPath);
    } else {
        setCurrentCsvData(null); 
    }
  }, [selectedCsvPath]);

  const loadDbMockCsvData = async (csvPath: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAndParseCsv(csvPath); 
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
        setError(`Encountered ${result.errors.length} parsing error(s). Some data might be incorrect. Check console.`);
      }
      setCurrentCsvData(result.data);
    } catch (err: any) {
      console.error('Failed to load or parse CSV data:', err);
      setError(err.message || 'Failed to load or parse CSV data. Ensure the file exists at ' + csvPath + ' and is valid.');
      setCurrentCsvData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!currentCsvData || currentCsvData.length === 0 || !selectedCsvPath) {
      toast({ title: "No Data", description: "No data to download or no CSV selected.", variant: "destructive" });
      return;
    }
    const selectedFile = DB_MOCK_CSV_FILES.find(f => f.path === selectedCsvPath);
    const fileName = selectedFile ? selectedFile.name.split(' (')[0].toLowerCase().replace(/ /g, '_') + '.csv' : 'db_mock_data.csv';
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
    // Reset file input to allow re-uploading the same file name
    event.target.value = ''; 
  };

  const headers = currentCsvData && currentCsvData.length > 0 
                  ? Object.keys(currentCsvData[0]) 
                  : [];


  return (
    <div className="container mx-auto py-8 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <List className="mr-3 h-8 w-8 text-primary" /> {/* Changed icon */}
          Admin: Database Mock CSV Manager
        </h1>
        <p className="text-muted-foreground">
          View, download, and (simulate) upload database mock CSVs located in `/public/db_mock_data/`.
        </p>
         <Alert variant="default" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Developer Note</AlertTitle>
            <AlertDescription>
              This page allows management of the CSV files that mock the database tables (e.g., `users.csv`, `data_assets.csv`).
              These files are located in `/public/db_mock_data/`.
              CSV uploads are client-side only and are not persisted to the server.
            </AlertDescription>
          </Alert>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Select Database Mock CSV to Manage</CardTitle>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-4"> {/* Added flex-wrap */}
            <div className="flex-grow sm:max-w-md">
              <Select onValueChange={setSelectedCsvPath} value={selectedCsvPath || ""} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a CSV file..." />
                </SelectTrigger>
                <SelectContent>
                  {DB_MOCK_CSV_FILES.map(file => (
                    <SelectItem key={file.path} value={file.path}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCsvPath && (
              <>
                <Button onClick={handleDownloadCsv} disabled={isLoading || !currentCsvData || currentCsvData.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Download Displayed CSV
                </Button>
                <div className="relative"> {/* Ensure button and input are siblings for proper styling of input overlay */}
                  <Button asChild variant="outline" disabled={isLoading}>
                    <label htmlFor="csv-upload-db-mock" className="cursor-pointer flex items-center"> {/* Added flex items-center for better icon alignment */}
                      <UploadCloud className="mr-2 h-4 w-4" /> Upload & View New CSV
                    </label>
                  </Button>
                  <Input 
                    id="csv-upload-db-mock" 
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
          {isLoading && !currentCsvData ? ( // More specific loading check
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Loading CSV data...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : selectedCsvPath && currentCsvData ? (
            currentCsvData.length > 0 ? (
              <div className="overflow-x-auto">
                <h3 className="text-lg font-semibold mb-2">
                  Displaying data for: {DB_MOCK_CSV_FILES.find(f => f.path === selectedCsvPath)?.name}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCsvData.slice(0, 20).map((row, rowIndex) => ( // Show first 20 records
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
            ) : ( // Case: CSV is valid and loaded but empty
                <div className="text-center py-10">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No data found in {DB_MOCK_CSV_FILES.find(f => f.path === selectedCsvPath)?.name} or the CSV is empty.
                    </p>
                </div>
            )
          ) : selectedCsvPath ? ( // Case: selectedCsvPath is set, but currentCsvData is null (implies loading failed and error was cleared or didn't set)
             <div className="text-center py-10">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                 <p className="text-muted-foreground">
                  Could not load CSV data for {DB_MOCK_CSV_FILES.find(f => f.path === selectedCsvPath)?.name}.
                </p>
            </div>
          ) : ( // Initial state, no CSV selected
            <div className="text-center py-10">
              <DatabaseZap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a database mock CSV file to view or manage its content.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
