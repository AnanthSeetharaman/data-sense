
"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Added Textarea
import { useToast } from '@/hooks/use-toast';
import { useRegion, type Region } from '@/contexts/RegionContext';
import { testDatabaseConnection } from '@/app/actions'; 
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { currentRegion } = useRegion();
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [lastSnowflakeTime, setLastSnowflakeTime] = useState<string | null>(null);
  const [connectionTestLogs, setConnectionTestLogs] = useState<string[]>([]); // State for logs

  const handleTestSnowflakeConnection = async () => {
    setIsLoadingTest(true);
    setLastSnowflakeTime(null);
    setConnectionTestLogs([]); // Clear previous logs
    
    const result = await testDatabaseConnection({
      region: currentRegion, 
      sourceType: 'Snowflake'
    });

    toast({
      title: result.success ? "Snowflake Test Result" : "Snowflake Test Failed",
      description: `${result.message}${result.details ? ` Details: ${result.details}` : ''}`,
      variant: result.success ? "default" : "destructive",
      duration: result.success ? 5000 : 9000,
    });

    if (result.logs) {
      setConnectionTestLogs(result.logs);
    }

    if (result.success && result.data?.snowflakeTime) {
      setLastSnowflakeTime(new Date(result.data.snowflakeTime).toLocaleString());
    }
    setIsLoadingTest(false);
  };
  
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
          <CardTitle>Snowflake Connection Test</CardTitle>
          <CardDescription>
            Test the connection to your Snowflake instance. This test uses credentials (account, username, password, warehouse, authenticator)
            configured in your project's `.env` file. The globally selected region (currently: {currentRegion}) will be used by the connection logic if your Snowflake account identifier in the `.env` file does not already specify a region.
            Results and logs from the test will appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Button onClick={handleTestSnowflakeConnection} variant="outline" disabled={isLoadingTest}>
              {isLoadingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Test Snowflake Connection
            </Button>
          </div>
           {lastSnowflakeTime && <p className="text-sm text-green-600">Last successful Snowflake time check: {lastSnowflakeTime}</p>}
           
           {connectionTestLogs.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-md font-semibold">Connection Test Logs:</h4>
              <Textarea
                readOnly
                value={connectionTestLogs.join("\n")}
                className="h-64 font-mono text-xs bg-muted/50"
                placeholder="Connection test logs will appear here..."
              />
            </div>
           )}
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

    
