import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/quiz';
import { OPTION_COLORS, OPTION_LABELS } from '@/types/quiz';
import { Timer } from './Timer';
import { Triangle, Square, Circle, Star } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timePerQuestion: number;
  questionStartedAt: string | null;
  onAnswer: (optionIndex: number, responseTimeMs: number) => void;
  hasAnswered: boolean;
  selectedOption?: number;
  showResults?: boolean;
}

const OPTION_ICONS = [Triangle, Square, Circle, Star];

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  timePerQuestion,
  questionStartedAt,
  onAnswer,
  hasAnswered,
  selectedOption,
  showResults,
}: QuestionDisplayProps) {
  const [startTime] = useState(() => questionStartedAt ? new Date(questionStartedAt).getTime() : Date.now());

  const handleOptionClick = (index: number) => {
    if (hasAnswered) return;
    const responseTime = Date.now() - startTime;
    onAnswer(index, responseTime);
  };

  const handleTimeUp = () => {
    if (!hasAnswered) {
      onAnswer(-1, timePerQuestion * 1000); // Auto-submit with no answer
    }
  };

  return (
    <div className="flex flex-col h-full animate-scale-in">
      {/* Header with timer and progress */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <div className="text-sm md:text-base font-semibold text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </div>
        <Timer
          duration={timePerQuestion}
          startTime={questionStartedAt}
          onTimeUp={handleTimeUp}
          size="md"
        />
      </div>

      {/* Question text */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="bg-card rounded-2xl shadow-lg p-6 md:p-10 max-w-4xl w-full">
          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-center">
            {question.question_text}
          </h2>
        </div>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 p-4 md:p-6">
        {question.options.map((option, index) => {
          const Icon = OPTION_ICONS[index];
          const isSelected = selectedOption === index;
          const isCorrect = showResults && index === question.correct_option;
          const isWrong = showResults && isSelected && index !== question.correct_option;

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(index)}
              disabled={hasAnswered}
              className={cn(
                'relative flex items-center gap-4 p-4 md:p-6 rounded-xl text-white font-bold text-lg md:text-xl transition-all duration-200',
                OPTION_COLORS[index],
                !hasAnswered && 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
                hasAnswered && 'cursor-not-allowed',
                isSelected && 'ring-4 ring-white ring-opacity-80',
                isCorrect && 'ring-4 ring-success',
                isWrong && 'opacity-50'
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-lg">
                <Icon className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <span className="flex-1 text-left">{option}</span>
              {showResults && isCorrect && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                    ✓
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Waiting message */}
      {hasAnswered && !showResults && (
        <div className="text-center p-4 animate-slide-up">
          <div className="inline-block bg-success/10 text-success px-6 py-3 rounded-full font-semibold">
            ✓ Answer submitted! Waiting for other players...
          </div>
        </div>
      )}
    </div>
  );
}
