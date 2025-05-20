import { SERVER_BASE } from '@/config';
import { ISettings, settingsStore } from '@/utils/storage';
import { useEffect, useState } from 'react';
import DialogModal from "./DialogModal";
import './style.css';

enum SettingSavedState {
  SAVED = "Setting saved",
  SAVING = "Saving...",
  UNCHANGED = "Setting not updated"
}

const Setting = ({ name, settings, setSettings }: { name: string, settings: any, setSettings: any }) => {
  return (
    <div>
      <label>
        {name}
        <input type="text" value={settings[name]} onChange={(e) => {
          setSettings({
            ...settings,
            [name]: [e.target.value]
          })
        }} />
      </label>
    </div>
  )
}

export default function App({ articleData, onClose }: { articleData: any, onClose: () => void }) {
  const [error, setError] = useState<object>();
  const savingTimeout = useRef<NodeJS.Timeout>(undefined);
  const [isOpened, setIsOpened] = useState(true);
  const [bodyText, setBodyText] = useState(articleData.article);
  const [showDownloads, setShowDownloads] = useState(false);
  const [settings, setSettings] = useState<ISettings>({
    apiVersion: 'v1',
    host: `https://${SERVER_BASE}`,
  });
  const [savingSettings, setSavingSettings] = useState(SettingSavedState.UNCHANGED);
  const [downloads, setDownloads] = useState<IDownloads>({
    downloads: []
  });
  const [convertingState, setConvertingState] = useState<"converting" | "converted" | "error" | "idle">("idle");
  const saving = SettingSavedState.SAVING;
  const saved = SettingSavedState.SAVED;
  const unchanged = SettingSavedState.UNCHANGED;

  useEffect(() => {
    // do I need to clean up this listener? `listener.current = `
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      if (message.type === 'DOWNLOAD_COMPLETE') {
        setDownloads((prevState) => ({
          ...prevState,
          downloads: [message.data.url, ...prevState.downloads]
        }));
        setConvertingState("converted");
      }
      if (message.type === 'CONVERSION_REQUEST_ERROR') {
        setError(message.data.error);
      }
    });
    return () => { }
  }, []);

  useEffect(() => {
    (async () => {
      const settingsStored = await settingsStore.getValue();
      setSettings(settingsStored);

      const downloadsStored = await downloadsStore.getValue();
      setDownloads(downloadsStored);
    })();
  }, []);

  useEffect(() => {
    setSavingSettings(SettingSavedState.SAVING)
    savingTimeout.current = setTimeout(async () => {
      await settingsStore.setValue(settings);
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        data: {
          host: settings.host,
          apiVersion: settings.apiVersion
        }
      });

      setSavingSettings(SettingSavedState.SAVED)
    }, 2000);
    return () => clearTimeout(savingTimeout.current);
  }, [settings]);

  useEffect(() => {
    const delay = setTimeout(() => {
      downloadsStore.setValue(downloads);
    }, 5000);
    return () => clearTimeout(delay);
  }, [downloads]);

  const onProceed = () => {
    console.log("Proceed clicked");
    chrome.runtime.sendMessage({
      type: 'REQUEST_AUDIO_DIGEST',
      data: {
        articleData: {
          url: articleData.url,
          title: articleData.title,
          article: bodyText
        }
      }
    });
    setConvertingState("converting");
  };

  const close = () => {
    onClose();
    setIsOpened(false);
    browser.runtime.sendMessage({
      type: 'MODAL_CLOSED',
    });
  }

  const resetSettings = async () => {
    clearTimeout(savingTimeout.current);
    await settingsStore.removeValue();
    let settingsStored = await settingsStore.getValue();
    setSettings(settingsStored);

  }

  return (
    <>
      <DialogModal
        title="Article to audio"
        isOpened={isOpened}
        onClose={close}
      >
        <audio id="__tts-audio-player" controls></audio>
      </DialogModal>
    </>
  )
}

