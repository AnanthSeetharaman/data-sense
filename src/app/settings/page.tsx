
"use client";

import { useState } from 'react';
import { Settings as SettingsIcon, Save, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRegion, REGIONS, type Region } from '@/contexts/RegionContext';
import { testDatabaseConnection } from '@/app/actions'; // Import the server action
import { Loader2 } from 'lucide-react';

type SnowflakeUrlConfigs = {
  [key in Exclude<Region, 'GLOBAL'>]?: string;
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { currentRegion } = useRegion();
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  
  const initialUrlConfigs: SnowflakeUrlConfigs = REGIONS.reduce((acc, region) => {
    if (region !== 'GLOBAL') {
      acc[region] = '';
    }
    return acc;
  }, {} as SnowflakeUrlConfigs);
  
  const [snowflakeUrls, setSnowflakeUrls] = useState<SnowflakeUrlConfigs>(initialUrlConfigs);

  const handleUrlChange = (region: Exclude<Region, 'GLOBAL'>, value: string) => {
    setSnowflakeUrls(prev => ({ ...prev, [region]: value }));
  };

  const handleSaveChanges = () => {
    // In a real app, this would save to a backend or localStorage.
    console.log("Simulating save of Snowflake URLs:", snowflakeUrls);
    toast({
      title: "Settings Saved (Simulated)",
      description: "Snowflake URL configurations have been 'saved'. (Prototype only)",
    });
  };

  const handleTestConnection = async () => {
    setIsLoadingTest(true);
    if (currentRegion === 'GLOBAL') {
      toast({
        title: "Action Needed",
        description: "Please select a specific region (EU, NA, APAC, CALATAM) from the global dropdown to test its configured Snowflake URL. For PostgreSQL, connection details are taken from .env file.",
        variant: "default",
      });
      // As an alternative, you could decide to test PostgreSQL here if region is GLOBAL
      // const pgResult = await testDatabaseConnection({ region: 'GLOBAL', sourceType: 'PostgreSQL' });
      // toast({ title: pgResult.message, description: pgResult.details, variant: pgResult.success ? "default" : "destructive"});
      setIsLoadingTest(false);
      return;
    }

    const urlToTest = snowflakeUrls[currentRegion as Exclude<Region, 'GLOBAL'>];

    if (!urlToTest || urlToTest.trim() === '') {
      toast({
        title: "Configuration Missing",
        description: `No Snowflake URL configured for region ${currentRegion} on this page. Please enter a URL.`,
        variant: "destructive",
      });
      setIsLoadingTest(false);
      return;
    }
    
    const result = await testDatabaseConnection({
      region: currentRegion,
      url: urlToTest,
      sourceType: 'Snowflake' // Assuming Snowflake for region-specific URLs
    });

    toast({
      title: result.success ? "Connection Test Result" : "Connection Test Failed",
      description: `${result.message}${result.details ? ` Details: ${result.details}` : ''}`,
      variant: result.success ? "default" : "destructive",
    });
    setIsLoadingTest(false);
  };
  
  // Button to test PostgreSQL connection (uses .env variables directly)
  const handleTestPostgresConnection = async () => {
    setIsLoadingTest(true);
    const result = await testDatabaseConnection({
      region: 'GLOBAL', // PG is not region-specific in this context
      sourceType: 'PostgreSQL'
    });
     toast({
      title: result.success ? "PostgreSQL Test Result" : "PostgreSQL Test Failed",
      description: `${result.message}${result.details ? ` Details: ${result.details}` : ''}`,
      variant: result.success ? "default" : "destructive",
    });
    setIsLoadingTest(false);
  };


  const configurableRegions = REGIONS.filter(r => r !== 'GLOBAL') as Exclude<Region, 'GLOBAL'>[];

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center">
          <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your DataLens application settings and preferences.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Snowflake Connection Settings (Region-Specific)</CardTitle>
          <CardDescription>
            Configure Snowflake JDBC-like URLs for different regions. The "Test Connection" button uses the currently selected global region for Snowflake.
            Actual connection uses credentials from your `.env` file (SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configurableRegions.map((region) => (
            <div key={region} className="space-y-2">
              <Label htmlFor={`snowflake-url-${region}`}>Snowflake URL for {region}</Label>
              <Input
                id={`snowflake-url-${region}`}
                placeholder={`jdbc:snowflake://<account_identifier>.snowflakecomputing.com/?region=${region.toLowerCase()}&...`}
                value={snowflakeUrls[region] || ''}
                onChange={(e) => handleUrlChange(region, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: jdbc:snowflake://youraccount.snowflakecomputing.com/?warehouse=COMPUTE_WH&amp;db=YOUR_DB&amp;schema=PUBLIC
              </p>
            </div>
          ))}
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleSaveChanges} disabled={isLoadingTest}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings (Simulated)
            </Button>
            <Button onClick={handleTestConnection} variant="outline" disabled={isLoadingTest}>
              {isLoadingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test Snowflake (Current Region)
            </Button>
          </div>
        </CardContent>
      </Card>

       <Card className="mt-8">
        <CardHeader>
          <CardTitle>PostgreSQL Connection Settings</CardTitle>
          <CardDescription>
            PostgreSQL connection details are managed via environment variables in your `.env` file (e.g., POSTGRES_HOST, POSTGRES_USER).
            This button will attempt a connection using those settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={handleTestPostgresConnection} variant="outline" disabled={isLoadingTest}>
              {isLoadingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test PostgreSQL Connection
            </Button>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Other Application Settings</CardTitle>
          <CardDescription>
            Additional configuration options for DataLens. (Placeholder)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <SettingsIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              More settings will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

