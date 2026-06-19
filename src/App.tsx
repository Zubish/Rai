import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Folder,
  Grid2X2,
  Image,
  Library,
  Mail,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Pin,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  UserRoundCheck
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { askRaiBackend, saveRaiLibraryItem } from "./lib/raiClient";
import type { RaiClientResponse } from "./lib/raiClient";
import type { RaiReport } from "./lib/types";
import "./styles.css";
import type { LucideIcon } from "lucide-react";

type AssistantPayload = "text" | "report" | "pulse";
type ViewName = "chat" | "search" | "library" | "apps" | "projects" | "more";
type ManagedItemType = "project" | "chat";
type ManagedItemAction = "rename" | "share" | "archive" | "delete" | "pin";

type ChatMessage =
  | {
      id: string;
      role: "assistant";
      content: string;
      payload: AssistantPayload;
      report?: RaiReport;
      orchestration?: Pick<RaiClientResponse, "orchestrationMode" | "model">;
    }
  | {
      id: string;
      role: "user";
      content: string;
    };

type SuggestedPrompt = {
  label: string;
  question: string;
  icon: LucideIcon;
};

type LibraryItem = {
  id: string;
  name: string;
  type: "image" | "file" | "report" | "spreadsheet" | "insight";
  modified: string;
  size: string;
  source: "upload" | "rai";
};

type ManagedItem = {
  id: string;
  name: string;
  type: ManagedItemType;
  archived?: boolean;
  pinned?: boolean;
};

const navItems: Array<{ label: string; view: ViewName; icon: LucideIcon }> = [
  { label: "New chat", view: "chat", icon: MessageSquarePlus },
  { label: "Search chats", view: "search", icon: Search },
  { label: "Library", view: "library", icon: Library },
  { label: "Apps", view: "apps", icon: Grid2X2 },
  { label: "Projects", view: "projects", icon: Folder },
  { label: "More", view: "more", icon: MoreHorizontal }
];

const suggestedPrompts: SuggestedPrompt[] = [
  {
    label: "Generate monthly sales report",
    question: "Show the most profitable antihypertensives last month",
    icon: BarChart3
  },
  {
    label: "Predict stockouts",
    question: "Which medications are likely to stock out soon?",
    icon: AlertTriangle
  },
  {
    label: "Find refill patients",
    question: "How many unique patients are on Exforge 10/160 in March?",
    icon: UserRoundCheck
  },
  {
    label: "Analyze profit by product",
    question: "How do I improve profit this month?",
    icon: TrendingUp
  }
];

const pulseMetrics = [
  { label: "Health Score", value: "91/100", helper: "Stable" },
  { label: "Revenue", value: "+12%", helper: "Today" },
  { label: "Stock Risk", value: "Medium", helper: "1 urgent item" },
  { label: "Patient Retention", value: "Strong", helper: "Refills steady" }
];

