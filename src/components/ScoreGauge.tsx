import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  grade: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'hsl(150, 80%, 50%)';
  if (score >= 60) return 'hsl(38, 92%, 55%)';
  if (score >= 40) return 'hsl(25, 85%, 55%)';
  return 'hsl(0, 72%, 55%)';
}

export default function ScoreGauge({ score, grade }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const motionScore = useMotionValue(0);
  const circumference = 2 * Math.PI * 45;
  const offset = useTransform(motionScore, [0, 100], [circumference, 0]);
  const [currentOffset, setCurrentOffset] = useState(circumference);

  useEffect(() => {
    const controls = animate(motionScore, score, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => {
        setDisplayScore(Math.round(v));
        setCurrentOffset(circumference - (v / 100) * circumference);
      },
    });
    return controls.stop;
  }, [score]);

  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(220, 15%, 16%)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-display" style={{ color }}>{displayScore}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        className="text-3xl font-bold font-display px-4 py-1 rounded-lg"
        style={{ color, border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40` }}
      >
        {grade}
      </motion.div>
    </div>
  );
}
