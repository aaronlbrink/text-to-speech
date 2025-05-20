import { SERVER_BASE } from './../config';

export interface ISettings {
  host: String;
  apiVersion: String;

}

export interface IDownloads {
  downloads: string[];
}

const settingsStore = storage.defineItem<ISettings>(
  'local:settings',
  {
    fallback: {
      host: `https://${SERVER_BASE}`,
      apiVersion: 'v1',
    },
    version: 1
  },
);

const downloadsStore = storage.defineItem<IDownloads>(
  'local:downloads',
  {
    fallback: {
      downloads: []
    },
    version: 1
  },
);

export { downloadsStore, settingsStore };

