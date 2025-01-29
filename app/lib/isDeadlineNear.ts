export const isDeadlineNear = (deadline: string, taskStatusId: number) => {
  if (taskStatusId === 3) {
    return false;
  }
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffInDays =
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays <= 3;
};
