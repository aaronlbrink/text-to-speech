import express from 'express';
import { createClient } from "redis";
// DotEnv.configure()
import Queue from "bull";
import cors from 'cors';
import crypto from "crypto";
import 'dotenv/config';

const redisClient = createClient({ url: 'redis://node_redis:6379' });
redisClient.connect().catch(console.error)

const app = express()
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const isProduction = false
interface IClient {
  requestUuid: string;
  res: any,
  clientId: string;
}

let clients: IClient[] = [];

const flushAll = await redisClient.flushAll('SYNC')
console.log(`Server restarting and flushing redis cache ${flushAll}`);


async function pollPromise(resultId): Promise<{ audioSegment: string, pollIter: number }> {
  return new Promise<{ audioSegment: string, pollIter: number }>(async (resolve, reject) => {
    const performPoll = async (pollIter: number) => {
      try {
        const poll = await fetch(`http://generate_audio:3040/tta/v1/conversion-task/${resultId}`);
        if (!poll.ok) {
          reject("");
        }

        const audioResult = await poll.json();
        if (!audioResult.ready) {
          pollIter += 1
          setTimeout(() => performPoll(pollIter), 2000)
        } else {
          const audioSegment = audioResult.value;
          resolve({ audioSegment, pollIter })
        }
      } catch (e) {
        console.log(e)
      }

    }
    performPoll(0);
  })
};

const articleQueue = new Queue("article pipeline", 'redis://node_redis:6379');
articleQueue.process(async function handleArticle(job, done) {
  const { chunks, requestUuid } = job.data;
  console.log(`Job #${requestUuid} started`)
  let doneStatus: number[] = []
  for (const [ithChunk, chunk] of chunks.entries()) {
    const convertToAudioRes = await fetch("http://generate_audio:3040/tta/v1", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article: chunk })
    })
    if (!convertToAudioRes.ok) {
      throw new Error('Network response was not ok ' + convertToAudioRes.statusText);
    }
    const { result_id } = await convertToAudioRes.json()
    const resultId = result_id;

    const { audioSegment, pollIter } = await pollPromise(resultId);
    console.log(`${ithChunk}/${chunks.length} Audio segement ready after ${pollIter} # of polls`);
    // Find the specific client
    const client = clients.find(client => client.requestUuid === requestUuid);
    // Only send if we found the client
    if (client) {
      try {
        client.res.write(`event: segment-ready\ndata: ${JSON.stringify(audioSegment)}\n\n`);
        doneStatus.push(ithChunk)

      } catch (err) {
        console.error(`Error sending to client ${client.clientId}:`, err);
      }
    } else {
      console.log(`No client found for requestUuid: ${requestUuid}`);
    }
  }
  done();
})

articleQueue.on('completed', (job) => {
  const { chunks, requestUuid } = job.data;
  const client = clients.find(client => client.requestUuid === requestUuid);
  if (client) {
    console.log("completed. found a client")
    try {
      client.res.write(`event: end-of-stream\ndata: ${JSON.stringify({ endOfStream: true })}\n\n`);
      client.res.end()
    } catch (err) {
      console.error(`Error sending to client ${client.clientId}:`, err);
    }
  } else {
    console.log(`No client found for requestUuid: ${requestUuid}`);
  }
})

app.get('/', (req, res) => {
  res.send('hello world');
})

app.post('/tts/article', async (req, res) => {
  try {
    const { uuid, articleData } = req.body;

    const articleChunks = articleData.split(".")
    console.log(articleChunks.slice(0, 3))

    res.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
    });
    res.flushHeaders()
    await articleQueue.add({ chunks: articleChunks, requestUuid: uuid })

  } catch (e) {
    console.error(e)
  }
});

app.get('/tts/audio-stream/:uuid', async (req, res) => {
  const { uuid } = req.params;

  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    // 'Content-Encoding': 'none'
  });
  res.flushHeaders()

  const clientId = crypto.randomBytes(16).toString("hex");
  const newClient: IClient = {
    requestUuid: uuid,
    clientId,
    res,
  }
  clients.push(newClient)
  res.write(`event: hello-world\ndata: ${JSON.stringify({ hello: true })}\n\n`);

  // Remove client when connection closes
  req.on('close', () => {
    // TODO: cancel/clear all tasks in the queue with a matching requestUuid
    // console.log(`${clientId} Connection closed`);
    // clients = clients.filter(client => client.clientId !== clientId);
  });

})

app.get('/tts/test', (req, res) => {
  res.send('hello!')
})

console.log("Actually listening!");
app.listen(8080);

