import {
  CryptArtFile,
  CryptArtProgram,
  ICryptArtEngine,
} from "../types/cryptart.types";
import { browserFileSystemDriver } from "../drivers/web/BrowserFileSystemDriver";
import { sanitizeProjectForExport, sanitizeObjectKeys } from "../security/security";

export class CryptArtEngine implements ICryptArtEngine {
  createProject(
    program: CryptArtProgram,
    name: string,
    data: Record<string, unknown> = {}
  ): CryptArtFile {
    const now = new Date().toISOString();
    return {
      $cryptart: 1,
      studioVersion: "2.0.0",
      program,
      name,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      meta: {
        website: "https://cryptartist.com",
        fps: 30,
        resolution: "1920x1080",
      },
      data: sanitizeObjectKeys(data),
      history: [
        {
          timestamp: now,
          action: "Created project in CryptArtist Studio v2",
        },
      ],
    };
  }

  serializeProject(project: CryptArtFile): string {
    const sanitized = sanitizeProjectForExport(project);
    const updated: CryptArtFile = {
      ...sanitized,
      $cryptart: 1,
      updatedAt: new Date().toISOString(),
    };
    return JSON.stringify(updated, null, 2);
  }

  parseProject(json: string): CryptArtFile {
    if (!json || typeof json !== "string") {
      throw new Error("Invalid .cryptart file: empty content");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      throw new Error(`Malformed .cryptart JSON: ${e.message}`);
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid .cryptart file: root must be a JSON object");
    }

    // Defend against prototype pollution
    parsed = sanitizeObjectKeys(parsed);

    // Backward compatibility normalization:
    if (parsed.$cryptart === undefined) {
      parsed.$cryptart = 1;
    }
    if (!parsed.program || typeof parsed.program !== "string") {
      parsed.program = "media-mogul";
    }
    if (!parsed.data || typeof parsed.data !== "object") {
      parsed.data = {};
    }
    if (!parsed.id) {
      parsed.id = `proj_${Date.now()}`;
    }
    if (!parsed.name) {
      parsed.name = "Untitled Project";
    }

    return parsed as CryptArtFile;
  }

  async exportProjectFile(project: CryptArtFile, customFileName?: string): Promise<void> {
    const json = this.serializeProject(project);
    const safeName = (customFileName || project.name || "project")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    const fileName = `${safeName}.cryptart`;

    await browserFileSystemDriver.saveFileToDisk(fileName, json, "application/json");
  }

  async importProjectFile(file: File): Promise<CryptArtFile> {
    const text = await file.text();
    return this.parseProject(text);
  }
}

export const cryptArtEngine = new CryptArtEngine();
