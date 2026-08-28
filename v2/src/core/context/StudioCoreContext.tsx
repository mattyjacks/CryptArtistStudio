import React, { createContext, useContext } from "react";
import { IPlatformAdapter } from "../types/platform.types";
import { IStorageDriver } from "../types/storage.types";
import { IFileSystemDriver } from "../types/filesystem.types";
import { ICryptArtEngine } from "../types/cryptart.types";
import { IGoogleDriveService } from "../types/drive.types";
import { IVideoRenderEngine } from "../types/video.types";
import { ISuiteEventBus } from "../types/suite.types";

import { platformAdapter } from "../drivers/web/BrowserPlatformAdapter";
import { browserStorageDriver } from "../drivers/web/BrowserStorageDriver";
import { browserFileSystemDriver } from "../drivers/web/BrowserFileSystemDriver";
import { cryptArtEngine } from "../engine/CryptArtEngine";
import { googleDriveEngine } from "../engine/GoogleDriveEngine";
import { videoRenderEngine } from "../engine/VideoRenderEngine";
import { suiteEventBus } from "../engine/SuiteEventBus";

export interface StudioCoreContextValue {
  platform: IPlatformAdapter;
  storage: IStorageDriver;
  fs: IFileSystemDriver;
  cryptart: ICryptArtEngine;
  drive: IGoogleDriveService;
  videoEngine: IVideoRenderEngine;
  events: ISuiteEventBus;
}

const defaultContext: StudioCoreContextValue = {
  platform: platformAdapter,
  storage: browserStorageDriver,
  fs: browserFileSystemDriver,
  cryptart: cryptArtEngine,
  drive: googleDriveEngine,
  videoEngine: videoRenderEngine,
  events: suiteEventBus,
};

const StudioCoreContext = createContext<StudioCoreContextValue>(defaultContext);

export const StudioCoreProvider: React.FC<{
  children: React.ReactNode;
  overrides?: Partial<StudioCoreContextValue>;
}> = ({ children, overrides }) => {
  const value = { ...defaultContext, ...overrides };
  return (
    <StudioCoreContext.Provider value={value}>
      {children}
    </StudioCoreContext.Provider>
  );
};

export function useStudioCore(): StudioCoreContextValue {
  return useContext(StudioCoreContext);
}
