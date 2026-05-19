'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }
type ChatHistory = { id: string; fileName: string; messages: Message[]; fileContent: string }
type Theme = 'dark' | 'light' | 'purple'

const themes = {
  dark: {
    bg: '#0d0d14', sidebar: '#111118', border: '#1e1e2e',
    input: '#1a1a28', bubble: '#1e1e2e', text: '#f0f0f5',
    muted: '#6b6b90', accent: '#6366f1', accent2: '#8b5cf6',
    topbar: '#0d0d14'
  },
  light: {
    bg: '#f5f5f7', sidebar: '#ffffff', border: '#e0e0e8',
    input: '#ffffff', bubble: '#ffffff', text: '#1a1a2e',
    muted: '#8888aa', accent: '#6366f1', accent2: '#8b5cf6',
    topbar: '#ffffff'
  },
  purple: {
    bg: '#0f0a1e', sidebar: '#150d2e', border: '#2a1a4e',
    input: '#1a0f35', bubble: '#1e1040', text: '#f0eeff',
    muted: '#8070b0', accent: '#a855f7', accent2: '#7c3aed',
    topbar: '#0f0a1e'
  }
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<ChatHistory[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sendGlow, setSendGlow] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = themes[theme]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile) return
    setUploading(true)
    setMessages([])
    setFileContent('')
    setFileName(selectedFile.name)
    setSidebarOpen(false)
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.content) {
        const id = Date.now().toString()
        const welcome: Message = { role: 'assistant', content: `✅ "${selectedFile.name}" ready! Ask me anything about this file.` }
        setFileContent(data.content)
        setMessages([welcome])
        setActiveId(id)
        setHistory(prev => [{ id, fileName: selectedFile.name, messages: [welcome], fileContent: data.content }, ...prev])
      } else {
        setMessages([{ role: 'assistant', content: `❌ Error: ${data.error}` }])
      }
    } catch {
      setMessages([{ role: 'assistant', content: '❌ Upload failed.' }])
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !fileContent || loading) return
    setSendGlow(true)
    setTimeout(() => setSendGlow(false), 600)
    const userMsg: Message = { role: 'user', content: input }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, fileContent, history: messages })
      })
      const data = await res.json()
      const aiMsg: Message = { role: 'assistant', content: data.reply || data.error }
      const final = [...updated, aiMsg]
      setMessages(final)
      setHistory(prev => prev.map(h => h.id === activeId ? { ...h, messages: final } : h))
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const loadChat = (chat: ChatHistory) => {
    setActiveId(chat.id)
    setFileName(chat.fileName)
    setFileContent(chat.fileContent)
    setMessages(chat.messages)
    setSidebarOpen(false)
  }

  const newChat = () => {
    setFileContent('')
    setFileName('')
    setMessages([])
    setActiveId(null)
    setInput('')
    setSidebarOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%   { box-shadow: 0 0 0px ${t.accent}; }
          50%  { box-shadow: 0 0 18px ${t.accent}, 0 0 35px ${t.accent2}; }
          100% { box-shadow: 0 0 0px ${t.accent}; }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-6px); }
        }
        .msg-animate { animation: fadeSlideUp 0.3s ease forwards; }
        .send-glow   { animation: glowPulse 0.6s ease; }
        .dot1 { animation: typingBounce 1.2s infinite 0.0s; }
        .dot2 { animation: typingBounce 1.2s infinite 0.2s; }
        .dot3 { animation: typingBounce 1.2s infinite 0.4s; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
        input:focus { outline: none !important; border-color: ${t.accent} !important; box-shadow: 0 0 0 2px ${t.accent}33 !important; }
      `}</style>

      <div style={{ display: 'flex', height: '100dvh', background: t.bg, color: t.text, fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}>

        {/* Overlay */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20 }} />}

        {/* Sidebar */}
        <div style={{ width: 240, background: t.sidebar, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${t.accent},${t.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💬</div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Chat<span style={{ color: t.accent }}>AnyFile</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          <button onClick={newChat} style={{ margin: 12, padding: '8px 12px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 10, color: t.muted, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>+ New Chat</button>

          {/* Theme Switcher */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 11, color: t.muted, marginBottom: 8, letterSpacing: 1 }}>THEME</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['dark', 'light', 'purple'] as Theme[]).map(th => (
                <button key={th} onClick={() => setTheme(th)} style={{ flex: 1, padding: '5px 4px', borderRadius: 8, border: `1px solid ${theme === th ? t.accent : t.border}`, background: theme === th ? t.accent + '22' : 'transparent', color: theme === th ? t.accent : t.muted, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {th === 'dark' ? '🌙' : th === 'light' ? '☀️' : '💜'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '8px 16px 4px', fontSize: 11, color: t.muted, letterSpacing: 1 }}>RECENT</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {history.length === 0 && <div style={{ padding: '12px 16px', fontSize: 13, color: t.muted }}>No chats yet</div>}
            {history.map(h => (
              <div key={h.id} onClick={() => loadChat(h)} style={{ margin: '2px 8px', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: activeId === h.id ? t.accent + '22' : 'transparent', fontSize: 13, color: activeId === h.id ? t.accent : t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all 0.2s' }}>
                📄 {h.fileName}
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

          {/* Top Bar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10, background: t.topbar, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.muted, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>☰</button>
            <span style={{ flex: 1, fontSize: 13, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName ? `📄 ${fileName}` : '💬 ChatAnyFile'}
            </span>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 14px', background: `linear-gradient(135deg,${t.accent},${t.accent2})`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}>
              + Upload
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.json,.xml,.html,.htm,.rtf,.log,.yaml,.yml" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Upload Area */}
          {!fileContent && (
            <div onClick={() => fileInputRef.current?.click()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 24, textAlign: 'center' }}>
              {uploading ? (
                <div>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>⚙️</div>
                  <p style={{ color: t.accent, fontSize: 16 }}>Processing your file...</p>
                </div>
              ) : (
                <div style={{ border: `2px dashed ${t.border}`, borderRadius: 20, padding: '48px 32px', width: '100%', maxWidth: 420, transition: 'border-color 0.2s' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>📂</div>
                  <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Drop or tap to upload</p>
                  <p style={{ color: t.muted, marginBottom: 18, fontSize: 14 }}>PDF • Word • PPT • Excel • JSON • HTML • Text</p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['PDF','DOCX','PPTX','XLSX','TXT','JSON','XML','HTML'].map(e => (
                      <span key={e} style={{ background: t.bubble, padding: '3px 10px', borderRadius: 6, fontSize: 11, color: t.muted, border: `1px solid ${t.border}` }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Area */}
          {fileContent && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.map((msg, i) => (
                  <div key={i} className="msg-animate" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${t.accent},${t.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginRight: 8, flexShrink: 0 }}>💬</div>
                    )}
                    <div style={{ maxWidth: '80%', padding: '11px 16px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? `linear-gradient(135deg,${t.accent},${t.accent2})` : t.bubble, border: msg.role === 'assistant' ? `1px solid ${t.border}` : 'none', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: t.text }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="msg-animate" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${t.accent},${t.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💬</div>
                    <div style={{ padding: '12px 16px', background: t.bubble, border: `1px solid ${t.border}`, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[1,2,3].map(n => (
                        <div key={n} className={`dot${n}`} style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 8, flexShrink: 0, background: t.topbar }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Ask anything about your file..."
                  style={{ flex: 1, padding: '13px 16px', background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, color: t.text, fontSize: 15, outline: 'none', transition: 'all 0.2s' }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={sendGlow ? 'send-glow' : ''}
                  style={{ padding: '13px 18px', background: loading || !input.trim() ? t.border : `linear-gradient(135deg,${t.accent},${t.accent2})`, border: 'none', borderRadius: 14, color: '#fff', fontSize: 20, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: !input.trim() ? 0.5 : 1 }}
                >➤</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}