export default function App() {
  const [activeView, setActiveView] = useState<ViewName>("chat");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [projects, setProjects] = useState<ManagedItem[]>([]);
  const [savedChats, setSavedChats] = useState<ManagedItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const latestTitle = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user")?.content ?? "New chat",
    [messages]
  );

  function resetChat() {
    setActiveView("chat");
    setMessages([]);
    setQuestion("");
    setActiveSessionId(undefined);
  }

  function openView(view: ViewName) {
    if (view === "chat") {
      resetChat();
      return;
    }
    setActiveView(view);
  }

  async function submitQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isThinking) {
      return;
    }

    setActiveView("chat");
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed
      }
    ]);
    setQuestion("");
    setIsThinking(true);

    if (isPharmacyPulseQuestion(trimmed)) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-pulse-${Date.now()}`,
          role: "assistant",
          payload: "pulse",
          content: "Here is today's Pharmacy Pulse from RxLedger."
        }
      ]);
      setIsThinking(false);
      return;
    }

    const result = await askRaiBackend(trimmed, { sessionId: activeSessionId });
    if (result.sessionId) {
      setActiveSessionId(result.sessionId);
    }
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        payload: result.report ? "report" : "text",
        content: result.assistantText,
        report: result.report,
        orchestration: {
          orchestrationMode: result.orchestrationMode,
          model: result.model
        }
      }
    ]);
    setIsThinking(false);
  }

  function addUploadedFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    const newItems: LibraryItem[] = Array.from(files).map((file) => ({
      id: `upload-${file.name}-${Date.now()}`,
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file",
      modified: "Today",
      size: formatBytes(file.size),
      source: "upload"
    }));
    setLibraryItems((current) => [...newItems, ...current]);
    newItems.forEach((item) => {
      void saveRaiLibraryItem({
        name: item.name,
        type: item.type,
        source: item.source,
        metadata: {
          size: item.size,
          modified: item.modified
        }
      });
    });
    setActiveView("library");
  }

  function createExport(format: "pdf" | "excel" | "insight", report?: RaiReport) {
    const extension = format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "rai";
    const name = `${report?.title ?? "Pharmacy Pulse"}.${extension}`;
    const type = format === "excel" ? "spreadsheet" : format === "pdf" ? "report" : "insight";
    const item: LibraryItem = {
      id: `export-${format}-${Date.now()}`,
      name,
      type,
      modified: "Today",
      size: format === "excel" ? "84 KB" : "128 KB",
      source: "rai"
    };
    setLibraryItems((current) => [item, ...current]);
    void saveRaiLibraryItem({
      name: item.name,
      type: item.type,
      source: item.source,
      metadata: {
        format,
        reportId: report?.id,
        reportTitle: report?.title
      }
    });
  }

  function createLocalProject() {
    setProjects((current) => [
      { id: `project-${Date.now()}`, name: "Untitled pharmacy project", type: "project" },
      ...current
    ]);
  }

  function saveCurrentChat() {
    if (messages.length === 0) {
      return;
    }
    setSavedChats((current) => [
      { id: `chat-${Date.now()}`, name: latestTitle, type: "chat" },
      ...current
    ]);
  }

  function updateManagedItem(type: ManagedItemType, id: string, action: ManagedItemAction) {
    const setter = type === "project" ? setProjects : setSavedChats;
    setter((current) => {
      if (action === "delete") {
        return current.filter((item) => item.id !== id);
      }
      if (action === "archive") {
        return current.map((item) => (item.id === id ? { ...item, archived: true } : item));
      }
      if (action === "rename") {
        return current.map((item) =>
          item.id === id ? { ...item, name: `${item.name} (renamed)` } : item
        );
      }
      if (action === "pin") {
        return current.map((item) =>
          item.id === id ? { ...item, pinned: !item.pinned } : item
        );
      }
      return current;
    });

    if (action === "share") {
      setShareNotice(`${type === "project" ? "Project" : "Chat"} share link copied.`);
    }
  }

  function handleShare(action: "copy" | "email" | "whatsapp") {
    const link = "https://rai.rxledger.local/chat/preview";
    if (action === "copy") {
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      setShareNotice("Chat link copied.");
    }
    if (action === "email") {
      setShareNotice("Email share draft ready.");
    }
    if (action === "whatsapp") {
      setShareNotice("Mobile share target prepared.");
    }
    setShareOpen(false);
  }

  return (
    <main className={isSidebarCollapsed ? "rai-app sidebar-collapsed" : "rai-app"} data-theme={theme}>
      <Sidebar
        activeView={activeView}
        collapsed={isSidebarCollapsed}
        onOpenView={openView}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
        onExpandSidebar={() => setIsSidebarCollapsed(false)}
        theme={theme}
        projects={getVisibleManagedItems(projects)}
        savedChats={getVisibleManagedItems(savedChats)}
        onManageItem={updateManagedItem}
      />

      <section
        className={activeView === "chat" && messages.length === 0 ? "chat-shell empty-chat" : "chat-shell"}
        aria-label="Rai workspace"
      >
        <ChatTopbar
          onNewChat={resetChat}
          shareOpen={shareOpen}
          shareNotice={shareNotice}
          onToggleShare={() => setShareOpen((open) => !open)}
          onShare={handleShare}
        />

        {activeView === "chat" && (
          <>
            <div className="chat-scroll" role="log" aria-label="Conversation">
              {messages.length === 0 ? (
                <DesktopLandingPage
                  question={question}
                  onQuestionChange={setQuestion}
                  onSubmit={() => void submitQuestion()}
                  disabled={isThinking}
                  onPrompt={submitQuestion}
                  onFilesSelected={addUploadedFiles}
                />
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} onCreateExport={createExport} />
                ))
              )}

              {isThinking && (
                <div className="chat-row assistant-row">
                  <AssistantAvatar />
                  <div className="assistant-bubble thinking-bubble">
                    Reading approved RxLedger analytics tools...
                  </div>
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <PromptInput
                value={question}
                onChange={setQuestion}
                onSubmit={() => void submitQuestion()}
                onFilesSelected={addUploadedFiles}
                placeholder="Ask Rai anything"
                disabled={isThinking}
              />
            )}
          </>
        )}

        {activeView === "search" && <SearchView messages={messages} savedChats={savedChats} />}
        {activeView === "library" && (
          <LibraryView items={libraryItems} onFilesSelected={addUploadedFiles} />
        )}
        {activeView === "apps" && <AppsView onOpenRxLedger={() => void submitQuestion("Give me a business health review")} />}
        {activeView === "projects" && (
          <ProjectsView
            projects={getVisibleManagedItems(projects)}
            savedChats={getVisibleManagedItems(savedChats)}
            onCreateProject={createLocalProject}
            onSaveChat={saveCurrentChat}
            onManageItem={updateManagedItem}
            hasCurrentChat={messages.length > 0}
          />
        )}
        {activeView === "more" && <MoreView />}
      </section>
    </main>
  );
}

function Sidebar({
  activeView,
  collapsed,
  onOpenView,
  onToggleTheme,
  onToggleSidebar,
  onExpandSidebar,
  theme,
  projects,
  savedChats,
  onManageItem
}: {
  activeView: ViewName;
  collapsed: boolean;
  onOpenView: (view: ViewName) => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onExpandSidebar: () => void;
  theme: "light" | "dark";
  projects: ManagedItem[];
  savedChats: ManagedItem[];
  onManageItem: (type: ManagedItemType, id: string, action: ManagedItemAction) => void;
}) {
  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="Rai navigation">
      <div className="sidebar-scroll">
        <div className="sidebar-top">
          <BrandLockup compact={collapsed} />
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="icon-button sidebar-toggle"
            onClick={onToggleSidebar}
          >
            <PanelLeft size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-section" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={activeView === item.view ? "sidebar-row active" : "sidebar-row"}
                onClick={() => onOpenView(item.view)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <>
            <SidebarSection title="Projects">
              {projects.length > 0 &&
                projects.map((project) => (
                  <ManagedSidebarRow
                    key={project.id}
                    item={project}
                    onAction={(action) => onManageItem("project", project.id, action)}
                  />
                ))}
            </SidebarSection>

            <SidebarSection title="Chats">
              {savedChats.length > 0 &&
                savedChats.map((chat) => (
                  <ManagedSidebarRow
                    key={chat.id}
                    item={chat}
                    onAction={(action) => onManageItem("chat", chat.id, action)}
                  />
                ))}
            </SidebarSection>
          </>
        )}

        {collapsed && (
          <button
            type="button"
            className="rail-expand-zone"
            aria-label="Expand sidebar"
            onClick={onExpandSidebar}
          />
        )}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={onToggleTheme}
          >
            <span className="toggle-track" aria-hidden="true">
              <span />
            </span>
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
        )}
        <div className="profile-row">
          <span>MI</span>
          <div>
            <strong>Musa Ibrahim</strong>
            <small>Main branch</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ManagedSidebarRow({
  item,
  onAction
}: {
  item: ManagedItem;
  onAction: (action: ManagedItemAction) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="managed-row">
      <button type="button" className="sidebar-row">
        {item.type === "project" ? <Folder size={17} aria-hidden="true" /> : <MessageSquare size={17} aria-hidden="true" />}
        <span className="managed-title">{item.name}</span>
        {item.pinned && <span className="pin-badge">Pinned</span>}
      </button>
      <button
        type="button"
        className="row-menu-button"
        aria-label={`More options for ${item.name}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="row-menu">
          <button type="button" onClick={() => onAction("pin")}>
            <Pin size={14} aria-hidden="true" />
            {item.pinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" onClick={() => onAction("rename")}>
            <Pencil size={14} aria-hidden="true" />
            Rename
          </button>
          <button type="button" onClick={() => onAction("share")}>
            <Share2 size={14} aria-hidden="true" />
            Share
          </button>
          <button type="button" onClick={() => onAction("archive")}>
            <Archive size={14} aria-hidden="true" />
            Archive
          </button>
          <button type="button" onClick={() => onAction("delete")}>
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sidebar-section">
      <p className="section-label">{title}</p>
      {children}
    </section>
  );
}

