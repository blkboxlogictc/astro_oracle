import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface ChatSession {
  id: string;
  title: string;
  mode: 'science' | 'mystic';
  preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_used: string[] | null;
  created_at: string;
}

export function useChatSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) { setSessions([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    setSessions((data as ChatSession[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async (title: string, mode: 'science' | 'mystic'): Promise<ChatSession | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title, mode })
      .select()
      .single();
    if (error || !data) return null;
    const session = data as ChatSession;
    setSessions(prev => [session, ...prev]);
    return session;
  };

  const renameSession = async (id: string, title: string) => {
    await supabase.from('chat_sessions').update({ title }).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const deleteSession = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const updateSession = async (id: string, patch: Partial<Pick<ChatSession, 'preview' | 'mode' | 'updated_at'>>) => {
    await supabase.from('chat_sessions').update(patch).eq('id', id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const saveMessage = async (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    toolsUsed?: string[],
  ) => {
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role,
      content,
      tools_used: toolsUsed?.length ? toolsUsed : null,
    });
  };

  const loadMessages = async (sessionId: string): Promise<DBMessage[]> => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return (data as DBMessage[]) ?? [];
  };

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    renameSession,
    deleteSession,
    updateSession,
    saveMessage,
    loadMessages,
  };
}
