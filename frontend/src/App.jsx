import { useState, useRef } from 'react';
import ContextForm from './components/ContextForm';
import InterviewChat from './components/InterviewChat';
import PostResult from './components/PostResult';
import './App.css';

const MOCK = import.meta.env.VITE_MOCK === 'true';

const MOCK_POST = `Three years ago I sat in a hospital corridor at 11pm with my mother's discharge papers and zero idea what any of it meant.

The diagnosis was clear. The treatment plan was clear. What wasn't clear was how to actually get any of it covered.

I spent the next six hours on hold, transferred between desks, and eventually gave up and paid out of pocket for something that should have been a routine claim. Nobody explained what I'd done wrong. Nobody called back.

That night changed how I think about what "good health coverage" actually means. It's not the policy document. It's the moment someone picks up the phone at 11pm and knows what to do.

I joined this field because that's the gap I actually wanted to close. Most products are built for the 9-to-5, the straightforward case, the person who already knows how the system works.

Real problems don't happen on a schedule.`;

async function mockApi(path, body) {
  await new Promise(r => setTimeout(r, 900));
  if (path === '/api/interview') {
    const msgs = body.messages || [];
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (msgs.length === 0) {
      return { message: "What's one thing about working here that surprised you — good or bad?", done: false };
    }
    const last = userMsgs.at(-1)?.content?.toLowerCase() || '';
    const isStuck = /\bidk\b|irdk|i\s*r\s*d\s*k|don.?t know|no idea|you tell|not sure|nothing comes|can.?t think|no clue|beats me|anything/.test(last);
    if (isStuck && userMsgs.length >= 2) {
      return { message: "No stress. Here are five rough directions:\n\n1. A health experience from your own life or family that connects to why you joined Loop\n2. A member situation you witnessed that moved you (keep it anonymous)\n3. A stat or pattern about health in India that surprises most people\n4. A strong opinion about how insurance or healthcare works — something broken you want to call out\n5. A team moment at Loop that says something real about how you all work\n\nWhich one pulls you? Or push me in a different direction.", done: false };
    }
    if (userMsgs.length === 1) return { message: "Nice. Is there something on your mind lately — a story, something you've noticed, a take on health or insurance in India? What comes to mind?", done: false };
    if (userMsgs.length === 2) return { message: "Tell me more — what was actually going on when that happened?", done: false };
    if (userMsgs.length === 3) return { message: "What was the hardest part of that?", done: false };
    if (userMsgs.length === 4) return { message: "How has that changed the way you work now?", done: false };
    return { message: "That's a really good story. Give me a moment to turn this into your post.", done: true };
  }
  if (path === '/api/generate') return { post: MOCK_POST, imageIdea: 'A pair of hands holding medical papers near a dimly lit window at night. No faces — just the papers and the light, the quiet weight of a moment most people recognize.' };
  throw new Error('Unknown mock path');
}