function MobileNav({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="mobile-nav">
      <button type="button" aria-label="Open navigation" className="icon-button">
        <Menu size={22} aria-hidden="true" />
      </button>
      <BrandLockup compact />
      <button type="button" aria-label="New chat" className="icon-button" onClick={onNewChat}>
        <MessageSquarePlus size={21} aria-hidden="true" />
      </button>
      <button type="button" aria-label="More options" className="icon-button">
        <MoreHorizontal size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand-lockup compact" : "brand-lockup"}>
      <RaiLogo compact={compact} />
      <div>
        {compact ? <span className="brand-title">Rai</span> : <h1>Rai</h1>}
        {!compact && <p>RxLedger Intelligence</p>}
      </div>
    </div>
  );
}

function RaiLogo({ compact = false }: { compact?: boolean }) {
  const logoId = useId().replace(/:/g, "");
  const wordGradientId = `rai-word-${logoId}`;
  const sparkGradientId = `rai-spark-${logoId}`;
  return (
    <span className={compact ? "rai-logo-tile compact" : "rai-logo-tile"} aria-hidden="true">
      <svg className="rai-logo-svg" viewBox="0 0 168 72" role="img">
        <defs>
          <linearGradient id={wordGradientId} x1="12" x2="150" y1="16" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#26C6DA" />
            <stop offset="0.46" stopColor="#2B6BFF" />
            <stop offset="1" stopColor="#8A2BEF" />
          </linearGradient>
          <linearGradient id={sparkGradientId} x1="121" x2="150" y1="5" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#A855F7" />
            <stop offset="1" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
        <text x="12" y="55" fill={`url(#${wordGradientId})`} className="rai-logo-text">
          Rai
        </text>
        <path
          className="rai-logo-spark"
          d="M132 8c4.5 13 9.8 18.3 23 22.8-13.2 4.5-18.5 9.8-23 22.9-4.5-13.1-9.8-18.4-23-22.9 13.2-4.5 18.5-9.8 23-22.8Z"
          fill={`url(#${sparkGradientId})`}
        />
      </svg>
    </span>
  );
}

