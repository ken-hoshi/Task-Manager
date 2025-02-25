export const isDeadlineNear = (deadline: string, taskStatusId: number) => {
  if (taskStatusId === 3) {
    return 0;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffInDays = Math.floor(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays < 0) {
    return 2;
  } else if (diffInDays <= 2) {
    return 1;
  } else {
    return 0;
  }
};
