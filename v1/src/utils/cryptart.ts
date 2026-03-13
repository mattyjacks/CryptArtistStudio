// ============================================================================
// CryptArtist Art (.CryptArt) Project File Format
// A JSON-based project file that stores the full state of any program's project.
// Registered type name: "CryptArtist Art"
// ============================================================================

export type CryptArtProgram = "media-mogul" | "vibecode-worker" | "demo-recorder" | "valley-net" | "game-studio";

export interface CryptArtFile {
  program: CryptArtProgram;
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export function createCryptArtFile(
  program: CryptArtProgram,
  name: string,
  data: Record<string, unknown> = {}
): CryptArtFile {
  const now = new Date().toISOString();
  return {
    program,
    version: "0.1.0",
    name,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

export function serializeCryptArt(file: CryptArtFile): string {
  return JSON.stringify(file, null, 2);
}

export function parseCryptArt(json: string): CryptArtFile {
  const parsed = JSON.parse(json);
  if (!parsed.program || !parsed.version) {
    throw new Error("Invalid .CryptArt file: missing program or version field.");
  }
  return parsed as CryptArtFile;
}

export function routeForProgram(program: CryptArtProgram): string {
  return `/${program}`;
}