function ChatTopbar({
  onNewChat,
  shareOpen,
  shareNotice,
  onToggleShare,
  onShare
}: {
  onNewChat: () => void;
  shareOpen: boolean;
  shareNotice: string;
  onToggleShare: () => void;
  onShare: (action: "copy" | "email" | "whatsapp") => void;
}) {
  return (
    <header className="chat-topbar">
      <MobileNav onNewChat={onNewChat} />
      <div className="desktop-topbar">
        <div />
        <div className="topbar-actions">
          {shareNotice && <span className="share-notice">{shareNotice}</span>}
          <div className="share-control">
            <button type="button" className="plain-action" onClick={onToggleShare}>
              <Share2 size={17} aria-hidden="true" />
              Share
            </button>
            {shareOpen && (
              <div className="share-menu">
                <button type="button" onClick={() => onShare("copy")}>
                  <Copy size={15} aria-hidden="true" />
                  Copy chat link
                </button>
                <button type="button" onClick={() => onShare("email")}>
                  <Mail size={15} aria-hidden="true" />
                  Send to email
                </button>
                <button type="button" onClick={() => onShare("whatsapp")}>
                  <Share2 size={15} aria-hidden="true" />
                  Share to mobile apps
                </button>
              </div>
            )}
          </div>
          <button type="button" aria-label="More options" className="icon-button">
            <MoreHorizontal size={21} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

function DesktopLandingPage({
  question,
  onQuestionChange,
  onSubmit,
  disabled,
  onPrompt,
  onFilesSelected
}: {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  onPrompt: (question: string) => void | Promise<void>;
  onFilesSelected: (files: FileList | null) => void;
}) {
  return (
    <section className="landing-panel" aria-label="Desktop Landing Page">
      <div className="landing-copy">
        <h2>What can Rai help with?</h2>
      </div>

      <PromptInput
        value={question}
        onChange={onQuestionChange}
        onSubmit={onSubmit}
        onFilesSelected={onFilesSelected}
        placeholder="Ask Rai anything"
        disabled={disabled}
      />

      <div className="suggested-prompts" aria-label="Suggested prompts">
        {suggestedPrompts.map((prompt) => (
          <SuggestedPromptChip
            key={prompt.label}
            prompt={prompt}
            onClick={() => void onPrompt(prompt.question)}
          />
        ))}
      </div>
    </section>
  );
}

function SuggestedPromptChip({ prompt, onClick }: { prompt: SuggestedPrompt; onClick: () => void }) {
  const Icon = prompt.icon;
  return (
    <button type="button" className="prompt-chip" onClick={onClick}>
      <Icon size={16} aria-hidden="true" />
      {prompt.label}
    </button>
  );
}

function ChatMessage({
  message,
  onCreateExport
}: {
  message: ChatMessage;
  onCreateExport: (format: "pdf" | "excel" | "insight", report?: RaiReport) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="chat-row user-row">
        <div className="user-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="chat-row assistant-row">
      <AssistantAvatar />
      <div className="assistant-bubble">
        <RaiResponseCard message={message} onCreateExport={onCreateExport} />
      </div>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="assistant-avatar">
      <RaiLogo compact />
    </div>
  );
}

function RaiResponseCard({
  message,
  onCreateExport
}: {
  message: Extract<ChatMessage, { role: "assistant" }>;
  onCreateExport: (format: "pdf" | "excel" | "insight", report?: RaiReport) => void;
}) {
  if (message.payload === "pulse") {
    return (
      <>
        <p>{message.content}</p>
        <PharmacyPulseCard />
        <ReportExportActions onExport={(format) => onCreateExport(format)} />
      </>
    );
  }

  if (message.report) {
    return (
      <>
        {message.report.status === "unsupported" && (
          <div className="inline-warning">
            <AlertTriangle size={16} aria-hidden="true" />
            <strong>{message.report.title}</strong>
          </div>
        )}
        <p>{message.content}</p>
        <ReportView report={message.report} />
        <div className="tool-line">
          <span>Tool used: {message.report.toolName}</span>
          {message.orchestration && (
            <span>
              Mode: {formatMode(message.orchestration.orchestrationMode)}
              {message.orchestration.model ? ` (${message.orchestration.model})` : ""}
            </span>
          )}
        </div>
        <ReportExportActions onExport={(format) => onCreateExport(format, message.report)} />
      </>
    );
  }

  return <p>{message.content}</p>;
}

function PharmacyPulseCard() {
  return (
    <section className="pharmacy-pulse-card" aria-label="Pharmacy Pulse">
      <div className="pulse-card-header">
        <div>
          <p className="answer-label">Pharmacy Pulse</p>
          <h3>Here&apos;s what changed in your pharmacy today.</h3>
        </div>
        <Sparkles size={18} aria-hidden="true" />
      </div>
      <div className="pulse-metrics">
        {pulseMetrics.map((metric) => (
          <InsightCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="recommended-action">
        <span>Recommended Action</span>
        <strong>Reorder Exforge 10/160</strong>
      </div>
    </section>
  );
}

function InsightCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="insight-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function PromptInput({
  value,
  onChange,
  onSubmit,
  onFilesSelected,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFilesSelected: (files: FileList | null) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <form
      className="prompt-input"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <button
        type="button"
        aria-label="Add files or media"
        className="input-icon-button"
        onClick={() => fileInputRef.current?.click()}
      >
        <Plus size={22} aria-hidden="true" />
      </button>
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        onChange={(event) => onFilesSelected(event.target.files)}
      />
      <label htmlFor="rai-message">Message Rai</label>
      <textarea
        id="rai-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
      />
      <button type="submit" aria-label="Send message" className="send-button" disabled={disabled}>
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

function ReportView({ report }: { report: RaiReport }) {
  return (
    <div className="report-view">
      <div className="answer-card">
        <p className="answer-label">{report.intentLabel}</p>
        <h3>{report.directAnswer}</h3>
        <p>{report.summary}</p>
      </div>

      {report.metricCards.length > 0 && (
        <div className="metric-grid">
          {report.metricCards.map((metric) => (
            <InsightCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper ?? "Grounded by RxLedger data"}
            />
          ))}
        </div>
      )}

      {report.chartData.length > 0 && (
        <div className="chart-card">
          <div className="card-title">
            <BarChart3 size={16} aria-hidden="true" />
            Report chart
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={report.chartData} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1565C0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {report.table.rows.length > 0 && (
        <div className="table-card">
          <div className="card-title">
            <ClipboardList size={16} aria-hidden="true" />
            Report table
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {report.table.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.table.rows.map((row, index) => (
                  <tr key={`${report.id}-${index}`}>
                    {report.table.columns.map((column) => (
                      <td key={column.key}>{row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ListCard title="Assumptions" icon={ShieldCheck} items={report.assumptions} />

      {report.warnings.length > 0 && (
        <ListCard title="Watch points" icon={AlertTriangle} items={report.warnings} variant="warning" />
      )}

      {report.suggestedActions.length > 0 && (
        <ListCard
          title="Recommended actions"
          icon={ArrowUpRight}
          items={report.suggestedActions}
          ordered
        />
      )}

      {report.agentTrace && (
        <div className="agent-card">
          <div className="card-title">
            <Sparkles size={16} aria-hidden="true" />
            Agent route
          </div>
          <p>Confidence: {report.confidence ?? "medium"}</p>
          <ul>
            {report.agentTrace.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  items,
  ordered = false,
  variant = "default"
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  ordered?: boolean;
  variant?: "default" | "warning";
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className={variant === "warning" ? "list-card warning-card" : "list-card"}>
      <div className="card-title">
        <Icon size={16} aria-hidden="true" />
        {title}
      </div>
      <List>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </div>
  );
}

function ReportExportActions({
  onExport
}: {
  onExport: (format: "pdf" | "excel" | "insight") => void;
}) {
  return (
    <div className="export-actions" aria-label="Report export actions">
      <button type="button" aria-label="Export PDF" onClick={() => onExport("pdf")}>
        <FileText size={15} aria-hidden="true" />
        PDF
      </button>
      <button type="button" aria-label="Export Excel" onClick={() => onExport("excel")}>
        <FileSpreadsheet size={15} aria-hidden="true" />
        Excel
      </button>
      <button type="button" aria-label="Save Insight" onClick={() => onExport("insight")}>
        <Download size={15} aria-hidden="true" />
        Save Insight
      </button>
    </div>
  );
}

function SearchView({ messages, savedChats }: { messages: ChatMessage[]; savedChats: ManagedItem[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const messageResults = messages
      .filter((message) => message.content.toLowerCase().includes(normalized))
      .map((message) => ({
        id: message.id,
        title: message.role === "user" ? "User prompt" : "Rai response",
        body: message.content
      }));
    const chatResults = savedChats
      .filter((chat) => chat.name.toLowerCase().includes(normalized))
      .map((chat) => ({ id: chat.id, title: "Saved chat", body: chat.name }));
    return [...messageResults, ...chatResults];
  }, [messages, query, savedChats]);

  return (
    <WorkspaceView title="Search chats" subtitle="Search across the current chat and saved chat references.">
      <div className="workspace-search">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" />
      </div>
      {query && results.length === 0 && <EmptyState title="No results" body="No matching chat references yet." />}
      {!query && <EmptyState title="Search your Rai history" body="Ask Rai a question, then search for any prompt or response here." />}
      {results.length > 0 && (
        <div className="result-list">
          {results.map((result) => (
            <article className="result-row" key={result.id}>
              <strong>{result.title}</strong>
              <p>{result.body}</p>
            </article>
          ))}
        </div>
      )}
    </WorkspaceView>
  );
}

function LibraryView({
  items,
  onFilesSelected
}: {
  items: LibraryItem[];
  onFilesSelected: (files: FileList | null) => void;
}) {
  const [tab, setTab] = useState<"all" | "images" | "files">("all");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filtered = items.filter((item) => {
    if (tab === "all") return true;
    if (tab === "images") return item.type === "image";
    return item.type !== "image";
  });

  return (
    <WorkspaceView
      title="Library"
      subtitle="Files uploaded to Rai and assets produced by AI exports."
      action={
        <>
          <button type="button" className="primary-pill" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            New
          </button>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            multiple
            onChange={(event) => onFilesSelected(event.target.files)}
          />
        </>
      }
    >
      <div className="tab-row">
        <button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>
          All
        </button>
        <button type="button" className={tab === "images" ? "active" : ""} onClick={() => setTab("images")}>
          Images
        </button>
        <button type="button" className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}>
          Files
        </button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Library is empty" body="Upload files with the plus button or export a Rai response to save it here." />
      ) : (
        <div className="library-table">
          <div className="library-header">
            <span>Name</span>
            <span>Modified</span>
            <span>Size</span>
            <span />
          </div>
          {filtered.map((item) => (
            <div className="library-row" key={item.id}>
              <span className="library-name">
                {item.type === "image" ? <Image size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                {item.name}
              </span>
              <span>{item.modified}</span>
              <span>{item.size}</span>
              <button type="button" aria-label={`More options for ${item.name}`}>
                <MoreHorizontal size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </WorkspaceView>
  );
}

function AppsView({ onOpenRxLedger }: { onOpenRxLedger: () => void }) {
  return (
    <WorkspaceView title="Apps" subtitle="Connect Rai to trusted apps in the RxLedger ecosystem.">
      <div className="workspace-search compact-search">
        <Search size={18} aria-hidden="true" />
        <input placeholder="Search apps" />
      </div>
      <div className="apps-hero">
        <RaiLogo />
        <h3>RxLedger</h3>
        <p>Inventory, dispensing, patients, sales, and pharmacy operations data.</p>
        <span>Connected</span>
        <button type="button" onClick={onOpenRxLedger}>
          View
        </button>
      </div>
      <div className="app-list">
        {["HMO integrations", "EMR systems", "Accounting tools", "Wholesale suppliers"].map((app) => (
          <article className="app-row" key={app}>
            <div className="app-mini-logo">{app.slice(0, 1)}</div>
            <div>
              <strong>{app}</strong>
              <p>Coming as the Rai ecosystem grows.</p>
            </div>
            <ExternalLink size={17} aria-hidden="true" />
          </article>
        ))}
      </div>
    </WorkspaceView>
  );
}

function ProjectsView({
  projects,
  savedChats,
  onCreateProject,
  onSaveChat,
  onManageItem,
  hasCurrentChat
}: {
  projects: ManagedItem[];
  savedChats: ManagedItem[];
  onCreateProject: () => void;
  onSaveChat: () => void;
  onManageItem: (type: ManagedItemType, id: string, action: ManagedItemAction) => void;
  hasCurrentChat: boolean;
}) {
  return (
    <WorkspaceView
      title="Projects"
      subtitle="Organized workspaces for pharmacy tasks. Empty until you create local drafts or backend persistence is connected."
      action={
        <button type="button" className="primary-pill" onClick={onCreateProject}>
          <Plus size={16} aria-hidden="true" />
          New project
        </button>
      }
    >
      <div className="split-grid">
        <section>
          <div className="section-heading">
            <h3>Projects</h3>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" body="Create a project when you want a dedicated pharmacy workspace." />
          ) : (
            projects.map((project) => (
              <ManagedListRow
                key={project.id}
                item={project}
                onAction={(action) => onManageItem("project", project.id, action)}
              />
            ))
          )}
        </section>
        <section>
          <div className="section-heading">
            <h3>Saved chats</h3>
            <button type="button" disabled={!hasCurrentChat} onClick={onSaveChat}>
              Save current chat
            </button>
          </div>
          {savedChats.length === 0 ? (
            <EmptyState title="No saved chats yet" body="Saved conversations will appear here once persistence is enabled." />
          ) : (
            savedChats.map((chat) => (
              <ManagedListRow
                key={chat.id}
                item={chat}
                onAction={(action) => onManageItem("chat", chat.id, action)}
              />
            ))
          )}
        </section>
      </div>
    </WorkspaceView>
  );
}

function ManagedListRow({
  item,
  onAction
}: {
  item: ManagedItem;
  onAction: (action: ManagedItemAction) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="managed-list-row">
      <div>
        <strong>
          {item.name}
          {item.pinned && <span className="pin-badge inline">Pinned</span>}
        </strong>
        <p>{item.type === "project" ? "Project workspace" : "Saved chat"}</p>
      </div>
      <button
        type="button"
        aria-label={`More options for ${item.name}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="row-menu workspace-menu">
          <button type="button" onClick={() => onAction("pin")}>{item.pinned ? "Unpin" : "Pin"}</button>
          <button type="button" onClick={() => onAction("rename")}>Rename</button>
          <button type="button" onClick={() => onAction("share")}>Share</button>
          <button type="button" onClick={() => onAction("archive")}>Archive</button>
          <button type="button" onClick={() => onAction("delete")}>Delete</button>
        </div>
      )}
    </article>
  );
}

function MoreView() {
  return (
    <WorkspaceView title="More" subtitle="Additional controls for Rai will live here as the beta grows.">
      <div className="settings-list">
        <EmptyState title="More tools coming" body="Audit logs, role permissions, integrations, and preferences belong here." />
      </div>
    </WorkspaceView>
  );
}

function WorkspaceView({
  title,
  subtitle,
  action,
  children
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="workspace-view">
      <div className="workspace-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function isPharmacyPulseQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return (
    normalized.includes("what changed") ||
    normalized.includes("pharmacy pulse") ||
    normalized.includes("today")
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getVisibleManagedItems(items: ManagedItem[]): ManagedItem[] {
  return items
    .filter((item) => !item.archived)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

function formatMode(mode: RaiClientResponse["orchestrationMode"]): string {
  return mode.replace(/_/g, " ");
}
