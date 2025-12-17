-- Teacher access codes for simple auth
CREATE TABLE public.teacher_access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_code TEXT NOT NULL UNIQUE,
    teacher_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_code_id UUID REFERENCES public.teacher_access_codes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    time_per_question INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_option INTEGER NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live quiz sessions
CREATE TABLE public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    game_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_question_index INTEGER DEFAULT 0,
    question_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- Players (students)
CREATE TABLE public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    student_id TEXT,
    device_fingerprint TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    is_disqualified BOOLEAN NOT NULL DEFAULT false,
    disqualification_reason TEXT,
    camera_active BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, device_fingerprint)
);

-- Player answers
CREATE TABLE public.player_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_option INTEGER,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    response_time_ms INTEGER,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(player_id, question_id)
);

-- Proctoring violations
CREATE TABLE public.violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teacher_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Public read policies (quiz app is public-facing)
CREATE POLICY "Anyone can read teacher codes" ON public.teacher_access_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teacher codes" ON public.teacher_access_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quizzes" ON public.quizzes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quizzes" ON public.quizzes FOR DELETE USING (true);

CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete questions" ON public.questions FOR DELETE USING (true);

CREATE POLICY "Anyone can read sessions" ON public.quiz_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.quiz_sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);

CREATE POLICY "Anyone can read answers" ON public.player_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert answers" ON public.player_answers FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read violations" ON public.violations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert violations" ON public.violations FOR INSERT WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;

-- Set replica identity for realtime
ALTER TABLE public.quiz_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.player_answers REPLICA IDENTITY FULL;
ALTER TABLE public.violations REPLICA IDENTITY FULL;

-- Create default teacher access code
INSERT INTO public.teacher_access_codes (access_code, teacher_name) VALUES ('TEACHER2024', 'Default Teacher');