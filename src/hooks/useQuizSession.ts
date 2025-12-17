import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { QuizSession, Player, Question, PlayerAnswer, Violation, Quiz } from '@/types/quiz';

interface UseQuizSessionOptions {
  sessionId: string | null;
  playerId?: string | null;
}

export function useQuizSession({ sessionId, playerId }: UseQuizSessionOptions) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial data fetch
  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch session
        const { data: sessionData } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionData) {
          setSession(sessionData as QuizSession);

          // Fetch quiz details (to get time_per_question)
          const { data: quizData } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', sessionData.quiz_id)
            .single();

          if (quizData) setQuiz(quizData as Quiz);

          // Fetch questions
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', sessionData.quiz_id)
            .order('order_index');
          
          if (questionsError) {
            console.error('Error fetching questions:', questionsError);
          }
          
          if (questionsData && questionsData.length > 0) {
            console.debug('[fetch] questions count', sessionData.quiz_id, questionsData.length);
            setQuestions(questionsData.map(q => ({
              ...q,
              options: Array.isArray(q.options) ? q.options as string[] : []
            })) as Question[]);
          } else {
            console.warn('[fetch] no questions found for quiz', sessionData.quiz_id);
          }
        }

        // Fetch players
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('session_id', sessionId)
          .order('total_score', { ascending: false });
        
        if (playersData) {
          console.debug('[fetch] players count', sessionId, playersData.length);
          setPlayers(playersData as Player[]);
        }

        // Fetch violations for joined players
        if (playersData && playersData.length > 0) {
          const { data: violationsData } = await supabase
            .from('violations')
            .select('*')
            .in('player_id', playersData.map(p => p.id));
          
          if (violationsData) setViolations(violationsData as Violation[]);
        }

      } catch (error) {
        console.error('Error fetching quiz data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const sessionChannel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quiz_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) setSession(payload.new as QuizSession);
      })
      // Handle players incrementally to reflect joins immediately
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        try {
          const newPlayer = payload.new as Player;
          console.debug('[realtime] players INSERT', sessionId, newPlayer?.id);
          setPlayers(prev => {
            if (prev.find(p => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer].sort((a, b) => b.total_score - a.total_score);
          });
        } catch (err) {
          console.error('Players INSERT handler error:', err);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        try {
          const updated = payload.new as Player;
          console.debug('[realtime] players UPDATE', sessionId, updated?.id);
          setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p)
            .sort((a, b) => b.total_score - a.total_score));
        } catch (err) {
          console.error('Players UPDATE handler error:', err);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        try {
          const old = payload.old as Player;
          console.debug('[realtime] players DELETE', sessionId, old?.id);
          setPlayers(prev => prev.filter(p => p.id !== old.id));
        } catch (err) {
          console.error('Players DELETE handler error:', err);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'violations',
      }, (payload) => {
        try {
          const newViolation = payload.new as Violation;
          // Append violation; UI components can filter by player id as needed
          setViolations(prev => [...prev, newViolation]);
        } catch (err) {
          console.error('Violations realtime handler error:', err);
        }
      })
      .subscribe();

    // Log channel state
    console.debug('[realtime] subscribed to session channel', sessionId);

    // Polling fallback: refetch players every 2 seconds to ensure they always appear
    // even if realtime events are missed (network delays, RLS issues, etc.)
    const pollInterval = window.setInterval(async () => {
      try {
        const { data } = await supabase
          .from('players')
          .select('*')
          .eq('session_id', sessionId)
          .order('total_score', { ascending: false });
        if (data) {
          setPlayers(prev => {
            // Only update if counts differ (new player joined or player left)
            if (prev.length !== data.length) {
              console.debug('[poll] players changed', sessionId, 'prev:', prev.length, 'new:', data.length);
              return data as Player[];
            }
            // Check if any player's score changed
            const scoreChanged = prev.some((p, i) => data[i]?.total_score !== p.total_score);
            if (scoreChanged) {
              return data as Player[];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Poll refetch players failed:', err);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId]);

  // Fetch player's answers
  useEffect(() => {
    if (!playerId) return;

    const fetchAnswers = async () => {
      const { data } = await supabase
        .from('player_answers')
        .select('*')
        .eq('player_id', playerId);
      if (data) setAnswers(data as PlayerAnswer[]);
    };

    fetchAnswers();

    const answersChannel = supabase
      .channel(`answers-${playerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_answers',
        filter: `player_id=eq.${playerId}`,
      }, async () => {
        const { data } = await supabase
          .from('player_answers')
          .select('*')
          .eq('player_id', playerId);
        if (data) setAnswers(data as PlayerAnswer[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(answersChannel);
    };
  }, [playerId]);

  const currentQuestion = questions[session?.current_question_index || 0] || null;

  // Log when currentQuestion changes for diagnostics
  useEffect(() => {
    if (currentQuestion) {
      console.debug('[session] currentQuestion:', session?.current_question_index, currentQuestion.question_text.substring(0, 50));
    } else if (session?.status === 'question') {
      console.warn('[session] currentQuestion is null but status is "question"', session?.current_question_index, 'questions.length:', questions.length);
    }
  }, [currentQuestion, session?.current_question_index, questions.length, session?.status]);

  const getPlayerViolations = useCallback((pId: string) => {
    return violations.filter(v => v.player_id === pId);
  }, [violations]);

  const getTop3Players = useCallback(() => {
    return players
      .filter(p => !p.is_disqualified)
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 3);
  }, [players]);

  return {
    session,
    players,
    questions,
    answers,
    violations,
    quiz,
    currentQuestion,
    loading,
    getPlayerViolations,
    getTop3Players,
  };
}
