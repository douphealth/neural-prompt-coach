import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Check } from 'lucide-react';
import type { AnalysisResult } from '@/lib/promptAnalyzer';

interface ShareableScoreCardProps {
  result: AnalysisResult;
}

function getScoreColor(score: number) {
  if (score >= 80) return '#34d399';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function drawRadarOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  dimensions: AnalysisResult['dimensions']
) {
  const count = dimensions.length;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  // Grid rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = (radius * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Spokes
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i <= count; i++) {
    const idx = i % count;
    const angle = startAngle + idx * angleStep;
    const r = (dimensions[idx].score / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Labels
  ctx.font = '500 11px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const labelR = radius + 22;
    const x = cx + labelR * Math.cos(angle);
    const y = cy + labelR * Math.sin(angle);
    ctx.fillText(`${dimensions[i].emoji} ${dimensions[i].label}`, x, y);
  }
}

function generateScoreCardCanvas(result: AnalysisResult): HTMLCanvasElement {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f1419');
  bg.addColorStop(1, '#1a1f2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 350);
  glow.addColorStop(0, 'rgba(52, 211, 153, 0.06)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  const color = getScoreColor(result.overallScore);

  // Left side: Score gauge
  const gaugeX = 220;
  const gaugeY = 260;
  const gaugeR = 90;

  // Gauge background
  ctx.beginPath();
  ctx.arc(gaugeX, gaugeY, gaugeR, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Gauge progress
  const progress = (result.overallScore / 100) * 2 * Math.PI;
  ctx.beginPath();
  ctx.arc(gaugeX, gaugeY, gaugeR, -Math.PI / 2, -Math.PI / 2 + progress);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score text
  ctx.font = 'bold 56px "Space Grotesk", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(result.overallScore), gaugeX, gaugeY - 8);

  ctx.font = '400 14px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('/100', gaugeX, gaugeY + 28);

  // Grade badge
  ctx.font = 'bold 28px "Space Grotesk", sans-serif';
  ctx.fillStyle = color;
  const gradeY = gaugeY + gaugeR + 45;
  const gradeW = ctx.measureText(result.grade).width + 24;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(gaugeX - gradeW / 2, gradeY - 18, gradeW, 36, 8);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(result.grade, gaugeX, gradeY);

  // Title
  ctx.font = 'bold 26px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#e8eaed';
  ctx.textAlign = 'left';
  ctx.fillText('Prompt Efficiency Score™', 60, 50);

  // Right side: Radar chart
  drawRadarOnCanvas(ctx, 780, 300, 170, result.dimensions);

  // Verdict
  ctx.font = '400 14px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'left';
  const verdictLines = wrapText(ctx, result.verdict, 340);
  verdictLines.forEach((line, i) => {
    ctx.fillText(line, 60, 430 + i * 20);
  });

  // Branding footer
  ctx.font = '600 13px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText('Analyzed by PromptGrade™ — efficientgptprompts.com', 60, H - 30);

  // Decorative line
  ctx.fillStyle = color;
  ctx.fillRect(60, H - 50, 100, 2);

  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // max 4 lines
}

export default function ShareableScoreCard({ result }: ShareableScoreCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);

  const handleDownload = () => {
    const canvas = generateScoreCardCanvas(result);
    const link = document.createElement('a');
    link.download = `promptgrade-score-${result.overallScore}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleShare = async () => {
    const canvas = generateScoreCardCanvas(result);

    const text = `My AI prompt scored ${result.overallScore}/100 (${result.grade}) on PromptGrade™!\n\n${result.verdict}\n\nAnalyze your prompts free → https://app.efficientgptprompts.com`;

    if (navigator.share && navigator.canShare) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'promptgrade-score.png', { type: 'image/png' });
          const shareData = { text, files: [file] };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            await navigator.share({ text });
          }
        }, 'image/png');
      } catch {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-display font-semibold text-foreground">📤 Share Your Score</h3>
      <p className="text-sm text-muted-foreground">
        Download or share your Prompt Efficiency Score™ card on social media.
      </p>

      {/* Preview */}
      <div className="rounded-lg border border-border overflow-hidden">
        <ScoreCardPreview result={result} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-display font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {downloaded ? 'Downloaded!' : 'Download PNG'}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-2.5 rounded-lg font-display font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {shared ? 'Copied!' : 'Share'}
        </button>
      </div>
    </motion.div>
  );
}

/** A lightweight HTML/CSS preview of the score card */
function ScoreCardPreview({ result }: { result: AnalysisResult }) {
  const color = getScoreColor(result.overallScore);

  return (
    <div
      className="relative p-6 flex items-center gap-8"
      style={{
        background: 'linear-gradient(135deg, #0f1419, #1a1f2e)',
        aspectRatio: '1200/630',
      }}
    >
      {/* Score */}
      <div className="flex flex-col items-center gap-3 min-w-[140px]">
        <div className="relative w-28 h-28 md:w-36 md:h-36">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - result.overallScore / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl md:text-4xl font-bold font-display" style={{ color }}>{result.overallScore}</span>
            <span className="text-[10px] text-white/50">/100</span>
          </div>
        </div>
        <span
          className="font-bold font-display text-lg px-3 py-0.5 rounded-md border-2"
          style={{ color, borderColor: color }}
        >
          {result.grade}
        </span>
      </div>

      {/* Dimension bars */}
      <div className="flex-1 space-y-1.5 hidden sm:block">
        {result.dimensions.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="w-28 text-white/70 truncate">{d.emoji} {d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${d.score}%`, backgroundColor: getScoreColor(d.score) }}
              />
            </div>
            <span className="w-7 text-right text-white/50 font-mono">{d.score}</span>
          </div>
        ))}
      </div>

      {/* Branding */}
      <div className="absolute bottom-3 left-6 text-[10px] text-white/30 font-display">
        PromptGrade™ — efficientgptprompts.com
      </div>
    </div>
  );
}
