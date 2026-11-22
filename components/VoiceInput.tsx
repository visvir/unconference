"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Props = { onText: (text: string) => void; disabled?: boolean };
type Phase = "idle" | "recording" | "transcribing";

const MAX_SECONDS = 25;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const FAIL = "Couldn't use the microphone. Please type instead.";

const noop = () => () => {};
const supported = () => typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export default function VoiceInput({ onText, disabled }: Props) {
  const canRecord = useSyncExternalStore(noop, supported, () => false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);
  const startingRef = useRef(false); // set synchronously: ignores a double tap while the permission prompt is open

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        try { rec.stop(); } catch { /* already stopped */ }
      }
      cleanup();
    };
  }, []);

  async function send(blob: Blob) {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "checkin");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!aliveRef.current) return;
      if (!res.ok) setError(j.error || FAIL);
      else if (!j.text?.trim()) setError("Didn't catch that. Please try again or type instead.");
      else onText(j.text.trim());
    } catch {
      if (aliveRef.current) setError(FAIL);
    }
    if (aliveRef.current) setPhase("idle");
  }

  async function start() {
    if (startingRef.current) return;
    startingRef.current = true;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop()); // unmounted while the prompt was open
        return;
      }
      streamRef.current = stream;
      const mimeType = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        cleanup();
        if (!aliveRef.current) return;
        setPhase("transcribing");
        void send(new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" }));
      };
      recRef.current = rec;
      rec.start();
      setSecs(0);
      setPhase("recording");
      const began = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000);
        setSecs(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      cleanup();
      setPhase("idle");
      setError(FAIL);
    } finally {
      startingRef.current = false;
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  if (!canRecord) return null;

  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div>
      <button
        type="button"
        onClick={phase === "recording" ? stop : start}
        disabled={disabled || phase === "transcribing"}
        className={`btn btn-quiet ${phase === "recording" ? "!text-coral" : ""}`}
      >
        {phase === "recording" ? (
          <>
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-coral" />
            <span>■ Stop ({mm})</span>
          </>
        ) : phase === "transcribing" ? (
          "Transcribing…"
        ) : (
          "🎙 Speak instead"
        )}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
