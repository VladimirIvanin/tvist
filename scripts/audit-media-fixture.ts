import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function bounded<T>(task: Promise<T>, milliseconds: number, stage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${stage} timeout after ${milliseconds} ms`)),
          milliseconds
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Generate pixels locally; prefer native VP8 recording, retain an installed-encoder fallback. */
export async function generateMediaFixture(destination = resolve('.tmp/audit/fixture-video.webm')) {
  mkdirSync(dirname(destination), { recursive: true });
  const limitations: string[] = [];
  async function withCanvas<T>(
    work: (page: import('@playwright/test').Page) => Promise<T>
  ): Promise<T> {
    const server = await chromium.launchServer();
    const browser = await chromium.connect(server.wsEndpoint());
    try {
      const page = await browser.newPage();
      await page.goto('about:blank');
      await page.evaluate('globalThis.__name = (fn) => fn;');
      return await bounded(work(page), 10000, 'Native canvas recording');
    } finally {
      try {
        await bounded(browser.close(), 1000, 'fixture client close');
      } catch (error) {
        limitations.push(String(error));
      }
      try {
        await bounded(server.close(), 1000, 'fixture browser close');
      } catch (error) {
        limitations.push(String(error));
        const pid = server.process().pid;
        if (pid) {
          try {
            process.kill(pid);
          } catch (signalError) {
            if ((signalError as NodeJS.ErrnoException).code !== 'ESRCH')
              limitations.push(String(signalError));
          }
        }
      }
    }
  }

  let codec = 'vp8';
  let method = 'Chromium canvas.captureStream + MediaRecorder';
  try {
    console.log('Native fixture: attempting bounded VP8 MediaRecorder');
    const recording = await withCanvas((page) =>
      page.evaluate(async () => {
        if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8'))
          throw new Error('VP8 recording unsupported');
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        document.body.append(canvas);
        const context = canvas.getContext('2d')!;
        const stream = canvas.captureStream(0);
        const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 150000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        const stopped = new Promise<void>((done, reject) => {
          recorder.onstop = () => done();
          recorder.onerror = (event) => reject(new Error(String(event)));
        });
        recorder.start();
        for (let frame = 0; frame < 30; frame++) {
          context.fillStyle = frame % 2 ? '#2463eb' : '#dd493d';
          context.fillRect(0, 0, 320, 180);
          context.fillStyle = '#fff';
          context.fillRect((frame * 13) % 280, 55, 40, 70);
          track.requestFrame();
          await new Promise<void>((done) => setTimeout(done, 33));
        }
        recorder.stop();
        await stopped;
        stream.getTracks().forEach((item) => item.stop());
        return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
      })
    );
    if (recording.length < 500) throw new Error('Native recording is empty');
    writeFileSync(destination, Buffer.from(recording));
  } catch (error) {
    limitations.push(`VP8 MediaRecorder unavailable: ${String(error)}`);
    codec = 'vp9';
    method = 'Local canvas JPEG frames → installed Playwright FFmpeg image2pipe → VP9 WebM';
    console.log('Native fixture: falling back to installed VP9 encoder');
    const cache = dirname(dirname(dirname(chromium.executablePath())));
    const ffmpegDirectory = readdirSync(cache)
      .filter((name) => /^ffmpeg-\d+$/.test(name))
      .sort()
      .pop();
    if (!ffmpegDirectory) throw new Error('No installed Playwright FFmpeg fallback found');
    const ffmpeg = join(
      cache,
      ffmpegDirectory,
      process.platform === 'win32'
        ? 'ffmpeg-win64.exe'
        : process.platform === 'darwin'
          ? 'ffmpeg-mac'
          : 'ffmpeg-linux'
    );
    if (!existsSync(ffmpeg)) throw new Error(`Installed encoder not found: ${ffmpeg}`);
    const frames = await withCanvas((page) =>
      page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext('2d')!;
        return Array.from({ length: 30 }, (_, frame) => {
          context.fillStyle = frame % 2 ? '#2463eb' : '#dd493d';
          context.fillRect(0, 0, 320, 180);
          context.fillStyle = '#fff';
          context.fillRect((frame * 13) % 280, 55, 40, 70);
          return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        });
      })
    );
    const encoded = spawnSync(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'image2pipe',
        '-c:v',
        'mjpeg',
        '-framerate',
        '30',
        '-i',
        'pipe:0',
        '-an',
        '-c:v',
        'libvpx-vp9',
        '-deadline',
        'realtime',
        '-cpu-used',
        '8',
        '-pix_fmt',
        'yuv420p',
        '-y',
        destination,
      ],
      {
        input: Buffer.concat(frames.map((frame) => Buffer.from(frame, 'base64'))),
        encoding: 'buffer',
        timeout: 15000,
      }
    );
    if (encoded.status !== 0)
      throw new Error(`Installed FFmpeg failed: ${encoded.error ?? encoded.stderr.toString()}`);
  }
  const bytes = readFileSync(destination);
  if (bytes.length < 500) throw new Error(`Invalid native fixture: ${bytes.length} bytes`);
  const manifest = {
    file: destination,
    mime: `video/webm;codecs=${codec}`,
    codec,
    width: 320,
    height: 180,
    frames: 30,
    nominalDurationSeconds: 1,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    method,
    downloadedContent: false,
    limitations,
  };
  writeFileSync(destination + '.json', JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await generateMediaFixture()));
  process.exit(0);
}
