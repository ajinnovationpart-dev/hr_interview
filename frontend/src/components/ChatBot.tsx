import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button, Input, Spin } from 'antd'
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'
import { apiA } from '../utils/apiA'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: Date
}

const WELCOME = '면접/일정에 대해 궁금한 것을 자연어로 질문해 보세요.\n예: 신규 등록된 면접이 어떤게 있어? / 내가 들어가야 되는 면접 일정은? / 이력서 파악해서 질문 리스트 작성해줘'

export function ChatBot() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const isAdmin = location.pathname.startsWith('/admin')
  const isInterviewer = location.pathname.startsWith('/interviewer')
  const showChat = isAuthenticated && (isAdmin || isInterviewer)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      at: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await apiA.post<{ success: boolean; data: { reply: string } }>('/chat', { message: text })
      const reply = data?.data?.reply ?? '답변을 불러올 수 없습니다.'
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: reply,
        at: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: err?.response?.data?.message || '응답을 가져오는 중 오류가 발생했습니다.',
        at: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
    } finally {
      setLoading(false)
    }
  }

  if (!showChat) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
        }}
      >
        {open ? (
          <div
            style={{
              width: 380,
              maxWidth: 'calc(100vw - 48px)',
              height: 480,
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e8e8e8',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: '#1890ff',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600 }}>면접 도우미</span>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setOpen(false)}
                style={{ color: '#fff' }}
              />
            </div>
            <div
              ref={listRef}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    color: '#666',
                    fontSize: 13,
                    whiteSpace: 'pre-wrap',
                    padding: 8,
                  }}
                >
                  {WELCOME}
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: m.role === 'user' ? '#1890ff' : '#f0f0f0',
                    color: m.role === 'user' ? '#fff' : '#000',
                    fontSize: 13,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start' }}>
                  <Spin size="small" />
                </div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="질문 입력..."
                disabled={loading}
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} />
            </div>
          </div>
        ) : (
          <Button
            type="primary"
            size="large"
            icon={<MessageOutlined />}
            onClick={() => setOpen(true)}
            style={{ width: 56, height: 56, borderRadius: 28, boxShadow: '0 2px 12px rgba(24,144,255,0.4)' }}
          />
        )}
      </div>
    </>
  )
}
