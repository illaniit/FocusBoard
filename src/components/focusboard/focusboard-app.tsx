"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import type { User } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileUp,
  Flame,
  FolderKanban,
  Gauge,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Play,
  Repeat,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Settings2,
  Sun,
  Target,
  TrendingUp,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FocusBoardState,
  FocusTask,
  Habit,
  HabitSchedule,
  Project,
  Subject,
  TaskStatus,
  getBestTask,
  getTaskScore,
  getProgress,
  initialFocusBoard,
  priorityMeta,
  statusLabels,
} from "@/lib/focusboard-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "focusboard:v1";
const LOCAL_MODE_KEY = "focusboard:auth-mode";
const ONBOARDING_KEY = "focusboard:onboarding-complete:v2";
const BOARD_KEY = "default";
const TODAY_ISO = toISODate(new Date());
const CREATOR_LINKEDIN =
  "https://www.linkedin.com/in/ill%C3%A1n-iglesias-torres-5a0b5b291/";
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "today", label: "Hoy", icon: ListTodo },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "subjects", label: "Asignaturas", icon: BookOpen },
  { id: "projects", label: "Proyectos", icon: FolderKanban },
  { id: "habits", label: "Hábitos", icon: Repeat },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
] as const;

type View = (typeof navItems)[number]["id"];
type FilterValue<T extends string> = T | "all";
type BoardFilters = {
  priority: FilterValue<FocusTask["priority"]>;
  query: string;
  status: FilterValue<TaskStatus>;
};
type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

const statusColumns: TaskStatus[] = ["pending", "in-progress", "blocked", "done"];
const projectStatusLabels: Record<Project["status"], string> = {
  Discovery: "Exploración",
  Building: "En construcción",
  Review: "En revisión",
  Launch: "Lanzamiento",
};
const weeklyBars = [48, 68, 54, 83, 71, 36, 58];
const emptyFocusBoard: FocusBoardState = {
  tasks: [],
  subjects: [],
  projects: [],
  habits: [],
  events: [],
};
const fieldClassName =
  "mt-2 h-11 w-full rounded-lg border border-black/10 bg-white/70 px-3 text-base text-slate-950 outline-none ring-cyan-300/40 transition placeholder:text-slate-400 focus:ring-4 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:placeholder:text-zinc-500";
const selectClassName =
  "mt-2 h-11 w-full rounded-lg border border-black/10 bg-white/90 px-3 text-base text-slate-950 outline-none ring-cyan-300/40 transition focus:ring-4 sm:text-sm dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 [&_option]:bg-white [&_option]:text-slate-950 dark:[&_option]:bg-zinc-950 dark:[&_option]:text-zinc-50";

