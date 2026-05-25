import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, X, ChevronRight, Zap, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AnalysisResult } from '@/lib/promptAnalyzer';

export interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  result: AnalysisResult;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistory: (item: HistoryItem) => void;
  triggerRefresh: number;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  onSelectHistory,
  triggerRefresh,
}: HistorySidebarProps) {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load history from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('promptgrade_history');
      if (stored) {
        setHistoryList(JSON.parse(stored));
      } else {
        setHistoryList([]);
      }
    } catch {
      setHistoryList([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [isOpen, triggerRefresh]);

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your entire analysis history?')) {
      localStorage.removeItem('promptgrade_history');
      setHistoryList([]);
      toast({
        title: 'History Cleared',
        description: 'All past prompt scan archives have been erased.'
      });
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    localStorage.setItem('promptgrade_history', JSON.stringify(updated));
    setHistoryList(updated);
    toast({
      title: 'Item Deleted',
      description: 'The selected prompt log was removed.'
    });
  };

  const handleCopyPrompt = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied Prompt',
      description: 'Original prompt text copied successfully.'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary border-primary/20 bg-primary/5';
    if (score >= 60) return 'text-warning border-warning/20 bg-warning/5';
    return 'text-destructive border-destructive/20 bg-destructive/5';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[100] backdrop-blur-[2px]"
          />

          {/* Slide-out Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-card border-l border-border z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-display font-bold text-foreground text-sm">Scan Archives</h3>
                <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                  {historyList.length} total
                </span>
              </div>

              <div className="flex items-center gap-1">
                {historyList.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg transition-all"
                    title="Clear All History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectHistory(item);
                    onClose();
                  }}
                  className="group bg-secondary/40 border border-border/80 hover:border-primary/30 hover:bg-secondary/70 p-3.5 rounded-xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${getScoreColor(item.result.overallScore)}`}>
                        {item.result.overallScore}
                      </span>
                      <div>
                        <h4 className="font-display font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[190px]">
                          {item.prompt.trim() || 'Untitled Prompt'}
                        </h4>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCopyPrompt(item.prompt, item.id, e)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded"
                        title="Copy Prompt"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/80 mt-2 line-clamp-2 leading-normal italic font-sans pl-1 border-l border-border/40">
                    "{item.prompt}"
                  </p>

                  <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground/50 border-t border-border/20 pt-2 mt-2">
                    <span>{item.prompt.split(/\s+/).filter(Boolean).length} words</span>
                    <span className="flex items-center text-primary group-hover:translate-x-0.5 transition-transform">
                      Restore <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {historyList.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-3">
                  <History className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                  <h4 className="font-display font-bold text-foreground text-sm">No Scans Recorded</h4>
                  <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                    Paste a prompt in the Scanner tab and hit "Analyze My Prompt" to compile history logs.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
