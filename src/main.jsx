import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowUpRight, Globe2, Search } from 'lucide-react';
import { Button } from './components/ui/button';
import './index.css';

const INITIAL_PROMPTS = [
  ['What’s on my schedule today?', 'calendar'],
  ['Show my pending follow-ups', 'tasks'],
  ['Prepare me for my next meeting', 'briefing'],
  ['Search the web for the latest updates', 'web'],
];

function MessageText({ message }) {
  if (/one moment|checking your saved/i.test(message.text)) {
    return <span className="mm-thinking">{message.text}<span className="mm-thinking-dots" aria-hidden="true"><i/><i/><i/></span></span>;
  }
  return <>
    <span>{message.text}</span>
    {message.sources?.length > 0 && <div className="answer-sources"><small>Sources from web research</small>{message.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title || new URL(source.url).hostname}<ArrowUpRight size={10} className="inline"/></a>)}</div>}
  </>;
}

function Conversation() {
  const [messages, setMessages] = useState(() => window.MM?.db?.history?.slice(-30) || []);
  const end = useRef(null);
  useEffect(() => {
    const refresh = () => setMessages(window.MM?.db?.history?.slice(-30) || []);
    window.addEventListener('meetingmind:historychange', refresh);
    window.addEventListener('meetingmind:ready', refresh);
    refresh();
    return () => {
      window.removeEventListener('meetingmind:historychange', refresh);
      window.removeEventListener('meetingmind:ready', refresh);
    };
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages]);

  return <div className="mm-chat-list">
    <AnimatePresence initial={false} mode="popLayout">
      {messages.map((message, index) => <motion.div
        key={`${message.at || index}-${index}`}
        layout
        initial={{ opacity: 0, y: 12, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, mass: .7 }}
        className={`message ${message.role === 'user' ? 'user' : ''}`}
      >
        {message.role !== 'user' && <motion.div className="mini-orb" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />}
        <div className="bubble"><MessageText message={message}/><span className="meta">{message.role === 'user' ? 'You' : 'MeetingMind'} · {index === messages.length - 1 ? 'just now' : ''}</span></div>
      </motion.div>)}
    </AnimatePresence>
    <div ref={end}/>
  </div>;
}

function QuickPrompts() {
  return <div className="mm-quick-root">{INITIAL_PROMPTS.map(([prompt, id]) => <motion.div key={id} whileHover={{ y: -2 }} whileTap={{ scale: .97 }}>
    <Button variant="outline" size="sm" onClick={() => window.MM?.ask?.(prompt)}>
      {id === 'web' ? <Globe2 size={12}/> : id === 'calendar' ? <Search size={12}/> : null}{prompt}
    </Button>
  </motion.div>)}</div>;
}

const conversationRoot = document.getElementById('chat');
if (conversationRoot) createRoot(conversationRoot).render(<MotionConfig reducedMotion="user"><Conversation/></MotionConfig>);
const promptRoot = document.getElementById('quick-prompts-root');
if (promptRoot) createRoot(promptRoot).render(<MotionConfig reducedMotion="user"><QuickPrompts/></MotionConfig>);
window.MMReactChatReady = true;
window.dispatchEvent(new Event('meetingmind:reactready'));
