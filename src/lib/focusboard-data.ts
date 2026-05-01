export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "in-progress" | "blocked" | "done";

export type FocusTask = {
  id: string;
  title: string;
  description: string;
  type: "task" | "delivery" | "exam" | "habit";
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  estimateMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  subjectId?: string;
  projectId?: string;
  completedAt?: string;
  tags: string[];
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  priority: Priority;
  progress: number;
  nextMilestone: string;
  examDate: string;
};

export type Project = {
  id: string;
  name: string;
  status: "Discovery" | "Building" | "Review" | "Launch";
  color: string;
  progress: number;
  link: string;
  description: string;
};

export type HabitSchedule =
  | {
      mode: "weekdays";
      days: number[];
    }
  | {
      mode: "interval";
      everyDays: number;
    };

export type Habit = {
  id: string;
  name: string;
  description: string;
  streak: number;
  weeklyTarget: number;
  completions: string[];
  schedule: HabitSchedule;
  color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "exam" | "focus" | "habit";
  priority: Priority;
};

export type FocusBoardState = {
  tasks: FocusTask[];
  subjects: Subject[];
  projects: Project[];
  habits: Habit[];
  events: CalendarEvent[];
};

export const priorityMeta: Record<
  Priority,
  { label: string; className: string; dot: string; weight: number }
> = {
  urgent: {
    label: "Urgente",
    className: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
    weight: 100,
  },
  high: {
    label: "Alta",
    className: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    dot: "bg-amber-300",
    weight: 76,
  },
  medium: {
    label: "Media",
    className: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    dot: "bg-sky-300",
    weight: 48,
  },
  low: {
    label: "Baja",
    className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-300",
    weight: 24,
  },
};

export const statusLabels: Record<TaskStatus, string> = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  blocked: "Bloqueado",
  done: "Hecho",
};

