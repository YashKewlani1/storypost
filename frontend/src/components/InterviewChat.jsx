import { useState, useEffect, useRef, useCallback } from 'react';

const PROD_API_KEY = import.meta.env.VITE_INTERNAL_API_KEY || '';

export default function InterviewChat({ contextData, onComplete, apiPost, onReset }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const sendShortcut = isMac ? '⌘ + Enter' : 'Ctrl + Enter';
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const [started, setStarted]             = useState(false);
  const [error, setError]                 = useState(null);
  const [listening, setListening]         = useState(false);
  const [transcribing, setTranscribing]   = useState(false);
  const [imageLoading, setImageLoading]   = useState(false);
  const [attachedImage, setAttachedImage] = useState(null); // full data URL string

  const bottomRef        = useRef(null);
  const textareaRef      = useRef(null);
  const attachInputRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);
  const recognitionRef   = useRef(null);
  const interimBaseRef   = useRef('');
  const isMountedRef     = useRef(true);
  const inputRef         = useRef(input);       // stable ref for startRecording snapshot
  const sendingRef       = useRef(false);        // double-send guard
  const speechThrottleRef = useRef(null);        // throttle interim speech updates
  const pendingSpeechRef  = useRef(null);        // latest pending speech display value

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Keep inputRef in sync without adding input as a dep to startRecording
  useEffect(() => { inputRef.current = input; }, [input]);

  // Scroll only when messages are added — not on every chatLoading flip
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (messages.length !== prevLenRef.current || chatLoading) {
      prevLenRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, chatLoading]);

  useEffect(() => {
    if (!chatLoading && started && !listening) textareaRef.current?.focus();
  }, [chatLoading, started, listening]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [input]);

  useEffect(() => {
    return () => {
      stopAll();
      if (speechThrottleRef.current) clearTimeout(speechThrottleRef.current);
    };
  }, []);

  function stopAll() {
    try { recognitionRef.current?.abort(); } catch {}
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (speechThrottleRef.current) {
      clearTimeout(speechThrottleRef.current);
      speechThrottleRef.current = null;
    }
  }

  function handleAttachImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setImageLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (isMountedRef.current) {
        setAttachedImage(reader.result); // store full data URL — derive base64 at send time
        setImageLoading(false);
      }
    };
    reader.onerror = () => {
      if (isMountedRef.current) {
        setError('Failed to read image. Try a different file.');
        setImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const blob     = new Blob(chunksRef.current, { type: mimeType });
        const filename = mimeType.includes('mp4') ? 'recording.mp4' : 'recording.webm';
        if (!isMountedRef.current) return;
        setTranscribing(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          // In MOCK mode there's no server — return placeholder text so voice still works offline
          if (import.meta.env.VITE_MOCK === 'true') {
            if (isMountedRef.current) setInput('[Mock voice — type your answer instead]');
            return;
          }
          const form = new FormData();
          form.append('audio', blob, filename);
          const transcribeHeaders = {};
          if (PROD_API_KEY) transcribeHeaders['X-API-Key'] = PROD_API_KEY;
          const res  = await fetch('/api/transcribe', { method: 'POST', body: form, headers: transcribeHeaders, signal: controller.signal });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Transcription failed');
          if (data.text && isMountedRef.current) setInput(data.text.trim().slice(0, 2000));
        } catch (err) {
          if (!isMountedRef.current) return;
          setError(err.name === 'AbortError' ? 'Transcription timed out. Try typing instead.' : (err.message || 'Transcription failed. Try typing.'));
        } finally {
          clearTimeout(timer);
          if (isMountedRef.current) setTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang           = 'en-IN';
        rec.continuous     = true;
        rec.interimResults = true;

        // Snapshot whatever is typed right now — use ref, not closure dep
        interimBaseRef.current = inputRef.current;

        const toAscii = str => str.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

        rec.onresult = e => {
          let finalDelta = '';
          let interim    = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalDelta += toAscii(e.results[i][0].transcript);
            else interim = toAscii(e.results[i][0].transcript);
          }
          if (finalDelta) interimBaseRef.current = (interimBaseRef.current + ' ' + finalDelta).trim();
          const display = interim
            ? (interimBaseRef.current + ' ' + interim).trim()
            : interimBaseRef.current;

          // Throttle: max one setInput per 80ms to avoid constant reflows
          pendingSpeechRef.current = display;
          if (!speechThrottleRef.current) {
            speechThrottleRef.current = setTimeout(() => {
              speechThrottleRef.current = null;
              if (isMountedRef.current && pendingSpeechRef.current !== null) {
                setInput(pendingSpeechRef.current);
              }
            }, 80);
          }
        };

        // Filter non-actionable speech errors — 'no-speech' fires on silence, not a real error
        rec.onerror = e => {
          if (e.error !== 'aborted' && e.error !== 'no-speech' && isMountedRef.current) {
            setError('Mic error: ' + e.error);
          }
        };
        rec.start();
        recognitionRef.current = rec;
      }

      setListening(true);
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError') {
        setError('Microphone access denied. Allow it in your browser settings.');
      } else if (name === 'NotFoundError') {
        setError('No microphone found. Plug one in or type instead.');
      } else {
        setError('Could not start microphone. Try typing instead.');
      }
    }
  // No dependency on `input` — we read it via inputRef at snapshot time
  }, []);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) stopRecording();
    else startRecording();
  }, [listening, startRecording, stopRecording]);

  async function startInterview() {
    setStarted(true);
    setChatLoading(true);
    setError(null);
    try {
      const result = await apiPost('/api/interview', { ...contextData, messages: [] });
      setMessages([{ role: 'assistant', content: result.message, id: crypto.randomUUID() }]);
    } catch (err) {
      setError(err.message);
      setStarted(false);
    } finally {
      setChatLoading(false);
    }
  }

  function wordCount(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
  }

  async function sendMessage() {
    if (!input.trim() || chatLoading || sendingRef.current) return;
    if (listening) stopRecording();

    sendingRef.current = true; // guard against double-tap before re-render

    const pendingText = input.trim();
    const userMsg     = { role: 'user', content: pendingText, id: crypto.randomUUID() };
    const updated     = [...messages, userMsg];

    // Optimistically show message + clear input immediately
    setMessages(updated);
    setInput('');
    interimBaseRef.current = '';
    setChatLoading(true);
    setError(null);

    // ── SMART END ──────────────────────────────────────────────────────────────
    const totalUserWords = updated
      .filter(m => m.role === 'user')
      .reduce((sum, m) => sum + wordCount(m.content), 0);
    const currentWords = wordCount(userMsg.content);
    const allUserText  = updated.filter(m => m.role === 'user').map(m => m.content).join(' ');

    const hasNumber    = /\d/.test(userMsg.content);
    const hasPastEvent = /\b(last year|last month|last week|last quarter|yesterday|recently|earlier this year|this year|this month|this week|a few weeks|a few months|when i|i was|we (had|were|ran|built|tried|did)|i had|it happened|one day|at the time|that day|that week|that month)\b/i.test(userMsg.content);
    const hasStorySignal = hasNumber || hasPastEvent;

    const hasOutcome = /\b(worked|failed|changed|realized|realised|learnt|learned|decided|ended up|turned out|result|outcome|difference|impact|fixed|shipped|launched|hired|fired|closed|won|lost|broke|solved|refactored|resolved|cleared|improved|grew|reduced|dropped|increased|hit|found|discovered|delivered|cut|confirmed|approved|authorized|authorised|sorted|settled|managed|completed|handled|saved|covered|helped|answered|served|paid|renewed|switched|moved|stopped|started)\b/i.test(userMsg.content);

    const anyNumberInConvo    = /\d/.test(allUserText);
    const anyPastEventInConvo = /\b(last year|last month|last week|last quarter|yesterday|recently|earlier this year|this year|this month|this week|a few weeks|a few months|when i|i was|we (had|were|ran|built|tried|did)|i had|it happened|one day|at the time|that day|that week|that month)\b/i.test(allUserText);
    const anySignalInConvo    = anyNumberInConvo || anyPastEventInConvo;
    const anyOutcomeInConvo   = /\b(worked|failed|changed|realized|realised|learnt|learned|decided|ended up|turned out|result|outcome|difference|impact|fixed|shipped|launched|hired|fired|closed|won|lost|broke|solved|refactored|resolved|cleared|improved|grew|reduced|dropped|increased|hit|found|discovered|delivered|cut|confirmed|approved|authorized|authorised|sorted|settled|managed|completed|handled|saved|covered|helped|answered|served|paid|renewed|switched|moved|stopped|started)\b/i.test(allUserText);

    const smartEndTriggered =
      (currentWords >= 50 && hasStorySignal && hasOutcome) ||
      (currentWords >= 60 && hasStorySignal) ||
      (totalUserWords >= 100 && anySignalInConvo && anyOutcomeInConvo) ||
      totalUserWords >= 150;
    // ── END SMART END ──────────────────────────────────────────────────────────

    try {
      const result = await apiPost('/api/interview', {
        ...contextData,
        messages: updated,
        ...(smartEndTriggered ? { checkReady: true } : {}),
      });
      const withReply = [...updated, { role: 'assistant', content: result.message, id: crypto.randomUUID() }];
      setMessages(withReply);
      if (result.done) {
        // Derive base64 + mimeType from stored data URL at send time
        let imagePayload = null;
        if (attachedImage) {
          const mimeType = attachedImage.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
          const base64   = attachedImage.split(',')[1];
          imagePayload   = { base64, mimeType, preview: attachedImage };
        }
        setAttachedImage(null);
        onComplete(withReply, imagePayload);
      }
    } catch (err) {
      if (isMountedRef.current) {
        // Revert optimistic message and restore input so user can retry
        setMessages(messages);
        setInput(pendingText);
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) setChatLoading(false);
      sendingRef.current = false;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  }

  const micSupported = !!navigator.mediaDevices?.getUserMedia;

  if (!started) {
    return (
      <div className="card">
        <div className="context-hero">
          <div className="context-eyebrow">✦ Interview</div>
          <h2 className="context-title" style={{ fontSize: '1.75rem' }}>Ready when you are.</h2>
          <p className="context-subtitle">We’ll ask you a few questions and turn your answers into a LinkedIn post.</p>
        </div>
        {error && (
          <div className="error-banner" style={{ marginBottom: 20 }}>
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        <button className="btn-primary" onClick={startInterview} disabled={chatLoading} autoFocus>
          {chatLoading ? <><span className="spinner" /> Starting…</> : <>Let's go →</>}
        </button>
        {onReset && (
          <button className="btn-secondary" onClick={onReset} style={{ marginTop: 10 }} disabled={chatLoading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Start over
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="chat-header">
        <span className="chat-title">Interview</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onReset && !chatLoading && (
            <button
              onClick={onReset}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, padding: 0 }}
              title="Start over"
            >
              ← Start over
            </button>
          )}
          <span className="chat-hint">{sendShortcut} to send</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(m => (
          <div key={m.id ?? m.content} className={`chat-row chat-row-${m.role}`}>
            {m.role === 'assistant' && <div className="chat-avatar">✦</div>}
            <div className={`chat-bubble chat-bubble-${m.role}`}>{m.content}</div>
          </div>
        ))}
        {chatLoading && (
          <div className="chat-row chat-row-assistant">
            <div className="chat-avatar">✦</div>
            <div className="chat-bubble chat-bubble-assistant chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        {error && (
          <div className="error-banner" style={{ marginBottom: 8 }}>
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Attached image thumbnail */}
        {(attachedImage || imageLoading) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {imageLoading ? (
              <div style={{ width: 48, height: 48, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 16, height: 16 }} />
              </div>
            ) : (
              <img src={attachedImage} alt="Attached" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
            )}
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {imageLoading ? 'Loading…' : 'Screenshot attached — used when generating your post'}
            </span>
            {!imageLoading && (
              <button
                onClick={() => setAttachedImage(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                aria-label="Remove image"
              >×</button>
            )}
          </div>
        )}

        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className={`chat-textarea ${listening ? 'chat-textarea--listening' : ''}`}
            placeholder={transcribing ? 'Transcribing…' : 'Type your reply…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={chatLoading || transcribing}
            maxLength={2000}
          />

          <input
            ref={attachInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleAttachImage}
          />

          <button
            className="chat-mic-btn"
            onClick={() => attachInputRef.current?.click()}
            disabled={chatLoading || transcribing || imageLoading}
            aria-label="Attach screenshot"
            title="Attach a screenshot"
            style={attachedImage ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
          >
            {imageLoading ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </button>

          {micSupported && (
            <button
              className={`chat-mic-btn ${listening ? 'chat-mic-btn--active' : ''}`}
              onClick={toggleVoice}
              disabled={chatLoading || transcribing}
              aria-label={listening ? 'Stop recording' : 'Record voice'}
            >
              {listening ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : transcribing ? (
                <span className="spinner" style={{ width: 14, height: 14 }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
          )}

          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={chatLoading || transcribing || !input.trim()}
            aria-label="Send"
          >↑</button>
        </div>

        <div className="char-hint">
          {listening
            ? '🔴 Listening — tap square to stop'
            : transcribing
              ? 'Transcribing…'
              : input.length > 0
                ? `${input.length} / 2000`
                : micSupported ? 'Type or tap mic to speak' : `${sendShortcut} to send`}
        </div>
      </div>
    </div>
  );
}
