
import Papa from 'papaparse';

export interface ParseCsvResult {
  data: Record<string, any>[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

export async function fetchAndParseCsv(csvPath: string): Promise<ParseCsvResult> {
  return new Promise((resolve, reject) => {
    if (!csvPath || typeof csvPath !== 'string') {
      console.error('fetchAndParseCsv: Invalid csvPath provided:', csvPath);
      reject(new Error(`Invalid CSV path provided: ${csvPath}. Path must be a non-empty string.`));
      return;
    }

    Papa.parse(csvPath, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        // Check for critical errors that might not be in results.errors but affect data
        if (!results.data && results.errors.length === 0) {
            console.error('fetchAndParseCsv: Parsing completed but no data was returned and no errors reported for path:', csvPath, results.meta);
            reject(new Error(`CSV parsing completed but no data was returned for ${csvPath}. The file might be empty or unreadable.`));
            return;
        }
        resolve({
          data: results.data as Record<string, any>[],
          errors: results.errors,
          meta: results.meta,
        });
      },
      error: (error: Papa.ParseError | Error, file?: any) => {
        console.error('Error parsing CSV from path:', csvPath, error);
        let errorMessage = `Failed to download or parse CSV from "${csvPath}".`;
        
        if (error instanceof Error) { // Standard JS Error
            if (error.message && error.message.trim() !== "" && error.message.trim() !== ".") {
                errorMessage += ` Details: ${error.message}`;
            } else if (error.name) {
                 errorMessage += ` Type: ${error.name}.`;
            }
        } else if (error && typeof error === 'object' && 'message' in error) { // Papa.ParseError
            const papaError = error as Papa.ParseError;
            if (papaError.message && papaError.message.trim() !== "" && papaError.message.trim() !== ".") {
                 errorMessage += ` Details: ${papaError.message}`;
            }
            if (papaError.code) {
                errorMessage += ` Code: ${papaError.code}.`;
            }
            if (typeof papaError.row === 'number') {
                errorMessage += ` Row: ${papaError.row}.`;
            }
        } else if (typeof error === 'string' && error.trim() !== "" && error.trim() !== ".") {
            errorMessage += ` Details: ${error}`;
        } else {
            errorMessage += ` An unspecified parsing error occurred. Check network and file path.`;
        }
        reject(new Error(errorMessage));
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
