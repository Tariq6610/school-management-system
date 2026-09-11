'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Scope, WhatsAppLog } from '@/types';
import {
  clearWhatsAppLogs,
  listWhatsAppLogs,
  triggerAbsenceWhatsAppAlert,
  triggerAnnouncementWhatsAppAlert,
  triggerFeeReminderWhatsAppAlert,
  triggerHomeworkWhatsAppAlert,
  triggerResultPublishedWhatsAppAlert,
} from '@/lib/repositories/whatsappLog';
import { WhatsAppPhoneView } from './WhatsAppPhoneView';
import { WhatsAppControlPanel } from './WhatsAppControlPanel';
import { useOptionalToast } from '@/components/ui/Toast';

export interface WhatsAppMockShellProps {
  schoolId?: string;
}

export function WhatsAppMockShell({ schoolId = 'sch_main' }: WhatsAppMockShellProps) {
  const toastCtx = useOptionalToast();
  const notify = (title: string, type: 'success' | 'error' | 'info' = 'success') => {
    toastCtx?.showToast({ title, type });
  };
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all');
  const [triggering, setTriggering] = useState<boolean>(false);
  const scope: Scope = useMemo(() => ({ schoolId }), [schoolId]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    async function fetchLogs() {
      try {
        const items = await listWhatsAppLogs(scope);
        if (isMounted) {
          setLogs(items);
        }
      } catch (err) {
        console.error('[WhatsAppMockShell] Failed to load WhatsApp logs:', err);
      }
    }
    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [scope]);

  // Unique recipient list
  const uniqueRecipients = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      if (l.recipientName) set.add(l.recipientName);
    }
    return Array.from(set);
  }, [logs]);

  // Trigger Action 1: Absence
  const handleTriggerAbsence = async () => {
    try {
      setTriggering(true);
      const newLog = await triggerAbsenceWhatsAppAlert(scope, {
        parentName: 'Tariq Khan',
        studentName: 'Ahmed Khan',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        campusName: 'Main Campus',
        phone: '+92 306 7890123',
      });
      setLogs((prev) => [newLog, ...prev]);
      notify('Absence alert dispatched to WhatsApp log!', 'success');
    } catch (err) {
      console.error('[WhatsAppMock] Absence trigger failed:', err);
      notify('Failed to trigger absence alert', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Trigger Action 2: Fee Reminder
  const handleTriggerFeeReminder = async () => {
    try {
      setTriggering(true);
      const newLog = await triggerFeeReminderWhatsAppAlert(scope, {
        parentName: 'Tariq Khan',
        studentName: 'Ahmed Khan',
        amount: 18500,
        date: '15 Sep 2026',
        campusName: 'Main Campus',
        phone: '+92 306 7890123',
      });
      setLogs((prev) => [newLog, ...prev]);
      notify('Fee reminder dispatched to WhatsApp log!', 'success');
    } catch (err) {
      console.error('[WhatsAppMock] Fee reminder trigger failed:', err);
      notify('Failed to trigger fee reminder', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Trigger Action 3: Homework
  const handleTriggerHomework = async () => {
    try {
      setTriggering(true);
      const newLog = await triggerHomeworkWhatsAppAlert(scope, {
        subject: 'Mathematics',
        studentName: 'Ahmed Khan',
        date: 'Friday, 18 Sep',
        campusName: 'Main Campus',
        parentName: 'Tariq Khan',
        phone: '+92 306 7890123',
      });
      setLogs((prev) => [newLog, ...prev]);
      notify('Homework notification dispatched to WhatsApp log!', 'success');
    } catch (err) {
      console.error('[WhatsAppMock] Homework trigger failed:', err);
      notify('Failed to trigger homework alert', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Trigger Action 4: Announcement
  const handleTriggerAnnouncement = async () => {
    try {
      setTriggering(true);
      const newLog = await triggerAnnouncementWhatsAppAlert(scope, {
        title: 'Mid-Term Parent-Teacher Meeting',
        body: 'PTM for Grade 6-10 will be conducted this Saturday from 9:00 AM to 1:00 PM. All parents are requested to attend.',
        campusName: 'Main Campus',
        parentName: 'Tariq Khan',
        phone: '+92 306 7890123',
      });
      setLogs((prev) => [newLog, ...prev]);
      notify('Announcement dispatched to WhatsApp log!', 'success');
    } catch (err) {
      console.error('[WhatsAppMock] Announcement trigger failed:', err);
      notify('Failed to trigger announcement', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Trigger Action 5: Result Published
  const handleTriggerResultPublished = async () => {
    try {
      setTriggering(true);
      const newLog = await triggerResultPublishedWhatsAppAlert(scope, {
        examName: 'Mid-Term Examinations 2026',
        studentName: 'Ahmed Khan',
        campusName: 'Main Campus',
        parentName: 'Tariq Khan',
        phone: '+92 306 7890123',
      });
      setLogs((prev) => [newLog, ...prev]);
      notify('Result publication alert dispatched to WhatsApp log!', 'success');
    } catch (err) {
      console.error('[WhatsAppMock] Result published trigger failed:', err);
      notify('Failed to trigger result alert', 'error');
    } finally {
      setTriggering(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm('Clear all mock WhatsApp messages?')) return;
    try {
      setTriggering(true);
      await clearWhatsAppLogs(scope);
      setLogs([]);
      notify('WhatsApp log cleared', 'info');
    } catch (err) {
      console.error('[WhatsAppMock] Clear failed:', err);
      notify('Failed to clear logs', 'error');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Smartphone WhatsApp Inbox View */}
      <div className="lg:col-span-5 flex justify-center lg:sticky lg:top-20">
        <WhatsAppPhoneView
          logs={logs}
          selectedRecipient={selectedRecipient}
          onSelectRecipient={setSelectedRecipient}
          uniqueRecipients={uniqueRecipients}
        />
      </div>

      {/* Right: Control Panel, Real Trigger Simulator & Meta Copy Inspector */}
      <div className="lg:col-span-7">
        <WhatsAppControlPanel
          logs={logs}
          onTriggerAbsence={handleTriggerAbsence}
          onTriggerFeeReminder={handleTriggerFeeReminder}
          onTriggerHomework={handleTriggerHomework}
          onTriggerAnnouncement={handleTriggerAnnouncement}
          onTriggerResultPublished={handleTriggerResultPublished}
          onClearLogs={handleClearLogs}
          triggering={triggering}
        />
      </div>
    </div>
  );
}
