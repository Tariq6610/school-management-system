'use client';

import React, { useState } from 'react';
import { WhatsAppLog } from '@/types';
import { WHATSAPP_TEMPLATES, WhatsAppTemplateDefinition } from '@/lib/repositories/whatsappLog';

export interface WhatsAppControlPanelProps {
  logs: WhatsAppLog[];
  onTriggerAbsence: () => Promise<void>;
  onTriggerFeeReminder: () => Promise<void>;
  onTriggerHomework: () => Promise<void>;
  onTriggerAnnouncement: () => Promise<void>;
  onTriggerResultPublished: () => Promise<void>;
  onClearLogs: () => Promise<void>;
  triggering: boolean;
}

export function WhatsAppControlPanel({
  logs,
  onTriggerAbsence,
  onTriggerFeeReminder,
  onTriggerHomework,
  onTriggerAnnouncement,
  onTriggerResultPublished,
  onClearLogs,
  triggering,
}: WhatsAppControlPanelProps) {
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'log' | 'templates'>('log');

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (triggerFilter !== 'all' && log.trigger !== triggerFilter) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = log.recipientName.toLowerCase().includes(q);
      const matchPhone = log.recipientPhone.toLowerCase().includes(q);
      const matchBody = log.body.toLowerCase().includes(q);
      const matchTrigger = log.trigger.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchBody && !matchTrigger) return false;
    }
    return true;
  });

  // KPIs
  const totalCount = logs.length;
  const deliveredCount = logs.filter((l) => l.status === 'delivered' || l.status === 'read').length;
  const readCount = logs.filter((l) => l.status === 'read').length;
  const readPercentage = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col space-y-6">
      {/* 1. KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Total Dispatched
          </span>
          <span className="text-xl font-bold text-neutral-900 mt-1 block">
            {totalCount}
          </span>
          <span className="text-[10px] text-neutral-500">Inbound log entries</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Delivered
          </span>
          <span className="text-xl font-bold text-emerald-950 mt-1 block">
            {deliveredCount}
          </span>
          <span className="text-[10px] text-emerald-600">Meta Handshake ✓✓</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
            Read Rate
          </span>
          <span className="text-xl font-bold text-sky-950 mt-1 block">
            {readPercentage}%
          </span>
          <span className="text-[10px] text-sky-600">{readCount} Opened</span>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
            Approved Templates
          </span>
          <span className="text-xl font-bold text-purple-950 mt-1 block">
            5 / 5
          </span>
          <span className="text-[10px] text-purple-600">Meta Verified</span>
        </div>
      </div>

      {/* 2. Interactive Real Trigger Simulator */}
      <div className="bg-linear-to-r from-emerald-900 via-[#075E54] to-emerald-950 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h3 className="text-sm font-bold tracking-tight">
                Simulate Real School Triggers
              </h3>
            </div>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Click any button to trigger the canonical WhatsApp message template and append it to the live inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearLogs}
            disabled={triggering || logs.length === 0}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 border border-white/20 transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            Clear Log
          </button>
        </div>

        {/* 5 Real Template Trigger Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3.5">
          <button
            type="button"
            onClick={onTriggerAbsence}
            disabled={triggering}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:translate-y-[-1px] disabled:opacity-50"
          >
            <span className="text-lg p-1.5 rounded-lg bg-rose-500/20 text-rose-300">🚨</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">1. Absence Alert</span>
              <span className="text-[10px] text-emerald-200/70 truncate block">
                Teacher attendance submission
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onTriggerFeeReminder}
            disabled={triggering}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:translate-y-[-1px] disabled:opacity-50"
          >
            <span className="text-lg p-1.5 rounded-lg bg-amber-500/20 text-amber-300">💳</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">2. Fee Reminder</span>
              <span className="text-[10px] text-emerald-200/70 truncate block">
                Defaulter billing notice
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onTriggerHomework}
            disabled={triggering}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:translate-y-[-1px] disabled:opacity-50"
          >
            <span className="text-lg p-1.5 rounded-lg bg-sky-500/20 text-sky-300">📚</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">3. Homework Alert</span>
              <span className="text-[10px] text-emerald-200/70 truncate block">
                Teacher LMS assignment
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onTriggerAnnouncement}
            disabled={triggering}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:translate-y-[-1px] disabled:opacity-50"
          >
            <span className="text-lg p-1.5 rounded-lg bg-purple-500/20 text-purple-300">📢</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">4. Announcement</span>
              <span className="text-[10px] text-emerald-200/70 truncate block">
                Campus-wide notification
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onTriggerResultPublished}
            disabled={triggering}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:translate-y-[-1px] disabled:opacity-50 sm:col-span-2 lg:col-span-1"
          >
            <span className="text-lg p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">🏆</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">5. Result Published</span>
              <span className="text-[10px] text-emerald-200/70 truncate block">
                Official exam publication
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Tab Switcher: Message Log vs Meta Template Inspector */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'log'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Message Log Registry ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <span>Meta WhatsApp Templates (5)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
            Compliance
          </span>
        </button>
      </div>

      {/* Tab 1: Live Message Log Registry */}
      {activeTab === 'log' && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-3.5 border-b border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search recipient, phone, body..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              {/* Trigger Filter */}
              <select
                aria-label="Filter by trigger"
                value={triggerFilter}
                onChange={(e) => setTriggerFilter(e.target.value)}
                className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">All Triggers</option>
                <option value="Absence">Absence</option>
                <option value="Fee reminder">Fee reminder</option>
                <option value="Homework">Homework</option>
                <option value="Announcement">Announcement</option>
                <option value="Result published">Result published</option>
              </select>

              {/* Status Filter */}
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">All Delivery Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="sent">Sent</option>
              </select>
            </div>

            <span className="text-xs font-semibold text-neutral-500 self-end sm:self-auto">
              Showing {filteredLogs.length} of {logs.length}
            </span>
          </div>

          {/* Table */}
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No WhatsApp messages matched your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Trigger & Time</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Message Content</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.trigger}
                        </span>
                        <div className="text-[10px] text-neutral-500 mt-1 font-mono">
                          {new Date(item.sentAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-neutral-900">{item.recipientName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {item.recipientPhone}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-top max-w-sm">
                        <p className="text-xs text-neutral-700 leading-relaxed line-clamp-3">
                          {item.body}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 align-top whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.status === 'read'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : item.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {item.status === 'read' && '✓✓ Read'}
                          {item.status === 'delivered' && '✓✓ Delivered'}
                          {item.status === 'sent' && '✓ Sent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Meta WhatsApp Business Template Copy Inspector */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200/80 text-xs text-purple-900">
            <h4 className="font-bold flex items-center gap-1.5 text-purple-950">
              <span>📋</span> Meta WhatsApp Business Compliance Rationale
            </h4>
            <p className="mt-1 leading-relaxed text-purple-800">
              Per specification §16: <em>&quot;The real value of this screen is the copy. These templates must eventually be approved by Meta before they can be sent, and rejected templates cost days. Reviewing the wording with the school now, on a mock, is free.&quot;</em>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {Object.values(WHATSAPP_TEMPLATES).map((tmpl: WhatsAppTemplateDefinition) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-xl p-4 border border-neutral-200/80 shadow-2xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-900">{tmpl.name}</h4>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                      {tmpl.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                      {tmpl.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ✓ {tmpl.metaStatus}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 font-mono text-xs text-neutral-800 whitespace-pre-line leading-relaxed">
                  {tmpl.templateText}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-neutral-700">Trigger Event:</span>
                    <span>{tmpl.description}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-neutral-700">Variables:</span>
                    <span className="font-mono text-emerald-700">
                      {tmpl.variables.map((v) => `{${v}}`).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
