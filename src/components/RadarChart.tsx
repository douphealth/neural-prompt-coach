import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { DimensionScore } from '@/lib/promptAnalyzer';

interface RadarChartProps {
  dimensions: DimensionScore[];
}

export default function RadarChart({ dimensions }: RadarChartProps) {
  const data = dimensions.map(d => ({
    subject: `${d.emoji} ${d.label}`,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer>
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(220, 15%, 20%)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'hsl(210, 20%, 70%)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'hsl(210, 20%, 50%)', fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(150, 80%, 50%)"
            fill="hsl(150, 80%, 50%)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
