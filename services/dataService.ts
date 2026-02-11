
import { Project } from '../types';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKuwd61Rf3yJXYAZoQLnEfclYaMhOV8WDEYmSawBddvK5YHHMz6b2hYqkfgl-cOG_JvlnwmLbnt_AR/pub?gid=245664746&single=true&output=csv';

// Verschiedene Proxy-Optionen zur Umgehung von CORS und Timeouts
const PROXIES = [
  (url: string) => url, // Versuch 1: Direkt
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`, // Versuch 2: Schnell & Stabil
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` // Versuch 3: Zuverlässig
];

export async function fetchProjects(): Promise<Project[]> {
  let lastError = null;

  for (const getUrl of PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 Sekunden Timeout pro Versuch

      const response = await fetch(getUrl(SHEET_URL), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const csvData = await response.text();
      
      if (csvData && csvData.length > 200 && !csvData.includes('<!DOCTYPE html>')) {
        return parseCSV(csvData);
      }
    } catch (err) {
      lastError = err;
      console.warn('Abrufversuch fehlgeschlagen, probiere nächsten Weg...');
    }
  }

  throw new Error('Die Projektdaten konnten nicht geladen werden (Timeout oder Blockierung). Bitte prüfen Sie Ihre Internetverbindung oder versuchen Sie es später erneut.');
}

function parseCSV(csv: string): Project[] {
  const cleanCsv = csv.replace(/^\uFEFF/, '').trim();
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Robuster CSV-Parser für komplexe Felder (Anführungszeichen, Zeilenumbrüche)
  for (let i = 0; i < cleanCsv.length; i++) {
    const char = cleanCsv[i];
    const nextChar = cleanCsv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') { // Eskapierte Anführungszeichen ""
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentCell = '';
        currentRow = [];
      }
      if (char === '\r' && nextChar === '\n') i++; // CRLF handling
    } else {
      currentCell += char;
    }
  }
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0];
  const projectEntries = rows.slice(1);

  return projectEntries.map((row, index) => {
    const data: Record<string, string> = {};
    headers.forEach((header, i) => {
      data[header] = row[i] || '';
    });

    // Spalten-Mapping basierend auf Ihrem CSV
    const projectName = data['Projektname1'] || row[0] || `Projekt ${index + 1}`;
    const planner = data['Planer'] || '';
    const plannerNumber = data['Planer Nr.'] || '';
    const date = data['Hinzugefügt'] || '';
    const status = data['Status'] || '';
    
    const rawCustomerNumbers = data['Knd. Nr. Übermittler'] || '';
    const customerNumbers = rawCustomerNumbers
      ? rawCustomerNumbers.split(/[ ,]+/).map(num => num.trim()).filter(n => n.length > 2)
      : [];

    return {
      id: `p-${index}-${projectName.substring(0, 10)}`,
      projectName,
      planner,
      plannerNumber,
      customerNumbers,
      rawCustomerNumbers,
      description: data['Zusätzliche Infos'] || '',
      date,
      status,
      allData: data
    };
  });
}
