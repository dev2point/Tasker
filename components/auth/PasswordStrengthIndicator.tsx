'use client';

import React from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { evaluatePasswordPolicy } from '@/lib/auth-password-policy';

interface PasswordStrengthIndicatorProps {
  id?: string;
  password: string;
  showBlockingAlert?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  id,
  password,
  showBlockingAlert = false,
}) => {
  const evaluation = evaluatePasswordPolicy(password);
  const hasStartedTyping = evaluation.length > 0;

  const strengthLabelColor =
    evaluation.score === 4
      ? 'text-emerald-300'
      : evaluation.score === 3
        ? 'text-emerald-400'
        : evaluation.score === 2
          ? 'text-amber-300'
          : evaluation.score === 1
            ? 'text-rose-300'
            : 'text-slate-400';

  const getSegmentColor = (segmentIndex: number) => {
    if (evaluation.score === 0 || segmentIndex >= evaluation.score) {
      return 'bg-emerald-950/80 border border-emerald-500/20';
    }
    if (evaluation.score === 1) return 'bg-rose-500';
    if (evaluation.score === 2) return 'bg-amber-400';
    if (evaluation.score === 3) return 'bg-emerald-400';
    return 'bg-emerald-300';
  };

  const criteria = [
    {
      key: 'minLength',
      label: `${evaluation.minLength} caractères min.`,
      met: evaluation.hasMinLength,
      required: true,
    },
    {
      key: 'uppercase',
      label: 'Une majuscule',
      met: evaluation.hasUppercase,
      required: false,
    },
    {
      key: 'number',
      label: 'Un chiffre',
      met: evaluation.hasNumber,
      required: false,
    },
    {
      key: 'special',
      label: 'Un caractère spécial',
      met: evaluation.hasSpecial,
      required: false,
    },
  ];

  return (
    <div
      id={id}
      aria-live="polite"
      className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-950/35 px-3 py-2.5 space-y-2 text-[11px]"
    >
      {/* Header row: strength label + tabular character counter */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-300 font-medium">
          Robustesse :{' '}
          <strong className={`font-semibold ${strengthLabelColor}`}>
            {evaluation.label}
          </strong>
        </span>
        <span
          className={`font-mono tabular-nums text-[11px] font-semibold ${
            evaluation.hasMinLength
              ? 'text-emerald-300'
              : hasStartedTyping
                ? 'text-amber-300'
                : 'text-slate-400'
          }`}
        >
          {evaluation.length}/{evaluation.minLength} car.
        </span>
      </div>

      {/* Compact 4-segment strength bar */}
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-colors duration-200 ${getSegmentColor(idx)}`}
          />
        ))}
      </div>

      {/* Live checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
        {criteria.map((item) => {
          const textColor = item.met
            ? 'text-emerald-300 font-medium'
            : item.required && (hasStartedTyping || showBlockingAlert)
              ? 'text-rose-300 font-medium'
              : 'text-slate-400';

          return (
            <div key={item.key} className={`flex items-center gap-1.5 ${textColor}`}>
              {item.met ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : item.required && (hasStartedTyping || showBlockingAlert) ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>

      {(showBlockingAlert || (hasStartedTyping && !evaluation.isWithinMaxLength)) &&
        evaluation.blockingError && (
          <p className="text-[11px] text-rose-300 font-medium pt-0.5">
            {evaluation.blockingError}
          </p>
        )}
    </div>
  );
};
