import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Play, Users, AlertTriangle, Download, X, Eye } from 'lucide-react';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Top3Podium } from '@/components/quiz/Top3Podium';
import { useQuizSession } from '@/hooks/useQuizSession';
import { generateGameCode, type Quiz, type Question, type QuizSession } from '@/types/quiz';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

type View = 'login' | 'dashboard' | 'create' | 'live' | 'results';

export default function Teacher() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [accessCode, setAccessCode] = useState('');
  const [teacherCodeId, setTeacherCodeId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);

  // Quiz creation state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'quiz_id' | 'created_at'>[]>([
    { question_text: '', options: ['', '', '', ''], correct_option: 0, order_index: 0 },
  ]);

  const { session, players, questions: sessionQuestions, violations, getTop3Players, quiz } = useQuizSession({
    sessionId: activeSession?.id || null,
  });

  // Diagnostic: log players changes so we can verify realtime/refetch behavior
  useEffect(() => {
    console.debug('[teacher] players updated', activeSession?.id, players?.length);
  }, [players, activeSession?.id]);

  // Handle login
  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_access_codes')
        .select('*')
        .eq('access_code', accessCode.toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Invalid access code');
        return;
      }

      setTeacherCodeId(data.id);
      setView('dashboard');
      toast.success(`Welcome, ${data.teacher_name}!`);
      fetchQuizzes(data.id);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    }
  };

  const fetchQuizzes = async (codeId: string) => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('teacher_code_id', codeId)
      .order('created_at', { ascending: false });
    if (data) setQuizzes(data as Quiz[]);
  };

  // Quiz creation
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', options: ['', '', '', ''], correct_option: 0, order_index: questions.length },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const updated = [...questions];
    if (field === 'question_text') {
      updated[index].question_text = value as string;
    } else if (field === 'correct_option') {
      updated[index].correct_option = value as number;
    }
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const saveQuiz = async () => {
    if (!teacherCodeId || !quizTitle.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }

    const validQuestions = questions.filter(q => 
      q.question_text.trim() && q.options.every(o => o.trim())
    );

    if (validQuestions.length === 0) {
      toast.error('Please add at least one complete question');
      return;
    }

    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          teacher_code_id: teacherCodeId,
          title: quizTitle,
          description: quizDescription || null,
          time_per_question: timePerQuestion,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      const questionsToInsert = validQuestions.map((q, i) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.options,
        correct_option: q.correct_option,
        order_index: i,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success('Quiz saved!');
      fetchQuizzes(teacherCodeId);
      setView('dashboard');
      resetQuizForm();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save quiz');
    }
  };

  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizDescription('');
    setTimePerQuestion(20);
    setQuestions([{ question_text: '', options: ['', '', '', ''], correct_option: 0, order_index: 0 }]);
  };

  // Start live session
  const startLiveSession = async (quiz: Quiz) => {
    try {
      const gameCode = generateGameCode();
      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert({
          quiz_id: quiz.id,
          game_code: gameCode,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data as QuizSession);
      setView('live');
      toast.success(`Game started! Code: ${gameCode}`);
    } catch (error) {
      console.error('Start session error:', error);
      toast.error('Failed to start session');
    }
  };

  // Session control
  const startQuiz = async () => {
    if (!activeSession) return;
    await supabase
      .from('quiz_sessions')
      .update({ 
        status: 'question', 
        current_question_index: 0,
        question_started_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);
  };

  const nextQuestion = async () => {
    if (!activeSession || !session) return;
    const nextIndex = (session.current_question_index || 0) + 1;
    
    if (nextIndex >= sessionQuestions.length) {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      setView('results');
    } else {
      await supabase
        .from('quiz_sessions')
        .update({ 
          current_question_index: nextIndex,
          question_started_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
    }
  };

  // Auto-advance questions when the time per question elapses
  useEffect(() => {
    if (!session || session.status !== 'question' || !session.question_started_at) return;
    const timePerQuestion = quiz?.time_per_question ?? 20;
    const start = new Date(session.question_started_at).getTime();
    const elapsed = Date.now() - start;
    const remaining = timePerQuestion * 1000 - elapsed;

    if (remaining <= 0) {
      // time already passed - move immediately
      nextQuestion();
      return;
    }

    const t = window.setTimeout(() => {
      nextQuestion();
    }, remaining + 50);

    return () => clearTimeout(t);
  }, [session?.question_started_at, session?.status, quiz, sessionQuestions.length]);

  const endQuiz = async () => {
    if (!activeSession) return;
    await supabase
      .from('quiz_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', activeSession.id);
    setView('results');
  };

  // Export results
  const exportResults = () => {
    const top3 = getTop3Players();
    let csv = 'Rank,Name,Student ID,Score,Violations,Status\n';
    
    players.forEach((p, i) => {
      const violationCount = violations.filter(v => v.player_id === p.id).length;
      csv += `${i + 1},${p.full_name},${p.student_id || 'N/A'},${p.total_score},${violationCount},${p.is_disqualified ? 'Disqualified' : 'Active'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${activeSession?.game_code || 'export'}.csv`;
    a.click();
  };

  // Render based on view
  if (view === 'login') {
    return (
      <>
        <Helmet>
          <title>Teacher Login - QuizMaster Pro</title>
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Teacher Access</CardTitle>
              <CardDescription>Enter your access code to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Access Code</Label>
                <Input
                  placeholder="Enter access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="text-center text-xl font-bold tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full gradient-primary text-white" size="lg">
                Access Dashboard
              </Button>
              <p className="text-xs text-center text-muted-foreground">
              
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (view === 'create') {
    return (
      <>
        <Helmet>
          <title>Create Quiz - QuizMaster Pro</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Create Quiz</h1>
              <Button variant="outline" onClick={() => setView('dashboard')}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Quiz Title *</Label>
                  <Input
                    placeholder="e.g., Biology Chapter 5 Test"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Brief description of the quiz"
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Time per Question (seconds)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={60}
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {questions.map((q, qIndex) => (
              <Card key={qIndex} className="mb-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Question Text *</Label>
                    <Textarea
                      placeholder="Enter your question"
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="relative">
                        <Label className="text-sm">Option {String.fromCharCode(65 + oIndex)}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                            value={opt}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className={cn(q.correct_option === oIndex && 'border-success')}
                          />
                          <Button
                            variant={q.correct_option === oIndex ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateQuestion(qIndex, 'correct_option', oIndex)}
                            className={cn(q.correct_option === oIndex && 'bg-success hover:bg-success/90')}
                          >
                            ✓
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4 sticky bottom-4">
              <Button variant="outline" onClick={addQuestion} className="flex-1">
                <Plus className="w-4 h-4 mr-2" /> Add Question
              </Button>
              <Button onClick={saveQuiz} className="flex-1 gradient-primary text-white">
                Save Quiz ({questions.filter(q => q.question_text.trim()).length} questions)
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (view === 'live' && activeSession) {
    return (
      <>
        <Helmet>
          <title>Live Quiz - {activeSession.game_code}</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">Game Code: <span className="text-primary">{activeSession.game_code}</span></h1>
                <p className="text-muted-foreground">
                  {players.length} player{players.length !== 1 ? 's' : ''} joined
                </p>
              </div>
              <div className="flex gap-2">
                {session?.status === 'waiting' && (
                  <Button onClick={startQuiz} className="gradient-primary text-white" disabled={players.length === 0}>
                    <Play className="w-4 h-4 mr-2" /> Start Quiz
                  </Button>
                )}
                {session?.status === 'question' && (
                  <Button onClick={nextQuestion} className="gradient-secondary text-white">
                    {(session.current_question_index || 0) + 1 >= sessionQuestions.length ? 'End Quiz' : 'Next Question'}
                  </Button>
                )}
                <Button variant="destructive" onClick={endQuiz}>
                  End
                </Button>
              </div>
            </div>

            {/* Current question indicator */}
            {session?.status === 'question' && sessionQuestions.length > 0 && (
              <Card className="mb-6 gradient-primary text-white">
                <CardContent className="py-4">
                  <div className="text-sm opacity-80">
                    Question {(session.current_question_index || 0) + 1} of {sessionQuestions.length}
                  </div>
                  <div className="text-xl font-bold">
                    {sessionQuestions[session.current_question_index || 0]?.question_text}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> Live Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard 
                  players={players} 
                  violations={violations} 
                  showViolations={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (view === 'results') {
    return (
      <>
        <Helmet>
          <title>Quiz Results - QuizMaster Pro</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">🏆 Final Results</h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportResults}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button onClick={() => { setActiveSession(null); setView('dashboard'); }}>
                  Back to Dashboard
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>🥇 Top 3 Verified Students</CardTitle>
                <CardDescription>Based on accuracy, speed, and integrity</CardDescription>
              </CardHeader>
              <CardContent>
                <Top3Podium players={players} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard 
                  players={players} 
                  violations={violations} 
                  showViolations={true}
                  highlightTop3={true}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Dashboard view
  return (
    <>
      <Helmet>
        <title>Teacher Dashboard - QuizMaster Pro</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <Button onClick={() => setView('create')} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" /> Create Quiz
            </Button>
          </div>

          <div className="grid gap-4">
            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No quizzes yet. Create your first quiz!</p>
                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" /> Create Quiz
                  </Button>
                </CardContent>
              </Card>
            ) : (
              quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{quiz.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {quiz.time_per_question}s per question
                      </p>
                    </div>
                    <Button onClick={() => startLiveSession(quiz)} className="gradient-secondary text-white">
                      <Play className="w-4 h-4 mr-2" /> Start Live
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
