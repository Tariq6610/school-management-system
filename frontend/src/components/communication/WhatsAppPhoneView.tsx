'use client';

import React from 'react';
import { WhatsAppLog } from '@/types';
import { useBranding } from '@/components/providers/BrandingProvider';

export interface WhatsAppPhoneViewProps {
  logs: WhatsAppLog[];
  selectedRecipient: string;
  onSelectRecipient: (recipient: string) => void;
  uniqueRecipients: string[];
}

function formatWhatsAppTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function WhatsAppPhoneView({
  logs,
  selectedRecipient,
  onSelectRecipient,
  uniqueRecipients,
}: WhatsAppPhoneViewProps) {
  const { schoolName } = useBranding();
  // Filter logs for selected recipient (or all)
  const displayLogs = logs
    .filter((log) => {
      if (selectedRecipient === 'all') return true;
      return log.recipientName === selectedRecipient;
    })
    .sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1)); // Chronological in phone chat

  return (
    <div className="flex flex-col items-center">
      {/* Recipient switcher above phone */}
      <div className="w-full max-w-[380px] mb-3 flex items-center justify-between gap-2 px-1">
        <label htmlFor="whatsapp-parent-filter" className="text-xs font-semibold text-neutral-600">
          Phone View Recipient:
        </label>
        <select
          id="whatsapp-parent-filter"
          value={selectedRecipient}
          onChange={(e) => onSelectRecipient(e.target.value)}
          className="text-xs font-medium bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-neutral-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="all">All Inbound Logs ({logs.length})</option>
          {uniqueRecipients.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Realistic Smartphone Chassis */}
      <div className="relative w-[340px] sm:w-[380px] h-[690px] bg-neutral-900 rounded-[48px] p-3 shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700/50 flex flex-col select-none overflow-hidden">
        {/* Dynamic Island / Camera Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-950 rounded-full z-40 flex items-center justify-end px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
        </div>

        {/* Screen Area */}
        <div className="w-full h-full bg-[#EFEAE2] rounded-[38px] overflow-hidden flex flex-col relative">
          {/* Status Bar */}
          <div className="h-9 bg-[#075E54] text-white/90 text-[11px] font-semibold px-6 pt-1.5 flex items-center justify-between shrink-0 z-30">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>5G</span>
              <span>📶</span>
              <span>🔋 100%</span>
            </div>
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center justify-between shadow-md shrink-0 z-20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-white/80 hover:text-white text-base leading-none pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                aria-label="Back"
              >
                ‹
              </button>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-emerald-800 border border-white/20 flex items-center justify-center text-sm font-bold text-white shadow-xs">
                  🏫
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#075E54] rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                    {schoolName}
                  </h4>
                  <span
                    className="text-emerald-300 text-[11px]"
                    title="Verified Official Business Account"
                  >
                    ✓
                  </span>
                </div>
                <p className="text-[10px] text-white/75 truncate">
                  Official Business Account · online
                </p>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-3 text-white/85 text-xs">
              <span className="cursor-pointer hover:text-white" title="Video Call">
                📹
              </span>
              <span className="cursor-pointer hover:text-white" title="Voice Call">
                📞
              </span>
              <span className="cursor-pointer hover:text-white text-sm" title="More options">
                ⋮
              </span>
            </div>
          </div>

          {/* Chat Messages Body with WhatsApp Doodle Background */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-neutral-800 text-xs bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]">
            {/* End-to-end Encryption Notice */}
            <div className="mx-auto max-w-[280px] bg-[#FFEECD] text-[#54656F] text-[10px] leading-tight text-center py-1.5 px-3 rounded-lg shadow-2xs border border-[#F4DCB0]/70 my-1">
              🔒 Messages and notifications are end-to-end encrypted. Meta Business API.
            </div>

            {/* Date separator */}
            <div className="flex justify-center my-1">
              <span className="bg-white/90 backdrop-blur-xs text-neutral-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-2xs uppercase tracking-wider">
                TODAY
              </span>
            </div>

            {displayLogs.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 text-xs space-y-1">
                <p className="font-semibold">No messages yet</p>
                <p className="text-[11px]">
                  Use the control panel to simulate real school triggers.
                </p>
              </div>
            ) : (
              displayLogs.map((log) => {
                const isRead = log.status === 'read';
                const isDelivered = log.status === 'delivered' || isRead;

                return (
                  <div key={log.id} className="flex flex-col items-start max-w-[88%]">
                    {/* Message Card */}
                    <div className="bg-white text-neutral-900 rounded-2xl rounded-tl-xs p-2.5 shadow-xs border border-neutral-200/60 relative group">
                      {/* Business Sender Header */}
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-100 mb-1">
                        <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                          {schoolName.split(' ')[0]}
                          <span className="text-[9px] font-normal text-neutral-500">
                            ~ {log.trigger}
                          </span>
                        </span>
                        <span className="text-[9px] px-1 rounded bg-neutral-100 text-neutral-600 font-mono">
                          {log.recipientName}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="whitespace-pre-line text-neutral-800 leading-snug text-xs font-normal">
                        {log.body}
                      </div>

                      {/* Footer: Time & Double Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-neutral-500">
                        <span>{formatWhatsAppTime(log.sentAt)}</span>
                        {isDelivered && (
                          <span
                            className={isRead ? 'text-sky-500 font-bold' : 'text-neutral-500'}
                            title={isRead ? 'Read' : 'Delivered'}
                          >
                            ✓✓
                          </span>
                        )}
                        {!isDelivered && (
                          <span className="text-neutral-500" title="Sent">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Chat Bar Mockup */}
          <div className="bg-[#F0F2F5] px-2.5 py-2 flex items-center gap-2 border-t border-neutral-200 shrink-0">
            <span className="text-base text-neutral-500 cursor-pointer">😊</span>
            <span className="text-base text-neutral-500 cursor-pointer">📎</span>
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-neutral-500 text-xs shadow-2xs border border-neutral-200/80 truncate">
              Type a message...
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00A884] text-white flex items-center justify-center text-xs shadow-xs cursor-pointer">
              🎤
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
