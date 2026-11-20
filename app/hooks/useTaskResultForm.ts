import { useState } from "react";
import { clientSupabase } from "../lib/supabase/client";
import { useNotificationContext } from "../provider/notificationProvider";
import { usePageUpdateContext } from "../provider/pageUpdateProvider";

// 実績（作業した期間と日数）の入力欄の値と、送る・消す処理。
// 値は呼び出した部品の中で持つので、入力欄ごとに呼ぶ（タスク画面は詳細ごとに呼ぶ）
export const useTaskResultForm = () => {
  const { setNotificationValue } = useNotificationContext();
  const { setPageUpdated } = usePageUpdateContext();

  const [selectedResultStartDate, setSelectedResultStartDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedResultDeadlineDate, setSelectedResultDeadlineDate] = useState<
    Date | undefined
  >(undefined);
  const [numberOfResultDays, setNumberOfResultDays] = useState<
    number | string | undefined
  >("");
  const [postLoading, setPostLoading] = useState(false);

  const handleResultDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, deadline] = dates;
    setSelectedResultStartDate(start ?? undefined);
    setSelectedResultDeadlineDate(deadline ?? undefined);

    if (start && deadline) {
      const days = Math.ceil(
        (deadline.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1
      );
      setNumberOfResultDays(days);
    }
  };

  const handleResetResult = async (
    e: { preventDefault: () => void },
    taskId: number
  ) => {
    e.preventDefault();

    try {
      const { error: taskResultUpdateError } = await clientSupabase
        .from("tasks")
        .update({
          result_start_date: null,
          result_deadline_date: null,
          number_of_result_days: null,
        })
        .eq("id", taskId);

      if (taskResultUpdateError) {
        throw taskResultUpdateError;
      }

      setPageUpdated(true);
    } catch (error) {
      console.error("Update Task Result Data", error);
      setNotificationValue({
        message: "実績を取り消せませんでした。",
        color: 1,
      });
      setPageUpdated(true);
    }
  };

  const handleSubmit = async (
    e: { preventDefault: () => void },
    taskId: number
  ) => {
    e.preventDefault();

    if (postLoading) return;
    setPostLoading(true);

    const startDateWithTime = new Date(selectedResultStartDate!);
    startDateWithTime.setHours(9, 0, 0, 0);

    const deadlineDateWithTime = new Date(selectedResultDeadlineDate!);
    deadlineDateWithTime.setHours(9, 0, 0, 0);

    try {
      const { error: taskResultUpdateError } = await clientSupabase
        .from("tasks")
        .update({
          result_start_date: startDateWithTime,
          result_deadline_date: deadlineDateWithTime,
          number_of_result_days: numberOfResultDays,
        })
        .eq("id", taskId);

      if (taskResultUpdateError) {
        throw taskResultUpdateError;
      }

      // 記録できたときだけ入力欄を空にする（失敗したら、入れた値を残して送り直せるようにする）
      setSelectedResultDeadlineDate(undefined);
      setSelectedResultStartDate(undefined);
      setNumberOfResultDays(undefined);
      setPostLoading(false);
      setPageUpdated(true);
    } catch (error) {
      console.error("Add Task Result Data", error);
      setNotificationValue({
        message: "実績を記録できませんでした。",
        color: 1,
      });
      setPostLoading(false);
      setPageUpdated(true);
    }
  };

  return {
    selectedResultStartDate,
    selectedResultDeadlineDate,
    numberOfResultDays,
    setNumberOfResultDays,
    postLoading,
    handleResultDateRangeChange,
    handleResetResult,
    handleSubmit,
  };
};

export type TaskResultForm = ReturnType<typeof useTaskResultForm>;
