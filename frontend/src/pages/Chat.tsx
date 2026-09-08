import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { humanizeEnum } from '../lib/format';
import type { Match } from '../types/match';
import type { ChatMessage } from '../types/message';

const POLL_INTERVAL_MS = 3000;

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const { userId } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<'forbidden' | 'other' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    api
      .get<Match>(`/matches/${matchId}`)
      .then((res) => setMatch(res.data))
      .catch((err) => setError(err?.response?.status === 403 ? 'forbidden' : 'other'));
  }, [matchId]);

  useEffect(() => {
    if (!matchId || error) return;

    let cancelled = false;

    const fetchMessages = () => {
      api
        .get<ChatMessage[]>(`/matches/${matchId}/messages`)
        .then((res) => {
          if (!cancelled) setMessages(res.data);
        })
        .catch((err) => {
          if (!cancelled) setError(err?.response?.status === 403 ? 'forbidden' : 'other');
        });
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId, error]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || !draft.trim()) return;

    setSending(true);
    try {
      const res = await api.post<ChatMessage>(`/matches/${matchId}/messages`, { body: draft.trim() });
      setMessages((prev) => [...prev, res.data]);
      setDraft('');
    } catch {
      // polling will pick up any state change; leave the draft in place for retry
    } finally {
      setSending(false);
    }
  };

  if (error === 'forbidden') {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
        <p className="text-[15px] text-ink-muted">You're not part of this match.</p>
        <Link to="/matches" className="mt-4 inline-block text-[14.5px] font-semibold text-brass-dark">
          Back to your matches
        </Link>
      </div>
    );
  }

  if (error === 'other') {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-16 text-center">
        <p className="text-[15px] text-ink-muted">Couldn't load this chat. Try refreshing the page.</p>
        <Link to="/matches" className="mt-4 inline-block text-[14.5px] font-semibold text-brass-dark">
          Back to your matches
        </Link>
      </div>
    );
  }

  const otherParty = match && (match.matchedUserId === userId ? match.request.requester : match.matchedUser);

  return (
    <div className="mx-auto flex h-[calc(100svh-140px)] max-w-[760px] flex-col px-6 py-8">
      <div className="border-b border-border pb-4">
        <Link to="/matches" className="text-[13px] font-semibold text-brass-dark">
          ← Your matches
        </Link>
        <h1 className="mt-2 font-serif text-[26px] font-semibold text-ink">
          {otherParty ? otherParty.name : 'Loading…'}
        </h1>
        {match && (
          <p className="mt-1 text-[14px] text-ink-muted">
            {match.request.seferOrTopic || humanizeEnum(match.request.topic)}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-5">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-[14px] text-ink-muted">
            No messages yet. Say hello.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={
                    isMine
                      ? 'max-w-[75%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14.5px] text-bg'
                      : 'max-w-[75%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-2.5 text-[14.5px] text-ink'
                  }
                >
                  {msg.body}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2.5 border-t border-border pt-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-full border border-border bg-bg px-4 py-2.5 text-[14.5px] text-ink focus:border-border-strong focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="rounded-full bg-brass px-5 py-2.5 text-[14px] font-semibold text-surface transition-colors hover:bg-brass-dark disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
