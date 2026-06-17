import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { TaskListItem } from "./TaskListItem";

interface TaskSectionProps {
  onAdd: () => void;
  onCompleted?: (result: { lastCompletedAt: number; nextDueAt: number; taskId: string }) => void;
  onEdit: (taskId: string) => void;
  plantName: string;
  tasks: Array<{
    customLabel: string | null;
    id: string;
    intervalDays: number;
    lastCompletedAt: number | null;
    nextDueAt: number;
    taskType: "watering" | "fertilizing" | "misting" | "repotting" | "pruning" | "custom";
  }>;
}

export function TaskSection({ onAdd, onCompleted, onEdit, plantName, tasks }: TaskSectionProps) {
  return (
    <section style={sectionCardStyle}>
      <PageHeader
        actions={
          <Button fullWidth={false} onClick={onAdd} type="button">
            添加提醒
          </Button>
        }
        eyebrow="养护任务"
        title="已启用的提醒"
        description={
          <p style={bodyStyle}>
            {plantName} 的所有提醒都会显示在这里，方便直接编辑和完成，植物详情页也就成了家庭协作的统一入口。
          </p>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          actions={
            <Button fullWidth={false} onClick={onAdd} type="button">
              添加提醒
            </Button>
          }
          badge="养护任务"
          title="还没有启用任何养护提醒"
          description="可以为这盆植物添加浇水、施肥、喷雾、修剪或自定义提醒。"
          minHeight="200px"
        />
      ) : (
        <div style={taskListStyle}>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              onCompleted={onCompleted}
              onEdit={() => onEdit(task.id)}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const sectionCardStyle: React.CSSProperties = {
  borderRadius: "24px",
  padding: "22px 18px",
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  boxShadow: "var(--shadow-card)",
  display: "grid",
  gap: "18px",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--color-muted)",
  fontSize: "1rem",
  lineHeight: 1.7,
};

const taskListStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};
