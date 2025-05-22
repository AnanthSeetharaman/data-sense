
import Papa from 'papaparse';

export interface ParseCsvResult {
  data: Record<string, any>[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

export async function fetchAndParseCsv(csvPath: string): Promise<ParseCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvPath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve({
          data: results.data as Record<string, any>[],
          errors: results.errors,
          meta: results.meta,
        });
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error, csvPath);
        reject(error);
      },
    });
  });
}

export function convertToCsvString(data: Record<string, any>[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  return Papa.unparse(data);
}
