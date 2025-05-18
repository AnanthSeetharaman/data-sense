
import type { DataSource } from '@/lib/types';
import { Database, Cloud, Snowflake as SnowflakeIcon } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface SourceIconProps extends Omit<LucideProps, 'name'> {
  source: DataSource;
}

export function SourceIcon({ source, className, ...props }: SourceIconProps) {
  const iconProps = { className: className ?? "h-5 w-5 text-muted-foreground", ...props };

  switch (source) {
    case 'Hive':
      return <Database {...iconProps} />;
    case 'ADLS':
      return <Cloud {...iconProps} />;
    case 'Snowflake':
      return <SnowflakeIcon {...iconProps} />;
    default:
      return <Database {...iconProps} />; // Default icon
  }
}
