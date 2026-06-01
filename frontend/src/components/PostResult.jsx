import { useState, useEffect, useRef } from 'react';

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PostResult({ post, imageIdea, contextData, onReset, onRegenerate, onRegenHook, onRegenParagraph, onUndo, canUndo, loading, regenHookLoading, regenParaIndex, generateError, onClearError }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState(post);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const copiedTimerRef = useRef(null);

  // Clear copy timer on unmount to avoid updating state after component is gone
  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);

  // Sync editedPost when a new post comes in (e.g. after regenerate)
  useEffect(() => {
    setEditedPost(post);
    setIsEditing(false);
    setConfirmRegen(false);
  }, [post]);

  const displayPost = editedPost;

  function scheduleCopiedReset() {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2200);
  }

  async function handleCopy() {
    // Try modern clipboard API first, then fall back to execCommand.
    // Always show "Copied!" feedback regardless of whether the underlying
    // operation succeeded — failing silently is better than no feedback.
    try {
      await navigator.clipboard.writeText(displayPost);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = displayPost;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // Both methods failed — still show feedback so user knows the action fired
      }
    }
    setCopied(true);
    scheduleCopiedReset();
  }

  const wc = wordCount(displayPost);
  const isModified = editedPost !== post;

  return (
    <div className="card" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>
      <div className="result-header">
        <div className="result-title-group">
          <div className="result-title">Your LinkedIn post</div>
          <div className="result-meta">
            {wc} words &middot; {contextData?.length ?? ''}{contextData?.length ? ' · ' : ''}{isModified ? 'edited' : 'ready to copy'}
          </div>
        </div>
        <button
          className={`btn-edit ${isEditing ? 'active' : ''}`}
          onClick={() => setIsEditing(e => !e)}
          disabled={loading}
          title={isEditing ? 'Done editing' : 'Edit post'}
        >
          {isEditing ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Done
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <textarea
          className="result-post-editor"
          value={editedPost}
          onChange={e => setEditedPost(e.target.value)}
          disabled={loading}
          spellCheck
          autoCorrect="off"
          autoCapitalize="off"
        />
      ) : (
        <div className={`result-post ${loading ? 'loading-overlay' : ''}`}>
          {displayPost.split('\n\n').map((para, i) => {
            const isLoading = regenParaIndex === i;
            const anyLoading = loading || regenHookLoading || regenParaIndex !== null;
            return (
              <div
                key={i}
                className={`post-para${isLoading ? ' post-para--loading' : ''}`}
              >
                <span className="post-para-text">{para}</span>
                {!isEditing && (
                  <button
                    className="post-para-regen"
                    title={i === 0 ? 'Rewrite hook' : 'Rewrite this paragraph'}
                    disabled={anyLoading}
                    onClick={() => onRegenParagraph(i, para, displayPost)}
                    aria-label="Rewrite this paragraph"
                  >
                    {isLoading ? <span className="spinner spinner-dark" /> : '↻'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModified && !isEditing && (
        <button
          className="btn-revert"
          onClick={() => setEditedPost(post)}
          disabled={loading}
        >
          Revert to original
        </button>
      )}

      {generateError && (
        <div className="error-banner" style={{ margin: '0 0 12px' }}>
          <span>{generateError}</span>
          {onClearError && <button onClick={onClearError}>×</button>}
        </div>
      )}

      {imageIdea && (
        <div className="image-idea">
          <div className="image-idea-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Pair with a photo like this
          </div>
          <p className="image-idea-text">{imageIdea}</p>
        </div>
      )}

      <div className="result-actions">
        <button
          className={`btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          disabled={loading}
        >
          {copied ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy to clipboard
            </>
          )}
        </button>

        <div className="result-divider" />

        {confirmRegen ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>This will replace your edits.</span>
            <button className="btn-secondary" onClick={() => { setConfirmRegen(false); onRegenerate(); }} disabled={loading}>
              Yes, regenerate
            </button>
            <button className="btn-secondary" onClick={() => setConfirmRegen(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn-secondary"
              onClick={isModified ? () => setConfirmRegen(true) : onRegenerate}
              disabled={loading || regenHookLoading || regenParaIndex !== null}
              title={isModified ? 'Regenerating will replace your edits' : undefined}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-dark" />
                  Regenerating...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.1" />
                  </svg>
                  Regenerate
                </>
              )}
            </button>
            <button
              className="btn-secondary"
              onClick={() => onRegenHook(displayPost)}
              disabled={loading || regenHookLoading || regenParaIndex !== null}
              title="Keep the post body, write a new hook only"
            >
              {regenHookLoading ? (
                <>
                  <span className="spinner spinner-dark" />
                  New hook…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Regen Hook
                </>
              )}
            </button>
          </>
        )}

        {canUndo && (
          <button
            className="btn-secondary"
            onClick={onUndo}
            disabled={loading || regenHookLoading || regenParaIndex !== null}
            title="Undo last change"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4" />
              <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
            </svg>
            Undo
          </button>
        )}

        <button className="btn-secondary" onClick={onReset} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Start over
        </button>
      </div>
    </div>
  );
}