async function apiPost(path, body, timeoutMs = 45000) {
  if (MOCK) return mockApi(path, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { window.location.href = '/auth/google'; return; }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Taking too long — please try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Phases: context → interview → generating → result
export default function App() {
  const [phase, setPhase]             = useState('context');
  const [generateError, setGenerateError] = useState(null);
  const [regenLoading, setRegenLoading]   = useState(false);
  const regenLoadingRef = useRef(false);
  const [regenHookLoading, setRegenHookLoading] = useState(false);
  const regenHookLoadingRef = useRef(false);
  const [regenParaIndex, setRegenParaIndex] = useState(null); // index of paragraph currently loading
  const [postHistory, setPostHistory] = useState([]); // undo stack — array of previous post strings
  const genIdRef = useRef(0); // incremented on every generate; stale responses are discarded
  const [retryLoading, setRetryLoading]   = useState(false);
  const [contextData, setContextData] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [post, setPost]               = useState('');
  const [imageIdea, setImageIdea]     = useState('');

  function handleContextSubmit(data) {
    setContextData(data);
    setPhase('interview');
  }

  async function handleInterviewComplete(completedMessages, interviewImage) {
    setMessages(completedMessages);
    setGenerateError(null);
    setPhase('generating');
    // Interview screenshot overrides / supplements the one from the context form
    const ctx = interviewImage
      ? { ...contextData, imageBase64: interviewImage.base64, imageMimeType: interviewImage.mimeType }
      : contextData;
    setContextData(ctx);
    await generatePost(completedMessages, ctx);
  }

  async function generatePost(msgs, ctx) {
    if (retryLoading) return;
    const myId = ++genIdRef.current;
    setRetryLoading(true);
    setGenerateError(null);
    try {
      const result = await apiPost('/api/generate', { ...ctx, messages: msgs });
      if (genIdRef.current !== myId) return;
      setPost(result.post);
      setImageIdea(result.imageIdea || '');
      setPhase('result');
    } catch (err) {
      if (genIdRef.current !== myId) return;
      setGenerateError(err.message);
    } finally {
      setRetryLoading(false);
    }
  }

  async function handleRegenHook(currentPostOverride) {
    if (regenHookLoadingRef.current) return;
    regenHookLoadingRef.current = true;
    const myId = ++genIdRef.current;
    setGenerateError(null);
    setRegenHookLoading(true);
    try {
      const result = await apiPost('/api/generate', { ...contextData, messages, hookOnly: true, currentPost: currentPostOverride ?? post });
      if (genIdRef.current !== myId) return;
      pushHistory(post);
      setPost(result.post);
    } catch (err) {
      if (genIdRef.current === myId) setGenerateError(err.message);
    } finally {
      regenHookLoadingRef.current = false;
      setRegenHookLoading(false);
    }
  }

  function pushHistory(currentPost) {
    setPostHistory(h => [...h.slice(-9), currentPost]); // keep last 10
  }

  function handleUndo() {
    setPostHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setPost(prev);
      return h.slice(0, -1);
    });
  }

  async function handleRegenParagraph(index, paragraphText, currentPostOverride) {
    if (regenParaIndex !== null) return; // another para is already loading
    const myId = ++genIdRef.current;
    setGenerateError(null);
    setRegenParaIndex(index);
    try {
      const result = await apiPost('/api/generate', {
        ...contextData,
        messages,
        regenParagraph: true,
        paragraphIndex: index,
        paragraphText,
        // Use the currently displayed (possibly edited) post so user edits to
        // other paragraphs are preserved when a single paragraph is rewritten.
        currentPost: currentPostOverride ?? post,
      });
      if (genIdRef.current !== myId) return;
      pushHistory(post);
      setPost(result.post);
    } catch (err) {
      if (genIdRef.current === myId) setGenerateError(err.message);
    } finally {
      setRegenParaIndex(null);
    }
  }

  async function handleRegenerate() {
    if (regenLoadingRef.current) return;
    regenLoadingRef.current = true;
    const myId = ++genIdRef.current;
    setGenerateError(null);
    setRegenLoading(true);
    try {
      const result = await apiPost('/api/generate', { ...contextData, messages });
      if (genIdRef.current !== myId) return;
      pushHistory(post);
      setPost(result.post);
      setImageIdea(result.imageIdea || '');
    } catch (err) {
      if (genIdRef.current === myId) setGenerateError(err.message);
    } finally {
      regenLoadingRef.current = false;
      setRegenLoading(false);
    }
  }

  function handleReset() {
    genIdRef.current++; // invalidate any in-flight generate/regen
    setPhase('context');
    setContextData(null);
    setMessages([]);
    setPost('');
    setImageIdea('');
    setGenerateError(null);
    regenLoadingRef.current = false;
    setRegenLoading(false);
    regenHookLoadingRef.current = false;
    setRegenHookLoading(false);
    setRetryLoading(false);
    setRegenParaIndex(null);
    setPostHistory([]);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">✦ StoryPost</span>
          {!MOCK && (
            <button
              className="btn-logout"
              onClick={async () => {
                await fetch('/auth/logout', { method: 'POST' });
                window.location.href = '/signin';
              }}
            >Sign out</button>
          )}
        </div>
      </header>

      <main className="app-main">
        {phase === 'context' && (
          <ContextForm onSubmit={handleContextSubmit} />
        )}

        {phase === 'interview' && (
          <InterviewChat
            contextData={contextData}
            onComplete={handleInterviewComplete}
            apiPost={apiPost}
            onReset={handleReset}
          />
        )}

        {phase === 'generating' && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            {generateError ? (
              <>
                <p style={{ color: 'var(--error)', marginBottom: 20 }}>{generateError}</p>
                <button className="btn-primary" onClick={() => generatePost(messages, contextData)} disabled={retryLoading}>
                  {retryLoading ? <><span className="spinner" /> Retrying…</> : 'Try again'}
                </button>
                <button className="btn-secondary" onClick={handleReset} style={{ marginTop: 12 }}>
                  Start over
                </button>
              </>
            ) : (
              <>
                <div className="generating-spinner" style={{ margin: '0 auto 16px' }} />
                <div className="generating-text">
                  Writing your post…
                  <div className="generating-sub">Usually takes about 5–10 seconds.</div>
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'result' && (
          <PostResult
            post={post}
            imageIdea={imageIdea}
            contextData={contextData}
            onReset={handleReset}
            onRegenerate={handleRegenerate}
            onRegenHook={handleRegenHook}
            onRegenParagraph={handleRegenParagraph}
            onUndo={handleUndo}
            canUndo={postHistory.length > 0}
            loading={regenLoading}
            regenHookLoading={regenHookLoading}
            regenParaIndex={regenParaIndex}
            generateError={generateError}
            onClearError={() => setGenerateError(null)}
          />
        )}
      </main>
    </div>
  );
}
