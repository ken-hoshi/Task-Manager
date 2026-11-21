import { differenceInCalendarDays, parseISO } from "date-fns";
import { COMPLETED_STATUS_ID } from "./taskStatus";

export const isDeadlineNear = (deadline: string, taskStatusId: number) => {
  if (taskStatusId === COMPLETED_STATUS_ID) {
    return 0;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // date の列（"2026-11-19"）は、その地域の日付として読む（new Date だと UTC より西で前日になる）
  const deadlineDate = parseISO(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffInDays = differenceInCalendarDays(deadlineDate, now);

  if (diffInDays < 0) {
    return 2;
  } else if (diffInDays <= 2) {
    return 1;
  } else {
    return 0;
  }
};