export function FocusBoardApp() {
  const [view, setView] = useState<View>("dashboard");
  const [taskDraft, setTaskDraft] = useState<FocusTask | null>(null);
  const [celebratedTask, setCelebratedTask] = useState<FocusTask | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>({
    priority: "all",
    query: "",
    status: "all",
  });
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const auth = useFocusAuth();
  const storageKey = `${STORAGE_KEY}:${auth.user?.id ?? "guest"}`;
  const defaultBoard = auth.localMode ? initialFocusBoard : emptyFocusBoard;
  const [board, setBoard, boardHydrated] = useFocusBoard(storageKey, defaultBoard);
  const [syncLabel, setSyncLabel] = useState(() =>
    isSupabaseConfigured()
      ? "Inicia sesión para sincronizar"
      : "Invitado · Guardado en este navegador",
  );
  const [recommendationOpen, setRecommendationOpen] = useState(true);
  const [themeMounted, setThemeMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const activeTheme = themeMounted ? resolvedTheme : "dark";

  const stats = useMemo(() => createStats(board), [board]);
  const bestTask = useMemo(() => getBestTask(board.tasks), [board.tasks]);
  const filteredBoard = useMemo(() => filterBoard(board, filters), [board, filters]);
  const filterCount = useMemo(() => getFilterCount(filters), [filters]);
  const displayedSyncLabel = auth.localMode
    ? formatSaveStatus(lastSavedAt)
    : syncLabel;

  useEffect(() => {
    queueMicrotask(() => setThemeMounted(true));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setShowOnboarding(window.localStorage.getItem(ONBOARDING_KEY) !== "true");
    });
  }, []);

  useEffect(() => {
    if (boardHydrated) {
      queueMicrotask(() => setLastSavedAt(new Date()));
    }
  }, [board, boardHydrated]);

  useEffect(() => {
    if (auth.localMode) {
      return;
    }

    const supabase = createClient();

    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function syncSnapshot() {
      const { data } = await client.auth.getSession();

      if (!data.session?.user) {
        setSyncLabel("Inicia sesión para sincronizar");
        return;
      }

      const { error } = await client.from("focusboard_snapshots").upsert(
        {
          board_key: BOARD_KEY,
          user_id: data.session.user.id,
          data: board,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,board_key" },
      );

      if (!cancelled) {
        setSyncLabel(error ? "Guardado local · Supabase pendiente" : "Privado · Sincronizado con Supabase");
      }
    }

    if (!boardHydrated) {
      return;
    }

    const timer = window.setTimeout(syncSnapshot, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [auth.localMode, board, boardHydrated]);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase || !auth.user) {
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function loadPrivateSnapshot() {
      const { data, error } = await client
        .from("focusboard_snapshots")
        .select("data")
        .eq("board_key", BOARD_KEY)
        .maybeSingle();

      if (!cancelled && !error && data?.data) {
        setBoard(normalizeBoard(data.data));
        setSyncLabel("Privado · Cargado desde Supabase");
      }
    }

    loadPrivateSnapshot();

    return () => {
      cancelled = true;
    };
  }, [auth.user, setBoard]);

  const completeTask = (taskId: string) => {
    const taskToComplete = board.tasks.find((task) => task.id === taskId);

    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "done" ? "pending" : "done",
              completedAt: task.status === "done" ? undefined : TODAY_ISO,
            }
          : task,
      ),
    }));

    if (taskToComplete && taskToComplete.status !== "done") {
      setCelebratedTask({ ...taskToComplete, status: "done", completedAt: TODAY_ISO });
    }
  };

  const moveTask = (taskId: string, status: TaskStatus) => {
    setBoard((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              completedAt: status === "done" ? TODAY_ISO : undefined,
            }
          : task,
      ),
    }));
  };

  const upsertTask = (task: FocusTask) => {
    setBoard((current) => {
      const exists = current.tasks.some((item) => item.id === task.id);

      return {
        ...current,
        tasks: exists
          ? current.tasks.map((item) => (item.id === task.id ? task : item))
          : [task, ...current.tasks],
      };
    });
  };

  const deleteTask = (taskId: string) => {
    const task = board.tasks.find((item) => item.id === taskId);

    setConfirmAction({
      title: "Borrar tarea",
      description: `Vas a eliminar "${task?.title ?? "esta tarea"}". Esta acción solo afecta a tu tablero actual.`,
      confirmLabel: "Borrar tarea",
      onConfirm: () => {
        setBoard((current) => ({
          ...current,
          tasks: current.tasks.filter((item) => item.id !== taskId),
        }));
      },
    });
  };

  const upsertSubject = (subject: Subject) => {
    setBoard((current) => {
      const exists = current.subjects.some((item) => item.id === subject.id);

      return {
        ...current,
        subjects: exists
          ? current.subjects.map((item) => (item.id === subject.id ? subject : item))
          : [subject, ...current.subjects],
      };
    });
  };

  const deleteSubject = (subjectId: string) => {
    const subject = board.subjects.find((item) => item.id === subjectId);

    setConfirmAction({
      title: "Borrar asignatura",
      description: `Se eliminará "${subject?.name ?? "esta asignatura"}" y sus tareas quedarán sin asignatura.`,
      confirmLabel: "Borrar asignatura",
      onConfirm: () => {
        setBoard((current) => ({
          ...current,
          subjects: current.subjects.filter((item) => item.id !== subjectId),
          tasks: current.tasks.map((task) =>
            task.subjectId === subjectId ? { ...task, subjectId: undefined } : task,
          ),
        }));
      },
    });
  };

  const upsertProject = (project: Project) => {
    setBoard((current) => {
      const exists = current.projects.some((item) => item.id === project.id);

      return {
        ...current,
        projects: exists
          ? current.projects.map((item) => (item.id === project.id ? project : item))
          : [project, ...current.projects],
      };
    });
  };

  const deleteProject = (projectId: string) => {
    const project = board.projects.find((item) => item.id === projectId);

    setConfirmAction({
      title: "Borrar proyecto",
      description: `Se eliminará "${project?.name ?? "este proyecto"}" y sus tareas quedarán sin proyecto.`,
      confirmLabel: "Borrar proyecto",
      onConfirm: () => {
        setBoard((current) => ({
          ...current,
          projects: current.projects.filter((item) => item.id !== projectId),
          tasks: current.tasks.map((task) =>
            task.projectId === projectId ? { ...task, projectId: undefined } : task,
          ),
        }));
      },
    });
  };

  const resetBoard = () => {
    setBoard(initialFocusBoard);
  };

  const toggleHabitToday = (habitId: string) => {
    setBoard((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== habitId) {
          return habit;
        }

        const completed = habit.completions.includes(TODAY_ISO);

        return {
          ...habit,
          completions: completed
            ? habit.completions.filter((date) => date !== TODAY_ISO)
            : [...habit.completions, TODAY_ISO],
          streak: completed ? Math.max(0, habit.streak - 1) : habit.streak + 1,
        };
      }),
    }));
  };

  const updateHabitSchedule = (habitId: string, schedule: HabitSchedule) => {
    setBoard((current) => ({
      ...current,
      habits: current.habits.map((habit) =>
        habit.id === habitId ? { ...habit, schedule } : habit,
      ),
    }));
  };

  const upsertHabit = (habit: Habit) => {
    setBoard((current) => {
      const exists = current.habits.some((item) => item.id === habit.id);

      return {
        ...current,
        habits: exists
          ? current.habits.map((item) => (item.id === habit.id ? habit : item))
          : [habit, ...current.habits],
      };
    });
  };

  const deleteHabit = (habitId: string) => {
    const habit = board.habits.find((item) => item.id === habitId);

    setConfirmAction({
      title: "Borrar hábito",
      description: `Se eliminará "${habit?.name ?? "este hábito"}" junto con su historial local.`,
      confirmLabel: "Borrar hábito",
      onConfirm: () => {
        setBoard((current) => ({
          ...current,
          habits: current.habits.filter((item) => item.id !== habitId),
        }));
      },
    });
  };

  const completeOnboarding = (profiles: string[]) => {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);

    if (profiles.includes("student")) {
      setView("subjects");
    } else if (profiles.includes("creator")) {
      setView("projects");
    } else {
      setView("today");
    }
  };

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `focusboard-${TODAY_ISO}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBoard = async (file: File) => {
    try {
      const text = await file.text();
      setBoard(normalizeBoard(JSON.parse(text)));
      setSyncLabel(auth.user ? "Importado · Pendiente de sincronizar" : "Importado · Guardado en este navegador");
    } catch {
      setSyncLabel("No se pudo importar el archivo");
    }
  };

  if (auth.showGate) {
    return <AuthGate auth={auth} />;
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#67e8f9_0,transparent_32%),radial-gradient(circle_at_80%_10%,#fde68a_0,transparent_28%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_36%,#ecfeff_68%,#fff7ed_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#0e7490_0,transparent_32%),radial-gradient(circle_at_80%_10%,#854d0e_0,transparent_26%),linear-gradient(135deg,#09090b_0%,#111827_38%,#0f172a_70%,#18181b_100%)] dark:text-zinc-50">
      <div className="relative z-10 flex min-h-screen w-full">
        <DesktopSidebar activeView={view} onViewChange={setView} />

        <section className="flex min-w-0 flex-1 flex-col">
          <TopBar
            activeView={view}
            onViewChange={setView}
            syncLabel={displayedSyncLabel}
            userEmail={auth.user?.email}
            isGuest={auth.localMode}
            onSignOut={auth.signOut}
            theme={activeTheme}
            onThemeToggle={() => setTheme(activeTheme === "dark" ? "light" : "dark")}
            onExport={exportBoard}
            onImport={importBoard}
          />

          <div className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 2xl:px-10">
            <GlobalFilters
              filters={filters}
              resultCount={filteredBoard.tasks.length}
              activeCount={filterCount}
              onChange={setFilters}
              onClear={() => setFilters({ priority: "all", query: "", status: "all" })}
            />
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-5 space-y-6"
            >
              {view === "dashboard" && (
                <DashboardView
                  board={filteredBoard}
                  stats={stats}
                  bestTask={bestTask}
                  recommendationOpen={recommendationOpen}
                  onRecommend={() => setRecommendationOpen(true)}
                  onStartTask={(taskId) => moveTask(taskId, "in-progress")}
                  onCompleteTask={completeTask}
                  onReset={resetBoard}
                />
              )}
              {view === "today" && (
                <TodayView
                  tasks={filteredBoard.tasks}
                  subjects={board.subjects}
                  projects={board.projects}
                  externalEditingTask={taskDraft}
                  onDeleteTask={deleteTask}
                  onEditingTaskLoaded={() => setTaskDraft(null)}
                  onSaveTask={upsertTask}
                  onCompleteTask={completeTask}
                  onMoveTask={moveTask}
                />
              )}
              {view === "kanban" && (
                <KanbanView
                  tasks={filteredBoard.tasks}
                  onDeleteTask={deleteTask}
                  onEditTask={(task) => {
                    setTaskDraft(task);
                    setView("today");
                  }}
                  onCompleteTask={completeTask}
                  onMoveTask={moveTask}
                />
              )}
              {view === "subjects" && (
                <SubjectsView
                  subjects={filteredBoard.subjects}
                  tasks={filteredBoard.tasks}
                  onDeleteSubject={deleteSubject}
                  onSaveSubject={upsertSubject}
                  onCompleteTask={completeTask}
                />
              )}
              {view === "projects" && (
                <ProjectsView
                  projects={filteredBoard.projects}
                  tasks={filteredBoard.tasks}
                  onDeleteProject={deleteProject}
                  onSaveProject={upsertProject}
                  onCompleteTask={completeTask}
                />
              )}
              {view === "habits" && (
                <HabitsView
                  habits={filteredBoard.habits}
                  onDeleteHabit={deleteHabit}
                  onSaveHabit={upsertHabit}
                  onToggleToday={toggleHabitToday}
                  onUpdateSchedule={updateHabitSchedule}
                />
              )}
              {view === "calendar" && <CalendarView board={filteredBoard} onSaveTask={upsertTask} />}
            </motion.div>
          </div>
        </section>
      </div>
      <MobileBottomNav activeView={view} onViewChange={setView} />
      {celebratedTask && (
        <CompletionCelebration
          task={celebratedTask}
          onClose={() => setCelebratedTask(null)}
          onNext={() => {
            setCelebratedTask(null);
            setRecommendationOpen(true);
            setView("dashboard");
          }}
        />
      )}
      {showOnboarding && <OnboardingOverlay onComplete={completeOnboarding} />}
      {confirmAction && (
        <ConfirmOverlay
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
        />
      )}
    </main>
  );
}

function useFocusBoard(storageKey: string, defaultBoard: FocusBoardState) {
  const [board, setBoard] = useState<FocusBoardState>(defaultBoard);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(false);
      const stored = window.localStorage.getItem(storageKey);

      if (stored) {
        try {
          setBoard(normalizeBoard(JSON.parse(stored)));
        } catch {
          setBoard(defaultBoard);
        }
      } else {
        setBoard(defaultBoard);
      }

      setHydrated(true);
    });
  }, [storageKey, defaultBoard]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(board));
    }
  }, [board, hydrated, storageKey]);

  return [board, setBoard, hydrated] as const;
}

function useFocusAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setLocalMode(window.localStorage.getItem(LOCAL_MODE_KEY) === "guest");
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setLocalMode(false);
        window.localStorage.removeItem(LOCAL_MODE_KEY);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = createClient();

    if (!supabase) {
      setAuthMessage("Añade las variables de Supabase para iniciar sesión real.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setAuthMessage(error ? error.message : "Sesión iniciada.");
  };

  const signUp = async (email: string, password: string) => {
    const supabase = createClient();

    if (!supabase) {
      setAuthMessage("Añade las variables de Supabase para crear cuentas reales.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window === "undefined" ? undefined : `${window.location.origin}/`,
      },
    });
    setLoading(false);
    setAuthMessage(error ? error.message : "Cuenta creada. Entrando a tu tablero.");
  };

  const signOut = async () => {
    const supabase = createClient();
    if (supabase && user) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setLocalMode(false);
    window.localStorage.removeItem(LOCAL_MODE_KEY);
  };

  const startLocalMode = () => {
    window.localStorage.setItem(LOCAL_MODE_KEY, "guest");
    setAuthMessage("");
    setLocalMode(true);
  };

  return {
    authMessage,
    configured: isSupabaseConfigured(),
    localMode,
    loading,
    showGate: !loading && !user && !localMode,
    signIn,
    signOut,
    signUp,
    startLocalMode,
    user,
  };
}

function AuthGate({ auth }: { auth: ReturnType<typeof useFocusAuth> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "login") {
      await auth.signIn(email, password);
    } else {
      await auth.signUp(email, password);
    }
  };

  const submitLabel = auth.loading
    ? mode === "login"
      ? "Entrando..."
      : "Creando cuenta..."
    : mode === "login"
      ? "Entrar"
      : "Crear cuenta";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,#67e8f9_0,transparent_30%),radial-gradient(circle_at_82%_14%,#fda4af_0,transparent_26%),linear-gradient(135deg,#09090b_0%,#111827_48%,#172554_100%)] px-4 py-8 text-white">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <Badge className="bg-white text-zinc-950">FocusBoard privado o local</Badge>
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Entra a tu panel de foco sin perder contexto.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Crea una cuenta para sincronizar con Supabase o entra como invitado si prefieres guardar tus tareas, hábitos y proyectos solo en este navegador.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AuthFeature icon={ShieldCheck} title="Privado" text="Cada tablero queda aislado por usuario con reglas RLS." />
            <AuthFeature icon={Sparkles} title="Visual" text="Prioridades, calendario y progreso en una lectura rápida." />
            <AuthFeature icon={Repeat} title="Hábitos" text="Rutinas por días fijos o intervalos personalizados." />
          </div>
          <CreatorCredit variant="hero" />
        </motion.div>

        <Card className="!rounded-lg border-white/10 bg-white/10 text-white shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="size-5 text-cyan-300" />
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </CardTitle>
            <CardDescription className="text-zinc-300">
              {auth.configured
                ? "Sincroniza tu tablero privado o entra como invitado para guardar los datos en local."
                : "Prueba FocusBoard como invitado. Cuando conectes Supabase, podrás crear cuentas reales."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-medium">
                Correo electrónico
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none ring-cyan-300/40 transition placeholder:text-zinc-500 focus:ring-4"
                />
              </label>
              <label className="block text-sm font-medium">
                Contraseña
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none ring-cyan-300/40 transition placeholder:text-zinc-500 focus:ring-4"
                />
              </label>
              <Button
                type="submit"
                aria-busy={auth.loading}
                className={cn(
                  "h-11 w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200",
                  auth.loading && "cursor-wait ring-4 ring-cyan-200/40",
                )}
                disabled={auth.loading || !email || password.length < 6}
              >
                {auth.loading && (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950"
                  />
                )}
                {submitLabel}
              </Button>
            </form>

            {auth.authMessage && (
              <div className="rounded-lg border border-white/10 bg-white/10 p-3 text-sm text-zinc-200">
                {auth.authMessage}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={auth.startLocalMode}
              >
                Entrar sin registrarme
              </Button>
            </div>
            <p className="text-xs leading-5 text-zinc-400">
              Modo invitado: tus datos se guardan en el localStorage de este navegador y no se suben a Supabase.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function useLiveDate() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setDate(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  return date;
}

function formatHeaderDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
function GlobalFilters({
  filters,
  resultCount,
  activeCount,
  onChange,
  onClear,
}: {
  filters: BoardFilters;
  resultCount: number;
  activeCount: number;
  onChange: (filters: BoardFilters) => void;
  onClear: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-black/10 bg-white/65 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Buscar tareas, proyectos, asignaturas o etiquetas"
            className="h-10 w-full rounded-lg border border-black/10 bg-white/80 pl-9 pr-3 text-sm outline-none ring-cyan-300/40 transition focus:ring-4 dark:border-white/10 dark:bg-zinc-950/60"
          />
        </label>
        <select
          value={filters.priority}
          onChange={(event) =>
            onChange({ ...filters, priority: event.target.value as BoardFilters["priority"] })
          }
          className={cn(selectClassName, "mt-0 bg-white/80 dark:bg-zinc-950/60")}
        >
          <option value="all">Todas las prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baja</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as BoardFilters["status"] })
          }
          className={cn(selectClassName, "mt-0 bg-white/80 dark:bg-zinc-950/60")}
        >
          <option value="all">Todos los estados</option>
          {statusColumns.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="h-10 border-black/10 bg-white/60 px-3 dark:border-white/10 dark:bg-white/5">
            <SlidersHorizontal className="size-3" />
            {resultCount} tareas
          </Badge>
          {activeCount > 0 && (
            <Button variant="outline" className="h-10" onClick={onClear}>
              <X className="size-4" />
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function MobileBottomNav({
  activeView,
  onViewChange,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
}) {
  const mobileItems = navItems.filter((item) =>
    ["dashboard", "today", "kanban", "habits", "calendar"].includes(item.id),
  );

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-lg border border-black/10 bg-white/90 p-1 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/90 lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeView;

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium transition",
              active
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OnboardingOverlay({ onComplete }: { onComplete: (profiles: string[]) => void }) {
  const [selectedProfiles, setSelectedProfiles] = useState(["focus"]);
  const profiles = [
    {
      id: "student",
      title: "Estudio y asignaturas",
      text: "Prioriza entregas, exámenes y bloques de repaso.",
      icon: BookOpen,
    },
    {
      id: "creator",
      title: "Proyectos personales",
      text: "Mantén avances, enlaces y tareas conectadas.",
      icon: FolderKanban,
    },
    {
      id: "focus",
      title: "Foco diario",
      text: "Empieza por tareas, hábitos y siguiente paso.",
      icon: Target,
    },
  ];
  const toggleProfile = (profileId: string) => {
    setSelectedProfiles((current) => {
      const next = current.includes(profileId)
        ? current.filter((item) => item !== profileId)
        : [...current, profileId];

      return next.length ? next : [profileId];
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label="Configurar FocusBoard"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
        className="w-full max-w-3xl"
      >
        <Card className="!rounded-lg border-white/10 bg-white text-slate-950 shadow-2xl dark:bg-zinc-950 dark:text-zinc-50">
          <CardHeader className="p-4 sm:p-6">
            <Badge className="w-fit bg-cyan-300 text-zinc-950">Primer arranque</Badge>
            <CardTitle className="text-3xl">Haz que FocusBoard empiece contigo.</CardTitle>
            <CardDescription>
              Elige uno o varios enfoques. Solo ajusta la primera vista; tus datos siguen siendo tuyos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {profiles.map((profile) => {
                const Icon = profile.icon;
                const active = selectedProfiles.includes(profile.id);
                return (
                  <motion.button
                    key={profile.id}
                    type="button"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleProfile(profile.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      active
                        ? "border-cyan-300 bg-cyan-300/15 shadow-lg shadow-cyan-950/10"
                        : "border-black/10 bg-slate-50 hover:border-cyan-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="size-5 text-cyan-500" />
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full border text-[10px]",
                          active
                            ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                            : "border-black/15 text-transparent dark:border-white/15",
                        )}
                      >
                        ✓
                      </span>
                    </div>
                    <div className="mt-4 font-semibold">{profile.title}</div>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{profile.text}</p>
                  </motion.button>
                );
              })}
            </div>
            <Button
              className="h-11 w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
              onClick={() => onComplete(selectedProfiles)}
            >
              Continuar con {selectedProfiles.length} enfoque{selectedProfiles.length === 1 ? "" : "s"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function ConfirmOverlay({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={action.title}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 23 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card className="!rounded-lg border-rose-300/30 bg-white text-slate-950 shadow-2xl dark:bg-zinc-950 dark:text-zinc-50">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500" />
              {action.title}
            </CardTitle>
            <CardDescription>{action.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              <Trash2 className="size-4" />
              {action.confirmLabel}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function AuthFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <Icon className="size-5 text-cyan-300" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-zinc-300">{text}</p>
    </div>
  );
}

function normalizeBoard(value: unknown): FocusBoardState {
  if (!value || typeof value !== "object") {
    return initialFocusBoard;
  }

  const board = value as Partial<FocusBoardState>;
  const initialSubjects = new Map(initialFocusBoard.subjects.map((subject) => [subject.id, subject]));
  const initialProjects = new Map(initialFocusBoard.projects.map((project) => [project.id, project]));
  const initialTasks = new Map(initialFocusBoard.tasks.map((task) => [task.id, task]));
  const initialEvents = new Map(initialFocusBoard.events.map((event) => [event.id, event]));
  const initialHabits = new Map(initialFocusBoard.habits.map((habit) => [habit.id, habit]));

  return {
    subjects: (board.subjects ?? initialFocusBoard.subjects).map((subject) => ({
      ...(initialSubjects.get(subject.id) ?? subject),
      ...subject,
      name: initialSubjects.get(subject.id)?.name ?? subject.name,
      nextMilestone: initialSubjects.get(subject.id)?.nextMilestone ?? subject.nextMilestone,
    })),
    projects: (board.projects ?? initialFocusBoard.projects).map((project) => ({
      ...(initialProjects.get(project.id) ?? project),
      ...project,
      description: initialProjects.get(project.id)?.description ?? project.description,
    })),
    tasks: (board.tasks ?? initialFocusBoard.tasks).map((task) => ({
      ...(initialTasks.get(task.id) ?? task),
      ...task,
      title: initialTasks.get(task.id)?.title ?? task.title,
      description: initialTasks.get(task.id)?.description ?? task.description,
      tags: initialTasks.get(task.id)?.tags ?? task.tags,
    })),
    habits: (board.habits ?? initialFocusBoard.habits).map((habit) => {
      const legacy = habit as Habit & { done?: number; target?: number };
      const fallback = initialHabits.get(habit.id);

      return {
        ...(fallback ?? habit),
        ...habit,
        description: habit.description ?? fallback?.description ?? "Hábito configurable.",
        weeklyTarget: habit.weeklyTarget ?? legacy.target ?? fallback?.weeklyTarget ?? 3,
        completions:
          habit.completions ??
          fallback?.completions ??
          Array.from({ length: legacy.done ?? 0 }, (_, index) => `2026-04-${27 + index}`),
        schedule: habit.schedule ?? fallback?.schedule ?? { mode: "weekdays", days: [1, 3, 5] },
      };
    }),
    events: (board.events ?? initialFocusBoard.events).map((event) => ({
      ...(initialEvents.get(event.id) ?? event),
      ...event,
      title: initialEvents.get(event.id)?.title ?? event.title,
    })),
  };
}

function DesktopSidebar({
  activeView,
  onViewChange,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-black/10 bg-white/55 px-4 py-5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/55 lg:block">
      <Brand />
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeView;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition",
                active
                  ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 rounded-lg border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-cyan-500" />
          Ritual de foco
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-zinc-400">
          Elige una prioridad, reserva 45 minutos y deja visible solo el siguiente paso.
        </p>
      </div>
      <CreatorCredit />
    </aside>
  );
}

function TopBar({
  activeView,
  onViewChange,
  syncLabel,
  userEmail,
  isGuest,
  onSignOut,
  theme,
  onThemeToggle,
  onExport,
  onImport,
}: {
  activeView: View;
  onViewChange: (view: View) => void;
  syncLabel: string;
  userEmail?: string;
  isGuest: boolean;
  onSignOut: () => void;
  theme?: string;
  onThemeToggle: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}) {
  const liveDate = useLiveDate();

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/70 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 lg:hidden">
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline" size="icon" aria-label="Abrir navegación" />}
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-80 border-white/10 bg-background">
              <SheetTitle className="sr-only">Navegación FocusBoard</SheetTitle>
              <Brand />
              <div className="mt-7 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium",
                        item.id === activeView
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
          <Brand compact />
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700/80 dark:text-cyan-200/80">
            {formatHeaderDate(liveDate)}
          </p>
          <h1 className="mt-0.5 truncate text-xl font-semibold tracking-normal">
            Tu panel de foco diario
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <Badge
            variant="outline"
            className="hidden h-7 max-w-[260px] border-black/10 bg-white/70 px-3 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 sm:inline-flex"
          >
            <span className="truncate">{syncLabel}</span>
          </Badge>
          {(userEmail || isGuest) && (
            <Badge
              variant="outline"
              className="hidden h-7 max-w-[220px] border-emerald-400/30 bg-emerald-400/10 px-3 text-emerald-700 dark:text-emerald-200 md:inline-flex"
            >
              <ShieldCheck className="size-3" />
              <span className="truncate">{userEmail ?? "Modo invitado"}</span>
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onExport}
                  aria-label="Exportar tablero"
                  className="hidden md:inline-flex"
                />
              }
            >
              <Download className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Exportar datos</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <label
                  className="hidden size-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm shadow-xs transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:inline-flex"
                  aria-label="Importar tablero"
                >
                  <FileUp className="size-4" />
                  <input
                    type="file"
                    accept="application/json"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void onImport(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              }
            />
            <TooltipContent>Importar datos</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onThemeToggle}
                  aria-label="Cambiar tema"
                />
              }
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </TooltipTrigger>
            <TooltipContent>Cambiar modo claro/oscuro</TooltipContent>
          </Tooltip>
          {(userEmail || isGuest) && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onSignOut}
                    aria-label={isGuest ? "Salir del modo invitado" : "Cerrar sesión"}
                  />
                }
              >
                <LogOut className="size-4" />
              </TooltipTrigger>
              <TooltipContent>{isGuest ? "Salir del modo invitado" : "Cerrar sesión"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-lg bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950">
        <Target className="size-5" />
      </div>
      {!compact && (
        <div>
          <div className="text-lg font-semibold leading-none">FocusBoard</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Ordena. Enfoca. Avanza.</div>
        </div>
      )}
    </div>
  );
}

function CreatorCredit({ variant = "sidebar" }: { variant?: "sidebar" | "hero" }) {
  return (
    <a
      href={CREATOR_LINKEDIN}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex items-center gap-3 rounded-lg border transition",
        variant === "hero"
          ? "border-white/10 bg-white/10 px-4 py-3 text-sm text-zinc-200 backdrop-blur-xl hover:bg-white/15"
          : "mt-4 w-full border-black/10 bg-white/55 p-3 text-xs text-slate-600 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-300 text-zinc-950">
        <UserRound className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground dark:text-white">
          Creado por Illán Iglesias Torres
        </span>
        <span className="mt-0.5 block truncate text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
          LinkedIn
        </span>
      </span>
      <ArrowUpRight className="ml-auto size-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

function DashboardView({
  board,
  stats,
  bestTask,
  recommendationOpen,
  onRecommend,
  onStartTask,
  onCompleteTask,
  onReset,
}: {
  board: FocusBoardState;
  stats: ReturnType<typeof createStats>;
  bestTask?: FocusTask;
  recommendationOpen: boolean;
  onRecommend: () => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onReset: () => void;
}) {
  const upcoming = board.tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.8fr)] 2xl:grid-cols-[minmax(0,1.55fr)_minmax(430px,0.75fr)]">
        <div className="rounded-lg border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                FocusBoard
              </Badge>
              <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl 2xl:text-6xl">
                Tu día, ordenado de un vistazo.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-zinc-300 sm:text-base sm:leading-7">
                Reúne lo urgente, lo importante y tus hábitos en un panel claro para decidir qué hacer ahora sin perder energía.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onRecommend} className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                <Sparkles className="size-4" />
                ¿Qué hago ahora?
              </Button>
              <Button variant="outline" onClick={onReset}>
                Reiniciar demo
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Clock3} label="Pendientes" value={stats.pending} tone="cyan" />
            <MetricCard icon={CheckCircle2} label="Completadas" value={stats.done} tone="emerald" />
            <MetricCard icon={TrendingUp} label="Productividad" value={`${stats.productivity}%`} tone="amber" />
            <MetricCard icon={Flame} label="Racha" value={`${stats.streak} días`} tone="rose" />
          </div>
        </div>

        {recommendationOpen && bestTask && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="!rounded-lg border-cyan-300/30 bg-white/85 text-slate-950 shadow-xl shadow-cyan-950/10 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-zinc-950/80 dark:text-zinc-50">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5 text-cyan-500" />
                  Siguiente paso recomendado
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-zinc-400">
                  Elegido por prioridad, urgencia, fecha límite y esfuerzo estimado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TaskSummary task={bestTask} inverted />
                <RecommendationReasons task={bestTask} />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
                    onClick={() => onStartTask(bestTask.id)}
                  >
                    <Play className="size-4" />
                    Empezar
                  </Button>
                  <Button
                    variant="outline"
                    className="border-black/10 bg-white/70 text-slate-950 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                    onClick={() => onCompleteTask(bestTask.id)}
                  >
                    <CheckCircle2 className="size-4" />
                    Hecho
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)_minmax(320px,0.7fr)]">
        <DashboardPanel title="Progreso semanal" icon={BarChart3}>
          <div className="flex h-44 items-end gap-2">
            {weeklyBars.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: index * 0.05, duration: 0.45 }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 to-amber-200"
                />
                <span className="text-xs text-muted-foreground">{["L", "M", "X", "J", "V", "S", "D"][index]}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Próximas fechas" icon={CalendarDays}>
          <div className="space-y-3">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} onCompleteTask={onCompleteTask} />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Hábitos" icon={Gauge}>
          <div className="space-y-4">
            {board.habits.map((habit) => (
              <div key={habit.id}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{habit.name}</span>
                  <span className="text-muted-foreground">
                    {getHabitWeekCount(habit)}/{habit.weeklyTarget}
                  </span>
                </div>
                <Progress value={(getHabitWeekCount(habit) / habit.weeklyTarget) * 100} className="[&_[data-slot=progress-indicator]]:bg-emerald-300" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Racha de {habit.streak} días · {describeSchedule(habit.schedule)}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>
    </>
  );
}

function TaskEditor({
  editingTask,
  projects,
  subjects,
  onCancel,
  onSave,
}: {
  editingTask: FocusTask | null;
  projects: Project[];
  subjects: Subject[];
  onCancel: () => void;
  onSave: (task: FocusTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<FocusTask["priority"]>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [type, setType] = useState<FocusTask["type"]>("task");
  const [dueDate, setDueDate] = useState(TODAY_ISO);
  const [estimateMinutes, setEstimateMinutes] = useState(45);
  const [difficulty, setDifficulty] = useState<FocusTask["difficulty"]>(3);
  const [subjectId, setSubjectId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [tags, setTags] = useState("");
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  useEffect(() => {
    if (!editingTask) {
      return;
    }

    queueMicrotask(() => {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setType(editingTask.type);
      setDueDate(editingTask.dueDate);
      setEstimateMinutes(editingTask.estimateMinutes);
      setDifficulty(editingTask.difficulty);
      setSubjectId(editingTask.subjectId ?? "");
      setProjectId(editingTask.projectId ?? "");
      setTags(editingTask.tags.join(", "));
      setMobileEditorOpen(true);
    });
  }, [editingTask]);

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("pending");
    setType("task");
    setDueDate(TODAY_ISO);
    setEstimateMinutes(45);
    setDifficulty(3);
    setSubjectId("");
    setProjectId("");
    setTags("");
    setMobileEditorOpen(false);
    onCancel();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    onSave({
      id: editingTask?.id ?? `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Tarea enfocada, lista para planificar.",
      type,
      priority,
      status,
      dueDate,
      estimateMinutes: Math.max(5, estimateMinutes),
      difficulty,
      subjectId: subjectId || undefined,
      projectId: projectId || undefined,
      completedAt: status === "done" ? TODAY_ISO : undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    clearForm();
  };

  const editorOpen = Boolean(editingTask) || mobileEditorOpen;

  return (
    <>
      {!editorOpen && (
        <button
          type="button"
          onClick={() => setMobileEditorOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-cyan-300/30 bg-cyan-300/12 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-300/18 lg:hidden"
        >
          <span>
            <span className="block text-base font-semibold">Crear una tarea</span>
            <span className="mt-1 block text-sm text-muted-foreground">Añade lo esencial ahora y ajusta los detalles solo si los necesitas.</span>
          </span>
          <Plus className="size-5 text-cyan-500" />
        </button>
      )}
      <Card className={cn("!rounded-lg border-black/10 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5", !editorOpen && "hidden lg:block")}>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          {editingTask ? <Pencil className="size-4 text-cyan-500" /> : <Plus className="size-4 text-cyan-500" />}
          {editingTask ? "Editar tarea" : "Crear tarea"}
        </CardTitle>
        <CardDescription>
          Convierte ideas sueltas en próximos pasos claros, con prioridad, fecha límite y contexto.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className="block text-sm font-medium sm:col-span-2 lg:col-span-4">
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Preparar examen"
              className={selectClassName}
            />
          </label>
          <label className="hidden text-sm font-medium lg:col-span-4 lg:block">
            Descripción
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Qué hay que hacer"
              className={selectClassName}
            />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Prioridad
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as FocusTask["priority"])}
              className={selectClassName}
            >
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              className={selectClassName}
            >
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="blocked">Bloqueado</option>
              <option value="done">Hecho</option>
            </select>
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as FocusTask["type"])}
              className={selectClassName}
            >
              <option value="task">Tarea</option>
              <option value="delivery">Entrega</option>
              <option value="exam">Examen</option>
              <option value="habit">Hábito</option>
            </select>
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Fecha límite
            <input
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              className={selectClassName}
            />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Minutos
            <input
              value={estimateMinutes}
              onChange={(event) => setEstimateMinutes(Number(event.target.value))}
              type="number"
              min={5}
              step={5}
              className={selectClassName}
            />
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Dificultad
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value) as FocusTask["difficulty"])}
              className={selectClassName}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level}/5
                </option>
              ))}
            </select>
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Asignatura
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className={selectClassName}
            >
              <option value="">Sin asignatura</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Proyecto
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Sin proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="hidden text-sm font-medium lg:col-span-2 lg:block">
            Etiquetas
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="ux, examen"
              className={fieldClassName}
            />
          </label>
          <details className="rounded-lg border border-black/10 bg-white/55 p-3 text-sm sm:col-span-2 lg:hidden dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer font-semibold">Opciones avanzadas</summary>
            <div className="mt-3 grid gap-3">
              <label className="block font-medium">
                Descripción
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Qué hay que hacer"
                  className={selectClassName}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block font-medium">
                  Estado
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as TaskStatus)}
                    className={selectClassName}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in-progress">En progreso</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="done">Hecho</option>
                  </select>
                </label>
                <label className="block font-medium">
                  Tipo
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as FocusTask["type"])}
                    className={selectClassName}
                  >
                    <option value="task">Tarea</option>
                    <option value="delivery">Entrega</option>
                    <option value="exam">Examen</option>
                    <option value="habit">Hábito</option>
                  </select>
                </label>
              </div>
              <label className="block font-medium">
                Dificultad
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(Number(event.target.value) as FocusTask["difficulty"])}
                  className={selectClassName}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level}/5
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-medium">
                Asignatura
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Sin asignatura</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-medium">
                Proyecto
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-medium">
                Etiquetas
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="ux, examen"
                  className={fieldClassName}
                />
              </label>
            </div>
          </details>          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-2">
            <Button type="submit" className="h-11 flex-1 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
              <Save className="size-4" />
              Guardar
            </Button>
            {(editingTask || mobileEditorOpen) && (
              <Button type="button" variant="outline" className="h-11" onClick={clearForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
      </Card>
    </>
  );
}

function TodayView({
  tasks,
  subjects,
  projects,
  externalEditingTask,
  onDeleteTask,
  onEditingTaskLoaded,
  onSaveTask,
  onCompleteTask,
  onMoveTask,
}: {
  tasks: FocusTask[];
  subjects: Subject[];
  projects: Project[];
  externalEditingTask: FocusTask | null;
  onDeleteTask: (taskId: string) => void;
  onEditingTaskLoaded: () => void;
  onSaveTask: (task: FocusTask) => void;
  onCompleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  const priorities = ["urgent", "high", "medium", "low"] as const;
  const [editingTask, setEditingTask] = useState<FocusTask | null>(null);

  useEffect(() => {
    if (externalEditingTask) {
      queueMicrotask(() => {
        setEditingTask(externalEditingTask);
        onEditingTaskLoaded();
      });
    }
  }, [externalEditingTask, onEditingTaskLoaded]);

  return (
    <section className="space-y-5">
      <TaskEditor
        editingTask={editingTask}
        projects={projects}
        subjects={subjects}
        onCancel={() => setEditingTask(null)}
        onSave={(task) => {
          onSaveTask(task);
          setEditingTask(null);
        }}
      />
      <div className="grid gap-5 xl:grid-cols-4">
        {priorities.map((priority) => {
          const items = tasks.filter((task) => task.priority === priority && task.status !== "done");

          return (
            <DashboardPanel key={priority} title={priorityMeta[priority].label} icon={AlertTriangle}>
              <div className="space-y-3">
                {items.length ? (
                  items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onCompleteTask={onCompleteTask}
                      onDeleteTask={onDeleteTask}
                      onEditTask={setEditingTask}
                      onMoveTask={onMoveTask}
                    />
                  ))
                ) : (
                  <EmptyState text="Sin tareas aquí. Buen momento para proteger un bloque de foco." />
                )}
              </div>
            </DashboardPanel>
          );
        })}
      </div>
    </section>
  );
}

