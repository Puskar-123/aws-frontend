import React, { useEffect, useRef, useState } from "react";
import { uploadVoiceMessage } from "../../services/chatApi";
import "./voice.css";
const format = (value) =>
  `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
const preferredType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find(
    (value) => window.MediaRecorder?.isTypeSupported?.(value),
  ) || "";
export default function VoiceRecorder({ conversationId, onSent, disabled }) {
  const [phase, setPhase] = useState("idle"),
    [seconds, setSeconds] = useState(0),
    [blob, setBlob] = useState(null),
    [url, setUrl] = useState(""),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const recorder = useRef(null),
    stream = useRef(null),
    chunks = useRef([]),
    timer = useRef(null),
    clientId = useRef(null);
  const clearTimer = () => {
    clearInterval(timer.current);
    timer.current = null;
  };
  const release = () => {
    clearTimer();
    for (const track of stream.current?.getTracks?.() || []) track.stop();
    stream.current = null;
  };
  useEffect(
    () => () => {
      release();
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const reset = () => {
    release();
    if (url) URL.revokeObjectURL(url);
    setUrl("");
    setBlob(null);
    setSeconds(0);
    setProgress(0);
    setError("");
    setPhase("idle");
    clientId.current = null;
  };
  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const type = preferredType();
      recorder.current = new MediaRecorder(
        stream.current,
        type ? { mimeType: type } : undefined,
      );
      chunks.current = [];
      recorder.current.ondataavailable = (event) =>
        event.data?.size && chunks.current.push(event.data);
      recorder.current.onstop = () => {
        const value = new Blob(chunks.current, {
          type: recorder.current.mimeType || "audio/webm",
        });
        setBlob(value);
        setUrl(URL.createObjectURL(value));
        setPhase("preview");
        release();
      };
      recorder.current.start(1000);
      setPhase("recording");
      setSeconds(0);
      timer.current = setInterval(
        () =>
          setSeconds((value) => {
            if (value >= 299) {
              recorder.current?.stop();
              return 300;
            }
            return value + 1;
          }),
        1000,
      );
    } catch (value) {
      release();
      setError(
        value.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "The microphone is unavailable.",
      );
    }
  };
  const pause = () => {
    recorder.current?.pause();
    clearTimer();
    setPhase("paused");
  };
  const resume = () => {
    recorder.current?.resume();
    timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    setPhase("recording");
  };
  const stop = () => {
    clearTimer();
    recorder.current?.stop();
  };
  const send = async () => {
    if (!blob) return;
    setPhase("uploading");
    setError("");
    clientId.current ||= crypto.randomUUID();
    try {
      const message = await uploadVoiceMessage(conversationId, blob, {
        durationMs: Math.max(1, seconds) * 1000,
        clientMessageId: clientId.current,
        onProgress: setProgress,
      });
      onSent?.(message);
      reset();
    } catch (value) {
      setError(value.message);
      setPhase("preview");
    }
  };
  return (
    <div className="voice-recorder">
      {phase === "idle" && (
        <button
          id="record-voice"
          name="record-voice"
          type="button"
          onClick={start}
          disabled={disabled}
          aria-label="Record voice message"
        >
          Microphone
        </button>
      )}
      {["recording", "paused"].includes(phase) && (
        <>
          <span role="timer">
            {format(seconds)} {phase}
          </span>
          {phase === "recording" ? (
            <button
              id="pause-voice"
              name="pause-voice"
              type="button"
              onClick={pause}
              aria-label="Pause"
            >
              Pause
            </button>
          ) : (
            <button
              id="resume-voice"
              name="resume-voice"
              type="button"
              onClick={resume}
              aria-label="Resume"
            >
              Resume
            </button>
          )}
          <button
            id="stop-voice"
            name="stop-voice"
            type="button"
            onClick={stop}
            aria-label="Stop"
          >
            Stop
          </button>
          <button
            id="cancel-voice"
            name="cancel-voice"
            type="button"
            onClick={reset}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </>
      )}
      {["preview", "uploading"].includes(phase) && (
        <>
          <audio controls src={url} />
          <button
            id="rerecord-voice"
            name="rerecord-voice"
            type="button"
            onClick={reset}
            disabled={phase === "uploading"}
            aria-label="Re-record"
          >
            Re-record
          </button>
          <button
            id="send-voice"
            name="send-voice"
            type="button"
            onClick={send}
            disabled={phase === "uploading"}
            aria-label={error ? "Retry" : "Send voice"}
          >
            {phase === "uploading"
              ? `Uploading ${progress}%`
              : error
                ? "Retry"
                : "Send voice"}
          </button>
        </>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
