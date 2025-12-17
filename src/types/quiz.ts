export interface TeacherAccessCode {
  id: string;
  access_code: string;
  teacher_name: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  teacher_code_id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  order_index: number;
  created_at: string;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  game_code: string;
  status: 'waiting' | 'playing' | 'question' | 'results' | 'ended';
  current_question_index: number;
  question_started_at: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface Player {
  id: string;
  session_id: string;
  full_name: string;
  student_id: string | null;
  device_fingerprint: string;
  total_score: number;
  is_disqualified: boolean;
  disqualification_reason: string | null;
  camera_active: boolean;
  joined_at: string;
}

export interface PlayerAnswer {
  id: string;
  player_id: string;
  question_id: string;
  selected_option: number | null;
  is_correct: boolean;
  response_time_ms: number | null;
  points_earned: number;
  answered_at: string;
}

export interface Violation {
  id: string;
  player_id: string;
  violation_type: 'tab_switch' | 'fullscreen_exit' | 'camera_off' | 'multi_device' | 'suspicious_activity';
  details: string | null;
  created_at: string;
}

export interface PlayerWithViolations extends Player {
  violations: Violation[];
}

export const OPTION_COLORS = ['quiz-option-red', 'quiz-option-blue', 'quiz-option-yellow', 'quiz-option-green'] as const;

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export const VIOLATION_THRESHOLD = 3;

// Calculate score based on correctness and response time.
// timeLimitMs: total time allowed for the question (default 20000ms)
// Returns positive points for correct answers, negative for incorrect (penalty).
export function calculateScore(isCorrect: boolean, responseTimeMs: number | null, timeLimitMs = 20000): number {
  const PENALTY_PER_WRONG = 25; // points subtracted for wrong answers

  if (responseTimeMs == null) responseTimeMs = timeLimitMs;

  // If incorrect, return negative penalty
  if (!isCorrect) return -PENALTY_PER_WRONG;

  const baseScore = 100;
  const responseTimeSec = Math.max(0, responseTimeMs) / 1000;

  // Speed bonus scales with remaining time (faster -> larger bonus)
  const timeLeft = Math.max(0, (timeLimitMs - responseTimeMs) / 1000);
  // Max bonus equals baseScore * 0.5 (i.e., 50) when answered instantly
  const maxBonus = Math.round(baseScore * 0.5);
  const speedBonus = Math.round((timeLeft / (timeLimitMs / 1000)) * maxBonus);

  return baseScore + speedBonus;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
