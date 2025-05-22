
"use client";

import { useState } from 'react';
import { Settings as SettingsIcon, Save, Zap } from 'lucide-react'; // Added Zap for Test Connection
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRegion, REGIONS, type Region } from '@/contexts/RegionContext'; // Import useRegion and REGIONS

// Define a type for the URL configurations
type SnowflakeUrlConfigs = {
  [key in Exclude<Region, 'GLOBAL'>]?: string; // GLOBAL won't have a specific URL
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { currentRegion } = useRegion(); // Get the current global region
  
  // Initialize URL states, excluding 'GLOBAL'
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
    // For this prototype, we'll just show a toast.
    console.log("Simulating save of Snowflake URLs:", snowflakeUrls);
    toast({
      title: "Settings Saved (Simulated)",
      description: "Snowflake URL configurations have been 'saved'. (Prototype only)",
    });
  };

  const handleTestConnection = () => {
    if (currentRegion === 'GLOBAL') {
      toast({
        title: "Select a Region",
        description: "Please select a specific region (EU, NA, APAC, CALATAM) from the global dropdown to test its configured Snowflake URL.",
        variant: "default",
      });
      return;
    }

    const urlToTest = snowflakeUrls[currentRegion as Exclude<Region, 'GLOBAL'>];

    if (urlToTest && urlToTest.trim() !== '') {
      // Simulate a successful connection test
      console.log(`Simulating test connection for region ${currentRegion} with URL: ${urlToTest}`);
      toast({
        title: "Connection Test Successful (Simulated)",
        description: `Successfully 'connected' to Snowflake for region ${currentRegion} using URL: ${urlToTest}.`,
      });
    } else {
      // Simulate a failed connection test due to missing URL
      toast({
        title: "Connection Test Failed (Simulated)",
        description: `No Snowflake URL configured for region ${currentRegion} on this page. Please enter a URL.`,
        variant: "destructive",
      });
    }
  };

  // Filter out 'GLOBAL' for URL configuration inputs
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
          <CardTitle>Snowflake Connection Settings</CardTitle>
          <CardDescription>
            Configure Snowflake JDBC-like URLs for different regions. The app will conceptually use these when "Snowflake" source is selected.
            The "Test Connection" button uses the currently selected global region.
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
          <div className="flex space-x-4">
            <Button onClick={handleSaveChanges}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings (Simulated)
            </Button>
            <Button onClick={handleTestConnection} variant="outline">
              <Zap className="mr-2 h-4 w-4" />
              Test Connection (Simulated)
            </Button>
          </div>
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
