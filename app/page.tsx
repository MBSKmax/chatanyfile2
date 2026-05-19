'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }
type ChatHistory = { id: string; fileName: string; messages: Message[]; fileContent: string }

export default function Home() {
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<ChatHistory[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const welcome: Message = {
          role: 'assistant',
          content: `✅ "${selectedFile.name}" ready! Ask me anything.`
        }
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
    <div style={{ display: 'flex', height: '100dvh', background: '#0d0d14', color: '#f0f0f5', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Sidebar Overlay — Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20 }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: 240,
        background: '#111118',
        borderRight: '1px solid #1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 30,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💬</div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Chat<span style={{ color: '#6366f1' }}>AnyFile</span></span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#6b6b90', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <button onClick={newChat} style={{ margin: 12, padding: '8px 12px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 10, color: '#a0a0c0', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
          + New Chat
        </button>

        <div style={{ padding: '4px 16px', fontSize: 11, color: '#4a4a6a', letterSpacing: 1 }}>RECENT</div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {history.length === 0 && (
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#4a4a6a' }}>No chats yet</div>
          )}
          {history.map(h => (
            <div key={h.id} onClick={() => loadChat(h)} style={{ margin: '2px 8px', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: activeId === h.id ? '#1e1e2e' : 'transparent', fontSize: 13, color: activeId === h.id ? '#c0c0d8' : '#6b6b90', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {h.fileName}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#a0a0c0', padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>☰</button>
          <span style={{ flex: 1, fontSize: 13, color: '#6b6b90', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName ? `📄 ${fileName}` : 'ChatAnyFile'}
          </span>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Upload
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.json,.xml,.html,.htm,.rtf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        {/* Upload Area */}
        {!fileContent && (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 24, textAlign: 'center' }}
          >
            {uploading ? (
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
                <p style={{ color: '#6366f1' }}>Processing...</p>
              </div>
            ) : (
              <div style={{ border: '2px dashed #2a2a3e', borderRadius: 16, padding: '40px 24px', width: '100%', maxWidth: 400 }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📂</div>
                <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Tap to upload file</p>
                <p style={{ color: '#6b6b80', marginBottom: 16, fontSize: 14 }}>PDF • Word • PPT • Excel • Text</p>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['PDF', 'DOC', 'PPT', 'XLS', 'TXT'].map(e => (
                    <span key={e} style={{ background: '#1e1e2e', padding: '3px 8px', borderRadius: 6, fontSize: 11, color: '#8888aa' }}>{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Area */}
        {fileContent && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1e1e2e', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '10px 14px', background: '#1e1e2e', borderRadius: '16px 16px 16px 4px', color: '#6366f1' }}>⏳ Thinking...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2e', display: 'flex', gap: 8, flexShrink: 0, background: '#0d0d14' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Ask anything..."
                style={{ flex: 1, padding: '12px 14px', background: '#1a1a28', border: '1px solid #2a2a3e', borderRadius: 12, color: '#f0f0f5', fontSize: 15, outline: 'none' }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{ padding: '12px 16px', background: loading ? '#2a2a3e' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 18, cursor: loading ? 'not-allowed' : 'pointer' }}
              >➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}