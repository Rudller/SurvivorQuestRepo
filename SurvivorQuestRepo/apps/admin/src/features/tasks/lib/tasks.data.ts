export type TaskStatus = "todo" | "in-progress" | "done";

export type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
};

export const taskItems: TaskItem[] = [
  {
    id: "t-1",
    title: "Zweryfikować harmonogram realizacji na ten tydzień.",
    status: "todo",
  },
  {
    id: "t-2",
    title: "Dodać nową grę dla scenariusza terenowego.",
    status: "todo",
  },
  {
    id: "t-3",
    title: "Przygotować checklistę dla zespołu terenowego.",
    status: "todo",
  },
  {
    id: "t-4",
    title: "Przypisać zespoły do realizacji w marcu.",
    status: "in-progress",
  },
  {
    id: "t-5",
    title: "Uporządkować konwersacje na czacie adminów.",
    status: "in-progress",
  },
  {
    id: "t-6",
    title: "Zamknięto otwarte wątki wsparcia.",
    status: "done",
  },
  {
    id: "t-7",
    title: "Opublikowano raport tygodniowy.",
    status: "done",
  },
];

export function getTaskCounts() {
  return taskItems.reduce(
    (accumulator, task) => {
      accumulator[task.status] += 1;
      return accumulator;
    },
    {
      todo: 0,
      "in-progress": 0,
      done: 0,
    },
  );
}

export function getTasksByStatus(status: TaskStatus) {
  return taskItems.filter((task) => task.status === status);
}