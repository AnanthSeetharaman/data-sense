
"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRegion, REGIONS, type Region } from '@/contexts/RegionContext';
import { testDatabaseConnection } from '@/app/actions'; 
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
      acc[region] = ''; // Default empty string
    }
    return acc;
  }, {} as SnowflakeUrlConfigs);
  
  const [snowflakeUrls, setSnowflakeUrls] = useState<SnowflakeUrlConfigs>(initialUrlConfigs);
  const [lastSnowflakeTime, setLastSnowflakeTime] = useState<string | null>(null);
  const [lastPostgresTime, setLastPostgresTime] = useState<string | null>(null);

  // Effect to load saved URLs from localStorage (optional persistence example)
  useEffect(() => {
    const savedUrls = localStorage.getItem('datalens-snowflake-urls');
    if (savedUrls) {
      try {
        setSnowflakeUrls(JSON.parse(savedUrls));
      } catch (e) {
        console.error("Failed to parse saved Snowflake URLs from localStorage", e);
      }
    }
  }, []);

  const handleUrlChange = (region: Exclude<Region, 'GLOBAL'>, value: string) => {
    setSnowflakeUrls(prev => ({ ...prev, [region]: value }));
  };

  const handleSaveChanges = () => {
    localStorage.setItem('datalens-snowflake-urls', JSON.stringify(snowflakeUrls));
    console.log("Snowflake URLs saved to localStorage:", snowflakeUrls);
    toast({
      title: "Settings Saved",
      description: "Snowflake URL configurations have been saved to browser localStorage.",
    });
  };

  const handleTestSnowflakeConnection = async () => {
    setIsLoadingTest(true);
    setLastSnowflakeTime(null);
    if (currentRegion === 'GLOBAL') {
      toast({
        title: "Select Region",
        description: "Please select a specific region (EU, NA, APAC, CALATAM) from the global dropdown to test its configured Snowflake connection.",
        variant: "default",
      });
      setIsLoadingTest(false);
      return;
    }

    // The JDBC URL from the input isn't directly used by the snowflake-sdk in the action for basic auth,
    // but we pass the region. The action relies on .env for credentials.
    const urlToTest = snowflakeUrls[currentRegion as Exclude<Region, 'GLOBAL'>] || `(Using .env for region: ${currentRegion})`;
    
    const result = await testDatabaseConnection({
      region: currentRegion,
      url: urlToTest, // Pass for logging or if action evolves to parse it
      sourceType: 'Snowflake'
    });

    toast({
      title: result.success ? "Snowflake Test Result" : "Snowflake Test Failed",
      description: `${result.message}${result.details ? ` Details: ${result.details}` : ''}`,
      variant: result.success ? "default" : "destructive",
      duration: result.success ? 5000 : 9000,
    });
    if (result.success && result.data?.snowflakeTime) {
      setLastSnowflakeTime(new Date(result.data.snowflakeTime).toLocaleString());
    }
    setIsLoadingTest(false);
  };
  
  const handleTestPostgresConnection = async () => {
    setIsLoadingTest(true);
    setLastPostgresTime(null);
    const result = await testDatabaseConnection({
      region: 'GLOBAL', 
      sourceType: 'PostgreSQL'
    });
     toast({
      title: result.success ? "PostgreSQL Test Result" : "PostgreSQL Test Failed",
      description: `${result.message}${result.details ? ` Details: ${result.details}` : ''}`,
      variant: result.success ? "default" : "destructive",
      duration: result.success ? 5000 : 9000,
    });
    if (result.success && result.data?.postgresTime) {
      setLastPostgresTime(new Date(result.data.postgresTime).toLocaleString());
    }
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
          Manage your DataLens application settings and preferences. Connection tests use credentials from your `.env` file.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Snowflake Connection Settings (Region-Specific URLs)</CardTitle>
          <CardDescription>
            Configure placeholder Snowflake JDBC-like URLs for different regions. The actual connection test uses credentials and warehouse settings from your project's `.env` file. The URL here is for reference or future advanced configurations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configurableRegions.map((region) => (
            <div key={region} className="space-y-2">
              <Label htmlFor={`snowflake-url-${region}`}>Snowflake URL for {region} (Informational)</Label>
              <Input
                id={`snowflake-url-${region}`}
                placeholder={`jdbc:snowflake://<account_identifier>.${region.toLowerCase()}.snowflakecomputing.com/...`}
                value={snowflakeUrls[region] || ''}
                onChange={(e) => handleUrlChange(region as Exclude<Region, 'GLOBAL'>, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: jdbc:snowflake://youraccount.region.snowflakecomputing.com/?warehouse=YOUR_WH&amp;db=YOUR_DB
              </p>
            </div>
          ))}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Button onClick={handleSaveChanges} disabled={isLoadingTest}>
              <Save className="mr-2 h-4 w-4" />
              Save URLs to localStorage
            </Button>
            <Button onClick={handleTestSnowflakeConnection} variant="outline" disabled={isLoadingTest}>
              {isLoadingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test Snowflake (uses .env & current region)
            </Button>
          </div>
           {lastSnowflakeTime && <p className="text-sm text-green-600">Last successful Snowflake time check: {lastSnowflakeTime}</p>}
        </CardContent>
      </Card>

       <Card className="mt-8">
        <CardHeader>
          <CardTitle>PostgreSQL Connection Settings</CardTitle>
          <CardDescription>
            PostgreSQL connection details are managed via environment variables in your `.env` file (e.g., POSTGRES_HOST, POSTGRES_USER, etc.).
            This button will attempt a connection using those settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={handleTestPostgresConnection} variant="outline" disabled={isLoadingTest}>
              {isLoadingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test PostgreSQL Connection (uses .env)
            </Button>
            {lastPostgresTime && <p className="text-sm text-green-600 mt-2">Last successful PostgreSQL time check: {lastPostgresTime}</p>}
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
