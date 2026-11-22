// Browser-only: sample N evenly spaced frames from a video as base64 JPEGs.
export async function extractFrames(src: string, count = 8, width = 480): Promise<{ t: number; data: string }[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = src;

  // iOS Safari may not fire loadeddata for a detached video; accept canplay too, and never hang.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("This video took too long to load. Try a shorter MP4.")), 10000);
    const ok = () => { clearTimeout(timer); resolve(); };
    video.onloadeddata = ok;
    video.oncanplay = ok;
    video.onerror = () => { clearTimeout(timer); reject(new Error("Could not read this video format. Try recording again, or upload an MP4.")); };
    video.load();
    // iOS Safari may not buffer a video until it plays; muted inline play is allowed without a gesture.
    video.play().then(() => video.pause()).catch(() => {});
  });
  video.pause();

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error("Could not read the video length.");

  const scale = width / video.videoWidth;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;

  const frames: { t: number; data: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / count);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 4000); // 4K HEVC seeks are slow on phones; never hang the flow
      video.onseeked = () => { clearTimeout(timer); resolve(); };
      video.currentTime = t;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({ t: Math.round(t * 10) / 10, data: canvas.toDataURL("image/jpeg", 0.75).split(",")[1] });
  }
  return frames;
}
