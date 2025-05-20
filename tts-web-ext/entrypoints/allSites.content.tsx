import { Readability } from '@mozilla/readability';
import ReactDOM from 'react-dom/client';
import App from './overlay/App';

function sendDataToBackground() {
  chrome.runtime.sendMessage({
    type: 'GET_PAGE_DATA',
    data: { url: window.location.href }
  });
}

export default defineContentScript({
  cssInjectionMode: "ui",
  matches: ['<all_urls>'],
  main(ctx) {
    console.log('content script is loaded');
    // Define the UI
    const ui = createShadowRootUi(ctx, {
      name: 'article-to-audio-modal',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: (uiContainer, shadow, shadowHost) => {
        sendDataToBackground();
        // Avoid mounting directly to body
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.zIndex = '1000';
        uiContainer.append(wrapper);

        const rootElm = ReactDOM.createRoot(wrapper);
        const documentClone: Document = document.cloneNode(true);
        let article = new Readability(documentClone).parse();
        const articleData = {
          url: window.location.href,
          article: article?.textContent,
          title: article?.title
        }
        rootElm.render(

          <App
            articleData={articleData}
            onClose={
              () => document.documentElement.style.overflow = 'scroll'
            }
          />

        );
        document.documentElement.style.overflow = 'hidden';
        return { rootElm, wrapper }

      },
      onRemove: (elements) => {
        elements?.rootElm.unmount();
        elements?.wrapper.remove();
        document.documentElement.style.overflow = 'scroll';
      }
    });

    let audioChunks: Blob[] = []
    let isPlaying = false;
    let endOfStream = false;

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      if (message.type === 'SHOW_MODAL') {
        ui.then(u => {
          if (!u.mounted) {
            u.mount();
          }
        })
      }
      if (message.type === 'REQUEST_ARTICLE') {
        console.log('article request here')
        const documentClone: Document = document.cloneNode(true);
        let article = new Readability(documentClone).parse();
        const articleData = {
          url: window.location.href,
          article: article?.textContent,
          title: article?.title
        }
        chrome.runtime.sendMessage({
          type: 'SEND_ARTICLE',
          data: {
            articleData: {
              url: articleData.url,
              title: articleData.title,
              article: articleData.article
            }
          }
        });
        ui.then(u => {
          if (!u.mounted) {
            u.mount();
          }
        })
      }
      if (message.type === 'START_STREAMING') {
        function playNextChunk() {
          if (audioChunks.length === 0) {
            // Wait for more chunks
            if (!endOfStream) {
              console.log("Waiting for next chunk...")
            }
            return;
          }
          const audioChunk = audioChunks.shift();
          if (audioChunk) {
            const audioObjectUrl = URL.createObjectURL(audioChunk);

            audioPlayer.src = audioObjectUrl;
            audioPlayer.play()
              .then(() => {
              })
              .catch(error => {
                console.error('Playback error:', error);
              });
          }
        }
        const audioPlayer = document.querySelector("article-to-audio-modal").shadowRoot.querySelector("#__tts-audio-player") as HTMLAudioElement
        const reqUuid = message.data.reqUuid;

        const eventSource = new EventSource(`https://${SERVER_BASE}/tts/audio-stream/${reqUuid}`);

        eventSource.addEventListener('end-of-stream', (event) => {
          const data = JSON.parse(event.data);
          eventSource.close()
          if (data.endOfStream) {
            endOfStream = true;
          }
        });
        eventSource.addEventListener('segment-ready', async (event) => {
          const audioUrl = event.data.replaceAll('"', '');
          console.log(`audio url: ${audioUrl}`);

          const audioFileResponse = await fetch(audioUrl);
          if (!audioFileResponse.ok) {
            console.log("Issue geting audio file")
          }
          console.log(audioFileResponse)

          const arrayBuffer = await audioFileResponse.arrayBuffer()
          console.log(arrayBuffer)
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
          audioChunks.push(blob)

          console.log(`isPlaying=${isPlaying}`)
          if (!isPlaying) {
            console.log("here")
            playNextChunk();
          }
          isPlaying = true
        });
        eventSource.onerror = (error) => {
          console.error('SSE Error:', error);
          isPlaying = false;
          if (eventSource) {
            eventSource.close();
          }
        };
        audioPlayer.addEventListener('ended', () => {
          playNextChunk();
        });
      }
      if (message.type === 'MODAL_CLOSED') {
        ui.then(u => {
          if (u.mounted) {
            u.remove();
          }
        })
      }
    });
  },
});