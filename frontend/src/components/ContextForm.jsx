import { useState, useRef } from 'react';

export default function ContextForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', role: '', length: 'medium' });
  const [touched, setTouched] = useState({ name: false, role: false });
  const [image, setImage] = useState(null); // { base64, mimeType, preview, name }
  const [imgError, setImgError] = useState('');
  const fileInputRef = useRef(null);

  const isValid = form.name.trim() && form.role.trim();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImgError('');
    if (file.size > 5 * 1024 * 1024) {
      setImgError('Image must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const mimeType = result.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
      const base64 = result.split(',')[1];
      setImage({ base64, mimeType, preview: result, name: file.name });
    };
    reader.onerror = () => {
      setImgError('Could not read file. Please try a different image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);
    setImgError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) {
      // Force-touch both fields so the "Required" messages appear
      setTouched({ name: true, role: true });
      return;
    }
    onSubmit({
      ...form,
      ...(image ? { imageBase64: image.base64, imageMimeType: image.mimeType } : {}),
    });
  }

  return (
    <div className="card">
      <div className="context-hero">
        <div className="context-eyebrow">✦ LinkedIn Story Generator</div>
        <h1 className="context-title">What do you want to talk about today?</h1>
        <p className="context-subtitle">
          We’ll ask you a few questions, then turn your answers into a polished LinkedIn post.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Your name</label>
            <input
              id="name"
              name="name"
              type="text"
              className={`form-input${touched.name && !form.name.trim() ? ' form-input--error' : ''}`}
              placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="given-name"
              maxLength={100}
            />
            {touched.name && !form.name.trim() && (
              <span className="form-error">Required</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Your role <span>at Loop</span>
            </label>
            <input
              id="role"
              name="role"
              type="text"
              className={`form-input${touched.role && !form.role.trim() ? ' form-input--error' : ''}`}
              placeholder="e.g. Product Manager"
              value={form.role}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={200}
            />
            {touched.role && !form.role.trim() && (
              <span className="form-error">Required</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Post length</label>
          <div className="length-options">
            {[
              { value: 'short',  label: 'Short',  range: '100–150 words' },
              { value: 'medium', label: 'Medium', range: '180–240 words' },
              { value: 'long',   label: 'Long',   range: '250–300 words' },
            ].map(opt => (
              <label key={opt.value} className="length-option">
                <input
                  type="radio"
                  name="length"
                  value={opt.value}
                  checked={form.length === opt.value}
                  onChange={handleChange}
                />
                <span className="length-option-label">
                  <span className="length-name">{opt.label}</span>
                  <span className="length-range">{opt.range}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Attach a screenshot <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span>
          </label>
          {!image ? (
            <div
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleImageChange({ target: { files: e.dataTransfer.files } });
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="upload-area-text">Click or drag a screenshot here</span>
              <span className="upload-area-sub">JPG, PNG, WEBP — max 5 MB</span>
            </div>
          ) : (
            <div className="upload-preview">
              <img src={image.preview} alt="Attached screenshot" className="upload-thumb" />
              <div className="upload-preview-info">
                <span className="upload-preview-name">{image.name}</span>
                <button type="button" className="upload-remove" onClick={removeImage}>Remove</button>
              </div>
            </div>
          )}
          {imgError && <p className="upload-error">{imgError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />
        </div>

        <button type="submit" className={`btn-primary${!isValid ? ' btn-primary--disabled' : ''}`}>
          Start interview <span style={{ fontSize: 18 }}>→</span>
        </button>
      </form>
    </div>
  );
}
