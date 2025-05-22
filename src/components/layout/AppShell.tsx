
"use client";

import * as React from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, Filter, Database, Cloud, Snowflake as SnowflakeIcon, Settings, UserCircle, Search as SearchIcon, FileText, BarChart2, Tags as TagsIcon, Info, ShieldCheck } from 'lucide-react';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  tooltip?: string;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, tooltip }) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href === "/admin/sample-viewer" && pathname.startsWith("/admin"));


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

  // Dummy filter state
  const [filters, setFilters] = React.useState({
    sources: { Hive: false, ADLS: false, Snowflake: false },
    tags: '',
  });

  const handleSourceChange = (source: keyof typeof filters.sources) => {
    setFilters(prev => ({
      ...prev,
      sources: { ...prev.sources, [source]: !prev.sources[source] }
    }));
  };

  const isDatasetDetailPage = pathname.startsWith('/datasets/');


  return (
    <SidebarProvider defaultOpen={!isDatasetDetailPage}>
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
                          checked={filters.sources[source]}
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
                    value={filters.tags}
                    onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
                <Button variant="outline" size="sm" className="w-full">Apply Filters</Button>
              </div>
            </SidebarGroup>
            <Separator className="my-2 group-data-[collapsible=icon]:hidden"/>
             <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Admin</span>
                </SidebarGroupLabel>
                <SidebarMenu className="mt-1">
                     <NavItem href="/admin/sample-viewer" icon={<FileCsv />} label="Sample Data Manager" tooltip="Manage Sample CSVs" />
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
          <div className="flex-1">
            {/* Breadcrumbs or page title could go here */}
          </div>
          <div className="relative flex-1 md:grow-0">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search datasets..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Avatar>
                  <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
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
        </header>
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
