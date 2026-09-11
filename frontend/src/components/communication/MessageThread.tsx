'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageThreadSummary, ID } from '@/types';
import { Button } from '@/components/ui/Button';

export interface MessageThreadProps {
  thread: MessageThreadSummary | null;
  messages: Message[];
  currentUserId: ID;
  onSendMessage: (body: string) => Promise<void>;
  onBack?: () => void;
  loading: boolean;
}

function formatMessageTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDateSeparator(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function MessageThread({
  thread,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  loading,
}: MessageThreadProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(trimmed);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!thread) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-neutral-50/50 text-neutral-500">
        <span className="text-4xl mb-3">💬</span>
        <h3 className="text-sm font-bold text-neutral-700">No conversation selected</h3>
        <p className="text-xs text-neutral-500 max-w-xs text-center mt-1">
          Select an active conversation from the list or start a new thread to contact a parent or teacher.
        </p>
      </div>
    );
  }

  const initials = thread.otherUser.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-neutral-50/30">
      {/* Thread Header */}
      <div className="p-3.5 bg-white border-b border-neutral-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1.5 -ml-1 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label="Back to conversations list"
            >
              ←
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 truncate">
                {thread.otherUser.name}
              </h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 capitalize">
                {thread.otherUser.role}
              </span>
            </div>

            {thread.studentContext && (
              <p className="text-xs text-neutral-500 truncate">
                {thread.otherUser.role === 'parent' ? 'Parent of ' : 'Student: '}
                <strong className="text-neutral-700 font-medium">
                  {thread.studentContext.studentName}
                </strong>
                {thread.studentContext.className && (
                  <span className="text-neutral-500 ml-1">
                    ({thread.studentContext.className})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Safeguarding Notice Pill (Mandatory Acceptance Requirement §13) */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-full text-[11px] text-amber-800 shrink-0">
          <span className="text-xs">🛡️</span>
          <span className="font-medium">Safeguarding Monitored</span>
          <span
            className="cursor-help text-amber-600 hover:text-amber-900 font-bold ml-0.5"
            title="All communications are audited by school administration for student safeguarding compliance."
          >
            ⓘ
          </span>
        </div>
      </div>

      {/* Safeguarding mobile banner */}
      <div className="sm:hidden px-3 py-1 bg-amber-50 border-b border-amber-200/40 text-[10px] text-amber-800 flex items-center justify-center gap-1">
        <span>🛡️</span>
        <span>Threads are logged for student safeguarding compliance</span>
      </div>

      {/* Message History */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-500">
            <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-purple-600 rounded-full animate-spin mr-2" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-xs text-neutral-500">
            <p>No messages yet in this conversation.</p>
            <p className="mt-1">Send a greeting to start the thread.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            const prevMsg = messages[index - 1];
            const showDateSep =
              !prevMsg ||
              new Date(msg.sentAt).toDateString() !== new Date(prevMsg.sentAt).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-200/60 text-neutral-600 text-[10px] font-semibold">
                      {formatMessageDateSeparator(msg.sentAt)}
                    </span>
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-md md:max-w-lg rounded-2xl px-4 py-2.5 shadow-2xs text-xs leading-relaxed break-words ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-white text-neutral-900 border border-neutral-200/80 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>

                  {/* Metadata: timestamp & read receipt */}
                  <div
                    className={`flex items-center gap-1 text-[10px] text-neutral-500 mt-1 px-1 ${
                      isMe ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="font-mono">{formatMessageTime(msg.sentAt)}</span>
                    {isMe && (
                      <span className="font-medium">
                        {msg.readAt ? (
                          <span
                            className="text-purple-600 font-semibold"
                            title={`Read at ${new Date(msg.readAt).toLocaleTimeString()}`}
                          >
                            ✓✓ Read
                          </span>
                        ) : (
                          <span>✓ Sent</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Composer Bar */}
      <div className="p-3 bg-white border-t border-neutral-200/80">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 min-w-0 relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-none placeholder:text-neutral-500 leading-relaxed"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isSending}
            className="h-14 px-5 shrink-0 shadow-xs flex items-center justify-center gap-1.5"
          >
            {isSending ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <span className="text-xs">↗</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
