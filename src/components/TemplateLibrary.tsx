import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Zap, Search, SortAsc, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, FREE_TEMPLATES, type PromptTemplate } from '@/lib/promptTemplates';
import { toast } from '@/hooks/use-toast';

interface TemplateLibraryProps {
  onTryTemplate: (prompt: string) => void;
}

type SortOption = 'score-desc' | 'score-asc' | 'title-asc' | 'title-desc';

export default function TemplateLibrary({ onTryTemplate }: TemplateLibraryProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('score-desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (template: PromptTemplate) => {
    navigator.clipboard.writeText(template.prompt);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Prompt Copied',
      description: `"${template.title}" has been copied to your clipboard.`
    });
  };

  // Filter templates
  let filtered = FREE_TEMPLATES.filter(template => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch = 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort templates
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'score-desc':
        return b.score - a.score;
      case 'score-asc':
        return a.score - b.score;
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  return (
    <section className="py-8 space-y-6">
      {/* Header and description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            📚 Expanded Template Library
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover {FREE_TEMPLATES.length} pre-scanned prompts optimized for maximum efficiency scores.
          </p>
        </div>

        {/* Sort and Filters panel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="pl-9 pr-4 py-2 w-48 sm:w-64 bg-secondary/80 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-sans"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-secondary/80 border border-border/80 px-3 py-2 rounded-lg text-xs font-mono text-muted-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent border-none text-foreground focus:outline-none font-semibold cursor-pointer"
            >
              <option value="score-desc" className="bg-card">PES™: High to Low</option>
              <option value="score-asc" className="bg-card">PES™: Low to High</option>
              <option value="title-asc" className="bg-card">Title: A to Z</option>
              <option value="title-desc" className="bg-card">Title: Z to A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-display transition-all ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 border border-primary/20'
                : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Results grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filtered.map(template => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-gradient-card border border-border/80 rounded-xl p-5 flex flex-col justify-between hover:border-primary/30 transition-all hover:shadow-md hover:shadow-primary/[0.02] group relative overflow-hidden"
            >
              {/* Subtle top indicator glow */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Meta details */}
                <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
                  <span className="text-[10px] font-mono bg-secondary border border-border px-2 py-0.5 rounded text-muted-foreground uppercase font-semibold">
                    {template.categoryEmoji} {template.category}
                  </span>
                  <span className="text-[11px] font-mono text-primary font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                    PES™ {template.score}
                  </span>
                </div>

                {/* Info titles */}
                <h4 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors mb-1.5">
                  {template.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-sans mb-4 min-h-[50px] line-clamp-3">
                  {template.explanation}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 border-t border-border/30 pt-3 mt-1">
                <button
                  onClick={() => onTryTemplate(template.prompt)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-display font-bold rounded-lg py-2 text-xs hover:opacity-90 transition-opacity"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" /> Load in Editor
                </button>
                <button
                  onClick={() => handleCopy(template)}
                  className="px-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 rounded-lg transition-colors bg-secondary/35"
                  title="Copy Prompt Template"
                >
                  {copiedId === template.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-border/80 rounded-xl space-y-2">
            <SlidersHorizontal className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-display font-bold text-foreground">No prompt templates found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search filters or select a different category pill.</p>
          </div>
        )}
      </div>
    </section>
  );
}
