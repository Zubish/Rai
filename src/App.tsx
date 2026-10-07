import { FormEvent, useState } from "react";
import {
  Bell,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  FolderKanban,
  Lightbulb,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X
} from "lucide-react";
import { sendRaiMessage } from "./lib/rai-api";

type Workspace = "ask" | "insights" | "reports" | "alerts" | "library";
type ChatMessage = {
  id: string;
  role: "user" | "rai";
  text: string;
  grounding?: "verified_data" | "no_operational_data";
  warnings?: string[];
  provider?: string;
};

const navItems: Array<{ id: Workspace; label: string; icon: typeof Sparkles }> = [
  { id: "ask", label: "Ask Rai", icon: Sparkles },
  { id: "insights", label: "Insights", icon: ChartNoAxesCombined },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "library", label: "Library", icon: FolderKanban }
];

const prompts = [
  "What changed in my pharmacy today?",
  "Which products should I reorder this week?",
  "Analyse profit by product",
  "Create a monthly sales report"
];

function RaiMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rai-mark ${compact ? "rai-mark--compact" : ""}`} aria-hidden="true">
      <span>R</span>
      {!compact && <i />}
    </div>
  );
}

function PulseCard() {
  return (
    <section className="pulse-card" aria-label="Pharmacy pulse preview">
      <div className="pulse-card__heading">
        <div>
          <span className="eyebrow">PHARMACY PULSE</span>
          <h2>Your connected pharmacy, in one view.</h2>
        </div>
        <div className="pulse-icon"><Lightbulb size={19} /></div>
      </div>
      <div className="pulse-grid">
        <div><span>Inventory</span><strong>Ready</strong><small>Stock signals</small></div>
        <div><span>Commercial</span><strong>Ready</strong><small>Sales and profit</small></div>
        <div><span>Continuity</span><strong>Ready</strong><small>Patient demand</small></div>
      </div>
      <p className="pulse-action"><span>Next step</span> Connect approved RxLedger data to turn this into a live pharmacy pulse.</p>
    </section>
  );
}

function RaiResponse({ message }: { message: ChatMessage }) {
  const hasWarning = message.warnings?.length;
  return (
    <article className="message message--rai">
      <RaiMark compact />
      <div className="rai-answer">
        <p>{message.text}</p>
        {hasWarning && <div className="answer-card answer-card--warning">
          <div className="answer-card__header">
            <div><span className="eyebrow">GROUNDING STATUS</span><h3>Data needed before analysis</h3></div>
            <span className="status-pill">Not connected</span>
          </div>
          <p>{message.warnings?.[0]}</p>
        </div>}
        <span className="message-meta">{message.provider === "deterministic" ? "Rai assistant" : "Rai local intelligence"}</span>
      </div>
    </article>
  );
}

function PlaceholderView({ workspace }: { workspace: Exclude<Workspace, "ask"> }) {
  const copy: Record<Exclude<Workspace, "ask">, { title: string; text: string }> = {
    insights: { title: "Insights", text: "Saved intelligence will appear here as Rai analyses pharmacy activity." },
    reports: { title: "Reports", text: "Your generated pharmacy reports will live here once you create them in a chat." },
    alerts: { title: "Alerts", text: "Rai will surface stock, sales, and continuity signals that need review." },
    library: { title: "Library", text: "Files, exports, charts, and saved insights will appear here." }
  };
  return <main className="workspace-empty"><div className="empty-icon"><FileBarChart size={23} /></div><h1>{copy[workspace].title}</h1><p>{copy[workspace].text}</p></main>;
}

export function App() {
  const [workspace, setWorkspace] = useState<Workspace>("ask");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string>();

  const startNewChat = () => {
    setMessages([]);
    setPrompt("");
    setConversationId(undefined);
    setChatError(undefined);
    setWorkspace("ask");
    setMobileOpen(false);
  };

  const submitPrompt = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = prompt.trim();
    if (!question || isSending) return;
    const userMessage = { id: `${Date.now()}-user`, role: "user" as const, text: question };
    setMessages(current => [...current, userMessage]);
    setPrompt("");
    setChatError(undefined);
    setIsSending(true);
    try {
      const reply = await sendRaiMessage(question, conversationId);
      setConversationId(reply.conversationId);
      setMessages(current => [...current, {
        id: reply.message.id,
        role: "rai",
        text: reply.message.text,
        grounding: reply.grounding.status,
        warnings: reply.warnings,
        provider: reply.provider.id
      }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Rai could not complete that request right now.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rai-app" data-theme={darkMode ? "dark" : "light"} data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} aria-label="Rai application">
      <aside className={`sidebar ${mobileOpen ? "sidebar--mobile-open" : ""}`}>
        <div className="sidebar__top">
          <button className="brand" type="button" onClick={startNewChat} aria-label="Start a new Rai chat">
            <RaiMark compact={sidebarCollapsed} />
            {!sidebarCollapsed && <span><strong>Rai</strong><small>Pharmacy Intelligence</small></span>}
          </button>
          <button className="icon-button sidebar-close" type="button" aria-label={mobileOpen ? "Close navigation" : "Collapse navigation"} onClick={() => mobileOpen ? setMobileOpen(false) : setSidebarCollapsed(value => !value)}>
            {mobileOpen ? <X size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <button className="new-chat" type="button" onClick={startNewChat}>
          <Plus size={18} /><span>New chat</span>
        </button>

        <nav className="primary-nav" aria-label="Rai navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" className={workspace === item.id ? "nav-item nav-item--active" : "nav-item"} onClick={() => { setWorkspace(item.id); setMobileOpen(false); }}>
              <Icon size={18} /><span>{item.label}</span>{item.id === "alerts" && <b>5</b>}
            </button>;
          })}
        </nav>

        {!sidebarCollapsed && <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>
          <button className="project-link" type="button"><ShieldCheck size={17} /><span>RxLedger connection</span><ChevronRight size={16} /></button>
          <button className="project-link" type="button"><Settings size={17} /><span>Settings</span><ChevronRight size={16} /></button>
        </div>}

        <div className="sidebar__bottom">
          {!sidebarCollapsed && <button className="account-card" type="button"><span className="avatar">AS</span><span><strong>Abuja Sickbay</strong><small>Pharmacy Technician</small></span><MoreHorizontal size={17} /></button>}
          <button className="theme-toggle" type="button" aria-label={darkMode ? "Use light mode" : "Use dark mode"} onClick={() => setDarkMode(value => !value)}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}<span>{sidebarCollapsed ? "" : darkMode ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="crumb"><span>RxLedger</span><ChevronRight size={14} /><strong>{workspace === "ask" ? "Ask Rai" : workspace[0].toUpperCase() + workspace.slice(1)}</strong></div>
          <div className="topbar__right">
            <button className="branch-switcher" type="button"><span className="branch-switcher__icon"><Bot size={15} /></span><span><strong>Abuja Sickbay</strong><small>Assigned branch</small></span><ChevronDown size={15} /></button>
            <button className="icon-button notification" type="button" aria-label="Notifications"><Bell size={18} /><i>5</i></button>
            <button className="avatar avatar--top" type="button" aria-label="Open user profile">AS</button>
          </div>
        </header>

        {workspace !== "ask" ? <PlaceholderView workspace={workspace} /> : (
          <main className="chat-page">
            <div className="chat-scroll">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-mark"><RaiMark /></div>
                  <p className="eyebrow">RXLEDGER PHARMACY INTELLIGENCE</p>
                  <h1>What can Rai help with today?</h1>
                  <p className="welcome-copy">Ask about stock, sales, patient demand, reports, or the next operational decision your branch should make.</p>
                  <div className="suggestions" aria-label="Suggested prompts">
                    {prompts.map(suggestion => <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>{suggestion}<ChevronRight size={15} /></button>)}
                  </div>
                  <PulseCard />
                </div>
              ) : (
                <div className="message-list" aria-live="polite">
                  {messages.map(message => message.role === "user" ? <article className="message message--user" key={message.id}><p>{message.text}</p></article> : <RaiResponse key={message.id} message={message} />)}
                  {isSending && <div className="thinking" role="status">Rai is reviewing your question...</div>}
                  {chatError && <div className="chat-error" role="alert">{chatError}</div>}
                </div>
              )}
            </div>
            <form className="composer-wrap" onSubmit={submitPrompt}>
              <div className="composer">
                <button className="composer-icon" type="button" aria-label="Add files"><Upload size={19} /></button>
                <label className="sr-only" htmlFor="rai-prompt">Ask Rai</label>
                <textarea id="rai-prompt" aria-label="Ask Rai" placeholder="Ask Rai about pharmacy operations..." rows={1} value={prompt} disabled={isSending} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitPrompt(); } }} />
                <button className="send-button" type="submit" aria-label="Send message" disabled={!prompt.trim() || isSending}><Send size={18} /></button>
              </div>
              <p>Rai can make mistakes. Check important pharmacy decisions.</p>
            </form>
          </main>
        )}
      </section>
    </div>
  );
}
