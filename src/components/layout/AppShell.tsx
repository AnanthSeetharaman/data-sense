
"use client";

import React, { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, Filter, Database, Cloud, Snowflake as SnowflakeIcon, Settings, UserCircle, Search as SearchIcon, FileText, BarChart2, Tags as TagsIcon, Info, ShieldCheck, FileSpreadsheet, DatabaseZap, SlidersHorizontal, Globe, PanelLeft, Sun, Moon, List } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataSource, type SampleDataSourceType } from '@/contexts/DataSourceContext';
import { useRegion, REGIONS, type Region } from '@/contexts/RegionContext';
import { useFilters, type FilterValues } from '@/contexts/FilterContext';

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  tooltip?: string;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, tooltip }) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href.startsWith("/admin") && pathname.startsWith("/admin") && href.includes(pathname.split("/").pop() || ""));

  return (
    <SidebarMenuItem>
      <Link href={href} passHref legacyBehavior>
        <SidebarMenuButton isActive={isActive} tooltip={tooltip || label}>
          {icon}
          <span>{label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { preferredSampleSource, setPreferredSampleSource } = useDataSource();
  const { currentRegion, setCurrentRegion } = useRegion();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { applyFilters: applyGlobalFilters, clearFilters: clearGlobalFilters } = useFilters();

  const [currentFilterSelections, setCurrentFilterSelections] = useState<FilterValues>({
    sources: { Hive: false, ADLS: false, Snowflake: false },
    tags: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSourceChange = (source: keyof FilterValues['sources']) => {
    setCurrentFilterSelections(prev => ({
      ...prev,
      sources: { ...prev.sources, [source]: !prev.sources[source] }
    }));
  };

  const handleTagFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentFilterSelections(prev => ({ ...prev, tags: e.target.value }));
  };

  const handleApplyFiltersClick = () => {
    applyGlobalFilters(currentFilterSelections);
  };
  
  const handleClearFiltersClick = () => {
    setCurrentFilterSelections({
      sources: { Hive: false, ADLS: false, Snowflake: false },
      tags: '',
    });
    clearGlobalFilters();
  };


  const isDatasetDetailPage = pathname.startsWith('/datasets/');

  return (
    <SidebarProvider defaultOpen={!isDatasetDetailPage}>
      <TooltipProvider> {/* Ensure TooltipProvider wraps components using Tooltip */}
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader className="p-2 justify-between items-center">
            <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <FileText className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">DataLens</h1>
            </Link>
             <Link href="/" className="items-center gap-2 hidden group-data-[collapsible=icon]:flex">
              <FileText className="h-7 w-7 text-primary" />
            </Link>
          </SidebarHeader>
          <Separator />
          <SidebarContent>
            <SidebarMenu>
              <NavItem href="/" icon={<Home />} label="Discover" tooltip="Discover Datasets" />
              <NavItem href="/bookmarks" icon={<Bookmark />} label="Bookmarks" tooltip="My Bookmarks" />
               <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </SidebarGroupLabel>
                <div className="space-y-4 px-2 mt-2 group-data-[collapsible=icon]:hidden">
                  <div>
                    <Label className="text-sm font-medium">Data Source</Label>
                    <div className="mt-2 space-y-2">
                      {(['Hive', 'ADLS', 'Snowflake'] as const).map((source) => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-source-${source.toLowerCase()}`}
                            checked={currentFilterSelections.sources[source]}
                            onCheckedChange={() => handleSourceChange(source)}
                          />
                          <Label htmlFor={`filter-source-${source.toLowerCase()}`} className="text-sm font-normal">
                            {source}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="filter-tags" className="text-sm font-medium">Tags</Label>
                    <Input
                      id="filter-tags"
                      placeholder="e.g., customer, pii"
                      className="mt-1 h-8"
                      value={currentFilterSelections.tags}
                      onChange={handleTagFilterChange}
                    />
                  </div>
                  <Button onClick={handleApplyFiltersClick} size="sm" className="w-full">Apply Filters</Button>
                  <Button onClick={handleClearFiltersClick} variant="outline" size="sm" className="w-full">Clear Filters</Button>
                </div>
              </SidebarGroup>
              <Separator className="my-2 group-data-[collapsible=icon]:hidden"/>
               <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin</span>
                  </SidebarGroupLabel>
                  <SidebarMenu className="mt-1">
                       <NavItem href="/admin/sample-viewer" icon={<FileSpreadsheet />} label="Sample Data Manager" tooltip="Manage Sample CSVs" />
                       <NavItem href="/admin/asset-data-manager" icon={<List />} label="Asset Data Manager" tooltip="Manage Full Asset CSVs" />
                  </SidebarMenu>
               </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
          <Separator />
          <SidebarFooter className="p-2">
            <SidebarMenu>
              <NavItem href="/settings" icon={<Settings />} label="Settings" tooltip="App Settings" />
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <div className="md:hidden">
               <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={preferredSampleSource}
                  onValueChange={(value) => setPreferredSampleSource(value as SampleDataSourceType)}
                >
                  <SelectTrigger className="w-auto min-w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Sample Data Source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-xs">Preferred Sample Source</SelectLabel>
                      <SelectItem value="pg">
                          <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" /> PG (Simulated)
                          </div>
                      </SelectItem>
                      <SelectItem value="local_csv">
                          <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" /> Local CSV Samples
                          </div>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={currentRegion}
                  onValueChange={(value) => setCurrentRegion(value as Region)}
                >
                  <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Region..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel className="text-xs">Region</SelectLabel>
                      {REGIONS.map(region => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9"
              >
                {mounted && (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="overflow-hidden rounded-full h-9 w-9">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://placehold.co/32x32.png" alt="User Avatar" data-ai-hint="user avatar"/>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </ScrollArea>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
