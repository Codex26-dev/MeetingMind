import { createRoot } from 'react-dom/client';
import { MotionConfig, motion } from 'motion/react';
import { Globe2, Search } from 'lucide-react';
import { Button } from './components/ui/button';
import './index.css';

const PROMPTS = [
  ['What’s on my schedule today?', 'calendar'],
  ['Show my pending follow-ups', 'tasks'],
  ['Prepare me for my next meeting', 'briefing'],
  ['Search the web for the latest updates', 'web'],
];

function QuickPrompts() {
  return <MotionConfig reducedMotion="user"><div className="mm-quick-root">{PROMPTS.map(([prompt, id]) => <motion.div key={id} whileHover={{ y: -2 }} whileTap={{ scale: .97 }}>
    <Button variant="outline" size="sm" onClick={() => window.MM?.ask?.(prompt)}>
      {id === 'web' ? <Globe2 size={12}/> : id === 'calendar' ? <Search size={12}/> : null}{prompt}
    </Button>
  </motion.div>)}</div></MotionConfig>;
}

const promptRoot = document.getElementById('quick-prompts-root');
if (promptRoot) createRoot(promptRoot).render(<QuickPrompts/>);
