import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bell,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  FileBarChart,
  FolderKanban,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Send,
  Share2,
  Download,
  Trash2,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  X
} from "lucide-react";
import { sendRaiMessage } from "./lib/rai-api";
import { deleteFile, downloadFile, LibraryFile, listFiles, saveFile } from "./lib/local-files";

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

function RaiResponse({ message }: { message: ChatMessage }) {
  const hasWarning = Boolean(message.warnings?.length);
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
  const [isMobile, setIsMobile] = useState(() => window.matchMedia?.("(max-width: 860px)").matches ?? false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string>();
  const [panel, setPanel] = useState<"notifications" | "share" | "settings" | "connection" | "profile">();
  const [notices, setNotices] = useState<Array<{ id: string; text: string; read: boolean }>>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [shareStatus, setShareStatus] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const following = useRef(true);
  const unread = notices.filter(item => !item.read).length;
  const compact = sidebarCollapsed && !isMobile;

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 860px)");
    if (!media) return;
    const update = () => { setIsMobile(media.matches); setMobileOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => { void listFiles().then(setFiles).catch(() => setFileError("Local file storage is unavailable.")); }, []);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [prompt, workspace, isMobile]);
  useEffect(() => {
    if (scrollRef.current && following.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending, chatError]);
  useEffect(() => {
    if (!panel) return;
    setMobileOpen(false);
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(undefined); };
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("keydown", close); previous?.focus(); };
  }, [panel]);
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, [isMobile, mobileOpen]);

  const notify = (text: string) => setNotices(current => [{ id: crypto.randomUUID(), text, read: false }, ...current].slice(0, 30));
  const uploadFiles = async (selected: FileList | null) => {
    if (!selected) return;
    setFileError(undefined);
    for (const file of Array.from(selected)) {
      if (!/\.(pdf|txt|csv|tsv|json|md|docx?|xlsx?|pptx?|odt|ods|odp)$/i.test(file.name) || file.size > 20 * 1024 * 1024) {
        setFileError("Choose document or data files up to 20 MB each. Media and executables are not supported.");
        continue;
      }
      const record = { id: crypto.randomUUID(), name: file.name, size: file.size, createdAt: new Date().toISOString(), blob: file };
      try { await saveFile(record); setFiles(current => [...current, record]); notify(`${file.name} saved to your local library.`); }
      catch { setFileError("Could not save this file. Local storage may be full."); }
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  const transcript = () => messages.map(message => `${message.role === "user" ? "You" : "Rai"}:\n${message.text}${message.warnings?.length ? `\n\nData limitations: ${message.warnings.join(" ")}` : ""}`).join("\n\n");
  const shareConversation = async () => {
    const file = new File([transcript()], "rai-conversation.txt", { type: "text/plain" });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: "Rai conversation", files: [file] });
      else { downloadFile(file, file.name); setShareStatus("Conversation downloaded. You can attach it to an email."); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setShareStatus("Sharing is unavailable. Download the conversation instead."); }
  };

  const startNewChat = () => {
    if (isSending) return;
    following.current = true;
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
    following.current = true;
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
      notify("Rai finished responding to your question.");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Rai could not complete that request right now.");
      notify("Rai could not complete your request. Review the chat to retry.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rai-app" data-theme={darkMode ? "dark" : "light"} data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} aria-label="Rai application">
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
      <aside ref={sidebarRef} className={`sidebar ${mobileOpen ? "sidebar--mobile-open" : ""}`} inert={Boolean(panel) || (isMobile && !mobileOpen)} onClick={event => { if (compact && !(event.target as HTMLElement).closest("button")) setSidebarCollapsed(false); }} onKeyDown={event => {
        if (event.key === "Escape") setMobileOpen(false);
        if (event.key !== "Tab" || !isMobile || !mobileOpen) return;
        const controls = sidebarRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
        <div className="sidebar__top">
          <button className="brand" type="button" onClick={startNewChat} aria-label="Start a new Rai chat">
            <RaiMark compact={compact} />
            {!compact && <span><strong>Rai</strong><small>Pharmacy Intelligence</small></span>}
          </button>
          <button className="icon-button sidebar-close" type="button" aria-label={mobileOpen ? "Close navigation" : "Collapse navigation"} onClick={() => mobileOpen ? setMobileOpen(false) : setSidebarCollapsed(value => !value)}>
            {mobileOpen ? <X size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="sidebar__scroll">
        <button className="new-chat" type="button" onClick={startNewChat} disabled={isSending} title="New chat">
          <Plus size={18} /><span>New chat</span>
        </button>

        <nav className="primary-nav" aria-label="Rai navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} type="button" aria-label={item.label} title={item.label} className={workspace === item.id ? "nav-item nav-item--active" : "nav-item"} onClick={() => { setWorkspace(item.id); setMobileOpen(false); }}>
              <Icon size={18} /><span>{item.label}</span>{item.id === "alerts" && unread > 0 && <b>{unread}</b>}
            </button>;
          })}
        </nav>

        {!compact && <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>
          <button className="project-link" type="button" onClick={() => setPanel("connection")}><ShieldCheck size={17} /><span>RxLedger connection</span><ChevronRight size={16} /></button>
          <button className="project-link" type="button" onClick={() => setPanel("settings")}><Settings size={17} /><span>Settings</span><ChevronRight size={16} /></button>
        </div>}
        {compact && <button className="rail-expand" aria-label="Expand navigation" title="Expand navigation" onClick={() => setSidebarCollapsed(false)} />}
        </div>

        <div className="sidebar__bottom">
          {!compact && <button className="account-card" type="button" onClick={() => setPanel("profile")}><span className="avatar">AS</span><span><strong>Local workspace</strong><small>Development session</small></span><MoreHorizontal size={17} /></button>}
          <button className="theme-toggle" type="button" aria-label={darkMode ? "Use light mode" : "Use dark mode"} onClick={() => setDarkMode(value => !value)}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}<span>{compact ? "" : darkMode ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      <section className="content-shell" inert={Boolean(panel) || (isMobile && mobileOpen)}>
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="crumb"><span>RxLedger</span><ChevronRight size={14} /><strong>{workspace === "ask" ? "Ask Rai" : workspace[0].toUpperCase() + workspace.slice(1)}</strong></div>
          <div className="topbar__right">
            <button className="branch-switcher" type="button" onClick={() => setPanel("connection")}><span className="branch-switcher__icon"><Bot size={15} /></span><span><strong>Local workspace</strong><small>RxLedger not connected</small></span><ChevronDown size={15} /></button>
            <button className="icon-button" type="button" aria-label="Share conversation" title="Share conversation" disabled={!messages.length || isSending} onClick={() => { setShareStatus(""); setPanel("share"); }}><Share2 size={18} /></button>
            <button className="icon-button notification" type="button" aria-label="Notifications" title="Notifications" onClick={() => { setPanel("notifications"); setNotices(current => current.map(item => ({ ...item, read: true }))); }}><Bell size={18} />{unread > 0 && <i>{unread}</i>}</button>
            <button className="avatar avatar--top" type="button" aria-label="Open user profile" onClick={() => setPanel("profile")}>AS</button>
          </div>
        </header>

        {workspace === "library" ? <main className="utility-body library-view"><h1>Library</h1><p>Documents saved on this device. Files are not yet analysed by Rai.</p><button className="text-button" onClick={() => fileRef.current?.click()}><Plus size={18} />Add files</button>{fileError && <p role="alert">{fileError}</p>}{files.length === 0 && <p>No files yet.</p>}{files.map(file => <div className="file-row" key={file.id}><span>{file.name}<small>{(file.size / 1024).toFixed(1)} KB</small></span><button className="icon-button" aria-label={`Download ${file.name}`} onClick={() => downloadFile(file.blob, file.name)}><Download size={18} /></button><button className="icon-button" aria-label={`Delete ${file.name}`} onClick={() => { void deleteFile(file.id).then(() => setFiles(current => current.filter(item => item.id !== file.id))).catch(() => setFileError("Could not delete this file.")); }}><Trash2 size={18} /></button></div>)}</main> : workspace === "alerts" ? <main className="utility-body library-view"><h1>Activity</h1>{notices.length ? notices.map(item => <p className="notice-row" key={item.id}>{item.text}</p>) : <p>No task notifications yet.</p>}</main> : workspace !== "ask" ? <PlaceholderView workspace={workspace} /> : (
          <main className="chat-page">
            <div className="chat-scroll" ref={scrollRef} onScroll={event => { const element = event.currentTarget; following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }}>
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-mark"><RaiMark /></div>
                  <h1>What can Rai help with today?</h1>
                  <p className="welcome-copy">Ask about stock, sales, patient demand, reports, or the next operational decision your branch should make.</p>
                  <div className="suggestions" aria-label="Suggested prompts">
                    {prompts.map(suggestion => <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>{suggestion}<ChevronRight size={15} /></button>)}
                  </div>
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
                <button className="composer-icon" type="button" aria-label="Add files" title="Add files to library" onClick={() => fileRef.current?.click()}><Plus size={19} /></button>
                <label className="sr-only" htmlFor="rai-prompt">Ask Rai</label>
                <textarea ref={inputRef} id="rai-prompt" aria-label="Ask Rai" placeholder="Message Rai..." rows={1} value={prompt} disabled={isSending} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submitPrompt(); } }} />
                <button className="send-button" type="submit" aria-label="Send message" disabled={!prompt.trim() || isSending}><Send size={18} /></button>
              </div>
              {files.length > 0 && <p>{files.length} document{files.length === 1 ? "" : "s"} saved in Library. Not included in AI requests.</p>}
              {fileError && <p role="alert">{fileError}</p>}
              <p>Rai can make mistakes. Check important pharmacy decisions.</p>
            </form>
          </main>
        )}
      </section>
      <input className="sr-only" type="file" ref={fileRef} aria-label="Upload documents" multiple accept=".pdf,.txt,.csv,.tsv,.json,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp" onChange={event => { void uploadFiles(event.target.files); }} />
      {panel && <div className="panel-overlay" onClick={() => setPanel(undefined)}><div className="utility-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={panel} tabIndex={-1} onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) { event.preventDefault(); first.focus(); }
      }}><div className="utility-header"><h2>{panel === "share" ? "Share conversation" : panel === "connection" ? "RxLedger connection" : panel[0].toUpperCase() + panel.slice(1)}</h2><button className="icon-button" aria-label="Close dialog" onClick={() => setPanel(undefined)}><X size={18} /></button></div><div className="utility-body">
        {panel === "notifications" && (notices.length ? <>{notices.map(item => <p className="notice-row" key={item.id}>{item.text}</p>)}<button className="text-button" onClick={() => setNotices([])}>Clear notifications</button></> : <p>No task notifications yet.</p>)}
        {panel === "share" && <><p>Sharing includes the full conversation. Review it for private pharmacy information first.</p><div className="share-actions"><button onClick={() => { void navigator.clipboard.writeText(transcript()).then(() => setShareStatus("Conversation copied.")).catch(() => setShareStatus("Clipboard unavailable. Download instead.")); }}>Copy conversation</button><button onClick={() => downloadFile(new Blob([transcript()], { type: "text/plain" }), "rai-conversation.txt")}><Download size={16} />Download</button><button onClick={() => { void shareConversation(); }}><Share2 size={16} />Share file</button></div><p role="status">{shareStatus}</p><p>Public links are unavailable until authenticated conversation storage is connected.</p></>}
        {panel === "settings" && <><label><input type="checkbox" role="switch" checked={darkMode} onChange={event => setDarkMode(event.target.checked)} /> Dark mode</label><p>Files are stored on this browser/device. Chat history currently lasts for this session.</p></>}
        {panel === "connection" && <><p>RxLedger is not connected in this local development session.</p><p>Secure sign-in and consent are required before branch data can be accessed. No branch switching is available yet.</p></>}
        {panel === "profile" && <><p>Local development session</p><p>No authenticated pharmacy account is connected.</p><button className="text-button" onClick={() => setPanel("settings")}>Open settings</button></>}
      </div></div></div>}
    </div>
  );
}