export const initialFocusBoard: FocusBoardState = {
  subjects: [
    {
      id: "math",
      name: "Matemáticas II",
      color: "from-sky-400 to-cyan-300",
      priority: "urgent",
      progress: 72,
      nextMilestone: "Entrega de integrales",
      examDate: "2026-05-08",
    },
    {
      id: "design",
      name: "Diseño de producto",
      color: "from-fuchsia-400 to-rose-300",
      priority: "high",
      progress: 58,
      nextMilestone: "Crítica de prototipo",
      examDate: "2026-05-17",
    },
    {
      id: "history",
      name: "Historia contemporanea",
      color: "from-amber-300 to-orange-400",
      priority: "medium",
      progress: 45,
      nextMilestone: "Lectura dossier 4",
      examDate: "2026-05-24",
    },
    {
      id: "english",
      name: "Ingles C1",
      color: "from-emerald-300 to-teal-400",
      priority: "low",
      progress: 83,
      nextMilestone: "Speaking practice",
      examDate: "2026-05-20",
    },
  ],
  projects: [
    {
      id: "portfolio",
      name: "Portfolio creativo",
      status: "Building",
      color: "from-violet-400 to-indigo-300",
      progress: 64,
      link: "https://vercel.com",
      description: "Nuevo portfolio personal con casos de estudio y CV visual.",
    },
    {
      id: "app",
      name: "FocusBoard mobile",
      status: "Discovery",
      color: "from-lime-300 to-emerald-400",
      progress: 32,
      link: "https://supabase.com",
      description: "Exploración para convertir el sistema en una PWA.",
    },
    {
      id: "content",
      name: "Newsletter semanal",
      status: "Review",
      color: "from-orange-300 to-red-400",
      progress: 78,
      link: "https://notion.so",
      description: "Curación de lecturas, avances y aprendizajes de la semana.",
    },
  ],
  habits: [
    {
      id: "deep-work",
      name: "Deep work",
      description: "Bloques de foco profundo sin interrupciones.",
      streak: 9,
      weeklyTarget: 5,
      completions: ["2026-04-27", "2026-04-28", "2026-04-29", "2026-05-01"],
      schedule: { mode: "weekdays", days: [1, 2, 3, 4, 5] },
      color: "bg-cyan-300",
    },
    {
      id: "reading",
      name: "Lectura",
      description: "Lectura activa con notas breves.",
      streak: 6,
      weeklyTarget: 7,
      completions: ["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"],
      schedule: { mode: "interval", everyDays: 1 },
      color: "bg-amber-300",
    },
    {
      id: "movement",
      name: "Movimiento",
      description: "Caminar, entrenar o movilidad ligera.",
      streak: 12,
      weeklyTarget: 4,
      completions: ["2026-04-28", "2026-04-30", "2026-05-01"],
      schedule: { mode: "weekdays", days: [1, 3, 5, 6] },
      color: "bg-emerald-300",
    },
  ],
  tasks: [
    {
      id: "t1",
      title: "Resolver bloque 3 de integrales",
      description: "20 ejercicios de sustitución y partes para preparar la entrega.",
      type: "delivery",
      priority: "urgent",
      status: "in-progress",
      dueDate: "2026-05-02",
      estimateMinutes: 90,
      difficulty: 4,
      subjectId: "math",
      tags: ["cálculo", "entrega"],
    },
    {
      id: "t2",
      title: "Pulir prototipo de onboarding",
      description: "Cerrar estados vacíos, microcopy y flujo de primera tarea.",
      type: "task",
      priority: "high",
      status: "pending",
      dueDate: "2026-05-03",
      estimateMinutes: 75,
      difficulty: 3,
      subjectId: "design",
      projectId: "app",
      tags: ["figma", "ux"],
    },
    {
      id: "t3",
      title: "Preparar speaking mock",
      description: "Simular 15 minutos y anotar puntos de mejora.",
      type: "exam",
      priority: "medium",
      status: "pending",
      dueDate: "2026-05-05",
      estimateMinutes: 35,
      difficulty: 2,
      subjectId: "english",
      tags: ["idiomas"],
    },
    {
      id: "t4",
      title: "Escribir caso de estudio Portfolio",
      description: "Estructura problema, proceso, decisión y resultado.",
      type: "task",
      priority: "high",
      status: "in-progress",
      dueDate: "2026-05-07",
      estimateMinutes: 120,
      difficulty: 4,
      projectId: "portfolio",
      tags: ["writing", "case-study"],
    },
    {
      id: "t5",
      title: "Leer dossier 4 y extraer tesis",
      description: "Resumen de 8 bullets para seminario.",
      type: "task",
      priority: "medium",
      status: "blocked",
      dueDate: "2026-05-04",
      estimateMinutes: 55,
      difficulty: 3,
      subjectId: "history",
      tags: ["lectura"],
    },
    {
      id: "t6",
      title: "Cerrar enlaces de la newsletter",
      description: "Seleccionar 5 recursos y ordenar por tema.",
      type: "task",
      priority: "low",
      status: "done",
      dueDate: "2026-04-30",
      estimateMinutes: 30,
      difficulty: 1,
      projectId: "content",
      completedAt: "2026-04-30",
      tags: ["contenido"],
    },
    {
      id: "t7",
      title: "Repasar errores del último parcial",
      description: "Convertir los fallos en una mini guía de repaso.",
      type: "exam",
      priority: "urgent",
      status: "pending",
      dueDate: "2026-05-01",
      estimateMinutes: 45,
      difficulty: 3,
      subjectId: "math",
      tags: ["repaso"],
    },
    {
      id: "t8",
      title: "Definir backlog de PWA",
      description: "Separar must-have, nice-to-have y riesgos técnicos.",
      type: "task",
      priority: "medium",
      status: "pending",
      dueDate: "2026-05-09",
      estimateMinutes: 65,
      difficulty: 3,
      projectId: "app",
      tags: ["planning"],
    },
  ],
  events: [
    {
      id: "e1",
      title: "Entrega integrales",
      date: "2026-05-02",
      type: "deadline",
      priority: "urgent",
    },
    {
      id: "e2",
      title: "Crítica prototipo",
      date: "2026-05-03",
      type: "focus",
      priority: "high",
    },
    {
      id: "e3",
      title: "Seminario historia",
      date: "2026-05-04",
      type: "deadline",
      priority: "medium",
    },
    {
      id: "e4",
      title: "Examen Matemáticas",
      date: "2026-05-08",
      type: "exam",
      priority: "urgent",
    },
    {
      id: "e5",
      title: "Newsletter lista",
      date: "2026-05-10",
      type: "deadline",
      priority: "low",
    },
  ],
};

export function getTaskScore(task: FocusTask, today = new Date("2026-05-01")) {
  const due = new Date(`${task.dueDate}T12:00:00`);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / msPerDay);
  const urgency =
    daysUntilDue <= 0 ? 100 : daysUntilDue <= 1 ? 82 : daysUntilDue <= 3 ? 56 : 26;
  const difficultyPenalty = task.difficulty * 5;
  const blockedPenalty = task.status === "blocked" ? 35 : 0;

  return priorityMeta[task.priority].weight + urgency - difficultyPenalty - blockedPenalty;
}

export function getBestTask(tasks: FocusTask[]) {
  return [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => getTaskScore(b) - getTaskScore(a))[0];
}

export function getProgress(tasks: FocusTask[]) {
  if (!tasks.length) {
    return 0;
  }

  return Math.round(
    (tasks.filter((task) => task.status === "done").length / tasks.length) * 100,
  );
}
