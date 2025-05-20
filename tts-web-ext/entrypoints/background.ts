import { SERVER_BASE } from '@/config';
import { generateApiString } from '@/utils/generateApiString';
import { settingsStore } from '@/utils/storage';
import wretch, { Wretch } from "wretch";

let downloadTimeout: NodeJS.Timeout | null = null;

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await browser.tabs.query(queryOptions);
  return tab;
}

async function pollAudio(api: Wretch, result_id: string) {
  try {
    // const res = await fetch(`${statusEndpoint}${result_id}`, {});
    const res = await api
      .get(`/conversion-task/${result_id}`)
      .json(async (jsonResult: object) => {
        console.log(jsonResult)
        const url = jsonResult.value; // TODO: validate this more
        const audioReady = jsonResult.ready;
        const audioSuccessful = jsonResult.successful;
        if (downloadTimeout) {
          clearInterval(downloadTimeout);
        }
        if (url && /^https?:\/\//.test(url)) {
          // happy path
          browser.downloads.download({ url: url, filename: 'digest.mp3' });
          const { downloads } = await downloadsStore.getValue();
          if (!downloads.includes(url)) {
            if (downloads.length > 15) {
              await downloadsStore.setValue({
                downloads: [url, ...downloads.slice(0, 14)]
              });
            } else {
              await downloadsStore.setValue({
                downloads: [url, ...downloads]
              });
            }
          }
          const tab = await getCurrentTab();
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'DOWNLOAD_COMPLETE', data: { url: url } });
          }
          return;
        }
        else if (!audioReady && !url) {
          downloadTimeout = setTimeout(() => pollAudio(api, result_id), 3000)
        }
        else if (audioReady) {
          const tab = await getCurrentTab();
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'CONVERSION_REQUEST_ERROR', data: { error: "Converted audio is ready, but resulting url is not set" } });
          }
        }
        else {
          const tab = await getCurrentTab();
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'CONVERSION_REQUEST_ERROR', data: { error: jsonResult } });
          }
        }

      })
      .catch(async (e: any) => {
        const tab = await getCurrentTab();
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'CONVERSION_REQUEST_ERROR', data: { error: e } });
        }
      })

  } catch (e) {
    console.log(e)
  }
}

async function handleClick() {
  const tab = await getCurrentTab();
  if (tab.id) {
    // browser.tabs.sendMessage(tab.id, { type: 'SHOW_MODAL' });
    browser.tabs.sendMessage(tab.id, { type: 'REQUEST_ARTICLE' });
  }
}

async function handleModalClosed() {
  const tab = await getCurrentTab();
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'MODAL_CLOSED' });
  }
}

export default defineBackground({
  type: 'module',
  persistent: true,
  main() {
    const getEventSource = (uuid: string) => {
      let eventSource = null;
      if (!eventSource) {
        eventSource = new EventSource(`https://${SERVER_BASE}/tts/audio-stream/${uuid}`);
      }
      return eventSource
    }

    (async function wrapper() {
      const createApi = (host: String, apiVersion: String) => wretch(generateApiString(host, apiVersion)); // replaces extra ///'s

      // Global: API
      const settings = await settingsStore.getValue();
      console.log('settings', settings)
      let api = createApi(`https://${SERVER_BASE}`, "v1");
      if (settings.host && settings.apiVersion) {
        api = createApi(settings.host, settings.apiVersion)
      }
      else {
        console.log("settrings=")
        console.log(settings)
      }

      // "action" refers to the extension's button in the browser navbar
      // browser.action.onClicked.addListener(handleClick);
      if (browser && browser.action) {
        browser.action.onClicked.addListener(() => handleClick(api));
      } else if (browser && browser.browserAction) {
        console.log('firefox clicked')
        browser.browserAction.onClicked.addListener(() => {
          console.log('action clciked')
          handleClick(api)
        })
      } else {
        console.error('Browser action API is not available.');
      }
      // "onUpdated" is a listener for when the current tab changes
      console.log('TTS: background script started', { id: browser.runtime.id });
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
          // Check if the current tab matches a specific URL
          const targetUrl = "https://example.com"; // Specify the URL to match
          if (tab.url === targetUrl) {
            chrome.tabs.sendMessage(tabId, { type: 'SHOW_MODAL' });
          }
        }
      });

      chrome.runtime.onMessage.addListener(async (msg: any, sender) => {
        if (msg.type === 'REQUEST_AUDIO_DIGEST') {
          // kill all current processing
          const { articleData } = msg.data;

          const res = await api
            .post(articleData)
            .json((json) => {
              console.log(json)
              downloadTimeout = setTimeout(() => pollAudio(api, json.result_id), 5000)
            })
            .catch(async (e: any) => {
              const tab = await getCurrentTab();
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'CONVERSION_REQUEST_ERROR', data: { error: e } });
              }
            })
        }
        if (msg.type === 'MODAL_CLOSED') {
          handleModalClosed();
        }

        if (msg.type === 'SETTINGS_UPDATED') {
          const { host, apiVersion } = msg.data;
          api = createApi(host, apiVersion)
        }

        if (msg.type === 'SEND_ARTICLE') {
          const { articleData } = msg.data;

          function generateQuickUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          }
          const reqUuid = generateQuickUUID();
          if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "START_STREAMING",
              data: { reqUuid: reqUuid }
            })
          }

          await wretch(`https://${SERVER_BASE}/tts/`)
            .post({
              articleData: articleData.article,
              uuid: reqUuid,
            }, "article")
            .json((json) => {
            })
            .catch(async (e: any) => {
              const tab = await getCurrentTab();
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'CONVERSION_REQUEST_ERROR', data: { error: e } });
              }
            })
        }
      });
    })();
  }

});
