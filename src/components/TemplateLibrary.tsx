import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Zap } from 'lucide-react';
import { CATEGORIES, FREE_TEMPLATES, type PromptTemplate } from '@/lib/promptTemplates';

interface TemplateLibraryProps {
  onTryTemplate: (prompt: string) => void;
}

export default function TemplateLibrary({ onTryTemplate }: TemplateLibraryProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = activeCategory === 'all'
    ? FREE_TEMPLATES
    : FREE_TEMPLATES.filter(t => t.category === activeCategory);

  const handleCopy = (template: PromptTemplate) => {
    navigator.clipboard.writeText(template.prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="py-16">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          📚 Prompt Template Library
        </h2>
        <p className="text-muted-foreground mt-2">25 high-scoring, copy-paste-ready templates</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(template => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-card border border-border rounded-lg p-5 flex flex-col hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                  {template.categoryEmoji} {template.category}
                </span>
                <span className="text-xs font-mono text-primary font-bold">PES™ {template.score}</span>
              </div>

              <h4 className="font-display font-semibold text-foreground mb-2">{template.title}</h4>
              <p className="text-xs text-muted-foreground mb-4 flex-1 line-clamp-3">{template.explanation}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => onTryTemplate(template.prompt)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-3.5 h-3.5" /> Try it
                </button>
                <button
                  onClick={() => handleCopy(template)}
                  className="px-3 border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  {copiedId === template.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