function KanbanView({
  tasks,
  onDeleteTask,
  onEditTask,
  onCompleteTask,
  onMoveTask,
}: {
  tasks: FocusTask[];
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: FocusTask) => void;
  onCompleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {statusColumns.map((status) => (
        <div key={status} className="rounded-lg border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{statusLabels[status]}</h2>
            <Badge variant="outline">{tasks.filter((task) => task.status === status).length}</Badge>
          </div>
          <div className="space-y-3">
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onCompleteTask={onCompleteTask}
                  onDeleteTask={onDeleteTask}
                  onEditTask={onEditTask}
                  onMoveTask={onMoveTask}
                  compact
                />
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function SubjectsView({
  subjects,
  tasks,
  onDeleteSubject,
  onSaveSubject,
  onCompleteTask,
}: {
  subjects: Subject[];
  tasks: FocusTask[];
  onDeleteSubject: (subjectId: string) => void;
  onSaveSubject: (subject: Subject) => void;
  onCompleteTask: (taskId: string) => void;
}) {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  return (
    <section className="space-y-5">
      <SubjectEditor
        editingSubject={editingSubject}
        onCancel={() => setEditingSubject(null)}
        onSave={(subject) => {
          onSaveSubject(subject);
          setEditingSubject(null);
        }}
      />
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {subjects.map((subject) => {
          const related = tasks.filter((task) => task.subjectId === subject.id);

          return (
            <motion.div key={subject.id} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm dark:border-white/10 dark:bg-white/5">
                <CardHeader className="p-4 sm:p-6">
                  <div className={cn("mb-2 h-2 w-24 rounded-full bg-gradient-to-r", subject.color)} />
                  <CardTitle className="flex items-center justify-between gap-3">
                    {subject.name}
                    <PriorityBadge priority={subject.priority} />
                  </CardTitle>
                  <CardDescription>Próxima meta: {subject.nextMilestone}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={subject.progress} className="[&_[data-slot=progress-indicator]]:bg-sky-300" />
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <MiniStat label="Progreso" value={`${subject.progress}%`} />
                    <MiniStat label="Tareas" value={related.length} />
                    <MiniStat label="Examen" value={formatShortDate(subject.examDate)} />
                  </div>
                  <div className="space-y-2">
                    {related.slice(0, 3).map((task) => (
                      <TaskRow key={task.id} task={task} onCompleteTask={onCompleteTask} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingSubject(subject)}>
                      <Pencil className="size-3" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDeleteSubject(subject.id)}>
                      <Trash2 className="size-3" />
                      Borrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function ProjectsView({
  projects,
  tasks,
  onDeleteProject,
  onSaveProject,
  onCompleteTask,
}: {
  projects: Project[];
  tasks: FocusTask[];
  onDeleteProject: (projectId: string) => void;
  onSaveProject: (project: Project) => void;
  onCompleteTask: (taskId: string) => void;
}) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  return (
    <section className="space-y-5">
      <ProjectEditor
        editingProject={editingProject}
        onCancel={() => setEditingProject(null)}
        onSave={(project) => {
          onSaveProject(project);
          setEditingProject(null);
        }}
      />
      <div className="grid gap-5 xl:grid-cols-3">
        {projects.map((project) => {
          const related = tasks.filter((task) => task.projectId === project.id);
          const projectUrl = safeExternalUrl(project.link);

          return (
            <motion.div key={project.id} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm dark:border-white/10 dark:bg-white/5">
                <CardHeader className="p-4 sm:p-6">
                  <div className={cn("mb-2 h-2 w-24 rounded-full bg-gradient-to-r", project.color)} />
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{projectStatusLabels[project.status]}</Badge>
                    {projectUrl ? (
                      <a
                        href={projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-300"
                      >
                        Abrir recurso <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin enlace</span>
                    )}
                  </div>
                  <Progress value={project.progress} className="[&_[data-slot=progress-indicator]]:bg-amber-300" />
                  <div className="space-y-2">
                    {related.map((task) => (
                      <TaskRow key={task.id} task={task} onCompleteTask={onCompleteTask} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingProject(project)}>
                      <Pencil className="size-3" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDeleteProject(project.id)}>
                      <Trash2 className="size-3" />
                      Borrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function SubjectEditor({
  editingSubject,
  onCancel,
  onSave,
}: {
  editingSubject: Subject | null;
  onCancel: () => void;
  onSave: (subject: Subject) => void;
}) {
  const [name, setName] = useState("");
  const [nextMilestone, setNextMilestone] = useState("");
  const [examDate, setExamDate] = useState("2026-05-15");
  const [progress, setProgress] = useState(50);
  const [priority, setPriority] = useState<Subject["priority"]>("medium");
  const [color, setColor] = useState("from-sky-400 to-cyan-300");

  useEffect(() => {
    if (!editingSubject) {
      return;
    }

    queueMicrotask(() => {
      setName(editingSubject.name);
      setNextMilestone(editingSubject.nextMilestone);
      setExamDate(editingSubject.examDate);
      setProgress(editingSubject.progress);
      setPriority(editingSubject.priority);
      setColor(editingSubject.color);
    });
  }, [editingSubject]);

  const clear = () => {
    setName("");
    setNextMilestone("");
    setExamDate("2026-05-15");
    setProgress(50);
    setPriority("medium");
    setColor("from-sky-400 to-cyan-300");
    onCancel();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    onSave({
      id: editingSubject?.id ?? `subject-${sanitizeId(name) || Date.now()}`,
      name: name.trim(),
      color,
      priority,
      progress: clamp(progress, 0, 100),
      nextMilestone: nextMilestone.trim() || "Nueva meta",
      examDate,
    });

    clear();
  };

  return (
    <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          {editingSubject ? <Pencil className="size-4 text-cyan-500" /> : <Plus className="size-4 text-cyan-500" />}
          {editingSubject ? "Editar asignatura" : "Crear asignatura"}
        </CardTitle>
        <CardDescription>Organiza entregas, exámenes y prioridades para ver cada asignatura con calma.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className="block text-sm font-medium lg:col-span-3">
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-3">
            Próxima meta
            <input value={nextMilestone} onChange={(event) => setNextMilestone(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Examen
            <input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Prioridad
            <select value={priority} onChange={(event) => setPriority(event.target.value as Subject["priority"])} className={selectClassName}>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Progreso
            <input type="number" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-4">
            Color
            <select value={color} onChange={(event) => setColor(event.target.value)} className={selectClassName}>
              <option value="from-sky-400 to-cyan-300">Cian</option>
              <option value="from-fuchsia-400 to-rose-300">Rosa</option>
              <option value="from-amber-300 to-orange-400">Ámbar</option>
              <option value="from-emerald-300 to-teal-400">Verde</option>
            </select>
          </label>
          <div className="flex items-end gap-2 lg:col-span-4">
            <Button type="submit" className="h-10 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
              <Save className="size-4" />
              Guardar
            </Button>
            {editingSubject && (
              <Button type="button" variant="outline" className="h-10" onClick={clear}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProjectEditor({
  editingProject,
  onCancel,
  onSave,
}: {
  editingProject: Project | null;
  onCancel: () => void;
  onSave: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Project["status"]>("Discovery");
  const [progress, setProgress] = useState(25);
  const [link, setLink] = useState("");
  const [color, setColor] = useState("from-violet-400 to-indigo-300");

  useEffect(() => {
    if (!editingProject) {
      return;
    }

    queueMicrotask(() => {
      setName(editingProject.name);
      setDescription(editingProject.description);
      setStatus(editingProject.status);
      setProgress(editingProject.progress);
      setLink(editingProject.link);
      setColor(editingProject.color);
    });
  }, [editingProject]);

  const clear = () => {
    setName("");
    setDescription("");
    setStatus("Discovery");
    setProgress(25);
    setLink("");
    setColor("from-violet-400 to-indigo-300");
    onCancel();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    onSave({
      id: editingProject?.id ?? `project-${sanitizeId(name) || Date.now()}`,
      name: name.trim(),
      status,
      color,
      progress: clamp(progress, 0, 100),
      link: link.trim(),
      description: description.trim() || "Proyecto sin descripción.",
    });

    clear();
  };

  return (
    <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          {editingProject ? <Pencil className="size-4 text-cyan-500" /> : <Plus className="size-4 text-cyan-500" />}
          {editingProject ? "Editar proyecto" : "Crear proyecto"}
        </CardTitle>
        <CardDescription>
          Reúne estado, progreso y tareas. El enlace es opcional y sirve para abrir recursos externos como Figma, GitHub, Notion, Drive o Vercel.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <label className="block text-sm font-medium lg:col-span-3">
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-4">
            Descripción
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Estado
            <select value={status} onChange={(event) => setStatus(event.target.value as Project["status"])} className={selectClassName}>
              <option value="Discovery">Exploración</option>
              <option value="Building">En construcción</option>
              <option value="Review">En revisión</option>
              <option value="Launch">Lanzamiento</option>
            </select>
          </label>
          <label className="block text-sm font-medium lg:col-span-1">
            %
            <input type="number" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className={fieldClassName} />
          </label>
          <label className="block text-sm font-medium lg:col-span-2">
            Color
            <select value={color} onChange={(event) => setColor(event.target.value)} className={selectClassName}>
              <option value="from-violet-400 to-indigo-300">Violeta</option>
              <option value="from-lime-300 to-emerald-400">Lima</option>
              <option value="from-orange-300 to-red-400">Naranja</option>
              <option value="from-sky-400 to-cyan-300">Cian</option>
            </select>
          </label>
          <label className="block text-sm font-medium lg:col-span-6">
            Enlace externo opcional
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://github.com/usuario/proyecto"
              className={fieldClassName}
            />
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Úsalo para tener a mano el documento, repositorio, diseño o despliegue del proyecto.
            </span>
          </label>
          <div className="flex items-end gap-2 lg:col-span-6">
            <Button type="submit" className="h-10 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
              <Save className="size-4" />
              Guardar
            </Button>
            {editingProject && (
              <Button type="button" variant="outline" className="h-10" onClick={clear}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function HabitsView({
  habits,
  onDeleteHabit,
  onSaveHabit,
  onToggleToday,
  onUpdateSchedule,
}: {
  habits: Habit[];
  onDeleteHabit: (habitId: string) => void;
  onSaveHabit: (habit: Habit) => void;
  onToggleToday: (habitId: string) => void;
  onUpdateSchedule: (habitId: string, schedule: HabitSchedule) => void;
}) {
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"weekdays" | "interval">("weekdays");
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [everyDays, setEveryDays] = useState(2);

  useEffect(() => {
    if (!editingHabit) {
      return;
    }

    queueMicrotask(() => {
      setName(editingHabit.name);
      setDescription(editingHabit.description);
      if (editingHabit.schedule.mode === "weekdays") {
        setScheduleMode("weekdays");
        setSelectedDays(editingHabit.schedule.days);
      } else {
        setScheduleMode("interval");
        setEveryDays(editingHabit.schedule.everyDays);
      }
    });
  }, [editingHabit]);

  const clearHabitForm = () => {
    setEditingHabit(null);
    setName("");
    setDescription("");
    setScheduleMode("weekdays");
    setSelectedDays([1, 2, 3, 4, 5]);
    setEveryDays(2);
  };

  const saveHabit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    onSaveHabit({
      id: editingHabit?.id ?? `habit-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "Hábito configurable.",
      streak: editingHabit?.streak ?? 0,
      weeklyTarget: scheduleMode === "weekdays" ? selectedDays.length : Math.max(1, Math.round(7 / everyDays)),
      completions: editingHabit?.completions ?? [],
      schedule:
        scheduleMode === "weekdays"
          ? { mode: "weekdays", days: selectedDays }
          : { mode: "interval", everyDays },
      color: editingHabit?.color ?? "bg-violet-300",
    });

    clearHabitForm();
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.3fr]">
      <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-4 text-cyan-500 dark:text-cyan-300" />
            Configurar hábito
          </CardTitle>
          <CardDescription>
            Diseña rutinas realistas: días concretos para hábitos fijos o intervalos para ritmos flexibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveHabit} className="space-y-4">
            <label className="block text-sm font-medium">
              Nombre
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Meditar 10 minutos"
                className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white/70 px-3 text-sm outline-none ring-cyan-300/40 transition focus:ring-4 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <label className="block text-sm font-medium">
              Descripción
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Qué cuenta como completado"
                className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white/70 px-3 text-sm outline-none ring-cyan-300/40 transition focus:ring-4 dark:border-white/10 dark:bg-white/5"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scheduleMode === "weekdays" ? "default" : "outline"}
                onClick={() => setScheduleMode("weekdays")}
              >
                Días fijos
              </Button>
              <Button
                type="button"
                variant={scheduleMode === "interval" ? "default" : "outline"}
                onClick={() => setScheduleMode("interval")}
              >
                Cada N días
              </Button>
            </div>

            {scheduleMode === "weekdays" ? (
              <WeekdayPicker selectedDays={selectedDays} onChange={setSelectedDays} />
            ) : (
              <div className="rounded-lg border border-black/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 text-sm font-medium">Frecuencia</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setEveryDays(Math.max(1, everyDays - 1))}
                    aria-label="Reducir intervalo"
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center text-sm">
                    Cada <span className="font-semibold">{everyDays}</span> días
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setEveryDays(Math.min(14, everyDays + 1))}
                    aria-label="Aumentar intervalo"
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="h-10 w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
              {editingHabit ? <Save className="size-4" /> : <Plus className="size-4" />}
              {editingHabit ? "Guardar hábito" : "Añadir hábito"}
            </Button>
            {editingHabit && (
              <Button type="button" variant="outline" className="h-10 w-full" onClick={clearHabitForm}>
                Cancelar edición
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {habits.map((habit) => {
          const completedToday = habit.completions.includes(TODAY_ISO);

          return (
            <motion.div key={habit.id} layout whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="!rounded-lg border-black/10 bg-white/75 shadow-sm dark:border-white/10 dark:bg-white/5">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={cn("mb-3 size-3 rounded-full", habit.color)} />
                      <CardTitle>{habit.name}</CardTitle>
                      <CardDescription>{habit.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{describeSchedule(habit.schedule)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Semana" value={`${getHabitWeekCount(habit)}/${habit.weeklyTarget}`} />
                    <MiniStat label="Racha" value={`${habit.streak} días`} />
                    <MiniStat label="Hoy" value={completedToday ? "Hecho" : "Pendiente"} />
                  </div>
                  <Progress
                    value={(getHabitWeekCount(habit) / habit.weeklyTarget) * 100}
                    className="[&_[data-slot=progress-indicator]]:bg-cyan-300"
                  />
                  <HabitHistory habit={habit} />
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Ajuste rápido
                    </div>
                    {habit.schedule.mode === "weekdays" ? (
                      <WeekdayPicker
                        selectedDays={habit.schedule.days}
                        onChange={(days) => onUpdateSchedule(habit.id, { mode: "weekdays", days })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            onUpdateSchedule(habit.id, {
                              mode: "interval",
                              everyDays: Math.max(
                                1,
                                (habit.schedule.mode === "interval" ? habit.schedule.everyDays : 1) - 1,
                              ),
                            })
                          }
                          aria-label="Reducir intervalo"
                        >
                          -
                        </Button>
                        <div className="flex-1 text-center text-sm">
                          Cada{" "}
                          <span className="font-semibold">
                            {habit.schedule.mode === "interval" ? habit.schedule.everyDays : 1}
                          </span>{" "}
                          días
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            onUpdateSchedule(habit.id, {
                              mode: "interval",
                              everyDays: Math.min(
                                14,
                                (habit.schedule.mode === "interval" ? habit.schedule.everyDays : 1) + 1,
                              ),
                            })
                          }
                          aria-label="Aumentar intervalo"
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    className={cn(
                      "h-10 w-full",
                      completedToday
                        ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
                        : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950",
                    )}
                    onClick={() => onToggleToday(habit.id)}
                  >
                    <CheckCircle2 className="size-4" />
                    {completedToday ? "Completado hoy" : "Marcar como hecho"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingHabit(habit)}>
                      <Pencil className="size-3" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDeleteHabit(habit.id)}>
                      <Trash2 className="size-3" />
                      Borrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function WeekdayPicker({
  selectedDays,
  onChange,
}: {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}) {
  const days = [
    { id: 1, label: "L" },
    { id: 2, label: "M" },
    { id: 3, label: "X" },
    { id: 4, label: "J" },
    { id: 5, label: "V" },
    { id: 6, label: "S" },
    { id: 0, label: "D" },
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const active = selectedDays.includes(day.id);

        return (
          <button
            key={day.id}
            type="button"
            onClick={() => {
              const next = active
                ? selectedDays.filter((selected) => selected !== day.id)
                : [...selectedDays, day.id];
              onChange(next.length ? next : [day.id]);
            }}
            className={cn(
              "h-9 rounded-lg border text-sm font-semibold transition",
              active
                ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                : "border-black/10 bg-white/55 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5",
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}

function HabitHistory({ habit }: { habit: Habit }) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date("2026-04-20T12:00:00");
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white/45 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Historial reciente
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const done = habit.completions.includes(date);

          return (
            <Tooltip key={date}>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      "block h-7 rounded-md border",
                      done
                        ? "border-emerald-300 bg-emerald-300"
                        : "border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5",
                    )}
                  />
                }
              />
              <TooltipContent>
                {formatShortDate(date)} · {done ? "Completado" : "Sin marcar"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({
  board,
  onSaveTask,
}: {
  board: FocusBoardState;
  onSaveTask: (task: FocusTask) => void;
}) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseISODate(TODAY_ISO)));
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<FocusTask["priority"]>("medium");
  const monthDates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth]);
  const firstMonthOffset = getMondayOffset(visibleMonth);
  const selectedWeekDates = useMemo(() => getWeekDates(parseISODate(selectedDate)), [selectedDate]);
  const selectedTasks = board.tasks.filter((task) => task.dueDate === selectedDate);
  const selectedEvents = board.events.filter((event) => event.date === selectedDate);
  const selectedItems = [...selectedEvents, ...selectedTasks];
  const selectedDateObject = parseISODate(selectedDate);
  const monthLabel = formatMonthTitle(visibleMonth);

  const getCalendarItems = (date: string) => [
    ...board.events.filter((event) => event.date === date),
    ...board.tasks.filter((task) => task.dueDate === date),
  ];

  const selectDate = (date: string) => {
    setSelectedDate(date);
    const nextDate = parseISODate(date);
    if (
      nextDate.getFullYear() !== visibleMonth.getFullYear() ||
      nextDate.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(startOfMonth(nextDate));
    }
  };

  const moveMonth = (offset: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(toISODate(nextMonth));
  };

  const goToToday = () => {
    const today = parseISODate(TODAY_ISO);
    setVisibleMonth(startOfMonth(today));
    setSelectedDate(TODAY_ISO);
  };

  const createQuickTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!quickTitle.trim()) {
      return;
    }

    onSaveTask({
      id: `task-${Date.now()}`,
      title: quickTitle.trim(),
      description: "Creada desde el calendario.",
      type: "task",
      priority: quickPriority,
      status: "pending",
      dueDate: selectedDate,
      estimateMinutes: 45,
      difficulty: 3,
      tags: ["calendario"],
    });
    setQuickTitle("");
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Calendario de {monthLabel}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Navega por cualquier mes o año y revisa tareas, entregas y exámenes con espacio suficiente para leerlos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid grid-cols-[44px_1fr_44px] gap-2 sm:w-72">
            <Button type="button" variant="outline" size="icon" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={goToToday}>
              Hoy
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Tabs value={mode} onValueChange={(value) => setMode(value as "month" | "week")}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="month">Mes</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {mode === "month" ? (
          <div className="space-y-4">
            <div className="hidden grid-cols-7 gap-2 md:grid">
              {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                <div key={day} className="px-2 text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstMonthOffset }, (_, index) => (
                <div key={`blank-${index}`} className="min-h-24 rounded-lg border border-transparent" />
              ))}
              {monthDates.map((dateObject) => {
                const date = toISODate(dateObject);
                const items = getCalendarItems(date);
                const active = selectedDate === date;
                const isToday = date === TODAY_ISO;

                return (
                  <motion.button
                    key={date}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => selectDate(date)}
                    className={cn(
                      "min-h-28 rounded-lg border p-2 text-left text-sm transition",
                      active
                        ? "border-cyan-300 bg-cyan-300/15 shadow-lg shadow-cyan-950/10"
                        : "border-black/10 bg-white/60 hover:bg-white/85 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{dateObject.getDate()}</span>
                      {isToday && <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-semibold text-zinc-950">Hoy</span>}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "truncate rounded-md px-2 py-1 text-[11px] font-medium",
                            priorityMeta[item.priority].className,
                          )}
                        >
                          {item.title}
                        </div>
                      ))}
                      {items.length > 3 && <div className="text-[11px] text-muted-foreground">+{items.length - 3} más</div>}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="space-y-3 md:hidden">
              {monthDates.map((dateObject) => {
                const date = toISODate(dateObject);
                const items = getCalendarItems(date);
                const active = selectedDate === date;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition",
                      active
                        ? "border-cyan-300 bg-cyan-300/15 shadow-lg shadow-cyan-950/10"
                        : "border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {formatWeekday(date)}
                        </div>
                        <div className="mt-1 text-lg font-semibold">{formatReadableDate(date)}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
                        {items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "Libre"}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {items.length ? (
                        items.map((item) => <CalendarItemPreview key={item.id} item={item} />)
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin tareas ni eventos para este día.</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-7">
            {selectedWeekDates.map((dateObject) => {
              const date = toISODate(dateObject);
              const items = getCalendarItems(date);
              const active = selectedDate === date;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={cn("rounded-lg text-left", active && "ring-2 ring-cyan-300")}
                >
                  <DashboardPanel title={formatWeekday(date)} icon={Clock3}>
                    <div className="mb-3 text-lg font-semibold">{formatReadableDate(date)}</div>
                    <div className="space-y-2">
                      {items.length ? (
                        items.map((item) => <CalendarItemPreview key={item.id} item={item} />)
                      ) : (
                        <EmptyState text="Libre" />
                      )}
                    </div>
                  </DashboardPanel>
                </button>
              );
            })}
          </div>
        )}

        <DashboardPanel title={formatReadableDate(selectedDate)} icon={CalendarPlus}>
          <div className="space-y-4">
            <div className="rounded-lg border border-black/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Día seleccionado</div>
              <div className="mt-1 text-lg font-semibold">
                {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(selectedDateObject)}
              </div>
            </div>
            <form onSubmit={createQuickTask} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
              <input
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Nueva tarea para este día"
                className="h-11 min-w-0 rounded-lg border border-black/10 bg-white/70 px-3 text-base outline-none ring-cyan-300/40 transition focus:ring-4 sm:text-sm dark:border-white/10 dark:bg-white/5"
              />
              <select
                value={quickPriority}
                onChange={(event) => setQuickPriority(event.target.value as FocusTask["priority"])}
                className={cn(selectClassName, "mt-0")}
              >
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
              <Button type="submit" className="h-11 bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                <Plus className="size-4" />
                Añadir
              </Button>
            </form>
            <div className="space-y-2">
              {selectedItems.length ? (
                selectedItems.map((item) => <CalendarItemPreview key={item.id} item={item} expanded />)
              ) : (
                <EmptyState text="Sin eventos. Puedes crear una tarea rápida arriba." />
              )}
            </div>
          </div>
        </DashboardPanel>
      </div>
    </section>
  );
}

function CalendarItemPreview({
  item,
  expanded = false,
}: {
  item: FocusTask | FocusBoardState["events"][number];
  expanded?: boolean;
}) {
  const isTask = "dueDate" in item;

  return (
    <div className="rounded-lg border border-black/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-5">{item.title}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{isTask ? statusLabels[item.status] : item.type}</span>
            {isTask && <span>{item.estimateMinutes} min</span>}
            {isTask && expanded && <span>Dificultad {item.difficulty}/5</span>}
          </div>
        </div>
        <PriorityBadge priority={item.priority} />
      </div>
      {isTask && expanded && item.description && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
      )}
    </div>
  );
}
function TaskCard({
  task,
  compact = false,
  onCompleteTask,
  onDeleteTask,
  onEditTask,
  onMoveTask,
}: {
  task: FocusTask;
  compact?: boolean;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: FocusTask) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <motion.div layout whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className="!rounded-lg border-black/10 bg-white/85 shadow-sm dark:border-white/10 dark:bg-zinc-950/70">
        <CardContent className={cn("space-y-3", compact && "px-3")}>
          <TaskSummary task={task} />
          {!compact && <p className="text-xs leading-5 text-muted-foreground">{task.description}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onEditTask(task)}>
              <Pencil className="size-3" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMoveTask(task.id, "in-progress")}>
              <Play className="size-3" />
              Foco
            </Button>
            <Button size="sm" variant="outline" onClick={() => onMoveTask(task.id, "blocked")}>
              <AlertTriangle className="size-3" />
              Bloquear
            </Button>
            <Button size="sm" onClick={() => onCompleteTask(task.id)}>
              <CheckCircle2 className="size-3" />
              {task.status === "done" ? "Reabrir" : "Hecho"}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDeleteTask(task.id)}>
              <Trash2 className="size-3" />
              Borrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecommendationReasons({ task }: { task: FocusTask }) {
  const reasons = getRecommendationReasons(task);

  return (
    <div className="rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Zap className="size-3 text-cyan-500" />
        Por qué esta tarea
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {reasons.map((reason) => (
          <div key={reason} className="rounded-md bg-slate-950/5 px-2 py-1.5 text-xs text-slate-700 dark:bg-white/10 dark:text-zinc-300">
            {reason}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletionCelebration({
  task,
  onClose,
  onNext,
}: {
  task: FocusTask;
  onClose: () => void;
  onNext: () => void;
}) {
  const details = [
    `${task.estimateMinutes} min liberados`,
    `Dificultad ${task.difficulty}/5`,
    priorityMeta[task.priority].label,
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Tarea completada"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg"
      >
        <Card className="!rounded-lg overflow-hidden border-emerald-300/40 bg-white text-slate-950 shadow-2xl shadow-emerald-950/25 dark:border-emerald-300/20 dark:bg-zinc-950 dark:text-zinc-50">
          <div className="h-1.5 bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-200" />
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.7, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 320, damping: 16 }}
                className="relative grid size-20 place-items-center rounded-full border border-emerald-300/50 bg-emerald-300/15 text-emerald-500"
              >
                <motion.span
                  className="absolute inset-2 rounded-full border border-emerald-300/35"
                  initial={{ scale: 0.82, opacity: 0.8 }}
                  animate={{ scale: 1.16, opacity: 0 }}
                  transition={{ delay: 0.18, duration: 0.8, ease: "easeOut" }}
                />
                <CheckCircle2 className="size-10" />
              </motion.div>

              <Badge className="mt-5 bg-emerald-300 text-zinc-950">Tarea completada</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Buen trabajo. Has cerrado un bloque importante.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-zinc-400">
                {task.title}
              </p>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {details.map((detail) => (
                <div
                  key={detail}
                  className="rounded-lg border border-black/10 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                >
                  {detail}
                </div>
              ))}
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-200"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.15, duration: 0.75, ease: "easeOut" }}
              />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200" onClick={onNext}>
                <Sparkles className="size-4" />
                Siguiente paso
              </Button>
              <Button variant="outline" onClick={onClose}>
                Seguir a mi ritmo
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function TaskSummary({ task, inverted = false }: { task: FocusTask; inverted?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5">{task.title}</h3>
          <div className={cn("mt-1 flex flex-wrap gap-2 text-xs", inverted ? "text-slate-600 dark:text-zinc-400" : "text-muted-foreground")}>
            <span>{formatShortDate(task.dueDate)}</span>
            <span>{task.estimateMinutes} min</span>
            <span>Dificultad {task.difficulty}/5</span>
          </div>
        </div>
        {task.status === "done" ? (
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
        ) : (
          <Circle className="size-5 shrink-0 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <Badge variant="outline" className="bg-white/40 dark:bg-white/5">
          {statusLabels[task.status]}
        </Badge>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onCompleteTask,
}: {
  task: FocusTask;
  onCompleteTask: (taskId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/10 bg-white/55 p-2 dark:border-white/10 dark:bg-white/5">
      <button onClick={() => onCompleteTask(task.id)} className="text-muted-foreground transition hover:text-emerald-400">
        {task.status === "done" ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="text-xs text-muted-foreground">{formatShortDate(task.dueDate)}</p>
      </div>
      <span className={cn("size-2 rounded-full", priorityMeta[task.priority].dot)} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: keyof typeof priorityMeta }) {
  return (
    <Badge variant="outline" className={cn("border", priorityMeta[priority].className)}>
      <span className={cn("size-1.5 rounded-full", priorityMeta[priority].dot)} />
      {priorityMeta[priority].label}
    </Badge>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    cyan: "from-cyan-300 to-sky-400",
    emerald: "from-emerald-300 to-lime-300",
    amber: "from-amber-200 to-orange-300",
    rose: "from-rose-300 to-fuchsia-300",
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="rounded-lg border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/60"
    >
      <div className={cn("mb-4 grid size-9 place-items-center rounded-lg bg-gradient-to-br text-zinc-950", tones[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      <Card className="!rounded-lg border-black/10 bg-white/70 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-lg hover:shadow-cyan-950/5 dark:border-white/10 dark:bg-white/5">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-cyan-500 dark:text-cyan-300" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-muted-foreground dark:border-white/15">
      {text}
    </div>
  );
}

function createStats(board: FocusBoardState) {
  const done = board.tasks.filter((task) => task.status === "done").length;
  const pending = board.tasks.filter((task) => task.status !== "done").length;
  const workload = board.tasks
    .filter((task) => task.status !== "done")
    .reduce((total, task) => total + task.estimateMinutes, 0);

  return {
    done,
    pending,
    productivity: getProgress(board.tasks),
    streak: board.habits.length ? Math.max(...board.habits.map((habit) => habit.streak)) : 0,
    workload,
  };
}

function filterBoard(board: FocusBoardState, filters: BoardFilters): FocusBoardState {
  const query = filters.query.trim().toLowerCase();
  const taskMatches = (task: FocusTask) => {
    const matchesQuery =
      !query ||
      [task.title, task.description, task.type, ...task.tags]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
    const matchesStatus = filters.status === "all" || task.status === filters.status;

    return matchesQuery && matchesPriority && matchesStatus;
  };
  const tasks = board.tasks.filter(taskMatches);
  const taskSubjectIds = new Set(tasks.map((task) => task.subjectId).filter(Boolean));
  const taskProjectIds = new Set(tasks.map((task) => task.projectId).filter(Boolean));

  return {
    ...board,
    tasks,
    subjects: board.subjects.filter((subject) => {
      const matchesQuery =
        !query ||
        [subject.name, subject.nextMilestone].join(" ").toLowerCase().includes(query) ||
        taskSubjectIds.has(subject.id);
      return matchesQuery;
    }),
    projects: board.projects.filter((project) => {
      const matchesQuery =
        !query ||
        [project.name, project.description, project.status, projectStatusLabels[project.status]]
          .join(" ")
          .toLowerCase()
          .includes(query) ||
        taskProjectIds.has(project.id);
      return matchesQuery;
    }),
    habits: board.habits.filter(
      (habit) =>
        !query || [habit.name, habit.description, describeSchedule(habit.schedule)].join(" ").toLowerCase().includes(query),
    ),
  };
}

function getFilterCount(filters: BoardFilters) {
  return [
    filters.query.trim() ? 1 : 0,
    filters.priority !== "all" ? 1 : 0,
    filters.status !== "all" ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

function formatSaveStatus(date: Date | null) {
  if (!date) {
    return "Invitado · Guardado en este navegador";
  }

  return "Invitado · Guardado hace un momento";
}

function getRecommendationReasons(task: FocusTask) {
  const days = getDaysUntilDue(task.dueDate);
  const dueText =
    days < 0
      ? "La fecha límite ya pasó"
      : days === 0
        ? "Vence hoy"
        : days === 1
          ? "Vence mañana"
          : `Vence en ${days} días`;
  const statusText = task.status === "blocked" ? "Está bloqueada, pero sigue pesando" : statusLabels[task.status];

  return [
    `${priorityMeta[task.priority].label} prioridad`,
    dueText,
    `${task.estimateMinutes} min estimados`,
    `Puntuación ${Math.round(getTaskScore(task))} · ${statusText}`,
  ];
}

function getDaysUntilDue(date: string) {
  const due = new Date(`${date}T12:00:00`);
  const today = new Date(`${TODAY_ISO}T12:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getHabitWeekCount(habit: Habit) {
  const [weekStart, weekEnd] = getWeekRange(parseISODate(TODAY_ISO));
  const startIso = toISODate(weekStart);
  const endIso = toISODate(weekEnd);

  return habit.completions.filter((date) => date >= startIso && date <= endIso).length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function sanitizeId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function safeExternalUrl(value: string) {
  if (!value.trim()) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function describeSchedule(schedule: HabitSchedule) {
  if (schedule.mode === "interval") {
    return schedule.everyDays === 1 ? "Cada día" : `Cada ${schedule.everyDays} días`;
  }

  const labels: Record<number, string> = {
    0: "D",
    1: "L",
    2: "M",
    3: "X",
    4: "J",
    5: "V",
    6: "S",
  };

  return schedule.days.map((day) => labels[day]).join(" · ");
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseISODate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMondayOffset(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getMonthDates(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1));
}

function getWeekRange(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - getMondayOffset(date));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return [start, end] as const;
}

function getWeekDates(date: Date) {
  const [start] = getWeekRange(date);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
  }).format(parseISODate(date));
}

function formatReadableDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseISODate(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(parseISODate(date));
}
