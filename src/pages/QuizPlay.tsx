import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuizSession } from '@/hooks/useQuizSession';
import { useProctoring } from '@/hooks/useProctoring';
import { ProctoringSetup } from '@/components/quiz/ProctoringSetup';
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay';
import { ViolationWarning } from '@/components/quiz/ViolationWarning';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Top3Podium } from '@/components/quiz/Top3Podium';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateScore } from '@/types/quiz';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Trophy, Users, Clock } from 'lucide-react';

export default function QuizPlay() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const navigate = useNavigate();
  const [proctoringReady, setProctoringReady] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | undefined>();

  const { 
    session, 
    players, 
    currentQuestion, 
    questions,
    answers,
    loading,
    quiz,
  } = useQuizSession({ sessionId: sessionId || null, playerId });

  const {
    violationCount,
    showWarning,
    warningMessage,
    dismissWarning,
    remainingViolations,
  } = useProctoring({
    playerId: playerId || null,
    // Active only while proctoring is ready, session is in a question,
    // and the quiz hasn't reached question 5 (stop on question 5 and onwards).
    isActive: proctoringReady && session?.status === 'question' && (((session?.current_question_index || 0) + 1) < 5),
    onDisqualified: () => {
      toast.error('You have been disqualified for too many violations');
      // navigate student out to join page
      navigate('/');
    },
  });

  // Fetch current player
  useEffect(() => {
    if (!playerId) return;
    supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()
      .then(({ data }) => {
        if (data) setCurrentPlayer(data);
      });
  }, [playerId]);

  // If server-side disqualifies the player (UPDATE), log them out
  useEffect(() => {
    if (!playerId || !players) return;
    const p = players.find(p => p.id === playerId);
    if (p && p.is_disqualified) {
      toast.error('You have been disqualified');
      navigate('/');
    }
  }, [players, playerId, navigate]);

  // Check if already answered current question
  useEffect(() => {
    if (!currentQuestion || !answers) return;
    const answered = answers.find(a => a.question_id === currentQuestion.id);
    setHasAnsweredCurrent(!!answered);
    setSelectedOption(answered?.selected_option ?? undefined);
  }, [currentQuestion, answers]);

  const handleAnswer = useCallback(async (optionIndex: number, responseTimeMs: number) => {
    if (!playerId || !currentQuestion || hasAnsweredCurrent) return;

    const isCorrect = optionIndex === currentQuestion.correct_option;
    const timeLimitMs = (session && session.question_started_at && session.question_started_at) ?
      ((session?.question_started_at && quiz?.time_per_question) ? quiz.time_per_question * 1000 : 20000)
      : (quiz?.time_per_question ? quiz.time_per_question * 1000 : 20000);

    const points = calculateScore(isCorrect, responseTimeMs, timeLimitMs);

    try {
      await supabase.from('player_answers').insert({
        player_id: playerId,
        question_id: currentQuestion.id,
        selected_option: optionIndex >= 0 ? optionIndex : null,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        points_earned: points,
      });

      // Fetch current score from database and apply points (can be negative)
      const { data: playerData } = await supabase
        .from('players')
        .select('total_score')
        .eq('id', playerId)
        .single();

      const newScore = Math.max(0, (playerData?.total_score || 0) + points);

      await supabase
        .from('players')
        .update({ total_score: newScore })
        .eq('id', playerId);

      // Update local state
      setCurrentPlayer((prev: any) => prev ? { ...prev, total_score: newScore } : prev);

      setHasAnsweredCurrent(true);
      setSelectedOption(optionIndex);
    } catch (error) {
      console.error('Answer submission error:', error);
      toast.error('Failed to submit answer');
    }
  }, [playerId, currentQuestion, hasAnsweredCurrent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Proctoring setup before quiz starts
  if (!proctoringReady && session?.status === 'waiting') {
    return <ProctoringSetup onReady={() => setProctoringReady(true)} />;
  }

  // Waiting lobby
  if (session?.status === 'waiting') {
    return (
      <>
        <Helmet>
          <title>Waiting for Quiz to Start</title>
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                <Clock className="w-16 h-16 text-primary animate-bounce-subtle" />
              </div>
              <CardTitle className="text-2xl">You're in!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Waiting for the teacher to start the quiz...
              </p>
              <div className="bg-muted rounded-lg p-4">
                <p className="font-semibold">{currentPlayer?.full_name}</p>
                {currentPlayer?.student_id && (
                  <p className="text-sm text-muted-foreground">{currentPlayer.student_id}</p>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{players.length} players waiting</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Quiz ended / results
  if (session?.status === 'ended') {
    return (
      <>
        <Helmet>
          <title>Quiz Complete!</title>
        </Helmet>
        <div className="min-h-screen bg-background p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
              <p className="text-muted-foreground">
                Your final score: <span className="text-primary font-bold text-2xl">{currentPlayer?.total_score || 0}</span>
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🥇 Top 3</CardTitle>
              </CardHeader>
              <CardContent>
                <Top3Podium players={players} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Final Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard 
                  players={players} 
                  highlightTop3={true}
                  currentPlayerId={playerId}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Active question
  if (session?.status === 'question' && currentQuestion) {
    // use `quiz` from the hook (fetched quiz details) for timing

    return (
      <>
        <Helmet>
          <title>{`Question ${(session?.current_question_index ?? 0) + 1}`}</title>
        </Helmet>
        
        <ViolationWarning
          message={warningMessage}
          isVisible={showWarning}
          onDismiss={dismissWarning}
          remainingViolations={remainingViolations}
        />

        {currentPlayer?.is_disqualified ? (
          <div className="min-h-screen bg-destructive/10 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center border-destructive">
              <CardContent className="py-12">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-destructive mb-2">Disqualified</h2>
                <p className="text-muted-foreground">
                  {currentPlayer.disqualification_reason || 'You have been removed from this quiz'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="min-h-screen bg-background">
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={(session.current_question_index || 0) + 1}
              totalQuestions={questions.length}
              timePerQuestion={quiz?.time_per_question ?? 20}
              questionStartedAt={session.question_started_at}
              onAnswer={handleAnswer}
              hasAnswered={hasAnsweredCurrent}
              selectedOption={selectedOption}
            />
          </div>
        )}
      </>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
